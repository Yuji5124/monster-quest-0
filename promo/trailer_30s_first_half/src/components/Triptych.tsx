// D. Triptych — 3枚を斜め（-8°）の平行四辺形マスクで並べ、拍ごとに1枚ずつスライドインさせる。
// 縦型（§7）では縦3段に並べ替える（帯は水平方向に傾ける）。
import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { DOT } from "../fonts";
import { easeOut, lerp } from "./util";

export interface TriptychPanel {
  src: string;
  label: string;
  /** 画像のどこを見せるか（0〜1） */
  focus?: { x: number; y: number };
}

export interface TriptychProps {
  panels: [TriptychPanel, TriptychPanel, TriptychPanel];
  /** 各パネルが入るフレーム（拍） */
  inAt: [number, number, number];
  /** スライドにかけるフレーム */
  slide?: number;
  angleDeg?: number;
}

export const Triptych: React.FC<TriptychProps> = ({ panels, inAt, slide = 7, angleDeg = 8 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const tall = height > width;
  const gap = 10;
  const tan = Math.tan((angleDeg * Math.PI) / 180);
  return (
    <AbsoluteFill style={{ backgroundColor: "#07070c", overflow: "hidden" }}>
      {panels.map((p, i) => {
        const prog = lerp(frame, [inAt[i], inAt[i] + slide], [0, 1], easeOut);
        let clip: string;
        let from: string;
        if (!tall) {
          // 横: 幅を3等分し、境界を -8° 傾ける
          const w = width / 3;
          const off = (height * tan) / 2;
          const x0 = i * w + (i === 0 ? -off * 2 : gap / 2);
          const x1 = (i + 1) * w + (i === 2 ? off * 2 : -gap / 2);
          clip = `polygon(${x0 + off}px 0, ${x1 + off}px 0, ${x1 - off}px ${height}px, ${x0 - off}px ${height}px)`;
          from = `translate(${(1 - prog) * 0.35 * width}px, ${(1 - prog) * -0.35 * width * tan}px)`;
        } else {
          const h = height / 3;
          const off = (width * tan) / 2;
          const y0 = i * h + (i === 0 ? -off * 2 : gap / 2);
          const y1 = (i + 1) * h + (i === 2 ? off * 2 : -gap / 2);
          clip = `polygon(0 ${y0 + off}px, ${width}px ${y0 - off}px, ${width}px ${y1 - off}px, 0 ${y1 + off}px)`;
          from = `translate(${(1 - prog) * (i % 2 ? -1 : 1) * width}px, 0)`;
        }
        // パネル中心
        const cx = tall ? width / 2 : (i + 0.5) * (width / 3);
        const cy = tall ? (i + 0.5) * (height / 3) : height / 2;
        // 縦型は §7 の安全領域（上下250px）の内側に収める
        const labelY = tall ? Math.min(Math.max(cy + height / 6 - 110, 270), height - 250 - 90) : height - 150;
        return (
          <AbsoluteFill key={i} style={{ transform: from, opacity: prog > 0 ? 1 : 0 }}>
            <AbsoluteFill style={{ clipPath: clip }}>
              <Img
                src={p.src}
                style={{
                  position: "absolute",
                  left: tall ? 0 : cx - width / 3,
                  top: tall ? cy - height / 5 : 0,
                  width: tall ? width : (width / 3) * 2,
                  height: tall ? (height / 5) * 2 : height,
                  objectFit: "cover",
                  objectPosition: `${(p.focus?.x ?? 0.5) * 100}% ${(p.focus?.y ?? 0.5) * 100}%`,
                  transform: `scale(${1.12 - 0.08 * prog})`,
                }}
              />
              <AbsoluteFill style={{ background: "linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.55))" }} />
            </AbsoluteFill>
            <div
              style={{
                position: "absolute",
                left: tall ? 0 : cx - 300,
                width: tall ? width : 600,
                whiteSpace: "nowrap",
                top: labelY,
                textAlign: "center",
                display: "flex",
                justifyContent: "center",
                fontFamily: DOT,
                fontSize: tall ? 50 : 46,
                color: "#fff",
                textShadow: "0 2px 8px rgba(0,0,0,0.9), 0 0 2px #000",
                opacity: lerp(frame, [inAt[i] + 3, inAt[i] + slide + 2], [0, 1]),
              }}
            >
              <span style={{ backgroundColor: "rgba(6,8,14,0.62)", padding: "8px 18px", borderRadius: 4 }}>{p.label}</span>
            </div>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
