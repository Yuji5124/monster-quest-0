// カット共通の小物
import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { DOT } from "../fonts";
import { Frame43 } from "../components/Frame43";
import { Clip, type RampKey } from "../components/SpeedRamp";
import { easeOut, lerp } from "../components/util";

export function useTall() {
  const { width, height } = useVideoConfig();
  return height > width;
}

/** ゲーム実画面（4:3→16:9 / 縦型は上半分） */
export const Game: React.FC<{ src: string; startSec: number; dur: number; ramp?: RampKey[] }> = ({ src, startSec, dur, ramp }) => (
  <Frame43 render={(w, h) => <Clip src={src} startSec={startSec} width={w} height={h} durationInFrames={dur} ramp={ramp} />} />
);

/** 画面いっぱいの画像（cover） */
export const Cover: React.FC<{ src: string; focus?: { x: number; y: number }; pixelated?: boolean; style?: React.CSSProperties }> = ({ src, focus = { x: 0.5, y: 0.5 }, pixelated, style }) => (
  <Img
    src={src}
    style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: `${focus.x * 100}% ${focus.y * 100}%`,
      imageRendering: pixelated ? "pixelated" : undefined,
      ...style,
    }}
  />
);

/** 地名ラベル（ドットフォント＋細線）。縦型では実画面の下に置く（安全領域内） */
export const PlaceLabel: React.FC<{ text: string; startAt?: number; corner?: "bottom-left" | "top-right"; size?: number }> = ({ text, startAt = 0, corner = "bottom-left", size }) => {
  const frame = useCurrentFrame();
  const tall = useTall();
  const f = frame - startAt;
  const line = lerp(f, [0, 10], [0, 1], easeOut);
  const txt = lerp(f, [3, 11], [0, 1], easeOut);
  const fontSize = size ?? (tall ? 52 : 46);
  const pos: React.CSSProperties = tall
    ? { left: 80, top: 1000 }
    : corner === "bottom-left"
      ? { left: 96, bottom: 100 }
      : { right: 96, top: 80, textAlign: "right" };
  return (
    <div style={{ position: "absolute", ...pos, backgroundColor: `rgba(6,8,14,${0.62 * txt})`, padding: "14px 22px 12px", borderRadius: 4 }}>
      <div
        style={{
          fontFamily: DOT,
          fontSize,
          color: "#fff",
          letterSpacing: "0.04em",
          opacity: txt,
          transform: `translateY(${(1 - txt) * 12}px)`,
          textShadow: "0 2px 6px rgba(0,0,0,0.95), 0 0 2px #000",
          whiteSpace: "pre",
        }}
      >
        {text}
      </div>
      <div
        style={{
          height: 3,
          marginTop: 10,
          width: `${line * 100}%`,
          minWidth: 0,
          background: "linear-gradient(90deg, #ffffff, rgba(255,255,255,0.15))",
          boxShadow: "0 0 6px rgba(0,0,0,0.8)",
          marginLeft: !tall && corner === "top-right" ? "auto" : undefined,
        }}
      />
    </div>
  );
};

/** 白フラッシュ（n フレームで消える） */
export const WhiteFlash: React.FC<{ at?: number; frames?: number; max?: number }> = ({ at = 0, frames = 6, max = 1 }) => {
  const frame = useCurrentFrame();
  const o = lerp(frame, [at, at + frames], [max, 0]);
  if (frame < at || o <= 0) return null;
  return <AbsoluteFill style={{ backgroundColor: "#fff", opacity: o }} />;
};
