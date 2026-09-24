import Phaser from "phaser";
import { DISPLAY } from "../config/display.ts";
import { IWAYAMA_SHOOTING, IWAYAMA_SHOOTING_ENTRIES, IWAYAMA_SHOOTING_SECTIONS, laneToScreenX } from "../config/iwayamaShooting.ts";
import type { ShootingEnemyMonsterId, ShootingEnemyMotion, ShootingEntry, ShootingRockKind, ShootingSection, ShootingSectionId } from "../config/iwayamaShooting.ts";
import { PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { TAROSA_SPRITE } from "../config/tarosaSprite.ts";
import { idleFrame } from "../config/characterWalkSprite.ts";
import { DEV_BATTLE_MONSTERS } from "../data/monsters.ts";
import { ensureWalkAnimations, preloadWalkSprite, walkAnimKey } from "../systems/CharacterWalkSprite.ts";
import { GameStateRepository } from "../systems/GameStateRepository.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import {
  circleOverlapsRect,
  createSeededRandom,
  explosionReaches,
  pushRectOutOfCircle,
  readShootingSectionQuery,
  sectionAt,
  wallPhase,
} from "../systems/IwayamaShooting.ts";
import type { ShootingCircle, ShootingRect } from "../systems/IwayamaShooting.ts";
import { ensureShootingTextures, SHOOTING_TEXTURES } from "../systems/IwayamaShootingTextures.ts";
import type { RainlandMapSceneData } from "./RainlandForestScene.ts";

const isDevMode = typeof import.meta.env !== "undefined" && import.meta.env.DEV;
const CFG = IWAYAMA_SHOOTING;
const ENEMY_IDS: readonly ShootingEnemyMonsterId[] = ["koakuma", "erimaki_hebi", "daija"];
const enemyTextureKey = (id: ShootingEnemyMonsterId): string => `iwsh.monster.${id}`;
/** 通路の左右の端(画面X)。 */
const PASSAGE_LEFT = laneToScreenX(CFG.lanes.min);
const PASSAGE_RIGHT = laneToScreenX(CFG.lanes.max);
const PASSAGE_CENTER = (PASSAGE_LEFT + PASSAGE_RIGHT) / 2;

const DEPTH = {
  floor: 0,
  sideWalls: 10,
  shadows: 20,
  light: 25,
  wall: 30,
  wallCracks: 31,
  wallLeak: 32,
  rockGlow: 99,
  rock: 100,
  enemy: 110,
  falling: 130,
  arrow: 150,
  actor: 200,
  debris: 300,
  dust: 310,
  sparks: 320,
  pebbles: 330,
  fore: 900,
  flash: 1500,
  hud: 2000,
  touch: 2100,
} as const;

export interface IwayamaShootingSceneData {
  /** DEV確認用。省略時はSection A(最初)から。 */
  readonly startSection?: ShootingSectionId;
}

type ShootingState = "prologue" | "playing" | "retry" | "wallBreak" | "outro" | "done";

interface RockRuntime {
  readonly kind: ShootingRockKind;
  x: number;
  y: number;
  readonly radius: number;
  hp: number;
  readonly sprite: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
  readonly glow?: Phaser.GameObjects.Image;
  alive: boolean;
  ignited: boolean;
  jiggleUntil: number;
}

interface EnemyRuntime {
  readonly monsterId: ShootingEnemyMonsterId;
  readonly motion: ShootingEnemyMotion;
  x: number;
  y: number;
  readonly baseX: number;
  readonly radius: number;
  hp: number;
  age: number;
  readonly sprite: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
  alive: boolean;
  popped: boolean;
}

/** 落石: 地面の影(予兆)が広がる → 上から落ちてくる → 着地で砕ける。空中にある間は矢では壊せない。 */
interface FallingRockRuntime {
  x: number;
  /** 着地する地面の位置(画面Y、床と一緒に流れる)。 */
  y: number;
  readonly radius: number;
  warningLeft: number;
  fallLeft: number;
  readonly shadow: Phaser.GameObjects.Image;
  readonly sprite: Phaser.GameObjects.Image;
  alive: boolean;
}

interface ArrowRuntime {
  readonly sprite: Phaser.GameObjects.Image;
  readonly trail: Phaser.GameObjects.Image;
  active: boolean;
}

type ArrowTarget =
  | { readonly type: "rock"; readonly rock: RockRuntime; readonly circle: ShootingCircle }
  | { readonly type: "enemy"; readonly enemy: EnemyRuntime; readonly circle: ShootingCircle };

interface WallChunk {
  readonly sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  spin: number;
  life: number;
}

interface WallCrack {
  readonly phase: 2 | 3 | 4;
  readonly points: { x: number; y: number }[];
}

interface WallRuntime {
  /** 岩壁の下端(画面Y)。上から下りてきて`CFG.wall.stopY`で止まる。 */
  bottom: number;
  hp: number;
  phase: 1 | 2 | 3 | 4 | 5;
  readonly image: Phaser.GameObjects.Image;
  readonly cracks: Phaser.GameObjects.Graphics;
  readonly leak: Phaser.GameObjects.Image;
  readonly light: Phaser.GameObjects.Image;
}

/** 仮想パッド(タッチ)。キーボードはInputSystemのisDownを使い、両方の入力を合成する。 */
interface TouchState {
  stickPointerId: number | null;
  stickX: number;
  stickY: number;
  firePointerId: number | null;
  dashPointerId: number | null;
}

const TOUCH_LAYOUT = {
  stick: { x: 120, y: 590, radius: 78, knobRadius: 32 },
  fire: { x: 858, y: 600, radius: 58 },
  dash: { x: 850, y: 470, radius: 38 },
} as const;

/** 岩壁の中の座標(左上基準)。穴・光漏れの中心。 */
const WALL_HEIGHT = CFG.wall.height + 40;
const WALL_HOLE = { x: PASSAGE_CENTER, y: WALL_HEIGHT - 120 } as const;

/**
 * No.09いわやまのどうくつ 1F「崩落の縦スクロール・シューティング」(見下ろし型、戦場の狼のようなスタイル)。
 * 1Fの赤い丸を調べると`RainlandImageMapScene`が地震の予兆を見せてからこのSceneを始める。
 * 洞窟の床が上から下へ流れ、タロサ(弓)が上へ進みながら上へ矢を撃つ。主人公は後ろ(下)をついて歩く。
 * 人物・岩・敵はすべて地面に影を落とし、床の上に立っているように見せる。
 * 最後の巨大岩壁を連射で崩すと`event.iwayama_cave_shooting_cleared`を保存して、何事もなかったように1Fへ戻る。
 * 耐久値はイベント専用で、通常のHP・戦闘・セーブ内容(フラグ以外)には触れない。
 */
export class IwayamaShootingScene extends Phaser.Scene {
  private actions!: InputSystem;
  private readonly gameState = new GameStateRepository();
  private state: ShootingState = "prologue";
  private stateTimer = 0;
  private scroll = 0;
  private scrollSpeed = 0;
  private nextEntryIndex = 0;
  private section: ShootingSection = IWAYAMA_SHOOTING_SECTIONS[0];
  private hp: number = CFG.player.maxHp;
  private invulnerableUntil = 0;
  private fireCooldown = 0;
  private rumbleTimer = 0;
  private pebbleBudget = 0;

