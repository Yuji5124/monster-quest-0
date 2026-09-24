import { VOXEL_FLOOR, VOXEL_WALL } from "./Castle3DLayout.ts";
import type { VoxelLayout, WallFaceDirection } from "./Castle3DLayout.ts";

/**
 * ブロック城の建築装飾(壁の付け柱・つた)の置き場所を決める純粋関数。three.jsに依存しない。
 * 単位はブロック。x・zは壁面上の中心点(2Dの背景x・yをblockSizeで割った値)。
 */
export interface WallFaceSpot {
  readonly column: number;
  readonly row: number;
  readonly face: WallFaceDirection;
  /** 壁面上の中心(ブロック)。 */
  readonly x: number;
  readonly z: number;
}

/** 床に面している壁ブロックの面をすべて列挙する(1つの壁ブロックが2面以上を持つ角も含む)。 */
export function findWallFaceSpots(layout: VoxelLayout): WallFaceSpot[] {
  const { columns, rows, kinds } = layout;
  const isFloor = (c: number, r: number): boolean => c >= 0 && r >= 0 && c < columns && r < rows && kinds[r * columns + c] === VOXEL_FLOOR;
  const spots: WallFaceSpot[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (kinds[row * columns + column] !== VOXEL_WALL) continue;
      if (isFloor(column, row + 1)) spots.push({ column, row, face: "south", x: column + 0.5, z: row + 1 });
      if (isFloor(column, row - 1)) spots.push({ column, row, face: "north", x: column + 0.5, z: row });
      if (isFloor(column + 1, row)) spots.push({ column, row, face: "east", x: column + 1, z: row + 0.5 });
      if (isFloor(column - 1, row)) spots.push({ column, row, face: "west", x: column, z: row + 0.5 });
    }
  }
  return spots;
}

const spotKey = (face: WallFaceDirection, column: number, row: number): string => `${face}:${column}:${row}`;

/** 壁の中ほど(両隣も同じ向きの壁面)かどうか。角や短い壁の端には柱を立てない。 */
function isStraightRun(keys: ReadonlySet<string>, spot: WallFaceSpot): boolean {
  const along = spot.face === "south" || spot.face === "north" ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
  return along.every(([dc, dr]) => keys.has(spotKey(spot.face, spot.column + dc, spot.row + dr)));
}

/**
 * 付け柱を置く壁面。壁に沿ってspacingブロックごと。旗・窓などの壁飾り(avoid)からavoidRadius以内には置かない
 * (柱が飾りを隠さないように)。
 */
export function choosePilasterSpots(
  spots: readonly WallFaceSpot[],
  spacing: number,
  avoid: readonly { readonly x: number; readonly z: number }[],
  avoidRadius: number,
): WallFaceSpot[] {
  const keys = new Set(spots.map((spot) => spotKey(spot.face, spot.column, spot.row)));
  return spots.filter((spot) => {
    const along = spot.face === "south" || spot.face === "north" ? spot.column : spot.row;
    if (along % spacing !== 0) return false;
    if (!isStraightRun(keys, spot)) return false;
    return avoid.every((point) => Math.hypot(point.x - spot.x, point.z - spot.z) > avoidRadius);
  });
}

/** つたを垂らす壁面。固定シードの乱数でrateの割合だけ選ぶ(柱・飾りの位置は除く)。長さは1〜maxLengthブロック。 */
export function chooseVineSpots(
  spots: readonly WallFaceSpot[],
  rate: number,
  maxLength: number,
  exclude: readonly { readonly x: number; readonly z: number }[],
  seed = 7,
): { spot: WallFaceSpot; length: number }[] {
  let state = seed >>> 0;
  const random = (): number => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const chosen: { spot: WallFaceSpot; length: number }[] = [];
  for (const spot of spots) {
    const roll = random();
    const length = 1 + Math.floor(random() * maxLength);
    if (roll >= rate) continue;
    if (exclude.some((point) => Math.hypot(point.x - spot.x, point.z - spot.z) < 1.2)) continue;
    chosen.push({ spot, length });
  }
  return chosen;
}

/** 壁面の外向きの向き(ブロック単位の単位ベクトル、x右・z下=南が正)。 */
export function faceNormal(face: WallFaceDirection): { x: number; z: number } {
  return { south: { x: 0, z: 1 }, north: { x: 0, z: -1 }, east: { x: 1, z: 0 }, west: { x: -1, z: 0 } }[face];
}
