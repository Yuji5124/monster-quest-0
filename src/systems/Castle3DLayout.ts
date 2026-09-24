import { buildCollisionRects } from "./ImageMapCollisionData.ts";
import type { CollisionMaskImageData } from "./ImageMapCollisionData.ts";
import type { Castle3DRect } from "../config/rainlandCastle3D.ts";

/**
 * 3D表示(ブロック城)の純粋ロジック。Phaser・three.jsに依存しないのでNodeテストから検証できる。
 * 座標はすべて2Dのネイティブ背景ピクセル。歩ける/歩けないは2Dと同じbuildCollisionRects(8pxセル)から作るため、
 * 2Dと3Dで通れる場所は完全に一致する(3Dの見た目のブロックは判定に使わない)。
 */
export interface BlockedCellGrid {
  readonly columns: number;
  readonly rows: number;
  readonly cellSize: number;
  readonly width: number;
  readonly height: number;
  /** 1 = 歩けないセル。 */
  readonly blocked: Uint8Array;
}

export function buildBlockedCellGrid(mask: CollisionMaskImageData, cellSize: number): BlockedCellGrid {
  const columns = Math.ceil(mask.width / cellSize);
  const rows = Math.ceil(mask.height / cellSize);
  const blocked = new Uint8Array(columns * rows);
  for (const rect of buildCollisionRects(mask, cellSize)) {
    const c0 = Math.floor(rect.x / cellSize);
    const c1 = Math.ceil((rect.x + rect.width) / cellSize);
    const r0 = Math.floor(rect.y / cellSize);
    const r1 = Math.ceil((rect.y + rect.height) / cellSize);
    for (let r = r0; r < r1; r += 1) for (let c = c0; c < c1; c += 1) blocked[r * columns + c] = 1;
  }
  return { columns, rows, cellSize, width: mask.width, height: mask.height, blocked };
}

export function isCellBlocked(grid: BlockedCellGrid, column: number, row: number): boolean {
  if (column < 0 || row < 0 || column >= grid.columns || row >= grid.rows) return true;
  return grid.blocked[row * grid.columns + column] === 1;
}

function rectsOverlap(a: Castle3DRect, b: Castle3DRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** 足元の箱(中心cx,cy・半径half)が、歩けないセルにも追加の障害物(NPCなど)にも重ならないか。 */
export function boxIsFree(
  grid: BlockedCellGrid,
  cx: number,
  cy: number,
  half: number,
  blockers: readonly Castle3DRect[] = [],
): boolean {
  const x0 = cx - half;
  const y0 = cy - half;
  const x1 = cx + half;
  const y1 = cy + half;
  if (x0 < 0 || y0 < 0 || x1 > grid.width || y1 > grid.height) return false;
  const c0 = Math.floor(x0 / grid.cellSize);
  const c1 = Math.ceil(x1 / grid.cellSize) - 1;
  const r0 = Math.floor(y0 / grid.cellSize);
  const r1 = Math.ceil(y1 / grid.cellSize) - 1;
  for (let r = r0; r <= r1; r += 1) for (let c = c0; c <= c1; c += 1) if (isCellBlocked(grid, c, r)) return false;
  const box = { x: x0, y: y0, width: half * 2, height: half * 2 };
  return !blockers.some((blocker) => rectsOverlap(box, blocker));
}

/**
 * 壁ずり移動。X・Yを別々に試し、ぶつかる軸だけ止める(斜めに壁へ当たっても壁沿いに滑る)。
 * 1フレームの移動量が大きくても壁を抜けないよう、セルの半分以下の小刻みで進める。
 */
export function moveWithSlide(
  grid: BlockedCellGrid,
  position: { readonly x: number; readonly y: number },
  dx: number,
  dy: number,
  half: number,
  blockers: readonly Castle3DRect[] = [],
): { x: number; y: number } {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (grid.cellSize / 2)));
  let { x, y } = position;
  for (let step = 0; step < steps; step += 1) {
    const nextX = x + dx / steps;
    if (boxIsFree(grid, nextX, y, half, blockers)) x = nextX;
    const nextY = y + dy / steps;
    if (boxIsFree(grid, x, nextY, half, blockers)) y = nextY;
  }
  return { x, y };
}

export const VOXEL_VOID = 0;
export const VOXEL_FLOOR = 1;
export const VOXEL_WALL = 2;

