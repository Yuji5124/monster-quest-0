import { STORY_FLAGS } from "./storyFlags.ts";

/**
 * No.17「ぬまちのどうくつ」最初の短いアクション区画。
 *
 * 座標はユーザー提供の俯瞰背景（1672×941）と同じ background-pixels。
 * 数値はこの縦切り出し用の TEMP_TEST_VALUE であり、通常の BattleSystem の
 * モンスター／成長バランスを変更しない。
 */
export type SwampCaveAbilityId = "hero_sword" | "tarosa_bow" | "mirei_magic";

export interface SwampCavePoint {
  readonly x: number;
  readonly y: number;
}

export interface SwampCaveRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** 主区画の高所同士をつなぐ、幅を持った根道／橋。 */
export interface SwampCaveRootPath {
  readonly from: SwampCavePoint;
  readonly to: SwampCavePoint;
  readonly width: number;
}

export interface SwampCaveEnemySpawn extends SwampCavePoint {
  readonly id: string;
}

export const SWAMP_CAVE_ACTION = {
  mapId: "map_swamp_cave",
  sceneKey: "SwampCaveActionScene",
  /** 最奥の短い宝箱区画だけに表示する背景データ。主区画の地形には使わない。 */
  finalBackgroundKey: "map.swamp-cave.final-background",
  finalBackgroundPath: new URL("../../assets/maps/reference/reference/新しいフォルダー/ぬまちのどうくつ.png", import.meta.url).toString(),
  world: { width: 1672, height: 941 },
  playerStart: { x: 800, y: 790 } satisfies SwampCavePoint,
  exit: { x: 835, y: 118, radius: 64 } satisfies SwampCavePoint & { readonly radius: number },
  chest: { x: 840, y: 302, radius: 58 } satisfies SwampCavePoint & { readonly radius: number },
  player: {
    endurance: 6,
    moveSpeed: 190,
    hurtInvulnerableMs: 850,
  },
  terrain: {
    /**
     * 人物が乗れる足場。暗い洞窟の奥へ直進して近道できないよう、移動の正本もここに置く。
     * 見た目は Scene が同じデータを描画するため、人間の経路調整はこの配列だけで行える。
     */
    platforms: [
      { x: 620, y: 734, width: 390, height: 142 },
      { x: 676, y: 570, width: 260, height: 140 },
      { x: 656, y: 300, width: 350, height: 238 },
      { x: 1040, y: 278, width: 260, height: 144 },
      { x: 388, y: 272, width: 240, height: 168 },
      { x: 748, y: 112, width: 184, height: 170 },
    ] satisfies readonly SwampCaveRect[],
    /** 根道は足場のあいだをつなぐ安全で速い導線。 */
    roots: [
      { from: { x: 800, y: 746 }, to: { x: 800, y: 520 }, width: 32 },
      { from: { x: 906, y: 520 }, to: { x: 1050, y: 386 }, width: 32 },
      { from: { x: 680, y: 430 }, to: { x: 540, y: 398 }, width: 32 },
      { from: { x: 840, y: 320 }, to: { x: 840, y: 248 }, width: 32 },
    ] satisfies readonly SwampCaveRootPath[],
    /** 水面に足を取られる浅瀬。必ず抜けられる速度に留める。 */
    swamp: [
      { x: 606, y: 610, width: 244, height: 174 },
      { x: 890, y: 538, width: 244, height: 168 },
      { x: 496, y: 330, width: 188, height: 142 },
    ] satisfies readonly SwampCaveRect[],
    /** 高い足場・橋・根道。危険地帯を避ける速い導線として使う。 */
    fast: [
      { x: 706, y: 332, width: 274, height: 254 },
      { x: 690, y: 586, width: 220, height: 124 },
      { x: 1000, y: 302, width: 254, height: 98 },
      { x: 436, y: 302, width: 246, height: 104 },
    ] satisfies readonly SwampCaveRect[],
    swampMultiplier: 0.54,
    fastMultiplier: 1.28,
  },
  abilities: {
    hero_sword: { cooldownMs: 360, range: 92, damage: 3 },
    tarosa_bow: { cooldownMs: 520, range: 560, damage: 3 },
    mirei_magic: { cooldownMs: 940, range: 330, radius: 124, damage: 2, freezeMs: 1900 },
  },
  /** 名前・図鑑登録を伴わない、この区画だけの小型敵の一群。 */
  enemies: [
    { id: "swamp_cave_small_01", x: 722, y: 652 },
    { id: "swamp_cave_small_02", x: 820, y: 612 },
    { id: "swamp_cave_small_03", x: 930, y: 620 },
    { id: "swamp_cave_small_04", x: 690, y: 468 },
    { id: "swamp_cave_small_05", x: 976, y: 454 },
    { id: "swamp_cave_small_06", x: 806, y: 396 },
    { id: "swamp_cave_small_07", x: 884, y: 354 },
  ] satisfies readonly SwampCaveEnemySpawn[],
  enemy: {
    maxHp: 4,
    speed: 52,
    contactRadius: 34,
  },
  flags: {
    cleared: "event.swamp_cave_action_cleared",
    chestOpened: "chest.swamp_cave_inner_stone_town_item_opened",
  },
  /** 正式名称・ItemIdは未確定。取得だけでNo.18の解放フラグを立てる進行アイテム。 */
  reward: {
    displayName: "いしのまちへ進むためのアイテム",
    unlockFlag: STORY_FLAGS.stoneTownUnlocked,
  },
} as const;

export function isPointInSwampCaveRect(point: SwampCavePoint, bounds: SwampCaveRect): boolean {
  return point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
}

/** True when a point is on the wide root/bridge segment rather than in the impassable cave dark. */
export function isPointOnSwampCaveRoot(point: SwampCavePoint, root: SwampCaveRootPath): boolean {
  const dx = root.to.x - root.from.x;
  const dy = root.to.y - root.from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - root.from.x, point.y - root.from.y) <= root.width / 2;
  const projection = ((point.x - root.from.x) * dx + (point.y - root.from.y) * dy) / lengthSquared;
  const t = Math.max(0, Math.min(1, projection));
  return Math.hypot(point.x - (root.from.x + dx * t), point.y - (root.from.y + dy * t)) <= root.width / 2;
}

/** The block-built combat course is passable only on its platforms and connecting roots. */
export function isPointOnSwampCaveActionRoute(point: SwampCavePoint): boolean {
  return SWAMP_CAVE_ACTION.terrain.platforms.some((platform) => isPointInSwampCaveRect(point, platform))
    || SWAMP_CAVE_ACTION.terrain.roots.some((root) => isPointOnSwampCaveRoot(point, root));
}
