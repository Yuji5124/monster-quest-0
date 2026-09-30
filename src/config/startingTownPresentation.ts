/**
 * No.02 はじまりのまち固有の、背景を描き替えない小さな演出レイヤー。
 *
 * すべて TEMP_TEST_VALUE。高解像度BACKGROUND は正本のまま保持し、ここでは
 * 水面と日よけの上に少数の半透明線を重ねるだけにする。
 */

export interface StartingTownPresentationConfig {
  readonly mapSize: { readonly width: number; readonly height: number };
  /** Graphics を再描画する最短間隔。iPhone Safari の負荷を抑える。 */
  readonly redrawIntervalMs: number;
  readonly depths: { readonly water: number; readonly awning: number };
  readonly fountain: {
    readonly x: number;
    readonly y: number;
    readonly rings: number;
    readonly radiusX: number;
    readonly radiusY: number;
    readonly radiusGrowth: number;
    readonly periodMs: number;
    readonly color: number;
    readonly alpha: number;
  };
  readonly waterfall: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly strands: number;
    readonly color: number;
    readonly alpha: number;
  };
  readonly riverGlints: readonly {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly periodMs: number;
    readonly phase: number;
  }[];
  /** 左上のどうぐやの布の日よけ。両端固定の短いVerletチェーンで表現する。 */
  readonly awningHem: {
    readonly start: { readonly x: number; readonly y: number };
    readonly end: { readonly x: number; readonly y: number };
    readonly segments: number;
    readonly sag: number;
    readonly color: number;
    readonly alpha: number;
  };
  /** 噴水の近くを歩いた時だけ、水面の呼吸を少し強める。 */
  readonly playerResponse: {
    readonly range: number;
    readonly maxIntensity: number;
  };
}

/**
 * 座標はBACKGROUNDのネイティブ1448×1086座標。worldScaleはScene側で一度だけ掛ける。
 * 位置・濃さ・周期はいずれも、人間による視覚調整待ちの TEMP_TEST_VALUE。
 */
export const STARTING_TOWN_PRESENTATION: StartingTownPresentationConfig = {
  mapSize: { width: 1448, height: 1086 },
  redrawIntervalMs: 50,
  // 背景(0)より上、NPC/主人公(1000)より下。会話・メニューとは一切競合しない。
  depths: { water: 860, awning: 870 },
  fountain: {
    x: 724,
    y: 470,
    rings: 3,
    radiusX: 24,
    radiusY: 13,
    radiusGrowth: 8,
    periodMs: 3400,
    color: 0xe7fbff,
    alpha: 0.17,
  },
  waterfall: {
    x: 1350,
    y: 56,
    width: 56,
    height: 92,
    strands: 5,
    color: 0xe4fbff,
    alpha: 0.12,
  },
  riverGlints: [
    { x: 1401, y: 234, width: 25, periodMs: 3100, phase: 0.12 },
    { x: 1382, y: 368, width: 30, periodMs: 3700, phase: 0.51 },
    { x: 1404, y: 522, width: 28, periodMs: 4100, phase: 0.76 },
    { x: 1378, y: 674, width: 32, periodMs: 3500, phase: 0.34 },
    { x: 1405, y: 820, width: 24, periodMs: 3900, phase: 0.88 },
  ],
  awningHem: {
    start: { x: 355, y: 329 },
    end: { x: 458, y: 329 },
    segments: 6,
    sag: 2.4,
    color: 0xfff7e4,
    alpha: 0.22,
  },
  playerResponse: { range: 235, maxIntensity: 0.34 },
};
