// K. 4:3素材の16:9配置 — 実画面を1.5倍（1440×1080、nearest）で中央に置き、
// 左右の余白には同じ映像を強くぼかして暗くしたものを敷く。
// 縦型（§7）は上半分に1.125倍（1080×810）で置く。
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { GAME_H, GAME_W } from "../clips";

export interface Frame43Props {
  /** 与えられたサイズでゲーム画面を描く（ClipやImgを入れる） */
  render: (width: number, height: number) => React.ReactNode;
  /** 縦型で置くY位置（上端）。省略時は §7 の「上半分」 */
  tallTop?: number;
}

export const Frame43: React.FC<Frame43Props> = ({ render, tallTop }) => {
  const { width, height } = useVideoConfig();
  const tall = height > width;
  const scale = tall ? 1.125 : 1.5;
  const w = GAME_W * scale;
  const h = GAME_H * scale;
  const top = tall ? (tallTop ?? Math.round((height / 2 - h) / 2 + 60)) : (height - h) / 2;
  const left = (width - w) / 2;
  // 背景: 画面全体を覆う大きさに拡大してぼかす
  const bgScale = Math.max(width / GAME_W, height / GAME_H);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ filter: "blur(28px) brightness(0.38) saturate(1.1)", transform: "scale(1.08)" }}>
        <div style={{ position: "absolute", left: (width - GAME_W * bgScale) / 2, top: (height - GAME_H * bgScale) / 2 }}>
          {render(GAME_W * bgScale, GAME_H * bgScale)}
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left, top, width: w, height: h, boxShadow: "0 0 60px rgba(0,0,0,0.7)" }}>{render(w, h)}</div>
    </AbsoluteFill>
  );
};
