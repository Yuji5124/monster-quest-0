// J. NameCard — 斜めの帯が画面を横切り（6f）、名前（Noto Sans JP Black）と肩書き（DotGothic16）を時間差で入れる。
// イメージ色: タロサ=緑、ミレイ=紫。mirror で左右反転（C12はC10の反転）。
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { DOT, GOTHIC } from "../fonts";
import { easeOut, lerp } from "./util";

export const CHARACTER_COLOR = {
  tarosa: "#2e9a4f",
  mirei: "#7a4bc4",
} as const;

export interface NameCardProps {
  name: string;
  title: string;
  quote?: string;
  color: string;
  mirror?: boolean;
  /** 帯が入るフレーム */
  startAt?: number;
  /** 帯の中心の高さ（0〜1、画面比） */
  y?: number;
}

export const NameCard: React.FC<NameCardProps> = ({ name, title, quote, color, mirror = false, startAt = 0, y = 0.72 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const tall = height > width;
  const f = frame - startAt;
  const band = lerp(f, [0, 6], [0, 1], easeOut);
  const nameIn = lerp(f, [3, 11], [0, 1], easeOut);
  const titleIn = lerp(f, [8, 16], [0, 1], easeOut);
  const quoteIn = lerp(f, [14, 24], [0, 1], easeOut);
  const bandH = tall ? 230 : 200;
  const cy = height * y;
  const skew = -7;
  const dir = mirror ? -1 : 1;
  const nameSize = tall ? 120 : 132;
  const sideMargin = tall ? 80 : 150;
  const textAlign = mirror ? "right" : "left";
  const edge: React.CSSProperties = mirror ? { right: sideMargin } : { left: sideMargin };
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* 帯: 画面外から横切って入る */}
      <div
        style={{
          position: "absolute",
          left: -width * 0.1,
          width: width * 1.2,
          top: cy - bandH / 2,
          height: bandH,
          background: `linear-gradient(${mirror ? 270 : 90}deg, ${color}f2 0%, ${color}e0 60%, ${color}00 100%)`,
          transform: `translateX(${(1 - band) * -dir * width * 1.2}px) skewY(${skew * dir}deg)`,
          boxShadow: `0 0 40px ${color}88`,
        }}
      />
      {/* 細い差し色の線 */}
      <div
        style={{
          position: "absolute",
          left: -width * 0.1,
          width: width * 1.2,
          top: cy + bandH / 2 + 10,
          height: 6,
          backgroundColor: "#fff",
          opacity: 0.85,
          transform: `translateX(${(1 - lerp(f, [2, 9], [0, 1], easeOut)) * dir * width * 1.2}px) skewY(${skew * dir}deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          ...edge,
          top: cy - nameSize * 0.72,
          textAlign,
          transform: `skewY(${skew * dir}deg)`,
          transformOrigin: mirror ? "right center" : "left center",
        }}
      >
        <div
          style={{
            fontFamily: GOTHIC,
            fontWeight: 900,
            fontSize: nameSize,
            lineHeight: 1,
            color: "#fff",
            letterSpacing: "0.04em",
            textShadow: "0 6px 18px rgba(0,0,0,0.45)",
            opacity: nameIn,
            transform: `translateX(${(1 - nameIn) * -dir * 80}px)`,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: DOT,
            fontSize: tall ? 50 : 48,
            color: "#fff",
            marginTop: 14,
            opacity: titleIn,
            transform: `translateX(${(1 - titleIn) * -dir * 60}px)`,
            textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          }}
        >
          {title}
        </div>
      </div>
      {quote && (
        <div
          style={{
            position: "absolute",
            ...edge,
            top: cy + bandH / 2 + 44,
            fontFamily: DOT,
            fontSize: tall ? 44 : 40,
            lineHeight: 1.4,
            color: "#fff",
            textAlign,
            whiteSpace: "pre",
            opacity: quoteIn,
            // 明るい背景でも読めるよう、半透明の黒い下地を敷く
            backgroundColor: "rgba(6,8,14,0.72)",
            padding: "12px 22px",
            borderLeft: mirror ? undefined : `6px solid ${color}`,
            borderRight: mirror ? `6px solid ${color}` : undefined,
            textShadow: "0 1px 2px #000",
          }}
        >
          {quote}
        </div>
      )}
    </AbsoluteFill>
  );
};
