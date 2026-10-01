import Phaser from "phaser";
import { MAPS, MAP_TRANSITION_FADE_MS } from "../config/maps.ts";
import { Player } from "../entities/Player.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { buildCollisionRects, createImageMapCollision, readCollisionMaskImageData } from "../systems/ImageMapCollision.ts";
import type { ImageMapCollisionRuntime } from "../systems/ImageMapCollision.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects, scaleRect } from "../systems/ImageMapData.ts";
import type { ImageMapEvent } from "../systems/ImageMapData.ts";
import { configureMapCamera } from "../systems/MapCamera.ts";
import { startFieldAmbience } from "../systems/FieldAmbience.ts";
import { beginMapTransition } from "../systems/MapTransition.ts";
import { PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { TAROSA_SPRITE } from "../config/tarosaSprite.ts";
import { MIREI_SPRITE } from "../config/mireiSprite.ts";
import { ensureWalkAnimations, preloadWalkSprite } from "../systems/CharacterWalkSprite.ts";
import { PartyFollowers } from "../systems/PartyFollowers.ts";
import { FieldMenu } from "../ui/FieldMenu.ts";
import { BIE_VILLAGE_ANOMALY, BIE_VILLAGER_GLITCH } from "../config/bieVillageAnomaly.ts";
import { startMapAnomalyAmbience } from "../systems/MapAnomalyAmbience.ts";
import { INTERACTION_REACH, INTERACTION_SPAN } from "../config/interaction.ts";
import { VILLAGER_SPRITES } from "../config/villagerSprites.ts";
import { getDialogue } from "../data/dialogues.ts";
import { Npc } from "../entities/Npc.ts";
import type { NpcDefinition } from "../config/maps.ts";
import { getShop } from "../config/shops.ts";
import { isStoryFlagsDialogueEvent } from "../events/BattleEventData.ts";
import type { DialogueAfterEvent } from "../events/BattleEventData.ts";
import { GameStateRepository } from "../systems/GameStateRepository.ts";
import { PRIEST_RECORD_PAGES, PRIEST_RECOVERY_PAGES, recordAdventureAtPriest } from "../systems/PriestService.ts";
import { canInteract } from "../systems/Interaction.ts";
import { startVillagerGlitch } from "../systems/VillagerGlitch.ts";
import { DialogueBox } from "../ui/DialogueBox.ts";
import { ShopWindow } from "../ui/ShopWindow.ts";
import type { Facing } from "../systems/PlayerMovement.ts";

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
  readonly spawnX?: number;
  readonly spawnY?: number;
  readonly spawnFacing?: Facing;
  /** 通常戦闘で全滅した後、僧侶の前で回復会話を始める。 */
  readonly priestRecovery?: boolean;
}

/**
 * No.04「ビーエのむら」(内部IDは旧No.03由来)。背景はビーエのむら更新.png、collision.pngはtools/build_bie_village_collision.pyが生成する。
 * ビーエのもりから続く地域の異変として、背景の一部が一瞬だけ乱れる小さな異変(config/bieVillageAnomaly.ts)を常時重ねる。
 * StartingPlaceScene(No.01)と同じBACKGROUND/COLLISION/EVENT/OBJECT
 * 画像マップ方式をそのまま再利用する。村人6人と、旅の記録を受け持つ僧侶1人（MAPS.npcs）を持つ。
 * 会話初稿、村人の小さなバグり(config/bieVillageAnomaly.tsのBIE_VILLAGER_GLITCH)を持つ。固定4人のうち3人は
 * config/shops.tsのやどや・ぶきや・どうぐや(No.02と同じShopWindow)を兼業し、残り1人(となりの人)は
 * 木こり失踪の手掛かりを持つため通常会話のまま(2026-09-27)。
 * 木こり救出イベント・正式台詞・ランダムエンカウントは未実装(docs/NPC/02_bie_no_mura.md)。
 */
