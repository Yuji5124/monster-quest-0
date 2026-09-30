// I. PixelToHD — ドット絵を nearest で拡大し、モザイクの粒度を32→1pxへ下げながら高解像度イラストへクロスフェードする。
// モザイクは canvas で「縮小→nearestで拡大」して作る（CSSだけでは粒度を正確に制御できないため）。
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { easeInOut, lerp, PIXELATED } from "./util";

export interface SpriteCell {
  src: string;
  cellW: number;
  cellH: number;
  col: number;
  row: number;
}

export interface PixelToHDProps {
  sprite: SpriteCell;
  hd: string;
  /** 表示領域（px） */
  width: number;
  height: number;
  /** 変化の開始・終了フレーム（既定 0→12f=0.4秒） */
  from?: number;
  to?: number;
  /** ドット絵の表示倍率 */
  spriteScale?: number;
  /** HDイラストの見せ方（object-position） */
  hdFocus?: { x: number; y: number };
}

function useImage(src: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [handle] = useState(() => delayRender(`load ${src}`));
  useEffect(() => {
    const im = new Image();
    im.onload = () => {
      setImg(im);
      continueRender(handle);
    };
    im.onerror = () => continueRender(handle);
    im.src = src;
  }, [src, handle]);
  return img;
}

/** 歩行シート等の1コマを nearest 拡大で表示 */
export const SpriteFrame: React.FC<SpriteCell & { scale: number; style?: React.CSSProperties }> = ({ style, ...cell }) => (
  <div style={{ width: cell.cellW * cell.scale, height: cell.cellH * cell.scale, ...style }}>
    <SheetScaler {...cell} />
  </div>
);

/** backgroundSize を画像の実寸×scale にするため、画像サイズを読んでから描く */
const SheetScaler: React.FC<SpriteCell & { scale: number }> = ({ src, cellW, cellH, col, row, scale }) => {
  const img = useImage(src);
  if (!img) return null;
  return (
    <div
      style={{
        width: cellW * scale,
        height: cellH * scale,
        backgroundImage: `url(${src})`,
        backgroundSize: `${img.naturalWidth * scale}px ${img.naturalHeight * scale}px`,
        backgroundPosition: `-${col * cellW * scale}px -${row * cellH * scale}px`,
        ...PIXELATED,
      }}
    />
  );
};

export const PixelToHD: React.FC<PixelToHDProps> = ({ sprite, hd, width, height, from = 0, to = 12, spriteScale = 8, hdFocus = { x: 0.5, y: 0.35 } }) => {
  const frame = useCurrentFrame();
  const hdImg = useImage(hd);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const p = lerp(frame, [from, to], [0, 1], easeInOut);
  const block = Math.max(1, Math.round(32 * Math.pow(1 / 32, p))); // 32 → 1（指数で滑らかに）

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !hdImg) return;
    const ctx = cv.getContext("2d")!;
    // object-fit: cover 相当の切り出し
    const r = Math.max(width / hdImg.naturalWidth, height / hdImg.naturalHeight);
    const sw = width / r;
    const sh = height / r;
    const sx = (hdImg.naturalWidth - sw) * hdFocus.x;
    const sy = (hdImg.naturalHeight - sh) * hdFocus.y;
    const smallW = Math.max(1, Math.round(width / block));
    const smallH = Math.max(1, Math.round(height / block));
    const tmp = document.createElement("canvas");
    tmp.width = smallW;
    tmp.height = smallH;
    const tctx = tmp.getContext("2d")!;
    tctx.imageSmoothingEnabled = true;
    tctx.drawImage(hdImg, sx, sy, sw, sh, 0, 0, smallW, smallH);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(tmp, 0, 0, smallW, smallH, 0, 0, width, height);
  }, [hdImg, block, width, height, hdFocus.x, hdFocus.y]);

  return (
    <AbsoluteFill style={{ width, height, overflow: "hidden" }}>
      {/* ドット絵（nearest） */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: 1 - lerp(frame, [from, from + (to - from) * 0.6], [0, 1]) }}>
        <SpriteFrame {...sprite} scale={spriteScale} />
      </AbsoluteFill>
      {/* HDイラスト（モザイク→解像） */}
      <canvas ref={canvasRef} width={width} height={height} style={{ position: "absolute", inset: 0, opacity: lerp(frame, [from, from + (to - from) * 0.5], [0, 1]), ...PIXELATED }} />
    </AbsoluteFill>
  );
};
