import Phaser from "phaser";
import { PLAYER } from "../config/player.ts";
import type { InputSystem } from "../systems/InputSystem.ts";
import { getMovementDirection } from "../systems/PlayerMovement.ts";
import type { Facing } from "../systems/PlayerMovement.ts";

/** 移動用Body・向きを保持する小さな単位。外見は正式素材ではなくDEV_PLACEHOLDER。 */
export class Player {
  readonly visual: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  facing: Facing;

  constructor(scene: Phaser.Scene, x: number, y: number, facing: Facing) {
    this.facing = facing;
    this.visual = scene.add.rectangle(x, y, PLAYER.width, PLAYER.height, PLAYER.color);
    scene.physics.add.existing(this.visual);
    this.body = this.visual.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(PLAYER.width, PLAYER.height);
    this.body.setCollideWorldBounds(true);
  }

  update(input: InputSystem): void {
    const direction = getMovementDirection(input);
    this.body.setVelocity(0, 0);
    if (direction === null) return; // 停止中も最後の向きは保持する。
    this.facing = direction;
    if (direction === "up") this.body.setVelocityY(-PLAYER.moveSpeed);
    if (direction === "down") this.body.setVelocityY(PLAYER.moveSpeed);
    if (direction === "left") this.body.setVelocityX(-PLAYER.moveSpeed);
    if (direction === "right") this.body.setVelocityX(PLAYER.moveSpeed);
  }
}
