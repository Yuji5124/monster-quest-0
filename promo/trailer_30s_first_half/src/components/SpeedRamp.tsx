// G. SpeedRamp — 録画クリップの再生速度をキーフレームで変える（区間の間は cubic-bezier で補間）
// 実装: 各出力フレームの「元動画の秒」を速度の積分で求め、OffthreadVideo をその時刻で止めて表示する。
// 頭出しは <Freeze frame={0}> ＋ startFrom で行う（Freezeのフレーム番号で頭出しすると、
// Compositionの長さを超える位置で誤った時刻になるため）。素材は *_x2.mp4（clips.ts参照）なので、
// startFrom = 元の秒 × 60 で元の60fpsの1コマ単位になる。
import React, { useMemo } from "react";
import { Easing, Freeze, OffthreadVideo, useCurrentFrame, useVideoConfig } from "remotion";
import { CLIP_FPS } from "../clips";
import { PIXELATED } from "./util";

export interface RampKey {
  /** このコンポーネント内のフレーム */
  at: number;
  /** 再生速度（1=等速） */
  rate: number;
}

/** キーフレームから、出力フレームごとの元動画の秒を作る */
export function buildTimeMap(frames: number, fps: number, startSec: number, keys: RampKey[], bezier = [0.45, 0, 0.55, 1] as const): number[] {
  const ease = Easing.bezier(bezier[0], bezier[1], bezier[2], bezier[3]);
  const sorted = [...keys].sort((a, b) => a.at - b.at);
  const rateAt = (f: number) => {
    if (!sorted.length) return 1;
    if (f <= sorted[0].at) return sorted[0].rate;
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (f <= b.at) return a.rate + (b.rate - a.rate) * ease((f - a.at) / Math.max(1, b.at - a.at));
    }
    return sorted[sorted.length - 1].rate;
  };
  const out: number[] = [];
  let t = startSec;
  for (let f = 0; f < frames; f++) {
    out.push(t);
    t += rateAt(f + 0.5) / fps;
  }
  return out;
}

export interface ClipProps {
  src: string;
  /** 元動画の開始秒 */
  startSec: number;
  /** 速度キー。省略時は等速 */
  ramp?: RampKey[];
  /** 表示サイズ（nearestで拡大） */
  width: number;
  height: number;
  style?: React.CSSProperties;
  /** 出力の長さ（フレーム）。時刻表の長さに使う */
  durationInFrames: number;
}

/** 速度を変えられるゲーム画面クリップ（常にnearest拡大） */
export const Clip: React.FC<ClipProps> = ({ src, startSec, ramp, width, height, style, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const map = useMemo(() => buildTimeMap(durationInFrames, fps, startSec, ramp ?? [{ at: 0, rate: 1 }]), [durationInFrames, fps, startSec, ramp]);
  const t = map[Math.min(Math.max(frame, 0), map.length - 1)];
  const srcFrame = Math.max(0, Math.round(t * CLIP_FPS));
  return (
    <Freeze frame={0}>
      <OffthreadVideo src={src} muted startFrom={srcFrame} style={{ width, height, display: "block", ...PIXELATED, ...style }} />
    </Freeze>
  );
};
