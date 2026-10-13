// 焚き火（CUT01）と洞窟奥の光（CUT07）で共通の「揺れ方」。同じ関数を使い、ふたつの光を視覚的に呼応させる（横井シフト）。
import React from "react";
import { random } from "remotion";

/** 炎の明るさ（0.75〜1.1程度）。frameは絶対フレーム基準でなくてもよい */
export function flicker(frame: number, seed = "fire"): number {
  const t = frame / 30;
  const slow = Math.sin(t * 5.1) * 0.06 + Math.sin(t * 8.3 + 1.7) * 0.04;
  const step = (random(`${seed}-${Math.floor(frame / 2)}`) - 0.5) * 0.09;
  return 0.94 + slow + step;
}

/** 放射状の光（加算風） */
export const Glow: React.FC<{ x: number; y: number; radius: number; color: string; intensity: number }> = ({ x, y, radius, color, intensity }) => (
  <div
    style={{
      position: "absolute",
      left: x - radius,
      top: y - radius,
      width: radius * 2,
      height: radius * 2,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${color} 0%, ${color.replace(/[\d.]+\)$/, "0.35)")} 22%, transparent 70%)`,
      opacity: Math.max(0, intensity),
      mixBlendMode: "screen",
      pointerEvents: "none",
    }}
  />
);

export interface Spark {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  size: number;
  wobble: number;
}

/** 火の粉（決定的な乱数）。count個を [from, to) のあいだに順に生まれさせる */
export function makeSparks(count: number, from: number, to: number, seed: string, spread = 40): Spark[] {
  return Array.from({ length: count }, (_, i) => ({
    x0: (random(`${seed}x${i}`) - 0.5) * spread,
    y0: (random(`${seed}y${i}`) - 0.5) * spread * 0.3,
    vx: (random(`${seed}vx${i}`) - 0.5) * 1.6,
    vy: -(2.2 + random(`${seed}vy${i}`) * 3.2),
    born: from + (to - from) * (i / count) + random(`${seed}b${i}`) * 6,
    life: 40 + random(`${seed}l${i}`) * 50,
    size: 2 + random(`${seed}s${i}`) * 3.5,
    wobble: random(`${seed}w${i}`) * 6.28,
  }));
}

export const Sparks: React.FC<{ sparks: Spark[]; frame: number; ox: number; oy: number; scale?: number; lift?: number }> = ({ sparks, frame, ox, oy, scale = 1, lift = 1 }) => (
  <>
    {sparks.map((s, i) => {
      const age = frame - s.born;
      if (age < 0 || age > s.life) return null;
      const k = age / s.life;
      const x = ox + (s.x0 + s.vx * age + Math.sin(age * 0.18 + s.wobble) * 6) * scale;
      const y = oy + (s.y0 + s.vy * age * lift) * scale;
      const a = Math.min(1, age / 4) * (1 - k);
      const r = s.size * scale * (1 - k * 0.4);
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x - r,
            top: y - r,
            width: r * 2,
            height: r * 2,
            borderRadius: "50%",
            background: "radial-gradient(circle, #fff6c8 0%, #ffb347 45%, rgba(255,110,30,0) 100%)",
            boxShadow: `0 0 ${r * 3}px rgba(255,150,50,${0.8 * a})`,
            opacity: a,
          }}
        />
      );
    })}
  </>
);
