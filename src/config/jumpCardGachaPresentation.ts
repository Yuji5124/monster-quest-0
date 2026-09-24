/**
 * ジャンカード排出前のレア演出。タッチ操作を含む入力はこの全尺でロックする。
 * H.png(コイン投入) → I.png(ハンドルを回す) → 虹色の高まり → 白フラッシュ → カード出現(6秒後)。
 */
export const JUMP_CARD_GACHA_PRESENTATION = {
  totalDurationMs: 6_000,
  /** H.png: コインを差し出した手が現れる。 */
  coinShowStartMs: 150,
  /** H.png: コインがスロットへ押し込まれる。 */
  coinPushStartMs: 900,
  /** コインが落ちて「チャリン」と光る瞬間。 */
  coinDropMs: 1_650,
  /** H.png → I.png の切り替え開始。 */
  turnStartMs: 2_250,
  /** I.png: ハンドルが1段ずつ回る「ガチャ」の拍。 */
  turnClickMs: [2_900, 3_400, 3_900] as readonly number[],
  /** 虹色の光と後光が高まり始める。 */
  rareGlowStartMs: 4_250,
  /** 画面全体の白フラッシュ。これが明けてからカードを出す。 */
  finalFlashStartMs: 5_450,
} as const;
