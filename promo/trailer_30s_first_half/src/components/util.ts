import type React from "react";
import { Easing, interpolate } from "remotion";

/** ドット絵は必ず nearest-neighbor で拡大する */
export const PIXELATED: React.CSSProperties = { imageRendering: "pixelated" };

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

export function lerp(frame: number, input: number[], output: number[], easing?: (t: number) => number) {
  return interpolate(frame, input, output, { ...clamp, easing });
}

/** 画面の向き（縦型は §7 のレイアウト） */
export type Orientation = "wide" | "tall";
