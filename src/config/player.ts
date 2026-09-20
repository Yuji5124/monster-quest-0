import { SCALE_FACTOR } from "./display.ts";

/** TEMP_TEST_VALUE: Phase 5の操作確認用のあたり判定サイズ・速度。正式な移動方式・速度は未確定。 */
export const PLAYER = {
  // 旧320×240基準で60px/秒だった体感速度を、解像度のSCALE_FACTOR倍にあわせて維持する。
  moveSpeed: 60 * SCALE_FACTOR, // 180: 内部座標px/秒。正式な移動方式・速度は未確定。
  // 当たり判定(足元)のサイズ。表示スプライト(54×70)よりずっと小さい足元だけの判定にし、
  // protagonistSprite.tsのoffsetで足元ベースライン・水平中央へ揃える。頭や髪は木・建物へ重なってよい。
  // 2026-09-19: 30×42(スプライト高の6割)ではCollision(道幅40〜60px)の細い箇所を通れなかったため24×24へ縮小。
  // 24 = Collision格子1マス(16px × worldScale 1.5)。全マップの通行領域が1つに繋がることをテストで保証している。
  width: 8 * SCALE_FACTOR,
  height: 8 * SCALE_FACTOR,
} as const;
