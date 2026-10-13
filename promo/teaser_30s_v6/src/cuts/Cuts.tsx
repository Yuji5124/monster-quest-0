// 統合マスタープロンプト v6.0 の CUT 01〜08（アニマティック）。各カットは自分の Sequence 内で 0 から数える。
// 字幕は Teaser.tsx が data/timeline.json から重ねる（ここでは描かない）。
// 「予告専用の誇張」と明記した部分は、ゲーム本体に存在しない演出（まじんの枠外への巨大化、3Dの岩、3Dの矢）。
import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { IMG, WORLD_POINT } from "../assets";
import { CLIP } from "../clips";
import { Parallax25D } from "../components/Parallax25D";
import { Glow, flicker, makeSparks, Sparks } from "../components/Light";
import { Dust, perspective, RockShape, Shards } from "../components/Rock";
import { ExposurePulse, Shockwave, SpeedLines } from "../components/Effects";
import { easeIn, easeInOut, easeOut, lerp } from "../components/util";
import { cam, CamImg, GameFrame, GameFull, H, shake, W } from "./common";

const PIX: React.CSSProperties = { imageRendering: "pixelated" };

// ─── CUT01 00:00–00:04 火から始まる物語 ──────────────────────────────
// 夜の No.01（正式背景）＋主人公の背中（CURRENT参照ドット「うしろ1」）。暗闇から焚き火が先に灯り、風景が後から浮かぶ。
// 火の粉が昇り、最後はカメラが火の粉を追って上へ → CUT02 の「光点」へ（横井シフト）。
const FIRE = { x: 0.49, y: 0.468 };
const HERO = { x: 0.512, y: 0.552 };
const SPARKS01 = makeSparks(70, 0, 118, "c01", 46);
const LEAD = makeSparks(6, 70, 96, "lead", 30);

export const CUT01: React.FC = () => {
  const f = useCurrentFrame();
  const tilt = lerp(f, [88, 120], [0, 1], easeIn);
  const zoom = lerp(f, [0, 100], [1.3, 1.62], easeInOut) + tilt * 0.25;
  const focus = { x: lerp(f, [0, 100], [0.5, 0.495], easeInOut), y: lerp(f, [0, 100], [0.5, 0.505], easeInOut) - tilt * 0.22 };
  const c = cam(focus, zoom);
  const fire = c.toScreen(FIRE.x, FIRE.y);
  const hero = c.toScreen(HERO.x, HERO.y);
  const fl = flicker(f);
  const scene = lerp(f, [10, 62], [0, 0.8], easeOut) * lerp(f, [92, 120], [1, 0.25]);
  const fireOn = lerp(f, [2, 22], [0, 1], easeOut);
  const heroH = c.h * 0.066;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <CamImg src={IMG.startingPlaceNight} focus={focus} zoom={zoom} filter={`brightness(${scene}) saturate(0.9)`} />
      {/* 焚き火の光（風景より先に灯る） */}
      <Glow x={fire.x} y={fire.y} radius={c.h * 0.2 * fl} color="rgba(255,140,50,0.55)" intensity={fireOn * fl} />
      <Glow x={fire.x} y={fire.y} radius={c.h * 0.05 * fl} color="rgba(255,230,160,0.9)" intensity={fireOn} />
      {/* 主人公の背中。火に照らされる側だけ暖色 */}
      <div style={{ position: "absolute", left: hero.x - heroH * 0.5, top: hero.y - heroH * 0.5, width: heroH, height: heroH, filter: `brightness(${Math.max(scene * 1.15, fireOn * 0.55)}) drop-shadow(0 -4px 10px rgba(255,140,60,${0.5 * fireOn}))` }}>
        <Img src={IMG.heroBack} style={{ width: "100%", height: "100%", ...PIX }} />
      </div>
      <Sparks sparks={SPARKS01} frame={f} ox={fire.x} oy={fire.y} scale={zoom * 0.9} />
      {/* 画面上へ抜けていく「先導の火の粉」。CUT02で光点として地図へ落ちる */}
      <Sparks sparks={LEAD} frame={f} ox={fire.x} oy={fire.y} scale={zoom * 1.6} lift={2.4} />
    </AbsoluteFill>
  );
};

