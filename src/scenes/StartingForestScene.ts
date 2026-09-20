import Phaser from "phaser";
import { STARTING_FOREST_RANDOM_ENCOUNTER } from "../config/encounter.ts";
import { MAPS, MAP_TRANSITION_FADE_MS } from "../config/maps.ts";
import { ENCOUNTER_TABLES, rollEncounterMonster } from "../data/encounterTables.ts";
import { Player } from "../entities/Player.ts";
import type { BattleDialogueEvent } from "../events/BattleEventData.ts";
import { beginBattleEntrance } from "../events/BattleEntrance.ts";
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
import type { Facing } from "../systems/PlayerMovement.ts";
import { advanceRandomEncounter, createRandomEncounterState } from "../systems/RandomEncounter.ts";
import type { RandomEncounterState } from "../systems/RandomEncounter.ts";
import { FieldMenu } from "../ui/FieldMenu.ts";

const MAP_ID = "map_starting_forest";
const MANIFEST_KEY = "image-map.starting-forest.manifest";
const BACKGROUND_KEY = "image-map.starting-forest.background";
const COLLISION_KEY = "image-map.starting-forest.collision";
const EVENTS_KEY = "image-map.starting-forest.events";
const OBJECTS_KEY = "image-map.starting-forest.objects";

const MANIFEST_PATH = new URL("../../assets/maps/starting_forest/map.json", import.meta.url).toString();
const BACKGROUND_PATH = new URL("../../assets/maps/starting_forest/background.png", import.meta.url).toString();
const COLLISION_PATH = new URL("../../assets/maps/starting_forest/collision.png", import.meta.url).toString();
const EVENTS_PATH = new URL("../../assets/maps/starting_forest/events.json", import.meta.url).toString();
const OBJECTS_PATH = new URL("../../assets/maps/starting_forest/objects.json", import.meta.url).toString();

const isDevMode = typeof import.meta.env !== "undefined" && import.meta.env.DEV;

export interface StartingForestSceneData {
  readonly spawnId?: string;
  /** Set by BattleScene when returning from a random encounter: the exact pre-battle position. */
  readonly spawnX?: number;
  readonly spawnY?: number;
  readonly spawnFacing?: Facing;
  readonly battleEventReturn?: boolean;
}

/**
 * はじまりのもり。StartingPlaceScene(No.01)と同じBACKGROUND/COLLISION/EVENT/OBJECT画像マップ方式を
 * そのまま再利用し、追加で距離ベースのランダムエンカウントだけを持つ。正式No.01〜No.20の番号は持たない
 * 追加フィールドとしてWorldMapSceneへ統合する(MAP_FLOW_SPEC.md参照)。
 */
export class StartingForestScene extends Phaser.Scene {
  private actions!: InputSystem;
  private player!: Player;
  private collisionRuntime!: ImageMapCollisionRuntime;
  private fieldMenu!: FieldMenu;
  private notice?: Phaser.GameObjects.Text;
  private consumedEventIds = new Set<string>();
  private transitioning = false;
  private lastX = 0;
  private lastY = 0;
  private encounterState: RandomEncounterState = createRandomEncounterState();

