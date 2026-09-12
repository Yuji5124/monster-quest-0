// 「はじめから」直後の約5秒異常演出の設定。正確な秒数はdocs/TBD_REGISTRY.mdでTBDのため、
// ここに一箇所だけ「約5秒」の目安値としてまとめる。Scene側に秒数をハードコードしない。
export const OPENING_GLITCH_DURATION_MS = 5000;

export interface GlitchStage {
  readonly id: "blackIn" | "scanlines" | "shift" | "intense" | "blackOut";
  readonly startRatio: number;
  readonly endRatio: number;
}

// docs/GLITCH_SPEC.md §2の「使用可能」演出(画像崩れ/文字ノイズ/断片混在)を、
// 黒→断続線→ズレ→強い乱れ→暗転という参考タイムラインの段階比率として管理する。
export const OPENING_GLITCH_STAGES: readonly GlitchStage[] = [
  { id: "blackIn", startRatio: 0, endRatio: 0.08 },
  { id: "scanlines", startRatio: 0.08, endRatio: 0.3 },
  { id: "shift", startRatio: 0.3, endRatio: 0.6 },
  { id: "intense", startRatio: 0.6, endRatio: 0.86 },
  { id: "blackOut", startRatio: 0.86, endRatio: 1 },
] as const;

// 1フレームの経過時間の上限。タブ非表示からの復帰直後などの巨大なdeltaでステージが飛ばないようにする。
export const GLITCH_MAX_FRAME_DELTA_MS = 100;

// 断続的な点滅・ズレの切替間隔の目安(ms)。各間隔の中身だけ軽い乱数で見た目を変える。
export const GLITCH_FLICKER_INTERVAL_MS = 90;
export const GLITCH_SHIFT_INTERVAL_MS = 110;
