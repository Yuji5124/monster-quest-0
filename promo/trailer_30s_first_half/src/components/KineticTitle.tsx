// A. KineticTitle（大見出し） — Shippori Mincho B1 ExtraBold。
// mode="mask": 1文字ずつ clip-path で下からマスクリビール＋字間 +0.2em→0（C03「勇者じゃない。」）
// mode="pop" : 1文字ずつ下からポップ（C04「それでも、歩きだした。」）
// 退場は縦ブラー＋フェード（8f）。縦ブラーはSVGの feGaussianBlur（stdDeviation="0 N"）で作る。
import React from "react";
import { useCurrentFrame } from "remotion";
import { MINCHO } from "../fonts";
import { easeOut, lerp } from "./util";

export interface KineticTitleProps {
  text: string;
  mode: "mask" | "pop";
  /** 1文字あたりの遅れ（フレーム） */
  stagger?: number;
  /** 1文字の出現にかけるフレーム */
  charIn?: number;
  /** 退場を始めるフレーム（このコンポーネント内）。省略で退場なし */
  exitAt?: number;
  fontSize?: number;
  align?: "left" | "center";
  color?: string;
  style?: React.CSSProperties;
}

const EXIT = 8;

export const KineticTitle: React.FC<KineticTitleProps> = ({
  text,
  mode,
  stagger = 2,
  charIn = 10,
  exitAt,
  fontSize = 120,
  align = "left",
  color = "#fdf8ec",
  style,
}) => {
  const frame = useCurrentFrame();
  const chars = Array.from(text);
  const lastIn = (chars.length - 1) * stagger + charIn;
  // 字間: 全体で +0.2em → 0
  const spacing = mode === "mask" ? lerp(frame, [0, lastIn + 6], [0.2, 0], easeOut) : 0.02;
  const exitT = exitAt === undefined ? 0 : lerp(frame, [exitAt, exitAt + EXIT], [0, 1]);
  const blurId = `kt-vblur-${text.length}-${mode}`;
  return (
    <div
      style={{
        fontFamily: MINCHO,
        fontWeight: 800,
        fontSize,
        lineHeight: 1.15,
        color,
        letterSpacing: `${spacing}em`,
        textAlign: align,
        whiteSpace: "pre",
        textShadow: "0 4px 24px rgba(0,0,0,0.65), 0 0 2px rgba(0,0,0,0.9)",
        opacity: 1 - exitT,
        filter: exitT > 0 ? `url(#${blurId})` : undefined,
        ...style,
      }}
    >
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={blurId} x="-10%" y="-60%" width="120%" height="220%">
          <feGaussianBlur stdDeviation={`0 ${exitT * 26}`} />
        </filter>
      </svg>
      {chars.map((ch, i) => {
        const t0 = i * stagger;
        if (mode === "mask") {
          const p = lerp(frame, [t0, t0 + charIn], [0, 1], easeOut);
          return (
            <span key={i} style={{ display: "inline-block", clipPath: `inset(${(1 - p) * 100}% 0 -20% 0)`, transform: `translateY(${(1 - p) * 0.35}em)` }}>
              {ch}
            </span>
          );
        }
        // pop: 下から跳ね上がって少し行き過ぎて戻る
        const p = lerp(frame, [t0, t0 + charIn], [0, 1]);
        const back = 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2); // easeOutBack
        return (
          <span key={i} style={{ display: "inline-block", opacity: p > 0 ? Math.min(1, p * 3) : 0, transform: `translateY(${(1 - back) * 0.9}em) scale(${0.6 + 0.4 * back})` }}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};
