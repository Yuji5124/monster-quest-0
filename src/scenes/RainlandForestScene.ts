import Phaser from "phaser";
import { DEV_BATTLE_MONSTER_IDS } from "../config/battle.ts";
import type { DevBattleMonsterId } from "../config/battle.ts";
import { DISPLAY, SCALE_FACTOR } from "../config/display.ts";
import { INTERACTION_REACH, INTERACTION_SPAN } from "../config/interaction.ts";
import { MAPS, MAP_TRANSITION_FADE_MS, isNpcPresent } from "../config/maps.ts";
import type { MapId } from "../config/maps.ts";
import { getDialogue } from "../data/dialogues.ts";
import { ITEM_DEFINITIONS } from "../data/items.ts";
import type { ItemId } from "../data/items.ts";
import { Npc } from "../entities/Npc.ts";
import { Player } from "../entities/Player.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { PartyFollowers } from "../systems/PartyFollowers.ts";
import { buildCollisionRects, createImageMapCollision, readCollisionMaskImageData } from "../systems/ImageMapCollision.ts";
import type { ImageMapCollisionRuntime } from "../systems/ImageMapCollision.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects, scaleRect } from "../systems/ImageMapData.ts";
import type { ImageMapBossObject, ImageMapChestObject, ImageMapEvent, ImageMapInteractableObject, ImageMapShootingObject } from "../systems/ImageMapData.ts";
import { GameStateRepository } from "../systems/GameStateRepository.ts";
import { PRIEST_RECORD_PAGES, PRIEST_RECOVERY_PAGES, recordAdventureAtPriest } from "../systems/PriestService.ts";
import type { ImageMapObject } from "../systems/ImageMapData.ts";
import { ImageMapStoryLayer, isStoryObject } from "../systems/ImageMapStoryLayer.ts";
import { createChestVisual } from "../systems/ChestTexture.ts";
import { inventory } from "../systems/Inventory.ts";
import { IWAYAMA_SHOOTING_TEXT } from "../config/iwayamaShooting.ts";
import { configureMapCamera } from "../systems/MapCamera.ts";
import { startFieldAmbience } from "../systems/FieldAmbience.ts";
import { RainlandWeatherController } from "../systems/RainlandWeatherController.ts";
import { RainlandWeatherLayer } from "../systems/RainlandWeatherPresentation.ts";
import { canInteract } from "../systems/Interaction.ts";
import { beginMapTransition } from "../systems/MapTransition.ts";
import { PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { TAROSA_SPRITE } from "../config/tarosaSprite.ts";
import { MIREI_SPRITE } from "../config/mireiSprite.ts";
import { VILLAGER_SPRITES } from "../config/villagerSprites.ts";
import { ensureWalkAnimations, preloadWalkSprite } from "../systems/CharacterWalkSprite.ts";
import { getShop } from "../config/shops.ts";
import { DialogueBox } from "../ui/DialogueBox.ts";
import { ShopWindow } from "../ui/ShopWindow.ts";
import { RAINLAND_FOREST_RANDOM_ENCOUNTER } from "../config/encounter.ts";
import type { RandomEncounterConfig } from "../config/encounter.ts";
import { ENCOUNTER_TABLES, rollEncounterMonster } from "../data/encounterTables.ts";
import type { EncounterTable } from "../data/encounterTables.ts";
import { isNpcDepartDialogueEvent, isPartyJoinDialogueEvent, isPortraitInterludeDialogueEvent, isStoryFlagsDialogueEvent } from "../events/BattleEventData.ts";
import type { BattleDialogueEvent, DialogueAfterEvent, NpcDepartDialogueEvent, PortraitInterludeDialogueEvent } from "../events/BattleEventData.ts";
import { beginBattleEntrance } from "../events/BattleEntrance.ts";
import type { Facing } from "../systems/PlayerMovement.ts";
import { advanceRandomEncounter, createRandomEncounterState } from "../systems/RandomEncounter.ts";
import type { RandomEncounterState } from "../systems/RandomEncounter.ts";
import { partySystem } from "../systems/PartySystem.ts";
import type { PartyMemberId } from "../systems/PartySystem.ts";
import { FieldMenu } from "../ui/FieldMenu.ts";
import { RAINLAND_CASTLE_3D } from "../config/rainlandCastle3D.ts";
import type { ViewToggleData } from "../systems/CastleViewToggle.ts";
import { getJumpCardBattle } from "../config/jumpCardBattles.ts";
import { canStartJumpCardBattle } from "../systems/JumpCardBattle.ts";

const isDevMode = typeof import.meta.env !== "undefined" && import.meta.env.DEV;
// StartingTownSceneのNPC退場演出と同じ長さ(§不思議なとうのおじいさん)。
const NPC_DEPART_FADE_MS = 500;
const NPC_DEPART_HOLD_MS = 700;

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
  /** このマップの出入口から入るときだけ、遷移先マップを既定とは別のSceneで開く(じょうかまち → レインランドじょうは3D)。 */
  readonly transferSceneOverrides?: Partial<Record<MapId, string>>;
  /** 初回到達だけに使う短い制御演出。セーブ破損や長い待機を起こさない。 */
  readonly firstEntryGlitch?: { readonly entryFlag: string; readonly discoveryFlag: string };
  /** 初回入場後に一度だけ会話ウィンドウで出す語り(いしのまち)。閉じたときに`flag`を保存する。 */
  readonly entryNarration?: {
    readonly flag: string;
    readonly pages: readonly string[];
    readonly delayMs: number;
    /** Leave the narration dormant until the preceding story beat has been completed. */
    readonly requiredFlag?: string;
    /** Additional state committed only after the player reads every page. */
    readonly thenFlags?: readonly string[];
    /** A companion can arrive as the final beat of this one-time field event. */
    readonly joinsPartyAs?: PartyMemberId;
  };
  /** OBJECT boss field sprites stay separate from BattleScene portraits. */
  readonly bossSprites?: Readonly<Partial<Record<DevBattleMonsterId, ImageMapBossSprite>>>;
  /** No.05 only: a saved weather state that is carried into encounters. */
  readonly weather?: "rainland-forest";
}

