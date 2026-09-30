/**
 * No.11 みずうみの古城の一人称3Dレイアウト。
 *
 * 参照画像の建築構成を、探索用の小さな論理グリッドへ落としたもの。これは2D背景や
 * Tiledデータではなく、Three.jsで床・水・壁・橋を組み立てるための正本データである。
 * 数値（移動速度・エンカウント間隔を除く見た目の寸法）は TEMP_VISUAL_VALUE。
 */

export const LAKE_CASTLE_3D_SCENE_KEY = "LakeCastle3DScene";
export type LakeCastleFloorId = 1 | 2 | 3;

export const LAKE_CASTLE_CELL = {
  water: 0,
  floor: 1,
  wall: 2,
  bridge: 3,
} as const;

export type LakeCastleCell = (typeof LAKE_CASTLE_CELL)[keyof typeof LAKE_CASTLE_CELL];

export interface LakeCastlePoint {
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
}

export interface LakeCastleZone {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly height: number;
}

export interface LakeCastleTransition extends LakeCastleZone {
  readonly targetFloor: LakeCastleFloorId;
  readonly targetSpawnId: string;
  readonly requiresAncientInscription?: boolean;
  /** 1F→2Fだけはミレイの魔法で水流を鎮める一度きりのイベントを通す。 */
  readonly requiresMoveMagic?: boolean;
}

export interface LakeCastleFeature {
  readonly kind: "statue" | "chapel" | "library" | "inscription" | "reader_mark" | "sanctuary" | "tower" | "waterfall" | "water_gate" | "ruin" | "candelabra" | "stairway" | "navigation_beacon";
  readonly x: number;
  readonly z: number;
  readonly rotation?: number;
  /** Stair markers are a render cue only; floor movement remains in transitions. */
  readonly destinationFloor?: LakeCastleFloorId;
}

/** TEMP_VISUAL_VALUE: each compact floor needs a distinct readable atmosphere without adding new story text. */
export interface LakeCastleVisualPalette {
  readonly backgroundColor: number;
  readonly fogColor: number;
  readonly fogDensity: number;
  readonly skyLightColor: number;
  readonly groundLightColor: number;
  readonly vaultLightColor: number;
  readonly accentLightColor: number;
}

export interface LakeCastleFloorPlan {
  readonly id: LakeCastleFloorId;
  readonly title: string;
  readonly width: number;
  readonly height: number;
  /** One value per x/z cell. Water is intentionally non-walkable. */
  readonly cells: Uint8Array;
  readonly spawns: Readonly<Record<string, LakeCastlePoint>>;
  readonly transitions: readonly LakeCastleTransition[];
  readonly features: readonly LakeCastleFeature[];
  readonly visualPalette: LakeCastleVisualPalette;
  /** 2F only: an optional Z interaction point. */
  readonly ancientInscription?: LakeCastleZone;
  /** 3F only: the clear-event interaction area. */
  readonly sanctuary?: LakeCastleZone;
  /** 1F only: back to the point-selection world map. */
  readonly worldMapExit?: LakeCastleZone;
}

// Three.js yaw 0 looks toward -Z (north in these floor plans).
const NORTH = 0;
const SOUTH = Math.PI;

function blank(width: number, height: number): Uint8Array {
  return new Uint8Array(width * height).fill(LAKE_CASTLE_CELL.water);
}

function set(cells: Uint8Array, width: number, height: number, x: number, z: number, cell: LakeCastleCell): void {
  if (x >= 0 && z >= 0 && x < width && z < height) cells[z * width + x] = cell;
}

function rect(cells: Uint8Array, width: number, height: number, x: number, z: number, w: number, h: number, cell: LakeCastleCell): void {
  for (let row = z; row < z + h; row += 1) for (let column = x; column < x + w; column += 1) set(cells, width, height, column, row, cell);
}

/** A ruined chamber with thick, deliberately incomplete walls. Later paths cut the doorways. */
function room(cells: Uint8Array, width: number, height: number, x: number, z: number, w: number, h: number): void {
  rect(cells, width, height, x, z, w, h, LAKE_CASTLE_CELL.wall);
  rect(cells, width, height, x + 1, z + 1, w - 2, h - 2, LAKE_CASTLE_CELL.floor);
}

