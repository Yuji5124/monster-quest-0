/**
 * No.19 バトラスのとりで用の決定的な部屋モジュール生成器。
 *
 * 砦の見た目は毎回違っても、本線(入口→中間地点→ボス前→ボス)は最初から
 * 一本の接続済み経路として作る。描画・Phaserには依存させず、seed再現と
 * 到達性検証をテスト可能に保つ。
 */
export const BATTLE_FORTRESS_TILE_SIZE = 32;

export type FortressRoomKind =
  | "entrance"
  | "combat"
  | "branch"
  | "prison"
  | "assembly"
  | "misprint"
  | "reconfigure"
  | "checkpoint"
  | "direct"
  | "boss-gate"
  | "boss";

export interface FortressRoom {
  readonly id: string;
  readonly kind: FortressRoomKind;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly mainPathIndex: number;
  readonly optional: boolean;
}

export interface FortressPoint {
  readonly x: number;
  readonly y: number;
}

export interface FortressTreasure {
  readonly id: "dokukeshi" | "kaifukuyaku";
  readonly tile: FortressPoint;
  readonly label: string;
}

export interface BattleFortressPlan {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  /** floor / wall / void。wallとvoidはいずれも移動不可で、描画だけを分ける。 */
  readonly tiles: readonly (readonly ("floor" | "wall" | "void")[])[];
  readonly rooms: readonly FortressRoom[];
  readonly entrance: FortressPoint;
  readonly boss: FortressPoint;
  readonly poisonHint: FortressPoint;
  readonly treasures: readonly FortressTreasure[];
  readonly mainPathRoomIds: readonly string[];
  readonly reachable: boolean;
}

export interface FortressRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const GRID_WIDTH = 166;
const GRID_HEIGHT = 30;
const MAIN_Y = 10;
const MAIN_ROOM_WIDTH = 12;
const MAIN_ROOM_HEIGHT = 10;
const ROOM_STEP = 16;

