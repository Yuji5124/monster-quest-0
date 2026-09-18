import Phaser from "phaser";
import { DISPLAY } from "../config/display.ts";
import { INTERACTION_REACH, INTERACTION_SPAN } from "../config/interaction.ts";
import { MAPS, MAP_TRANSITION_FADE_MS } from "../config/maps.ts";
import type { BuildingDefinition, MapExitTrigger } from "../config/maps.ts";
import { STARTING_TOWN_PLACEHOLDER } from "../config/startingTown.ts";
import { DIALOGUES } from "../data/dialogues.ts";
import type { DialogueAfterEvent } from "../events/BattleEventData.ts";
import { isBattleDialogueEvent } from "../events/BattleEventData.ts";
import { beginDialogueBattleEvent } from "../events/DialogueEvents.ts";
import { Building } from "../entities/Building.ts";
import { Npc } from "../entities/Npc.ts";
import { Player } from "../entities/Player.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { canInteract } from "../systems/Interaction.ts";
import { beginConfiguredMapExitTransition, beginMapTransition, createExitZone } from "../systems/MapTransition.ts";
import { DialogueBox } from "../ui/DialogueBox.ts";

const MAP_ID = "map_02_starting_town";

/**
 * No.02「はじまりのまち」。Phase 6でNo.01との往復、Phase 7で会話システム、
 * Phase 8-Aで町の外観(建物6棟の外観+Collision、NPC再配置)、
 * Phase 8-Bで建物入口からInteriorSceneへの出入りを追加した。
 * 店・宿泊・教会機能、正式NPC・正式台詞はPhase 8-B以降(今回は入口の出入りのみ)。
 */
export class StartingTownScene extends Phaser.Scene {
  private actions!: InputSystem;
  private player!: Player;
  private npcs: Npc[] = [];
  private buildings: Building[] = [];
  private dialogueBox!: DialogueBox;
  private transitioning = false;
  private afterDialogueEvent: DialogueAfterEvent | undefined;
  private awaitBattleReturnRelease = false;

  constructor() {
    // PhysicsはこのSceneだけで有効化する。既存Boot / Title / 異常演出には追加しない。
    super({ key: "StartingTownScene", physics: { arcade: { gravity: { x: 0, y: 0 } } } });
  }

  create(data?: { spawnId?: string; battleEventReturn?: boolean }): void {
    this.transitioning = false;
    this.afterDialogueEvent = undefined;
    this.awaitBattleReturnRelease = data?.battleEventReturn === true;
    const map = MAPS[MAP_ID];

    this.cameras.main.setBackgroundColor(STARTING_TOWN_PLACEHOLDER.groundColor);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.fadeIn(MAP_TRANSITION_FADE_MS, 0, 0, 0);

    this.physics.world.setBounds(0, 0, DISPLAY.width, DISPLAY.height);

    // 建物・NPCを先に描画し、主人公を最後に重ねる(手前に見えるようにする)。
    this.buildings = map.buildings.map((definition) => new Building(this, definition));
    this.npcs = map.npcs.map((definition) => new Npc(this, definition));

    const spawnId = data?.spawnId && map.spawns[data.spawnId] ? data.spawnId : Object.keys(map.spawns)[0];
    const spawn = map.spawns[spawnId];
    this.player = new Player(this, spawn.x, spawn.y, spawn.facing);

    for (const building of this.buildings) this.physics.add.collider(this.player.body, building.wallGroup);
    for (const npc of this.npcs) this.physics.add.collider(this.player.body, npc.body);

    for (const exit of map.exits) {
      const zoneBody = createExitZone(this, exit.bounds);
      this.physics.add.overlap(this.player.body, zoneBody, () => this.handleExit(exit));
    }

    // 入口(door)は建物ごとのDEV_PLACEHOLDER_INTERIOR_PENDING解消: interiorIdがある建物だけ
    // InteriorSceneへの遷移トリガーを重ねる。壁のCollisionはドアの帯を除外済み(Building参照)。
    for (const building of map.buildings) {
      if (!building.interiorId) continue;
      const doorZoneBody = createExitZone(this, building.door);
      this.physics.add.overlap(this.player.body, doorZoneBody, () => this.handleEnterBuilding(building));
    }

    // 会話ウィンドウは他の表示物の後に作り、常に最前面へ描画する。
    this.dialogueBox = new DialogueBox(this);

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
      this.player.update(this.actions);
      if (confirmPressed) this.tryStartDialogue();
    };
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, tick);

    const cleanup = (): void => {
      this.actions.destroy();
      this.events.off(Phaser.Scenes.Events.PRE_UPDATE, tick);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
    // 建物内部・店機能・宝箱・戦闘・セーブ・音はPhase 8-Aでは実装しない(Phase 8-B以降)。
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
    const dialogue = DIALOGUES[npc.definition.dialogueId];
    // 会話開始時点の残存速度を確実に止める(次の物理stepを待たない)。
    this.player.body.setVelocity(0, 0);
    this.afterDialogueEvent = dialogue.afterDialogue;
    this.dialogueBox.open(dialogue.pages);
  }

  private handleAfterDialogue(): void {
    const event = this.afterDialogueEvent;
    this.afterDialogueEvent = undefined;
    if (!isBattleDialogueEvent(event) || this.transitioning) return;
    this.transitioning = true;
    beginDialogueBattleEvent(this, this.actions, event, MAP_TRANSITION_FADE_MS);
  }

  private handleExit(exit: MapExitTrigger): void {
    // 出口領域に立ち続けても二重遷移しないようにする。
    if (this.transitioning) return;
    this.transitioning = true;
    beginConfiguredMapExitTransition(this, this.actions, exit, MAP_TRANSITION_FADE_MS);
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
}
