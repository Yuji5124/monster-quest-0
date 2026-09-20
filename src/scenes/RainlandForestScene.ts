import Phaser from "phaser";
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
import type { ImageMapEvent } from "../systems/ImageMapData.ts";
import { configureMapCamera } from "../systems/MapCamera.ts";
import { canInteract } from "../systems/Interaction.ts";
import { beginMapTransition } from "../systems/MapTransition.ts";
import { PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { TAROSA_SPRITE } from "../config/tarosaSprite.ts";
import { MIREI_SPRITE } from "../config/mireiSprite.ts";
import { ensureWalkAnimations, preloadWalkSprite } from "../systems/CharacterWalkSprite.ts";
import { DialogueBox } from "../ui/DialogueBox.ts";
import { FieldMenu } from "../ui/FieldMenu.ts";

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
}

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
};

export interface RainlandMapSceneData {
  readonly spawnId?: string;
}

/**
 * レインランド地方の画像マップ共通Scene(もり その1・その2、じょうかまち)。StartingPlaceScene(No.01)と同じ
 * BACKGROUND/COLLISION/EVENT/OBJECT画像マップ方式をそのまま再利用し、背景・Collision・Eventだけが異なるため
 * 1つのSceneクラスをパッケージ設定で切り替える。ランダムエンカウントは出現モンスターがTBDのため持たない。
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
  }

  create(data?: RainlandMapSceneData): void {
    const { keyPrefix, mapId } = this.pkg;
    this.transitioning = false;
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
    ensureWalkAnimations(this, PROTAGONIST_SPRITE);
    this.player = new Player(this, native.x * worldScale, native.y * worldScale, native.facing);
    this.player.setDepth(1000);
    new PartyFollowers(this, this.player);
    for (const body of this.collisionRuntime.bodies) this.physics.add.collider(this.player.body, body);

    // NPC(DEV_PLACEHOLDER表示)。定義はmaps.tsのネイティブ背景ピクセル座標なのでworldScaleを掛けてから配置する(No.02と同じ)。
    this.npcs = mapConfig.npcs.map((definition) => new Npc(this, {
      ...definition,
      position: { x: definition.position.x * worldScale, y: definition.position.y * worldScale },
    }));
    for (const npc of this.npcs) this.physics.add.collider(this.player.body, npc.body);

    // Objectの判定は背景と別レイヤーに保つ(No.01と同じ)。レインランドのもりは現時点でNPC等を配置しない。
    for (const object of objects) {
      const bounds = scaleRect(object, worldScale);
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

    this.fieldMenu = new FieldMenu(this);
    // 会話ウィンドウは他の表示物の後に作る(depthで常に最前面)。NPCのいないマップでは作らない。
    this.dialogueBox = this.npcs.length > 0 ? new DialogueBox(this) : undefined;
    this.actions = new InputSystem(window, document);
    const movePlayer = (): void => {
      // 会話中は主人公を動かさず、決定入力はページ送り専用にする。決定はフレームごとに1回だけ消費するため、
      // 話しかけたZが1ページ目を飛ばす／最終ページを閉じたZが即座に再開する、という二重消費は起きない。
      if (this.dialogueBox?.isOpen) {
        if (this.actions.consumePressed("confirm")) this.dialogueBox.advance();
        return;
      }
      if (this.fieldMenu.isOpen) {
        this.fieldMenu.handleInput(this.actions);
        return;
      }
      if (!this.transitioning && this.actions.consumePressed("menu")) {
        this.fieldMenu.open();
        return;
      }
      this.player.update(this.actions);
      if (this.dialogueBox && this.actions.consumePressed("confirm")) this.tryStartDialogue();
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
