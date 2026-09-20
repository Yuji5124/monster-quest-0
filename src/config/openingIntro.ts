/**
 * 起動直後のオープニング(ARROWAREクレジット → 思い出の回想6枚 → タイトル画面)の設定。
 * 秒数・並び順・画像はここへ集約し、Scene側にハードコードしない。
 * 総尺 ≒ クレジット3秒 + 回想約10秒。演出中は何かボタンを押せば、はじめから／つづきからのメニューへ飛べる。
 */
export interface OpeningMemoryImage {
  readonly key: string;
  readonly url: string;
}

const memory = (fileName: string): OpeningMemoryImage => ({
  key: `openingMemory.${fileName.replace(/\.png$/, "")}`,
  url: new URL(`../../assets/title/opening_memories/${fileName}`, import.meta.url).toString(),
});

export const OPENING_INTRO = {
  /** 黒画面中央のクレジット。上段は控えめに、下段のブランド名を大きく出す。 */
  credit: {
    line1: "Produced by",
    line2: "ARROWARE",
    fadeInMs: 700,
    holdMs: 1600,
    fadeOutMs: 700,
  },
  /** クレジットが消えてから最初の回想が始まるまでの、何も映らない間。 */
  gapAfterCreditMs: 400,
  /** 回想1枚あたり = fadeInMs + holdMs + fadeOutMs。6枚で約10秒。 */
  memory: {
    fadeInMs: 450,
    holdMs: 750,
    fadeOutMs: 450,
    /** 1枚の間にゆっくり寄る倍率(1.0→この値)。回想らしい、静かな動きだけに留める。 */
    slowZoomTo: 1.05,
    /** 画像の縁を黒へ溶かす幅(表示px)。四角い写真が浮かないようにする。 */
    featherPx: 36,
  },
  /** 最後の回想が消えてからタイトルへ渡すまでの黒。 */
  endBlackMs: 500,
  /** 演出の後にタイトルへ入るときの明転。 */
  titleFadeInMs: 800,
  /** スキップでメニューへ飛ぶときの明転。すばやく。 */
  skipFadeInMs: 250,
  /**
   * 並びは、ゲーム機に出会う〜遊ぶ子どもたちの時間順。
   * 元素材は assets/title/reference/{A,B,D,E,F,G}.png(C.pngは存在しない)。
   */
  images: [
    memory("memory_01.png"),
    memory("memory_02.png"),
    memory("memory_03.png"),
    memory("memory_04.png"),
    memory("memory_05.png"),
    memory("memory_06.png"),
  ],
} as const;

export const OPENING_INTRO_SCENE_KEY = "OpeningIntroScene";

/** OpeningIntroScene → TitleScene へ渡すデータ。 */
export interface TitleSceneData {
  /** オープニング演出から来たときだけtrue。明転を付ける。 */
  readonly fromIntro?: boolean;
  /** true なら「なにか ボタンを おしてください」を飛ばして、はじめから／つづきからのメニューから始める。 */
  readonly skipToMenu?: boolean;
}

export function getCreditDurationMs(): number {
  const { fadeInMs, holdMs, fadeOutMs } = OPENING_INTRO.credit;
  return fadeInMs + holdMs + fadeOutMs;
}

export function getMemorySlotMs(): number {
  const { fadeInMs, holdMs, fadeOutMs } = OPENING_INTRO.memory;
  return fadeInMs + holdMs + fadeOutMs;
}

export function getMemorySequenceDurationMs(): number {
  return getMemorySlotMs() * OPENING_INTRO.images.length;
}

/** 黒画面から回想が終わる直前まで(タイトルの明転を除く)の総尺。 */
export function getOpeningIntroDurationMs(): number {
  return getCreditDurationMs() + OPENING_INTRO.gapAfterCreditMs + getMemorySequenceDurationMs() + OPENING_INTRO.endBlackMs;
}
