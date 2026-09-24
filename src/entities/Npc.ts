import Phaser from "phaser";
import { idleFrame, bodyOffset } from "../config/characterWalkSprite.ts";
import { NPC_VISUAL } from "../config/npc.ts";
import { PLAYER } from "../config/player.ts";
import { VILLAGER_SPRITES } from "../config/villagerSprites.ts";
import type { NpcDefinition } from "../config/maps.ts";
import { ensureWalkAnimations, walkAnimKey } from "../systems/CharacterWalkSprite.ts";
import type { Facing } from "../systems/PlayerMovement.ts";

type NpcVisual = Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;

/** A conversation target with an optional data-driven sprite and local wandering behaviour. */
export class Npc {
  readonly definition: NpcDefinition;
  readonly visual: NpcVisual;
  readonly body: Phaser.Physics.Arcade.Body;

  private readonly spawnX: number;
  private readonly spawnY: number;
  private readonly movement: NpcDefinition["movement"];
  private facing: Facing;
  private nextDecisionAt = 0;
  private target?: Phaser.Math.Vector2;

  constructor(scene: Phaser.Scene, definition: NpcDefinition) {
    this.definition = definition;
    this.spawnX = definition.position.x;
    this.spawnY = definition.position.y;
    this.movement = definition.movement;
    this.facing = definition.facing;

    const geometry = definition.spriteId ? VILLAGER_SPRITES[definition.spriteId] : undefined;
    if (geometry) {
      ensureWalkAnimations(scene, geometry);
      this.visual = scene.add.sprite(definition.position.x, definition.position.y, geometry.key, idleFrame(this.facing));
    } else {
      // Legacy maps can keep their placeholder dialogue NPCs until their own
      // formal art and placement pass; No.02 always provides a villager sprite.
      this.visual = scene.add.rectangle(
        definition.position.x, definition.position.y, NPC_VISUAL.width, NPC_VISUAL.height, NPC_VISUAL.color,
      );
    }

    scene.physics.add.existing(this.visual);
    this.body = this.visual.body as Phaser.Physics.Arcade.Body;
    if (geometry) {
      // Villagers use the same small foot collision as the player. Their
      // painted silhouette is much larger than a doorway or plaza gap.
      const offset = bodyOffset(geometry, PLAYER.width, PLAYER.height);
      this.body.setSize(PLAYER.width, PLAYER.height, false);
      this.body.setOffset(offset.x, offset.y);
    }
    this.body.setCollideWorldBounds(true);
    this.body.setImmovable(!this.movement);
    this.syncDepth();
  }

  /** Advance a wandering resident. Fixed shopkeepers intentionally do nothing here. */
  update(time: number): void {
    if (!this.movement) return;

    if (!this.target && time >= this.nextDecisionAt) this.chooseTarget(time);
    if (!this.target) return;

    const dx = this.target.x - this.body.center.x;
    const dy = this.target.y - this.body.center.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 3) {
      this.body.setVelocity(0, 0);
      this.target = undefined;
      this.nextDecisionAt = time + Phaser.Math.Between(this.movement.minPauseMs, this.movement.maxPauseMs);
      this.setIdle();
      return;
    }

    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
    this.body.setVelocity(dx / distance * this.movement.speed, dy / distance * this.movement.speed);
    if (this.visual instanceof Phaser.GameObjects.Sprite && this.definition.spriteId) {
      this.visual.play(walkAnimKey(VILLAGER_SPRITES[this.definition.spriteId], this.facing), true);
    }
    this.syncDepth();
  }

  stop(): void {
    this.body.setVelocity(0, 0);
    this.target = undefined;
    this.setIdle();
  }

  private chooseTarget(time: number): void {
    if (!this.movement) return;
    // A disc keeps a villager visibly tied to its red placement point instead
    // of crossing the whole town. Phaser's RNG supplies harmless visual variety.
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Math.sqrt(Phaser.Math.FloatBetween(0.18, 1)) * this.movement.radius;
    this.target = new Phaser.Math.Vector2(
      this.spawnX + Math.cos(angle) * distance,
      this.spawnY + Math.sin(angle) * distance,
    );
    this.nextDecisionAt = time + 4000;
  }

  private setIdle(): void {
    if (this.visual instanceof Phaser.GameObjects.Sprite) {
      this.visual.anims.stop();
      this.visual.setFrame(idleFrame(this.facing));
    }
    this.syncDepth();
  }

  private syncDepth(): void {
    this.visual.setDepth(950 + this.body.bottom * 0.01);
  }
}
