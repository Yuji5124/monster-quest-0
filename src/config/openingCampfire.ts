/**
 * 「はじめから」後、No.01の焚き火へ入る導入の時間設計。
 * 秒数・台詞をSceneへ散らさず、視覚・音・入力解放の順をここで共有する。
 */
export const OPENING_CAMPFIRE = {
  initialSilenceMs: 700,
  ambienceStartMs: 700,
  revealStartMs: 2000,
  revealDurationMs: 5000,
  narrationStartMs: 7000,
  narrationLineMs: 2200,
  narrationFadeMs: 500,
  narrationEndFadeMs: 900,
  fireOnlyMs: 2000,
  lookPauseMs: 650,
  protagonistLineMs: 1500,
  protagonistLineFadeMs: 400,
  nightVeilAlpha: 0.28,
} as const;

export const OPENING_CAMPFIRE_NARRATION = [
  "この世界では、いま――",
  "モンスターたちの支配が、\n　少しずつ広がっていた。",
  "町と町をつなぐ道は危険に満ち、\n　人々は不安の中で暮らしていた。",
  "それでも――\n　希望の火が消えたわけではない。",
  "名も知らぬ土地を歩く、\n　ひとりの旅人がいた。",
  "その旅人は今日もまた、\n　旅を続けるのであった――。",
] as const;

/**
 * 実時間の目安。各行のクロスフェードを含み、最後の無言から操作解放まで約25秒。
 */
export function getOpeningCampfireControlReleaseMs(): number {
  return OPENING_CAMPFIRE.narrationStartMs
    + OPENING_CAMPFIRE_NARRATION.length * OPENING_CAMPFIRE.narrationLineMs
    + OPENING_CAMPFIRE.fireOnlyMs
    + OPENING_CAMPFIRE.lookPauseMs
    + OPENING_CAMPFIRE.protagonistLineMs
    + OPENING_CAMPFIRE.protagonistLineFadeMs;
}