export class BieVillageScene extends Phaser.Scene {
  private actions!: InputSystem;
  private player!: Player;
  private collisionRuntime!: ImageMapCollisionRuntime;
  private fieldMenu!: FieldMenu;
  private dialogueBox!: DialogueBox;
  private shopWindow!: ShopWindow;
  private afterDialogueEvent: DialogueAfterEvent | undefined;
  private readonly gameState = new GameStateRepository();
  private npcs: Npc[] = [];
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
    for (const npc of MAPS[MAP_ID].npcs) {
      if (npc.spriteId) preloadWalkSprite(this, VILLAGER_SPRITES[npc.spriteId]);
    }
  }

  create(data?: BieVillageSceneData): void {
    this.transitioning = false;
    this.afterDialogueEvent = undefined;
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
    // 小さな異変(チリチリ・横ずれ・マップチップ化け)。背景の上・キャラクターの下に重なり、判定や進行には触れない。
    const anomaly = startMapAnomalyAmbience(this, BACKGROUND_KEY, worldScale, manifest, BIE_VILLAGE_ANOMALY);

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
    // definition.position / movementはネイティブ背景ピクセルなので、worldScaleを掛けた複製をNpcへ渡す(No.02と同じ)。
    this.npcs = mapConfig.npcs.map((definition) => new Npc(this, scaleNpcDefinition(definition, worldScale)));
    const native = mapConfig.spawns[data?.spawnId ?? "fromWorldMap"] ?? mapConfig.spawns.fromWorldMap;
    const hasExactSpawn = typeof data?.spawnX === "number" && typeof data?.spawnY === "number";
    const spawn = hasExactSpawn
      ? { x: data!.spawnX!, y: data!.spawnY!, facing: data?.spawnFacing ?? native.facing }
      : { x: native.x * worldScale, y: native.y * worldScale, facing: native.facing };
    ensureWalkAnimations(this, PROTAGONIST_SPRITE);
    this.player = new Player(this, spawn.x, spawn.y, spawn.facing);
    this.player.setDepth(1000);
    // 加入済みの仲間(タロサ・ミレイ)は、他の画像マップと同じく主人公の軌跡を辿って付いてくる。
    new PartyFollowers(this, this.player);
    for (const body of this.collisionRuntime.bodies) this.physics.add.collider(this.player.body, body);
    for (const npc of this.npcs) {
      this.physics.add.collider(this.player.body, npc.body);
      // 固定の村人はドア前に立ったまま動かないため、壁との判定は歩く村人だけに付ける。
      if (npc.definition.movement) {
        for (const body of this.collisionRuntime.bodies) this.physics.add.collider(npc.body, body);
      }
    }
    for (let index = 0; index < this.npcs.length; index += 1) {
      for (let other = index + 1; other < this.npcs.length; other += 1) {
        this.physics.add.collider(this.npcs[index].body, this.npcs[other].body);
      }
    }
    // 村人の小さなバグり。見た目だけで、会話・判定・移動には触れない。
    const villagerSprites = this.npcs
      .map((npc) => npc.visual)
      .filter((visual): visual is Phaser.GameObjects.Sprite => visual instanceof Phaser.GameObjects.Sprite);
    const villagerGlitch = startVillagerGlitch(this, villagerSprites, worldScale, BIE_VILLAGER_GLITCH);

    // Objectの判定は背景と別レイヤーに保つ(No.01と同じ)。村人はMAPS.npcsで管理する。
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
    // 雲の影・漂う粒などの環境エフェクト(config/fieldAmbience.ts)。見た目だけで、背景・判定・進行には触れない。
    startFieldAmbience(this, MAP_ID);
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

    // 会話ウィンドウは他の表示物の後に作り、常に最前面へ描画する。
    this.dialogueBox = new DialogueBox(this);
    // 水車小屋・北東の家・店先の日よけの3人は店番(config/shops.ts)。「はなす」で選ぶと、はじまりのまちの
    // 店主と同じくこのNPCのdialogueIdをそのまま読む(会話後イベントの扱いも同じhandleAfterDialogueを使う)。
    this.shopWindow = new ShopWindow(this, (npcId) => {
      const dialogue = getDialogue(MAPS[MAP_ID].npcs.find((npc) => npc.id === npcId)?.dialogueId ?? "");
      if (!dialogue) return;
      this.afterDialogueEvent = dialogue.afterDialogue;
      this.dialogueBox.open(dialogue.pages);
    });
    this.fieldMenu = new FieldMenu(this, { onOpen: () => this.player.body.setVelocity(0, 0) });
    this.actions = new InputSystem(window, document);
    if (data?.priestRecovery) {
      this.time.delayedCall(MAP_TRANSITION_FADE_MS + 50, () => {
        this.player.body.setVelocity(0, 0);
        this.dialogueBox.open(PRIEST_RECOVERY_PAGES);
      });
    }
    const movePlayer = (): void => {
      const confirmPressed = this.actions.consumePressed("confirm");
      if (this.dialogueBox.isOpen) {
        if (confirmPressed && this.dialogueBox.advance()) this.handleAfterDialogue();
        return;
      }
      if (this.shopWindow.isOpen) {
        this.shopWindow.handleInput(this.actions, confirmPressed);
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
      for (const npc of this.npcs) npc.update(this.time.now);
      this.player.update(this.actions);
      if (confirmPressed) this.tryStartDialogue();
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
        anomaly,
        villagerGlitch,
        setCollisionVisible: (visible: boolean): void => this.collisionRuntime.setDebugVisible(visible),
      };
      // eslint-disable-next-line no-console
      console.log(`[IMAGE_MAP] ${manifest.id} loaded: ${manifest.width}x${manifest.height}, collisionRects=${collisionRects.length}`);
    }
  }

  private tryStartDialogue(): void {
    if (this.transitioning) return;
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
    if (npc.definition.role === "priest") {
      this.player.body.setVelocity(0, 0);
      npc.stop();
      recordAdventureAtPriest(this.gameState, {
        mapId: MAP_ID,
        sceneKey: MAPS[MAP_ID].sceneKey,
        resume: { kind: "2d", x: this.player.visual.x, y: this.player.visual.y, facing: this.player.facing },
      });
      this.dialogueBox.open(PRIEST_RECORD_PAGES);
      return;
    }
    const shop = getShop(npc.definition.id);
    if (shop) {
      this.player.body.setVelocity(0, 0);
      npc.stop();
      this.shopWindow.open(npc.definition.id, shop);
      return;
    }
    const dialogue = getDialogue(npc.definition.dialogueId);
    if (!dialogue) return;
    this.player.body.setVelocity(0, 0);
    npc.stop();
    this.afterDialogueEvent = dialogue.afterDialogue;
    this.dialogueBox.open(dialogue.pages);
  }

  /** 会話を最後まで読み終えた時点で、世界地図の解放など一度きりの進行フラグを保存する(No.02ぶきやと同じ)。 */
  private handleAfterDialogue(): void {
    const event = this.afterDialogueEvent;
    this.afterDialogueEvent = undefined;
    if (isStoryFlagsDialogueEvent(event)) {
      for (const flag of event.flags) this.gameState.setFlag(flag);
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

function scaleNpcDefinition(definition: NpcDefinition, worldScale: number): NpcDefinition {
  return {
    ...definition,
    position: { x: definition.position.x * worldScale, y: definition.position.y * worldScale },
    movement: definition.movement && {
      ...definition.movement,
      radius: definition.movement.radius * worldScale,
      speed: definition.movement.speed * worldScale,
    },
  };
}

function addStaticBody(scene: Phaser.Scene, object: Phaser.GameObjects.Rectangle): void {
  scene.physics.add.existing(object, true);
}
