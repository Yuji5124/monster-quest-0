// B. Parallax25D — 静止画を前景・中景・背景の3レイヤーに分け、スケールと位置を別速度で動かす。
// レイヤー分けは単純な手描きマスク（CSSのグラデーションマスク）で作る。深度推定は使わない。
// mode="kenburns" はフォールバック（1.00→1.08倍＋わずかな回転）。
import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { lerp } from "./util";

export interface ParallaxLayerMask {
  /** CSS mask-image（例: 下40%だけ見せる linear-gradient） */
  mask: string;
  /** 動きの強さ（背景=0 → 前景=1） */
  depth: number;
}

export interface Parallax25DProps {
  src: string;
  mode?: "layers" | "kenburns";
  /** 中景・前景のマスク。省略時は「画面下ほど手前」の単純な3層 */
  layers?: ParallaxLayerMask[];
  /** カメラの移動方向（-1〜1）。xは右へ、yは下へ */
  drift?: { x: number; y: number };
  /** 全体のズーム量（背景基準） */
  zoom?: number;
  /** 画像のどこを中心に見せるか（0〜1） */
  focus?: { x: number; y: number };
  durationInFrames?: number;
  pixelated?: boolean;
}

const DEFAULT_LAYERS: ParallaxLayerMask[] = [
  { mask: "linear-gradient(to bottom, transparent 30%, black 52%)", depth: 0.5 },
  { mask: "linear-gradient(to bottom, transparent 62%, black 80%)", depth: 1 },
];

export const Parallax25D: React.FC<Parallax25DProps> = ({
  src,
  mode = "layers",
  layers = DEFAULT_LAYERS,
  drift = { x: -0.5, y: 0.1 },
  zoom = 0.06,
  focus = { x: 0.5, y: 0.5 },
  durationInFrames,
  pixelated = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames: compDur } = useVideoConfig();
  const dur = durationInFrames ?? compDur;
  const t = lerp(frame, [0, dur], [0, 1]);
  const imgStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${focus.x * 100}% ${focus.y * 100}%`,
    imageRendering: pixelated ? "pixelated" : undefined,
  };
  if (mode === "kenburns") {
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <AbsoluteFill style={{ transform: `scale(${1 + 0.08 * t}) rotate(${0.6 * t}deg)`, transformOrigin: `${focus.x * 100}% ${focus.y * 100}%` }}>
          <Img src={src} style={imgStyle} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  // 背景(depth 0)＋各マスク層。深いほど大きく・速く動く
  const all = [{ mask: "none", depth: 0 }, ...layers];
  const base = 1.1; // 端が見えないよう少し拡大
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {all.map((l, i) => {
        const s = base + zoom * t * (1 + l.depth * 1.8);
        const dx = drift.x * width * 0.025 * t * (0.4 + l.depth * 1.6);
        const dy = drift.y * height * 0.025 * t * (0.4 + l.depth * 1.6);
        return (
          <AbsoluteFill
            key={i}
            style={{
              transform: `translate(${dx}px, ${dy}px) scale(${s})`,
              transformOrigin: `${focus.x * 100}% ${focus.y * 100}%`,
              WebkitMaskImage: l.mask === "none" ? undefined : l.mask,
              maskImage: l.mask === "none" ? undefined : l.mask,
            }}
          >
            <Img src={src} style={imgStyle} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
