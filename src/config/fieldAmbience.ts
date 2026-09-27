import type { MapId } from "./maps.ts";

/**
 * 歩行マップ(フィールド・町・村)へ常時うすく重ねる環境エフェクト。
 * 背景画像・Collision・入力・セーブには一切触れず、見た目だけを足す。数値はすべてTEMP_TEST_VALUE(人間の視覚調整対象)。
 *
 * - cloudShadows: 地面をゆっくり横切る雲の影。地面と一緒にスクロールする(視差1)。
 * - mist: 夜の薄い霧。雲の影と同じ動きで、暗くするのではなく淡く明るく重ねる(加算)。
 * - motes: 画面内を漂う小さな粒(光の粒・花粉・落ち葉・ほこり)。少しだけ視差をつけて奥行きを出す。
 * - sunRays: 画面左上から差す木漏れ日の帯。ゆっくり明滅する。
 * - gusts: ときどき吹く風。粒が横へ流れ、雲が少し速くなる。単調さを避けるための揺らぎ。
 *
 * 異変(Glitch)とは別物。ここでは不穏さを出さない。
 */

export interface Range {
  readonly min: number;
  readonly max: number;
}

export interface CloudShadowConfig {
  readonly count: number;
  /** 画面ピクセル。楕円の横幅。 */
  readonly width: Range;
  readonly alpha: Range;
  /** 画面ピクセル/秒。正で右へ流れる。 */
  readonly driftX: number;
  readonly driftY: number;
  readonly color: number;
}

export type MoteKind = "glow" | "leaf" | "dust";

export interface MoteConfig {
  readonly kind: MoteKind;
  readonly count: number;
  /** 画面ピクセル(960×720、旧基準の3倍)。落ち葉は長さ、光の粒・ほこりは芯の直径。 */
  readonly size: Range;
  readonly alpha: Range;
  readonly colors: readonly number[];
  /** 画面ピクセル/秒の基本速度。 */
  readonly velocityX: Range;
  readonly velocityY: Range;
  /** 横揺れの振幅(画面ピクセル)と周期(ミリ秒)。 */
  readonly swayAmplitude: Range;
  readonly swayPeriodMs: Range;
  /** 明滅の周期(ミリ秒)。0なら明滅しない。 */
  readonly twinklePeriodMs: Range;
  /** カメラ移動に対する追従率。1で地面と同じ、0で画面に固定。 */
  readonly parallax: number;
}

export interface SunRayConfig {
  readonly count: number;
  readonly color: number;
  readonly alpha: Range;
  readonly pulsePeriodMs: Range;
}

export interface GustConfig {
  readonly intervalMs: Range;
  readonly durationMs: Range;
  /** 風の最大強さ(画面ピクセル/秒の横速度加算)。 */
  readonly strength: Range;
}

export interface FieldAmbienceProfile {
  readonly id: string;
  readonly cloudShadows?: CloudShadowConfig;
  readonly mist?: CloudShadowConfig;
  readonly motes: readonly MoteConfig[];
  readonly sunRays?: SunRayConfig;
  readonly gusts?: GustConfig;
}

const CLOUDS_OPEN: CloudShadowConfig = {
  count: 3,
  width: { min: 520, max: 820 },
  alpha: { min: 0.12, max: 0.17 },
  driftX: 9,
  driftY: 3.5,
  color: 0x14203a,
};

const GUSTS_GENTLE: GustConfig = {
  intervalMs: { min: 9000, max: 17000 },
  durationMs: { min: 1800, max: 3200 },
  strength: { min: 22, max: 46 },
};

const POLLEN: MoteConfig = {
  kind: "glow",
  count: 14,
  size: { min: 5, max: 9 },
  alpha: { min: 0.22, max: 0.5 },
  colors: [0xfff4c8, 0xf6ffd8, 0xffffff],
  velocityX: { min: 4, max: 14 },
  velocityY: { min: -12, max: -4 },
  swayAmplitude: { min: 10, max: 24 },
  swayPeriodMs: { min: 3200, max: 6200 },
  twinklePeriodMs: { min: 1800, max: 3600 },
  parallax: 1.08,
};

