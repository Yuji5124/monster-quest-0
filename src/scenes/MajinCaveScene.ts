import Phaser from "phaser";
import { DEV_MAJIN_CAVE_BALANCE, getMajinCaveTheme, MAJIN_CAVE_DEFAULT_SEED, MAJIN_CAVE_FLOOR_COUNT, MAJIN_CAVE_GRID, MAJIN_CAVE_SCENE_KEY, MAJIN_CAVE_TILESET } from "../config/majinCave.ts";
import type { MajinCaveHeroStats, MajinCavePoint } from "../config/majinCave.ts";
import { getLearnedMagicAtLevel } from "../config/characterGrowth.ts";
import { MAGIC_HEAT } from "../data/battleActions.ts";
import { CharacterProgression, characterProgression, formatLevelUpLines } from "../systems/CharacterProgression.ts";
import { GAME_STATE_STORAGE_KEY, GameStateRepository } from "../systems/GameStateRepository.ts";
import type { KeyValueStorage } from "../systems/GameStateRepository.ts";
import { MAP_TRANSITION_FADE_MS } from "../config/maps.ts";
import { MAJIN_CAVE_PRESENTATION, getMajinCaveFogAlpha, isMajinCavePointVisible } from "../config/majinCavePresentation.ts";
import { PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { MAJIN_CAVE_ENEMIES } from "../data/majinCaveEnemies.ts";
import { idleFrame } from "../config/characterWalkSprite.ts";
import { ensureWalkAnimations, preloadWalkSprite, walkAnimKey } from "../systems/CharacterWalkSprite.ts";
import { ensureMajinCaveMonsterAnimations, MajinCaveMonsterSpriteController, preloadMajinCaveMonsterSprites, validateMajinCaveMonsterSprites } from "../systems/MajinCaveMonsterSprites.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { beginMapTransition } from "../systems/MapTransition.ts";
import { pointKey } from "../systems/MajinCaveGenerator.ts";
import { MajinCaveRunState } from "../systems/MajinCaveRunState.ts";
import type { MajinCaveEnemyState } from "../systems/MajinCaveRunState.ts";
import { MajinCaveAttackPresentation } from "../systems/MajinCaveAttackPresentation.ts";
import { MajinCaveTurnSystem } from "../systems/MajinCaveTurnSystem.ts";
import type { MajinCaveDirection, MajinCaveEnemyEvent, MajinCavePlayerAction } from "../systems/MajinCaveTurnSystem.ts";

const WINDOW_COLOR = 0x080d18;
const UI_DEPTH = 200;
const ACTOR_DEPTH = 20;
const DEV_MAJIN_CAVE_TELEMETRY = import.meta.env.DEV;

function readDevMajinCaveSeed(params: URLSearchParams): number | null {
  // `seed` is the documented QA URL; retain the prior dev-only spelling for existing bookmarks.
  const value = Number(params.get("seed") ?? params.get("majinCaveSeed"));
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff ? value : null;
}

/** Restricted to the documented 10F presentation QA route; normal entry ignores this query. */
function readDevMajinCaveFloor(params: URLSearchParams): 10 | null {
  return Number(params.get("majinCaveFloor")) === MAJIN_CAVE_FLOOR_COUNT ? MAJIN_CAVE_FLOOR_COUNT : null;
}

/**
 * `?mapTest=majin-cave`のDEV確認は、現在のセーブのレベルから始めるが、獲得EXPはメモリ内だけで
 * 進め、ユーザーの実セーブへは書き込まない。
 */
function createDevMemoryProgression(): CharacterProgression {
  const values = new Map<string, string>();
  const saved = window.localStorage.getItem(GAME_STATE_STORAGE_KEY);
  if (saved) values.set(GAME_STATE_STORAGE_KEY, saved);
  const storage: KeyValueStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
  return new CharacterProgression(new GameStateRepository(storage));
}

/** 主人公の現在レベル(CharacterProgression)を、どうくつ用の能力値へ変換する。 */
function buildMajinCaveHero(progression: CharacterProgression): MajinCaveHeroStats {
  const stats = progression.getStats("hero");
  return {
    level: stats.level,
    maxHp: stats.maxHp,
    maxMp: stats.maxMp,
    attack: stats.attack,
    defense: stats.defense,
    hasHeat: getLearnedMagicAtLevel("hero", stats.level).some((magic) => magic.id === MAGIC_HEAT.id),
  };
}

export interface MajinCaveSceneData {
  /** Set by the current point-selection WorldMapScene destination. */
  readonly spawnId?: string;
  readonly runSeed?: number;
  /** Optional return route for a later normal-map event. The DEV entry restarts this isolated Scene. */
  readonly returnSceneKey?: string;
  readonly returnData?: Record<string, string>;
}

/**
 * No.08's explicit MAP_SYSTEM exception. Grid, run state and turns are all local to this Scene;
 * it does not alter continuous field movement or the regular BattleScene.
 */
export class MajinCaveScene extends Phaser.Scene {
  private actions!: InputSystem;
  private hudCamera!: Phaser.Cameras.Scene2D.Camera;
  private run!: MajinCaveRunState;
  private progression: CharacterProgression = characterProgression;
  private turns = new MajinCaveTurnSystem();
  private playerVisual!: Phaser.GameObjects.Sprite;
  private minimap!: Phaser.GameObjects.Graphics;
  private floorLabel!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private bossHudName!: Phaser.GameObjects.Text;
  private bossHudGauge!: Phaser.GameObjects.Graphics;
  private messageText!: Phaser.GameObjects.Text;
  private floorObjects: Phaser.GameObjects.GameObject[] = [];
  private stairObjects: Phaser.GameObjects.GameObject[] = [];
  private readonly fogTiles = new Map<string, Phaser.GameObjects.Rectangle>();
  private monsterSprites!: MajinCaveMonsterSpriteController;
  private attackPresentation!: MajinCaveAttackPresentation;
  private helpObjects: Phaser.GameObjects.GameObject[] = [];
  private mapOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private monsterHouseRevealObjects: Phaser.GameObjects.GameObject[] = [];
  private majinRevealObjects: Phaser.GameObjects.GameObject[] = [];
  private helpOpen = false;
  private mapOverlayOpen = false;
  private monsterHouseRevealActive = false;
  private resolvingTurn = false;
  private transitioning = false;
  private returnSceneKey = MAJIN_CAVE_SCENE_KEY;
  private returnData: Record<string, string> = {};

  constructor() {
    super({ key: MAJIN_CAVE_SCENE_KEY });
  }

  preload(): void {
    this.load.spritesheet(MAJIN_CAVE_TILESET.key, MAJIN_CAVE_TILESET.imageUrl, { frameWidth: MAJIN_CAVE_GRID.tileSize, frameHeight: MAJIN_CAVE_GRID.tileSize });
    this.load.json(MAJIN_CAVE_TILESET.metadataKey, MAJIN_CAVE_TILESET.metadataUrl);
    preloadWalkSprite(this, PROTAGONIST_SPRITE);
    preloadMajinCaveMonsterSprites(this);
    for (const definition of Object.values(MAJIN_CAVE_ENEMIES)) {
      if (definition.portrait && !this.textures.exists(definition.portrait.key)) this.load.image(definition.portrait.key, definition.portrait.url);
    }
  }

  create(data?: MajinCaveSceneData): void {
    this.assertTilesetMetadata();
    ensureWalkAnimations(this, PROTAGONIST_SPRITE);
    ensureMajinCaveMonsterAnimations(this);
    if (DEV_MAJIN_CAVE_TELEMETRY) validateMajinCaveMonsterSprites(this);
    const requestedSeed = data?.runSeed;
    const query = new URLSearchParams(window.location.search);
    const isDevMapTest = query.get("mapTest") === "majin-cave";
    const devSeed = isDevMapTest ? readDevMajinCaveSeed(query) : null;
    const devFloor = isDevMapTest ? readDevMajinCaveFloor(query) : null;
    const runSeed = Number.isInteger(requestedSeed) ? requestedSeed! : isDevMapTest ? (devSeed ?? MAJIN_CAVE_DEFAULT_SEED) : Date.now();
    // 2026-09-23: どうくつは主人公1人で、これまでのレベル・EXPを引き継ぐ。倒した敵のEXPは
    // 通常戦闘と同じ累積EXPへ加算され、どうくつを出た後もそのまま残る。
    this.progression = isDevMapTest ? createDevMemoryProgression() : characterProgression;
    this.run = new MajinCaveRunState(runSeed, { hero: buildMajinCaveHero(this.progression) });
    if (devFloor) this.skipDevRunToFloor(devFloor);
    this.turns = new MajinCaveTurnSystem();
    this.transitioning = false;
    this.helpOpen = false;
    this.monsterHouseRevealActive = false;
    this.resolvingTurn = false;
    // The point-selection WorldMapScene owns normal entry and return. DEV starts stay
    // standalone, and future events can still provide an explicit return route.
    const enteredFromWorldMap = data?.spawnId === "fromWorldMap";
    this.returnSceneKey = data?.returnSceneKey ?? (enteredFromWorldMap ? "WorldMapScene" : MAJIN_CAVE_SCENE_KEY);
    this.returnData = data?.returnData ?? (enteredFromWorldMap ? { worldMapEntryId: "from_majin_cave" } : {});

    this.cameras.main.setBackgroundColor("#05060e");
    this.playerVisual = this.add.sprite(0, 0, PROTAGONIST_SPRITE.key, idleFrame("down")).setOrigin(0.5, 0.88).setScale(0.74).setDepth(ACTOR_DEPTH + 2);
    this.monsterSprites = new MajinCaveMonsterSpriteController(this, (point) => this.toPixel(point), MAJIN_CAVE_ENEMIES);
    this.configureCamera();
    this.monsterSprites.setHudCamera(this.hudCamera);
    this.attackPresentation = new MajinCaveAttackPresentation(this, this.hudCamera, ACTOR_DEPTH + 12);
    this.createHud();
    this.createTouchControls();
    this.actions = new InputSystem(window, document);
    const cleanup = (): void => {
      this.actions.destroy();
      this.attackPresentation.dispose();
      this.monsterSprites.dispose();
      this.destroyObjects(this.majinRevealObjects);
      this.cameras.remove(this.hudCamera);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    this.renderFloor();
    this.setMessage("一歩ずつ、気をつけて進もう。　M: 地図");
  }

  update(): void {
    if (this.transitioning || this.resolvingTurn) return;
    if (this.monsterHouseRevealActive) return;
    if (this.mapOverlayOpen) {
      if (this.actions.consumePressed("map") || this.actions.consumePressed("cancel")) this.toggleMapOverlay();
      return;
    }
    if (this.helpOpen) {
      if (this.actions.consumePressed("menu") || this.actions.consumePressed("cancel")) this.toggleHelp();
      return;
    }
    if (this.actions.consumePressed("map")) {
      this.toggleMapOverlay();
      return;
    }
    if (this.actions.consumePressed("menu")) {
      this.toggleHelp();
      return;
    }
    if (this.actions.consumePressed("confirm")) {
      this.useStair();
      return;
    }
    const direction = this.consumeDirection();
    if (direction) {
      this.resolvePlayerAction(this.turns.movePlayer(this.run, direction), direction);
      return;
    }
    if (this.actions.consumePressed("cancel")) this.resolvePlayerAction(this.turns.wait(this.run));
  }

  private assertTilesetMetadata(): void {
    const metadata = this.cache.json.get(MAJIN_CAVE_TILESET.metadataKey) as Partial<{ tileSize: number; columns: number; rows: number; imageWidth: number; imageHeight: number }> | undefined;
    if (!metadata || metadata.tileSize !== 32 || metadata.columns !== 8 || metadata.rows !== 8 || metadata.imageWidth !== 256 || metadata.imageHeight !== 256) {
      throw new Error("No.08 requires the normalized 256×256 / 32px / 8×8 tileset metadata");
    }
  }

  /** Camera is presentation-only: the 32px logical grid stays untouched. */
  private configureCamera(): void {
    const camera = this.cameras.main;
    camera.setBounds(
      MAJIN_CAVE_GRID.originX,
      MAJIN_CAVE_GRID.originY,
      MAJIN_CAVE_GRID.columns * MAJIN_CAVE_GRID.tileSize,
      MAJIN_CAVE_GRID.rows * MAJIN_CAVE_GRID.tileSize,
    );
    camera.setZoom(MAJIN_CAVE_PRESENTATION.cameraZoom);
    camera.roundPixels = true;
    camera.startFollow(this.playerVisual, true, 1, 1);
    this.hudCamera = this.cameras.add(0, 0, 960, 720);
    this.hudCamera.ignore(this.playerVisual);
  }

  private createHud(): void {
    this.registerHudObject(this.add.rectangle(480, MAJIN_CAVE_PRESENTATION.hudTopHeight / 2, 960, MAJIN_CAVE_PRESENTATION.hudTopHeight, WINDOW_COLOR, 0.96)
      .setStrokeStyle(1, 0xd8e4ff, 0.72).setDepth(UI_DEPTH).setScrollFactor(0));
    this.registerHudObject(this.add.rectangle(480, MAJIN_CAVE_PRESENTATION.hudBottomY + MAJIN_CAVE_PRESENTATION.hudBottomHeight / 2, 960, MAJIN_CAVE_PRESENTATION.hudBottomHeight, WINDOW_COLOR, 0.96)
      .setStrokeStyle(1, 0xd8e4ff, 0.72).setDepth(UI_DEPTH).setScrollFactor(0));
    this.floorLabel = this.registerHudObject(this.add.text(16, 12, "", {
      color: "#ffffff", fontFamily: "monospace", fontSize: "18px", stroke: "#060814", strokeThickness: 4,
    }).setDepth(UI_DEPTH + 2).setScrollFactor(0));
    this.statusText = this.registerHudObject(this.add.text(282, 12, "", {
      color: "#eaf4ff", fontFamily: "monospace", fontSize: "18px",
    }).setDepth(UI_DEPTH + 2).setScrollFactor(0));
    this.bossHudName = this.registerHudObject(this.add.text(574, 15, "まじん", {
      color: "#f5d6df", fontFamily: "monospace", fontSize: "14px", stroke: "#230b1c", strokeThickness: 3,
    }).setDepth(UI_DEPTH + 2).setScrollFactor(0).setVisible(false));
    this.bossHudGauge = this.registerHudObject(this.add.graphics().setDepth(UI_DEPTH + 2).setScrollFactor(0).setVisible(false));
    this.messageText = this.registerHudObject(this.add.text(174, 640, "", {
      color: "#ffffff", fontFamily: "monospace", fontSize: "17px", lineSpacing: 3, wordWrap: { width: 420 },
    }).setDepth(UI_DEPTH + 2).setScrollFactor(0));
    this.registerHudObject(this.add.text(MAJIN_CAVE_PRESENTATION.minimap.x, 48, "探索地図", {
      color: "#c8d8ed", fontFamily: "monospace", fontSize: "11px",
    }).setDepth(UI_DEPTH + 2).setScrollFactor(0));
    this.minimap = this.registerHudObject(this.add.graphics().setDepth(UI_DEPTH + 2).setScrollFactor(0));
  }

  private createTouchControls(): void {
    this.createTouchButton(80, 638, "↑", "moveUp", 22);
    this.createTouchButton(42, 674, "←", "moveLeft", 22);
    this.createTouchButton(118, 674, "→", "moveRight", 22);
    this.createTouchButton(80, 706, "↓", "moveDown", 22);
    this.createTouchButton(790, 672, "待", "cancel", 22);
    this.createTouchButton(872, 672, "Z", "confirm", 27);
    this.createTouchButton(706, 672, "地図", "map", 22);
    this.createTouchButton(630, 672, "?", "menu", 18);
  }

  private createTouchButton(x: number, y: number, label: string, action: "moveUp" | "moveDown" | "moveLeft" | "moveRight" | "confirm" | "cancel" | "menu" | "map", radius = 28): void {
    const button = this.registerHudObject(this.add.circle(x, y, radius, 0x172a4b, 0.8).setStrokeStyle(2, 0xd5e5ff, 0.82).setDepth(UI_DEPTH + 4).setScrollFactor(0).setInteractive({ useHandCursor: true }));
    this.registerHudObject(this.add.text(x, y, label, { color: "#ffffff", fontFamily: "monospace", fontSize: `${Math.round(radius * 0.72)}px` }).setOrigin(0.5).setDepth(UI_DEPTH + 5).setScrollFactor(0));
    button.on("pointerdown", () => this.actions.queuePressed(action));
    button.on("pointerover", () => button.setFillStyle(0x345b8a, 1));
    button.on("pointerout", () => button.setFillStyle(0x172a4b, 0.85));
  }

  private consumeDirection(): MajinCaveDirection | null {
    if (this.actions.consumePressed("moveUp")) return "up";
    if (this.actions.consumePressed("moveDown")) return "down";
    if (this.actions.consumePressed("moveLeft")) return "left";
    if (this.actions.consumePressed("moveRight")) return "right";
    return null;
  }

  private resolvePlayerAction(action: MajinCavePlayerAction, direction?: MajinCaveDirection): void {
    if (!action.valid) {
      this.setMessage("いわかべに ぶつかった。");
      return;
    }
    this.resolvingTurn = true;
    // Scene-level gate prevents update() work; InputSystem's lock also discards keyboard presses
    // that arrive during lunge / slash / hurt so they cannot become an unintended next turn.
    this.actions.setLocked(true);
    void this.presentTurn(action, direction).catch((error: unknown) => {
      // Keep a damaged development asset from permanently locking the turn UI.
      console.error("[DEV_MAJIN_CAVE] Failed to present monster turn.", error);
      if (this.sys.isActive()) {
        this.setMessage("ひょうじに しっぱいした。もういちど ためして。");
      }
    });
  }

  /**
   * The turn system mutates logical positions first. This small view-only sequence then catches
   * sprites up with tweens/animations while input remains locked, so visual timing cannot change
   * turn order, collision, damage or the defeated-enemy invariant.
   */
  private async presentTurn(action: Exclude<MajinCavePlayerAction, { readonly valid: false }>, direction?: MajinCaveDirection): Promise<void> {
    try {
      if (direction && action.kind === "move") await this.movePlayerVisual(action.target, direction);
      if (action.kind === "attack") {
        if (direction) {
          this.facePlayerForAttack(direction);
          await this.attackPresentation.play({
            player: this.playerVisual,
            direction,
            impact: this.toPixel(action.enemy.position),
            isMajin: action.enemy.definitionId === "majin",
            onHit: async () => {
              const hurt = this.monsterSprites.damage(action.enemy, action.defeated);
              // `damageEnemy` already changed only the logical HP. Draw that result at the same
              // instant as the hurt pose, before the existing enemy-phase regeneration occurs.
              this.renderHud();
              await hurt;
            },
          });
        } else {
          await this.monsterSprites.damage(action.enemy, action.defeated);
        }
      } else if (action.kind === "heat") {
        await this.monsterSprites.damage(action.enemy, action.defeated);
      }

      const arrivingMajin = this.revealMajinWhenVisible();
      if (arrivingMajin) await this.playMajinEntrance(arrivingMajin);

      let message = this.messageForPlayerAction(action);
      if (arrivingMajin) message = `まじんが あらわれた！\n${message}`;
      const levelUpMessage = this.grantDefeatExperience(action);
      if (levelUpMessage) message = `${message}\n${levelUpMessage}`;
      if ((action.kind === "attack" || action.kind === "heat") && action.defeated && action.enemy.definitionId === "majin") this.playReturnCue();
      const enemyEvents = this.turns.resolveEnemyPhase(this.run);
      await this.presentEnemyPhase(enemyEvents);
      if (this.run.playerHp === 0) {
        this.run.recoverAtCurrentEntrance();
        const point = this.toPixel(this.run.playerPosition);
        this.playerVisual.setPosition(point.x, point.y + 11);
        message = "いしきが もどった。\n入口のかいだんへ もどされた。";
      } else {
        const enemyMessage = this.messageForEnemyPhase(enemyEvents);
        if (enemyMessage) message = `${message}\n${enemyMessage}`;
        const stairPrompt = this.run.stairPrompt();
        if (stairPrompt && action.kind === "move") message = `${message}\n${stairPrompt}`;
      }
      this.setMessage(message);
      this.renderStairMarkers();
      this.monsterSprites.syncAlive(this.run.getAliveEnemies());
      this.updateVisibility();
      this.renderHud();
    } finally {
      // Scene shutdown disposes the controller and stops its tweens; no callback mutates run state.
      if (this.sys.isActive()) {
        this.resolvingTurn = false;
        this.actions.setLocked(false);
      }
    }
  }

  private async presentEnemyPhase(events: readonly MajinCaveEnemyEvent[]): Promise<void> {
    for (const event of events) {
      if (event.kind === "move") {
        await this.monsterSprites.move(event.enemy);
      } else if (event.kind === "attack") {
        await this.monsterSprites.attack(event.enemy, this.run.playerPosition, () => { void this.flashPlayerDamage(); });
      }
    }
  }

  private movePlayerVisual(target: MajinCavePoint, direction: MajinCaveDirection): Promise<void> {
    const destination = this.toPixel(target);
    this.facePlayer(direction);
    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.playerVisual,
        x: destination.x,
        y: destination.y + 11,
        duration: MAJIN_CAVE_PRESENTATION.movement.playerMs,
        ease: "Quad.easeOut",
        onComplete: () => {
          if (this.playerVisual.active) {
            this.playerVisual.anims.stop();
            this.playerVisual.setFrame(idleFrame(direction));
          }
          resolve();
        },
      });
    });
  }

  private flashPlayerDamage(): Promise<void> {
    const startX = this.playerVisual.x;
    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.playerVisual,
        x: startX + 5,
        alpha: 0.28,
        duration: 42,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          if (this.playerVisual.active) this.playerVisual.setPosition(startX, this.playerVisual.y).setAlpha(1);
          resolve();
        },
      });
    });
  }

  private messageForPlayerAction(action: Exclude<MajinCavePlayerAction, { readonly valid: false }>): string {
    if (action.kind === "move") return "一歩 すすんだ。";
    if (action.kind === "wait") return "そのばで まった。";
    const name = this.run.enemyDefinition(action.enemy).name;
    const experience = this.run.enemyDefinition(action.enemy).experience;
    if (action.defeated && action.enemy.definitionId === "majin") return `まじんを たおした！ ${experience}EXP\nどうくつを もどろう。`;
    return action.defeated ? `${name}を たおした！ ${experience}EXP` : `${name}に ${action.damage} ダメージ！`;
  }

  /**
   * 倒した敵のEXP(MONSTER_ROSTERの正式値)を主人公へ加算して保存し、レベルが上がれば
   * どうくつ内の能力値も即座に更新する。レベルアップ行(なければnull)を返す。
   */
  private grantDefeatExperience(action: Exclude<MajinCavePlayerAction, { readonly valid: false }>): string | null {
    if ((action.kind !== "attack" && action.kind !== "heat") || !action.defeated) return null;
    const experience = this.run.enemyDefinition(action.enemy).experience;
    const { levelUps } = this.progression.awardExperience(["hero"], experience);
    if (levelUps.length === 0) return null;
    this.run.applyHeroStats(buildMajinCaveHero(this.progression));
    return formatLevelUpLines(levelUps).join("\n");
  }

  private messageForEnemyPhase(events: readonly MajinCaveEnemyEvent[]): string | null {
    const attack = events.find((event): event is Extract<MajinCaveEnemyEvent, { kind: "attack" }> => event.kind === "attack");
    if (!attack) return null;
    return `${this.run.enemyDefinition(attack.enemy).name}の こうげき！ ${attack.damage} ダメージ。`;
  }

  private skipDevRunToFloor(floorNumber: number): void {
    while (this.run.currentFloorNumber < floorNumber) {
      const downStair = this.run.currentFloor.downStair;
      if (!downStair) throw new Error("DEV Majin floor route requires a descending stair");
      this.run.setPlayerPosition(downStair);
      if (this.run.useCurrentStair() !== "descended") throw new Error("DEV Majin floor route could not descend");
    }
  }

  private useStair(): void {
    const result = this.run.useCurrentStair();
    if (result === "none") {
      this.setMessage(this.run.currentFloorNumber === MAJIN_CAVE_FLOOR_COUNT && this.run.phase === "descent" ? "奥に まじんの気配がする。" : "ここには かいだんがない。");
      return;
    }
    if (result === "escaped") {
      this.leaveCave();
      return;
    }
    this.renderFloor();
    if (this.run.revealMonsterHouse()) {
      this.renderHud();
      this.playMonsterHouseReveal();
      return;
    }
    this.setMessage(result === "descended" ? `${this.run.currentFloorNumber}Fへ おりた。` : `${this.run.currentFloorNumber}Fへ もどった。`);
  }

  private leaveCave(): void {
    this.transitioning = true;
    this.logDevTempoReport();
    this.setMessage("まじんのどうくつを でた。");
    beginMapTransition(this, this.actions, this.returnSceneKey, this.returnData, MAP_TRANSITION_FADE_MS);
  }

  private renderFloor(): void {
    this.destroyObjects(this.floorObjects);
    this.destroyObjects(this.stairObjects);
    this.destroyFogTiles();
    this.monsterSprites.beginFloor(this.run.getAliveEnemies());
    const floor = this.run.currentFloor;
    const theme = getMajinCaveTheme(floor.floorNumber);
    for (let y = 0; y < floor.grid.length; y += 1) {
      for (let x = 0; x < floor.grid[y].length; x += 1) {
        const walkable = floor.grid[y][x];
        const frames = walkable ? theme.floorFrames : [theme.wallFrame];
        const frame = frames[(x * 17 + y * 11 + floor.floorNumber) % frames.length];
        const point = this.toPixel({ x, y });
        const tile = this.registerWorldObject(this.add.image(point.x, point.y, MAJIN_CAVE_TILESET.key, frame).setDepth(0).setTint(theme.tint));
        this.floorObjects.push(tile);
        if (walkable && !this.isStairCell({ x, y }) && (x * 7 + y * 13 + floor.floorNumber) % 23 === 0) {
          const accent = this.registerWorldObject(this.add.image(point.x, point.y, MAJIN_CAVE_TILESET.key, theme.accentFrames[(x + y) % theme.accentFrames.length]).setDepth(1).setTint(theme.tint).setAlpha(0.55));
          this.floorObjects.push(accent);
        }
        const fog = this.registerWorldObject(this.add.rectangle(point.x, point.y, MAJIN_CAVE_GRID.tileSize, MAJIN_CAVE_GRID.tileSize, 0x01030b, 1).setDepth(6));
        this.fogTiles.set(pointKey({ x, y }), fog);
      }
    }
    if (floor.floorNumber === MAJIN_CAVE_FLOOR_COUNT && floor.bossPosition) this.renderBossRoomAccent(floor.bossPosition);
    this.renderStairMarkers();
    this.renderActors();
    this.updateVisibility();
    this.cameras.main.centerOn(this.playerVisual.x, this.playerVisual.y);
    this.renderHud();
  }

  private renderBossRoomAccent(point: MajinCavePoint): void {
    const pixel = this.toPixel(point);
    const aura = this.registerWorldObject(this.add.circle(pixel.x, pixel.y, 70, 0x5b2449, 0.3).setDepth(2));
    const inner = this.registerWorldObject(this.add.circle(pixel.x, pixel.y, 39, 0x8b4a7a, 0.2).setStrokeStyle(2, 0xe3b4ca, 0.36).setDepth(3));
    this.floorObjects.push(aura, inner);
  }

  private createStairMarker(point: MajinCavePoint, arrow: "↑" | "↓", label: string, visible: boolean): void {
    const pixel = this.toPixel(point);
    const alpha = visible ? 1 : 0.46;
    const ring = this.registerWorldObject(this.add.rectangle(pixel.x, pixel.y, 25, 25, 0x101628, 0.9 * alpha).setStrokeStyle(2, 0xffdd7e, alpha).setDepth(8));
    const text = this.registerWorldObject(this.add.text(pixel.x, pixel.y - 2, arrow, { color: "#ffe8a6", fontFamily: "monospace", fontSize: "23px" }).setOrigin(0.5).setDepth(9).setAlpha(alpha));
    const caption = this.registerWorldObject(this.add.text(pixel.x, pixel.y + 22, label, { color: "#e9dcaf", fontFamily: "monospace", fontSize: "10px" }).setOrigin(0.5, 0).setDepth(9).setAlpha(alpha));
    this.stairObjects.push(ring, text, caption);
  }

  private renderStairMarkers(): void {
    this.destroyObjects(this.stairObjects);
    const floor = this.run.currentFloor;
    // A stair becomes a world marker only after the player has actually explored it.
    // This matches the explored-only minimap and prevents an unexplored floor from
    // becoming a simple beeline to a visible destination.
    if (floor.downStair && floor.exploredCells.has(pointKey(floor.downStair))) this.createStairMarker(floor.downStair, "↓", "下りかいだん", this.isPointVisible(floor.downStair));
    if (this.run.phase === "ascent" && floor.exploredCells.has(pointKey(floor.upStair))) this.createStairMarker(floor.upStair, "↑", floor.floorNumber === 1 ? "でぐち" : "上りかいだん", this.isPointVisible(floor.upStair));
  }

  private renderActors(): void {
    const playerPoint = this.toPixel(this.run.playerPosition);
    this.playerVisual.setPosition(playerPoint.x, playerPoint.y + 11).setVisible(true);
    this.monsterSprites.syncAlive(this.run.getAliveEnemies());
  }

  private updateVisibility(): void {
    const floor = this.run.currentFloor;
    for (let y = 0; y < floor.grid.length; y += 1) {
      for (let x = 0; x < floor.grid[y].length; x += 1) {
        const point = { x, y };
        const fog = this.fogTiles.get(pointKey(point));
        if (fog) fog.setAlpha(getMajinCaveFogAlpha(floor.exploredCells.has(pointKey(point)), this.isPointVisible(point)));
      }
    }
    const visibleEnemyIds = new Set(
      this.run.getAliveEnemies().filter((enemy) => this.isPointVisible(enemy.position)).map((enemy) => enemy.id),
    );
    this.monsterSprites.setVisibility(visibleEnemyIds);
  }

  private renderHud(): void {
    const monsterHouseLabel = this.run.currentFloor.isMonsterHouse && this.run.currentFloor.monsterHouseRevealed ? "　モンスターハウス" : "";
    this.floorLabel.setText(`まじんのどうくつ　${this.run.currentFloorNumber}F${this.run.phase === "ascent" ? "　かえりみち" : ""}${monsterHouseLabel}`);
    this.statusText.setText(`Lv ${this.run.hero.level}　HP ${this.run.playerHp}/${this.run.hero.maxHp}　MP ${this.run.playerMp}/${this.run.hero.maxMp}`);
    this.statusText.setColor(this.run.playerHp <= this.run.hero.maxHp / 3 ? "#ffb7bd" : "#eaf4ff");
    this.renderMajinHud();
    this.renderMinimap();
  }

  /** The boss bar exists only during the revealed 10F battle; it is not a global battle HUD. */
  private renderMajinHud(): void {
    const boss = this.run.getAliveEnemies().find((enemy) => enemy.definitionId === "majin");
    const visible = this.run.currentFloorNumber === MAJIN_CAVE_FLOOR_COUNT
      && this.run.phase === "descent"
      && this.run.currentFloor.majinRevealed
      && boss !== undefined;
    this.bossHudName.setVisible(visible);
    this.bossHudGauge.setVisible(visible).clear();
    if (!visible || !boss) return;
    const maximum = this.run.enemyDefinition(boss).maxHp;
    const ratio = Phaser.Math.Clamp(boss.hp / maximum, 0, 1);
    const x = 648;
    const y = 18;
    const width = 148;
    this.bossHudGauge.fillStyle(0x2a1020, 1).fillRect(x, y, width, 12);
    this.bossHudGauge.fillStyle(0xf3c7d4, 0.92).fillRect(x + 1, y + 1, Math.max(0, (width - 2) * ratio), 10);
    this.bossHudGauge.lineStyle(1, 0xffe1ea, 0.8).strokeRect(x, y, width, 12);
  }

  private renderMinimap(): void {
    this.drawExploredMap(this.minimap, MAJIN_CAVE_PRESENTATION.minimap.x, MAJIN_CAVE_PRESENTATION.minimap.y, MAJIN_CAVE_PRESENTATION.minimap.cellSize);
  }

  private drawExploredMap(graphics: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
    const floor = this.run.currentFloor;
    const width = MAJIN_CAVE_GRID.columns * scale;
    const height = MAJIN_CAVE_GRID.rows * scale;
    graphics.clear();
    graphics.fillStyle(0x03060c, 0.94).fillRect(x - 5, y - 5, width + 10, height + 10);
    for (const cell of floor.exploredCells) {
      const [cellX, cellY] = cell.split(",").map(Number);
      const visible = this.isPointVisible({ x: cellX, y: cellY });
      graphics.fillStyle(visible ? 0xb8c9dc : 0x4c5b70, 1).fillRect(x + cellX * scale, y + cellY * scale, scale, scale);
    }
    if (floor.downStair && floor.exploredCells.has(pointKey(floor.downStair))) {
      graphics.fillStyle(0xffd67a, 1).fillRect(x + floor.downStair.x * scale, y + floor.downStair.y * scale, scale, scale);
    }
    if (this.run.phase === "ascent" && floor.exploredCells.has(pointKey(floor.upStair))) {
      graphics.fillStyle(0x77dfff, 1).fillRect(x + floor.upStair.x * scale, y + floor.upStair.y * scale, scale, scale);
    }
    for (const enemy of this.run.getAliveEnemies()) {
      if (this.isPointVisible(enemy.position)) graphics.fillStyle(this.run.enemyDefinition(enemy).markerColor, 1).fillRect(x + enemy.position.x * scale, y + enemy.position.y * scale, scale, scale);
    }
    const playerMarkSize = Math.max(scale, 4);
    graphics.fillStyle(0xffffff, 1).fillRect(x + this.run.playerPosition.x * scale - (playerMarkSize - scale) / 2, y + this.run.playerPosition.y * scale - (playerMarkSize - scale) / 2, playerMarkSize, playerMarkSize);
    graphics.lineStyle(1, 0xd9e7ff, 0.9).strokeRect(x - 5, y - 5, width + 10, height + 10);
  }

  private facePlayer(direction: MajinCaveDirection): void {
    this.playerVisual.setFrame(idleFrame(direction));
    this.playerVisual.play(walkAnimKey(PROTAGONIST_SPRITE, direction), true);
  }

  /** The walk sheet has no attack row; use the requested direction's stable pose for the lunge. */
  private facePlayerForAttack(direction: MajinCaveDirection): void {
    this.playerVisual.anims.stop();
    this.playerVisual.setFrame(idleFrame(direction));
  }

  private toggleMapOverlay(): void {
    this.mapOverlayOpen = !this.mapOverlayOpen;
    this.destroyObjects(this.mapOverlayObjects);
    if (!this.mapOverlayOpen) return;
    const scale = 16;
    const width = MAJIN_CAVE_GRID.columns * scale;
    const height = MAJIN_CAVE_GRID.rows * scale;
    const x = Math.round((960 - width) / 2);
    const y = Math.round((720 - height) / 2) + 12;
    const shade = this.registerHudObject(this.add.rectangle(480, 360, 960, 720, 0x02040b, 0.78).setDepth(300).setScrollFactor(0));
    const panel = this.registerHudObject(this.add.rectangle(480, 360, width + 80, height + 92, 0x080d18, 0.98).setStrokeStyle(2, 0xd8e4ff, 0.86).setDepth(301).setScrollFactor(0));
    const title = this.registerHudObject(this.add.text(480, y - 42, `${this.run.currentFloorNumber}F　探索地図`, {
      color: "#ffffff", fontFamily: "monospace", fontSize: "22px",
    }).setOrigin(0.5).setDepth(302).setScrollFactor(0));
    const hint = this.registerHudObject(this.add.text(480, y + height + 22, "M / X: もどる　　黄: 下り　青: 上り　白: 現在地", {
      color: "#b7c9e0", fontFamily: "monospace", fontSize: "13px",
    }).setOrigin(0.5).setDepth(302).setScrollFactor(0));
    const map = this.registerHudObject(this.add.graphics().setDepth(302).setScrollFactor(0));
    this.drawExploredMap(map, x, y, scale);
    this.mapOverlayObjects.push(shade, panel, title, hint, map);
  }

  private toggleHelp(): void {
    this.helpOpen = !this.helpOpen;
    this.destroyObjects(this.helpObjects);
    if (!this.helpOpen) return;
    const panel = this.registerHudObject(this.add.rectangle(480, 360, 630, 310, 0x060a15, 0.96).setStrokeStyle(3, 0xe2eeff, 1).setDepth(300).setScrollFactor(0));
    const text = this.registerHudObject(this.add.text(480, 360, "まじんのどうくつ\n\n矢印 / 十字ボタン: 1マス移動\n敵へ進む: その場でこうげき\nX / 待: そのばで待つ\nZ / Enter: かいだんを使う\nM / 地図: 探索済み全体マップ\n\n行動のあと、敵も一度ずつ動く。\nC / ? / X: もどる", {
      align: "center", color: "#ffffff", fontFamily: "monospace", fontSize: "20px", lineSpacing: 9,
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0));
    this.helpObjects.push(panel, text);
  }

  private revealMajinWhenVisible(): MajinCaveEnemyState | undefined {
    const majin = this.run.getAliveEnemies().find((enemy) => enemy.definitionId === "majin");
    if (!majin || !this.isPointVisible(majin.position) || !this.run.revealMajin()) return undefined;
    return majin;
  }

  /** A short, one-time 10F arrival beat. It does not alter the next enemy phase or boss stats. */
  private async playMajinEntrance(majin: MajinCaveEnemyState): Promise<void> {
    this.setMessage("……\nまじんの けはいがする。");
    const shade = this.registerHudObject(this.add.rectangle(480, 360, 960, 720, 0x06030a, 0).setDepth(280).setScrollFactor(0));
    const title = this.registerHudObject(this.add.text(480, 190, "まじんが あらわれた！", {
      color: "#f6d9df", fontFamily: "monospace", fontSize: "31px", stroke: "#2a0a1c", strokeThickness: 7,
    }).setOrigin(0.5).setAlpha(0).setDepth(281).setScrollFactor(0));
    this.majinRevealObjects.push(shade, title);
    await this.tweenPresentation([shade, title], { alpha: 1 }, 150);
    shade.setAlpha(0.62);
    await this.monsterSprites.revealBoss(majin);
    this.cameras.main.shake(130, 0.006);
    await this.tweenPresentation([shade, title], { alpha: 0 }, 310);
    this.destroyObjects(this.majinRevealObjects);
  }

  private tweenPresentation(
    targets: readonly Phaser.GameObjects.GameObject[],
    properties: Record<string, number>,
    duration: number,
  ): Promise<void> {
    if (!this.sys.isActive()) return Promise.resolve();
    return new Promise((resolve) => {
      this.tweens.add({
        targets,
        ...properties,
        duration,
        ease: "Cubic.easeOut",
        onComplete: () => resolve(),
      });
    });
  }

  private playMonsterHouseReveal(): void {
    this.monsterHouseRevealActive = true;
    this.setMessage("モンスターの\nけはいで いっぱいだ……！");
    this.monsterSprites.flashReveal(this.run.getAliveEnemies());
    const shade = this.registerHudObject(this.add.rectangle(480, 360, 960, 720, 0x04050c, 0.82).setDepth(280).setScrollFactor(0));
    const title = this.registerHudObject(this.add.text(480, 350, "モンスターハウス！", {
      color: "#f7d7a5", fontFamily: "monospace", fontSize: "34px", stroke: "#2b1020", strokeThickness: 7,
    }).setOrigin(0.5).setDepth(281).setScrollFactor(0));
    this.monsterHouseRevealObjects.push(shade, title);
    this.tweens.add({
      targets: [shade, title],
      alpha: 0,
      delay: 160,
      duration: 360,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.destroyObjects(this.monsterHouseRevealObjects);
        this.monsterHouseRevealActive = false;
        this.updateVisibility();
      },
    });
  }

  private playReturnCue(): void {
    const wash = this.registerHudObject(this.add.rectangle(480, 360, 960, 720, 0x8c5fa8, 0.28).setDepth(270).setScrollFactor(0));
    this.tweens.add({
      targets: wash,
      alpha: 0,
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => wash.destroy(),
    });
  }

  private logDevTempoReport(): void {
    if (!DEV_MAJIN_CAVE_TELEMETRY) return;
    const summary = this.run.getRunTempoSummary();
    console.groupCollapsed(`[DEV_MAJIN_CAVE] seed ${summary.seed} / モンスターハウス ${summary.monsterHouseFloor}F`);
    console.table(this.run.getTempoRows());
    console.table([this.run.getMonsterHouseTempoRow()]);
    console.table([summary]);
    console.groupEnd();
  }

  private isStairCell(point: MajinCavePoint): boolean {
    const floor = this.run.currentFloor;
    return (floor.downStair?.x === point.x && floor.downStair.y === point.y) || (floor.upStair.x === point.x && floor.upStair.y === point.y);
  }

  private isPointVisible(point: MajinCavePoint): boolean {
    return isMajinCavePointVisible(this.run.playerPosition, point, DEV_MAJIN_CAVE_BALANCE.visionRadius);
  }

  private toPixel(point: MajinCavePoint): MajinCavePoint {
    return { x: MAJIN_CAVE_GRID.originX + point.x * MAJIN_CAVE_GRID.tileSize + MAJIN_CAVE_GRID.tileSize / 2, y: MAJIN_CAVE_GRID.originY + point.y * MAJIN_CAVE_GRID.tileSize + MAJIN_CAVE_GRID.tileSize / 2 };
  }

  private setMessage(message: string): void {
    this.messageText.setText(message);
  }

  /** The world camera zooms; HUD objects are rendered exactly once by a separate fixed camera. */
  private registerHudObject<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.cameras.main.ignore(object);
    return object;
  }

  private registerWorldObject<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.hudCamera.ignore(object);
    return object;
  }

  private destroyFogTiles(): void {
    for (const tile of this.fogTiles.values()) tile.destroy();
    this.fogTiles.clear();
  }

  private destroyObjects(objects: Phaser.GameObjects.GameObject[]): void {
    for (const object of objects) object.destroy();
    objects.length = 0;
  }
}
