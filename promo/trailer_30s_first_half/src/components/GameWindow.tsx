// E. GameWindow — ゲーム内の会話ウィンドウの見た目（白い二重枠・紺黒の地・DotGothic16）。
// 1文字ずつ打つ。台詞は src/data/dialogues.ts の原文どおり（全角スペースの分かち書き・改行を保つ）。
// 文字送り音は typeSfx を渡すと、1文字ごとに短く鳴らす（SEは Step 5 で CC0 素材を割り当てる）。
import React from "react";
import { Audio, Sequence, useCurrentFrame } from "remotion";
import { DOT } from "../fonts";
import { lerp } from "./util";

export interface GameWindowProps {
  text: string;
  /** 1フレームに打つ文字数（高速タイプは2〜3） */
  charsPerFrame?: number;
  /** 打ち始めるフレーム */
  startAt?: number;
  width: number;
  fontSize?: number;
  /** 行数（高さの決定用） */
  lines?: number;
  typeSfx?: string;
  /** 文字送り音を何文字ごとに鳴らすか */
  sfxEvery?: number;
  /** 出現アニメ（縦に開く）を使うか */
  openAnim?: boolean;
  style?: React.CSSProperties;
}

export const WINDOW_BG = "#0a0a14"; // ゲームの DialogueBox と同じ地色
export const WINDOW_FG = "#eeeeee";

export const GameWindow: React.FC<GameWindowProps> = ({
  text,
  charsPerFrame = 1,
  startAt = 0,
  width,
  fontSize = 46,
  lines,
  typeSfx,
  sfxEvery = 2,
  openAnim = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const chars = Array.from(text);
  const shown = Math.max(0, Math.min(chars.length, Math.floor((frame - startAt) * charsPerFrame)));
  const lineCount = lines ?? text.split("\n").length;
  const pad = Math.round(fontSize * 0.7);
  const height = Math.round(lineCount * fontSize * 1.45 + pad * 2);
  const open = openAnim ? lerp(frame, [0, 4], [0.1, 1]) : 1;
  // 表示しない文字は透明で残して、レイアウトを固定する
  const visible = chars.slice(0, shown).join("");
  const hidden = chars.slice(shown).join("");
  const sfxFrames: number[] = [];
  if (typeSfx) {
    for (let c = 0; c < chars.length; c += sfxEvery) {
      if (chars[c] === "\n" || chars[c] === "　") continue;
      sfxFrames.push(startAt + Math.floor(c / charsPerFrame));
    }
  }
  return (
    <div
      style={{
        width,
        height,
        boxSizing: "border-box",
        backgroundColor: WINDOW_BG,
        // 白い二重枠: 外枠（border）＋内枠（outline を内側へ）
        border: `${Math.round(fontSize * 0.1)}px solid ${WINDOW_FG}`,
        outline: `${Math.max(2, Math.round(fontSize * 0.05))}px solid ${WINDOW_FG}`,
        outlineOffset: `-${Math.round(fontSize * 0.28)}px`,
        borderRadius: Math.round(fontSize * 0.18),
        padding: `${pad}px ${pad * 1.2}px`,
        fontFamily: DOT,
        fontSize,
        lineHeight: 1.45,
        color: WINDOW_FG,
        whiteSpace: "pre",
        transform: `scaleY(${open})`,
        boxShadow: "0 8px 30px rgba(0,0,0,0.55)",
        ...style,
      }}
    >
      <span>{visible}</span>
      <span style={{ opacity: 0 }}>{hidden}</span>
      {sfxFrames.map((f, i) => (
        <Sequence key={i} from={f} durationInFrames={4}>
          <Audio src={typeSfx!} volume={0.45} />
        </Sequence>
      ))}
    </div>
  );
};
