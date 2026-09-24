import type { WorldMapImplementationStatus } from "../systems/WorldMapData.ts";

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
): WorldMapMarkerStyle {
  if (selected) return SELECTED_STYLE;
  if (implementationStatus === "planned") return PLANNED_STYLE;
  return unlocked ? IMPLEMENTED_STYLE : LOCKED_STYLE;
}
