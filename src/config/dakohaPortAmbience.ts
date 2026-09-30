/**
 * No.12「港町ダコハ」の港だけに重ねる光の演出。
 *
 * 背景PNGはユーザー提供のCURRENT素材とバイト一致のまま保ち、水面の反射・航路標識の灯だけを
 * ランタイムで重ねる。実際のPath Tracingや追加WebGL Contextは使わず、iPhone Safariでも
 * Phaserの通常描画に収まる軽量な「光が水面で揺れる」表現に限定する。
 * すべてTEMP_TEST_VALUE。座標と強さは人間側で調整でき、Collision・入力・進行・セーブには触れない。
 * 座標は background.png (1448×1086) のネイティブ背景ピクセル。
 */

export interface HarborGlintAnchor {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  /** 水面上のきらめきの表示サイズ（背景px）。 */
  readonly width: number;
  readonly height: number;
  /** 基準不透明度。水面の明るさに合わせて個別に下げられる。 */
  readonly alpha: number;
  /** 横方向のゆらぎ幅（背景px）。 */
  readonly driftX: number;
  /** 明滅の周期。 */
  readonly periodMs: number;
}

export interface DakohaPortAmbienceConfig {
  readonly mapSize: { readonly width: number; readonly height: number };
  readonly lightDepth: number;
  readonly glintDepth: number;
  readonly glints: readonly HarborGlintAnchor[];
  readonly lighthouse: {
    /** 灯台ランタン室の中心（背景px）。 */
    readonly origin: { readonly x: number; readonly y: number };
    /** 海側だけを掃く扇形の開始・終了角度（Canvas座標、右=0°、下=90°）。 */
    readonly sweepDegrees: { readonly min: number; readonly max: number };
    readonly reach: number;
    readonly halfAngleDegrees: number;
    readonly color: number;
    readonly alpha: { readonly min: number; readonly max: number };
    readonly sweepPeriodMs: number;
    /** Graphicsの再描画上限。60fpsで毎フレーム再描画しない。 */
    readonly redrawIntervalMs: number;
  };
}

export const DAKOHA_PORT_AMBIENCE: DakohaPortAmbienceConfig = {
  mapSize: { width: 1448, height: 1086 },
  // 背景(0)より上、主人公(1000)・FieldAmbience(1300以降)より下。水面の光が人物やUIを覆わない。
  lightDepth: 18,
  glintDepth: 20,
  glints: [
    { id: "west_inlet", x: 206, y: 796, width: 68, height: 15, alpha: 0.32, driftX: 9, periodMs: 3200 },
    { id: "west_long_pier", x: 364, y: 842, width: 82, height: 16, alpha: 0.42, driftX: 12, periodMs: 4100 },
    { id: "central_bay", x: 526, y: 826, width: 74, height: 14, alpha: 0.3, driftX: 8, periodMs: 3600 },
    { id: "central_dock", x: 610, y: 884, width: 92, height: 17, alpha: 0.46, driftX: 13, periodMs: 4600 },
    { id: "rowboat_channel", x: 760, y: 785, width: 76, height: 14, alpha: 0.34, driftX: 10, periodMs: 3900 },
    { id: "south_channel", x: 852, y: 914, width: 94, height: 18, alpha: 0.44, driftX: 12, periodMs: 5000 },
    { id: "east_jetty", x: 1128, y: 702, width: 70, height: 14, alpha: 0.28, driftX: 8, periodMs: 3400 },
    { id: "merchant_ship", x: 1188, y: 876, width: 104, height: 19, alpha: 0.48, driftX: 14, periodMs: 4400 },
    { id: "lighthouse_cove", x: 1334, y: 540, width: 62, height: 13, alpha: 0.26, driftX: 7, periodMs: 3700 },
    { id: "open_sea", x: 1342, y: 812, width: 88, height: 16, alpha: 0.36, driftX: 11, periodMs: 4800 },
  ],
  lighthouse: {
    origin: { x: 1390, y: 154 },
    // 灯台の右下に広がる海だけを往復する。町や歩行経路へは照射しない。
    sweepDegrees: { min: 58, max: 112 },
    reach: 430,
    halfAngleDegrees: 5.5,
    color: 0xfff1bd,
    alpha: { min: 0.035, max: 0.09 },
    sweepPeriodMs: 10800,
    redrawIntervalMs: 50,
  },
};
