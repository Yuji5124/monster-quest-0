// 予告専用の簡易3D岩（新規）。SVGの多角形に面の陰影を付けた「疑似立体」。3Dモデルは作らない。
// 透視は z（0=画面、正=奥）から scale = F/(F+z) で近似する（awesome-ai-motion-JP `camera-flythrough` の 奥行き1200px 相当）。
import React, { useMemo } from "react";
import { random } from "remotion";

export const FOCAL = 1200;
export const perspective = (z: number) => FOCAL / (FOCAL + z);

export const RockShape: React.FC<{ seed: string; size: number; rotate?: number; tint?: number }> = ({ seed, size, rotate = 0, tint = 1 }) => {
  const pts = useMemo(() => {
    const n = 9;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + random(`${seed}a${i}`) * 0.35;
      const r = 0.36 + random(`${seed}r${i}`) * 0.14;
      return [0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r] as const;
    });
  }, [seed]);
  const poly = pts.map(([x, y]) => `${x * 100},${y * 100}`).join(" ");
  const c = (v: number) => Math.round(v * tint);
  const id = `rk-${seed}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${rotate}deg)`, overflow: "visible" }}>
      <defs>
        <linearGradient id={id} x1="0.2" y1="0.1" x2="0.8" y2="0.95">
          <stop offset="0" stopColor={`rgb(${c(176)},${c(156)},${c(132)})`} />
          <stop offset="0.55" stopColor={`rgb(${c(104)},${c(88)},${c(72)})`} />
          <stop offset="1" stopColor={`rgb(${c(42)},${c(34)},${c(28)})`} />
        </linearGradient>
      </defs>
      <polygon points={poly} fill={`url(#${id})`} stroke="#1c1612" strokeWidth={1.6} strokeLinejoin="round" />
      {/* 面の区切り（中心から数本） */}
      {pts.filter((_, i) => i % 3 === 0).map(([x, y], i) => (
        <line key={i} x1={50 + (random(`${seed}cx`) - 0.5) * 10} y1={46} x2={x * 100} y2={y * 100} stroke="rgba(20,14,10,0.45)" strokeWidth={1.2} />
      ))}
      <polygon points={poly} fill="rgba(255,240,210,0.08)" transform="translate(-3,-3) scale(0.96)" style={{ transformOrigin: "50% 50%" }} />
    </svg>
  );
};

/** 砕けた破片（三角形）。at から飛び散る */
export const Shards: React.FC<{ frame: number; at: number; x: number; y: number; count?: number; seed: string; power?: number; scale?: number }> = ({ frame, at, x, y, count = 26, seed, power = 1, scale = 1 }) => {
  const d = frame - at;
  if (d < 0 || d > 40) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const ang = random(`${seed}ang${i}`) * Math.PI * 2;
        const sp = (6 + random(`${seed}sp${i}`) * 18) * power;
        const px = x + Math.cos(ang) * sp * d * scale;
        const py = y + (Math.sin(ang) * sp * d + 0.5 * 1.1 * d * d) * scale;
        const s = (8 + random(`${seed}sz${i}`) * 26) * scale;
        const rot = random(`${seed}rot${i}`) * 360 + d * (random(`${seed}rs${i}`) - 0.5) * 40;
        return (
          <svg key={i} width={s} height={s} viewBox="0 0 10 10" style={{ position: "absolute", left: px - s / 2, top: py - s / 2, transform: `rotate(${rot}deg)`, opacity: 1 - d / 40 }}>
            <polygon points="0,10 5,0 10,7" fill={i % 3 ? "#6d5c4c" : "#a8927a"} stroke="#241c16" strokeWidth={0.6} />
          </svg>
        );
      })}
    </>
  );
};

/** 粉塵 */
export const Dust: React.FC<{ frame: number; at: number; x: number; y: number; seed: string; scale?: number }> = ({ frame, at, x, y, seed, scale = 1 }) => {
  const d = frame - at;
  if (d < 0 || d > 45) return null;
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => {
        const ang = random(`${seed}d${i}`) * Math.PI * 2;
        const r = (40 + d * (4 + random(`${seed}dr${i}`) * 5)) * scale;
        const s = (90 + d * 6) * scale;
        return (
          <div key={i} style={{ position: "absolute", left: x + Math.cos(ang) * r - s / 2, top: y + Math.sin(ang) * r * 0.6 - s / 2, width: s, height: s, borderRadius: "50%", background: "radial-gradient(circle, rgba(170,150,125,0.5), rgba(120,100,80,0) 70%)", opacity: 1 - d / 45 }} />
        );
      })}
    </>
  );
};
