// v6.0 字幕。本文は data/timeline.json（v6.0原文）から読み、ここでは改行・大きさ・位置・出現タイミングだけを扱う。
// 出現は Blur Resolve（awesome-ai-motion-JP `blur-resolve`: ぼかし4px→0、約250ms=8f）。退場は8fのフェード。
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { MINCHO } from "../fonts";
import { easeOut, lerp } from "./util";

export interface SubtitleLine {
  text: string;
  in: number;
}

export interface SubtitleProps {
  lines: SubtitleLine[];
  out: number;
  /** 下端からの位置（px） */
  bottom?: number;
  fontSize?: number;
}

const IN_FRAMES = 8;
const OUT_FRAMES = 8;

export const Subtitle: React.FC<SubtitleProps> = ({ lines, out, bottom = 84, fontSize = 50 }) => {
  const frame = useCurrentFrame();
  const fadeOut = lerp(frame, [out - OUT_FRAMES, out], [1, 0]);
  if (frame < lines[0].in || frame >= out) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* 背景とのコントラストを確保する下側の暗いグラデーション（顔や戦闘の主要部には掛からない高さ） */}
      <AbsoluteFill style={{ background: `linear-gradient(to top, rgba(0,0,0,${0.62 * fadeOut}) 0px, rgba(0,0,0,${0.36 * fadeOut}) ${bottom + fontSize * 2.2}px, transparent ${bottom + fontSize * 3.6}px)` }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom, display: "flex", flexDirection: "column", alignItems: "center", gap: fontSize * 0.32 }}>
        {lines.map((l) => {
          const p = lerp(frame, [l.in, l.in + IN_FRAMES], [0, 1], easeOut);
          return (
            <div
              key={l.text}
              style={{
                fontFamily: MINCHO,
                fontWeight: 800,
                fontSize,
                lineHeight: 1.25,
                letterSpacing: "0.06em",
                color: "#fbf6ea",
                opacity: p * fadeOut,
                filter: `blur(${(1 - p) * 4}px)`,
                transform: `translateY(${(1 - p) * 6}px)`,
                textShadow: "0 2px 6px rgba(0,0,0,0.95), 0 0 18px rgba(0,0,0,0.75)",
                whiteSpace: "nowrap",
              }}
            >
              {l.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