  private tarosa!: Phaser.GameObjects.Sprite;
  private hero!: Phaser.GameObjects.Sprite;
  private tarosaShadow!: Phaser.GameObjects.Image;
  private heroShadow!: Phaser.GameObjects.Image;
  private playerX: number = laneToScreenX(CFG.player.startLane);
  private playerY: number = CFG.player.startY;
  private heroPlaced = false;

  private floor!: Phaser.GameObjects.TileSprite;
  private sideWalls!: Phaser.GameObjects.TileSprite;
  private fore!: Phaser.GameObjects.TileSprite;
  private rubble: Phaser.GameObjects.Image[] = [];

  private rocks: RockRuntime[] = [];
  private enemies: EnemyRuntime[] = [];
  private falling: FallingRockRuntime[] = [];
  private arrows: ArrowRuntime[] = [];
  private wall?: WallRuntime;
  private wallCracks: WallCrack[] = [];
  private wallHole: { x: number; y: number }[] = [];
  private wallChunks: WallChunk[] = [];

  private debris!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private pebbles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private flash!: Phaser.GameObjects.Rectangle;
  private hearts!: Phaser.GameObjects.Text;
  private hint?: Phaser.GameObjects.Text;

  private touch: TouchState = { stickPointerId: null, stickX: 0, stickY: 0, firePointerId: null, dashPointerId: null };
  private touchKnob?: Phaser.GameObjects.Arc;

  constructor() {
    super({ key: "IwayamaShootingScene" });
  }

  preload(): void {
    preloadWalkSprite(this, TAROSA_SPRITE);
    preloadWalkSprite(this, PROTAGONIST_SPRITE);
    for (const id of ENEMY_IDS) {
      if (!this.textures.exists(enemyTextureKey(id))) this.load.image(enemyTextureKey(id), DEV_BATTLE_MONSTERS[id].portraitUrl);
    }
  }

