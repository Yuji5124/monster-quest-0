import Phaser from "phaser";
import {
  NO01_DAY_COLLISION_LAYER_NAME,
  NO01_DAY_COLLISION_MARKER_LABEL,
  NO01_DAY_EVENTS_LAYER_NAME,
  NO01_DAY_TILEMAP_KEY,
  NO01_DAY_TILEMAP_PATH,
  NO01_DAY_TILESETS,
  NO01_DAY_VISIBLE_LAYER_NAMES,
} from "../config/no01TiledMap.ts";
import type { TiledMapDef } from "../systems/TiledMapRuntime.ts";
import { createTiledEventZones, createTiledMap, findPlayerSpawn, preloadTiledMap, updateTiledEventZones } from "../systems/TiledMapRuntime.ts";
import { Player } from "../entities/Player.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { configureMapCamera } from "../systems/MapCamera.ts";
import { createExitZone } from "../systems/MapTransition.ts";
import { PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { ensureWalkAnimations, preloadWalkSprite } from "../systems/CharacterWalkSprite.ts";

const NO01_DAY_MAP_DEF: TiledMapDef = {
  tilemapKey: NO01_DAY_TILEMAP_KEY,
  tilemapPath: NO01_DAY_TILEMAP_PATH,
  tilesets: NO01_DAY_TILESETS,
  visibleLayerNames: NO01_DAY_VISIBLE_LAYER_NAMES,
  collisionLayerName: NO01_DAY_COLLISION_LAYER_NAME,
  eventsLayerName: NO01_DAY_EVENTS_LAYER_NAME,
  collisionMarkerLabel: NO01_DAY_COLLISION_MARKER_LABEL,
};

/**
 * DEV_MAP_TEST: 完成したNo.01「はじまりのばしょ」昼のTiledマップを、Phaser 3上で実際に
 * 表示・歩行・Collision・Events検出できることを検証する最小接続。?mapTest=no01専用で、
 * 通常のTitle→Opening→StartingPlace起動には接続しない。
 *
 * Tiled読み込み本体は src/systems/TiledMapRuntime.ts。通常のStartingPlaceSceneは画像マップ方式であり、共有しない。
 *
 * 今回やらないこと(次Phase以降の課題として記録): 本番exit遷移、campfire本イベント、
 * Y-sort(樹冠と主人公の前後関係)、正式主人公sprite。詳細: docs/PHASE_NO01_TILED_PHASER_INTEGRATION.md
 */
export class MapTestNo01Scene extends Phaser.Scene {
  private actions!: InputSystem;
  private player!: Player;

  constructor() {
    super({ key: "MapTestNo01Scene", physics: { arcade: { gravity: { x: 0, y: 0 }, debug: false } } });
  }

  preload(): void {
    preloadTiledMap(this, NO01_DAY_MAP_DEF);
    preloadWalkSprite(this, PROTAGONIST_SPRITE);
  }

  create(): void {
    const collisionDebug = new URLSearchParams(window.location.search).get("collisionDebug") === "1";
    const { map, collisionLayer, eventsLayer } = createTiledMap(this, NO01_DAY_MAP_DEF, { collisionDebug });

    const spawn = findPlayerSpawn(eventsLayer);
    ensureWalkAnimations(this, PROTAGONIST_SPRITE);
    // Tiled側にfacingプロパティは無いため、焚き火のそばで目覚める想定でdownを既定にする。
    this.player = new Player(this, spawn.x, spawn.y, "down");
    this.player.setDepth(1000); // Y-sort未実装のため、暫定的に常に最前面(既知の制約、記録済み)。

    this.physics.add.collider(this.player.body, collisionLayer);
    configureMapCamera(this, this.player.visual, { x: 0, y: 0, width: map.widthInPixels, height: map.heightInPixels });
    this.cameras.main.setBackgroundColor("#101018");

    const eventZones = createTiledEventZones(eventsLayer, ["exit", "event"], (bounds) => createExitZone(this, bounds));

    this.actions = new InputSystem(window, document);
    const movePlayer = (): void => this.player.update(this.actions);
    const checkEventZones = (): void =>
      updateTiledEventZones(this, eventZones, this.player.body, (zone) => {
        // eslint-disable-next-line no-console
        console.log(`[DEV_MAP_TEST] EVENT ZONE detected: ${zone.label}`);
      });
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, movePlayer);
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, checkEventZones);

    const cleanup = (): void => {
      this.actions.destroy();
      this.events.off(Phaser.Scenes.Events.PRE_UPDATE, movePlayer);
      this.events.off(Phaser.Scenes.Events.PRE_UPDATE, checkEventZones);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    // eslint-disable-next-line no-console
    console.log(
      `[DEV_MAP_TEST] No.01 day map loaded: ${map.width}x${map.height} tiles, ` +
        `${map.widthInPixels}x${map.heightInPixels}px, spawn=(${spawn.x},${spawn.y}), ` +
        `events=[${eventZones.map((z) => z.label).join(", ")}]`,
    );

    // DEV_ONLY: devtoolsから状態確認するための最小フック(ゲームプレイには無関係)。
    (window as unknown as { __mapTestNo01?: unknown }).__mapTestNo01 = { scene: this, player: this.player, map };
  }
}
