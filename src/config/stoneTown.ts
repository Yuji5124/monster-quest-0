import { STORY_FLAGS } from "./storyFlags.ts";

/**
 * No.18いしのまち。町の人・動物が生活の途中で石になった町。ここには数値と、データファイルに置かない語りだけを置く。
 * 石像ごとの台詞は assets/maps/stone_town/objects.json(DIALOGUE_DRAFT。石化の原因・正体は未確定なので断定しない)。
 * 演出の数値はすべてTEMP_TEST_VALUE(人間の視覚・テンポ調整対象)。
 */

/** 初めて町へ入った直後の語り。町の人も動物も生活の途中で石になっていることが一目で分かるようにする。 */
export const STONE_TOWN_ENTRY = {
  flag: STORY_FLAGS.stoneTownEntered,
  pages: [
    "……しずかだ。\nかぜの　おとしか　しない。",
    "ひとも　いぬも　とりも\nくらしの　とちゅうの　すがたの　まま\nつめたい　いしに　なって　いる。",
  ],
  /** フェードインを待ってから語りを出す。 */
  delayMs: 700,
} as const;

/** 広場の石像が目覚める演出(カメラ・光・ひび・石の壁の崩落)のタイムライン。 */
export const STONE_TOWN_AWAKENING = {
  /** 星へカメラを寄せる。 */
  focusStarMs: 900,
  starZoom: 1.35,
  /** 星が光り始めてから、ひび・粉じんまでの間。 */
  glowMs: 900,
  glowRadius: 92,
  glowColor: 0xfff2c0,
  flashMs: 260,
  /** 広場の床へひびが走る時間と、ひびの数・長さ(ワールドpx)。 */
  crackMs: 1300,
  crackCount: 11,
  crackLength: { min: 150, max: 330 },
  crackColor: 0x3a3c48,
  /** ひびを描く範囲 = 石像＋噴水の矩形からの余白(ネイティブpx)。広場の外の建物へはみ出さない。 */
  crackClipMargin: { left: 110, top: 40, right: 110, bottom: 100 },
  /** 北の階段の石の壁へカメラを移して崩す。 */
  focusBarrierMs: 800,
  barrierZoom: 1.2,
  crumbleMs: 900,
  crumbleStaggerMs: 480,
  /** 主人公へカメラを戻す。 */
  returnMs: 800,
  /** 石像の粉じん・光の粒の量。 */
  dustCount: 26,
  moteCount: 22,
} as const;

/** 目覚めた後の町。石像の頭上にただよう光の粒と、星のやわらかな光。 */
export const STONE_TOWN_LIFE = {
  moteIntervalMs: 900,
  moteRiseWorldPx: 42,
  moteLifeMs: 2000,
  moteColor: 0xfff0c8,
  starGlowRadius: 46,
  starGlowAlpha: { min: 0.22, max: 0.5 },
  starGlowPeriodMs: 2600,
} as const;

/** 石の壁(がれき)の見た目。ワールド座標ではなく壁の矩形に対する割合で置く。 */
export const STONE_RUBBLE = {
  count: 13,
  colors: [0x8a8b95, 0x9a9ba5, 0x7c7d88, 0xa8a9b2],
  depth: 935,
} as const;