function path(cells: Uint8Array, width: number, height: number, x: number, z: number, w: number, h: number, cell: LakeCastleCell = LAKE_CASTLE_CELL.floor): void {
  rect(cells, width, height, x, z, w, h, cell);
}

function buildFloor1(): LakeCastleFloorPlan {
  const width = 43;
  const height = 36;
  const cells = blank(width, height);

  // 南の長い石橋 → 中央の像 → 左聖堂 / 右書庫 → 北の大階段。
  room(cells, width, height, 17, 29, 9, 6);
  path(cells, width, height, 19, 18, 5, 13, LAKE_CASTLE_CELL.bridge);
  room(cells, width, height, 13, 14, 17, 8);
  path(cells, width, height, 8, 17, 7, 3, LAKE_CASTLE_CELL.bridge);
  path(cells, width, height, 28, 17, 7, 3, LAKE_CASTLE_CELL.bridge);
  room(cells, width, height, 2, 6, 11, 13);
  room(cells, width, height, 31, 6, 10, 13);
  path(cells, width, height, 19, 4, 5, 12);
  room(cells, width, height, 16, 1, 11, 6);
  // Doorways through the deliberately solid room borders.
  path(cells, width, height, 19, 29, 5, 3);
  // The open south gate is the only return route. Keep it beyond the arrival spawn.
  path(cells, width, height, 19, 34, 5, 1, LAKE_CASTLE_CELL.bridge);
  path(cells, width, height, 19, 19, 5, 4, LAKE_CASTLE_CELL.bridge);
  path(cells, width, height, 19, 13, 5, 4);
  path(cells, width, height, 10, 17, 5, 3, LAKE_CASTLE_CELL.bridge);
  path(cells, width, height, 28, 17, 5, 3, LAKE_CASTLE_CELL.bridge);
  path(cells, width, height, 5, 16, 5, 3);
  path(cells, width, height, 31, 16, 4, 3);
  path(cells, width, height, 19, 5, 5, 3);

  return {
    id: 1,
    title: "みずうみの古城　1F",
    width,
    height,
    cells,
    spawns: {
      fromWorldMap: { x: 21.5, z: 32.5, yaw: NORTH },
      fromFloor2: { x: 21.5, z: 5.5, yaw: SOUTH },
    },
    transitions: [{ x: 19, z: 2, width: 5, height: 3, targetFloor: 2, targetSpawnId: "fromFloor1", requiresMoveMagic: true }],
    worldMapExit: { x: 19, z: 34, width: 5, height: 1 },
    features: [
      { kind: "water_gate", x: 21.5, z: 2.2 },
      { kind: "stairway", x: 21.5, z: 3.5, destinationFloor: 2 },
      // TEMP_VISUAL_VALUE: a mid-corridor beacon makes the next floor readable in first person.
      { kind: "navigation_beacon", x: 21.5, z: 10.5, destinationFloor: 2 },
      { kind: "statue", x: 21.5, z: 17.5 },
      { kind: "chapel", x: 7, z: 10 },
      { kind: "library", x: 36, z: 10, rotation: Math.PI },
      { kind: "tower", x: 14, z: 14 }, { kind: "tower", x: 29, z: 14 },
      { kind: "tower", x: 17, z: 29 }, { kind: "tower", x: 26, z: 29 },
      { kind: "waterfall", x: 14, z: 20 }, { kind: "waterfall", x: 29, z: 20 },
      { kind: "waterfall", x: 5, z: 19 }, { kind: "waterfall", x: 38, z: 19 },
      { kind: "ruin", x: 8, z: 25 }, { kind: "ruin", x: 35, z: 26 },
      { kind: "candelabra", x: 19, z: 15 }, { kind: "candelabra", x: 24, z: 15 },
    ],
    visualPalette: {
      backgroundColor: 0x071a24, fogColor: 0x0d2734, fogDensity: 0.03,
      skyLightColor: 0xa3cce0, groundLightColor: 0x0d1b25, vaultLightColor: 0xc0d7e5, accentLightColor: 0x36d7ff,
    },
  };
}

