import Phaser from "phaser";
import { DISPLAY } from "../config/display.ts";
import { INTERACTION_REACH, INTERACTION_SPAN } from "../config/interaction.ts";
import { MAPS, MAP_TRANSITION_FADE_MS } from "../config/maps.ts";
import type { MapId } from "../config/maps.ts";
import { getDialogue } from "../data/dialogues.ts";
import { Npc } from "../entities/Npc.ts";
import { Player } from "../entities/Player.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { PartyFollowers } from "../systems/PartyFollowers.ts";
import { buildCollisionRects, createImageMapCollision, readCollisionMaskImageData } from "../systems/ImageMapCollision.ts";
import type { ImageMapCollisionRuntime } from "../systems/ImageMapCollision.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects, scaleRect } from "../systems/ImageMapData.ts";
import type { ImageMapEvent, ImageMapShootingObject } from "../systems/ImageMapData.ts";
import { GameStateRepository } from "../systems/GameStateRepository.ts";
import { IWAYAMA_SHOOTING_TEXT } from "../config/iwayamaShooting.ts";
import { configureMapCamera } from "../systems/MapCamera.ts";
import { canInteract } from "../systems/Interaction.ts";
import { beginMapTransition } from "../systems/MapTransition.ts";
import { PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { TAROSA_SPRITE } from "../config/tarosaSprite.ts";
import { MIREI_SPRITE } from "../config/mireiSprite.ts";
import { VILLAGER_SPRITES } from "../config/villagerSprites.ts";
import { ensureWalkAnimations, preloadWalkSprite } from "../systems/CharacterWalkSprite.ts";
import { DialogueBox } from "../ui/DialogueBox.ts";
import { RAINLAND_FOREST_RANDOM_ENCOUNTER } from "../config/encounter.ts";
import type { RandomEncounterConfig } from "../config/encounter.ts";
import { ENCOUNTER_TABLES, rollEncounterMonster } from "../data/encounterTables.ts";
import type { EncounterTable } from "../data/encounterTables.ts";
import type { BattleDialogueEvent } from "../events/BattleEventData.ts";
import { beginBattleEntrance } from "../events/BattleEntrance.ts";
import type { Facing } from "../systems/PlayerMovement.ts";
import { advanceRandomEncounter, createRandomEncounterState } from "../systems/RandomEncounter.ts";
import type { RandomEncounterState } from "../systems/RandomEncounter.ts";
import { FieldMenu } from "../ui/FieldMenu.ts";
import { RAINLAND_CASTLE_3D } from "../config/rainlandCastle3D.ts";
import type { ViewToggleData } from "../systems/CastleViewToggle.ts";

const isDevMode = typeof import.meta.env !== "undefined" && import.meta.env.DEV;

/** One map package under assets/maps/. Paths are written as literals so Vite can bundle each asset. */
export interface RainlandMapPackage {
  readonly mapId: MapId;
  readonly keyPrefix: string;
  readonly label: string;
  readonly defaultSpawnId: string;
  readonly manifestPath: string;
  readonly backgroundPath: string;
  readonly collisionPath: string;
  readonly eventsPath: string;
  readonly objectsPath: string;
  /** ランダムエンカウントを持つフィールドだけ指定する(もり)。町・城は省略して従来どおり戦闘なし。 */
  readonly encounter?: { readonly table: EncounterTable; readonly config: RandomEncounterConfig };
  /** 同じ場所を別の見た目で表示するScene(レインランドじょうの3D)。指定があるマップだけ、V/「3D」ボタンで切り替えられる。 */
  readonly alternateViewSceneKey?: string;
}

// 2026-09-23: No.05レインランドのもり(その1・その2)はビーエのもりと同じ距離ベースのランダムエンカウント。
const RAINLAND_FOREST_ENCOUNTER = { table: ENCOUNTER_TABLES.rainland_forest, config: RAINLAND_FOREST_RANDOM_ENCOUNTER } as const;

const FOREST_1: RainlandMapPackage = {
  mapId: "map_rainland_forest_1",
  keyPrefix: "image-map.rainland-forest-1",
  label: "レインランドのもり（その1）",
  defaultSpawnId: "fromWorldMap",
  manifestPath: new URL("../../assets/maps/rainland_forest_1/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/rainland_forest_1/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/rainland_forest_1/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/rainland_forest_1/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/rainland_forest_1/objects.json", import.meta.url).toString(),
  encounter: RAINLAND_FOREST_ENCOUNTER,
};

const FOREST_2: RainlandMapPackage = {
  mapId: "map_rainland_forest_2",
  keyPrefix: "image-map.rainland-forest-2",
  label: "レインランドのもり（その2）",
  defaultSpawnId: "fromForest1",
  manifestPath: new URL("../../assets/maps/rainland_forest_2/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/rainland_forest_2/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/rainland_forest_2/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/rainland_forest_2/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/rainland_forest_2/objects.json", import.meta.url).toString(),
  encounter: RAINLAND_FOREST_ENCOUNTER,
};

export interface RainlandMapSceneData {
  readonly spawnId?: string;
  /** BattleSceneから戻るときの戦闘直前位置(ランタイム座標、worldScale適用済み)。 */
  readonly spawnX?: number;
  readonly spawnY?: number;
  readonly spawnFacing?: Facing;
  readonly battleEventReturn?: boolean;
  /** いわやまのどうくつの崩落シューティングから戻った直後。説明はせず短い沈黙だけを見せる。 */
  readonly shootingReturn?: boolean;
}

interface ShootingTriggerRuntime {
  readonly definition: ImageMapShootingObject;
  readonly bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly visuals: readonly Phaser.GameObjects.GameObject[];
}

/**
 * レインランド地方の画像マップ共通Scene(もり その1・その2、じょうかまち)。StartingPlaceScene(No.01)と同じ
 * BACKGROUND/COLLISION/EVENT/OBJECT画像マップ方式をそのまま再利用し、背景・Collision・Eventだけが異なるため
 * 1つのSceneクラスをパッケージ設定で切り替える。ランダムエンカウントは`encounter`を持つパッケージ(もり)だけ有効。
 * NPCと会話は`MAPS[mapId].npcs`が空でないマップ(レインランドじょう)だけ有効になり、他のマップの挙動は変わらない。
 */
export class RainlandImageMapScene extends Phaser.Scene {
  private readonly pkg: RainlandMapPackage;
  private actions!: InputSystem;
  private player!: Player;
  private collisionRuntime!: ImageMapCollisionRuntime;
  private fieldMenu!: FieldMenu;
  private npcs: Npc[] = [];
  private dialogueBox?: DialogueBox;
  private notice?: Phaser.GameObjects.Text;
  private consumedEventIds = new Set<string>();
  private transitioning = false;
  private lastX = 0;
  private lastY = 0;
  private encounterState: RandomEncounterState = createRandomEncounterState();
  private readonly gameState = new GameStateRepository();
  private shootingTriggers: ShootingTriggerRuntime[] = [];
  /** 会話を閉じた直後に一度だけ実行する処理(シューティング開始の地震演出)。 */
  private afterDialogue?: () => void;
  /** 地震演出などの台本中。主人公を動かさず、エンカウントもしない。 */
  private scripted = false;

  constructor(sceneKey: string, pkg: RainlandMapPackage) {
    super({ key: sceneKey, physics: { arcade: { gravity: { x: 0, y: 0 } } } });
    this.pkg = pkg;
  }

  preload(): void {
    const { keyPrefix } = this.pkg;
    this.load.json(`${keyPrefix}.manifest`, this.pkg.manifestPath);
    this.load.image(`${keyPrefix}.background`, this.pkg.backgroundPath);
    this.load.image(`${keyPrefix}.collision`, this.pkg.collisionPath);
    this.load.json(`${keyPrefix}.events`, this.pkg.eventsPath);
    this.load.json(`${keyPrefix}.objects`, this.pkg.objectsPath);
    preloadWalkSprite(this, PROTAGONIST_SPRITE);
    preloadWalkSprite(this, TAROSA_SPRITE);
    preloadWalkSprite(this, MIREI_SPRITE);
    for (const npc of MAPS[this.pkg.mapId].npcs) {
      if (npc.spriteId) preloadWalkSprite(this, VILLAGER_SPRITES[npc.spriteId]);
    }
  }

  create(data?: RainlandMapSceneData): void {
    const { keyPrefix, mapId } = this.pkg;
    this.transitioning = false;
    this.scripted = false;
    this.afterDialogue = undefined;
    this.shootingTriggers = [];
    this.consumedEventIds.clear();
    const manifest = readImageMapManifest(this.cache.json.get(`${keyPrefix}.manifest`));
    // assetStatus(CURRENT / DEV_PLACEHOLDER)はreadImageMapManifestが検証済み。正式背景への差し替えはmap.jsonの値を変えるだけでよい。
    if (manifest.id !== mapId) {
      throw new Error(`${this.scene.key} requires the ${mapId} image-map package, got ${manifest.id}`);
    }
    const events = readImageMapEvents(this.cache.json.get(`${keyPrefix}.events`));
    const objects = readImageMapObjects(this.cache.json.get(`${keyPrefix}.objects`));
    const worldScale = manifest.worldScale;

    // 高解像度背景は縮小・拡大時も輪郭を保つため、pixelArt全体設定から独立してLINEARで表示する(No.01と同じ)。
    this.textures.get(`${keyPrefix}.background`).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const background = this.add.image(0, 0, `${keyPrefix}.background`).setOrigin(0, 0);
    if (background.width !== manifest.width || background.height !== manifest.height) {
      throw new Error(`background dimensions ${background.width}x${background.height} do not match ${manifest.width}x${manifest.height}`);
    }
    // background.pngはネイティブ解像度のまま(参照画像とバイト一致)を変更せず、worldScaleぶんだけ拡大表示する。
    background.setScale(worldScale);

    const mask = readCollisionMaskImageData(this, `${keyPrefix}.collision`);
    if (mask.width !== manifest.width || mask.height !== manifest.height) {
      throw new Error(`collision dimensions ${mask.width}x${mask.height} do not match ${manifest.width}x${manifest.height}`);
    }
    // Collision矩形はネイティブ座標で生成し、worldScaleを掛けてから物理Bodyへ渡す(元マスクの形状は維持)。
    const collisionRects = buildCollisionRects(mask, manifest.collisionCellSize).map((rect) => scaleRect(rect, worldScale));
    this.collisionRuntime = createImageMapCollision(
      this,
      collisionRects,
      isDevMode && new URLSearchParams(window.location.search).get("collisionDebug") === "1",
    );
    this.physics.world.setBounds(0, 0, manifest.width * worldScale, manifest.height * worldScale);

    const mapConfig = MAPS[mapId];
    const native = mapConfig.spawns[data?.spawnId ?? this.pkg.defaultSpawnId] ?? mapConfig.spawns[this.pkg.defaultSpawnId];
    // 戦闘から戻ったときはBattleSceneが渡す戦闘直前のランタイム座標へそのまま戻す(再スケールしない)。
    const hasExactSpawn = typeof data?.spawnX === "number" && typeof data?.spawnY === "number";
    const spawn = hasExactSpawn
      ? { x: data!.spawnX!, y: data!.spawnY!, facing: data?.spawnFacing ?? native.facing }
      : { x: native.x * worldScale, y: native.y * worldScale, facing: native.facing };
    ensureWalkAnimations(this, PROTAGONIST_SPRITE);
    this.player = new Player(this, spawn.x, spawn.y, spawn.facing);
    this.lastX = spawn.x;
    this.lastY = spawn.y;
    this.player.setDepth(1000);
    new PartyFollowers(this, this.player);
    for (const body of this.collisionRuntime.bodies) this.physics.add.collider(this.player.body, body);

    // NPC定義はmaps.tsのネイティブ背景ピクセル座標なのでworldScaleを掛けてから配置する(No.02と同じ)。
    this.npcs = mapConfig.npcs.map((definition) => new Npc(this, {
      ...definition,
      position: { x: definition.position.x * worldScale, y: definition.position.y * worldScale },
    }));
    for (const npc of this.npcs) {
      this.physics.add.collider(this.player.body, npc.body);
      if (npc.definition.movement) {
        for (const body of this.collisionRuntime.bodies) this.physics.add.collider(npc.body, body);
      }
    }
    for (let index = 0; index < this.npcs.length; index += 1) {
      for (let other = index + 1; other < this.npcs.length; other += 1) {
        this.physics.add.collider(this.npcs[index].body, this.npcs[other].body);
      }
    }

    // Objectの判定は背景と別レイヤーに保つ(No.01と同じ)。レインランドのもりは現時点でNPC等を配置しない。
    const savedFlags = this.gameState.load().flags;
    for (const object of objects) {
      const bounds = scaleRect(object, worldScale);
      if (object.type === "shooting") {
        // 赤い丸はクリア後に消え、そのまま普通に通れる(初回のみの強制イベント)。
        if (!savedFlags[object.clearedFlag]) this.shootingTriggers.push(this.createShootingTrigger(object, bounds));
        continue;
      }
      const marker = this.add.rectangle(bounds.x, bounds.y, bounds.width, bounds.height, 0x35b7d4, 1);
      marker.setDepth(800).setVisible(isDevMode);
      addStaticBody(this, marker);
      if (object.blocking) this.physics.add.collider(this.player.body, marker.body as Phaser.Physics.Arcade.StaticBody);
    }

    for (const event of events) {
      const bounds = scaleRect(event.bounds, worldScale);
      const zone = this.add.rectangle(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
        bounds.width,
        bounds.height,
        0x000000,
        0,
      );
      addStaticBody(this, zone);
      this.physics.add.overlap(this.player.body, zone.body as Phaser.Physics.Arcade.StaticBody, () => this.handleEvent(event));
    }

    // 戦闘から戻った直後は一定距離、再エンカウントを禁止する(BATTLE_SPEC.md §11、ビーエのもりと同じ)。
    this.encounterState = createRandomEncounterState(
      data?.battleEventReturn && this.pkg.encounter ? this.pkg.encounter.config.postBattleCooldownDistance : 0,
    );

    configureMapCamera(this, this.player.visual, { x: 0, y: 0, width: manifest.width * worldScale, height: manifest.height * worldScale });
    this.cameras.main.setBackgroundColor("#101018");
    this.cameras.main.fadeIn(MAP_TRANSITION_FADE_MS, 0, 0, 0);

    if (isDevMode) {
      const placeholder = manifest.assetStatus === "DEV_PLACEHOLDER" ? "  [DEV_PLACEHOLDER]" : "";
      this.notice = this.add.text(20, 20, `${this.pkg.label}${placeholder}  D: Collision表示`, {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "20px",
        stroke: "#121620",
        strokeThickness: 5,
      }).setScrollFactor(0).setDepth(2000);
    }

    if (this.pkg.alternateViewSceneKey) this.createViewToggleButton();
    this.fieldMenu = new FieldMenu(this);
    // 会話ウィンドウは他の表示物の後に作る(depthで常に最前面)。NPCのいないマップでは作らない。
    this.dialogueBox = this.npcs.length > 0 || this.shootingTriggers.length > 0 || data?.shootingReturn ? new DialogueBox(this) : undefined;
    this.actions = new InputSystem(window, document);
    const movePlayer = (): void => {
      // 会話中は主人公を動かさず、決定入力はページ送り専用にする。決定はフレームごとに1回だけ消費するため、
      // 話しかけたZが1ページ目を飛ばす／最終ページを閉じたZが即座に再開する、という二重消費は起きない。
      if (this.dialogueBox?.isOpen) {
        // 会話中に押された2D/3D切替は捨てる(会話を閉じた瞬間に勝手に切り替わらないように)。
        this.actions.consumePressed("view");
        if (this.actions.consumePressed("confirm") && this.dialogueBox.advance() && this.afterDialogue) {
          const next = this.afterDialogue;
          this.afterDialogue = undefined;
          next();
        }
        return;
      }
      if (this.scripted) {
        this.actions.consumePressed("confirm");
        this.actions.consumePressed("menu");
        this.actions.consumePressed("view");
        return;
      }
      if (this.fieldMenu.isOpen) {
        this.actions.consumePressed("view");
        this.fieldMenu.handleInput(this.actions);
        return;
      }
      if (!this.transitioning && this.actions.consumePressed("menu")) {
        this.fieldMenu.open();
        return;
      }
      if (!this.transitioning && this.pkg.alternateViewSceneKey && this.actions.consumePressed("view")) {
        this.switchView(this.pkg.alternateViewSceneKey);
        return;
      }
      if (!this.transitioning && this.rollRandomEncounter()) return;
      for (const npc of this.npcs) npc.update(this.time.now);
      this.player.update(this.actions);
      if (this.dialogueBox && this.actions.consumePressed("confirm") && !this.tryStartShooting()) this.tryStartDialogue();
    };
    const toggleCollision = (keyboardEvent: KeyboardEvent): void => {
      if (!isDevMode || keyboardEvent.code !== "KeyD" || keyboardEvent.repeat || keyboardEvent.ctrlKey || keyboardEvent.metaKey || keyboardEvent.altKey) return;
      this.collisionRuntime.setDebugVisible(!this.collisionRuntime.isDebugVisible());
      this.setNotice(`Collision: ${this.collisionRuntime.isDebugVisible() ? "ON" : "OFF"}  D: 表示切替`);
    };
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, movePlayer);
    window.addEventListener("keydown", toggleCollision);

    const cleanup = (): void => {
      this.actions.destroy();
      window.removeEventListener("keydown", toggleCollision);
      this.events.off(Phaser.Scenes.Events.PRE_UPDATE, movePlayer);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    if (data?.shootingReturn && this.dialogueBox) {
      // シューティングについては何も説明せず、短い沈黙だけで普通の探索へ戻す。
      this.dialogueBox.open(IWAYAMA_SHOOTING_TEXT.afterReturn);
    }

    if (isDevMode) {
      (window as unknown as { __rainlandMap?: unknown }).__rainlandMap = {
        scene: this,
        mapId,
        player: this.player,
        collisionRectCount: collisionRects.length,
        setCollisionVisible: (visible: boolean): void => this.collisionRuntime.setDebugVisible(visible),
      };
      // eslint-disable-next-line no-console
      console.log(`[IMAGE_MAP] ${manifest.id} loaded: ${manifest.width}x${manifest.height}, collisionRects=${collisionRects.length}`);
    }
  }

  /** 右上の「3D」ボタン(iPhone等のタッチ用)。キーボードではVで同じ切替。 */
  private createViewToggleButton(): void {
    const x = DISPLAY.width - 52;
    const y = 52;
    const button = this.add.circle(x, y, 34, 0x172a4b, 0.82).setStrokeStyle(3, 0xd5e5ff, 0.9)
      .setScrollFactor(0).setDepth(1900).setInteractive({ useHandCursor: true });
    this.add.text(x, y, "3D", { color: "#ffffff", fontFamily: "monospace", fontSize: "26px", fontStyle: "bold" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(1901);
    this.add.text(x, y + 46, "V", { color: "#d5e5ff", fontFamily: "monospace", fontSize: "14px" })
      .setOrigin(0.5).setScrollFactor(0).setDepth(1901);
    button.on("pointerdown", () => this.actions.queuePressed("view"));
  }

  /** 今いる場所・向きのまま、もう一方の見た目(2D⇄3D)のSceneへ切り替える。会話・メニュー中は呼ばれない。 */
  private switchView(targetSceneKey: string): void {
    this.transitioning = true;
    this.player.body.setVelocity(0, 0);
    this.actions.setLocked(true);
    const data: ViewToggleData = { spawnX: this.player.visual.x, spawnY: this.player.visual.y, spawnFacing: this.player.facing };
    this.cameras.main.fadeOut(RAINLAND_CASTLE_3D.toggleFadeMs, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(targetSceneKey, data));
  }

  /** 実際に歩いた距離を蓄積してエンカウント抽選する(フレーム単位では抽選しない)。戦闘開始したらtrue。 */
  private rollRandomEncounter(): boolean {
    const encounter = this.pkg.encounter;
    if (!encounter) return false;
    const movedDistance = Phaser.Math.Distance.Between(this.lastX, this.lastY, this.player.visual.x, this.player.visual.y);
    this.lastX = this.player.visual.x;
    this.lastY = this.player.visual.y;
    if (!advanceRandomEncounter(this.encounterState, movedDistance, encounter.config)) return false;
    this.transitioning = true;
    const event: BattleDialogueEvent = {
      type: "battle",
      eventId: `event_${this.pkg.mapId}_random_encounter`,
      monsterId: rollEncounterMonster(encounter.table),
      returnSceneKey: this.scene.key,
      returnSpawnId: this.pkg.defaultSpawnId,
      returnSpawnX: this.player.visual.x,
      returnSpawnY: this.player.visual.y,
      returnFacing: this.player.facing,
    };
    this.player.body.setVelocity(0, 0);
    beginBattleEntrance(this, this.actions, event);
    return true;
  }

  /** 赤い丸(調べる地点)。背景には焼き込まず、ゆっくり明滅する円で描く。 */
  private createShootingTrigger(definition: ImageMapShootingObject, bounds: ShootingTriggerRuntime["bounds"]): ShootingTriggerRuntime {
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    const radius = Math.min(bounds.width, bounds.height) / 2;
    const halo = this.add.circle(x, y, radius * 1.25, 0xff3b30, 0.22).setDepth(900);
    const disc = this.add.circle(x, y, radius * 0.8, 0xe0281e, 0.9).setStrokeStyle(3, 0xffb3a8, 0.9).setDepth(901);
    this.tweens.add({ targets: halo, scale: 1.25, alpha: 0.08, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    return { definition, bounds, visuals: [halo, disc] };
  }

  /** 主人公が赤い丸の上に立つか向いて調べたら、地震の予兆 → 会話 → 崩落 → シューティングSceneへ。 */
  private tryStartShooting(): boolean {
    if (this.transitioning) return false;
    const center = this.player.body.center;
    const trigger = this.shootingTriggers.find((candidate) =>
      canInteract(center, this.player.facing, candidate.bounds, INTERACTION_REACH, INTERACTION_SPAN) ||
      Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(candidate.bounds.x, candidate.bounds.y, candidate.bounds.width, candidate.bounds.height), center.x, center.y)
    );
    if (!trigger || !this.dialogueBox) return false;
    this.scripted = true;
    this.player.body.setVelocity(0, 0);
    const camera = this.cameras.main;
    // 小さな揺れ・天井からの小石(低い地鳴りSEは音声未実装のためTBD)
    camera.shake(1300, 0.004);
    this.dropPebbles(center.x, center.y, 8);
    this.time.delayedCall(900, () => {
      this.dialogueBox?.open(IWAYAMA_SHOOTING_TEXT.prelude);
      this.afterDialogue = () => this.collapseIntoShooting(trigger);
    });
    return true;
  }

  private dropPebbles(centerX: number, centerY: number, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const x = centerX + (Math.random() - 0.5) * 360;
      const targetY = centerY + (Math.random() - 0.5) * 160;
      const size = 3 + Math.random() * 5;
      const pebble = this.add.rectangle(x, targetY - 320, size, size, 0x9c8a76).setDepth(1500).setAngle(Math.random() * 90);
      this.tweens.add({
        targets: pebble,
        y: targetY,
        angle: pebble.angle + 180,
        duration: 380 + Math.random() * 260,
        delay: Math.random() * 700,
        ease: "Quad.easeIn",
        onComplete: () => this.tweens.add({ targets: pebble, alpha: 0, duration: 250, onComplete: () => pebble.destroy() }),
      });
    }
  }

  /** 強い揺れ → 奥と後ろが崩れる(落石と暗転) → シューティングへ。 */
  private collapseIntoShooting(trigger: ShootingTriggerRuntime): void {
    this.transitioning = true;
    this.actions.setLocked(true);
    const center = this.player.body.center;
    this.cameras.main.shake(1100, 0.014);
    this.dropPebbles(center.x, center.y, 26);
    this.time.delayedCall(850, () => {
      this.cameras.main.fadeOut(360, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(trigger.definition.sceneKey));
    });
  }

  private tryStartDialogue(): void {
    if (this.transitioning || !this.dialogueBox) return;
    const center = this.player.body.center;
    const npc = this.npcs.find((candidate) =>
      canInteract(
        center,
        this.player.facing,
        { x: candidate.body.x, y: candidate.body.y, width: candidate.body.width, height: candidate.body.height },
        INTERACTION_REACH,
        INTERACTION_SPAN,
      )
    );
    if (!npc) return;
    // 会話後イベント(戦闘・加入)はこのSceneでは扱わない。必要になったらStartingTownSceneのhandleAfterDialogueと同じ形で足す。
    const dialogue = getDialogue(npc.definition.dialogueId);
    if (!dialogue) return;
    // 会話開始時点の残存速度を確実に止める(次の物理stepを待たない)。
    this.player.body.setVelocity(0, 0);
    this.dialogueBox.open(dialogue.pages);
  }

  private handleEvent(event: ImageMapEvent): void {
    if (event.once && this.consumedEventIds.has(event.id)) return;
    this.consumedEventIds.add(event.id);
    const command = event.commands[0];
    if (command.type === "message") {
      this.setNotice(command.text);
      if (isDevMode) {
        // eslint-disable-next-line no-console
        console.log(`[IMAGE_MAP] ${this.pkg.mapId} entered ${event.id}`);
      }
      return;
    }
    if (this.transitioning) return;
    this.transitioning = true;
    if (command.type === "world-map") {
      beginMapTransition(this, this.actions, "WorldMapScene", { worldMapEntryId: command.worldMapEntryId }, MAP_TRANSITION_FADE_MS);
      return;
    }
    const target = MAPS[command.targetMapId as keyof typeof MAPS];
    if (!target || !target.spawns[command.targetSpawnId]) {
      throw new Error(`image-map transfer ${event.id} has an unknown target ${command.targetMapId}/${command.targetSpawnId}`);
    }
    beginMapTransition(this, this.actions, target.sceneKey, { spawnId: command.targetSpawnId }, MAP_TRANSITION_FADE_MS);
  }

  private setNotice(message: string): void {
    this.notice?.setText(message);
  }
}

function addStaticBody(scene: Phaser.Scene, object: Phaser.GameObjects.Rectangle): void {
  scene.physics.add.existing(object, true);
}

export class RainlandForest1Scene extends RainlandImageMapScene {
  constructor() {
    super("RainlandForest1Scene", FOREST_1);
  }
}

export class RainlandForest2Scene extends RainlandImageMapScene {
  constructor() {
    super("RainlandForest2Scene", FOREST_2);
  }
}