  create(data?: IwayamaShootingSceneData): void {
    ensureShootingTextures(this);
    ensureWalkAnimations(this, TAROSA_SPRITE);
    ensureWalkAnimations(this, PROTAGONIST_SPRITE);
    this.rocks = [];
    this.enemies = [];
    this.falling = [];
    this.arrows = [];
    this.wallChunks = [];
    this.rubble = [];
    this.wall = undefined;
    this.hint = undefined;
    this.touchKnob = undefined;
    this.heroPlaced = false;
    this.touch = { stickPointerId: null, stickX: 0, stickY: 0, firePointerId: null, dashPointerId: null };
    this.cameras.main.setBackgroundColor("#0b0908");

    this.floor = this.add.tileSprite(0, 0, DISPLAY.width, DISPLAY.height, SHOOTING_TEXTURES.floor).setOrigin(0).setDepth(DEPTH.floor);
    this.sideWalls = this.add.tileSprite(0, 0, DISPLAY.width, DISPLAY.height, SHOOTING_TEXTURES.walls).setOrigin(0).setDepth(DEPTH.sideWalls);
    this.fore = this.add.tileSprite(0, 0, DISPLAY.width, DISPLAY.height, SHOOTING_TEXTURES.fore).setOrigin(0).setDepth(DEPTH.fore);

    this.createParticles();
    this.createArrowPool();
    this.createWallCrackPlan();

    this.heroShadow = this.add.image(0, 0, SHOOTING_TEXTURES.shadow).setDepth(DEPTH.shadows).setScale(0.75, 0.7);
    this.tarosaShadow = this.add.image(0, 0, SHOOTING_TEXTURES.shadow).setDepth(DEPTH.shadows).setScale(0.7, 0.7);
    this.hero = this.add.sprite(0, 0, PROTAGONIST_SPRITE.key, idleFrame("up"));
    this.tarosa = this.add.sprite(0, 0, TAROSA_SPRITE.key, idleFrame("up"));

    this.flash = this.add.rectangle(0, 0, DISPLAY.width, DISPLAY.height, 0xffffff, 0).setOrigin(0).setDepth(DEPTH.flash);
    this.hearts = this.add.text(22, 16, "", {
      color: "#ff6b6b", fontFamily: "monospace", fontSize: "30px", stroke: "#1a0e0c", strokeThickness: 5,
    }).setDepth(DEPTH.hud);

    this.actions = new InputSystem(window, document);
    const touchCapable = this.sys.game.device.input.touch;
    if (touchCapable) this.createTouchControls();

    const devSection = isDevMode ? readShootingSectionQuery(window.location.search) : null;
    const startSection = IWAYAMA_SHOOTING_SECTIONS.find((section) => section.id === (data?.startSection ?? devSection)) ?? IWAYAMA_SHOOTING_SECTIONS[0];
    this.resetToCheckpoint(startSection);
    this.beginPrologue();

    this.hint = this.add.text(DISPLAY.width / 2, 40, touchCapable ? "ひだり: いどう　　みぎ: や / ダッシュ" : "←↑↓→ いどう　　Z: や　　X: ダッシュ", {
      color: "#f3e6cf", fontFamily: "monospace", fontSize: "18px", stroke: "#120c09", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.hud).setAlpha(0);

    const releaseTouch = (): void => this.releaseAllTouches();
    const canvas = this.sys.game.canvas;
    canvas.addEventListener("pointercancel", releaseTouch);
    canvas.addEventListener("touchcancel", releaseTouch);
    window.addEventListener("blur", releaseTouch);
    const onVisibility = (): void => {
      if (document.hidden) releaseTouch();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const cleanup = (): void => {
      this.actions.destroy();
      releaseTouch();
      canvas.removeEventListener("pointercancel", releaseTouch);
      canvas.removeEventListener("touchcancel", releaseTouch);
      window.removeEventListener("blur", releaseTouch);
      document.removeEventListener("visibilitychange", onVisibility);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
      if (isDevMode) delete (window as unknown as { __iwayamaShooting?: unknown }).__iwayamaShooting;
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    this.cameras.main.fadeIn(260, 0, 0, 0);

    if (isDevMode) {
      (window as unknown as { __iwayamaShooting?: unknown }).__iwayamaShooting = {
        scene: this,
        snapshot: (): Record<string, unknown> => this.debugSnapshot(),
        jumpTo: (id: ShootingSectionId): void => {
          const section = IWAYAMA_SHOOTING_SECTIONS.find((candidate) => candidate.id === id);
          if (!section) return;
          this.resetToCheckpoint(section);
          this.state = "playing";
          this.actions.setLocked(false);
        },
      };
    }
  }

  /** DEV確認用の状態(本番では呼ばれない)。 */
  debugSnapshot(): Record<string, unknown> {
    return {
      state: this.state,
      section: this.section.id,
      scroll: Math.round(this.scroll),
      hp: this.hp,
      rocks: this.rocks.length,
      enemies: this.enemies.length,
      falling: this.falling.length,
      wallHp: this.wall?.hp ?? null,
      wallPhase: this.wall?.phase ?? null,
      player: { x: Math.round(this.playerX), y: Math.round(this.playerY) },
      particles: this.debris.getAliveParticleCount() + this.dust.getAliveParticleCount() + this.sparks.getAliveParticleCount(),
    };
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.stateTimer += delta;
    switch (this.state) {
      case "prologue":
        this.updatePrologue(dt);
        break;
      case "playing":
        this.updatePlaying(time, dt);
        break;
      case "wallBreak":
      case "outro":
        this.updateAfterWall(dt);
        break;
      default:
        break;
    }
    this.updateWallChunks(dt);
    this.placeActors(time);
  }

  // ─── 開始・再挑戦 ───────────────────────────────────────────────

  /** 崩落直後の1.7秒。操作は受け付けず、後ろ(画面の下)が崩れて塞がる様子だけを見せる。 */
  private beginPrologue(): void {
    this.state = "prologue";
    this.stateTimer = 0;
    this.actions.setLocked(true);
    this.cameras.main.shake(CFG.prologueMs * 0.8, 0.009);
    const random = createSeededRandom(5);
    for (let index = 0; index < 8; index += 1) {
      const kind = index % 3 === 0 ? "large" : "medium";
      const x = PASSAGE_LEFT + 20 + index * ((PASSAGE_RIGHT - PASSAGE_LEFT - 40) / 7);
      const restY = DISPLAY.height - 20 - random() * 50;
      const shadow = this.add.image(x + 6, restY + 20, SHOOTING_TEXTURES.shadow).setDepth(DEPTH.shadows).setScale(0.2).setAlpha(0);
      const piece = this.add.image(x, restY - 240, SHOOTING_TEXTURES.rock(kind)).setDepth(DEPTH.rock + 1).setAngle(random() * 360)
        .setTint(0xb8a898).setScale(1.9).setAlpha(0);
      this.rubble.push(shadow, piece);
      const delay = 150 + index * 130;
      this.tweens.add({ targets: shadow, scale: 1.8, alpha: 1, duration: 420, delay });
      this.tweens.add({
        targets: piece,
        y: restY,
        scale: 1,
        alpha: 1,
        angle: piece.angle + 60,
        duration: 420,
        delay,
        ease: "Quad.easeIn",
        onComplete: () => {
          this.debris.explode(8, piece.x, piece.y);
          this.dust.explode(5, piece.x, piece.y);
        },
      });
    }
  }

  private updatePrologue(dt: number): void {
    this.emitAmbientPebbles(dt, 6);
    if (this.stateTimer < CFG.prologueMs) return;
    this.state = "playing";
    this.stateTimer = 0;
    this.actions.setLocked(false);
    if (this.hint) {
      this.tweens.add({ targets: this.hint, alpha: 1, duration: 300, yoyo: true, hold: 5200 });
    }
  }

  /** 区間の頭(チェックポイント)から、岩・敵・耐久を並べ直す。Sceneは作り直さない(待ち時間なし)。 */
  private resetToCheckpoint(section: ShootingSection): void {
    for (const rock of this.rocks) this.removeRock(rock);
    for (const enemy of this.enemies) this.removeEnemy(enemy);
    for (const fallingRock of this.falling) this.removeFalling(fallingRock);
    for (const arrow of this.arrows) this.deactivateArrow(arrow);
    for (const chunk of this.wallChunks) chunk.sprite.destroy();
    this.rocks = [];
    this.enemies = [];
    this.falling = [];
    this.wallChunks = [];
    if (this.wall) {
      this.wall.image.destroy();
      this.wall.cracks.destroy();
      this.wall.leak.destroy();
      this.wall.light.destroy();
      this.wall = undefined;
    }
    this.section = section;
    this.scroll = section.start;
    this.scrollSpeed = section.scrollSpeed;
    this.nextEntryIndex = IWAYAMA_SHOOTING_ENTRIES.findIndex((entry) => entry.at > section.start);
    if (this.nextEntryIndex < 0) this.nextEntryIndex = IWAYAMA_SHOOTING_ENTRIES.length;
    this.hp = CFG.player.maxHp;
    this.invulnerableUntil = 0;
    this.fireCooldown = 0;
    this.rumbleTimer = 0;
    this.playerX = laneToScreenX(CFG.player.startLane);
    this.playerY = CFG.player.startY;
    this.heroPlaced = false;
    this.tarosa.clearTint().setAlpha(1);
    this.updateHearts();
    this.syncBackground();
  }

  private fail(): void {
    this.state = "retry";
    this.actions.setLocked(true);
    this.releaseAllTouches();
    this.tarosa.setTint(0xff9a9a);
    const checkpoint = sectionAt(this.scroll);
    this.cameras.main.fadeOut(CFG.retryFadeMs, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      for (const piece of this.rubble) piece.destroy();
      this.rubble = [];
      this.resetToCheckpoint(checkpoint);
      this.cameras.main.fadeIn(CFG.retryFadeMs, 0, 0, 0);
      this.state = "playing";
      this.stateTimer = 0;
      this.invulnerableUntil = this.time.now + 900;
      this.actions.setLocked(false);
    });
  }

  // ─── 毎フレーム ──────────────────────────────────────────────────

  private updatePlaying(time: number, dt: number): void {
    this.section = sectionAt(this.scroll);
    this.scrollSpeed = this.computeScrollSpeed();
    this.advanceScroll(dt);
    this.spawnDueEntries();
    this.movePlayer(dt);
    this.fire(dt);
    this.updateArrows(dt);
    this.updateRocks(time);
    this.updateEnemies(dt);
    this.updateFalling(time, dt);
    this.collidePlayer(time);
    this.emitAmbientPebbles(dt, this.section.ambientPebblesPerSecond);
    this.rumble(dt);
  }

  private computeScrollSpeed(): number {
    const base = this.section.scrollSpeed;
    if (!this.wall) return base;
    // 巨大岩壁が止まる位置へ近づくほど遅くなり、ぴたりと止まる。
    const remaining = CFG.wall.stopY - this.wall.bottom;
    if (remaining <= 1) return 0;
    return Math.min(base, remaining * 1.4 + 8);
  }

  /** 床が下へ流れる = 岩・敵・落石・がれきも同じだけ下へ動く。 */
  private advanceScroll(dt: number): void {
    const dy = this.scrollSpeed * dt;
    this.scroll += dy;
    for (const rock of this.rocks) rock.y += dy;
    for (const enemy of this.enemies) enemy.y += dy;
    for (const fallingRock of this.falling) fallingRock.y += dy;
    for (const piece of this.rubble) piece.y += dy;
    if (this.wall) {
      this.wall.bottom = Math.min(CFG.wall.stopY, this.wall.bottom + dy);
      this.placeWall();
    }
    this.rubble = this.rubble.filter((piece) => {
      if (piece.y < DISPLAY.height + 140) return true;
      piece.destroy();
      return false;
    });
    this.syncBackground();
  }

  private syncBackground(): void {
    this.floor.tilePositionY = -this.scroll;
    this.sideWalls.tilePositionY = -this.scroll;
    this.fore.tilePositionY = -this.scroll * 1.35;
  }

  private spawnDueEntries(): void {
    while (this.nextEntryIndex < IWAYAMA_SHOOTING_ENTRIES.length && IWAYAMA_SHOOTING_ENTRIES[this.nextEntryIndex].at <= this.scroll) {
      this.spawnEntry(IWAYAMA_SHOOTING_ENTRIES[this.nextEntryIndex]);
      this.nextEntryIndex += 1;
    }
    if (!this.wall && this.scroll >= CFG.wall.at) this.spawnWall();
  }

  private spawnEntry(entry: ShootingEntry): void {
    const overshoot = this.scroll - entry.at;
    const x = laneToScreenX(entry.lane);
    if (entry.kind === "rock") {
      const radius = CFG.rocks[entry.rock].radius;
      this.spawnRock(entry.rock, x, -radius - (entry.ahead ?? 0) + overshoot);
      return;
    }
    if (entry.kind === "enemy") {
      const texture = this.textures.get(enemyTextureKey(entry.monsterId)).getSourceImage();
      const scale = CFG.enemy.displayHeight / Math.max(1, texture.height);
      const y = -CFG.enemy.radius - (entry.ahead ?? 0) + overshoot;
      const hidden = entry.motion === "ambush";
      const sprite = this.add.image(x, y, enemyTextureKey(entry.monsterId)).setScale(scale).setDepth(hidden ? DEPTH.rock - 2 : DEPTH.enemy);
      const shadow = this.add.image(x, y, SHOOTING_TEXTURES.shadow).setDepth(DEPTH.shadows).setScale(0.9, 0.8).setVisible(!hidden);
      this.enemies.push({ monsterId: entry.monsterId, motion: entry.motion, x, y, baseX: x, radius: CFG.enemy.radius, hp: CFG.enemy.hp, age: 0, sprite, shadow, alive: true, popped: false });
      return;
    }
    // 落石: まず地面に影が広がり(予兆)、天井から小石と粉塵がこぼれる。
    const y = CFG.fallingRock.aheadY + overshoot;
    const shadow = this.add.image(x, y, SHOOTING_TEXTURES.shadow).setDepth(DEPTH.shadows + 1).setScale(0.3).setAlpha(0.3);
    const sprite = this.add.image(x, y, SHOOTING_TEXTURES.rock("medium")).setDepth(DEPTH.falling)
      .setScale(CFG.fallingRock.radius / CFG.rocks.medium.radius).setVisible(false);
    this.falling.push({ x, y, radius: CFG.fallingRock.radius, warningLeft: CFG.fallingRock.warningMs, fallLeft: CFG.fallingRock.fallMs, shadow, sprite, alive: true });
    this.pebbles.explode(3, x, y);
  }

  private spawnRock(kind: ShootingRockKind, x: number, y: number): void {
    const spec = CFG.rocks[kind];
    const shadow = this.add.image(x, y, SHOOTING_TEXTURES.shadow).setDepth(DEPTH.shadows).setScale((spec.radius * 2.3) / 64, (spec.radius * 1.5) / 32);
    const glow = kind === "explosive"
      ? this.add.image(x, y, SHOOTING_TEXTURES.glow).setDepth(DEPTH.rockGlow).setBlendMode(Phaser.BlendModes.ADD).setTint(0xff6a2a).setScale(1.6).setAlpha(0.55)
      : undefined;
    const sprite = this.add.image(x, y, SHOOTING_TEXTURES.rock(kind)).setDepth(DEPTH.rock).setAngle((x * 13 + y * 7) % 360);
    this.rocks.push({ kind, x, y, radius: spec.radius, hp: spec.hp, sprite, shadow, glow, alive: true, ignited: false, jiggleUntil: 0 });
  }

  private movePlayer(dt: number): void {
    let dx = 0;
    let dy = 0;
    if (this.actions.isDown("moveLeft")) dx -= 1;
    if (this.actions.isDown("moveRight")) dx += 1;
    if (this.actions.isDown("moveUp")) dy -= 1;
    if (this.actions.isDown("moveDown")) dy += 1;
    if (this.touch.stickPointerId !== null) {
      dx += this.touch.stickX;
      dy += this.touch.stickY;
    }
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }
    const dashing = this.actions.isDown("cancel") || this.touch.dashPointerId !== null;
    const speed = dashing ? CFG.player.dashSpeed : CFG.player.speed;
    this.playerX += dx * speed * dt;
    this.playerY += dy * speed * dt;
    this.clampPlayer();
  }

  private clampPlayer(): void {
    const halfWidth = CFG.player.hitWidth / 2;
    const minY = this.wall ? Math.max(CFG.player.minY, this.wall.bottom + 44) : CFG.player.minY;
    this.playerX = Phaser.Math.Clamp(this.playerX, PASSAGE_LEFT + halfWidth, PASSAGE_RIGHT - halfWidth);
    this.playerY = Phaser.Math.Clamp(this.playerY, minY, CFG.player.maxY);
  }

  /** 当たり判定はタロサの体の下半分(足元寄り)。 */
  private playerRect(): ShootingRect {
    return {
      x: this.playerX - CFG.player.hitWidth / 2,
      y: this.playerY - CFG.player.hitHeight / 2 + 10,
      width: CFG.player.hitWidth,
      height: CFG.player.hitHeight,
    };
  }

  private fire(dt: number): void {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt * 1000);
    const holding = this.actions.isDown("confirm") || this.touch.firePointerId !== null;
    this.actions.consumePressed("confirm");
    if (!holding || this.fireCooldown > 0) return;
    const arrow = this.arrows.find((candidate) => !candidate.active);
    if (!arrow) return;
    this.fireCooldown = CFG.arrow.cooldownMs;
    arrow.active = true;
    // タロサの真上へ放つ(狙った列にまっすぐ飛ぶように、体の中心から)。
    const x = this.playerX;
    const y = this.playerY - 34;
    arrow.sprite.setPosition(x, y).setVisible(true);
    arrow.trail.setPosition(x, y + 26).setVisible(true);
    this.sparks.explode(2, x, y - 6);
  }

