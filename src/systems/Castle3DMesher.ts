/**
 * ブロック城(3D)の床・壁・天井ブロックを、材質ごとに1つのジオメトリへまとめる(three.js非依存、Nodeテスト可能)。
 * - 置く箱(VoxelBox)の位置・大きさ・材質は従来のInstancedMeshと同じ。見た目のUVもBoxGeometry(1,1,1)と完全に同じ。
 * - 隣が埋まっている面は描かない(見えない面を省いて軽くする)。
 * - 頂点ごとのアンビエントオクルージョン(角・壁ぎわ・天井の隅がやわらかく暗くなる。マイクラの「なめらかな照明」と同じ方式)。
 */

/** 1つの箱。(x, y, z)は中心、(sx, sy, sz)は大きさ(ブロック)。 */
export interface VoxelBox {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly sx: number;
  readonly sy: number;
  readonly sz: number;
}

/** 1ブロック単位の占有グリッド。levelはy座標の整数部(minLevelから)。 */
export interface OccupancyGrid {
  readonly columns: number;
  readonly rows: number;
  readonly minLevel: number;
  readonly levels: number;
  readonly data: Uint8Array;
}

export interface MeshedGroup {
  readonly key: string;
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly uvs: Float32Array;
  /** 頂点色(AOの明るさ、RGB同値)。 */
  readonly colors: Float32Array;
  readonly indices: Uint32Array;
  readonly faceCount: number;
}

/** 隠れている角の数(0〜3)ごとの明るさ。0 = 何も接していない。 */
export type AoCurve = readonly [number, number, number, number];
export const DEFAULT_AO_CURVE: AoCurve = [1, 0.84, 0.7, 0.56];

type Axis = 0 | 1 | 2;

interface FaceTemplate {
  readonly normal: readonly [number, number, number];
  /** 4頂点(BoxGeometryと同じ順)。単位立方体(-0.5〜0.5)の座標とUV。 */
  readonly corners: readonly { readonly position: readonly [number, number, number]; readonly uv: readonly [number, number] }[];
}

/**
 * three.jsのBoxGeometry(1,1,1)と同じ面の順(+x, -x, +y, -y, +z, -z)・頂点順・UVを作る(buildPlaneと同じ計算)。
 * テクスチャの向き(絨毯の金の縁・蛇腹の青い帯など)を従来と1ピクセルも変えないため。
 */
function buildFaceTemplates(): FaceTemplate[] {
  const plane = (u: Axis, v: Axis, w: Axis, udir: number, vdir: number, depth: number): FaceTemplate => {
    const corners: FaceTemplate["corners"][number][] = [];
    for (let iy = 0; iy < 2; iy += 1) {
      for (let ix = 0; ix < 2; ix += 1) {
        const position: [number, number, number] = [0, 0, 0];
        position[u] = (ix - 0.5) * udir;
        position[v] = (iy - 0.5) * vdir;
        position[w] = depth / 2;
        corners.push({ position, uv: [ix, 1 - iy] });
      }
    }
    const normal: [number, number, number] = [0, 0, 0];
    normal[w] = depth > 0 ? 1 : -1;
    return { normal, corners };
  };
  return [
    plane(2, 1, 0, -1, -1, 1),
    plane(2, 1, 0, 1, -1, -1),
    plane(0, 2, 1, 1, 1, 1),
    plane(0, 2, 1, 1, -1, -1),
    plane(0, 1, 2, 1, -1, 1),
    plane(0, 1, 2, -1, -1, -1),
  ];
}

export const BOX_FACES: readonly FaceTemplate[] = buildFaceTemplates();

const EPSILON = 0.01;

/** 箱が中心を含む1ブロックのセルを埋める。半端な箱(厚さ0.5の天井の段など)はセルの中心を含まないので埋めない。 */
export function buildOccupancy(boxes: readonly VoxelBox[], columns: number, rows: number, minLevel: number, maxLevel: number): OccupancyGrid {
  const levels = maxLevel - minLevel + 1;
  const data = new Uint8Array(columns * rows * levels);
  for (const box of boxes) {
    const range = (center: number, size: number, low: number, high: number): [number, number] => {
      const min = center - size / 2;
      const max = center + size / 2;
      return [Math.max(low, Math.ceil(min + EPSILON - 0.5)), Math.min(high, Math.floor(max - EPSILON - 0.5))];
    };
    const [x0, x1] = range(box.x, box.sx, 0, columns - 1);
    const [z0, z1] = range(box.z, box.sz, 0, rows - 1);
    const [y0, y1] = range(box.y, box.sy, minLevel, maxLevel);
    for (let y = y0; y <= y1; y += 1) {
      for (let z = z0; z <= z1; z += 1) {
        for (let x = x0; x <= x1; x += 1) data[((y - minLevel) * rows + z) * columns + x] = 1;
      }
    }
  }
  return { columns, rows, minLevel, levels, data };
}

