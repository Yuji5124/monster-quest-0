import Phaser from "phaser";
import { INTERACTION_REACH, INTERACTION_SPAN } from "../config/interaction.ts";
import { MAPS, MAP_TRANSITION_FADE_MS, isNpcPresent } from "../config/maps.ts";
import { getDialogue } from "../data/dialogues.ts";
import { ITEM_DEFINITIONS } from "../data/items.ts";
import type { ItemId } from "../data/items.ts";
import type { DialogueAfterEvent, NpcDepartDialogueEvent } from "../events/BattleEventData.ts";
import { isBattleDialogueEvent, isNpcDepartDialogueEvent, isPartyJoinDialogueEvent, isStoryFlagsDialogueEvent } from "../events/BattleEventData.ts";
import { beginDialogueBattleEvent } from "../events/DialogueEvents.ts";
import { Npc } from "../entities/Npc.ts";
import { Player } from "../entities/Player.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { buildCollisionRects, createImageMapCollision, readCollisionMaskImageData } from "../systems/ImageMapCollision.ts";
import type { ImageMapCollisionRuntime } from "../systems/ImageMapCollision.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects, scaleRect } from "../systems/ImageMapData.ts";
import type { ImageMapChestObject, ImageMapEvent } from "../systems/ImageMapData.ts";
import { createChestVisual } from "../systems/ChestTexture.ts";
import { PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { TAROSA_SPRITE } from "../config/tarosaSprite.ts";
import { MIREI_SPRITE } from "../config/mireiSprite.ts";
import { VILLAGER_SPRITES } from "../config/villagerSprites.ts";
import { ensureWalkAnimations, preloadWalkSprite } from "../systems/CharacterWalkSprite.ts";
import { configureMapCamera } from "../systems/MapCamera.ts";
import { startFieldAmbience } from "../systems/FieldAmbience.ts";
import { startStartingTownPresentation } from "../systems/StartingTownPresentation.ts";
import { PartyFollowers } from "../systems/PartyFollowers.ts";
import { partySystem } from "../systems/PartySystem.ts";
import { GameStateRepository } from "../systems/GameStateRepository.ts";
import { PRIEST_RECORD_PAGES, PRIEST_RECOVERY_PAGES, recordAdventureAtPriest } from "../systems/PriestService.ts";
import { inventory } from "../systems/Inventory.ts";
import { canInteract } from "../systems/Interaction.ts";
import { beginMapTransition } from "../systems/MapTransition.ts";
import type { Facing } from "../systems/PlayerMovement.ts";
import { DialogueBox } from "../ui/DialogueBox.ts";
import { FieldMenu } from "../ui/FieldMenu.ts";
import { ShopWindow } from "../ui/ShopWindow.ts";
import { getShop } from "../config/shops.ts";

const MAP_ID = "map_02_starting_town";
const MANIFEST_KEY = "image-map.starting-town.manifest";
const BACKGROUND_KEY = "image-map.starting-town.background";
const COLLISION_KEY = "image-map.starting-town.collision";
const EVENTS_KEY = "image-map.starting-town.events";
const OBJECTS_KEY = "image-map.starting-town.objects";

const MANIFEST_PATH = new URL("../../assets/maps/starting_town/map.json", import.meta.url).toString();
const BACKGROUND_PATH = new URL("../../assets/maps/starting_town/background.png", import.meta.url).toString();
const COLLISION_PATH = new URL("../../assets/maps/starting_town/collision.png", import.meta.url).toString();
const EVENTS_PATH = new URL("../../assets/maps/starting_town/events.json", import.meta.url).toString();
const OBJECTS_PATH = new URL("../../assets/maps/starting_town/objects.json", import.meta.url).toString();

// TEMP_TEST_VALUE: おじいさんが去る時の暗転(暗くする→真っ暗のまま間を置く→明るく戻す)のミリ秒。
const NPC_DEPART_FADE_MS = 500;
const NPC_DEPART_HOLD_MS = 700;

const isDevMode = typeof import.meta.env !== "undefined" && import.meta.env.DEV;

interface ChestRuntime {
  readonly definition: ImageMapChestObject;
  readonly bodyMarker: Phaser.GameObjects.Rectangle;
  readonly visual: Phaser.GameObjects.Container;
}

export interface StartingTownSceneData {
  readonly spawnId?: string;
  /** Manual record coordinates use the already-scaled runtime map space. */
  readonly spawnX?: number;
  readonly spawnY?: number;
  readonly spawnFacing?: Facing;
  readonly battleEventReturn?: boolean;
  /** 通常戦闘で全滅した後、僧侶の前で回復会話を始める。 */
  readonly priestRecovery?: boolean;
}

/**
 * No.02「はじまりのまち」。StartingPlaceScene(No.01)と同じBACKGROUND/COLLISION/EVENT/OBJECT
 * 画像マップ方式をそのまま再利用する。建物の壁Collisionはcollision.png側で表現するため、
 * 旧DEV_PLACEHOLDER時代のBuilding entity(単色矩形+壁セグメント計算)は使用しない。
 * 建物へ入る入口判定は持たない(2026-09-24削除)。NPC/会話/パーティ加入/戦闘イベントは
 * 既存のPhase 7〜8-Bの実装をそのまま再利用する。
 */
export class StartingTownScene extends Phaser.Scene {
  private actions!: InputSystem;
  private player!: Player;
  private npcs: Npc[] = [];
  private collisionRuntime!: ImageMapCollisionRuntime;
  private dialogueBox!: DialogueBox;
  private fieldMenu!: FieldMenu;
  private shopWindow!: ShopWindow;
  private partyFollowers!: PartyFollowers;
  private notice?: Phaser.GameObjects.Text;
  private consumedEventIds = new Set<string>();
  private transitioning = false;
  private afterDialogueEvent: DialogueAfterEvent | undefined;
  private awaitBattleReturnRelease = false;
  private chests: ChestRuntime[] = [];
  private readonly gameState = new GameStateRepository();

  constructor(sceneKey = "StartingTownScene") {
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

  create(data?: StartingTownSceneData): void {
    this.transitioning = false;
    this.afterDialogueEvent = undefined;
    this.awaitBattleReturnRelease = data?.battleEventReturn === true;
    this.chests = [];
    this.consumedEventIds.clear();
    const manifest = readImageMapManifest(this.cache.json.get(MANIFEST_KEY));
    if (manifest.id !== MAP_ID || manifest.assetStatus !== "CURRENT") {
      throw new Error(`StartingTownScene requires the CURRENT ${MAP_ID} image-map package`);
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

    const map = MAPS[MAP_ID];
    // definition.position / movementはmaps.tsのネイティブ背景ピクセル座標なので、worldScaleを掛けた複製をNpcへ渡す。
    // 一度きりのイベントで去ったNPC(departedFlag保存済み)は最初から生成しない。
    const savedFlags = this.gameState.getFlags();
    this.npcs = map.npcs
      .filter((definition) => isNpcPresent(definition, savedFlags))
      .map((definition) => new Npc(this, scaleNpcDefinition(definition, worldScale)));

    const spawnId = data?.spawnId && map.spawns[data.spawnId] ? data.spawnId : Object.keys(map.spawns)[0];
    const native = map.spawns[spawnId];
    const hasExactSpawn = typeof data?.spawnX === "number" && typeof data?.spawnY === "number";
    const spawn = hasExactSpawn
      ? { x: data!.spawnX!, y: data!.spawnY!, facing: data?.spawnFacing ?? native.facing }
      : { x: native.x * worldScale, y: native.y * worldScale, facing: native.facing };
    ensureWalkAnimations(this, PROTAGONIST_SPRITE);
    this.player = new Player(this, spawn.x, spawn.y, spawn.facing);
    this.player.setDepth(1000);
    this.partyFollowers = new PartyFollowers(this, this.player);

    for (const body of this.collisionRuntime.bodies) this.physics.add.collider(this.player.body, body);
    for (const npc of this.npcs) {
      this.physics.add.collider(this.player.body, npc.body);
      // Fixed shopkeepers deliberately stand at their storefront markers, so
      // only moving residents need map-wall collision work every physics step.
      if (npc.definition.movement) {
        for (const body of this.collisionRuntime.bodies) this.physics.add.collider(npc.body, body);
      }
    }
    for (let index = 0; index < this.npcs.length; index += 1) {
      for (let other = index + 1; other < this.npcs.length; other += 1) {
        this.physics.add.collider(this.npcs[index].body, this.npcs[other].body);
      }
    }

    for (const object of objects) {
      const bounds = scaleRect(object, worldScale);
      if (object.type === "chest") {
        if (!savedFlags.has(object.openedFlag)) this.chests.push(this.createChest(object, bounds));
        continue;
      }
      const marker = this.add.rectangle(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, bounds.width, bounds.height, 0x35b7d4, 1);
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

    // 建物の入口判定は2026-09-24ユーザー指示で削除した(建物の中には入らない)。
    // 固定の村人がドアの真ん前に立ち、主人公はドア前の道から話しかける。

    // 会話ウィンドウは他の表示物の後に作り、常に最前面へ描画する。
    this.dialogueBox = new DialogueBox(this);
    this.fieldMenu = new FieldMenu(this, { onOpen: () => this.player.body.setVelocity(0, 0) });
    // やどや・ぶきや・どうぐやの店主は、話しかけると店の窓を開く。「はなす」で通常の会話へ移る。
    this.shopWindow = new ShopWindow(this, (npcId) => {
      const dialogue = getDialogue(MAPS[MAP_ID].npcs.find((npc) => npc.id === npcId)?.dialogueId ?? "");
      if (!dialogue) return;
      // ぶきやの店主の「はなす」は、初めて聞いた時だけ読み終えたあとに世界地図の解放を保存する。
      this.afterDialogueEvent = dialogue.afterDialogue;
      this.dialogueBox.open(dialogue.pages);
    });

    configureMapCamera(this, this.player.visual, { x: 0, y: 0, width: manifest.width * worldScale, height: manifest.height * worldScale });
    // 噴水・滝・川と店の日よけにだけ重ねるNo.02固有の表示層。背景／Collision／進行状態は変更しない。
    startStartingTownPresentation(this, worldScale, () => this.player.visual);
    // 雲の影・漂う粒などの環境エフェクト(config/fieldAmbience.ts)。見た目だけで、背景・判定・進行には触れない。
    startFieldAmbience(this, MAP_ID);
    this.cameras.main.setBackgroundColor("#101018");
    this.cameras.main.fadeIn(MAP_TRANSITION_FADE_MS, 0, 0, 0);

    if (isDevMode) {
      this.notice = this.add.text(20, 20, "はじまりのまち  D: Collision表示", {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "20px",
        stroke: "#121620",
        strokeThickness: 5,
      }).setScrollFactor(0).setDepth(2000);
    }

    this.actions = new InputSystem(window, document);
    if (data?.priestRecovery) {
      this.time.delayedCall(MAP_TRANSITION_FADE_MS + 50, () => {
        this.player.body.setVelocity(0, 0);
        this.dialogueBox.open(PRIEST_RECOVERY_PAGES);
      });
    }
    // 会話中は主人公を動かさず、決定入力はページ送り専用にする。
    // consumePressedは1フレームで1回だけ消費するため、「話しかけたZが1ページ目も飛ばす」
    // 「最終ページを閉じたZが即座に再度開始する」といった二重消費は起きない。
    const tick = (): void => {
      const confirmPressed = this.actions.consumePressed("confirm");
      if (this.awaitBattleReturnRelease) {
        if (!this.actions.isDown("confirm")) this.awaitBattleReturnRelease = false;
        return;
      }
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
      if (confirmPressed && !this.tryOpenChest()) this.tryStartDialogue();
    };
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, tick);
    const toggleCollision = (keyboardEvent: KeyboardEvent): void => {
      if (!isDevMode || keyboardEvent.code !== "KeyD" || keyboardEvent.repeat || keyboardEvent.ctrlKey || keyboardEvent.metaKey || keyboardEvent.altKey) return;
      this.collisionRuntime.setDebugVisible(!this.collisionRuntime.isDebugVisible());
      this.setNotice(`Collision: ${this.collisionRuntime.isDebugVisible() ? "ON" : "OFF"}  D: 表示切替`);
    };
    window.addEventListener("keydown", toggleCollision);

    const cleanup = (): void => {
      this.actions.destroy();
      window.removeEventListener("keydown", toggleCollision);
      this.events.off(Phaser.Scenes.Events.PRE_UPDATE, tick);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    if (isDevMode) {
      (window as unknown as { __startingTown?: unknown }).__startingTown = {
        scene: this,
        player: this.player,
        collisionRectCount: collisionRects.length,
        setCollisionVisible: (visible: boolean): void => this.collisionRuntime.setDebugVisible(visible),
      };
      // eslint-disable-next-line no-console
      console.log(`[IMAGE_MAP] ${manifest.id} loaded: ${manifest.width}x${manifest.height}, collisionRects=${collisionRects.length}`);
    }
  }

  /** OBJECTの座標・判定を共有し、開封済みなら次回以降は表示しない通常の宝箱。 */
  private createChest(definition: ImageMapChestObject, bounds: ReturnType<typeof scaleRect>): ChestRuntime {
    const center = new Phaser.Math.Vector2(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    const bodyMarker = this.add.rectangle(center.x, center.y, bounds.width, bounds.height, 0x35b7d4, isDevMode ? 0.16 : 0);
    bodyMarker.setDepth(900);
    addStaticBody(this, bodyMarker);
    if (definition.blocking) this.physics.add.collider(this.player.body, bodyMarker.body as Phaser.Physics.Arcade.StaticBody);
    return { definition, bodyMarker, visual: createChestVisual(this, center, bounds) };
  }

  /** 宝箱の前で決定すると中身を保存し、開封済みの宝箱を消す。 */
  private tryOpenChest(): boolean {
    const center = this.player.body.center;
    const chest = this.chests.find((candidate) => {
      const body = candidate.bodyMarker.body as Phaser.Physics.Arcade.StaticBody;
      return canInteract(center, this.player.facing, { x: body.x, y: body.y, width: body.width, height: body.height }, INTERACTION_REACH, INTERACTION_SPAN);
    });
    if (!chest) return false;
    const itemId = chest.definition.itemId;
    if (!itemId || !Object.hasOwn(ITEM_DEFINITIONS, itemId)) {
      throw new Error(`StartingTownScene chest ${chest.definition.id} must reference a known item`);
    }
    if (!inventory.add(itemId as ItemId)) {
      throw new Error(`StartingTownScene chest ${chest.definition.id} could not add ${itemId}`);
    }
    this.gameState.setFlag(chest.definition.openedFlag);
    chest.bodyMarker.destroy();
    chest.visual.destroy();
    this.chests = this.chests.filter((candidate) => candidate !== chest);
    this.player.body.setVelocity(0, 0);
    this.dialogueBox.open(["たからばこを　あけた！", `${ITEM_DEFINITIONS[itemId as ItemId].name}を\nてにいれた！`]);
    return true;
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
    // 会話開始時点の残存速度を確実に止める(次の物理stepを待たない)。
    this.player.body.setVelocity(0, 0);
    npc.stop();
    this.afterDialogueEvent = dialogue.afterDialogue;
    this.dialogueBox.open(dialogue.pages);
  }

  private handleAfterDialogue(): void {
    const event = this.afterDialogueEvent;
    this.afterDialogueEvent = undefined;
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
    if (!isBattleDialogueEvent(event) || this.transitioning) return;
    this.transitioning = true;
    beginDialogueBattleEvent(this, this.actions, event);
  }

  /**
   * 会話を読み終えたNPCが去る一度きりのイベント: 暗転 → 真っ暗な間にNPCを消してフラグを保存 → 明転。
   * 明転後はそのNPCが最初からいない状態(次回以降の入場でもdepartedFlagで生成されない)と同じになる。
   */
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

function scaleNpcDefinition(definition: (typeof MAPS)[typeof MAP_ID]["npcs"][number], worldScale: number) {
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
