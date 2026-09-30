// F. GlitchFlash — CRT走査線、RGB分離（±6px）、横帯のずれ、ブロックノイズ。
// §1: 異常演出は合計1秒未満。この部品は1回あたり最大4フレームで、それを超える長さは描かない。
// 使った長さは GLITCH_BUDGET で集計する（Step 6 の確認用）。
import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";

export const GLITCH_MAX_FRAMES = 4;

export interface GlitchFlashProps {
  /** 乱れを重ねる映像（同じものを3回描いてRGBに分ける） */
  children: React.ReactNode;
  /** 乱れを出すフレーム（このコンポーネント内）。最大4つまで */
  frames: number[];
  seed?: string;
  /** RGBずれ（px） */
  rgb?: number;
  /** 走査線を常に出すか（C01のCRT感） */
  scanlines?: boolean;
  intensity?: number;
}

export const Scanlines: React.FC<{ opacity?: number }> = ({ opacity = 0.22 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      opacity,
      backgroundImage: "repeating-linear-gradient(to bottom, rgba(0,0,0,0.9) 0px, rgba(0,0,0,0.9) 2px, transparent 2px, transparent 4px)",
      mixBlendMode: "multiply",
    }}
  />
);

export const GlitchFlash: React.FC<GlitchFlashProps> = ({ children, frames, seed = "g", rgb = 6, scanlines = true, intensity = 1 }) => {
  const frame = useCurrentFrame();
  const active = frames.slice(0, GLITCH_MAX_FRAMES).includes(frame);
  if (!active) {
    return (
      <AbsoluteFill>
        {children}
        {scanlines && <Scanlines opacity={0.12} />}
      </AbsoluteFill>
    );
  }
  const r = (k: string) => random(`${seed}-${frame}-${k}`);
  // 横帯のずれ: 画面を帯に切って、いくつかを左右へずらす
  const bands = 9;
  const bandEls = Array.from({ length: bands }, (_, i) => {
    const top = (i / bands) * 100;
    const h = 100 / bands;
    const shift = r(`b${i}`) < 0.45 ? (r(`s${i}`) - 0.5) * 120 * intensity : 0;
    return (
      <AbsoluteFill key={i} style={{ clipPath: `inset(${top}% 0 ${100 - top - h}% 0)`, transform: `translateX(${shift}px)` }}>
        {children}
      </AbsoluteFill>
    );
  });
  const blocks = Array.from({ length: Math.round(14 * intensity) }, (_, i) => ({
    x: r(`x${i}`) * 100,
    y: r(`y${i}`) * 100,
    w: 2 + r(`w${i}`) * 12,
    h: 0.6 + r(`h${i}`) * 3,
    c: ["#ffffff", "#7ae8ff", "#ff5fd2", "#101018", "#c33"][Math.floor(r(`c${i}`) * 5)],
  }));
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* RGB分離: 赤・緑青を別々にずらして加算 */}
      <AbsoluteFill style={{ transform: `translateX(${-rgb}px)`, mixBlendMode: "screen", filter: "url(#mq0-red)" }}>{bandEls}</AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateX(${rgb}px)`, mixBlendMode: "screen", filter: "url(#mq0-cyan)" }}>{bandEls}</AbsoluteFill>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="mq0-red">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
        <filter id="mq0-cyan">
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
        </filter>
      </svg>
      {blocks.map((b, i) => (
        <div key={i} style={{ position: "absolute", left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%`, backgroundColor: b.c, opacity: 0.85 }} />
      ))}
      <Scanlines opacity={0.35} />
    </AbsoluteFill>
  );
};
