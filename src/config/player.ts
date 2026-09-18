import { SCALE_FACTOR } from "./display.ts";

/** TEMP_TEST_VALUE / DEV_PLACEHOLDER: Phase 5の操作確認用。正式な主人公仕様ではない。 */
export const PLAYER = {
  // 旧320×240基準で60px/秒だった体感速度を、解像度のSCALE_FACTOR倍にあわせて維持する。
  moveSpeed: 60 * SCALE_FACTOR, // 180: 内部座標px/秒。正式な移動方式・速度は未確定。
  width: 10 * SCALE_FACTOR,
  height: 14 * SCALE_FACTOR,
  color: 0xb7c8cf,
} as const;
