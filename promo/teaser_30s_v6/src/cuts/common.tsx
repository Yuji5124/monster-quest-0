// カット共通の小道具: 静止画カメラ、ゲーム画面の枠、全画面のゲーム画面。
import React from "react";
import { AbsoluteFill, Img } from "remotion";
import { Clip } from "../components/SpeedRamp";
import type { RampKey } from "../components/SpeedRamp";
import { GAME_H, GAME_W } from "../clips";
import type { ClipSrc } from "../clips";
import { MAP_H, MAP_W } from "../assets";

export const W = 1920;
export const H = 1080;

/** 1448×1086 の画像を「画面幅いっぱい（cover）× zoom」で置き、focus（画像内0〜1）をできるだけ画面中央に合わせる */
export function cam(focus: { x: number; y: number }, zoom: number, iw = MAP_W, ih = MAP_H) {
  const s0 = Math.max(W / iw, H / ih);
  const w = iw * s0 * zoom;
  const h = ih * s0 * zoom;
  // 画像が画面を覆う範囲に収める（端の黒が見えないように）
  const left = Math.min(0, Math.max(W - w, W / 2 - focus.x * w));
  const top = Math.min(0, Math.max(H - h, H / 2 - focus.y * h));
  return { left, top, w, h, toScreen: (nx: number, ny: number) => ({ x: left + nx * w, y: top + ny * h }) };
}

export const CamImg: React.FC<{ src: string; focus: { x: number; y: number }; zoom: number; filter?: string; pixelated?: boolean; children?: React.ReactNode }> = ({ src, focus, zoom, filter, pixelated, children }) => {
  const c = cam(focus, zoom);
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <div style={{ position: "absolute", left: c.left, top: c.top, width: c.w, height: c.h, filter }}>
        <Img src={src} style={{ width: "100%", height: "100%", display: "block", imageRendering: pixelated ? "pixelated" : undefined }} />
      </div>
      {children}
    </AbsoluteFill>
  );
};

/** ゲーム画面（4:3）を scale 倍で置き、周囲を同じ映像のぼかしで埋める。frameは「戦闘UIの枠」として残す */
export const GameFrame: React.FC<{ clip: ClipSrc; startSec: number; ramp?: RampKey[]; dur: number; scale?: number; top?: number; dim?: number; children?: React.ReactNode }> = ({ clip, startSec, ramp, dur, scale = 1.5, top, dim = 1, children }) => {
  const w = GAME_W * scale;
  const h = GAME_H * scale;
  const t = top ?? (H - h) / 2;
  const left = (W - w) / 2;
  const bgScale = W / GAME_W;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ filter: "blur(30px) brightness(0.3) saturate(1.1)", transform: "scale(1.08)" }}>
        <div style={{ position: "absolute", left: 0, top: (H - GAME_H * bgScale) / 2 }}>
          <Clip clip={clip} startSec={startSec} ramp={ramp} width={GAME_W * bgScale} height={GAME_H * bgScale} durationInFrames={dur} />
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left, top: t, width: w, height: h, boxShadow: "0 0 60px rgba(0,0,0,0.8)", outline: "2px solid rgba(255,255,255,0.18)", filter: dim !== 1 ? `brightness(${dim})` : undefined }}>
        <Clip clip={clip} startSec={startSec} ramp={ramp} width={w} height={h} durationInFrames={dur} />
      </div>
      {children}
    </AbsoluteFill>
  );
};

/** ゲーム画面を画面いっぱい（16:9に上下を切って）表示する。3D城・王の間・ビーエで使う */
export const GameFull: React.FC<{ clip: ClipSrc; startSec: number; ramp?: RampKey[]; dur: number; yFocus?: number; zoom?: number; filter?: string }> = ({ clip, startSec, ramp, dur, yFocus = 0.5, zoom = 1, filter }) => {
  const s = (W / GAME_W) * zoom;
  const w = GAME_W * s;
  const h = GAME_H * s;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: (W - w) / 2, top: H / 2 - yFocus * h, filter }}>
        <Clip clip={clip} startSec={startSec} ramp={ramp} width={w} height={h} durationInFrames={dur} />
      </div>
    </AbsoluteFill>
  );
};

/** カメラシェイク（awesome-ai-motion-JP `camera-shake`: 振幅6px・回転0.6°を基準に強さで倍率） */
export function shake(frame: number, at: number, len: number, amp: number, seed: string) {
  const d = frame - at;
  if (d < 0 || d > len) return { x: 0, y: 0, r: 0 };
  const k = 1 - d / len;
  const n = (s: string) => Math.sin(frame * 2.7 + s.length * 1.3) * 0.5 + Math.sin(frame * 5.3 + seed.length) * 0.5;
  return { x: n("x" + seed) * amp * k, y: Math.cos(frame * 3.9 + seed.length) * amp * k, r: Math.sin(frame * 4.4) * 0.6 * k * (amp / 6) };
}