function buildFloor2(): LakeCastleFloorPlan {
  const width = 43;
  const height = 37;
  const cells = blank(width, height);

  // 南の階段 → 中央円形広場 → 西書庫 / 東石碑室 → 北の回廊。
  room(cells, width, height, 17, 30, 9, 6);
  path(cells, width, height, 19, 22, 5, 10, LAKE_CASTLE_CELL.bridge);
  room(cells, width, height, 12, 14, 19, 10);
  path(cells, width, height, 8, 17, 7, 3, LAKE_CASTLE_CELL.bridge);
  path(cells, width, height, 28, 17, 7, 3, LAKE_CASTLE_CELL.bridge);
  room(cells, width, height, 2, 6, 12, 13);
  room(cells, width, height, 30, 6, 11, 13);
  path(cells, width, height, 19, 3, 5, 13);
  room(cells, width, height, 16, 1, 11, 5);
  path(cells, width, height, 19, 30, 5, 3);
  path(cells, width, height, 19, 21, 5, 4, LAKE_CASTLE_CELL.bridge);
  path(cells, width, height, 19, 13, 5, 4);
  path(cells, width, height, 10, 17, 4, 3, LAKE_CASTLE_CELL.bridge);
  path(cells, width, height, 29, 17, 4, 3, LAKE_CASTLE_CELL.bridge);
  path(cells, width, height, 5, 16, 5, 3);
  path(cells, width, height, 30, 16, 5, 3);
  path(cells, width, height, 19, 4, 5, 3);

  return {
    id: 2,
    title: "みずうみの古城　2F",
    width,
    height,
    cells,
    spawns: {
      fromFloor1: { x: 21.5, z: 32.5, yaw: NORTH },
      fromFloor3: { x: 21.5, z: 4.5, yaw: SOUTH },
    },
    transitions: [
      { x: 19, z: 33, width: 5, height: 3, targetFloor: 1, targetSpawnId: "fromFloor2" },
      { x: 19, z: 1, width: 5, height: 3, targetFloor: 3, targetSpawnId: "fromFloor2", requiresAncientInscription: true },
    ],
    ancientInscription: { x: 33, z: 9, width: 4, height: 4 },
    features: [
      { kind: "stairway", x: 21.5, z: 34, destinationFloor: 1, rotation: Math.PI },
      { kind: "stairway", x: 21.5, z: 2.5, destinationFloor: 3 },
      { kind: "navigation_beacon", x: 21.5, z: 27.5, destinationFloor: 1, rotation: Math.PI },
      { kind: "navigation_beacon", x: 21.5, z: 10.5, destinationFloor: 3 },
      { kind: "statue", x: 21.5, z: 18.5 },
      { kind: "library", x: 7.5, z: 10 },
      // Text-free visual preview: an open-book glyph says that this stone needs a reader.
      { kind: "reader_mark", x: 31.7, z: 10 },
      { kind: "inscription", x: 34.5, z: 10 },
      { kind: "chapel", x: 21.5, z: 8 },
      { kind: "tower", x: 12, z: 14 }, { kind: "tower", x: 31, z: 14 },
      { kind: "waterfall", x: 14, z: 22 }, { kind: "waterfall", x: 29, z: 22 },
      { kind: "waterfall", x: 5, z: 19 }, { kind: "waterfall", x: 38, z: 19 },
      { kind: "ruin", x: 4, z: 26 }, { kind: "ruin", x: 38, z: 27 },
      { kind: "candelabra", x: 18, z: 16 }, { kind: "candelabra", x: 25, z: 16 },
    ],
    visualPalette: {
      backgroundColor: 0x0b1829, fogColor: 0x0d2436, fogDensity: 0.035,
      skyLightColor: 0x7fafd2, groundLightColor: 0x0d1525, vaultLightColor: 0xb9d0e5, accentLightColor: 0x5cb5ff,
    },
  };
}

