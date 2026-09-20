import Phaser from "phaser";
import { MAPS, MAP_TRANSITION_FADE_MS } from "../config/maps.ts";
import { Player } from "../entities/Player.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { buildCollisionRects, createImageMapCollision, readCollisionMaskImageData } from "../systems/ImageMapCollision.ts";
import type { ImageMapCollisionRuntime } from "../systems/ImageMapCollision.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects, scaleRect } from "../systems/ImageMapData.ts";
import type { ImageMapEvent } from "../systems/ImageMapData.ts";
import { configureMapCamera } from "../systems/MapCamera.ts";
import { beginMapTransition } from "../systems/MapTransition.ts";
import { PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { TAROSA_SPRITE } from "../config/tarosaSprite.ts";
import { MIREI_SPRITE } from "../config/mireiSprite.ts";
import { ensureWalkAnimations, preloadWalkSprite } from "../systems/CharacterWalkSprite.ts";
import { PartyFollowers } from "../systems/PartyFollowers.ts";
import { FieldMenu } from "../ui/FieldMenu.ts";

const MAP_ID = "map_03_bie_village";
const MANIFEST_KEY = "image-map.bie-village.manifest";
const BACKGROUND_KEY = "image-map.bie-village.background";
const COLLISION_KEY = "image-map.bie-village.collision";
const EVENTS_KEY = "image-map.bie-village.events";
const OBJECTS_KEY = "image-map.bie-village.objects";

const MANIFEST_PATH = new URL("../../assets/maps/bie_village/map.json", import.meta.url).toString();
const BACKGROUND_PATH = new URL("../../assets/maps/bie_village/background.png", import.meta.url).toString();
const COLLISION_PATH = new URL("../../assets/maps/bie_village/collision.png", import.meta.url).toString();
const EVENTS_PATH = new URL("../../assets/maps/bie_village/events.json", import.meta.url).toString();
const OBJECTS_PATH = new URL("../../assets/maps/bie_village/objects.json", import.meta.url).toString();

const isDevMode = typeof import.meta.env !== "undefined" && import.meta.env.DEV;

export interface BieVillageSceneData {
  readonly spawnId?: string;
}

/**
 * No.03「ビーエのむら」。StartingPlaceScene(No.01)と同じBACKGROUND/COLLISION/EVENT/OBJECT
 * 画像マップ方式をそのまま再利用する。NPC・会話・木こり救出イベント・ランダムエンカウントは
 * docs/NPC/02_bie_no_mura.md が SOURCE_DRAFT_EXISTS / REDUCING のため今回は未実装(follow-up)。
 */
export class BieVillageScene extends Phaser.Scene {
  private actions!: InputSystem;
  private player!: Player;
  private collisionRuntime!: ImageMapCollisionRuntime;
  private fieldMenu!: FieldMenu;
  private notice?: Phaser.GameObjects.Text;
  private consumedEventIds = new Set<string>();
  private transitioning = false;

  constructor(sceneKey = "BieVillageScene") {
    super({ key: sceneKey, physics: { arcade: { gravity: { x: 0, y: 0 } } } });
  }

  preload(): void {
    this.load.json(MANIFEST_KEY, MANIFEST_PATH);
    this.load.image(BACKGROUND_KEY, BACKGROUND_PATH);
    this.load.image(COLLISION_KEY, COLLISION_PATH);
    this.load.json(EVENTS_KEY, EVENTS_PATH);
    this.load.json(OBJECTS_KEY, OBJECTS_PATH);
    preloadWalkSprite(this, PROTAGONIST_SPRITE);
    preloadWalkSprite(this, TAROSA_SPRITE);
    preloadWalkSprite(this, MIREI_SPRITE);
  }

  create(data?: BieVillageSceneData): void {
    this.transitioning = false;
    this.consumedEventIds.clear();
    const manifest = readImageMapManifest(this.cache.json.get(MANIFEST_KEY));
    if (manifest.id !== MAP_ID || manifest.assetStatus !== "CURRENT") {
      throw new Error(`BieVillageScene requires the CURRENT ${MAP_ID} image-map package`);
    }
    const events = readImageMapEvents(this.cache.json.get(EVENTS_KEY));
    const objects = readImageMapObjects(this.cache.json.get(OBJECTS_KEY));
    const worldScale = manifest.worldScale;

    // 高解像度背景は縮小時も輪郭を保つため、pixelArt全体設定から独立してLINEARで表示する(No.01と同じ)。
    this.textures.get(BACKGROUND_KEY).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const background = this.add.image(0, 0, BACKGROUND_KEY).setOrigin(0, 0);
    if (background.width !== manifest.width || background.height !== manifest.height) {
      throw new Error(`background dimensions ${background.width}x${background.height} do not match ${manifest.width}x${manifest.height}`);
    }
    // background.pngはネイティブ解像度のまま(参照画像とバイト一致)を変更せず、worldScaleぶんだけ拡大表示する。
    background.setScale(worldScale);

    const mask = readCollisionMaskImageData(this, COLLISION_KEY);
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

    const mapConfig = MAPS[MAP_ID];
    const spawn = mapConfig.spawns[data?.spawnId ?? "fromWorldMap"] ?? mapConfig.spawns.fromWorldMap;
    ensureWalkAnimations(this, PROTAGONIST_SPRITE);
    this.player = new Player(this, spawn.x * worldScale, spawn.y * worldScale, spawn.facing);
    this.player.setDepth(1000);
    // 加入済みの仲間(タロサ・ミレイ)は、他の画像マップと同じく主人公の軌跡を辿って付いてくる。
    new PartyFollowers(this, this.player);
    for (const body of this.collisionRuntime.bodies) this.physics.add.collider(this.player.body, body);

    // Objectの判定は背景と別レイヤーに保つ(No.01と同じ)。ビーエのむらは現時点でNPC等を配置しない。
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
      this.notice = this.add.text(20, 20, "ビーエのむら  D: Collision表示", {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "20px",
        stroke: "#121620",
        strokeThickness: 5,
      }).setScrollFactor(0).setDepth(2000);
    }

    this.fieldMenu = new FieldMenu(this);
    this.actions = new InputSystem(window, document);
    const movePlayer = (): void => {
      if (this.fieldMenu.isOpen) {
        this.fieldMenu.handleInput(this.actions);
        return;
      }
      if (!this.transitioning && this.actions.consumePressed("menu")) {
        this.fieldMenu.open();
        return;
      }
      this.player.update(this.actions);
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
      (window as unknown as { __bieVillage?: unknown }).__bieVillage = {
        scene: this,
        player: this.player,
        collisionRectCount: collisionRects.length,
        setCollisionVisible: (visible: boolean): void => this.collisionRuntime.setDebugVisible(visible),
      };
      // eslint-disable-next-line no-console
      console.log(`[IMAGE_MAP] ${manifest.id} loaded: ${manifest.width}x${manifest.height}, collisionRects=${collisionRects.length}`);
    }
  }

  private handleEvent(event: ImageMapEvent): void {
    if (event.once && this.consumedEventIds.has(event.id)) return;
    this.consumedEventIds.add(event.id);
    const command = event.commands[0];
    if (command.type === "message") {
      this.setNotice(command.text);
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
