import { MAJIN_CAVE_GRID } from "../config/majinCave.ts";
import type { MajinCavePoint } from "../config/majinCave.ts";

export interface MajinCaveRoom {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly center: MajinCavePoint;
}

export interface MajinCaveFloorLayout {
  readonly floorNumber: number;
  readonly seed: number;
  /** true is a walkable logical cell. Rendering never infers this from tiles. */
  readonly grid: readonly (readonly boolean[])[];
  readonly playerEntry: MajinCavePoint;
  readonly upStair: MajinCavePoint;
  readonly downStair: MajinCavePoint | null;
  readonly bossPosition: MajinCavePoint | null;
  readonly rooms: readonly MajinCaveRoom[];
}

export function floorSeed(runSeed: number, floorNumber: number): number {
  return (Math.imul(runSeed >>> 0, 0x9e3779b1) ^ Math.imul(floorNumber, 0x85ebca6b)) >>> 0;
}

export function createMajinCaveRandom(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMajinCaveFloor(runSeed: number, floorNumber: number): MajinCaveFloorLayout {
  if (!Number.isInteger(floorNumber) || floorNumber < 1 || floorNumber > 10) {
    throw new Error(`No.08 floor must be 1–10, received ${floorNumber}`);
  }
  const seed = floorSeed(runSeed, floorNumber);
  return floorNumber === 10 ? generateBossFloor(seed) : generateRoomsFloor(seed, floorNumber);
}

export function isMajinCaveWalkable(grid: readonly (readonly boolean[])[], point: MajinCavePoint): boolean {
  return point.y >= 0 && point.y < grid.length && point.x >= 0 && point.x < (grid[point.y]?.length ?? 0) && grid[point.y][point.x];
}

export function getMajinCaveWalkableCells(grid: readonly (readonly boolean[])[]): MajinCavePoint[] {
  const cells: MajinCavePoint[] = [];
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) if (grid[y][x]) cells.push({ x, y });
  }
  return cells;
}

export function isMajinCaveConnected(grid: readonly (readonly boolean[])[], from: MajinCavePoint, target: MajinCavePoint): boolean {
  return shortestMajinCavePath(grid, from, target) !== null;
}

/** Breadth-first path with optional occupied cells. The target is allowed so enemies can path toward the player. */
export function shortestMajinCavePath(
  grid: readonly (readonly boolean[])[],
  from: MajinCavePoint,
  target: MajinCavePoint,
  occupied: readonly MajinCavePoint[] = [],
): MajinCavePoint[] | null {
  if (!isMajinCaveWalkable(grid, from) || !isMajinCaveWalkable(grid, target)) return null;
  const targetKey = pointKey(target);
  const blocked = new Set(occupied.map(pointKey));
  blocked.delete(pointKey(from));
  blocked.delete(targetKey);
  const queue: MajinCavePoint[] = [from];
  const previous = new Map<string, MajinCavePoint | null>([[pointKey(from), null]]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (pointKey(current) === targetKey) {
      const path: MajinCavePoint[] = [];
      let cursor: MajinCavePoint | null = current;
      while (cursor) {
        path.unshift(cursor);
        cursor = previous.get(pointKey(cursor)) ?? null;
      }
      return path;
    }
    for (const next of neighbours(current)) {
      const key = pointKey(next);
      if (!isMajinCaveWalkable(grid, next) || blocked.has(key) || previous.has(key)) continue;
      previous.set(key, current);
      queue.push(next);
    }
  }
  return null;
}

export function pointKey(point: MajinCavePoint): string {
  return `${point.x},${point.y}`;
}

function generateRoomsFloor(seed: number, floorNumber: number): MajinCaveFloorLayout {
  const random = createMajinCaveRandom(seed);
  const grid = blankGrid();
  const rooms: MajinCaveRoom[] = [];
  for (let attempt = 0; attempt < 90 && rooms.length < 5; attempt += 1) {
    const width = randomInt(random, 4, 7);
    const height = randomInt(random, 3, 5);
    const x = randomInt(random, 1, MAJIN_CAVE_GRID.columns - width - 2);
    const y = randomInt(random, 1, MAJIN_CAVE_GRID.rows - height - 2);
    const room = makeRoom(x, y, width, height);
    if (rooms.some((existing) => roomsOverlap(existing, room, 1))) continue;
    carveRoom(grid, room);
    rooms.push(room);
  }
  if (rooms.length < 4) return generateFallbackFloor(seed, floorNumber);

  for (let index = 1; index < rooms.length; index += 1) connectRooms(grid, rooms[index - 1].center, rooms[index].center, random);
  const playerEntry = rooms[0].center;
  const farthest = findFarthestReachable(grid, playerEntry);
  return { floorNumber, seed, grid, playerEntry, upStair: playerEntry, downStair: farthest, bossPosition: null, rooms };
}

