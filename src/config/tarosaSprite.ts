import type { WalkSpriteGeometry } from "./characterWalkSprite.ts";

/**
 * assets/characters/playable/tarosa_walk.png のグリッド定義。
 * tools/build_tarosa_sheet.py が assets/characters/reference/reference/タロサ/ の
 * 12枚(正面/うしろ/右/左 × 3フレーム)から、主人公と同じ手順で焼き込んだCURRENTスプライトシート。
 * 1セル44×70、3列(フレーム1-3)×4行(下/左/右/上)。タロサはArcade Bodyを持たない
 * 表示専用のパーティfollowerのため、bodyOffsetは不要。
 */
export const TAROSA_SPRITE: WalkSpriteGeometry = {
  key: "char.tarosa.walk",
  path: new URL("../../assets/characters/playable/tarosa_walk.png", import.meta.url).toString(),
  frameWidth: 44,
  frameHeight: 70,
  baselineY: 67,
};