/** 点(x, y, z)を含むセルが埋まっているか。グリッドの外は空とみなす。 */
export function isOccupied(grid: OccupancyGrid, x: number, y: number, z: number): boolean {
  const column = Math.floor(x);
  const row = Math.floor(z);
  const level = Math.floor(y) - grid.minLevel;
  if (column < 0 || row < 0 || level < 0 || column >= grid.columns || row >= grid.rows || level >= grid.levels) return false;
  return grid.data[(level * grid.rows + row) * grid.columns + column] === 1;
}

function isUnitBox(box: VoxelBox): boolean {
  return box.sx === 1 && box.sy === 1 && box.sz === 1;
}

/**
 * 頂点のAO段階(0〜3)。面の外側の層で、頂点に接する3つのセル(辺の両側と角)がいくつ埋まっているか。
 * 両側の辺が埋まっていれば角に関係なく最も暗い(3)。
 */
export function vertexOcclusion(
  grid: OccupancyGrid,
  vertex: readonly [number, number, number],
  normal: readonly [number, number, number],
  toward1: readonly [number, number, number],
  toward2: readonly [number, number, number],
): number {
  const sample = (a: number, b: number): boolean => isOccupied(
    grid,
    vertex[0] + normal[0] * 0.5 + toward1[0] * a * 0.5 + toward2[0] * b * 0.5,
    vertex[1] + normal[1] * 0.5 + toward1[1] * a * 0.5 + toward2[1] * b * 0.5,
    vertex[2] + normal[2] * 0.5 + toward1[2] * a * 0.5 + toward2[2] * b * 0.5,
  );
  const side1 = sample(1, -1);
  const side2 = sample(-1, 1);
  const corner = sample(1, 1);
  if (side1 && side2) return 3;
  return (side1 ? 1 : 0) + (side2 ? 1 : 0) + (corner ? 1 : 0);
}

/** 箱の一覧を材質(key)ごとに1つのジオメトリへまとめる。 */
export function meshVoxelBoxes(boxes: readonly VoxelBox[], grid: OccupancyGrid, aoCurve: AoCurve = DEFAULT_AO_CURVE): Map<string, MeshedGroup> {
  const builders = new Map<string, { positions: number[]; normals: number[]; uvs: number[]; colors: number[]; indices: number[] }>();
  for (const box of boxes) {
    const builder = builders.get(box.key) ?? { positions: [], normals: [], uvs: [], colors: [], indices: [] };
    builders.set(box.key, builder);
    const unit = isUnitBox(box);
    for (const face of BOX_FACES) {
      const [nx, ny, nz] = face.normal;
      // 1ブロックの箱は、隣のセルが埋まっていれば見えないので描かない。
      if (unit && isOccupied(grid, box.x + nx, box.y + ny, box.z + nz)) continue;
      const base = builder.positions.length / 3;
      const brightness: number[] = [];
      for (const corner of face.corners) {
        const vertex: [number, number, number] = [
          box.x + corner.position[0] * box.sx,
          box.y + corner.position[1] * box.sy,
          box.z + corner.position[2] * box.sz,
        ];
        // 面の中心から頂点へ向かう2方向(面に沿った軸だけ)。
        const toward1: [number, number, number] = [0, 0, 0];
        const toward2: [number, number, number] = [0, 0, 0];
        const tangents = ([0, 1, 2] as const).filter((axis) => face.normal[axis] === 0);
        toward1[tangents[0]] = Math.sign(corner.position[tangents[0]]);
        toward2[tangents[1]] = Math.sign(corner.position[tangents[1]]);
        const light = aoCurve[vertexOcclusion(grid, vertex, face.normal, toward1, toward2)];
        brightness.push(light);
        builder.positions.push(...vertex);
        builder.normals.push(nx, ny, nz);
        builder.uvs.push(corner.uv[0], corner.uv[1]);
        builder.colors.push(light, light, light);
      }
      // 頂点順: 0=(左下) 1=(右下) 2=(左上) 3=(右上)を一周すると 0→2→3→1。
      // 明るい2頂点どうしを対角線で結ぶと、AOのにじみが面の向きで偏らない(異方性の修正)。
      const [a, d, b, c] = [base, base + 1, base + 2, base + 3];
      if (brightness[0] + brightness[3] > brightness[1] + brightness[2]) builder.indices.push(a, b, c, a, c, d);
      else builder.indices.push(a, b, d, b, c, d);
    }
  }
  const groups = new Map<string, MeshedGroup>();
  for (const [key, builder] of builders) {
    groups.set(key, {
      key,
      positions: Float32Array.from(builder.positions),
      normals: Float32Array.from(builder.normals),
      uvs: Float32Array.from(builder.uvs),
      colors: Float32Array.from(builder.colors),
      indices: Uint32Array.from(builder.indices),
      faceCount: builder.indices.length / 6,
    });
  }
  return groups;
}