const FOREST_LEAVES: MoteConfig = {
  kind: "leaf",
  count: 7,
  size: { min: 16, max: 24 },
  alpha: { min: 0.7, max: 0.88 },
  // 森の緑に溶けないよう、若葉の黄緑・色づいた黄・枯れ葉の橙にする。
  colors: [0xd6e57a, 0xecc85a, 0xe0a04a, 0xc4d86a],
  velocityX: { min: 10, max: 26 },
  velocityY: { min: 26, max: 42 },
  swayAmplitude: { min: 22, max: 44 },
  swayPeriodMs: { min: 2200, max: 3600 },
  twinklePeriodMs: { min: 0, max: 0 },
  parallax: 1.15,
};

const FOREST_GLOW: MoteConfig = {
  ...POLLEN,
  count: 10,
  colors: [0xf4ffcf, 0xffeeb0],
  velocityX: { min: -3, max: 4 },
  velocityY: { min: -5, max: -1 },
};

const TOWN_PETALS: MoteConfig = {
  kind: "leaf",
  count: 4,
  size: { min: 11, max: 15 },
  alpha: { min: 0.5, max: 0.72 },
  colors: [0xffd6de, 0xfff1f3, 0xf6c1cc],
  velocityX: { min: 16, max: 30 },
  velocityY: { min: 16, max: 28 },
  swayAmplitude: { min: 16, max: 32 },
  swayPeriodMs: { min: 2400, max: 3800 },
  twinklePeriodMs: { min: 0, max: 0 },
  parallax: 1.12,
};

const FIREFLIES: MoteConfig = {
  kind: "glow",
  count: 10,
  size: { min: 8, max: 12 },
  alpha: { min: 0.6, max: 0.9 },
  colors: [0xe8ff8c, 0xfff2a0, 0xd4ff9a],
  velocityX: { min: -6, max: 6 },
  velocityY: { min: -5, max: 3 },
  swayAmplitude: { min: 16, max: 34 },
  swayPeriodMs: { min: 3800, max: 7200 },
  twinklePeriodMs: { min: 1400, max: 2800 },
  parallax: 1.06,
};

const INDOOR_DUST: MoteConfig = {
  kind: "dust",
  count: 12,
  size: { min: 3, max: 6 },
  alpha: { min: 0.12, max: 0.3 },
  colors: [0xfff1d2, 0xffffff],
  velocityX: { min: -2, max: 3 },
  velocityY: { min: -3, max: 2 },
  swayAmplitude: { min: 4, max: 10 },
  swayPeriodMs: { min: 4200, max: 7800 },
  twinklePeriodMs: { min: 2600, max: 5200 },
  parallax: 1.04,
};

