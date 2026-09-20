import Phaser from "phaser";
import { PLAYER } from "../config/player.ts";
import { PROTAGONIST_BODY_OFFSET, PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { idleFrame } from "../config/characterWalkSprite.ts";
import { walkAnimKey } from "../systems/CharacterWalkSprite.ts";
import { createCharacterGroundShadow, placeCharacterGroundShadow } from "../systems/CharacterGroundShadow.ts";
import type { InputSystem } from "../systems/InputSystem.ts";
import { getMovementDirection } from "../systems/PlayerMovement.ts";
import type { Facing } from "../systems/PlayerMovement.ts";

/** 移動用Body・向き・最新男性主人公の歩行表示を保持する。 */
export class Player {
  readonly visual: Phaser.GameObjects.Sprite;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly groundShadow: Phaser.GameObjects.Ellipse;
  facing: Facing;

  constructor(scene: Phaser.Scene, x: number, y: number, facing: Facing) {
    this.facing = facing;
    this.visual = scene.add.sprite(x, y, PROTAGONIST_SPRITE.key, idleFrame(facing));
    scene.physics.add.existing(this.visual);
    this.body = this.visual.body as Phaser.Physics.Arcade.Body;
    // 当たり判定は足元中心のPLAYER.width×PLAYER.height(24×24)。表示上のフレーム(54×70)はそれより大きい
    // (頭・髪・マント込み)ため、offsetで足元ベースライン・水平中央へ揃える。
    this.body.setSize(PLAYER.width, PLAYER.height, false);
    this.body.setOffset(PROTAGONIST_BODY_OFFSET.x, PROTAGONIST_BODY_OFFSET.y);
    this.body.setCollideWorldBounds(true);
    this.groundShadow = createCharacterGroundShadow(scene, this.body.center.x, this.body.bottom, this.visual.depth);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncGroundShadow, this);
    const cleanup = (): void => {
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncGroundShadow, this);
      this.groundShadow.destroy();
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      scene.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  }

  setDepth(depth: number): void {
    this.visual.setDepth(depth);
    this.syncGroundShadow();
  }

  /** 会話・導入演出で、移動せずに視線だけを変える。 */
  setFacing(facing: Facing): void {
    this.facing = facing;
    this.body.setVelocity(0, 0);
    this.visual.anims.stop();
    this.visual.setFrame(idleFrame(facing));
  }

  syncGroundShadow(): void {
    placeCharacterGroundShadow(this.groundShadow, this.body.center.x, this.body.bottom, this.visual.depth);
  }

  update(input: InputSystem): void {
    const direction = getMovementDirection(input);
    this.body.setVelocity(0, 0);
    if (direction === null) {
      // 停止中も最後の向きは保持し、歩行アニメを止めて直立フレームへ戻す。
      this.visual.anims.stop();
      this.visual.setFrame(idleFrame(this.facing));
      return;
    }
    this.facing = direction;
    if (direction === "up") this.body.setVelocityY(-PLAYER.moveSpeed);
    if (direction === "down") this.body.setVelocityY(PLAYER.moveSpeed);
    if (direction === "left") this.body.setVelocityX(-PLAYER.moveSpeed);
    if (direction === "right") this.body.setVelocityX(PLAYER.moveSpeed);
    this.visual.play(walkAnimKey(PROTAGONIST_SPRITE, direction), true);
  }
}