  private updateArrows(dt: number): void {
    for (const arrow of this.arrows) {
      if (!arrow.active) continue;
      const x = arrow.sprite.x;
      const y = arrow.sprite.y - CFG.arrow.speed * dt;
      arrow.sprite.y = y;
      arrow.trail.setPosition(x, y + 26);
      if (y < -40) {
        this.deactivateArrow(arrow);
        continue;
      }
      const tip = { x, y: y - 26, radius: 4 };
      if (this.hitWall(tip)) {
        this.deactivateArrow(arrow);
        continue;
      }
      const target = this.findArrowTarget(tip);
      if (!target) continue;
      this.deactivateArrow(arrow);
      this.sparks.explode(3, tip.x, tip.y);
      if (target.type === "rock") this.damageRock(target.rock, CFG.arrow.damage);
      else this.damageEnemy(target.enemy, CFG.arrow.damage);
    }
  }

  /** 矢の先端に触れている対象のうち、いちばん手前(下)のもの。空中の落石は狙えない。 */
  private findArrowTarget(tip: ShootingCircle): ArrowTarget | null {
    const candidates: ArrowTarget[] = [
      ...this.rocks.filter((rock) => rock.alive).map((rock): ArrowTarget => ({ type: "rock", rock, circle: rock })),
      ...this.enemies.filter((enemy) => enemy.alive && (enemy.motion !== "ambush" || enemy.popped)).map((enemy): ArrowTarget => ({ type: "enemy", enemy, circle: enemy })),
    ];
    let best: ArrowTarget | null = null;
    for (const candidate of candidates) {
      const { circle } = candidate;
      if (Math.hypot(circle.x - tip.x, circle.y - tip.y) > circle.radius + tip.radius) continue;
      if (!best || circle.y > best.circle.y) best = candidate;
    }
    return best;
  }

  private deactivateArrow(arrow: ArrowRuntime): void {
    arrow.active = false;
    arrow.sprite.setVisible(false);
    arrow.trail.setVisible(false);
  }

  private updateRocks(time: number): void {
    for (const rock of this.rocks) {
      const jiggle = time < rock.jiggleUntil ? Math.sin(time * 0.09) * 3 : 0;
      rock.sprite.setPosition(rock.x + jiggle, rock.y);
      rock.shadow.setPosition(rock.x + 5, rock.y + rock.radius * 0.55);
      if (rock.glow) {
        rock.glow.setPosition(rock.x, rock.y).setAlpha(rock.ignited ? 0.95 : 0.45 + Math.sin(time * 0.006 + rock.x) * 0.15);
        if (rock.ignited) rock.glow.setScale(2.1 + Math.sin(time * 0.05) * 0.3);
      }
    }
    this.rocks = this.rocks.filter((rock) => {
      if (rock.alive && rock.y < DISPLAY.height + rock.radius + 20) return true;
      if (rock.alive) this.removeRock(rock);
      return false;
    });
  }

