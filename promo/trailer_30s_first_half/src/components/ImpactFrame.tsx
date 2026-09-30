// H. ImpactFrame — 2fの白黒反転＋振幅12pxのスクリーンシェイク（減衰）＋放射ブラー。
import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { lerp } from "./util";

export interface ImpactFrameProps {
  children: React.ReactNode;
  /** 衝撃のフレーム（このコンポーネント内） */
  at: number;
  /** シェイクの長さ（フレーム） */
  shakeFrames?: number;
  amplitude?: number;
  /** 放射ブラーの中心（0〜1） */
  center?: { x: number; y: number };
}

export const ImpactFrame: React.FC<ImpactFrameProps> = ({ children, at, shakeFrames = 14, amplitude = 12, center = { x: 0.5, y: 0.5 } }) => {
  const frame = useCurrentFrame();
  const d = frame - at;
  const inverted = d >= 0 && d < 2;
  const decay = d >= 0 ? Math.max(0, 1 - d / shakeFrames) : 0;
  const sx = decay > 0 ? (random(`ix${frame}`) * 2 - 1) * amplitude * decay : 0;
  const sy = decay > 0 ? (random(`iy${frame}`) * 2 - 1) * amplitude * decay : 0;
  const blur = d >= 0 ? lerp(d, [0, 8], [1, 0]) : 0;
  const origin = `${center.x * 100}% ${center.y * 100}%`;
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${sx}px, ${sy}px)`,
          filter: inverted ? "grayscale(1) invert(1) contrast(2.2)" : undefined,
        }}
      >
        {children}
        {blur > 0.02 &&
          [1, 2, 3, 4].map((i) => (
            <AbsoluteFill key={i} style={{ transform: `scale(${1 + blur * 0.035 * i})`, transformOrigin: origin, opacity: 0.28 * blur }}>
              {children}
            </AbsoluteFill>
          ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
