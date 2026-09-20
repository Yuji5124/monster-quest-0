/**
 * ジャンカード排出前のコイン投入演出。タッチ操作を含む入力はこの全尺でロックする。
 * H.png/I.pngの視認時間を十分に取りつつ、カードの出現は必ず5秒後にする。
 */
export const JUMP_CARD_GACHA_PRESENTATION = {
  totalDurationMs: 5_000,
  instructionHoldMs: 1_650,
  coinInsertStartMs: 1_900,
  finalFlashStartMs: 4_450,
} as const;
