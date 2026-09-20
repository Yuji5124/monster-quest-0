import Phaser from "phaser";
import { DISPLAY } from "../config/display.ts";
import { INTERIORS } from "../config/interiors.ts";
import type { InteriorDefinition } from "../config/interiors.ts";
import { MAP_TRANSITION_FADE_MS } from "../config/maps.ts";
import { Player } from "../entities/Player.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { PartyFollowers } from "../systems/PartyFollowers.ts";
import { beginMapTransition, createExitZone } from "../systems/MapTransition.ts";
import { PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { TAROSA_SPRITE } from "../config/tarosaSprite.ts";
import { MIREI_SPRITE } from "../config/mireiSprite.ts";
import { ensureWalkAnimations, preloadWalkSprite } from "../systems/CharacterWalkSprite.ts";

// 内部から出た際に戻るspawnIdが指定されていない場合の安全な既定値(No.02の正面入口)。
// Phase 8.5でNo.02側の入口spawnIdが fromStartingPlace → fromField へ改名されたため追従。
const FALLBACK_RETURN_SPAWN_ID = "fromField";

/**
 * 建物内部の共通Scene。6棟それぞれに同じようなSceneを複製せず、
 * data.interiorId で src/config/interiors.ts から部屋のレイアウトを読み出して1つのSceneで表示する。
 * 店・宿泊・教会等の機能は実装せず、歩ける+出られるところまで(Phase 8-B)。
 */
export class InteriorScene extends Phaser.Scene {
  private actions!: InputSystem;
  private player!: Player;
  private interior!: InteriorDefinition;
  private returnSpawnId = FALLBACK_RETURN_SPAWN_ID;
  private transitioning = false;

  constructor() {
    // PhysicsはこのSceneだけで有効化する。既存Boot / Title / 異常演出には追加しない。
    super({ key: "InteriorScene", physics: { arcade: { gravity: { x: 0, y: 0 } } } });
  }

  preload(): void {
    preloadWalkSprite(this, PROTAGONIST_SPRITE);
    preloadWalkSprite(this, TAROSA_SPRITE);
    preloadWalkSprite(this, MIREI_SPRITE);
  }

  create(data?: { interiorId?: string; returnSpawnId?: string }): void {
    this.transitioning = false;

    const interior = data?.interiorId ? INTERIORS[data.interiorId] : undefined;
    if (!interior) {
      // 不正/未知のinteriorIdでは何も描画せず、安全に町へ戻す。
      console.warn(`[InteriorScene] unknown interiorId: ${data?.interiorId ?? "(none)"}`);
      this.scene.start("StartingTownScene");
      return;
    }
    this.interior = interior;
    this.returnSpawnId = data?.returnSpawnId ?? FALLBACK_RETURN_SPAWN_ID;

    // 部屋は画面中央に配置する(カメラスクロールは導入しない)。
    const offsetX = Math.round((DISPLAY.width - interior.room.width) / 2);
    const offsetY = Math.round((DISPLAY.height - interior.room.height) / 2);

    // カメラ背景(壁色)がそのまま部屋の外枠として見える。床はその上に重ねて描画する。
    this.cameras.main.setBackgroundColor(interior.wallColor);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.fadeIn(MAP_TRANSITION_FADE_MS, 0, 0, 0);

    const floor = this.add.graphics();
    floor.fillStyle(interior.floorColor);
    floor.fillRect(offsetX, offsetY, interior.room.width, interior.room.height);

    this.physics.world.setBounds(offsetX, offsetY, interior.room.width, interior.room.height);

    // DEV_PLACEHOLDER_COLLISION: カウンター/ベッド/祭壇等の大型家具のみ通行不可にする。
    const furnitureGroup = this.physics.add.staticGroup();
    for (const item of interior.furniture) {
      const rect = this.add.rectangle(
        offsetX + item.x + item.width / 2,
        offsetY + item.y + item.height / 2,
        item.width,
        item.height,
        item.color,
      );
      furnitureGroup.add(rect);
    }

    const spawn = interior.playerSpawn;
    ensureWalkAnimations(this, PROTAGONIST_SPRITE);
    this.player = new Player(this, offsetX + spawn.x, offsetY + spawn.y, spawn.facing);
    new PartyFollowers(this, this.player);
    this.physics.add.collider(this.player.body, furnitureGroup);

    const exitZoneBody = createExitZone(this, {
      x: offsetX + interior.exitZone.x,
      y: offsetY + interior.exitZone.y,
      width: interior.exitZone.width,
      height: interior.exitZone.height,
    });
    this.physics.add.overlap(this.player.body, exitZoneBody, () => this.handleExitToTown());

    this.actions = new InputSystem(window, document);
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
    // 店・宿泊・教会機能、内部NPC、宝箱、戦闘、セーブ、音はPhase 8-Bでは実装しない。
  }

  private handleExitToTown(): void {
    // 出口領域に立ち続けても二重遷移しないようにする。
    if (this.transitioning) return;
    this.transitioning = true;
    beginMapTransition(
      this, this.actions, this.interior.parentSceneKey, { spawnId: this.returnSpawnId }, MAP_TRANSITION_FADE_MS,
    );
  }
}
