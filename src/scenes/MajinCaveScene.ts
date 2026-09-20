import Phaser from "phaser";
import { DEV_MAJIN_CAVE_BALANCE, getMajinCaveTheme, MAJIN_CAVE_DEFAULT_SEED, MAJIN_CAVE_FLOOR_COUNT, MAJIN_CAVE_GRID, MAJIN_CAVE_SCENE_KEY, MAJIN_CAVE_TILESET } from "../config/majinCave.ts";
import type { MajinCavePoint } from "../config/majinCave.ts";
import { MAP_TRANSITION_FADE_MS } from "../config/maps.ts";
import { PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { MAJIN_CAVE_ENEMIES } from "../data/majinCaveEnemies.ts";
import { idleFrame } from "../config/characterWalkSprite.ts";
import { ensureWalkAnimations, preloadWalkSprite, walkAnimKey } from "../systems/CharacterWalkSprite.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { beginMapTransition } from "../systems/MapTransition.ts";
import { pointKey } from "../systems/MajinCaveGenerator.ts";
import { MajinCaveRunState } from "../systems/MajinCaveRunState.ts";
import { MajinCaveTurnSystem } from "../systems/MajinCaveTurnSystem.ts";
import type { MajinCaveDirection, MajinCaveEnemyEvent, MajinCavePlayerAction } from "../systems/MajinCaveTurnSystem.ts";

const WINDOW_COLOR = 0x080d18;
const UI_DEPTH = 200;
const ACTOR_DEPTH = 20;
const DEV_MAJIN_CAVE_TELEMETRY = import.meta.env.DEV;
let hasShownMajinCaveGuide = false;

function readDevMajinCaveSeed(params: URLSearchParams): number | null {
  const value = Number(params.get("majinCaveSeed"));
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff ? value : null;
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
  private run!: MajinCaveRunState;
  private turns = new MajinCaveTurnSystem();
  private playerVisual!: Phaser.GameObjects.Sprite;
  private minimap!: Phaser.GameObjects.Graphics;
  private floorLabel!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private floorObjects: Phaser.GameObjects.GameObject[] = [];
  private stairObjects: Phaser.GameObjects.GameObject[] = [];
  private actorObjects: Phaser.GameObjects.GameObject[] = [];
  private helpObjects: Phaser.GameObjects.GameObject[] = [];
  private monsterHouseRevealObjects: Phaser.GameObjects.GameObject[] = [];
  private helpOpen = false;
  private monsterHouseRevealActive = false;
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
    for (const definition of Object.values(MAJIN_CAVE_ENEMIES)) {
      if (definition.portrait && !this.textures.exists(definition.portrait.key)) this.load.image(definition.portrait.key, definition.portrait.url);
    }
  }

  create(data?: MajinCaveSceneData): void {
    this.assertTilesetMetadata();
    ensureWalkAnimations(this, PROTAGONIST_SPRITE);
    const requestedSeed = data?.runSeed;
    const query = new URLSearchParams(window.location.search);
    const isDevMapTest = query.get("mapTest") === "majin-cave";
    const devSeed = isDevMapTest ? readDevMajinCaveSeed(query) : null;
    const runSeed = Number.isInteger(requestedSeed) ? requestedSeed! : isDevMapTest ? (devSeed ?? MAJIN_CAVE_DEFAULT_SEED) : Date.now();
    this.run = new MajinCaveRunState(runSeed);
    this.turns = new MajinCaveTurnSystem();
    this.transitioning = false;
    this.helpOpen = false;
    this.monsterHouseRevealActive = false;
    // The point-selection WorldMapScene owns normal entry and return. DEV starts stay
    // standalone, and future events can still provide an explicit return route.
    const enteredFromWorldMap = data?.spawnId === "fromWorldMap";
    this.returnSceneKey = data?.returnSceneKey ?? (enteredFromWorldMap ? "WorldMapScene" : MAJIN_CAVE_SCENE_KEY);
    this.returnData = data?.returnData ?? (enteredFromWorldMap ? { worldMapEntryId: "from_majin_cave" } : {});

    this.cameras.main.setBackgroundColor("#05060e");
    this.playerVisual = this.add.sprite(0, 0, PROTAGONIST_SPRITE.key, idleFrame("down")).setOrigin(0.5, 0.88).setScale(0.62).setDepth(ACTOR_DEPTH + 2);
    this.createHud();
    this.createTouchControls();
    this.actions = new InputSystem(window, document);
    const cleanup = (): void => {
      this.actions.destroy();
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    this.renderFloor();
    if (!hasShownMajinCaveGuide) {
      hasShownMajinCaveGuide = true;
      this.setMessage("このどうくつでは\n一歩すすめば 敵も動く……");
    } else {
      this.setMessage("一歩ずつ、気をつけて進もう。");
    }
  }

  update(): void {
    if (this.transitioning) return;
    if (this.monsterHouseRevealActive) return;
    if (this.helpOpen) {
      if (this.actions.consumePressed("menu") || this.actions.consumePressed("cancel")) this.toggleHelp();
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

  private createHud(): void {
    this.add.rectangle(480, 663, 960, 114, WINDOW_COLOR, 0.94).setStrokeStyle(2, 0xd8e4ff, 0.8).setDepth(UI_DEPTH);
    this.floorLabel = this.add.text(18, 16, "", {
      color: "#ffffff", fontFamily: "monospace", fontSize: "24px", stroke: "#060814", strokeThickness: 5,
    }).setDepth(UI_DEPTH + 2);
    this.statusText = this.add.text(395, 628, "", {
      color: "#eaf4ff", fontFamily: "monospace", fontSize: "18px", lineSpacing: 4,
    }).setDepth(UI_DEPTH + 2);
    this.messageText = this.add.text(182, 627, "", {
      color: "#ffffff", fontFamily: "monospace", fontSize: "17px", lineSpacing: 4, wordWrap: { width: 200 },
    }).setDepth(UI_DEPTH + 2);
    this.minimap = this.add.graphics().setDepth(UI_DEPTH + 2);
  }

  private createTouchControls(): void {
    this.createTouchButton(80, 630, "↑", "moveUp");
    this.createTouchButton(38, 670, "←", "moveLeft");
    this.createTouchButton(122, 670, "→", "moveRight");
    this.createTouchButton(80, 704, "↓", "moveDown");
    this.createTouchButton(785, 672, "待", "cancel", 24);
    this.createTouchButton(870, 672, "Z", "confirm", 30);
    this.createTouchButton(710, 672, "?", "menu", 24);
  }

  private createTouchButton(x: number, y: number, label: string, action: "moveUp" | "moveDown" | "moveLeft" | "moveRight" | "confirm" | "cancel" | "menu", radius = 28): void {
    const button = this.add.circle(x, y, radius, 0x172a4b, 0.85).setStrokeStyle(2, 0xd5e5ff, 0.9).setDepth(UI_DEPTH + 4).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { color: "#ffffff", fontFamily: "monospace", fontSize: `${Math.round(radius * 0.8)}px` }).setOrigin(0.5).setDepth(UI_DEPTH + 5);
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
    if (direction && action.kind === "move") this.facePlayer(direction);
    let message = this.messageForPlayerAction(action);
    const enemyEvents = this.turns.resolveEnemyPhase(this.run);
    if (this.run.playerHp === 0) {
      this.run.recoverAtCurrentEntrance();
      message = "いしきが もどった。\n入口のかいだんへ もどされた。";
    } else {
      const enemyMessage = this.messageForEnemyPhase(enemyEvents);
      if (enemyMessage) message = `${message}\n${enemyMessage}`;
      const stairPrompt = this.run.stairPrompt();
      if (stairPrompt && action.kind === "move") message = `${message}\n${stairPrompt}`;
    }
    this.setMessage(message);
    this.renderStairMarkers();
    this.renderActors();
    this.renderHud();
  }

  private messageForPlayerAction(action: Exclude<MajinCavePlayerAction, { readonly valid: false }>): string {
    if (action.kind === "move") return "一歩 すすんだ。";
    if (action.kind === "wait") return "そのばで まった。";
    const name = this.run.enemyDefinition(action.enemy).name;
    if (action.defeated && action.enemy.definitionId === "majin") return "まじんを たおした！\nどうくつを もどろう。";
    return action.defeated ? `${name}を たおした！` : `${name}に ${action.damage} ダメージ！`;
  }

  private messageForEnemyPhase(events: readonly MajinCaveEnemyEvent[]): string | null {
    const attack = events.find((event): event is Extract<MajinCaveEnemyEvent, { kind: "attack" }> => event.kind === "attack");
    if (!attack) return null;
    return `${this.run.enemyDefinition(attack.enemy).name}の こうげき！ ${attack.damage} ダメージ。`;
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
    const floor = this.run.currentFloor;
    const theme = getMajinCaveTheme(floor.floorNumber);
    for (let y = 0; y < floor.grid.length; y += 1) {
      for (let x = 0; x < floor.grid[y].length; x += 1) {
        const walkable = floor.grid[y][x];
        const frames = walkable ? theme.floorFrames : [theme.wallFrame];
        const frame = frames[(x * 17 + y * 11 + floor.floorNumber) % frames.length];
        const point = this.toPixel({ x, y });
        const tile = this.add.image(point.x, point.y, MAJIN_CAVE_TILESET.key, frame).setDepth(0).setTint(theme.tint);
        this.floorObjects.push(tile);
        if (walkable && !this.isStairCell({ x, y }) && (x * 7 + y * 13 + floor.floorNumber) % 23 === 0) {
          const accent = this.add.image(point.x, point.y, MAJIN_CAVE_TILESET.key, theme.accentFrames[(x + y) % theme.accentFrames.length]).setDepth(1).setTint(theme.tint).setAlpha(0.55);
          this.floorObjects.push(accent);
        }
      }
    }
    this.renderStairMarkers();
    this.renderActors();
    this.renderHud();
  }

  private createStairMarker(point: MajinCavePoint, arrow: "↑" | "↓", label: string): void {
    const pixel = this.toPixel(point);
    const ring = this.add.rectangle(pixel.x, pixel.y, 25, 25, 0x101628, 0.9).setStrokeStyle(2, 0xffdd7e, 1).setDepth(8);
    const text = this.add.text(pixel.x, pixel.y - 2, arrow, { color: "#ffe8a6", fontFamily: "monospace", fontSize: "23px" }).setOrigin(0.5).setDepth(9);
    const caption = this.add.text(pixel.x, pixel.y + 22, label, { color: "#e9dcaf", fontFamily: "monospace", fontSize: "10px" }).setOrigin(0.5, 0).setDepth(9);
    this.stairObjects.push(ring, text, caption);
  }

  private renderStairMarkers(): void {
    this.destroyObjects(this.stairObjects);
    const floor = this.run.currentFloor;
    // A stair becomes a world marker only after the player has actually explored it.
    // This matches the explored-only minimap and prevents an unexplored floor from
    // becoming a simple beeline to a visible destination.
    if (floor.downStair && floor.exploredCells.has(pointKey(floor.downStair))) this.createStairMarker(floor.downStair, "↓", "下りかいだん");
    if (this.run.phase === "ascent" && floor.exploredCells.has(pointKey(floor.upStair))) this.createStairMarker(floor.upStair, "↑", floor.floorNumber === 1 ? "でぐち" : "上りかいだん");
  }

  private renderActors(): void {
    this.destroyObjects(this.actorObjects);
    const playerPoint = this.toPixel(this.run.playerPosition);
    this.playerVisual.setPosition(playerPoint.x, playerPoint.y + 11).setVisible(true);
    for (const enemy of this.run.getAliveEnemies()) {
      const definition = this.run.enemyDefinition(enemy);
      const point = this.toPixel(enemy.position);
      if (definition.portrait && this.textures.exists(definition.portrait.key)) {
        const portrait = this.add.image(point.x, point.y, definition.portrait.key).setDisplaySize(25, 25).setDepth(ACTOR_DEPTH).setTint(definition.markerColor);
        this.actorObjects.push(portrait);
      } else {
        const radius = definition.isBoss ? 15 : 12;
        const marker = this.add.circle(point.x, point.y, radius, definition.markerColor, 0.92).setStrokeStyle(2, 0xffffff, 0.85).setDepth(ACTOR_DEPTH);
        const symbol = this.add.text(point.x, point.y, definition.isBoss ? "魔" : "◆", { color: "#14121d", fontFamily: "monospace", fontSize: definition.isBoss ? "22px" : "16px" }).setOrigin(0.5).setDepth(ACTOR_DEPTH + 1);
        this.actorObjects.push(marker, symbol);
      }
    }
  }

  private renderHud(): void {
    const monsterHouseLabel = this.run.currentFloor.isMonsterHouse && this.run.currentFloor.monsterHouseRevealed ? "　モンスターハウス" : "";
    this.floorLabel.setText(`まじんのどうくつ　${this.run.currentFloorNumber}F${this.run.phase === "ascent" ? "　かえりみち" : ""}${monsterHouseLabel}`);
    this.statusText.setText(`Lv ${DEV_MAJIN_CAVE_BALANCE.level}  HP ${this.run.playerHp}/${DEV_MAJIN_CAVE_BALANCE.maxHp}\nMP ${this.run.playerMp}/${DEV_MAJIN_CAVE_BALANCE.maxMp}  X:待つ  C:?`);
    this.renderMinimap();
  }

  private renderMinimap(): void {
    const floor = this.run.currentFloor;
    const scale = 4;
    const x = 848;
    const y = 16;
    this.minimap.clear();
    this.minimap.fillStyle(0x03060c, 0.9).fillRect(x - 5, y - 5, MAJIN_CAVE_GRID.columns * scale + 10, MAJIN_CAVE_GRID.rows * scale + 10);
    for (const cell of floor.exploredCells) {
      const [cellX, cellY] = cell.split(",").map(Number);
      this.minimap.fillStyle(0x536579, 1).fillRect(x + cellX * scale, y + cellY * scale, scale, scale);
    }
    for (const stair of [floor.downStair, this.run.phase === "ascent" ? floor.upStair : null]) {
      if (stair && floor.exploredCells.has(pointKey(stair))) this.minimap.fillStyle(0xffd67a, 1).fillRect(x + stair.x * scale, y + stair.y * scale, scale, scale);
    }
    for (const enemy of this.run.getAliveEnemies()) {
      const visible = Math.abs(enemy.position.x - this.run.playerPosition.x) + Math.abs(enemy.position.y - this.run.playerPosition.y) <= DEV_MAJIN_CAVE_BALANCE.visionRadius;
      if (visible) this.minimap.fillStyle(this.run.enemyDefinition(enemy).markerColor, 1).fillRect(x + enemy.position.x * scale, y + enemy.position.y * scale, scale, scale);
    }
    this.minimap.fillStyle(0xffffff, 1).fillRect(x + this.run.playerPosition.x * scale, y + this.run.playerPosition.y * scale, scale, scale);
    this.minimap.lineStyle(1, 0xd9e7ff, 0.9).strokeRect(x - 5, y - 5, MAJIN_CAVE_GRID.columns * scale + 10, MAJIN_CAVE_GRID.rows * scale + 10);
  }

  private facePlayer(direction: MajinCaveDirection): void {
    this.playerVisual.setFrame(idleFrame(direction));
    this.playerVisual.play(walkAnimKey(PROTAGONIST_SPRITE, direction), true);
    this.time.delayedCall(90, () => {
      if (this.playerVisual.active) {
        this.playerVisual.anims.stop();
        this.playerVisual.setFrame(idleFrame(direction));
      }
    });
  }

  private toggleHelp(): void {
    this.helpOpen = !this.helpOpen;
    this.destroyObjects(this.helpObjects);
    if (!this.helpOpen) return;
    const panel = this.add.rectangle(480, 360, 630, 310, 0x060a15, 0.96).setStrokeStyle(3, 0xe2eeff, 1).setDepth(300);
    const text = this.add.text(480, 360, "まじんのどうくつ\n\n矢印 / 十字ボタン: 1マス移動\n敵へ進む: その場でこうげき\nX / 待: そのばで待つ\nZ / Enter: かいだんを使う\n\n行動のあと、敵も一度ずつ動く。\nC / ? / X: もどる", {
      align: "center", color: "#ffffff", fontFamily: "monospace", fontSize: "20px", lineSpacing: 9,
    }).setOrigin(0.5).setDepth(301);
    this.helpObjects.push(panel, text);
  }

  private playMonsterHouseReveal(): void {
    this.monsterHouseRevealActive = true;
    this.setMessage("モンスターの\nけはいで いっぱいだ……！");
    const shade = this.add.rectangle(480, 360, 960, 720, 0x04050c, 0.88).setDepth(280);
    const title = this.add.text(480, 350, "モンスターハウス", {
      color: "#f7d7a5", fontFamily: "monospace", fontSize: "34px", stroke: "#2b1020", strokeThickness: 7,
    }).setOrigin(0.5).setDepth(281);
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
      },
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

  private toPixel(point: MajinCavePoint): MajinCavePoint {
    return { x: MAJIN_CAVE_GRID.originX + point.x * MAJIN_CAVE_GRID.tileSize + MAJIN_CAVE_GRID.tileSize / 2, y: MAJIN_CAVE_GRID.originY + point.y * MAJIN_CAVE_GRID.tileSize + MAJIN_CAVE_GRID.tileSize / 2 };
  }

  private setMessage(message: string): void {
    this.messageText.setText(message);
  }

  private destroyObjects(objects: Phaser.GameObjects.GameObject[]): void {
    for (const object of objects) object.destroy();
    objects.length = 0;
  }
}