  private damageRock(rock: RockRuntime, damage: number): void {
    if (!rock.alive) return;
    if (rock.kind === "explosive") {
      this.detonate(rock);
      return;
    }
    rock.hp -= damage;
    if (rock.hp <= 0) {
      this.breakRock(rock);
      return;
    }
    rock.jiggleUntil = this.time.now + 130;
    rock.sprite.setTintFill(0xfff2dc);
    this.time.delayedCall(55, () => rock.sprite.active && rock.sprite.clearTint());
    this.debris.explode(2, rock.x, rock.y + rock.radius * 0.8);
  }

  private breakRock(rock: RockRuntime): void {
    const size = rock.kind === "large" ? 3 : rock.kind === "medium" ? 2 : 1;
    this.debris.explode(4 + size * 4, rock.x, rock.y);
    this.dust.explode(2 + size * 2, rock.x, rock.y);
    if (size >= 2) this.cameras.main.shake(90, 0.0025 * size);
    this.removeRock(rock);
  }

  private removeRock(rock: RockRuntime): void {
    rock.alive = false;
    rock.sprite.destroy();
    rock.shadow.destroy();
    rock.glow?.destroy();
  }

  /** 爆発岩。範囲内の岩・敵に大ダメージ、範囲内の爆発岩には少し遅れて着火(連鎖)。 */
  private detonate(rock: RockRuntime): void {
    if (!rock.alive) return;
    const center = { x: rock.x, y: rock.y };
    this.removeRock(rock);
    const blast = this.add.image(center.x, center.y, SHOOTING_TEXTURES.glow).setDepth(DEPTH.sparks).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffa048).setScale(1.2);
    this.tweens.add({ targets: blast, scale: (CFG.explosion.radius * 2) / 64, alpha: 0, duration: 320, ease: "Cubic.easeOut", onComplete: () => blast.destroy() });
    // 地面の焦げ跡(床と一緒に流れて消える)
    const scorch = this.add.image(center.x, center.y + 8, SHOOTING_TEXTURES.shadow).setDepth(DEPTH.shadows).setScale(2.4, 2.2).setAlpha(0.8);
    this.rubble.push(scorch);
    this.tweens.add({ targets: scorch, alpha: 0, duration: 2600 });
    this.sparks.explode(14, center.x, center.y);
    this.debris.explode(10, center.x, center.y);
    this.dust.explode(6, center.x, center.y);
    this.cameras.main.shake(170, 0.007);
    this.flashScreen(0xffc080, 0.22, 140);