function generateBossFloor(seed: number): MajinCaveFloorLayout {
  const grid = blankGrid();
  const corridor: MajinCaveRoom = makeRoom(2, 7, 10, 3);
  const bossRoom: MajinCaveRoom = makeRoom(12, 4, 10, 9);
  carveRoom(grid, corridor);
  carveRoom(grid, bossRoom);
  carveHorizontal(grid, 10, 8, 13);
  const playerEntry = { x: 3, y: 8 };
  const bossPosition = { x: 18, y: 8 };
  return {
    floorNumber: 10,
    seed,
    grid,
    playerEntry,
    upStair: playerEntry,
    downStair: null,
    bossPosition,
    rooms: [corridor, bossRoom],
  };
}

function generateFallbackFloor(seed: number, floorNumber: number): MajinCaveFloorLayout {
  const grid = blankGrid();
  const rooms = [
    makeRoom(2, 2, 5, 4), makeRoom(10, 2, 5, 4), makeRoom(3, 10, 5, 4), makeRoom(15, 9, 6, 5),
  ];
  for (const room of rooms) carveRoom(grid, room);
  const random = createMajinCaveRandom(seed);
  for (let index = 1; index < rooms.length; index += 1) connectRooms(grid, rooms[index - 1].center, rooms[index].center, random);
  const playerEntry = rooms[0].center;
  return {
    floorNumber,
    seed,
    grid,
    playerEntry,
    upStair: playerEntry,
    downStair: findFarthestReachable(grid, playerEntry),
    bossPosition: null,
    rooms,
  };
}

function blankGrid(): boolean[][] {
  return Array.from({ length: MAJIN_CAVE_GRID.rows }, () => Array.from({ length: MAJIN_CAVE_GRID.columns }, () => false));
}

function makeRoom(x: number, y: number, width: number, height: number): MajinCaveRoom {
  return { x, y, width, height, center: { x: x + Math.floor(width / 2), y: y + Math.floor(height / 2) } };
}

function roomsOverlap(first: MajinCaveRoom, second: MajinCaveRoom, padding: number): boolean {
  return first.x - padding < second.x + second.width && first.x + first.width + padding > second.x && first.y - padding < second.y + second.height && first.y + first.height + padding > second.y;
}

function carveRoom(grid: boolean[][], room: MajinCaveRoom): void {
  for (let y = room.y; y < room.y + room.height; y += 1) for (let x = room.x; x < room.x + room.width; x += 1) grid[y][x] = true;
}

function connectRooms(grid: boolean[][], from: MajinCavePoint, to: MajinCavePoint, random: () => number): void {
  if (random() < 0.5) {
    carveHorizontal(grid, from.x, from.y, to.x);
    carveVertical(grid, to.x, from.y, to.y);
  } else {
    carveVertical(grid, from.x, from.y, to.y);
    carveHorizontal(grid, from.x, to.y, to.x);
  }
}

function carveHorizontal(grid: boolean[][], startX: number, y: number, endX: number): void {
  for (let x = Math.min(startX, endX); x <= Math.max(startX, endX); x += 1) grid[y][x] = true;
}

function carveVertical(grid: boolean[][], x: number, startY: number, endY: number): void {
  for (let y = Math.min(startY, endY); y <= Math.max(startY, endY); y += 1) grid[y][x] = true;
}

function findFarthestReachable(grid: readonly (readonly boolean[])[], start: MajinCavePoint): MajinCavePoint {
  const queue: MajinCavePoint[] = [start];
  const distances = new Map<string, number>([[pointKey(start), 0]]);
  let farthest = start;
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const currentDistance = distances.get(pointKey(current)) ?? 0;
    const farthestDistance = distances.get(pointKey(farthest)) ?? 0;
    if (currentDistance > farthestDistance) farthest = current;
    for (const next of neighbours(current)) {
      const key = pointKey(next);
      if (!isMajinCaveWalkable(grid, next) || distances.has(key)) continue;
      distances.set(key, currentDistance + 1);
      queue.push(next);
    }
  }
  return farthest;
}

function neighbours(point: MajinCavePoint): MajinCavePoint[] {
  return [{ x: point.x, y: point.y - 1 }, { x: point.x - 1, y: point.y }, { x: point.x + 1, y: point.y }, { x: point.x, y: point.y + 1 }];
}

function randomInt(random: () => number, minimum: number, maximum: number): number {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}