function buildFloor3(): LakeCastleFloorPlan {
  const width = 43;
  const height = 36;
  const cells = blank(width, height);

  // 最上階は迷路にせず、長い回廊と円形広場、その先の聖堂だけに絞る。
  room(cells, width, height, 17, 30, 9, 5);
  path(cells, width, height, 19, 20, 5, 12, LAKE_CASTLE_CELL.bridge);
  room(cells, width, height, 12, 14, 19, 8);
  path(cells, width, height, 19, 9, 5, 7);
  room(cells, width, height, 13, 1, 17, 10);
  room(cells, width, height, 3, 17, 8, 6);
  room(cells, width, height, 32, 17, 8, 6);
  path(cells, width, height, 19, 30, 5, 3);
  path(cells, width, height, 19, 19, 5, 4, LAKE_CASTLE_CELL.bridge);
  path(cells, width, height, 19, 14, 5, 3);
  path(cells, width, height, 19, 8, 5, 4);
  path(cells, width, height, 19, 34, 5, 1, LAKE_CASTLE_CELL.bridge);
  path(cells, width, height, 13, 18, 3, 3, LAKE_CASTLE_CELL.bridge);
  path(cells, width, height, 28, 18, 5, 3, LAKE_CASTLE_CELL.bridge);

  return {
    id: 3,
    title: "みずうみの古城　3F",
    width,
    height,
    cells,
    spawns: { fromFloor2: { x: 21.5, z: 32.5, yaw: NORTH } },
    transitions: [{ x: 19, z: 34, width: 5, height: 1, targetFloor: 2, targetSpawnId: "fromFloor3" }],
    sanctuary: { x: 18, z: 3, width: 8, height: 5 },
    features: [
      { kind: "stairway", x: 21.5, z: 34, destinationFloor: 2, rotation: Math.PI },
      { kind: "navigation_beacon", x: 21.5, z: 27.5, destinationFloor: 2, rotation: Math.PI },
      { kind: "statue", x: 21.5, z: 17.5 },
      { kind: "sanctuary", x: 21.5, z: 5 },
      { kind: "library", x: 6, z: 19 }, { kind: "chapel", x: 36, z: 19 },
      { kind: "tower", x: 12, z: 14 }, { kind: "tower", x: 31, z: 14 },
      { kind: "tower", x: 13, z: 9 }, { kind: "tower", x: 30, z: 9 },
      { kind: "waterfall", x: 14, z: 21 }, { kind: "waterfall", x: 29, z: 21 },
      { kind: "waterfall", x: 16, z: 11 }, { kind: "waterfall", x: 27, z: 11 },
      { kind: "ruin", x: 6, z: 27 }, { kind: "ruin", x: 36, z: 28 },
      { kind: "candelabra", x: 17, z: 9 }, { kind: "candelabra", x: 26, z: 9 },
    ],
    visualPalette: {
      backgroundColor: 0x130d24, fogColor: 0x1b1632, fogDensity: 0.04,
      skyLightColor: 0xb7a3de, groundLightColor: 0x170f2b, vaultLightColor: 0xd0c0ed, accentLightColor: 0xb58dff,
    },
  };
}

export const LAKE_CASTLE_FLOORS: Readonly<Record<LakeCastleFloorId, LakeCastleFloorPlan>> = {
  1: buildFloor1(),
  2: buildFloor2(),
  3: buildFloor3(),
};

export const LAKE_CASTLE_3D_SETTINGS = {
  // TEMP_TEST_VALUE: first-person movement intentionally slower than 2D maps to reduce motion sickness.
  moveSpeed: 4.2,
  turnSpeed: 2.25,
  mouseSensitivity: 0.0024,
  eyeHeight: 1.68,
  fov: 68,
  renderScale: 1,
  /** Source files are not available yet; callers must not fabricate audio. */
  ambience: { waterKey: null, waterfallKey: null, volume: 0.35 },
} as const;

export function lakeCastleFloorFromQuery(search: string): LakeCastleFloorId {
  const value = new URLSearchParams(search).get("floor");
  return value === "2" ? 2 : value === "3" ? 3 : 1;
}

export function lakeCastleCellAt(plan: LakeCastleFloorPlan, x: number, z: number): LakeCastleCell {
  if (x < 0 || z < 0 || x >= plan.width || z >= plan.height) return LAKE_CASTLE_CELL.water;
  return plan.cells[z * plan.width + x] as LakeCastleCell;
}

export function lakeCastleIsWalkable(plan: LakeCastleFloorPlan, x: number, z: number): boolean {
  const cell = lakeCastleCellAt(plan, x, z);
  return cell === LAKE_CASTLE_CELL.floor || cell === LAKE_CASTLE_CELL.bridge;
}

export function lakeCastleZoneContains(zone: LakeCastleZone, x: number, z: number): boolean {
  return x >= zone.x && z >= zone.z && x < zone.x + zone.width && z < zone.z + zone.height;
}