    for (const target of this.rocks) {
      if (!target.alive || !explosionReaches(center, CFG.explosion.radius, target)) continue;
      if (target.kind === "explosive") {
        if (target.ignited) continue;
        target.ignited = true;
        this.time.delayedCall(CFG.explosion.chainDelayMs, () => this.detonate(target));
        continue;
      }
      target.hp -= CFG.explosion.damage;
      if (target.hp <= 0) this.breakRock(target);
    }
    for (const enemy of this.enemies) {
      if (enemy.alive && explosionReaches(center, CFG.explosion.radius, enemy)) this.damageEnemy(enemy, CFG.explosion.damage);
    }
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.age += dt;
      switch (enemy.motion) {
        case "straight":
          enemy.y += 80 * dt;
          break;
        case "wave":
          enemy.y += 35 * dt;
          enemy.x = enemy.baseX + Math.sin(enemy.age * 2.1) * 62;
          break;
        case "charge":
          enemy.y += (enemy.y > 160 ? 190 : 20) * dt;
          if (enemy.y > 160) enemy.x += Phaser.Math.Clamp(this.playerX - enemy.x, -95 * dt, 95 * dt);
          break;
        case "ambush": {
          if (!enemy.popped && enemy.y > 200) {
            enemy.popped = true;
            enemy.sprite.setDepth(DEPTH.enemy);
            enemy.shadow.setVisible(true);
          }
          if (enemy.popped) {
            // 岩陰から通路の中央側へ飛び出す
            const targetX = enemy.baseX < PASSAGE_CENTER ? enemy.baseX + 120 : enemy.baseX - 120;
            enemy.x += Phaser.Math.Clamp(targetX - enemy.x, -320 * dt, 320 * dt);
            enemy.y += 110 * dt;
          }
          break;
        }
      }
      enemy.x = Phaser.Math.Clamp(enemy.x, PASSAGE_LEFT + enemy.radius, PASSAGE_RIGHT - enemy.radius);
      // 小さく跳ねる(影は地面に残るので、浮いているのではなく跳ねているように見える)
      const hop = Math.abs(Math.sin(enemy.age * 8)) * 5;
      enemy.sprite.setPosition(enemy.x, enemy.y - hop);
      enemy.shadow.setPosition(enemy.x + 3, enemy.y + CFG.enemy.displayHeight * 0.42).setAlpha(1 - hop / 14);
    }
    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.alive && enemy.y < DISPLAY.height + 80) return true;
      this.removeEnemy(enemy);
      return false;
    });
  }

  private removeEnemy(enemy: EnemyRuntime): void {
    enemy.alive = false;
    enemy.sprite.destroy();
    enemy.shadow.destroy();
  }

  private damageEnemy(enemy: EnemyRuntime, damage: number): void {
    if (!enemy.alive) return;
    enemy.hp -= damage;
    if (enemy.hp > 0) {
      enemy.sprite.setTintFill(0xffffff);
      this.time.delayedCall(60, () => enemy.sprite.active && enemy.sprite.clearTint());
      return;
    }
    this.sparks.explode(10, enemy.x, enemy.y);
    this.dust.explode(4, enemy.x, enemy.y);
    this.removeEnemy(enemy);
  }

  private updateFalling(time: number, dt: number): void {
    const warningMs = CFG.fallingRock.warningMs;
    const fallMs = CFG.fallingRock.fallMs;
    for (const fallingRock of this.falling) {
      if (!fallingRock.alive) continue;
      if (fallingRock.warningLeft > 0) {
        fallingRock.warningLeft -= dt * 1000;
        // 影がだんだん濃く大きくなる(真上から落ちてくる予兆)。
        const progress = 1 - Math.max(0, fallingRock.warningLeft) / warningMs;
        fallingRock.shadow.setPosition(fallingRock.x, fallingRock.y).setScale(0.3 + progress * 1.1, (0.3 + progress * 1.1) * 0.9).setAlpha(0.3 + progress * 0.6);
        if (Math.random() < 0.2) this.pebbles.explode(1, fallingRock.x + (Math.random() - 0.5) * 50, fallingRock.y + (Math.random() - 0.5) * 30);
        if (fallingRock.warningLeft <= 0) fallingRock.sprite.setVisible(true);
        continue;
      }
      fallingRock.fallLeft -= dt * 1000;
      const progress = 1 - Math.max(0, fallingRock.fallLeft) / fallMs;
      const height = (1 - progress * progress) * 260;
      const scale = (CFG.fallingRock.radius / CFG.rocks.medium.radius) * (1 + (1 - progress) * 0.9);
      fallingRock.shadow.setPosition(fallingRock.x, fallingRock.y);
      fallingRock.sprite.setPosition(fallingRock.x, fallingRock.y - height).setScale(scale).setAngle(fallingRock.sprite.angle + 300 * dt);
      if (fallingRock.fallLeft <= 0) this.landFalling(fallingRock, time);
    }
    this.falling = this.falling.filter((fallingRock) => {
      if (fallingRock.alive && fallingRock.y < DISPLAY.height + 60) return true;
      this.removeFalling(fallingRock);
      return false;
    });
  }

  /** 着地: 砕けて、その瞬間に影の上にいたらダメージ。 */
  private landFalling(fallingRock: FallingRockRuntime, time: number): void {
    this.debris.explode(10, fallingRock.x, fallingRock.y);
    this.dust.explode(6, fallingRock.x, fallingRock.y);
    this.cameras.main.shake(120, 0.004);
    if (circleOverlapsRect({ x: fallingRock.x, y: fallingRock.y, radius: fallingRock.radius }, this.playerRect())) this.hurtPlayer(time);
    this.removeFalling(fallingRock);
  }

  private removeFalling(fallingRock: FallingRockRuntime): void {
    fallingRock.alive = false;
    fallingRock.sprite.destroy();
    fallingRock.shadow.destroy();
  }

  private collidePlayer(time: number): void {
    // 岩には押し出される(めり込まない)。下へ押し出され続けて逃げ場がなければダメージを受け続ける。
    for (const rock of this.rocks) {
      if (!rock.alive) continue;
      const rect = this.playerRect();
      const circle = { x: rock.x, y: rock.y, radius: rock.radius * 0.9 };
      if (!circleOverlapsRect(circle, rect)) continue;
      const push = pushRectOutOfCircle(rect, circle);
      this.playerX += push.dx;
      this.playerY += push.dy;
      this.clampPlayer();
      this.hurtPlayer(time);
    }
    const rect = this.playerRect();
    for (const enemy of this.enemies) {
      if (enemy.alive && (enemy.motion !== "ambush" || enemy.popped) && circleOverlapsRect({ x: enemy.x, y: enemy.y, radius: enemy.radius * 0.8 }, rect)) this.hurtPlayer(time);
    }
  }

  private hurtPlayer(time: number): void {
    if (this.state !== "playing" || time < this.invulnerableUntil) return;
    this.hp -= 1;
    this.invulnerableUntil = time + CFG.player.invulnerableMs;
    this.updateHearts();
    this.cameras.main.shake(160, 0.008);
    this.flashScreen(0xff3020, 0.2, 180);
    if (this.hp <= 0) this.fail();
  }

  /** 天井からこぼれる小石(当たり判定なし)。通路のどこかに落ちて跳ねる。 */
  private emitAmbientPebbles(dt: number, perSecond: number): void {
    this.pebbleBudget += perSecond * dt;
    while (this.pebbleBudget >= 1) {
      this.pebbleBudget -= 1;
      this.pebbles.explode(1, PASSAGE_LEFT + Math.random() * (PASSAGE_RIGHT - PASSAGE_LEFT), 40 + Math.random() * (DISPLAY.height - 80));
    }
  }

  private rumble(dt: number): void {
    if (this.section.rumbleIntervalMs <= 0) return;
    this.rumbleTimer += dt * 1000;
    if (this.rumbleTimer < this.section.rumbleIntervalMs) return;
    this.rumbleTimer = 0;
    this.cameras.main.shake(520, 0.0035);
    this.dust.explode(5, PASSAGE_LEFT + Math.random() * (PASSAGE_RIGHT - PASSAGE_LEFT), 60 + Math.random() * 300);
  }

  // ─── 巨大岩壁 ────────────────────────────────────────────────────

  /** ヒビの形は固定乱数で毎回同じ。段階が上がるほど太く長いヒビが加わる。座標は岩壁の画像の中(左上基準)。 */
  private createWallCrackPlan(): void {
    const random = createSeededRandom(97);
    const cracks: WallCrack[] = [];
    const branch = (phase: 2 | 3 | 4, count: number, length: number): void => {
      for (let index = 0; index < count; index += 1) {
        let x = PASSAGE_LEFT + 40 + random() * (PASSAGE_RIGHT - PASSAGE_LEFT - 80);
        let y = WALL_HEIGHT - 60 - random() * 140;
        const points = [{ x, y }];
        const angle = random() * Math.PI * 2;
        for (let step = 0; step < 5; step += 1) {
          // 岩壁の下端(ぎざぎざ部分)より外へはみ出さない
          x = Phaser.Math.Clamp(x + Math.cos(angle + (random() - 0.5) * 1.2) * (length / 5), 20, DISPLAY.width - 20);
          y = Phaser.Math.Clamp(y + Math.sin(angle + (random() - 0.5) * 1.2) * (length / 5), 20, WALL_HEIGHT - 44);
          points.push({ x, y });
        }
        cracks.push({ phase, points });
      }
    };
    branch(2, 6, 70);
    branch(3, 8, 150);
    branch(4, 10, 210);
    this.wallCracks = cracks;
    // 中心部崩壊(段階4)でえぐれる穴の輪郭
    this.wallHole = Array.from({ length: 14 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 14;
      const scale = 0.75 + random() * 0.35;
      return { x: WALL_HOLE.x + Math.cos(angle) * 110 * scale, y: WALL_HOLE.y + Math.sin(angle) * 70 * scale };
    });
  }

  private spawnWall(): void {
    const bottom = -10;
    const light = this.add.image(0, bottom - WALL_HEIGHT, SHOOTING_TEXTURES.light).setOrigin(0, 0).setDepth(DEPTH.light).setVisible(false);
    const image = this.add.image(0, bottom - WALL_HEIGHT, SHOOTING_TEXTURES.wall).setOrigin(0, 0).setDepth(DEPTH.wall);
    const cracks = this.add.graphics().setDepth(DEPTH.wallCracks);
    const leak = this.add.image(WALL_HOLE.x, 0, SHOOTING_TEXTURES.glow).setDepth(DEPTH.wallLeak).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe2a8).setAlpha(0).setScale(3);
    this.wall = { bottom, hp: CFG.wall.hp, phase: 1, image, cracks, leak, light };
    this.placeWall();
  }

  private placeWall(): void {
    if (!this.wall) return;
    const top = this.wall.bottom - WALL_HEIGHT;
    this.wall.image.y = top + (this.wall.image.getData("jiggle") ?? 0);
    this.wall.cracks.y = top;
    this.wall.leak.y = top + WALL_HOLE.y;
    this.wall.light.y = top;
  }

  private hitWall(tip: ShootingCircle): boolean {
    const wall = this.wall;
    if (!wall || wall.hp <= 0 || tip.y > wall.bottom - 24) return false;
    wall.hp -= CFG.arrow.damage;
    this.debris.explode(3, tip.x, wall.bottom - 24);
    this.dust.explode(1, tip.x, wall.bottom - 24);
    this.cameras.main.shake(70, 0.0018);
    wall.image.setData("jiggle", -3);
    this.time.delayedCall(50, () => wall.image.active && wall.image.setData("jiggle", 0));
    const phase = wallPhase(wall.hp);
    if (phase !== wall.phase) {
      wall.phase = phase;
      if (phase === 5) {
        this.breakWall();
      } else {
        this.drawWallDamage();
        this.cameras.main.shake(220, 0.005 + phase * 0.001);
        for (let index = 0; index < 4; index += 1) this.debris.explode(4, PASSAGE_LEFT + Math.random() * (PASSAGE_RIGHT - PASSAGE_LEFT), wall.bottom - 10);
        this.dust.explode(6, WALL_HOLE.x, wall.bottom - 20);
      }
    }
    return true;
  }

  private drawWallDamage(): void {
    const wall = this.wall;
    if (!wall) return;
    const graphics = wall.cracks;
    graphics.clear();
    const visible = this.wallCracks.filter((crack) => crack.phase <= wall.phase);
    for (const crack of visible) {
      const width = crack.phase === 2 ? 2 : crack.phase === 3 ? 4 : 6;
      graphics.lineStyle(width + 2, 0x120c0a, 0.95);
      graphics.strokePoints(crack.points, false);
      if (wall.phase >= 3) {
        // 岩壁の奥からの光がヒビに漏れる
        graphics.lineStyle(Math.max(1, width - 2), 0xffd99a, crack.phase === 2 ? 0.5 : 0.85);
        graphics.strokePoints(crack.points, false);
      }
    }
    if (wall.phase >= 4) {
      // 中心部崩壊: 真ん中がえぐれて向こうの光がのぞく
      const ring = (scale: number, dy: number): { x: number; y: number }[] =>
        this.wallHole.map((point) => ({ x: WALL_HOLE.x + (point.x - WALL_HOLE.x) * scale, y: WALL_HOLE.y - dy + (point.y - WALL_HOLE.y) * scale }));
      graphics.fillStyle(0x120c0a, 1);
      graphics.fillPoints(ring(1, 0), true);
      graphics.fillStyle(0xffe3b0, 0.9);
      graphics.fillPoints(ring(0.66, 4), true);
      graphics.fillStyle(0xfff6e2, 1);
      graphics.fillPoints(ring(0.32, 8), true);
    }
    wall.leak.setAlpha([0, 0, 0.18, 0.4, 0.7][wall.phase - 1] ?? 0.7).setScale(2.4 + wall.phase * 0.6);
  }

  /** 大爆発ではなく「崩れ落ちる」。岩片が散らばって地面に落ち、向こうの明るい空間が見える。 */
  private breakWall(): void {
    const wall = this.wall;
    if (!wall) return;
    this.state = "wallBreak";
    this.stateTimer = 0;
    this.actions.setLocked(true);
    this.releaseAllTouches();
    for (const arrow of this.arrows) this.deactivateArrow(arrow);
    wall.light.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: wall.light, alpha: 1, duration: 900 });
    wall.image.setVisible(false);
    wall.cracks.clear();
    this.tweens.add({ targets: wall.leak, alpha: 0, duration: 600 });
    const random = createSeededRandom(313);
    const top = wall.bottom - WALL_HEIGHT;
    for (let index = 0; index < 26; index += 1) {
      const kind: ShootingRockKind = index % 3 === 0 ? "large" : "medium";
      const x = PASSAGE_LEFT - 60 + random() * (PASSAGE_RIGHT - PASSAGE_LEFT + 120);
      const y = top + 60 + random() * (WALL_HEIGHT - 60);
      const sprite = this.add.image(x, y, SHOOTING_TEXTURES.rock(kind))
        .setDepth(DEPTH.wall + 5).setAngle(random() * 360).setScale(0.6 + random() * 0.6).setTint(0xb8a898);
      // 左右へ崩れて地面に落ち、小さくなって消える(見下ろしなので重力ではなく散らばりと縮みで見せる)
      this.wallChunks.push({ sprite, vx: (x - PASSAGE_CENTER) * (0.4 + random() * 0.8), vy: 40 + random() * 120, spin: (random() - 0.5) * 240, life: 0.9 + random() * 0.6 });
    }
    for (let burst = 0; burst < 5; burst += 1) {
      this.time.delayedCall(burst * 140, () => {
        this.debris.explode(14, PASSAGE_LEFT + Math.random() * (PASSAGE_RIGHT - PASSAGE_LEFT), wall.bottom - Math.random() * 160);
        this.dust.explode(8, PASSAGE_LEFT + Math.random() * (PASSAGE_RIGHT - PASSAGE_LEFT), wall.bottom - Math.random() * 120);
      });
    }
    this.cameras.main.shake(1100, 0.013);
    this.flashScreen(0xfff0d0, 0.25, 400);
  }

  private updateWallChunks(dt: number): void {
    for (const chunk of this.wallChunks) {
      chunk.life -= dt;
      chunk.vx *= 1 - Math.min(1, dt * 2);
      chunk.vy *= 1 - Math.min(1, dt * 2);
      chunk.sprite.x += chunk.vx * dt;
      chunk.sprite.y += chunk.vy * dt;
      chunk.sprite.angle += chunk.spin * dt;
      chunk.sprite.setScale(Math.max(0.2, chunk.sprite.scale - dt * 0.35));
      if (chunk.life < 0.5) chunk.sprite.setAlpha(Math.max(0, chunk.life * 2));
    }
    this.wallChunks = this.wallChunks.filter((chunk) => {
      if (chunk.life > 0) return true;
      this.debris.explode(2, chunk.sprite.x, chunk.sprite.y);
      chunk.sprite.destroy();
      return false;
    });
  }

  /** 崩壊 → 主人公たちが崩れた穴を上へ抜けていく → 暗転 → 通常の探索へ。 */
  private updateAfterWall(dt: number): void {
    this.emitAmbientPebbles(dt, 3);
    if (this.state === "wallBreak") {
      if (this.stateTimer < 1100) return;
      this.state = "outro";
      this.stateTimer = 0;
      return;
    }
    this.playerY -= (720 / (CFG.outroRunMs / 1000)) * dt;
    this.playerX += (WALL_HOLE.x - this.playerX) * Math.min(1, dt * 3);
    if (this.stateTimer >= CFG.outroRunMs && this.state === "outro") {
      this.state = "done";
      this.cameras.main.fadeOut(CFG.outroFadeMs, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.complete());
    }
  }

  private complete(): void {
    this.gameState.setFlag(CFG.clearedFlag);
    const data: RainlandMapSceneData = { spawnId: CFG.returnSpawnId, shootingReturn: true };
    this.scene.start(CFG.returnSceneKey, data);
  }

  // ─── 表示 ────────────────────────────────────────────────────────

  private placeActors(time: number): void {
    const running = this.state === "playing" || this.state === "outro" || this.state === "wallBreak";
    const tarosaAnim = walkAnimKey(TAROSA_SPRITE, "up");
    const heroAnim = walkAnimKey(PROTAGONIST_SPRITE, "up");
    if (running && this.tarosa.anims.currentAnim?.key !== tarosaAnim) this.tarosa.play(tarosaAnim);
    if (running && this.hero.anims.currentAnim?.key !== heroAnim) this.hero.play(heroAnim);
    if (!running) {
      this.tarosa.stop().setFrame(idleFrame("up"));
      this.hero.stop().setFrame(idleFrame("up"));
    }
    this.tarosa.setPosition(this.playerX, this.playerY).setDepth(DEPTH.actor + this.playerY * 0.01);
    this.tarosaShadow.setPosition(this.playerX, this.playerY + TAROSA_SPRITE.baselineY - TAROSA_SPRITE.frameHeight / 2 - 2);
    // 主人公は少し後ろ(下)をついて歩く(見た目だけ。当たり判定なし)
    const heroTargetX = Phaser.Math.Clamp(this.playerX - 26, PASSAGE_LEFT + 14, PASSAGE_RIGHT - 14);
    const heroTargetY = this.state === "outro" ? this.playerY + 50 : Math.min(DISPLAY.height + 20, this.playerY + 56);
    if (!this.heroPlaced) {
      this.hero.setPosition(heroTargetX, heroTargetY);
      this.heroPlaced = true;
    }
    const follow = this.state === "outro" ? 0.2 : 0.18;
    this.hero.x += (heroTargetX - this.hero.x) * follow;
    this.hero.y += (heroTargetY - this.hero.y) * follow;
    this.hero.setDepth(DEPTH.actor + this.hero.y * 0.01);
    this.heroShadow.setPosition(this.hero.x, this.hero.y + PROTAGONIST_SPRITE.baselineY - PROTAGONIST_SPRITE.frameHeight / 2 - 2);
    const blinking = this.state === "playing" && time < this.invulnerableUntil;
    this.tarosa.setAlpha(blinking && Math.floor(time / 80) % 2 === 0 ? 0.35 : 1);
  }

  private updateHearts(): void {
    this.hearts.setText("♥".repeat(Math.max(0, this.hp)) + "♡".repeat(Math.max(0, CFG.player.maxHp - this.hp)));
  }

  private flashScreen(color: number, alpha: number, duration: number): void {
    this.tweens.killTweensOf(this.flash);
    this.flash.setFillStyle(color, 1).setAlpha(alpha);
    this.tweens.add({ targets: this.flash, alpha: 0, duration });
  }

  /** 見下ろしなので破片は重力で落ちず、地面の上を放射状に散って止まる。 */
  private createParticles(): void {
    this.debris = this.add.particles(0, 0, SHOOTING_TEXTURES.shard, {
      emitting: false,
      speed: { min: 60, max: 260 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 380, max: 760 },
      rotate: { start: 0, end: 360 },
      scale: { start: 1.6, end: 0.8 },
      alpha: { start: 1, end: 0 },
      maxAliveParticles: CFG.particleCaps.debris,
    }).setDepth(DEPTH.debris);
    this.dust = this.add.particles(0, 0, SHOOTING_TEXTURES.dust, {
      emitting: false,
      speed: { min: 10, max: 60 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 600, max: 1100 },
      scale: { start: 1, end: 2.6 },
      alpha: { start: 0.8, end: 0 },
      maxAliveParticles: CFG.particleCaps.dust,
    }).setDepth(DEPTH.dust);
    this.sparks = this.add.particles(0, 0, SHOOTING_TEXTURES.spark, {
      emitting: false,
      speed: { min: 120, max: 380 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 180, max: 420 },
      scale: { start: 1.6, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      maxAliveParticles: CFG.particleCaps.sparks,
    }).setDepth(DEPTH.sparks);
    // 天井からこぼれる小石: 大きく見えて(近い=高い所)から地面の大きさへ縮み、少し跳ねて止まる。
    this.pebbles = this.add.particles(0, 0, SHOOTING_TEXTURES.shard, {
      emitting: false,
      speed: { min: 5, max: 40 },
      angle: { min: 0, max: 360 },
      lifespan: 700,
      scale: { start: 2, end: 0.6 },
      alpha: { start: 0, end: 0.9, ease: "Quad.easeOut" },
      maxAliveParticles: 40,
    }).setDepth(DEPTH.pebbles);
  }

  private createArrowPool(): void {
    for (let index = 0; index < CFG.arrow.poolSize; index += 1) {
      const trail = this.add.image(0, 0, SHOOTING_TEXTURES.glow).setDepth(DEPTH.arrow - 1).setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xa8d8ff).setScale(0.28, 1.3).setAlpha(0.8).setVisible(false);
      const sprite = this.add.image(0, 0, SHOOTING_TEXTURES.arrow).setDepth(DEPTH.arrow).setAngle(-90).setVisible(false);
      this.arrows.push({ sprite, trail, active: false });
    }
  }

  // ─── タッチ操作 ──────────────────────────────────────────────────

  private createTouchControls(): void {
    this.input.addPointer(2);
    const { stick, fire, dash } = TOUCH_LAYOUT;
    this.add.circle(stick.x, stick.y, stick.radius, 0x172a4b, 0.35).setStrokeStyle(2, 0xd5e5ff, 0.6).setDepth(DEPTH.touch);
    this.touchKnob = this.add.circle(stick.x, stick.y, stick.knobRadius, 0xd5e5ff, 0.45).setDepth(DEPTH.touch + 1);
    this.add.circle(fire.x, fire.y, fire.radius, 0x4b2417, 0.5).setStrokeStyle(3, 0xffd9a8, 0.8).setDepth(DEPTH.touch);
    this.add.text(fire.x, fire.y, "や", { color: "#ffffff", fontFamily: "monospace", fontSize: "34px" }).setOrigin(0.5).setDepth(DEPTH.touch + 1);
    this.add.circle(dash.x, dash.y, dash.radius, 0x172a4b, 0.45).setStrokeStyle(2, 0xd5e5ff, 0.7).setDepth(DEPTH.touch);
    this.add.text(dash.x, dash.y, "ダッシュ", { color: "#ffffff", fontFamily: "monospace", fontSize: "14px" }).setOrigin(0.5).setDepth(DEPTH.touch + 1);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.state !== "playing" && this.state !== "prologue") return;
      if (Phaser.Math.Distance.Between(pointer.x, pointer.y, dash.x, dash.y) <= dash.radius + 10) {
        this.touch.dashPointerId = pointer.id;
      } else if (pointer.x >= DISPLAY.width * 0.55) {
        this.touch.firePointerId = pointer.id;
      } else if (this.touch.stickPointerId === null) {
        this.touch.stickPointerId = pointer.id;
        this.updateStick(pointer);
      }
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.touch.stickPointerId) this.updateStick(pointer);
    });
    const release = (pointer: Phaser.Input.Pointer): void => {
      if (pointer.id === this.touch.stickPointerId) {
        this.touch.stickPointerId = null;
        this.touch.stickX = 0;
        this.touch.stickY = 0;
        this.touchKnob?.setPosition(stick.x, stick.y);
      }
      if (pointer.id === this.touch.firePointerId) this.touch.firePointerId = null;
      if (pointer.id === this.touch.dashPointerId) this.touch.dashPointerId = null;
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, release);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
    this.input.on(Phaser.Input.Events.GAME_OUT, () => this.releaseAllTouches());
  }

  private updateStick(pointer: Phaser.Input.Pointer): void {
    const { stick } = TOUCH_LAYOUT;
    const dx = pointer.x - stick.x;
    const dy = pointer.y - stick.y;
    const distance = Math.hypot(dx, dy);
    const clamped = Math.min(distance, stick.radius);
    const nx = distance > 0 ? dx / distance : 0;
    const ny = distance > 0 ? dy / distance : 0;
    // 中心付近の小さな遊び(デッドゾーン)
    const strength = clamped < 10 ? 0 : clamped / stick.radius;
    this.touch.stickX = nx * strength;
    this.touch.stickY = ny * strength;
    this.touchKnob?.setPosition(stick.x + nx * clamped, stick.y + ny * clamped);
  }

  private releaseAllTouches(): void {
    this.touch.stickPointerId = null;
    this.touch.firePointerId = null;
    this.touch.dashPointerId = null;
    this.touch.stickX = 0;
    this.touch.stickY = 0;
    this.touchKnob?.setPosition(TOUCH_LAYOUT.stick.x, TOUCH_LAYOUT.stick.y);
  }
}
