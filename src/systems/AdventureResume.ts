import { MAPS } from "../config/maps.ts";
import type { MapId } from "../config/maps.ts";
import type { AdventureRecord } from "./GameStateRepository.ts";

export interface AdventureResumeDestination {
  readonly sceneKey: string;
  readonly data: Readonly<Record<string, string | number>>;
}

const CASTLE_3D_SCENES: Readonly<Record<string, string>> = {
  map_05_rainland_castle: "RainlandCastle3DScene",
  map_rainland_throne_room: "RainlandThroneRoom3DScene",
};

const LAKE_FLOOR_BY_MAP_ID: Readonly<Record<string, 1 | 2 | 3>> = {
  map_lake_castle_1: 1,
  map_lake_castle_2: 2,
  map_lake_castle_3: 3,
};

/**
 * Converts a validated save record to a registered Scene and its exact resume data.
 * The map/Scene pairing is checked again here so edited localStorage cannot redirect to an arbitrary Scene.
 */
export function resolveAdventureResume(record: AdventureRecord | undefined): AdventureResumeDestination | undefined {
  if (!record) return undefined;
  const map = MAPS[record.mapId as MapId];
  if (!map) return undefined;

  if (record.resume.kind === "2d") {
    if (map.sceneKey !== record.sceneKey) return undefined;
    return {
      sceneKey: map.sceneKey,
      data: { spawnX: record.resume.x, spawnY: record.resume.y, spawnFacing: record.resume.facing },
    };
  }

  if (record.resume.kind === "castle3d") {
    if (CASTLE_3D_SCENES[record.mapId] !== record.sceneKey) return undefined;
    return { sceneKey: record.sceneKey, data: { spawnX: record.resume.x, spawnY: record.resume.y, spawnYaw: record.resume.yaw } };
  }

  const floor = LAKE_FLOOR_BY_MAP_ID[record.mapId];
  if (record.sceneKey !== "LakeCastle3DScene" || map.sceneKey !== record.sceneKey || floor !== record.resume.floor) return undefined;
  return {
    sceneKey: record.sceneKey,
    data: { floor: record.resume.floor, spawnX: record.resume.x, spawnY: record.resume.y, spawnYaw: record.resume.yaw },
  };
}
