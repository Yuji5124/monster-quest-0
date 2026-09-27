import type { WorldMapImplementationStatus, WorldMapVisibilityState } from "../systems/WorldMapData.ts";

/** Visuals stay compact while the independent Zone keeps the touch target usable. */
export const WORLD_MAP_MARKER_LAYOUT = {
  ringRadius: 13,
  coreRadius: 6,
  hitSize: 44,
  ringStrokeThickness: 2,
  labelFontSize: "13px",
  labelStrokeThickness: 3,
} as const;

export interface WorldMapMarkerStyle {
  readonly ringFill: number;
  readonly ringAlpha: number;
  readonly ringStroke: number;
  readonly coreFill: number;
  readonly labelColor: string;
}

const IMPLEMENTED_STYLE: WorldMapMarkerStyle = {
  ringFill: 0x20242a,
  ringAlpha: 0.78,
  ringStroke: 0xf3f4f6,
  coreFill: 0xf8fafc,
  labelColor: "#ffffff",
};

const LOCKED_STYLE: WorldMapMarkerStyle = {
  ringFill: 0x24272c,
  ringAlpha: 0.7,
  ringStroke: 0x8b949e,
  coreFill: 0x66707a,
  labelColor: "#aeb7c0",
};

const PLANNED_STYLE: WorldMapMarkerStyle = {
  ringFill: 0x0a2e62,
  ringAlpha: 0.88,
  ringStroke: 0x3b9dff,
  coreFill: 0x168cff,
  labelColor: "#8dccff",
};

const SELECTED_STYLE: WorldMapMarkerStyle = {
  ringFill: 0x2d2920,
  ringAlpha: 0.9,
  ringStroke: 0xffd86a,
  coreFill: 0xffc34d,
  labelColor: "#fff1bd",
};

/** The blue palette is reserved for locations that have no playable local map yet. */
export function getWorldMapMarkerStyle(
  implementationStatus: WorldMapImplementationStatus,
  unlocked: boolean,
  selected: boolean,
  visibilityState: Exclude<WorldMapVisibilityState, "HIDDEN"> = "DISCOVERED",
): WorldMapMarkerStyle {
  if (selected) return SELECTED_STYLE;
  if (visibilityState === "UNKNOWN") return LOCKED_STYLE;
  if (implementationStatus === "planned") return PLANNED_STYLE;
  return unlocked ? IMPLEMENTED_STYLE : LOCKED_STYLE;
}

/**
 * 世界地図の上をゆっくり流れる雲(見た目だけ。地点の選択・移動・セーブには触れない)。数値はTEMP_TEST_VALUE。
 * 背景に描かれている縁の雲と同じ白い積雲を、地図の上空に少しだけ流す。
 * - clouds: ふわっとした雲。地面へ右下にずれた影を落とし、高さを感じさせる。
 * - wisps: 横に伸びた薄いすじ雲。雲より少し速く流れ、単調さを崩す。
 * 地点マーカー(depth 20〜22)より下に置き、地名が常に読めるようにする。
 */
export interface WorldMapCloudLayerConfig {
  readonly count: number;
  /** 世界地図の表示ピクセル(960×720)での横幅。 */
  readonly width: { readonly min: number; readonly max: number };
  /** 横幅に対する高さの比。 */
  readonly aspect: { readonly min: number; readonly max: number };
  readonly alpha: { readonly min: number; readonly max: number };
  /** 表示ピクセル/秒。正で右へ流れる。 */
  readonly speed: { readonly min: number; readonly max: number };
  /** 上下のゆっくりした揺れ(ピクセル)。 */
  readonly bob: number;
}

export const WORLD_MAP_CLOUDS = {
  clouds: {
    count: 4,
    width: { min: 200, max: 340 },
    aspect: { min: 0.5, max: 0.66 },
    alpha: { min: 0.42, max: 0.58 },
    speed: { min: 5, max: 9 },
    bob: 4,
  },
  wisps: {
    count: 3,
    width: { min: 260, max: 420 },
    aspect: { min: 0.16, max: 0.24 },
    alpha: { min: 0.16, max: 0.26 },
    speed: { min: 11, max: 16 },
    bob: 2,
  },
  /** 雲の影。雲の位置から右下へずらし、うすく暗くする。 */
  shadowOffset: { x: 34, y: 46 },
  shadowAlpha: 0.2,
  shadowColor: 0x0b1f38,
  /** 雲の下側のうっすらした陰り(立体感)。 */
  undersideColor: 0xb9c9dd,
  /** 風向きの揺らぎ: この周期でゆっくり速さが増減する。 */
  gustPeriodMs: 14000,
  gustAmount: 0.35,
  fadeInMs: 900,
  depth: { shadow: 8, wisp: 11, underside: 12, cloud: 13 },
} as const satisfies {
  readonly clouds: WorldMapCloudLayerConfig;
  readonly wisps: WorldMapCloudLayerConfig;
  readonly [key: string]: unknown;
};