export interface VoxelLayout {
  readonly columns: number;
  readonly rows: number;
  readonly blockSize: number;
  /** VOXEL_VOID / VOXEL_FLOOR / VOXEL_WALL */
  readonly kinds: Uint8Array;
  /** 1 = 絨毯の床。 */
  readonly carpet: Uint8Array;
  /** 床の高さ(ブロック)。階段だけ0より大きい。 */
  readonly floorHeight: Float32Array;
  /** 床ブロックから最も近い壁・外(置物は床扱い)までの距離(ブロック、8近傍、最大WALL_DISTANCE_CAP)。天井の段差に使う。 */
  readonly wallDistance: Uint8Array;
  /** 絨毯ブロックのうち、絨毯でない床と接する辺(北1・東2・南4・西8)。金の縁取りに使う。 */
  readonly carpetEdges: Uint8Array;
  /** 床ブロックのうち、壁・置物・外と接する辺(北1・東2・南4・西8)。床の壁ぎわを暗くする(簡易アンビエントオクルージョン)。 */
  readonly floorShade: Uint8Array;
  /** 1 = 階段の段(高さのある床のうち、平らな壇ではなく段として描くもの)。 */
  readonly stairMask: Uint8Array;
  /** 壁ブロックの高さ(ブロック)。0なら天井まで届く普通の壁、0より大きければ低い壁(壇の前面など)。 */
  readonly wallTop: Float32Array;
}

export const WALL_DISTANCE_CAP = 3;
export const EDGE_NORTH = 1;
export const EDGE_EAST = 2;
export const EDGE_SOUTH = 4;
export const EDGE_WEST = 8;

export interface VoxelLayoutOptions {
  readonly carpets: readonly Castle3DRect[];
  readonly stairs?: { readonly rect: Castle3DRect; readonly rise: number };
  /** 床の置物(台座・植木など)の範囲。ここは壁ブロックにせず、置物の形で別に描く。 */
  readonly propRects?: readonly Castle3DRect[];
  /** 一段高い床(王の間の壇など)。範囲内の床ブロックはheightの高さになる(階段が優先)。 */
  readonly platforms?: readonly { readonly rect: Castle3DRect; readonly height: number }[];
  /** 天井まで届かない低い壁。範囲内の壁ブロックはheightの高さまでしか積まない。 */
  readonly lowWalls?: readonly { readonly rect: Castle3DRect; readonly height: number }[];
}

/**
 * 8pxセルの判定格子から、1ブロック=blockSizeの見た目を作る。
 * ブロック内のセルが1つでも歩けるなら床(歩ける場所が壁に埋まらない)。全セルが歩けないブロックのうち、
 * 床に隣接するものだけを壁にし、それ以外(城の外側)は描かない。
 */
export function buildVoxelLayout(grid: BlockedCellGrid, blockSize: number, options: VoxelLayoutOptions): VoxelLayout {
  if (blockSize % grid.cellSize !== 0) throw new Error("blockSize must be a multiple of the collision cell size");
  const per = blockSize / grid.cellSize;
  const columns = Math.ceil(grid.width / blockSize);
  const rows = Math.ceil(grid.height / blockSize);
  const kinds = new Uint8Array(columns * rows);
  const carpet = new Uint8Array(columns * rows);
  const floorHeight = new Float32Array(columns * rows);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let anyWalkable = false;
      for (let r = 0; r < per && !anyWalkable; r += 1) {
        for (let c = 0; c < per; c += 1) {
          if (!isCellBlocked(grid, column * per + c, row * per + r)) {
            anyWalkable = true;
            break;
          }
        }
      }
      if (anyWalkable) kinds[row * columns + column] = VOXEL_FLOOR;
    }
  }
  const blockCenterIn = (rect: Castle3DRect, column: number, row: number): boolean => {
    const cx = (column + 0.5) * blockSize;
    const cy = (row + 0.5) * blockSize;
    return cx >= rect.x && cx < rect.x + rect.width && cy >= rect.y && cy < rect.y + rect.height;
  };
  // 置物のブロックは壁にしないが、その周りには(床と同じく)壁を立てる。置物の後ろの壁に穴が開かないようにするため。
  const prop = new Uint8Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (kinds[row * columns + column] === VOXEL_VOID && options.propRects?.some((rect) => blockCenterIn(rect, column, row))) prop[row * columns + column] = 1;
    }
  }
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      if (kinds[index] !== VOXEL_VOID || prop[index]) continue;
      let touchesFloor = false;
      for (let dr = -1; dr <= 1 && !touchesFloor; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          const r = row + dr;
          const c = column + dc;
          if (r >= 0 && c >= 0 && r < rows && c < columns && (kinds[r * columns + c] === VOXEL_FLOOR || prop[r * columns + c])) {
            touchesFloor = true;
            break;
          }
        }
      }
      if (touchesFloor) kinds[index] = VOXEL_WALL;
    }
  }

  const stairMask = new Uint8Array(columns * rows);
  const wallTop = new Float32Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      if (kinds[index] === VOXEL_WALL) {
        const low = options.lowWalls?.find((entry) => blockCenterIn(entry.rect, column, row));
        if (low) wallTop[index] = low.height;
      }
      if (kinds[index] !== VOXEL_FLOOR) continue;
      if (options.carpets.some((rect) => blockCenterIn(rect, column, row))) carpet[index] = 1;
      const platform = options.platforms?.find((entry) => blockCenterIn(entry.rect, column, row));
      if (platform) floorHeight[index] = platform.height;
      const stairs = options.stairs;
      if (stairs && blockCenterIn(stairs.rect, column, row)) {
        floorHeight[index] = stairHeightAt(stairs, (row + 0.5) * blockSize, blockSize);
        stairMask[index] = 1;
      }
    }
  }
  const wallDistance = new Uint8Array(columns * rows);
  const carpetEdges = new Uint8Array(columns * rows);
  const floorShade = new Uint8Array(columns * rows);
  const isFloor = (c: number, r: number): boolean => c >= 0 && r >= 0 && c < columns && r < rows && kinds[r * columns + c] === VOXEL_FLOOR;
  // 置物(台座など)は天井から見れば床と同じ。壁と外だけを「壁」として数える(置物の上に天井の段差を作らない)。
  const isOpen = (c: number, r: number): boolean => isFloor(c, r) || (c >= 0 && r >= 0 && c < columns && r < rows && prop[r * columns + c] === 1);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      if (kinds[index] !== VOXEL_FLOOR) continue;
      let distance = WALL_DISTANCE_CAP;
      for (let d = 1; d <= WALL_DISTANCE_CAP && distance === WALL_DISTANCE_CAP; d += 1) {
        for (let dr = -d; dr <= d && distance === WALL_DISTANCE_CAP; dr += 1) {
          for (let dc = -d; dc <= d; dc += 1) {
            if (Math.max(Math.abs(dr), Math.abs(dc)) === d && !isOpen(column + dc, row + dr)) {
              distance = d;
              break;
            }
          }
        }
      }
      wallDistance[index] = distance;
      floorShade[index] =
        (isFloor(column, row - 1) ? 0 : EDGE_NORTH) | (isFloor(column + 1, row) ? 0 : EDGE_EAST) |
        (isFloor(column, row + 1) ? 0 : EDGE_SOUTH) | (isFloor(column - 1, row) ? 0 : EDGE_WEST);
      if (carpet[index]) {
        const plainFloor = (c: number, r: number): boolean => !isFloor(c, r) || carpet[r * columns + c] === 0;
        carpetEdges[index] =
          (plainFloor(column, row - 1) ? EDGE_NORTH : 0) | (plainFloor(column + 1, row) ? EDGE_EAST : 0) |
          (plainFloor(column, row + 1) ? EDGE_SOUTH : 0) | (plainFloor(column - 1, row) ? EDGE_WEST : 0);
      }
    }
  }
  return { columns, rows, blockSize, kinds, carpet, floorHeight, wallDistance, carpetEdges, floorShade, stairMask, wallTop };
}