// ─── CUT02 00:04–00:08 旅する世界 ─────────────────────────────────
// 火の粉の光点が世界地図（正式背景）へ落ち、実際の地点座標（destinations.json）を No.01→02→03→04→05→06 の順に進む。
// 到着ごとに町・森・村を短く差し込む。差し込みは全て「右へ進む」横移動で統一し、旅の向きを連続させる。字幕なし。
const ROUTE = [WORLD_POINT.no01, WORLD_POINT.no02, WORLD_POINT.no03, WORLD_POINT.no04, WORLD_POINT.no05, WORLD_POINT.no06];
// [開始, 終了] ローカルフレーム：区間 i（ROUTE[i]→ROUTE[i+1]）
const LEGS: Array<[number, number]> = [[14, 26], [42, 50], [66, 74], [92, 104], [104, 116]];
const INSERTS: Array<{ from: number; to: number; kind: "img" | "clip"; src?: string; focus?: { x: number; y: number } }> = [
  { from: 26, to: 42, kind: "img", src: IMG.startingTown, focus: { x: 0.5, y: 0.45 } },
  { from: 50, to: 66, kind: "img", src: IMG.startingForest, focus: { x: 0.45, y: 0.5 } },
  { from: 74, to: 92, kind: "clip" },
];

function routeProgress(f: number): number {
  let p = 0;
  LEGS.forEach(([a, b]) => {
    p += lerp(f, [a, b], [0, 1], easeInOut);
  });
  return p; // 0〜5
}
function routePoint(p: number) {
  const i = Math.min(ROUTE.length - 2, Math.floor(p));
  const k = Math.min(1, p - i);
  return { x: ROUTE[i].x + (ROUTE[i + 1].x - ROUTE[i].x) * k, y: ROUTE[i].y + (ROUTE[i + 1].y - ROUTE[i].y) * k };
}

const MapWithRoute: React.FC<{ f: number }> = ({ f }) => {
  const p = routeProgress(f);
  const head = routePoint(p);
  // カメラは光の先頭を追い、最後は No.06（レインランドじょう）へ寄って傾きを戻す（CUT03へ）
  const settle = lerp(f, [100, 120], [0, 1], easeInOut);
  const focus = { x: head.x * (1 - settle) + WORLD_POINT.no06.x * settle, y: head.y * (1 - settle) + WORLD_POINT.no06.y * settle };
  const zoom = lerp(f, [0, 20, 100, 120], [1.15, 1.7, 1.7, 2.0], easeInOut);
  const tiltDeg = lerp(f, [0, 20, 96, 120], [38, 30, 30, 0], easeInOut);
  const c = cam(focus, zoom);
  const fade = lerp(f, [0, 10], [0, 1]);
  // 通過済みの道筋（画像座標）
  const pts: string[] = [];
  for (let q = 0; q <= p + 1e-6; q += 0.05) {
    const r = routePoint(Math.min(q, p));
    pts.push(`${r.x * 1448},${r.y * 1086}`);
  }
  const visited = ROUTE.slice(0, Math.floor(p) + 1);
  // 落ちてくる光点（CUT01の先導の火の粉）
  const drop = lerp(f, [0, 14], [0, 1], easeIn);
  const head0 = c.toScreen(ROUTE[0].x, ROUTE[0].y);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden", perspective: 1400 }}>
      <div style={{ position: "absolute", left: c.left, top: c.top, width: c.w, height: c.h, transformOrigin: `${focus.x * c.w}px ${focus.y * c.h}px`, transform: `rotateX(${tiltDeg}deg)`, opacity: fade }}>
        <Img src={IMG.worldMap} style={{ width: "100%", height: "100%", display: "block", filter: "saturate(1.05) brightness(0.92)" }} />
        <svg viewBox="0 0 1448 1086" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          <polyline points={pts.join(" ")} fill="none" stroke="rgba(255,190,90,0.45)" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" style={{ filter: "blur(3px)" }} />
          <polyline points={pts.join(" ")} fill="none" stroke="#ffe7b0" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 6" />
          {visited.map((v, i) => (
            <circle key={i} cx={v.x * 1448} cy={v.y * 1086} r={5} fill="#fff3d0" stroke="rgba(255,160,60,0.9)" strokeWidth={3} />
          ))}
          {f >= 14 && (
            <>
              <circle cx={head.x * 1448} cy={head.y * 1086} r={18 * flicker(f, "head")} fill="rgba(255,170,70,0.35)" />
              <circle cx={head.x * 1448} cy={head.y * 1086} r={6} fill="#fffbe8" />
            </>
          )}
        </svg>
      </div>
      {f < 16 &&
        [0, 1, 2].map((i) => {
          const sx = head0.x + (i - 1) * 140 * (1 - drop);
          const sy = -40 + (head0.y + 40) * drop - i * 30 * (1 - drop);
          return <Glow key={i} x={sx} y={sy} radius={22} color="rgba(255,200,110,0.9)" intensity={1} />;
        })}
      <ExposurePulse frame={f} at={14} peak={0.35} decay={6} color="#ffd08a" />
    </AbsoluteFill>
  );
};