  constructor(sceneKey = "StartingForestScene") {
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

  create(data?: StartingForestSceneData): void {
    this.transitioning = false;
    this.consumedEventIds.clear();
    const manifest = readImageMapManifest(this.cache.json.get(MANIFEST_KEY));
    if (manifest.id !== MAP_ID || manifest.assetStatus !== "CURRENT") {
      throw new Error(`StartingForestScene requires the CURRENT ${MAP_ID} image-map package`);
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
    const hasExactSpawn = typeof data?.spawnX === "number" && typeof data?.spawnY === "number";
    // hasExactSpawnの座標はBattleSceneから戻る直前のthis.player.visual.x/yそのもの(既にworldScale適用済みの
    // ランタイム座標)なので再スケールしない。mapConfig.spawns側はmaps.tsのネイティブ背景ピクセル座標なので
    // ここでworldScaleを掛ける。
    const spawn = hasExactSpawn
      ? { x: data!.spawnX!, y: data!.spawnY!, facing: data?.spawnFacing ?? "up" as Facing }
      : (() => {
          const native = mapConfig.spawns[data?.spawnId ?? "fromWorldMap"] ?? mapConfig.spawns.fromWorldMap;
          return { x: native.x * worldScale, y: native.y * worldScale, facing: native.facing };
        })();
    ensureWalkAnimations(this, PROTAGONIST_SPRITE);
    this.player = new Player(this, spawn.x, spawn.y, spawn.facing);
    this.player.setDepth(1000);
    // 加入済みの仲間(タロサ・ミレイ)は、他の画像マップと同じく主人公の軌跡を辿って付いてくる。
    // 戦闘から戻った際もScene再生成時に主人公の直前位置・向きを基準に並べ直される。
    new PartyFollowers(this, this.player);
    this.lastX = spawn.x;
    this.lastY = spawn.y;
    for (const body of this.collisionRuntime.bodies) this.physics.add.collider(this.player.body, body);

    // Objectの判定は背景と別レイヤーに保つ(No.01と同じ)。はじまりのもりは現時点でNPC等を配置しない。
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

    // 戦闘から戻った直後は一定距離、再エンカウントを禁止する(BATTLE_SPEC.md §11)。
    this.encounterState = createRandomEncounterState(data?.battleEventReturn ? STARTING_FOREST_RANDOM_ENCOUNTER.postBattleCooldownDistance : 0);

    configureMapCamera(this, this.player.visual, { x: 0, y: 0, width: manifest.width * worldScale, height: manifest.height * worldScale });
    this.cameras.main.setBackgroundColor("#101018");
    this.cameras.main.fadeIn(MAP_TRANSITION_FADE_MS, 0, 0, 0);

    if (isDevMode) {
      this.notice = this.add.text(20, 20, "はじまりのもり  D: Collision表示", {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "20px",
        stroke: "#121620",
        strokeThickness: 5,
      }).setScrollFactor(0).setDepth(2000);
    }

    this.fieldMenu = new FieldMenu(this);
    this.actions = new InputSystem(window, document);
    const movePlayer = (): void => this.tick();
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
      (window as unknown as { __startingForest?: unknown }).__startingForest = {
        scene: this,
        player: this.player,
        collisionRectCount: collisionRects.length,
        setCollisionVisible: (visible: boolean): void => this.collisionRuntime.setDebugVisible(visible),
      };
      // eslint-disable-next-line no-console
      console.log(`[IMAGE_MAP] ${manifest.id} loaded: ${manifest.width}x${manifest.height}, collisionRects=${collisionRects.length}`);
    }
  }

  /** 移動→実移動距離の蓄積→エンカウント抽選の順で毎フレーム処理する(フレーム単位の抽選は行わない)。 */
  private tick(): void {
    if (this.fieldMenu.isOpen) {
      this.fieldMenu.handleInput(this.actions);
      return;
    }
    if (!this.transitioning) {
      if (this.actions.consumePressed("menu")) {
        this.fieldMenu.open();
        return;
      }
      const movedDistance = Phaser.Math.Distance.Between(this.lastX, this.lastY, this.player.visual.x, this.player.visual.y);
      this.lastX = this.player.visual.x;
      this.lastY = this.player.visual.y;
      if (advanceRandomEncounter(this.encounterState, movedDistance, STARTING_FOREST_RANDOM_ENCOUNTER)) {
        this.beginRandomEncounter();
        return;
      }
    }
    this.player.update(this.actions);
  }

  private beginRandomEncounter(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    const monsterId = rollEncounterMonster(ENCOUNTER_TABLES.starting_forest);
    const event: BattleDialogueEvent = {
      type: "battle",
      eventId: "event_starting_forest_random_encounter",
      monsterId,
      // this.scene.key: StartingForestTestScene(DEV)でも自分自身へ正しく戻す。
      returnSceneKey: this.scene.key,
      returnSpawnId: "fromWorldMap",
      returnSpawnX: this.player.visual.x,
      returnSpawnY: this.player.visual.y,
      returnFacing: this.player.facing,
    };
    this.player.body.setVelocity(0, 0);
    beginBattleEntrance(this, this.actions, event);
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
