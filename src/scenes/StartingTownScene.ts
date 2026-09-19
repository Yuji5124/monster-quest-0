import Phaser from "phaser";
import { INTERACTION_REACH, INTERACTION_SPAN } from "../config/interaction.ts";
import { MAPS, MAP_TRANSITION_FADE_MS } from "../config/maps.ts";
import type { BuildingDefinition } from "../config/maps.ts";
import { getDialogue } from "../data/dialogues.ts";
import type { DialogueAfterEvent } from "../events/BattleEventData.ts";
import { isBattleDialogueEvent, isPartyJoinDialogueEvent } from "../events/BattleEventData.ts";
import { beginDialogueBattleEvent } from "../events/DialogueEvents.ts";
import { Npc } from "../entities/Npc.ts";
import { Player } from "../entities/Player.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { buildCollisionRects, createImageMapCollision, readCollisionMaskImageData } from "../systems/ImageMapCollision.ts";
import type { ImageMapCollisionRuntime } from "../systems/ImageMapCollision.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects, scaleRect } from "../systems/ImageMapData.ts";
import type { ImageMapEvent } from "../systems/ImageMapData.ts";
import { PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { TAROSA_SPRITE } from "../config/tarosaSprite.ts";
import { MIREI_SPRITE } from "../config/mireiSprite.ts";
import { ensureWalkAnimations, preloadWalkSprite } from "../systems/CharacterWalkSprite.ts";
import { configureMapCamera } from "../systems/MapCamera.ts";
import { PartyFollowers } from "../systems/PartyFollowers.ts";
import { partySystem } from "../systems/PartySystem.ts";
import { canInteract } from "../systems/Interaction.ts";
import { beginMapTransition, createExitZone } from "../systems/MapTransition.ts";
import { DialogueBox } from "../ui/DialogueBox.ts";
import { FieldMenu } from "../ui/FieldMenu.ts";

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

const isDevMode = typeof import.meta.env !== "undefined" && import.meta.env.DEV;

export interface StartingTownSceneData {
  readonly spawnId?: string;
  readonly battleEventReturn?: boolean;
}

/**
 * No.02「はじまりのまち」。StartingPlaceScene(No.01)と同じBACKGROUND/COLLISION/EVENT/OBJECT
 * 画像マップ方式をそのまま再利用する。建物の壁Collisionはcollision.png側で表現するため、
 * 旧DEV_PLACEHOLDER時代のBuilding entity(単色矩形+壁セグメント計算)は使用しない。
 * 建物のドア判定(interiorIdがある建物だけInteriorSceneへ遷移)、NPC/会話/パーティ加入/戦闘イベントは
 * 既存のPhase 7〜8-Bの実装をそのまま再利用する。
 */
export class StartingTownScene extends Phaser.Scene {
  private actions!: InputSystem;
  private player!: Player;
  private npcs: Npc[] = [];
  private collisionRuntime!: ImageMapCollisionRuntime;
  private dialogueBox!: DialogueBox;
  private fieldMenu!: FieldMenu;
  private partyFollowers!: PartyFollowers;
  private notice?: Phaser.GameObjects.Text;
  private consumedEventIds = new Set<string>();
  private transitioning = false;
  private afterDialogueEvent: DialogueAfterEvent | undefined;
  private awaitBattleReturnRelease = false;

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
  }

  create(data?: StartingTownSceneData): void {
    this.transitioning = false;
    this.afterDialogueEvent = undefined;
    this.awaitBattleReturnRelease = data?.battleEventReturn === true;
    this.consumedEventIds.clear();
    const manifest = readImageMapManifest(this.cache.json.get(MANIFEST_KEY));
    if (manifest.id !== MAP_ID || manifest.assetStatus !== "CURRENT") {
      throw new Error(`StartingTownScene requires the CURRENT ${MAP_ID} image-map package`);
    }
    const events = readImageMapEvents(this.cache.json.get(EVENTS_KEY));
    // objects.jsonは現状空。No.02のNPCは会話/パーティ加入/戦闘イベントを持つためMAPS.npcs経由のまま。
    readImageMapObjects(this.cache.json.get(OBJECTS_KEY));
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
    // 建物・NPCを先に描画し、主人公を最後に重ねる(手前に見えるようにする)。
    // definition.positionはmaps.tsのネイティブ背景ピクセル座標なので、worldScaleを掛けた複製をNpcへ渡す。
    this.npcs = map.npcs.map((definition) => new Npc(this, {
      ...definition,
      position: { x: definition.position.x * worldScale, y: definition.position.y * worldScale },
    }));

    const spawnId = data?.spawnId && map.spawns[data.spawnId] ? data.spawnId : Object.keys(map.spawns)[0];
    const spawn = map.spawns[spawnId];
    ensureWalkAnimations(this, PROTAGONIST_SPRITE);
    this.player = new Player(this, spawn.x * worldScale, spawn.y * worldScale, spawn.facing);
    this.player.setDepth(1000);
    this.partyFollowers = new PartyFollowers(this, this.player);

    for (const body of this.collisionRuntime.bodies) this.physics.add.collider(this.player.body, body);
    for (const npc of this.npcs) this.physics.add.collider(this.player.body, npc.body);

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

    // 入口(door)はinteriorIdがある建物だけInteriorSceneへの遷移トリガーを重ねる。
    // 壁のCollisionはcollision.png側(ドアの帯だけ通行可能)で表現済み。building.doorもネイティブ座標なので
    // worldScaleを掛けてからExit Zoneを作る。
    for (const building of map.buildings) {
      if (!building.interiorId) continue;
      const doorZoneBody = createExitZone(this, scaleRect(building.door, worldScale));
      this.physics.add.overlap(this.player.body, doorZoneBody, () => this.handleEnterBuilding(building));
    }

    // 会話ウィンドウは他の表示物の後に作り、常に最前面へ描画する。
    this.dialogueBox = new DialogueBox(this);
    this.fieldMenu = new FieldMenu(this);

    configureMapCamera(this, this.player.visual, { x: 0, y: 0, width: manifest.width * worldScale, height: manifest.height * worldScale });
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
      if (this.fieldMenu.isOpen) {
        this.fieldMenu.handleInput(this.actions);
        return;
      }
      if (!this.transitioning && this.actions.consumePressed("menu")) {
        this.fieldMenu.open();
        return;
      }
      this.player.update(this.actions);
      if (confirmPressed) this.tryStartDialogue();
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
    const dialogue = getDialogue(npc.definition.dialogueId);
    if (!dialogue) return;
    // 会話開始時点の残存速度を確実に止める(次の物理stepを待たない)。
    this.player.body.setVelocity(0, 0);
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
    if (!isBattleDialogueEvent(event) || this.transitioning) return;
    this.transitioning = true;
    beginDialogueBattleEvent(this, this.actions, event);
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

  private handleEnterBuilding(building: BuildingDefinition): void {
    // 入口領域に立ち続けても二重遷移しないようにする。
    if (this.transitioning || !building.interiorId) return;
    this.transitioning = true;
    beginMapTransition(
      this, this.actions, "InteriorScene",
      { interiorId: building.interiorId, returnSpawnId: building.frontSpawnId },
      MAP_TRANSITION_FADE_MS,
    );
  }

  private setNotice(message: string): void {
    this.notice?.setText(message);
  }
}

function addStaticBody(scene: Phaser.Scene, object: Phaser.GameObjects.Rectangle): void {
  scene.physics.add.existing(object, true);
}