const Insert: React.FC<{ f: number; from: number; to: number; kind: "img" | "clip"; src?: string; focus?: { x: number; y: number } }> = ({ f, from, to, kind, src, focus }) => {
  const local = f - from;
  const dur = to - from;
  // whip（awesome-ai-motion-JP `whip-pan` を短縮: 4f・横ブラー）で右から入り、右へ流れて出る
  const enter = lerp(local, [0, 4], [1, 0], easeOut);
  const exit = lerp(local, [dur - 3, dur], [0, 1], easeIn);
  const x = enter * 420 - exit * 420 - lerp(local, [0, dur], [0, 70]);
  const blur = (enter + exit) * 18;
  return (
    <AbsoluteFill style={{ transform: `translateX(${x}px)`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined }}>
      {kind === "img" ? (
        <CamImg src={src!} focus={{ x: (focus?.x ?? 0.5) + local * 0.0012, y: focus?.y ?? 0.5 }} zoom={1.25} />
      ) : (
        <GameFull clip={CLIP.cap_bie} startSec={3.4} dur={dur} zoom={1.15} yFocus={0.45} />
      )}
      {/* 旅の光が画面を横切る（左→右）。どの場所でも同じ向きに進む */}
      <Glow x={lerp(local, [0, dur], [260, 1660])} y={300 + Math.sin(local * 0.3) * 12} radius={26} color="rgba(255,205,120,0.9)" intensity={0.85} />
    </AbsoluteFill>
  );
};

export const CUT02: React.FC = () => {
  const f = useCurrentFrame();
  const ins = INSERTS.find((i) => f >= i.from && f < i.to);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <MapWithRoute f={f} />
      {ins && <Insert f={f} {...ins} />}
    </AbsoluteFill>
  );
};

// ─── CUT03 00:08–00:12 地図の中へ入る ───────────────────────────────
// 地図の No.06 地点へ高速ズーム → 地図に開いた「穴」（049 ポータル歪曲の代替）からレインランドの城が見える
// → 城へ突入 → ゲーム本体の3D城（実録）を前進 → 王の間3D（実録）で玉座へ。
// 正式な世界地図には城の絵が描かれていないため、「平面の城が立体になる」を「地図が入れる空間に変わる」で表現する。
const CASTLE = { x: 0.66, y: 0.17 };