export interface ImageMapBossSprite {
  readonly key: string;
  readonly path: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly idleFrames: readonly number[];
  readonly frameRate: number;
  /** Native map pixels before worldScale is applied. */
  readonly displayWidth: number;
  readonly displayHeight: number;
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
  weather: "rainland-forest",
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
  weather: "rainland-forest",
};

export interface RainlandMapSceneData {
  readonly spawnId?: string;
  /** BattleSceneから戻るときの戦闘直前位置(ランタイム座標、worldScale適用済み)。 */
  readonly spawnX?: number;
  readonly spawnY?: number;
  readonly spawnFacing?: Facing;
  readonly battleEventReturn?: boolean;
  /** 通常戦闘で全滅した後、僧侶の前で回復会話を始める。 */
  readonly priestRecovery?: boolean;
  /** いわやまのどうくつの崩落シューティングから戻った直後。説明はせず短い沈黙だけを見せる。 */
  readonly shootingReturn?: boolean;
}

interface ShootingTriggerRuntime {
  readonly definition: ImageMapShootingObject;
  readonly bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly visuals: readonly Phaser.GameObjects.GameObject[];
}

interface InteractableRuntime {
  readonly definition: ImageMapInteractableObject;
  readonly bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

interface BossTriggerRuntime {
  readonly definition: ImageMapBossObject;
  readonly bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

interface ChestRuntime {
  readonly definition: ImageMapChestObject;
  readonly bodyMarker: Phaser.GameObjects.Rectangle;
  readonly visual: Phaser.GameObjects.Container;
}

/**
 * レインランド地方の画像マップ共通Scene(もり その1・その2、じょうかまち)。StartingPlaceScene(No.01)と同じ
 * BACKGROUND/COLLISION/EVENT/OBJECT画像マップ方式をそのまま再利用し、背景・Collision・Eventだけが異なるため
 * 1つのSceneクラスをパッケージ設定で切り替える。ランダムエンカウントは`encounter`を持つパッケージ(もり)だけ有効。
 * NPCと会話は`MAPS[mapId].npcs`が空でないマップ(レインランドじょう、もり その2の木こり)だけ有効になり、他のマップの挙動は変わらない。
 * 宝箱は`objects.json`のchest(もり その2の遺跡)。開封済みフラグが立っていれば最初から置かない。
 */
export class RainlandImageMapScene extends Phaser.Scene {
  private readonly pkg: RainlandMapPackage;
  private actions!: InputSystem;
  private player!: Player;
  private collisionRuntime!: ImageMapCollisionRuntime;
  private fieldMenu!: FieldMenu;
  private partyFollowers!: PartyFollowers;
  private npcs: Npc[] = [];
  private dialogueBox?: DialogueBox;
  /** 店を兼業する住民(role: "shopkeeper"、config/shops.ts)がいるマップだけ作る(かくれざと・ビーエのむらと同じ)。 */
  private shopWindow?: ShopWindow;
  private notice?: Phaser.GameObjects.Text;
  private consumedEventIds = new Set<string>();
  private transitioning = false;
  private lastX = 0;
  private lastY = 0;
  private encounterState: RandomEncounterState = createRandomEncounterState();
  private readonly gameState = new GameStateRepository();
  /** No.05 only. The controller is game state; this layer is a disposable Phaser view. */
  private weatherController?: RainlandWeatherController;
  private weatherLayer?: RainlandWeatherLayer;
  private shootingTriggers: ShootingTriggerRuntime[] = [];
  private interactableObjects: InteractableRuntime[] = [];
  private bossTriggers: BossTriggerRuntime[] = [];
  private chests: ChestRuntime[] = [];
  /** 石像・石の壁・広場の石像(statue / barrier / awakening)。該当Objectを持つマップ(いしのまち)だけ作る。 */
  private storyLayer?: ImageMapStoryLayer;
  /** 会話を閉じた直後に一度だけ実行する処理(シューティング開始の地震演出、話し終えた時の進行フラグ保存)。 */
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
    for (const sprite of Object.values(this.pkg.bossSprites ?? {})) {
      if (!sprite || this.textures.exists(sprite.key)) continue;
      this.load.spritesheet(sprite.key, sprite.path, { frameWidth: sprite.frameWidth, frameHeight: sprite.frameHeight });
    }
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
    this.interactableObjects = [];
    this.bossTriggers = [];
    this.chests = [];
    this.storyLayer = undefined;
    this.weatherLayer?.dispose();
    this.weatherController = undefined;
    this.weatherLayer = undefined;
    const storyObjects: ImageMapObject[] = [];
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
    const savedFlags = this.gameState.load().flags;
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
    this.partyFollowers = new PartyFollowers(this, this.player);
    for (const body of this.collisionRuntime.bodies) this.physics.add.collider(this.player.body, body);