export const FIELD_AMBIENCE_PROFILES = {
  /** 夜の野営地(No.01夜版)。蛍と、谷からの薄い霧。焚き火の明かりは背景に任せ、ここでは足さない。 */
  night: {
    id: "night",
    mist: {
      count: 3,
      width: { min: 560, max: 860 },
      alpha: { min: 0.06, max: 0.1 },
      driftX: 6,
      driftY: -1.5,
      color: 0xa9c4e8,
    },
    motes: [FIREFLIES],
  },
  /** 昼の草原・水辺。雲の影と花粉、ときどきの風(No.01昼版の背景が入ったらこちらへ切り替える)。 */
  meadow: {
    id: "meadow",
    cloudShadows: CLOUDS_OPEN,
    motes: [POLLEN],
    gusts: GUSTS_GENTLE,
  },
  /** 森。木漏れ日・落ち葉・光の粒。木々で雲の影はほぼ見えないため入れない。 */
  forest: {
    id: "forest",
    motes: [FOREST_LEAVES, FOREST_GLOW],
    sunRays: { count: 3, color: 0xfff2c4, alpha: { min: 0.06, max: 0.12 }, pulsePeriodMs: { min: 5200, max: 8200 } },
    gusts: GUSTS_GENTLE,
  },
  /** 町・村(屋外)。雲の影と花びらを少しだけ。人の多い画面を邪魔しない密度にとどめる。 */
  town: {
    id: "town",
    cloudShadows: { ...CLOUDS_OPEN, count: 2, alpha: { min: 0.1, max: 0.14 } },
    motes: [{ ...POLLEN, count: 8 }, TOWN_PETALS],
    gusts: GUSTS_GENTLE,
  },
  /** ビーエのむら。既存の異変表示を読みやすく保つため、雲の影と少しの花粉だけ。 */
  quietVillage: {
    id: "quietVillage",
    cloudShadows: { ...CLOUDS_OPEN, count: 2, alpha: { min: 0.09, max: 0.12 } },
    motes: [{ ...POLLEN, count: 6 }],
  },
  /** 城の中(2D)。窓の光に浮かぶほこりだけ。風・雲は無し。 */
  indoor: {
    id: "indoor",
    motes: [{ ...INDOOR_DUST, count: 8 }],
  },
} as const satisfies Record<string, FieldAmbienceProfile>;

/**
 * マップごとの割り当て。ここに無いマップ(洞窟・塔・まじんのどうくつ・3D城など)は何も重ねない。
 * 洞窟・塔は不穏さや暗さを優先するため、雰囲気が決まるまで入れない(追加はこの表へ1行足すだけ)。
 */
export const FIELD_AMBIENCE_BY_MAP: Partial<Record<MapId, FieldAmbienceProfile>> = {
  // 2026-09-26: 現行No.01の背景は夜版のみ。昼版の背景が入ったら時間帯で meadow と切り替える。
  map_01_starting_place: FIELD_AMBIENCE_PROFILES.night,
  map_02_starting_town: FIELD_AMBIENCE_PROFILES.town,
  map_starting_forest: FIELD_AMBIENCE_PROFILES.forest,
  map_03_bie_village: FIELD_AMBIENCE_PROFILES.quietVillage,
  map_rainland_forest_1: FIELD_AMBIENCE_PROFILES.forest,
  map_rainland_forest_2: FIELD_AMBIENCE_PROFILES.forest,
  map_rainland_castle_town: FIELD_AMBIENCE_PROFILES.town,
  map_05_rainland_castle: FIELD_AMBIENCE_PROFILES.indoor,
  map_zabon_village: FIELD_AMBIENCE_PROFILES.town,
  map_dakoha_port: FIELD_AMBIENCE_PROFILES.town,
  map_hidden_village: FIELD_AMBIENCE_PROFILES.town,
  // 石になった静かな町。風・雲・花びらは動かさず、石の粉のようなほこらだけをただよわせる(時間が止まった印象)。
  map_stone_town: FIELD_AMBIENCE_PROFILES.indoor,
};

/** タッチ端末(iPhone Safari想定)では粒の数をこの割合へ減らす。 */
export const FIELD_AMBIENCE_TOUCH_COUNT_SCALE = 0.6;
/** OSの「視差効果を減らす」設定時の粒の数の割合。雲の影・木漏れ日は動きが遅いので残す。 */
export const FIELD_AMBIENCE_REDUCED_MOTION_COUNT_SCALE = 0.3;

/**
 * 表示順。背景(0)・異変(5〜6)・主人公(1000)より上、DEVの表示(2000)・会話(2500)・メニュー(3000)より下。
 * 雲の影は人物にもかかる方が自然なので人物より上に置く。
 */
export const FIELD_AMBIENCE_DEPTH = {
  cloudShadow: 1300,
  mist: 1305,
  sunRay: 1310,
  mote: 1320,
} as const;