export const CUT03: React.FC = () => {
  const f = useCurrentFrame();
  // 1) 地図ズーム（指数で加速）
  const z = lerp(f, [0, 26], [0, 1], easeIn);
  const mapZoom = 2.0 * Math.pow(7, z);
  const mapBlur = lerp(f, [6, 26], [0, 1]);
  // 2) ポータル
  const portalR = lerp(f, [12, 40], [0, 1300], easeOut);
  const inside = lerp(f, [12, 44], [2.4, 1.15], easeOut);
  // 3) 城へ突入
  const push = lerp(f, [44, 70], [1.15, 3.4], easeIn);
  const castleFocus = { x: lerp(f, [12, 70], [0.6, CASTLE.x], easeInOut), y: lerp(f, [12, 70], [0.3, CASTLE.y + 0.03], easeInOut) };
  const showMap = f < 40;
  const showCastle = f >= 12 && f < 72;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {showMap && (
        <AbsoluteFill>
          <CamImg src={IMG.worldMap} focus={WORLD_POINT.no06} zoom={mapZoom} filter="saturate(1.05) brightness(0.92)" />
          {mapBlur > 0.02 &&
            [1, 2, 3, 4].map((i) => (
              <AbsoluteFill key={i} style={{ opacity: 0.22 * mapBlur, transform: `scale(${1 + 0.05 * i * mapBlur})` }}>
                <CamImg src={IMG.worldMap} focus={WORLD_POINT.no06} zoom={mapZoom} />
              </AbsoluteFill>
            ))}
          <Glow x={W / 2} y={H / 2} radius={60 + 200 * z} color="rgba(255,220,150,0.9)" intensity={0.8} />
        </AbsoluteFill>
      )}
      {showCastle && (
        <AbsoluteFill style={{ clipPath: f < 40 ? `circle(${portalR}px at 50% 50%)` : undefined }}>
          <CamImg src={IMG.castleTownSplash} focus={castleFocus} zoom={f < 44 ? inside : push} filter={`brightness(${lerp(f, [60, 70], [1, 1.8])})`} />
          {/* 差し込む光（032 ゴッドレイの代替） */}
          <AbsoluteFill style={{ background: "conic-gradient(from 160deg at 60% -10%, transparent 0deg, rgba(255,240,200,0.18) 8deg, transparent 16deg, rgba(255,240,200,0.12) 26deg, transparent 34deg, rgba(255,240,200,0.16) 44deg, transparent 52deg)", mixBlendMode: "screen", opacity: lerp(f, [20, 40, 66], [0, 1, 0.4]) }} />
        </AbsoluteFill>
      )}
      {f >= 12 && f < 40 && (
        // ポータルの縁の光
        <div style={{ position: "absolute", left: W / 2 - portalR, top: H / 2 - portalR, width: portalR * 2, height: portalR * 2, borderRadius: "50%", boxShadow: "0 0 40px 14px rgba(255,170,60,0.75), inset 0 0 50px 10px rgba(255,200,120,0.6)", border: "3px solid rgba(255,230,170,0.9)" }} />
      )}
      {f >= 70 && f < 92 && <GameFull clip={CLIP.cap_castle3d_pc} startSec={1.2} ramp={[{ at: 0, rate: 1.9 }]} dur={22} yFocus={0.5} />}
      {f >= 92 && (
        <AbsoluteFill>
          <GameFull clip={CLIP.cap_throne3d_pc} startSec={6.9} ramp={[{ at: 0, rate: 1.7 }, { at: 28, rate: 0.7 }]} dur={28} yFocus={0.5} />
          <AbsoluteFill style={{ background: "conic-gradient(from 170deg at 50% -15%, transparent 0deg, rgba(255,236,190,0.16) 6deg, transparent 12deg, rgba(255,236,190,0.1) 19deg, transparent 25deg)", mixBlendMode: "screen" }} />
        </AbsoluteFill>
      )}
      <ExposurePulse frame={f} at={70} peak={0.85} decay={5} />
    </AbsoluteFill>
  );
};

// ─── CUT04 00:12–00:16 まじんとの戦闘 ───────────────────────────────
// ゲーム本体のまじん戦（No.07 10F・実録、PC向けに撮り直し）。「まじんが あらわれた！」まで実画面。
// その後の巨大化は【予告専用の誇張】（ゲームには巨大化演出が未実装: docs/BATTLE_SPEC.md §9.1）。
// 4:3の実画面の枠を残したまま、まじんの高解像度ドット（monster_majin_dungeon.png 1コマ目）だけが枠を越えて迫る。
const FRAME_SCALE = 1.2;
const FRAME_TOP = 10;
const MAJIN_IN_GAME = { x: 0.645, y: 0.285 };
/** ゲーム画面の枠の位置（scaleとtopから） */
const frameMap = (scale: number, top: number) => ({
  x: (x: number) => (W - 960 * scale) / 2 + x * 960 * scale,
  y: (y: number) => top + y * 720 * scale,
});