    // NPC定義はmaps.tsのネイティブ背景ピクセル座標なのでworldScaleを掛けてから配置する(No.02と同じ)。
    const savedFlagSet = new Set(Object.keys(savedFlags).filter((flag) => savedFlags[flag]));
    this.npcs = mapConfig.npcs.filter((definition) => isNpcPresent(definition, savedFlagSet)).map((definition) => new Npc(this, {
      ...definition,
      position: { x: definition.position.x * worldScale, y: definition.position.y * worldScale },
      movement: definition.movement && {
        ...definition.movement,
        radius: definition.movement.radius * worldScale,
        speed: definition.movement.speed * worldScale,
      },
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

    // Objectの判定は背景と別レイヤーに保つ(No.01と同じ)。もり その2は遺跡の宝箱(chest)をここで置く。
    for (const object of objects) {
      const bounds = scaleRect(object, worldScale);
      if (isStoryObject(object)) {
        // 石像・石の壁・広場の石像は、会話ウィンドウ作成後にImageMapStoryLayerがまとめて扱う。
        storyObjects.push(object);
        continue;
      }
      if (object.type === "boss") {
        if (!savedFlags[object.victoryFlag]) this.bossTriggers.push(this.createBossTrigger(object, bounds, worldScale));
        continue;
      }
      if (object.type === "interactable") {
        this.interactableObjects.push(this.createInteractableObject(object, bounds));
        continue;
      }
      if (object.type === "chest") {
        // 開封済みのフラグが保存されていれば最初から置かない(取得後に消える宝箱)。
        if (!savedFlags[object.openedFlag]) this.chests.push(this.createChest(object, bounds));
        continue;
      }
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
    // 雲の影・漂う粒などの環境エフェクト(config/fieldAmbience.ts)。割り当ての無いマップ(洞窟・塔)では何もしない。
    startFieldAmbience(this, mapId);
    if (this.pkg.weather === "rainland-forest") {
      this.weatherController = new RainlandWeatherController(this.gameState);
      this.weatherLayer = new RainlandWeatherLayer(this, this.weatherController.current, "field");
    }
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
    this.fieldMenu = new FieldMenu(this, { onOpen: () => this.player.body.setVelocity(0, 0) });
    // 会話ウィンドウは他の表示物の後に作る(depthで常に最前面)。NPC・宝箱・調べる物のないマップでは作らない。
    this.dialogueBox = this.npcs.length > 0 || this.shootingTriggers.length > 0 || this.interactableObjects.length > 0 || this.chests.length > 0 || storyObjects.length > 0 || this.pkg.entryNarration || data?.shootingReturn ? new DialogueBox(this) : undefined;
    if (this.dialogueBox && storyObjects.length > 0) {
      this.storyLayer = new ImageMapStoryLayer({
        scene: this,
        worldScale,
        player: this.player,
        dialogueBox: this.dialogueBox,
        gameState: this.gameState,
        setScripted: (scripted) => { this.scripted = scripted; },
        setAfterDialogue: (next) => { this.afterDialogue = next; },
      }, storyObjects);
    }
    // 店を兼業する住民がいるマップだけ、はじまりのまち・ビーエのむらと同じShopWindowを作る。「はなす」を選ぶと
    // このNPCのdialogueIdをそのまま会話ウィンドウで読む(店を持たないマップの挙動は変わらない)。
    this.shopWindow = mapConfig.npcs.some((npc) => getShop(npc.id))
      ? new ShopWindow(this, (npcId) => {
          const dialogue = getDialogue(mapConfig.npcs.find((candidate) => candidate.id === npcId)?.dialogueId ?? "");
          if (!dialogue) return;
          const after = dialogue.afterDialogue;
          this.afterDialogue = after ? () => this.handleAfterDialogue(after) : undefined;
          this.dialogueBox?.open(dialogue.pages);
        })
      : undefined;
    this.actions = new InputSystem(window, document);
    if (data?.priestRecovery && this.dialogueBox) {
      this.time.delayedCall(MAP_TRANSITION_FADE_MS + 50, () => {
        this.player.body.setVelocity(0, 0);
        this.dialogueBox?.open(PRIEST_RECOVERY_PAGES);
      });
    }
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
      if (this.shopWindow?.isOpen) {
        this.actions.consumePressed("view");
        this.shopWindow.handleInput(this.actions, this.actions.consumePressed("confirm"));
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
      if (this.dialogueBox && this.actions.consumePressed("confirm") && !this.tryStartShooting() && !this.tryOpenChest()) this.tryStartDialogue();
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

    this.playFirstEntryGlitch();
    this.playEntryNarration();

    if (isDevMode) {
      (window as unknown as { __rainlandMap?: unknown }).__rainlandMap = {
        scene: this,
        mapId,
        player: this.player,
        collisionRectCount: collisionRects.length,
        story: this.storyLayer,
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
    if (this.weatherController) this.weatherLayer?.setWeather(this.weatherController.advanceExploration(movedDistance));
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
      ...(this.weatherController ? { weather: this.weatherController.toBattleWeather() } : {}),
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

  /** Draws a data-owned boss visual and starts the existing shared BattleScene. */
  private createBossTrigger(
    definition: ImageMapBossObject,
    bounds: BossTriggerRuntime["bounds"],
    worldScale: number,
  ): BossTriggerRuntime {
    const monsterId = definition.monsterId as DevBattleMonsterId;
    if (!DEV_BATTLE_MONSTER_IDS.includes(monsterId)) {
      throw new Error(`${this.pkg.mapId} boss ${definition.id} references an unknown battle monster ${definition.monsterId}`);
    }
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const trigger = this.add.rectangle(centerX, centerY, bounds.width, bounds.height, 0xb11d3e, isDevMode ? 0.16 : 0).setDepth(900);
    addStaticBody(this, trigger);
    if (definition.blocking) this.physics.add.collider(this.player.body, trigger.body as Phaser.Physics.Arcade.StaticBody);
    const sprite = this.pkg.bossSprites?.[monsterId];
    if (sprite) {
      const animationKey = `${sprite.key}.idle`;
      if (!this.anims.exists(animationKey)) {
        this.anims.create({
          key: animationKey,
          frames: this.anims.generateFrameNumbers(sprite.key, { frames: [...sprite.idleFrames] }),
          frameRate: sprite.frameRate,
          repeat: -1,
        });
      }
      this.add.sprite(centerX, bounds.y + bounds.height, sprite.key, sprite.idleFrames[0])
        .setOrigin(0.5, 1)
        .setDisplaySize(sprite.displayWidth * worldScale, sprite.displayHeight * worldScale)
        .setDepth(950 + centerY * 0.01)
        .play(animationKey);
    }
    this.physics.add.overlap(this.player.body, trigger.body as Phaser.Physics.Arcade.StaticBody, () => this.beginBossBattle(definition));
    return { definition, bounds };
  }

  private beginBossBattle(definition: ImageMapBossObject): void {
    if (this.transitioning) return;
    const monsterId = definition.monsterId as DevBattleMonsterId;
    if (!DEV_BATTLE_MONSTER_IDS.includes(monsterId)) {
      throw new Error(`${this.pkg.mapId} boss ${definition.id} references an unknown battle monster ${definition.monsterId}`);
    }
    this.transitioning = true;
    this.player.body.setVelocity(0, 0);
    const event: BattleDialogueEvent = {
      type: "battle",
      eventId: definition.id,
      monsterId,
      monsterDisplayName: definition.label,
      returnSceneKey: this.scene.key,
      returnSpawnId: this.pkg.defaultSpawnId,
      returnSpawnX: this.player.visual.x,
      returnSpawnY: this.player.visual.y,
      returnFacing: this.player.facing,
      victoryFlag: definition.victoryFlag,
      victoryFlags: [definition.unlockFlag],
      ...(this.weatherController ? { weather: this.weatherController.toBattleWeather() } : {}),
    };
    beginBattleEntrance(this, this.actions, event);
  }

  /** Draws a deliberately modest development stand-in without baking stateful content into the background. */
  private createInteractableObject(definition: ImageMapInteractableObject, bounds: InteractableRuntime["bounds"]): InteractableRuntime {
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    if (definition.presentation === "tower-core") {
      this.add.ellipse(x, y + bounds.height * 0.24, bounds.width * 1.12, bounds.height * 0.42, 0x4a4943, 1)
        .setStrokeStyle(2, 0x888071, 0.9).setDepth(920);
      const halo = this.add.circle(x, y - bounds.height * 0.04, Math.min(bounds.width, bounds.height) * 0.34, 0x88918d, 0.16).setDepth(921);
      const core = this.add.polygon(x, y - bounds.height * 0.04, [0, -26, 17, -8, 12, 22, -12, 22, -17, -8], 0x6b746e, 1)
        .setStrokeStyle(2, 0xb3aa96, 0.85).setDepth(922);
      this.tweens.add({ targets: halo, alpha: { from: 0.11, to: 0.28 }, scale: { from: 0.92, to: 1.08 }, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.tweens.add({ targets: core, y: core.y - 4, duration: 1500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      // The stone core is a tangible object: its bounds stay in OBJECT and become a StaticBody only when data asks for it.
      if (definition.blocking) {
        const blocker = this.add.rectangle(x, y, bounds.width, bounds.height, 0x000000, 0).setDepth(0);
        addStaticBody(this, blocker);
        this.physics.add.collider(this.player.body, blocker.body as Phaser.Physics.Arcade.StaticBody);
      }
      return { definition, bounds };
    }
    if (definition.blocking) {
      const blocker = this.add.rectangle(x, y, bounds.width, bounds.height, 0x000000, 0).setDepth(0);
      addStaticBody(this, blocker);
      this.physics.add.collider(this.player.body, blocker.body as Phaser.Physics.Arcade.StaticBody);
    }
    return { definition, bounds };
  }

  /**
   * 取得後に消える通常の宝箱。判定はOBJECTのboundsをそのまま使い、見た目は背景へ焼き込まず、
   * カタログに正式画像が無いためコードで描く共通の宝箱(systems/ChestTexture.ts)を重ねる。
   */
  private createChest(definition: ImageMapChestObject, bounds: ReturnType<typeof scaleRect>): ChestRuntime {
    const center = new Phaser.Math.Vector2(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    const bodyMarker = this.add.rectangle(center.x, center.y, bounds.width, bounds.height, 0x35b7d4, isDevMode ? 0.16 : 0);
    bodyMarker.setDepth(900);
    addStaticBody(this, bodyMarker);
    if (definition.blocking) this.physics.add.collider(this.player.body, bodyMarker.body as Phaser.Physics.Arcade.StaticBody);
    return { definition, bodyMarker, visual: createChestVisual(this, center, bounds) };
  }

  /** 宝箱の前で決定 → 中身を所持品へ足し、開封済みフラグを保存して宝箱を消す。開けたら true。 */
  private tryOpenChest(): boolean {
    if (this.transitioning || !this.dialogueBox) return false;
    const center = this.player.body.center;
    const chest = this.chests.find((candidate) => {
      const body = candidate.bodyMarker.body as Phaser.Physics.Arcade.StaticBody;
      return canInteract(center, this.player.facing, { x: body.x, y: body.y, width: body.width, height: body.height }, INTERACTION_REACH, INTERACTION_SPAN);
    });
    if (!chest) return false;
    const rewardMessage = chest.definition.itemId === undefined
      ? (() => {
          const jumpCoinCount = chest.definition.jumpCoinCount;
          if (jumpCoinCount === undefined) throw new Error(`${this.pkg.mapId} chest ${chest.definition.id} has no reward`);
          this.gameState.addJumpCoins(jumpCoinCount);
          return `ジャンコインを\n${jumpCoinCount}まい てにいれた！`;
        })()
      : (() => {
          const itemId = chest.definition.itemId;
          if (!Object.hasOwn(ITEM_DEFINITIONS, itemId)) {
            throw new Error(`${this.pkg.mapId} chest ${chest.definition.id} references an unknown item ${itemId}`);
          }
          if (!inventory.add(itemId as ItemId)) throw new Error(`${this.pkg.mapId} chest ${chest.definition.id} could not add ${itemId}`);
          return `${ITEM_DEFINITIONS[itemId as ItemId].name}を\nてにいれた！`;
        })();
    this.gameState.setFlag(chest.definition.openedFlag);
    chest.bodyMarker.destroy();
    chest.visual.destroy();
    this.chests = this.chests.filter((candidate) => candidate !== chest);
    this.player.body.setVelocity(0, 0);
    this.dialogueBox.open(["たからばこを　あけた！", rewardMessage]);
    return true;
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
    if (npc) {
      if (npc.definition.role === "priest") {
        this.player.body.setVelocity(0, 0);
        npc.stop();
        recordAdventureAtPriest(this.gameState, {
          mapId: this.pkg.mapId,
          sceneKey: MAPS[this.pkg.mapId].sceneKey,
          resume: { kind: "2d", x: this.player.visual.x, y: this.player.visual.y, facing: this.player.facing },
        });
        this.dialogueBox.open(PRIEST_RECORD_PAGES);
        return;
      }
      const cardBattle = npc.definition.jumpCardBattleId ? getJumpCardBattle(npc.definition.jumpCardBattleId) : undefined;
      if (cardBattle) {
        this.player.body.setVelocity(0, 0);
        npc.stop();
        if (!canStartJumpCardBattle(cardBattle, this.gameState.load().cards.obtainedJumpCards)) {
          this.dialogueBox.open(["プリンのカードを\nもっていないようだ。"]);
          return;
        }
        // The field keeps its exact position and all runtime state while the dedicated card screen is visible.
        // Lock first so inputs intended for the card screen cannot move the field on the resume frame.
        this.actions.setLocked(true);
        this.events.once(Phaser.Scenes.Events.RESUME, () => this.actions.setLocked(false));
        this.scene.launch("JumpCardBattleScene", { battleId: cardBattle.id, returnSceneKey: this.scene.key });
        this.scene.pause(this.scene.key);
        return;
      }
      const shop = getShop(npc.definition.id);
      if (shop && this.shopWindow) {
        this.player.body.setVelocity(0, 0);
        npc.stop();
        this.shopWindow.open(npc.definition.id, shop);
        return;
      }
      // 進行フラグ・仲間加入・一度きりNPCの退場・一枚絵・戦闘は、共通の会話後イベントとして処理する。
      const dialogue = getDialogue(npc.definition.dialogueId);
      if (!dialogue) return;
      // 会話開始時点の残存速度を確実に止める(次の物理stepを待たない)。
      this.player.body.setVelocity(0, 0);
      const after = dialogue.afterDialogue;
      this.afterDialogue = after ? () => this.handleAfterDialogue(after) : undefined;
      this.dialogueBox.open(dialogue.pages);
      return;
    }
    // 石像・石の壁・広場の石像(いしのまち)。手前にある最も近い1つだけを調べる。
    if (this.storyLayer?.tryInteract(center, this.player.facing)) return;
    const interactable = this.interactableObjects.find((candidate) =>
      canInteract(center, this.player.facing, candidate.bounds, INTERACTION_REACH, INTERACTION_SPAN)
    );
    if (!interactable) return;
    this.player.body.setVelocity(0, 0);
    this.dialogueBox.open([interactable.definition.message]);
  }

  /** 初回入場の語り(いしのまち)。フェードインを待ってから会話ウィンドウで出し、閉じたときに一度きりのフラグを保存する。 */
  private playEntryNarration(): void {
    const narration = this.pkg.entryNarration;
    if (!narration || !this.dialogueBox || this.gameState.hasFlag(narration.flag)
      || (narration.requiredFlag && !this.gameState.hasFlag(narration.requiredFlag))) return;
    this.scripted = true;
    this.player.body.setVelocity(0, 0);
    this.time.delayedCall(narration.delayMs, () => {
      this.scripted = false;
      this.dialogueBox?.open(narration.pages);
      this.afterDialogue = () => {
        this.gameState.setFlag(narration.flag);
        for (const flag of narration.thenFlags ?? []) this.gameState.setFlag(flag);
        if (narration.joinsPartyAs && partySystem.addMember(narration.joinsPartyAs)) this.partyFollowers.syncMembers();
      };
    });
  }

  /** Executes the shared, data-owned result of an NPC conversation. */
  private handleAfterDialogue(event: DialogueAfterEvent): void {
    if (isPartyJoinDialogueEvent(event)) {
      if (partySystem.addMember(event.memberId)) this.partyFollowers.syncMembers();
      return;
    }
    if (isStoryFlagsDialogueEvent(event)) {
      for (const flag of event.flags) this.gameState.setFlag(flag);
      return;
    }
    if (isNpcDepartDialogueEvent(event)) {
      this.beginNpcDeparture(event);
      return;
    }
    if (isPortraitInterludeDialogueEvent(event)) {
      this.playPortraitInterlude(event);
      return;
    }
    if (this.transitioning) return;
    this.transitioning = true;
    this.player.body.setVelocity(0, 0);
    beginBattleEntrance(this, this.actions, event);
  }

  /** The dialogue-completion departure used by story NPCs such as Mirei. */
  private beginNpcDeparture(event: NpcDepartDialogueEvent): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.actions.setLocked(true);
    const camera = this.cameras.main;
    camera.fadeOut(NPC_DEPART_FADE_MS, 0, 0, 0);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const npc = this.npcs.find((candidate) => candidate.definition.id === event.npcId);
      if (npc) {
        this.npcs = this.npcs.filter((candidate) => candidate !== npc);
        npc.destroy();
      }
      for (const flag of event.flags) this.gameState.setFlag(flag);
      if (event.joinsPartyAs && partySystem.addMember(event.joinsPartyAs)) this.partyFollowers.syncMembers();
      this.time.delayedCall(NPC_DEPART_HOLD_MS, () => {
        camera.fadeIn(NPC_DEPART_FADE_MS, 0, 0, 0);
        camera.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
          this.actions.setLocked(false);
          this.transitioning = false;
        });
      });
    });
  }

  /** A brief visual-only disturbance for first entry. No audio or external AI is involved. */
  private playFirstEntryGlitch(): void {
    const glitch = this.pkg.firstEntryGlitch;
    if (!glitch || this.gameState.hasFlag(glitch.entryFlag)) return;
    this.scripted = true;
    this.player.body.setVelocity(0, 0);
    this.time.delayedCall(90, () => {
      this.cameras.main.fadeOut(110, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        const noise = this.add.graphics().setScrollFactor(0).setDepth(2400);
        for (let index = 0; index < 18; index += 1) {
          noise.fillStyle(index % 3 === 0 ? 0xc8d0c8 : 0x59605c, 0.72);
          noise.fillRect(0, Math.random() * DISPLAY.height, DISPLAY.width, 1 + Math.random() * 5);
        }
        this.time.delayedCall(90, () => {
          noise.destroy();
          this.cameras.main.fadeIn(150, 0, 0, 0);
          this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
            this.gameState.setFlag(glitch.entryFlag);
            this.gameState.setFlag(glitch.discoveryFlag);
            this.scripted = false;
          });
        });
      });
    });
  }

  private handleEvent(event: ImageMapEvent): void {
    if ((event.once && this.consumedEventIds.has(event.id)) || (event.consumedFlag && this.gameState.hasFlag(event.consumedFlag))) return;
    this.consumedEventIds.add(event.id);
    const command = event.commands[0];
    if (command.type === "message") {
      const commit = (): void => {
        for (const flag of command.setFlags ?? []) this.gameState.setFlag(flag);
        if (event.consumedFlag) this.gameState.setFlag(event.consumedFlag);
        this.setNotice(command.text);
      };
      if (command.pages && this.dialogueBox) {
        this.player.body.setVelocity(0, 0);
        this.dialogueBox.open(command.pages);
        this.afterDialogue = commit;
      } else {
        commit();
      }
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
    const sceneKey = this.pkg.transferSceneOverrides?.[target.id] ?? target.sceneKey;
    beginMapTransition(this, this.actions, sceneKey, { spawnId: command.targetSpawnId }, MAP_TRANSITION_FADE_MS);
  }

  private setNotice(message: string): void {
    this.notice?.setText(message);
  }

  /**
   * 会話の区切りに、額縁つきの一枚絵を挟んでから続きの会話を開く(王がタロサの話をする場面など)。
   * 画像は初回だけ読み込み、以後はキャッシュ済みのテクスチャを使い回す。
   */
  private playPortraitInterlude(event: PortraitInterludeDialogueEvent): void {
    const openContinuation = (): void => {
      this.scripted = false;
      const portrait = this.showPortrait(event.portrait);
      this.dialogueBox?.open(event.continuationPages);
      this.afterDialogue = () => {
        this.hidePortrait(portrait);
        if (event.thenFlags) for (const flag of event.thenFlags) this.gameState.setFlag(flag);
      };
    };
    if (this.textures.exists(event.portrait.key)) {
      openContinuation();
      return;
    }
    this.scripted = true;
    this.load.image(event.portrait.key, event.portrait.path);
    this.load.once(Phaser.Loader.Events.COMPLETE, openContinuation);
    this.load.start();
  }

  private showPortrait(spec: PortraitInterludeDialogueEvent["portrait"]): Phaser.GameObjects.Container {
    const frameName = `${spec.key}.frame`;
    const texture = this.textures.get(spec.key);
    if (!texture.has(frameName)) {
      texture.add(frameName, 0, spec.crop.x, spec.crop.y, spec.crop.width, spec.crop.height);
    }
    texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const height = spec.displayHeight;
    const width = height * (spec.crop.width / spec.crop.height);
    const border = 2 * SCALE_FACTOR;
    const margin = 8 * SCALE_FACTOR;
    // DialogueBoxの上端より少し上に、額縁つきで置く(会話の邪魔をしない位置)。
    const bottom = DISPLAY.height - margin - 64 * SCALE_FACTOR - 4 * SCALE_FACTOR;
    const centerX = DISPLAY.width - margin - width / 2;
    const centerY = bottom - height / 2;
    const frame = this.add.rectangle(0, 0, width + border * 2, height + border * 2, 0x0a0a14, 1)
      .setStrokeStyle(border, 0xeeeeee);
    const image = this.add.image(0, 0, spec.key, frameName).setDisplaySize(width, height);
    const container = this.add.container(centerX + 12 * SCALE_FACTOR, centerY, [frame, image])
      .setScrollFactor(0)
      .setDepth(2400)
      .setAlpha(0);
    this.tweens.add({ targets: container, alpha: 1, x: centerX, duration: 240, ease: "Sine.easeOut" });
    return container;
  }

  private hidePortrait(container: Phaser.GameObjects.Container): void {
    this.tweens.add({
      targets: container,
      alpha: 0,
      duration: 240,
      ease: "Sine.easeIn",
      onComplete: () => container.destroy(),
    });
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
