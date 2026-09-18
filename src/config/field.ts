import { DISPLAY } from "./display.ts";
import { REFERENCE_BARRIERS, REFERENCE_BRIDGES, REFERENCE_COLLISION_CELL, REFERENCE_LAND } from "./fieldTerrain.ts";
import { buildRoughCollision } from "../systems/RoughFieldCollision.ts";

// ROUGH_FIELD / REFERENCE_BASED。正式世界地理・正式素材・正式Collisionではない。
export const FIELD_BOUNDS = { width: DISPLAY.width * 2, height: DISPLAY.height * 2 } as const;
export const FIELD_REFERENCE = {
  key: "field.reference.world",
  // Viteで既存REFERENCEを配信。二重コピーやWindows絶対パスを避ける。
  url: new URL("../../assets/maps/reference/world/mq0_world_map_001_4813475e07.png", import.meta.url).href,
  width: 1448, height: 1086,
  status: "DEV_REFERENCE_BACKGROUND",
} as const;
export function referenceToField(x: number, y: number): { x: number; y: number } {
  return { x: x / FIELD_REFERENCE.width * FIELD_BOUNDS.width, y: y / FIELD_REFERENCE.height * FIELD_BOUNDS.height };
}
function referenceRect(x: number, y: number, width: number, height: number) {
  const origin = referenceToField(x, y);
  const end = referenceToField(x + width, y + height);
  return { ...origin, width: end.x - origin.x, height: end.y - origin.y };
}
// ランドマークとField復帰spawnを分離。正式初期位置ではない。
function location(x: number, y: number, spawnX: number, spawnY: number) {
  return {
    classification: "DEV_PLACEHOLDER_WORLD_POSITION",
    referencePosition: { x, y },
    position: referenceToField(x, y),
    markerBounds: referenceRect(x - 12, y - 12, 24, 24),
    triggerBounds: referenceRect(x - 24, y - 24, 48, 48),
    fieldSpawn: referenceToField(spawnX, spawnY),
    targetSpawnId: "fromField",
  };
}
export const WORLD_LOCATIONS = {
  startingPlace: { ...location(835, 630, 780, 630), mapId: "map_01_starting_place", color: 0xffbd65, facing: "left" },
  startingTown: { ...location(240, 780, 295, 780), mapId: "map_02_starting_town", color: 0xece5b5, facing: "right" },
} as const;
// QA用の徒歩ルート。自動移動やCollisionの強制解除には使わない。
export const FIELD_WALK_ROUTE = [
  WORLD_LOCATIONS.startingPlace.fieldSpawn,
  ...[[780,690],[440,690],[440,768],[295,768],[295,780]].map(([x,y]) => referenceToField(x,y)),
] as const;
export interface FieldObstacle { readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly color: number }
export const FIELD_GROUND_COLOR = 0x15516b;
// Phase 8.5の描画データ契約は維持。横一帯の仮道はREFERENCE背景へ置き換えた。
export const FIELD_BACKGROUND_PATCHES: readonly FieldObstacle[] = [];
export const FIELD_COLLISION_FEATURES: readonly FieldObstacle[] = buildRoughCollision(
  FIELD_REFERENCE.width, FIELD_REFERENCE.height, REFERENCE_COLLISION_CELL,
  REFERENCE_LAND, REFERENCE_BARRIERS, REFERENCE_BRIDGES,
).map(r => ({ ...referenceRect(r.x, r.y, r.width, r.height), color: 0x234a66 }));