export const CUT04: React.FC = () => {
  const f = useCurrentFrame();
  const grow = lerp(f, [46, 68], [0, 1], easeIn);
  const settle = lerp(f, [68, 120], [0, 1], easeOut);
  // 巨大化と同時にカメラが引き、枠（戦闘UI）が小さくなる → 枠を物差しにして、まじんが枠の右上を突き破る
  const fs = lerp(f, [42, 66], [FRAME_SCALE, 0.9], easeInOut);
  const ft = lerp(f, [42, 66], [FRAME_TOP, 96], easeInOut);
  const m = frameMap(fs, ft);
  const cellH = 128 * fs * 1.05; // ゲーム内のまじんの見かけの大きさに合わせた1コマの表示サイズ
  const s = 1 + grow * 4.3 + settle * 0.3;
  const target = { x: W / 2 + 300, y: 400 };
  const mx = m.x(MAJIN_IN_GAME.x) + (target.x - m.x(MAJIN_IN_GAME.x)) * grow;
  const my = m.y(MAJIN_IN_GAME.y) + (target.y - m.y(MAJIN_IN_GAME.y)) * grow;
  const sh = shake(f, 68, 30, 14, "m");
  const sh2 = shake(f, 46, 22, 5 * grow, "g");
  const hit = f >= 68 && f < 72;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {f >= 3 && (
        <AbsoluteFill style={{ transform: `translate(${sh.x + sh2.x}px, ${sh.y + sh2.y}px) rotate(${sh.r}deg) scale(${1 + settle * 0.03})` }}>
          <GameFrame clip={CLIP.cap_majin_boss_pc} startSec={1.0} ramp={[{ at: 0, rate: 1 }, { at: 40, rate: 1 }, { at: 48, rate: 0.04 }]} dur={117} scale={fs} top={ft} dim={lerp(f, [44, 62], [1, 0.6])} />
          {f >= 46 && (
            // 【予告専用の誇張】枠の上に重ねる巨大化したまじん（シートの1コマ目）。ゲーム内の位置・大きさから始める
            <div style={{ position: "absolute", left: mx - (cellH * s) / 2, top: my - (cellH * s) / 2, width: cellH * s, height: cellH * s, overflow: "hidden", filter: `drop-shadow(0 0 ${8 + 22 * grow}px rgba(255,70,40,${0.35 + 0.45 * grow})) ${hit ? "brightness(2.2) saturate(0.4)" : ""}` }}>
              <Img src={IMG.majinSheet} style={{ position: "absolute", left: 0, top: 0, width: cellH * s * 4, height: cellH * s * 4, ...PIX }} />
            </div>
          )}
        </AbsoluteFill>
      )}
      {/* 主人公側からの魔法の閃光 → 衝撃波（203 / 039 の代替） */}
      <Glow x={m.x(0.5)} y={m.y(0.42)} radius={lerp(f, [62, 68], [10, 280])} color="rgba(200,230,255,0.95)" intensity={lerp(f, [62, 68, 76], [0, 1, 0])} />
      <ExposurePulse frame={f} at={68} peak={0.95} decay={6} color="#e8f2ff" />
      <Shockwave frame={f} at={68} x={target.x} y={target.y} maxR={1500} dur={20} />
      <Shockwave frame={f} at={98} x={target.x} y={target.y} maxR={900} dur={16} color="255,200,160" />
      <SpeedLines frame={f} x={target.x} y={target.y} opacity={lerp(f, [46, 60, 74], [0, 0.55, 0])} />
    </AbsoluteFill>
  );
};

// ─── CUT05 00:16–00:20 タロサとの出会い ─────────────────────────────
// ザボンのむら（正式入場イラスト）→ タロサの既存イラスト（弓を引く: tarosa_archery_report.png）へ寄る
// → 矢を放つ（予告専用の矢）→ カメラが矢を追う → 矢は奥行き方向へ消え、CUT06の洞窟へ（横井シフト）。
const ARROW_TIP = { x: 0.625, y: 0.222 };

const Arrow: React.FC<{ x: number; y: number; len: number; angle: number; trail: number }> = ({ x, y, len, angle, trail }) => (
  <div style={{ position: "absolute", left: x - len, top: y - len * 0.06, width: len, height: len * 0.12, transform: `rotate(${angle}deg)`, transformOrigin: "100% 50%" }}>
    <div style={{ position: "absolute", right: len * 0.9, top: "50%", width: trail, height: len * 0.05, transform: "translateY(-50%)", background: "linear-gradient(to right, rgba(255,250,230,0), rgba(255,250,230,0.7))", filter: "blur(2px)" }} />
    <svg width={len} height={len * 0.12} viewBox="0 0 100 12" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
      <line x1={6} y1={6} x2={90} y2={6} stroke="#8a5a2b" strokeWidth={1.6} />
      <polygon points="88,2.5 100,6 88,9.5" fill="#d9dde4" stroke="#5c6470" strokeWidth={0.5} />
      <polygon points="0,1 12,6 0,11 4,6" fill="#f3efe6" stroke="#9a8f7f" strokeWidth={0.4} />
    </svg>
  </div>
);