/** 階段は南端が高さ0、北へ1ブロックごとに一段ずつ上がり、北端でrise。 */
export function stairHeightAt(stairs: { readonly rect: Castle3DRect; readonly rise: number }, y: number, blockSize: number): number {
  const { rect, rise } = stairs;
  if (y < rect.y || y >= rect.y + rect.height) return 0;
  const stepCount = Math.max(1, Math.round(rect.height / blockSize));
  const stepFromSouth = Math.min(stepCount - 1, Math.floor((rect.y + rect.height - y) / blockSize));
  return ((stepFromSouth + 1) / stepCount) * rise;
}

/** 目の高さ用。足元(x,y)の床の高さ(ブロック)。 */
export function floorHeightAt(layout: VoxelLayout, x: number, y: number): number {
  const column = Math.floor(x / layout.blockSize);
  const row = Math.floor(y / layout.blockSize);
  if (column < 0 || row < 0 || column >= layout.columns || row >= layout.rows) return 0;
  return layout.floorHeight[row * layout.columns + column];
}

export type WallFaceDirection = "north" | "south" | "east" | "west";

/**
 * 壁飾りを貼る壁面を探す。(x, y)は2Dの絵で飾りがある位置(床と壁の境目付近)。faceの反対方向へ進み、最初の壁ブロックの
 * その面を返す。plane は面の位置(ブロック単位、south/northならz、east/westならx)。見つからなければnull。
 */
export function findWallFace(
  layout: VoxelLayout,
  x: number,
  y: number,
  face: WallFaceDirection,
  maxSteps = 6,
): { column: number; row: number; plane: number } | null {
  const step = { south: [0, -1], north: [0, 1], east: [-1, 0], west: [1, 0] }[face];
  let column = Math.floor(x / layout.blockSize);
  let row = Math.floor(y / layout.blockSize);
  for (let i = 0; i <= maxSteps; i += 1) {
    if (column >= 0 && row >= 0 && column < layout.columns && row < layout.rows && layout.kinds[row * layout.columns + column] === VOXEL_WALL) {
      const plane = face === "south" ? row + 1 : face === "north" ? row : face === "east" ? column + 1 : column;
      return { column, row, plane };
    }
    column += step[0];
    row += step[1];
  }
  return null;
}
