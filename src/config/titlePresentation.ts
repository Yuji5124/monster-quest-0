/**
 * タイトル画面の演出調整値。
 * 正式な背景レイヤー素材が揃ったら、各レイヤーのGraphicsをImageへ置き換えても
 * 同じ速度・濃さの契約を使えるように、見た目に関する値をここへ集約する。
 */
export const TITLE_PRESENTATION = {
  logo: {
    enabled: true,
    delayMs: 160,
    introDurationMs: 260,
    settleDurationMs: 150,
    startScale: 0.95,
    overshootScale: 1.03,
    subtitleDelayMs: 440,
    subtitleFadeDurationMs: 180,
    shineDelayMs: 560,
    shineDurationMs: 430,
    shineIntervalMs: 3600,
    idlePulseScale: 1.012,
    idlePulsePixels: 3,
    idlePulseDurationMs: 1300,
  },
  background: {
    enabled: true,
    farDriftPixels: 3,
    farDriftDurationMs: 14000,
    midDriftPixels: 2,
    midDriftDurationMs: 18000,
    hazeDriftPixels: 20,
    hazeDriftDurationMs: 22000,
    vignetteAlpha: 0.22,
    lightShaftDurationMs: 12000,
    moteDriftPixels: 26,
    moteDriftDurationMs: 2600,
  },
  menu: {
    cursorSwayPixels: 3,
    cursorSwayDurationMs: 420,
    confirmFlashDurationMs: 70,
  },
  idleGlitch: {
    enabled: true,
    delayMs: 22000,
    logoShiftPixels: 3,
    durationMs: 50,
    noiseLineHeight: 3,
  },
} as const;