export const CUT05: React.FC = () => {
  const f = useCurrentFrame();
  const cross = lerp(f, [24, 32], [0, 1]);
  // タロサへの寄り（cam座標）
  const zoom = lerp(f, [24, 80], [1.02, 1.32], easeInOut) + lerp(f, [74, 82], [0, 0.03], easeIn);
  const focus = { x: lerp(f, [24, 80], [0.47, 0.44], easeInOut), y: lerp(f, [24, 80], [0.42, 0.32], easeInOut) };
  // 放った後: カメラが矢を追う（whip）
  const whip = lerp(f, [84, 100], [0, 1], easeIn);
  const c = cam(focus, zoom);
  const tip = c.toScreen(ARROW_TIP.x, ARROW_TIP.y);
  const released = f >= 84;
  // 矢の位置（画面）: 放った直後は右上へ、カメラが追い付くと中央付近に留まり、最後は奥（中央）へ縮む
  const fly = lerp(f, [84, 96], [0, 1], easeOut);
  const ax = tip.x + (W * 0.58 - tip.x) * fly;
  const ay = tip.y + (H * 0.46 - tip.y) * fly;
  const depth = lerp(f, [100, 120], [0, 1], easeIn);
  const ascale = perspective(depth * 2600);
  const toCave = lerp(f, [86, 104], [0, 1], easeOut);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {f < 32 && (
        <AbsoluteFill style={{ opacity: 1 - cross }}>
          <Parallax25D src={IMG.zabonSplash} drift={{ x: -0.8, y: 0.1 }} zoom={0.06} focus={{ x: 0.5, y: 0.5 }} durationInFrames={32} />
        </AbsoluteFill>
      )}
      {f >= 24 && (
        <AbsoluteFill style={{ transform: `translateX(${-whip * 520}px) scale(${1 + whip * 0.15})`, opacity: cross * (1 - toCave), filter: whip > 0.02 ? `blur(${whip * 22}px)` : undefined }}>
          <CamImg src={IMG.tarosaArchery} focus={focus} zoom={zoom} />
        </AbsoluteFill>
      )}
      {/* 洞窟の暗さへ（CUT06の入り） */}
      <AbsoluteFill style={{ opacity: toCave }}>
        <CamImg src={IMG.iwayamaSplash} focus={{ x: 0.5, y: 0.45 }} zoom={1.1} filter={`brightness(0.4) blur(${lerp(f, [86, 120], [14, 4])}px)`} />
      </AbsoluteFill>
      <SpeedLines frame={f} x={W * 0.58} y={H * 0.46} opacity={lerp(f, [86, 94, 110, 118], [0, 0.55, 0.55, 0])} seed={7} />
      {released && <Arrow x={W / 2 + (ax - W / 2) * ascale} y={H / 2 + (ay - H / 2) * ascale} len={300 * ascale * (1 + fly * 0.2)} angle={lerp(f, [84, 96], [-12, -4])} trail={lerp(f, [84, 92], [0, 520]) * ascale} />}
      <ExposurePulse frame={f} at={84} peak={0.45} decay={4} />
    </AbsoluteFill>
  );
};

// ─── CUT06 00:20–00:25 いわやまのどうくつ（最大の見せ場） ─────────────────
// 矢が岩を砕く（予告専用の簡易3D岩）→ ゲーム本体の縦スクロール崩落シューティング（実録: タロサが前で矢を撃ち、主人公が後ろを進む）
// と、画面手前を落ちる3Dの岩を交互に見せる → 最後の大岩が手前へ迫り暗転。
// 岩は「道をふさぐもの」から「壊すと道が開くもの」へ（横井シフト）。
const FG_ROCKS = [
  { at: 22, x0: 1700, x1: 1180, seed: "a", z: 300, size: 300 },
  { at: 30, x0: 140, x1: 520, seed: "b", z: 120, size: 360 },
  { at: 84, x0: 1600, x1: 1300, seed: "c", z: 60, size: 420 },
  { at: 88, x0: 300, x1: 620, seed: "d", z: 380, size: 280 },
  { at: 94, x0: 1100, x1: 900, seed: "e", z: -120, size: 480 },
];

