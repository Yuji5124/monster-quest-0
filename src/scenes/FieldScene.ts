import Phaser from "phaser";
import { FIELD_BOUNDS, FIELD_COLLISION_FEATURES, FIELD_GROUND_COLOR, FIELD_REFERENCE, WORLD_LOCATIONS } from "../config/field.ts";
import { MAPS, MAP_TRANSITION_FADE_MS } from "../config/maps.ts";
import type { MapExitTrigger } from "../config/maps.ts";
import { Player } from "../entities/Player.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { PartyFollowers } from "../systems/PartyFollowers.ts";
import { configureMapCamera } from "../systems/MapCamera.ts";
import { beginConfiguredMapExitTransition, createExitZone } from "../systems/MapTransition.ts";
import { PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { TAROSA_SPRITE } from "../config/tarosaSprite.ts";
import { MIREI_SPRITE } from "../config/mireiSprite.ts";
import { ensureWalkAnimations, preloadWalkSprite } from "../systems/CharacterWalkSprite.ts";

const MAP_ID = "field_starting_region"; // 仮ID。正式フィールド名称・mapIdは未確定(DEV_PLACEHOLDER_FIELD)。

/**
 * No.01「はじまりのばしょ」とNo.02「はじまりのまち」の間を徒歩でつなぐDEV_PLACEHOLDER_FIELD。
 * Phase 8.6: REFERENCEに基づく荒フィールドを既存の主人公追従Cameraで表示する。
 * 正式フィールド地形・エンカウント・戦闘・BGMは実装しない。
 */
export class FieldScene extends Phaser.Scene {
  private actions!: InputSystem;
  private player!: Player;
  private transitioning = false;

  constructor() {
    // PhysicsはこのSceneだけで有効化する。既存Boot / Title / 異常演出には追加しない。
    super({ key: "FieldScene", physics: { arcade: { gravity: { x: 0, y: 0 } } } });
  }

  preload(): void {
    this.load.image(FIELD_REFERENCE.key, FIELD_REFERENCE.url);
    preloadWalkSprite(this, PROTAGONIST_SPRITE);
    preloadWalkSprite(this, TAROSA_SPRITE);
    preloadWalkSprite(this, MIREI_SPRITE);
  }

  create(data?: { spawnId?: string }): void {
    this.transitioning = false;
    const map = MAPS[MAP_ID];

    this.cameras.main.setBackgroundColor(FIELD_GROUND_COLOR);
    this.physics.world.setBounds(0, 0, FIELD_BOUNDS.width, FIELD_BOUNDS.height);

    // DEV_REFERENCE_BACKGROUND: 地形とPlayer位置確認用。正式背景ではない。
    this.textures.get(FIELD_REFERENCE.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    const background = this.add.image(FIELD_BOUNDS.width / 2, FIELD_BOUNDS.height / 2, FIELD_REFERENCE.key);
    background.setScale(Math.min(FIELD_BOUNDS.width / background.width, FIELD_BOUNDS.height / background.height));
    for (const landmark of Object.values(WORLD_LOCATIONS)) {
      const b = landmark.markerBounds;
      this.add.rectangle(landmark.position.x, landmark.position.y, b.width, b.height, landmark.color)
        .setStrokeStyle(3, 0x231b18); // DEV_PLACEHOLDER_LANDMARK。デバッグ地名は常時表示しない。
    }

    // DEV_PLACEHOLDER_COLLISION: 山・水辺相当の仮の通行不可地形。
    const featureGroup = this.physics.add.staticGroup();
    for (const feature of FIELD_COLLISION_FEATURES) {
      const rect = this.add.rectangle(
        feature.x + feature.width / 2,
        feature.y + feature.height / 2,
        feature.width,
        feature.height,
        feature.color,
      );
      rect.setVisible(false); // 荒い衝突矩形でREFERENCEを覆わない。
      featureGroup.add(rect);
    }

    const spawnId = data?.spawnId && map.spawns[data.spawnId] ? data.spawnId : Object.keys(map.spawns)[0];
    const spawn = map.spawns[spawnId];
    ensureWalkAnimations(this, PROTAGONIST_SPRITE);
    this.player = new Player(this, spawn.x, spawn.y, spawn.facing);
    new PartyFollowers(this, this.player);
    this.physics.add.collider(this.player.body, featureGroup);

    // Player spawn解決 → Camera bounds/追従開始 → fadeIn の順で、
    // 開始直後にCameraが一瞬別の位置(マップ左上等)を映さないようにする。
    configureMapCamera(this, this.player.visual, { x: 0, y: 0, width: FIELD_BOUNDS.width, height: FIELD_BOUNDS.height });
    this.cameras.main.fadeIn(MAP_TRANSITION_FADE_MS, 0, 0, 0);

    for (const exit of map.exits) {
      const zoneBody = createExitZone(this, exit.bounds);
      this.physics.add.overlap(this.player.body, zoneBody, () => this.handleExit(exit));
    }

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
    // エンカウント・戦闘・BGM/SE・正式地形はPhase 8.6では実装しない。
  }

  private handleExit(exit: MapExitTrigger): void {
    // 出口領域に立ち続けても二重遷移しないようにする。
    if (this.transitioning) return;
    this.transitioning = true;
    beginConfiguredMapExitTransition(this, this.actions, exit, MAP_TRANSITION_FADE_MS);
  }
}