function seedFrom(value: string | number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value) >>> 0;
  const text = typeof value === "string" ? value.trim() || "1900" : "1900";
  if (/^\d+$/.test(text)) return Number(text) >>> 0;
  let hash = 2166136261;
  for (const character of text) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function createRandom(seed: number): () => number {
  let state = seed || 0x9e3779b9;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function carve(grid: boolean[][], x: number, y: number, width: number, height: number): void {
  for (let row = Math.max(0, y); row < Math.min(grid.length, y + height); row += 1) {
    for (let column = Math.max(0, x); column < Math.min(grid[0].length, x + width); column += 1) grid[row][column] = true;
  }
}

function roomCenter(room: Pick<FortressRoom, "x" | "y" | "width" | "height">): FortressPoint {
  return { x: room.x + Math.floor(room.width / 2), y: room.y + Math.floor(room.height / 2) };
}

/** True only if a walkable path exists in the finished tile grid. */
export function verifyBattleFortressPath(
  tiles: readonly (readonly ("floor" | "wall" | "void")[])[],
  entrance: FortressPoint,
  boss: FortressPoint,
): boolean {
  if (tiles[entrance.y]?.[entrance.x] !== "floor" || tiles[boss.y]?.[boss.x] !== "floor") return false;
  const visited = new Set<string>([`${entrance.x},${entrance.y}`]);
  const queue: FortressPoint[] = [entrance];
  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index];
    if (point.x === boss.x && point.y === boss.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next = { x: point.x + dx, y: point.y + dy };
      const key = `${next.x},${next.y}`;
      if (visited.has(key) || tiles[next.y]?.[next.x] !== "floor") continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return false;
}

/**
 * Deterministically lays out a compact 15–25 minute fortress. Optional rooms alter
 * silhouette and rewards, but can never break the pre-carved main route.
 */
export function generateBattleFortress(seedInput?: string | number): BattleFortressPlan {
  const seed = seedFrom(seedInput);
  const random = createRandom(seed);
  const floor = Array.from({ length: GRID_HEIGHT }, () => Array<boolean>(GRID_WIDTH).fill(false));
  const rooms: FortressRoom[] = [];
  const addRoom = (kind: FortressRoomKind, x: number, y: number, width: number, height: number, mainPathIndex: number, optional = false): FortressRoom => {
    const room: FortressRoom = { id: `room_${rooms.length + 1}`, kind, x, y, width, height, mainPathIndex, optional };
    rooms.push(room);
    carve(floor, x, y, width, height);
    return room;
  };

  const entranceRoom = addRoom("entrance", 2, MAIN_Y, MAIN_ROOM_WIDTH, MAIN_ROOM_HEIGHT, 0);
  const variableKinds: readonly FortressRoomKind[] = ["combat", "branch", "prison", "assembly", "misprint", "reconfigure"];
  // Three shuffled module selections ensure the same seed rebuilds identically while
  // the first traversal stays authored: normal → strange → reconstruction.
  const selected = Array.from({ length: 5 }, (_, index) => variableKinds[(index + Math.floor(random() * variableKinds.length)) % variableKinds.length]);
  const mainRooms = [entranceRoom];
  for (let index = 0; index < selected.length; index += 1) {
    const x = 2 + ROOM_STEP * (index + 1);
    mainRooms.push(addRoom(selected[index], x, MAIN_Y, MAIN_ROOM_WIDTH, MAIN_ROOM_HEIGHT, index + 1));
  }
  const checkpoint = addRoom("checkpoint", 2 + ROOM_STEP * 6, MAIN_Y, MAIN_ROOM_WIDTH, MAIN_ROOM_HEIGHT, 6);
  const direct = addRoom("direct", 2 + ROOM_STEP * 7, MAIN_Y + 2, MAIN_ROOM_WIDTH, 6, 7);
  const gate = addRoom("boss-gate", 2 + ROOM_STEP * 8, MAIN_Y + 3, 13, 4, 8);
  const bossRoom = addRoom("boss", 2 + ROOM_STEP * 9, MAIN_Y - 2, 16, 14, 9);
  mainRooms.push(checkpoint, direct, gate, bossRoom);

  // A small optional side room is a visual irregularity, never a mandatory branch.
  for (const hostIndex of [2, 4, 5]) {
    if (random() < 0.64) {
      const host = mainRooms[hostIndex];
      const above = random() < 0.5;
      const y = above ? 1 : GRID_HEIGHT - 8;
      const optional = addRoom(random() < 0.5 ? "branch" : "combat", host.x + 2, y, 8, 6, host.mainPathIndex, true);
      const fromY = above ? optional.y + optional.height - 1 : host.y + host.height - 1;
      const toY = above ? host.y : optional.y;
      carve(floor, host.x + 5, Math.min(fromY, toY), 3, Math.abs(toY - fromY) + 1);
    }
  }

  // Every adjacent main module is connected before optional content exists.
  for (let index = 0; index < mainRooms.length - 1; index += 1) {
    const left = mainRooms[index];
    const right = mainRooms[index + 1];
    const y = Math.max(left.y + Math.floor(left.height / 2) - 1, right.y + Math.floor(right.height / 2) - 1);
    carve(floor, left.x + left.width - 1, y, right.x - (left.x + left.width) + 2, 3);
  }

  const tiles = floor.map((row, y) => row.map((isFloor, x) => {
    if (isFloor) return "floor" as const;
    const touchesFloor = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => floor[y + dy]?.[x + dx]);
    return touchesFloor ? "wall" as const : "void" as const;
  }));
  const entrance = roomCenter(entranceRoom);
  const boss = roomCenter(bossRoom);
  const poisonHint = { x: checkpoint.x + 3, y: checkpoint.y + 3 };
  const treasures: FortressTreasure[] = [
    { id: "dokukeshi", tile: { x: checkpoint.x + 8, y: checkpoint.y + 6 }, label: "どくけし" },
    { id: "kaifukuyaku", tile: { x: direct.x + 8, y: direct.y + 3 }, label: "かいふくやく" },
  ];
  const reachable = verifyBattleFortressPath(tiles, entrance, boss);
  if (!reachable) throw new Error("BattleFortressGenerator produced an unreachable main path");
  return {
    seed, width: GRID_WIDTH, height: GRID_HEIGHT, tiles, rooms, entrance, boss, poisonHint, treasures,
    mainPathRoomIds: mainRooms.map((room) => room.id), reachable,
  };
}

/** Greedy collision rectangles; this keeps the generated map under the mobile physics budget. */
export function buildBattleFortressWallRects(plan: Pick<BattleFortressPlan, "tiles">): readonly FortressRect[] {
  const visited = plan.tiles.map((row) => row.map(() => false));
  const rects: FortressRect[] = [];
  for (let y = 0; y < plan.tiles.length; y += 1) {
    for (let x = 0; x < plan.tiles[y].length; x += 1) {
      if (visited[y][x] || plan.tiles[y][x] === "floor") continue;
      let width = 0;
      while (x + width < plan.tiles[y].length && !visited[y][x + width] && plan.tiles[y][x + width] !== "floor") width += 1;
      let height = 1;
      while (y + height < plan.tiles.length && Array.from({ length: width }, (_, column) =>
        !visited[y + height][x + column] && plan.tiles[y + height][x + column] !== "floor").every(Boolean)) height += 1;
      for (let row = y; row < y + height; row += 1) for (let column = x; column < x + width; column += 1) visited[row][column] = true;
      rects.push({ x, y, width, height });
    }
  }
  return rects;
}
