// M. ロゴ — オーバーシュートのスプリング（1.15→1.0）、衝撃波リング（1本、12f）、
// 金の火花パーティクル（60粒前後）、斜めシャイン（10f、ロゴの形でマスク）。
import React from "react";
import { AbsoluteFill, Img, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { easeOut, lerp } from "./util";

export interface LogoSlamProps {
  src: string;
  /** ロゴの表示幅（px） */
  logoWidth: number;
  /** 画像の縦横比（高さ/幅） */
  aspect: number;
  /** 着地のフレーム */
  landAt?: number;
  /** シャインを始めるフレーム（既定: 着地の0.5秒後） */
  shineAt?: number;
  sparks?: number;
  /** 画面内の中心の高さ（0〜1） */
  y?: number;
}

export const LogoSlam: React.FC<LogoSlamProps> = ({ src, logoWidth, aspect, landAt = 6, shineAt, sparks = 60, y = 0.46 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const lh = logoWidth * aspect;
  const cx = width / 2;
  const cy = height * y;
  // 1.15倍から入って、着地で1.0へオーバーシュートしながら収まる
  const s = spring({ frame, fps, from: 1.15 * 1.6, to: 1, config: { damping: 9, stiffness: 180, mass: 0.7 }, durationInFrames: 24 });
  const scale = frame < landAt ? lerp(frame, [0, landAt], [1.6 * 1.15, 1.15], easeOut) : s;
  const appear = lerp(frame, [0, 3], [0, 1]);
  const d = frame - landAt;
  const ring = lerp(d, [0, 12], [0, 1], easeOut);
  const sh = shineAt ?? landAt + Math.round(fps * 0.5);
  const shineP = lerp(frame, [sh, sh + 10], [-0.3, 1.3]);

  const particles = Array.from({ length: sparks }, (_, i) => {
    const a = random(`sa${i}`) * Math.PI * 2;
    const v = 6 + random(`sv${i}`) * 22;
    const life = 20 + random(`sl${i}`) * 26;
    const t = d;
    if (t < 0 || t > life) return null;
    const k = t / life;
    const dist = v * t * (1 - k * 0.45);
    const px = cx + Math.cos(a) * (logoWidth * 0.25 + dist) * (0.8 + random(`sx${i}`) * 0.6);
    const py = cy + Math.sin(a) * (lh * 0.3 + dist * 0.7) + 0.35 * t * t * 0.3;
    const size = 3 + random(`ss${i}`) * 6;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: px,
          top: py,
          width: size,
          height: size,
          borderRadius: "50%",
          background: "radial-gradient(circle, #fff9d6 0%, #ffd34d 45%, rgba(255,160,0,0) 75%)",
          opacity: 1 - k,
          boxShadow: "0 0 10px #ffc83d",
        }}
      />
    );
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {/* 衝撃波リング */}
      {d >= 0 && d <= 12 && (
        <div
          style={{
            position: "absolute",
            left: cx,
            top: cy,
            width: 10,
            height: 10,
            borderRadius: "50%",
            border: `${lerp(d, [0, 12], [18, 1])}px solid rgba(255,240,200,${1 - ring})`,
            transform: `translate(-50%, -50%) scale(${20 + ring * 170})`,
            boxShadow: `0 0 30px rgba(255,210,120,${0.6 * (1 - ring)})`,
          }}
        />
      )}
      {particles}
      <div style={{ position: "absolute", left: cx - logoWidth / 2, top: cy - lh / 2, width: logoWidth, height: lh, transform: `scale(${scale})`, opacity: appear }}>
        {/* ロゴ本体＋ブルーム */}
        <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "blur(22px) brightness(1.3)", mixBlendMode: "screen", opacity: 0.35 + 0.4 * Math.max(0, 1 - Math.max(0, d) / 20) }} />
        {/* 斜めシャイン（ロゴのアルファでマスク） */}
        {shineP > -0.3 && shineP < 1.3 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              WebkitMaskImage: `url(${src})`,
              WebkitMaskSize: "100% 100%",
              maskImage: `url(${src})`,
              maskSize: "100% 100%",
              background: `linear-gradient(115deg, transparent ${shineP * 100 - 12}%, rgba(255,255,255,0.85) ${shineP * 100}%, transparent ${shineP * 100 + 12}%)`,
              mixBlendMode: "screen",
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};
