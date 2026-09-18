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
import { LEGACY_TILED_NO01_EXITS, MAPS, MAP_TRANSITION_FADE_MS } from "../config/maps.ts";
import type { MapExitTrigger } from "../config/maps.ts";
import { Player } from "../entities/Player.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { configureMapCamera } from "../systems/MapCamera.ts";
import { beginConfiguredMapExitTransition, createExitZone } from "../systems/MapTransition.ts";
import type { Facing } from "../systems/PlayerMovement.ts";
import type { TiledMapDef } from "../systems/TiledMapRuntime.ts";
import { createTiledEventZones, createTiledMap, findPlayerSpawn, preloadTiledMap, updateTiledEventZones } from "../systems/TiledMapRuntime.ts";

const MAP_ID = "map_01_starting_place";
const isDevMode = typeof import.meta.env !== "undefined" && import.meta.env.DEV;
const NO01_DAY_MAP_DEF: TiledMapDef = {
  tilemapKey: NO01_DAY_TILEMAP_KEY,
  tilemapPath: NO01_DAY_TILEMAP_PATH,
  tilesets: NO01_DAY_TILESETS,
  visibleLayerNames: NO01_DAY_VISIBLE_LAYER_NAMES,
  collisionLayerName: NO01_DAY_COLLISION_LAYER_NAME,
  eventsLayerName: NO01_DAY_EVENTS_LAYER_NAME,
  collisionMarkerLabel: NO01_DAY_COLLISION_MARKER_LABEL,
};

/** Retained legacy No.01 Tiled runtime. It is not registered in the normal game route. */
export class LegacyTiledStartingPlaceScene extends Phaser.Scene {
  private actions!: InputSystem;
  private player!: Player;
  private transitioning = false;

  constructor() {
    super({ key: "LegacyTiledStartingPlaceScene", physics: { arcade: { gravity: { x: 0, y: 0 } } } });
  }

  preload(): void {
    preloadTiledMap(this, NO01_DAY_MAP_DEF);
  }

  create(data?: { spawnId?: string }): void {
    this.transitioning = false;
    const mapConfig = MAPS[MAP_ID];
    const collisionDebug = new URLSearchParams(window.location.search).get("collisionDebug") === "1";
    const { map, collisionLayer, eventsLayer } = createTiledMap(this, NO01_DAY_MAP_DEF, { collisionDebug });
    const namedSpawn = data?.spawnId ? mapConfig.spawns[data.spawnId] : undefined;
    let playerX: number;
    let playerY: number;
    let facing: Facing;
    if (namedSpawn) {
      playerX = namedSpawn.x;
      playerY = namedSpawn.y;
      facing = namedSpawn.facing;
    } else {
      const spawn = findPlayerSpawn(eventsLayer);
      playerX = spawn.x;
      playerY = spawn.y;
      facing = "down";
    }
    this.player = new Player(this, playerX, playerY, facing);
    this.player.visual.setDepth(1000);
    this.physics.add.collider(this.player.body, collisionLayer);
    configureMapCamera(this, this.player.visual, { x: 0, y: 0, width: map.widthInPixels, height: map.heightInPixels });
    this.cameras.main.setBackgroundColor("#101018");
    this.cameras.main.fadeIn(MAP_TRANSITION_FADE_MS, 0, 0, 0);

    this.actions = new InputSystem(window, document);
    const movePlayer = (): void => this.player.update(this.actions);
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, movePlayer);
    for (const exit of LEGACY_TILED_NO01_EXITS) {
      const zoneBody = createExitZone(this, exit.bounds);
      this.physics.add.overlap(this.player.body, zoneBody, () => this.handleExit(exit));
    }
    const tiledEventZones = createTiledEventZones(eventsLayer, ["event"], (bounds) => createExitZone(this, bounds));
    const checkTiledEventZones = (): void => updateTiledEventZones(this, tiledEventZones, this.player.body, (zone) => {
      if (isDevMode) console.log(`[LegacyTiledStartingPlaceScene] Tiled event zone detected: ${zone.label}`);
    });
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, checkTiledEventZones);
    const cleanup = (): void => {
      this.actions.destroy();
      this.events.off(Phaser.Scenes.Events.PRE_UPDATE, movePlayer);
      this.events.off(Phaser.Scenes.Events.PRE_UPDATE, checkTiledEventZones);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  }

  private handleExit(exit: MapExitTrigger): void {
    if (this.transitioning) return;
    this.transitioning = true;
    beginConfiguredMapExitTransition(this, this.actions, exit, MAP_TRANSITION_FADE_MS);
  }
}
