import type { WalkSpriteGeometry } from "./characterWalkSprite.ts";

/**
 * assets/characters/playable/mirei_walk.png のグリッド定義。
 * tools/build_mirei_sheet.py が assets/characters/reference/reference/ミレイ/ の
 * 12枚(正面/うしろ/右/左 × 3フレーム。左3.pngは透過なしの不良フレームだったため左1.pngで代替)から、
 * 主人公・タロサと同じ手順で焼き込んだCURRENTスプライトシート。1セル54×70、
 * 3列(フレーム1-3)×4行(下/左/右/上)。ミレイはArcade Bodyを持たない表示専用の
 * パーティfollowerのため、bodyOffsetは不要。
 */
export const MIREI_SPRITE: WalkSpriteGeometry = {
  key: "char.mirei.walk",
  path: new URL("../../assets/characters/playable/mirei_walk.png", import.meta.url).toString(),
  frameWidth: 54,
  frameHeight: 70,
  walkFrameRate: 7,
  baselineY: 67,
};
