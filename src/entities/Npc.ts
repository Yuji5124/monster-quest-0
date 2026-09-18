import Phaser from "phaser";
import { NPC_VISUAL } from "../config/npc.ts";
import type { NpcDefinition } from "../config/maps.ts";

/** 会話可能なNPCの表示・当たり判定。外見はDEV_PLACEHOLDERのRectangleで、正式素材ではない。 */
export class Npc {
  readonly definition: NpcDefinition;
  readonly visual: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.StaticBody;

  constructor(scene: Phaser.Scene, definition: NpcDefinition) {
    this.definition = definition;
    this.visual = scene.add.rectangle(
      definition.position.x, definition.position.y, NPC_VISUAL.width, NPC_VISUAL.height, NPC_VISUAL.color,
    );
    scene.physics.add.existing(this.visual, true);
    this.body = this.visual.body as Phaser.Physics.Arcade.StaticBody;
  }
}
