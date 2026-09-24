/**
 * 「はじめから」直後、No.01の暗闇へ入る前だけに出す制御済みの起動ノイズ。
 * 実データ・入力・進行フラグには一切触れない。
 */
export type OpeningGlitchStageId = "boot" | "debugOverlap" | "corruption" | "recovery" | "blackOut";

export interface GlitchStage {
  readonly id: OpeningGlitchStageId;
  readonly durationMs: number;
}

/** 合計5秒。最後の0.4秒はNo.01へつながる完全な黒。 */
export const OPENING_GLITCH_STAGES = [
  { id: "boot", durationMs: 1000 },
  { id: "debugOverlap", durationMs: 1300 },
  { id: "corruption", durationMs: 1500 },
  { id: "recovery", durationMs: 800 },
  { id: "blackOut", durationMs: 400 },
] as const satisfies readonly GlitchStage[];

export const OPENING_GLITCH_DURATION_MS = OPENING_GLITCH_STAGES.reduce((total, stage) => total + stage.durationMs, 0);

/** 0.0〜1.0秒で、少数だけ素早く現れる起動断片。 */
export const OPENING_DEBUG_BOOT_LINES = [
  "> BOOT...",
  "> INIT_PLAYER...",
  "> LOAD_MAP...",
  "> MEMORY CHECK...",
  "0x00A18F  3F 0A FF 7E",
  "FF 20 4D 51 ?? 00 18",
  "??  ｱ?ｲ  0x0000",
] as const;

export const OPENING_DEBUG_ERROR_LINES = [
  "> ERR",
  "> NG",
  "> UNKNOWN",
  "> DATA MISMATCH",
  "> NULL",
  "> LOAD FAILED",
] as const;

/** 画面に出す文字は断片だけに限定し、物語や画面の意味を読ませない。 */
export const OPENING_CORRUPTION_FRAGMENTS = [
  "???", "NULL", "ERR", "NG", "0x00A18F", "0x804D210", "3F 0A FF", "FF FF 00",
  "ｱ?ｲ", "??:??", "[--]", "< >", "::", "//", "00 00 00", "E7 81 ??",
] as const;
