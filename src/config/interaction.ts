import { SCALE_FACTOR } from "./display.ts";

// 主人公の正面判定に使う仮の距離・幅。FC風の「隣に立って向くと話せる」距離感を狙った暫定値。
// NPCのArcade Bodyに接触した主人公でも、下端/上端ちょうどから会話できる距離を確保する。
// 8pxではroundPixels後に判定矩形が接しないことがあるため、1px分だけ余裕を持たせる。
export const INTERACTION_REACH = 9 * SCALE_FACTOR;
export const INTERACTION_SPAN = 12 * SCALE_FACTOR;
