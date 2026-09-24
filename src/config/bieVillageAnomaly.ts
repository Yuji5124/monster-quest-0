/**
 * No.04「ビーエのむら」の小さな異変(チリチリ)。No.03ビーエのもりから続く地域の異変を、村の背景の一部が
 * 一瞬だけ乱れる程度に見せる。GLITCH_SPEC.mdの「本格的な異常は終盤」を守るため、文字・画面全体の乱れ・音は使わない。
 * 実データ・入力・進行フラグには一切触れない。数値はすべてTEMP_TEST_VALUE(見た目調整は人間側)。
 * 座標はbackground.png(ビーエのむら更新.png、1536×1024)のネイティブ背景ピクセル。
 */
export interface AnomalyRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface AnomalyHotspot {
  readonly id: string;
  /** チリチリ(小さな点ノイズ)が出やすい範囲。 */
  readonly area: AnomalyRect;
  /** 抽選の重み。 */
  readonly weight: number;
}

export interface MapAnomalyConfig {
  /** チリチリ(点ノイズ)の発生間隔[ms]。 */
  readonly sparkIntervalMs: { readonly min: number; readonly max: number };
  /** 1回のチリチリで出る点の数。 */
  readonly sparkCount: { readonly min: number; readonly max: number };
  /** 点1つの一辺[背景px]と表示時間[ms]。 */
  readonly sparkSize: { readonly min: number; readonly max: number };
  readonly sparkDurationMs: { readonly min: number; readonly max: number };
  readonly sparkColors: readonly number[];
  /** 横ずれ(背景の横帯が一瞬ずれる)の発生間隔[ms]・帯の高さ[背景px]・ずれ幅[背景px]・表示時間[ms]。 */
  readonly tearIntervalMs: { readonly min: number; readonly max: number };
  readonly tearHeight: { readonly min: number; readonly max: number };
  readonly tearShift: { readonly min: number; readonly max: number };
  readonly tearDurationMs: { readonly min: number; readonly max: number };
  /** 横ずれに重ねる色ずれ(ゴースト)の色と不透明度。 */
  readonly tearGhostColor: number;
  readonly tearGhostAlpha: number;
  /** マップチップ化け(小さな四角が一瞬だけ別の場所の絵になる)の間隔[ms]・一辺[背景px]・表示時間[ms]。 */
  readonly blockIntervalMs: { readonly min: number; readonly max: number };
  readonly blockSize: { readonly min: number; readonly max: number };
  readonly blockDurationMs: { readonly min: number; readonly max: number };
  readonly hotspots: readonly AnomalyHotspot[];
}

export const BIE_VILLAGE_ANOMALY: MapAnomalyConfig = {
  sparkIntervalMs: { min: 700, max: 1900 },
  sparkCount: { min: 2, max: 6 },
  sparkSize: { min: 3, max: 8 },
  sparkDurationMs: { min: 50, max: 140 },
  sparkColors: [0xffffff, 0x9ff6ff, 0xff7ad9, 0x1a1a24],
  tearIntervalMs: { min: 4200, max: 9000 },
  tearHeight: { min: 6, max: 26 },
  tearShift: { min: 4, max: 16 },
  tearDurationMs: { min: 70, max: 160 },
  tearGhostColor: 0x7ae8ff,
  tearGhostAlpha: 0.45,
  blockIntervalMs: { min: 6500, max: 13000 },
  blockSize: { min: 24, max: 56 },
  blockDurationMs: { min: 90, max: 200 },
  hotspots: [
    // 木こりの家(木こりが戻らない家)。異変がいちばん濃い場所。
    { id: "woodcutter_house", area: { x: 880, y: 610, width: 360, height: 260 }, weight: 4 },
    // 広場の大木。村の中心で、通りがかりに目に入る。
    { id: "plaza_tree", area: { x: 744, y: 370, width: 216, height: 222 }, weight: 3 },
    // 北の門(ビーエのもり側からの入口)。村へ入った直後に「何かおかしい」と感じさせる。
    { id: "north_gate", area: { x: 640, y: 0, width: 150, height: 130 }, weight: 2 },
    // 水車小屋の滝。水の流れの中の点ノイズ。
    { id: "watermill_falls", area: { x: 40, y: 20, width: 260, height: 520 }, weight: 1 },
  ],
};
