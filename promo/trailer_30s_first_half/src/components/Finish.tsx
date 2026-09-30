// L. 共通の仕上げ — フィルムグレイン（3%）、ビネット、ブルーム、レターボックス帯の開閉。
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

/** フィルムグレイン: SVGのノイズ（毎フレームseedを変える）を3%で重ねる */
export const FilmGrain: React.FC<{ opacity?: number }> = ({ opacity = 0.03 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const id = `grain-${frame}`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity, mixBlendMode: "overlay" }}>
      <svg width={width} height={height}>
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={frame % 97} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${strength}) 100%)`,
    }}
  />
);

/** ブルーム: 明るい部分をぼかして加算（しきい値はcontrast/brightnessで近似） */
export const Bloom: React.FC<{ children: React.ReactNode; amount?: number; radius?: number }> = ({ children, amount = 0.6, radius = 24 }) => (
  <AbsoluteFill>
    {children}
    <AbsoluteFill style={{ filter: `brightness(0.9) contrast(2.4) blur(${radius}px)`, mixBlendMode: "screen", opacity: amount, pointerEvents: "none" }}>
      {children}
    </AbsoluteFill>
  </AbsoluteFill>
);

/**
 * レターボックス帯。open=0 で帯なし、1 でシネスコ（2.39:1）。
 * 縦型では上下の安全領域（250px）を黒帯として使う。
 */
export const Letterbox: React.FC<{ amount: number; ratio?: number }> = ({ amount, ratio = 2.39 }) => {
  const { width, height } = useVideoConfig();
  const tall = height > width;
  const full = tall ? 250 : (height - width / ratio) / 2;
  const h = full * Math.max(0, Math.min(1, amount));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: h, backgroundColor: "#000" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h, backgroundColor: "#000" }} />
    </AbsoluteFill>
  );
};
