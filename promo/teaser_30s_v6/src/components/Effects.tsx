// v6アニマティック用の軽量VFX（CSS/SVG）。本番ではVISUAL EFFECT LIBRARY 366の同名演出（GLSL）へ置き換える想定:
//   Shockwave → 203 衝撃波 / ExposurePulse → 039 露光パルス / PortalRim → 049 ポータル歪曲 / ZoomBlur → 176 ズームトランジション
import React from "react";
import { AbsoluteFill, Img } from "remotion";

/** 衝撃波リング（203の代替） */
export const Shockwave: React.FC<{ frame: number; at: number; x: number; y: number; maxR?: number; dur?: number; color?: string }> = ({ frame, at, x, y, maxR = 1400, dur = 18, color = "255,240,210" }) => {
  const d = frame - at;
  if (d < 0 || d > dur) return null;
  const k = d / dur;
  const r = maxR * (1 - Math.pow(1 - k, 2.2));
  const w = 60 * (1 - k) + 6;
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        boxShadow: `0 0 ${w}px ${w / 3}px rgba(${color},${0.75 * (1 - k)}), inset 0 0 ${w}px ${w / 3}px rgba(${color},${0.55 * (1 - k)})`,
        border: `${Math.max(1, 6 * (1 - k))}px solid rgba(${color},${0.9 * (1 - k)})`,
        pointerEvents: "none",
      }}
    />
  );
};

/** 露光パルス（039の代替）: 一瞬の白飛び→減衰 */
export const ExposurePulse: React.FC<{ frame: number; at: number; peak?: number; decay?: number; color?: string }> = ({ frame, at, peak = 0.9, decay = 7, color = "#fff1d6" }) => {
  const d = frame - at;
  if (d < 0) return null;
  const a = peak * Math.exp(-d / decay * 2.2);
  if (a < 0.01) return null;
  return <AbsoluteFill style={{ backgroundColor: color, opacity: a, mixBlendMode: "screen", pointerEvents: "none" }} />;
};

/** 画像のズームブラー（176の代替）。scaleを中心(ox,oy)で拡大し、複製を重ねて放射ブラーに見せる */
export const ZoomBlurImg: React.FC<{ src: string; scale: number; blur: number; ox: number; oy: number; filter?: string }> = ({ src, scale, blur, ox, oy, filter }) => {
  const origin = `${ox * 100}% ${oy * 100}%`;
  const layer = (s: number, o: number, k: number) => (
    <AbsoluteFill key={k} style={{ transform: `scale(${s})`, transformOrigin: origin, opacity: o, filter }}>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {layer(scale, 1, 0)}
      {blur > 0.02 && [1, 2, 3, 4, 5].map((i) => layer(scale * (1 + blur * 0.06 * i), 0.3 * (1 - i / 6) * Math.min(1, blur * 2), i))}
    </AbsoluteFill>
  );
};

/** 放射状の集中線（radial-speed-lines） */
export const SpeedLines: React.FC<{ frame: number; x: number; y: number; opacity: number; seed?: number }> = ({ frame, x, y, opacity, seed = 0 }) => {
  if (opacity < 0.01) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity, pointerEvents: "none" }}>
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2 + ((frame + seed) % 3) * 0.05;
        const r0 = 260 + ((i * 37 + frame * 13) % 120);
        return <line key={i} x1={x + Math.cos(a) * r0} y1={y + Math.sin(a) * r0} x2={x + Math.cos(a) * 1500} y2={y + Math.sin(a) * 1500} stroke="rgba(255,255,255,0.55)" strokeWidth={2 + (i % 3)} />;
      })}
    </svg>
  );
};