export const CUT06: React.FC = () => {
  const f = useCurrentFrame();
  const impact = 8;
  const s1 = shake(f, impact, 14, 16, "i");
  const s2 = shake(f, 80, 24, 12, "c");
  const s3 = shake(f, 124, 26, 18 * lerp(f, [124, 146], [0.3, 1]), "f");
  const sx = s1.x + s2.x + s3.x;
  const sy = s1.y + s2.y + s3.y;
  // 最後の大岩
  const finalZ = lerp(f, [122, 148], [1700, -1000], easeIn);
  const fs = perspective(finalZ);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) rotate(${s1.r + s3.r}deg)` }}>
        {f < 14 && (
          <AbsoluteFill>
            <CamImg src={IMG.iwayamaSplash} focus={{ x: 0.5, y: 0.45 }} zoom={lerp(f, [0, 14], [1.12, 1.2])} filter="brightness(0.55)" />
            {f < impact && (
              <div style={{ position: "absolute", left: W / 2 - 230, top: H / 2 - 250, transform: `scale(${1 + f * 0.01})` }}>
                <RockShape seed="target" size={460} rotate={8} />
              </div>
            )}
            <Shards frame={f} at={impact} x={W / 2} y={H / 2 - 20} count={34} seed="t" power={1.3} />
            <Dust frame={f} at={impact} x={W / 2} y={H / 2} seed="t" />
          </AbsoluteFill>
        )}
        {f < impact && (
          // CUT05から飛んできた矢（奥から手前ではなく、手前から奥の岩へ）
          <div style={{ position: "absolute", left: lerp(f, [0, impact], [W * 0.62, W / 2 + 40]), top: lerp(f, [0, impact], [H * 0.47, H / 2 - 30]), width: lerp(f, [0, impact], [120, 70]), height: 8, background: "linear-gradient(to right, rgba(255,250,230,0), #f3efe6)", transform: "rotate(170deg)" }} />
        )}
        {f >= 14 && f < 62 && <GameFrame clip={CLIP.cap_shoot_chain} startSec={9.05} ramp={[{ at: 0, rate: 1.0 }, { at: 20, rate: 0.7 }, { at: 40, rate: 1.1 }]} dur={48} scale={FRAME_SCALE} top={FRAME_TOP} />}
        {f >= 62 && f < 80 && <GameFrame clip={CLIP.cap_shoot_wall} startSec={7.0} ramp={[{ at: 0, rate: 1.5 }]} dur={18} scale={FRAME_SCALE} top={FRAME_TOP} />}
        {f >= 80 && f < 104 && <GameFrame clip={CLIP.cap_shoot_wall} startSec={10.0} ramp={[{ at: 0, rate: 0.6 }, { at: 12, rate: 1.4 }]} dur={24} scale={FRAME_SCALE} top={FRAME_TOP} />}
        {f >= 104 && f < 150 && <GameFrame clip={CLIP.cap_shoot_chain} startSec={3.4} ramp={[{ at: 0, rate: 1.0 }]} dur={46} scale={FRAME_SCALE} top={FRAME_TOP} dim={lerp(f, [120, 146], [1, 0.45])} />}
        {/* 画面手前を落ちる3Dの岩（2Dの実画面と交差させる） */}
        {FG_ROCKS.map((r) => {
          const d = f - r.at;
          if (d < 0 || d > 22) return null;
          const k = d / 22;
          const sc = perspective(r.z);
          const x = r.x0 + (r.x1 - r.x0) * k;
          const y = -r.size + (H + r.size * 1.6) * (k * k);
          return (
            <div key={r.seed} style={{ position: "absolute", left: x - (r.size * sc) / 2, top: y, filter: r.z < 0 ? "blur(3px)" : undefined }}>
              <RockShape seed={r.seed} size={r.size * sc} rotate={d * 9} tint={0.9} />
            </div>
          );
        })}
        <Dust frame={f} at={80} x={W / 2} y={160} seed="w" scale={1.3} />
      </AbsoluteFill>
      <ExposurePulse frame={f} at={impact} peak={0.8} decay={5} />
      <Shockwave frame={f} at={impact} x={W / 2} y={H / 2 - 20} maxR={1300} dur={16} />
      <ExposurePulse frame={f} at={80} peak={0.6} decay={6} color="#fff6e0" />
      {/* 最後の大岩が手前へ → 暗転 */}
      {f >= 122 && f < 150 && (
        <AbsoluteFill>
          <AbsoluteFill style={{ backgroundColor: "#000", opacity: lerp(f, [122, 144], [0, 0.45]) }} />
          <div style={{ position: "absolute", left: W / 2 - (700 * fs) / 2 + sx, top: H / 2 - (700 * fs) / 2 + sy - 40 * fs }}>
            <RockShape seed="final" size={700 * fs} rotate={lerp(f, [122, 148], [-20, 25])} />
          </div>
          <AbsoluteFill style={{ backgroundColor: "#000", opacity: lerp(f, [144, 148], [0, 1]) }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ─── CUT07 00:25–00:28 未知の光 ─────────────────────────────────
// 洞窟（正式入場イラスト）の奥の暗闇に、小さな光。揺れ方は CUT01 の焚き火と同じ flicker()（視覚的な呼応だけで、正体は示さない）。
// ごくわずかな違和感: 2コマだけ光が左右にずれる。
const FAR = { x: 0.66, y: 0.385 };

export const CUT07: React.FC = () => {
  const f = useCurrentFrame();
  const zoom = lerp(f, [0, 90], [1.7, 2.05], easeInOut);
  const c = cam(FAR, zoom);
  const p = c.toScreen(FAR.x, FAR.y);
  const scene = lerp(f, [6, 34], [0, 0.16], easeOut) * lerp(f, [70, 86], [1, 0]);
  const light = lerp(f, [10, 30], [0, 1], easeOut) * lerp(f, [80, 90], [1, 0]);
  const fl = flicker(f + 300);
  const odd = f === 58 || f === 59;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <CamImg src={IMG.iwayamaSplash} focus={FAR} zoom={zoom} filter={`brightness(${scene}) saturate(0.55) blur(1.5px)`} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 10%, rgba(0,0,0,0.85) 60%)" }} />
      {odd && <Glow x={p.x - 5} y={p.y} radius={30 * fl} color="rgba(255,60,60,0.7)" intensity={light} />}
      {odd && <Glow x={p.x + 5} y={p.y} radius={30 * fl} color="rgba(60,220,255,0.7)" intensity={light} />}
      <Glow x={p.x} y={p.y} radius={120 * fl} color="rgba(255,150,60,0.45)" intensity={light * fl * (odd ? 0.4 : 1)} />
      <Glow x={p.x} y={p.y} radius={16 * fl} color="rgba(255,236,180,0.95)" intensity={light * (odd ? 0.4 : 1)} />
    </AbsoluteFill>
  );
};

// ─── CUT08 00:28–00:30 タイトル ──────────────────────────────────
// 暗闇から正式ロゴ（public/assets/ui/title/mq0_title_logo.png）。文章は加えない。
export const CUT08: React.FC = () => {
  const f = useCurrentFrame();
  const a = lerp(f, [4, 26], [0, 1], easeOut);
  const s = lerp(f, [4, 40], [1.045, 1], easeOut);
  const sweep = lerp(f, [26, 46], [-0.3, 1.3], easeInOut);
  const lw = 1180;
  const lh = (lw * 941) / 1672;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
      <Glow x={W / 2} y={H / 2} radius={700} color="rgba(255,190,90,0.25)" intensity={a * 0.8} />
      <div style={{ position: "relative", width: lw, height: lh, opacity: a, transform: `scale(${s})`, filter: `blur(${(1 - a) * 8}px)` }}>
        <Img src={IMG.titleLogo} style={{ width: "100%", height: "100%" }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            WebkitMaskImage: `url(${IMG.titleLogo})`,
            WebkitMaskSize: "100% 100%",
            maskImage: `url(${IMG.titleLogo})`,
            maskSize: "100% 100%",
            background: `linear-gradient(105deg, transparent ${sweep * 100 - 12}%, rgba(255,255,255,0.75) ${sweep * 100}%, transparent ${sweep * 100 + 12}%)`,
            mixBlendMode: "screen",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const CUT_COMPONENTS: Record<string, React.FC> = { CUT01, CUT02, CUT03, CUT04, CUT05, CUT06, CUT07, CUT08 };

