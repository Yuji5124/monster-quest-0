import { bodyOffset } from "./characterWalkSprite.ts";
import type { WalkSpriteGeometry } from "./characterWalkSprite.ts";
import { PLAYER } from "./player.ts";

/**
 * assets/characters/playable/protagonist_walk.png のグリッド定義。
 * tools/build_protagonist_sheet.py が assets/characters/reference/reference/主人公/ の
 * 12枚(正面/うしろ/右/左 × 3フレーム)から、各方向の歩行キャラを共通の足元ベースラインで
 * 焼き込んだCURRENTスプライトシート。1セル54×70、3列(フレーム1-3)×4行(下/左/右/上)。
 */
export const PROTAGONIST_SPRITE: WalkSpriteGeometry = {
  key: "char.protagonist.walk",
  path: new URL("../../assets/characters/playable/protagonist_walk.png", import.meta.url).toString(),
  frameWidth: 54,
  frameHeight: 70,
  // 3フレーム往復(1→2→3→2)を約0.33秒で1周期にし、180px/秒の移動と足運びを同期する。
  walkFrameRate: 12,
  baselineY: 67,
};

/**
 * Arcade Bodyをスプライトの足元(接地ライン)・水平中央に揃えるoffset。
 * setSize(PLAYER.width, PLAYER.height, false) と組み合わせて使う。
 */
export const PROTAGONIST_BODY_OFFSET = bodyOffset(PROTAGONIST_SPRITE, PLAYER.width, PLAYER.height);
