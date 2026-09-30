// C. ZoomThrough — 画像の一点へ0.4秒（12f）で12倍までズームし、放射ブラーをかけて次へ突き抜ける。
// 放射ブラーは、少しずつ大きくした複製を薄く重ねる「ズームブラー」で近似する。
import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { easeIn, lerp } from "./util";

export interface ZoomThroughProps {
  src: string;
  /** 突っ込む点（0〜1） */
  target: { x: number; y: number };
  /** ズームを始めるフレーム */
  startAt?: number;
  /** ズームにかけるフレーム（既定12f=0.4秒） */
  frames?: number;
  maxScale?: number;
  /** 最後に白へ抜けるか */
  whiteOut?: boolean;
  pixelated?: boolean;
}

export const ZoomThrough: React.FC<ZoomThroughProps> = ({ src, target, startAt = 0, frames = 12, maxScale = 12, whiteOut = true, pixelated = false }) => {
  const frame = useCurrentFrame();
  const p = lerp(frame, [startAt, startAt + frames], [0, 1], easeIn);
  const scale = Math.pow(maxScale, p); // 指数で加速
  const blur = p; // 0→1
  const copies = 7;
  const origin = `${target.x * 100}% ${target.y * 100}%`;
  const img = (s: number, o: number, k: number) => (
    <AbsoluteFill key={k} style={{ transform: `scale(${s})`, transformOrigin: origin, opacity: o }}>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: pixelated ? "pixelated" : undefined }} />
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      {img(scale, 1, 0)}
      {blur > 0.02 && Array.from({ length: copies }, (_, i) => img(scale * (1 + blur * 0.09 * (i + 1)), 0.34 * (1 - i / copies), i + 1))}
      {whiteOut && <AbsoluteFill style={{ backgroundColor: "#fff", opacity: lerp(frame, [startAt + frames * 0.7, startAt + frames], [0, 0.9]) }} />}
    </AbsoluteFill>
  );
};
