import Phaser from "phaser";
import { DISPLAY } from "../config/display.ts";
import { STARTING_PLACE_NIGHT } from "../config/startingPlace.ts";
import { Player } from "../entities/Player.ts";
import { InputSystem } from "../systems/InputSystem.ts";

/** No.01夜のPLACEHOLDER。Phase 5ではDEV_PLACEHOLDERの歩行・当たり判定のみ追加。 */
export class StartingPlaceScene extends Phaser.Scene {
  private actions!: InputSystem;
  private player!: Player;

  constructor() {
    // PhysicsはこのSceneだけで有効化する。既存Boot / Title / 異常演出には追加しない。
    super({ key: "StartingPlaceScene", physics: { arcade: { gravity: { x: 0, y: 0 } } } });
  }

  create(): void {
    const view = STARTING_PLACE_NIGHT;
    this.cameras.main.setBackgroundColor(view.skyColor);
    this.cameras.main.setScroll(0, 0);

    const ground = this.add.graphics();
    const groundTop = Math.round(DISPLAY.height * view.groundTopRatio);
    ground.fillStyle(view.groundColor);
    ground.fillRect(0, groundTop, DISPLAY.width, DISPLAY.height - groundTop);

    const fire = view.campfire;
    const unit = Math.max(1, Math.round(DISPLAY.height * fire.unitHeightRatio));
    const campfire = this.add.graphics({
      x: Math.round(DISPLAY.width * fire.xRatio),
      y: Math.round(DISPLAY.height * fire.yRatio),
    });
    for (const rect of fire.rectangles) {
      campfire.fillStyle(rect.color);
      campfire.fillRect(rect.x * unit, rect.y * unit, rect.width * unit, rect.height * unit);
    }
    this.physics.world.setBounds(0, 0, DISPLAY.width, DISPLAY.height);
    const spawn = view.devPlayerSpawn;
    this.player = new Player(
      this, campfire.x + spawn.offsetX * unit, campfire.y + spawn.offsetY * unit, spawn.facing,
    );
    const hitbox = fire.collision;
    const blockers = [
      // PLACEHOLDER: Phase 4の地面より上を歩行不可領域として扱う。
      this.addBlocker(0, 0, DISPLAY.width, groundTop),
      this.addBlocker(campfire.x + hitbox.x * unit, campfire.y + hitbox.y * unit,
        hitbox.width * unit, hitbox.height * unit),
    ];
    for (const blocker of blockers) this.physics.add.collider(this.player.body, blocker);

    this.actions = new InputSystem(window, document);
    // Arcade Physicsの計算前に速度を更新し、キー解放・input lockを次の物理stepへ反映する。
    const movePlayer = (): void => this.player.update(this.actions);
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, movePlayer);
    const cleanup = (): void => {
      this.actions.destroy();
      this.events.off(Phaser.Scenes.Events.PRE_UPDATE, movePlayer);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
    // 次Sceneへの接続・会話・昼への切替はPhase 5では実装しない。
  }

  private addBlocker(x: number, y: number, width: number, height: number): Phaser.Physics.Arcade.StaticBody {
    const blocker = this.add.rectangle(x + width / 2, y + height / 2, width, height).setVisible(false);
    this.physics.add.existing(blocker, true);
    return blocker.body as Phaser.Physics.Arcade.StaticBody;
  }
}
