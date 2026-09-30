// BRIEF.md §4 のカット C01〜C16。各カットは自分の Sequence の中で 0 から数える（local frame）。
// 長さ・拍は src/data/timeline.json、録画の時刻は src/clips.ts（CAPTURE_PLAN.md）が正本。
import React from "react";
import { AbsoluteFill, Img, random, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { IMG, WALK_SHEET } from "../assets";
import { CLIP, MOMENTS } from "../clips";
import { DOT } from "../fonts";
import { Bloom, Vignette } from "../components/Finish";
import { Frame43 } from "../components/Frame43";
import { GameWindow } from "../components/GameWindow";
import { GlitchFlash, Scanlines } from "../components/GlitchFlash";
import { ImpactFrame } from "../components/ImpactFrame";
import { KineticTitle } from "../components/KineticTitle";
import { LogoSlam } from "../components/LogoSlam";
import { CHARACTER_COLOR, NameCard } from "../components/NameCard";
import { Parallax25D } from "../components/Parallax25D";
import { PixelToHD, SpriteFrame } from "../components/PixelToHD";
import { Clip } from "../components/SpeedRamp";
import { Triptych } from "../components/Triptych";
import { ZoomThrough } from "../components/ZoomThrough";
import { easeInOut, easeOut, lerp } from "../components/util";
import timeline from "../data/timeline.json";
import { Cover, Game, PlaceLabel, useTall, WhiteFlash } from "./common";

const CUT = timeline.cuts as unknown as Record<string, [number, number]>;
const len = (id: string) => CUT[id][1] - CUT[id][0];
/** 絶対フレーム→そのカット内のフレーム */
const local = (id: string, abs: number) => abs - CUT[id][0];

// ─── C01 起動ノイズ（黒の間に3コマを1〜2fずつ） ─────────────────────
export const C01: React.FC = () => {
  const frame = useCurrentFrame();
  const shown = timeline.glitchFrames.C01;
  if (!shown.includes(frame)) return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  const t = frame <= 2 ? MOMENTS.opening.noiseStart + 0.3 : frame <= 5 ? MOMENTS.opening.bootWindows : MOMENTS.opening.corruption;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <GlitchFlash frames={[2, 8]} seed="c01">
        <Game src={CLIP.cap_opening} startSec={t} dur={1} />
      </GlitchFlash>
    </AbsoluteFill>
  );
};

// ─── C02 焚き火の明転＋1文字ずつ ─────────────────────────────
export const C02: React.FC = () => {
  const tall = useTall();
  const { width } = useVideoConfig();
  const text = "名も知らぬ土地を歩く、ひとりの旅人がいた。";
  const w = tall ? 980 : 1240;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Bloom amount={0.75} radius={26}>
        <Game src={CLIP.cap_opening} startSec={MOMENTS.opening.fadeInStart} dur={len("C02")} ramp={[{ at: 0, rate: 1.4 }]} />
      </Bloom>
      <Vignette strength={0.75} />
      <div style={{ position: "absolute", left: (width - w) / 2, top: tall ? 1180 : 858 }}>
        {/* 1文字4fで打つ（2.8秒で打ち切り）。SEは timeline.json の type と同じ間隔 */}
        <GameWindow text={text} charsPerFrame={0.25} startAt={12} width={w} fontSize={tall ? 46 : 44} lines={1} openAnim={false} style={{ opacity: 0.94 }} />
      </div>
    </AbsoluteFill>
  );
};

// ─── C03 主人公がゆっくり寄る＋「勇者じゃない。」 ─────────────────────
// 主人公は assets/characters/reference/profiles/主人公.png（2026-09-27 ユーザー指定の立ち絵。イラストなので滑らかに拡大）
export const C03: React.FC = () => {
  const frame = useCurrentFrame();
  const tall = useTall();
  const { width, height } = useVideoConfig();
  const d = len("C03");
  const push = lerp(frame, [0, d], [1, 1.12], easeInOut);
  const appear = lerp(frame, [0, 10], [0, 1]);
  // シネスコ帯（横138px／縦250px）が閉じても帽子が切れない高さに置く（寄りで上へ約30px広がる）
  const figH = tall ? 880 : 850;
  const figW = figH * (1024 / 1536);
  const left = tall ? width / 2 - figW / 2 : width * 0.72 - figW / 2;
  const top = tall ? 300 : 190;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${1.05 + 0.04 * (frame / d)})` }}>
        <Cover src={IMG.startingPlaceNight} focus={{ x: 0.5, y: 0.62 }} style={{ filter: "brightness(0.38) blur(3px)" }} />
      </AbsoluteFill>
      {/* 焚き火の赤い照り返し（人物の背後から） */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at ${((left + figW / 2) / width) * 100}% ${((top + figH * 0.62) / height) * 100}%, rgba(255,120,40,0.32), transparent 48%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left,
          top,
          width: figW,
          height: figH,
          opacity: appear,
          transform: `scale(${push})`,
          transformOrigin: "50% 28%",
          filter: "drop-shadow(0 0 24px rgba(255,140,60,0.35)) drop-shadow(0 24px 30px rgba(0,0,0,0.7))",
        }}
      >
        <Img src={IMG.protagonistProfile} style={{ width: "100%", height: "100%" }} />
      </div>
      <div style={{ position: "absolute", left: tall ? 90 : 120, top: tall ? 1230 : height / 2 - 100 }}>
        <KineticTitle text="勇者じゃない。" mode="mask" fontSize={tall ? 130 : 140} stagger={3} charIn={12} />
      </div>
    </AbsoluteFill>
  );
};

// ─── C04 ワールドマップへズームスルー＋「それでも、歩きだした。」 ─────────
export const C04: React.FC = () => {
  const frame = useCurrentFrame();
  const tall = useTall();
  const { height } = useVideoConfig();
  const push = lerp(frame, [3, 22], [1, 1.25], easeOut);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {frame >= 3 && (
        <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "34.4% 59%" }}>
          {/* 目標はワールドマップ上のビーエのむら付近 */}
          <ZoomThrough src={IMG.worldMap} target={{ x: 0.344, y: 0.59 }} startAt={22} frames={12} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.25)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: tall ? 1200 : height / 2 - 70, textAlign: "center" }}>
        <KineticTitle text="それでも、歩きだした。" mode="pop" align="center" fontSize={tall ? 92 : 118} stagger={1} charIn={8} exitAt={25} />
      </div>
    </AbsoluteFill>
  );
};

// ─── C05 BGMドロップ：ビーエの入場イラストを2.5D ─────────────────────
export const C05: React.FC = () => (
  <AbsoluteFill>
    <Parallax25D src={IMG.bieSplash} drift={{ x: -0.7, y: 0.12 }} zoom={0.08} focus={{ x: 0.45, y: 0.55 }} durationInFrames={len("C05")} />
    <WhiteFlash frames={8} max={0.9} />
    <PlaceLabel text="No.04 ビーエのむら" startAt={4} />
  </AbsoluteFill>
);

// ─── C06 三分割 ─────────────────────────────────────────────
export const C06: React.FC = () => {
  const p = timeline.beatsUsed.C06_panels.map((f) => local("C06", f)) as [number, number, number];
  return (
    <Triptych
      panels={[
        { src: IMG.startingTown, label: "はじまりのまち", focus: { x: 0.5, y: 0.45 } },
        { src: IMG.rainlandTownSplash, label: "レインランドじょうかまち", focus: { x: 0.5, y: 0.4 } },
        { src: IMG.zabonSplash, label: "ザボンのむら", focus: { x: 0.5, y: 0.5 } },
      ]}
      inAt={p}
    />
  );
};

// ─── C07 ぼかした cap_bie ＋ 会話ウィンドウ3連 → チリチリ4f ─────────────
const C07_LINES = [
  // ①はじまりのまちの宿屋（src/data/dialogues.ts:34 の冒頭）
  "このごろ　みちに　モンスターが\nふえて",
  // ②ビーエのむら（dialogues.ts:121 の後半）
  "きこりさんが\nもりへ　いったきり\nもどって　こないんだ。",
  // ③ビーエのむら（dialogues.ts:99 の後半）
  "みずぐるまが　ほんの　いっしゅん\nとまるんだ。",
];

export const C07: React.FC = () => {
  const frame = useCurrentFrame();
  const tall = useTall();
  const { width } = useVideoConfig();
  const starts = timeline.beatsUsed.C07_windows.map((f) => local("C07", f));
  const [tearA, tearB] = timeline.beatsUsed.C07_tear.map((f) => local("C07", f));
  const inTear = frame >= tearA && frame < tearB;
  const w = tall ? 980 : 1320;
  const idx = frame >= starts[2] ? 2 : frame >= starts[1] ? 1 : 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {inTear ? (
        // ③の直後：チリチリ（背景の横ずれ）が出た4コマを、ぼかさずRGBずれ付きで挿入
        <GlitchFlash frames={[tearA, tearA + 1, tearA + 2, tearA + 3]} seed="c07" rgb={6} intensity={0.3} scanlines={false}>
          <Game src={CLIP.cap_bie} startSec={MOMENTS.bie.tearStart + (frame - tearA) / 30} dur={1} />
        </GlitchFlash>
      ) : (
        <>
          <AbsoluteFill style={{ filter: "blur(12px) brightness(0.55)" }}>
            <Game src={CLIP.cap_bie} startSec={7.0} dur={len("C07")} />
          </AbsoluteFill>
          <Sequence from={starts[idx]} key={idx} layout="none">
            <div style={{ position: "absolute", left: (width - w) / 2, top: tall ? 1150 : 600 }}>
              <GameWindow text={C07_LINES[idx]} charsPerFrame={2} width={w} fontSize={tall ? 50 : 54} lines={3} />
            </div>
          </Sequence>
        </>
      )}
    </AbsoluteFill>
  );
};

// ─── C08 レインランドじょう3D：スピードランプ ─────────────────────
export const C08: React.FC = () => (
  <AbsoluteFill>
    <Game
      src={CLIP.cap_castle3d}
      startSec={0.6}
      dur={len("C08")}
      ramp={[
        { at: 0, rate: 1.0 },
        { at: 12, rate: 2.5 },
        { at: 30, rate: 0.6 },
      ]}
    />
    <PlaceLabel text="レインランドじょう" corner="top-right" size={40} startAt={3} />
  </AbsoluteFill>
);

// ─── C09 まじんのどうくつ：探索2倍速 → モンスターハウス → 10F まじん巨大化＋インパクト ────
const MAJIN_CELL = 320; // monster_majin_dungeon.png は 4×4、320px セル（src/config/majinCaveMonsterSprites.ts）

export const C09: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const tall = useTall();
  const house = local("C09", timeline.beatsUsed.C09_house);
  const boss = local("C09", timeline.beatsUsed.C09_boss);
  const impact = local("C09", timeline.beatsUsed.C09_impact);
  const d = len("C09");
  // 巨大化: 衝撃の後、まじんのドットが画面いっぱいまで膨らむ（nearest）
  const grow = lerp(frame, [impact, impact + 14], [0.35, 1], easeOut);
  const bigH = (tall ? 1000 : 980) * grow;
  const attackCol = Math.floor(Math.max(0, frame - impact) / 3) % 4; // 攻撃コマ（2行目）を10fpsで
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ImpactFrame at={impact} center={{ x: 0.5, y: tall ? 0.28 : 0.45 }} amplitude={12}>
        <AbsoluteFill>
          {frame < house && <Game src={CLIP.cap_majin_explore} startSec={0.6} dur={house} ramp={[{ at: 0, rate: 2 }]} />}
          {frame >= house && frame < boss && (
            <Sequence from={house} layout="none">
              <Game src={CLIP.cap_majin_house} startSec={MOMENTS.majinHouse.banner - 0.08} dur={boss - house} />
            </Sequence>
          )}
          {frame >= boss && (
            <Sequence from={boss} layout="none">
              <Game src={CLIP.cap_majin_boss} startSec={MOMENTS.majinBoss.appears - 0.25} dur={d - boss} />
            </Sequence>
          )}
          {frame >= impact && (
            <>
              <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% ${tall ? 30 : 50}%, rgba(170,20,40,${0.55 * grow}), rgba(0,0,0,${0.75 * grow}) 70%)` }} />
              <div
                style={{
                  position: "absolute",
                  left: width / 2 - bigH / 2,
                  top: (tall ? height * 0.28 : height / 2) - bigH / 2,
                  width: bigH,
                  height: bigH,
                }}
              >
                <SpriteFrame src={IMG.majinSheet} cellW={MAJIN_CELL} cellH={MAJIN_CELL} col={attackCol} row={1} scale={bigH / MAJIN_CELL} />
              </div>
            </>
          )}
        </AbsoluteFill>
      </ImpactFrame>
      <WhiteFlash at={house} frames={4} />
      <PlaceLabel text="No.07 まじんのどうくつ" startAt={2} />
    </AbsoluteFill>
  );
};

// ─── C10 タロサ：ピクセル→HD＋名前カード ─────────────────────────
export const C10: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const tall = useTall();
  const card = local("C10", timeline.beatsUsed.C10_card);
  const push = lerp(frame, [12, len("C10")], [1, 1.06]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <PixelToHD
          sprite={{ src: WALK_SHEET.tarosa.src, cellW: WALK_SHEET.tarosa.cellW, cellH: WALK_SHEET.tarosa.cellH, col: 1, row: 0 }}
          hd={IMG.tarosaStanding}
          width={width}
          height={height}
          from={0}
          to={12}
          spriteScale={tall ? 11 : 10}
          hdFocus={{ x: tall ? 0.42 : 0.5, y: 0.3 }}
        />
      </AbsoluteFill>
      <NameCard name="タロサ" title="ザボンの弓使い" quote={"どりょく　すれば　かならず\nつよく　なれる"} color={CHARACTER_COLOR.tarosa} startAt={card} y={tall ? 0.66 : 0.7} />
    </AbsoluteFill>
  );
};

// ─── C11 いわやま：爆発岩の連鎖（スロー→加速）→ 岩壁 → 崩落と光 ────────────
export const C11: React.FC = () => {
  const frame = useCurrentFrame();
  const [c0, c1, c2] = timeline.beatsUsed.C11_cuts.map((f) => local("C11", f));
  const d = len("C11");
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {frame < c1 && (
        <Game
          src={CLIP.cap_shoot_chain}
          startSec={MOMENTS.chain.start - 0.05}
          dur={c1 - c0}
          ramp={[
            { at: 0, rate: 0.3 },
            { at: 14, rate: 0.3 },
            { at: 24, rate: 1.5 },
          ]}
        />
      )}
      {frame >= c1 && frame < c2 && (
        <Sequence from={c1} layout="none">
          <Game src={CLIP.cap_shoot_wall} startSec={MOMENTS.wall.hole - 0.1} dur={c2 - c1} />
        </Sequence>
      )}
      {frame >= c2 && (
        <Sequence from={c2} layout="none">
          <Bloom amount={0.5} radius={30}>
            <Game src={CLIP.cap_shoot_wall} startSec={MOMENTS.wall.collapse - 0.05} dur={d - c2} ramp={[{ at: 0, rate: 1.2 }]} />
          </Bloom>
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

// ─── C12 ミレイ：後ろ姿にプッシュイン＋霧＋ライトリーク → cap_hidden へディゾルブ ─────
const Fog: React.FC<{ n?: number }> = ({ n = 14 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: n }, (_, i) => {
        const x = random(`fx${i}`) * width;
        const y = height * (0.35 + random(`fy${i}`) * 0.65);
        const r = 180 + random(`fr${i}`) * 320;
        const vx = (random(`fv${i}`) - 0.3) * 2.2;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + vx * frame - r,
              top: y - r * 0.5 - frame * 0.4,
              width: r * 2,
              height: r,
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(220,215,255,0.22), transparent 70%)",
              filter: "blur(18px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const C12: React.FC = () => {
  const frame = useCurrentFrame();
  const tall = useTall();
  const d = len("C12");
  const dis = local("C12", timeline.beatsUsed.C12_dissolve);
  const push = lerp(frame, [0, d], [1.0, 1.12], easeInOut);
  const leak = lerp(frame, [0, d], [0, 1]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "40% 45%" }}>
        <Cover src={IMG.mireiBack} focus={{ x: tall ? 0.36 : 0.5, y: 0.4 }} />
      </AbsoluteFill>
      <Fog />
      {/* ライトリーク */}
      <AbsoluteFill
        style={{
          mixBlendMode: "screen",
          opacity: 0.55,
          background: `radial-gradient(ellipse at ${85 - leak * 20}% ${10 + leak * 8}%, rgba(255,190,120,0.55), transparent 45%), radial-gradient(ellipse at ${10 + leak * 10}% 90%, rgba(170,110,255,0.4), transparent 50%)`,
        }}
      />
      <NameCard name="ミレイ" title="かくれざとの魔法使い" color={CHARACTER_COLOR.mirei} mirror startAt={4} y={tall ? 0.66 : 0.72} />
      {frame >= dis && (
        <AbsoluteFill style={{ opacity: lerp(frame, [dis, d], [0, 1]) }}>
          <Sequence from={dis} layout="none">
            <Game src={CLIP.cap_hidden} startSec={1.2} dur={d - dis} />
          </Sequence>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ─── C13 みずうみの古城：一人称で前進＋周辺の色収差 ─────────────────────
export const C13: React.FC = () => {
  const d = len("C13");
  const edge = "radial-gradient(ellipse at center, transparent 55%, black 85%)";
  const layer = (dx: number, filter: string) => (
    <AbsoluteFill style={{ transform: `translateX(${dx}px)`, mixBlendMode: "screen", opacity: 0.55, WebkitMaskImage: edge, maskImage: edge, filter }}>
      <Game src={CLIP.cap_lake3d} startSec={0.15} dur={d} />
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Game src={CLIP.cap_lake3d} startSec={0.15} dur={d} />
      {layer(-4, "url(#mq0-red)")}
      {layer(4, "url(#mq0-cyan)")}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="mq0-red">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
        <filter id="mq0-cyan">
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
        </filter>
      </svg>
      <PlaceLabel text="No.11 みずうみの古城" startAt={3} />
    </AbsoluteFill>
  );
};

// ─── C14 3人で歩く＋上下のウィンドウ帯＋「ミレイが なかまに なった！」 ────────
export const C14: React.FC = () => {
  const frame = useCurrentFrame();
  const tall = useTall();
  const { width } = useVideoConfig();
  const d = len("C14");
  const band = lerp(frame, [0, 6], [0, 1], easeOut);
  const w = tall ? 980 : width - 80;
  const winStyle: React.CSSProperties = {
    position: "absolute",
    left: 40,
    right: 40,
    backgroundColor: "#0a0a14",
    border: "5px solid #eee",
    outline: "2px solid #eee",
    outlineOffset: "-14px",
    borderRadius: 10,
  };
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Game src={CLIP.cap_no02} startSec={2.6} dur={d} />
      {/* 上の帯（空のウィンドウ）。下の帯は台詞のウィンドウそのもの */}
      {!tall && <div style={{ ...winStyle, top: 24 - (1 - band) * 140, height: 64 }} />}
      <div style={{ position: "absolute", left: (width - w) / 2, top: tall ? 1200 : undefined, bottom: tall ? undefined : 24 - (1 - band) * 200 }}>
        <Sequence from={4} layout="none">
          <GameWindow text={"ミレイが　なかまに　なった！"} charsPerFrame={1} width={w} fontSize={tall ? 54 : 58} lines={1} openAnim={false} />
        </Sequence>
        {frame < 4 && <div style={{ width: w, height: Math.round(58 * 1.45 + 58 * 0.7 * 2), ...winStyle, position: "relative", left: 0, right: 0 }} />}
      </div>
    </AbsoluteFill>
  );
};

// ─── C15 無音の間：黒、f776 の1フレームだけ LOAD_MAP ─────────────────
export const C15: React.FC = () => {
  const frame = useCurrentFrame();
  const flash = local("C15", timeline.beatsUsed.C15_flash);
  if (frame !== flash) return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* 起動ノイズのウィンドウ（「> LOAD_MAP...」を含むコマ） */}
      <Game src={CLIP.cap_opening} startSec={MOMENTS.opening.bootWindows} dur={1} />
      <Scanlines opacity={0.4} />
    </AbsoluteFill>
  );
};

// ─── C16 ロゴスラム ─────────────────────────────────────────
export const C16: React.FC = () => {
  const frame = useCurrentFrame();
  const tall = useTall();
  const { height } = useVideoConfig();
  const d = len("C16");
  const land = local("C16", timeline.beatsUsed.C16_land);
  const note = lerp(frame, [land + 24, land + 36], [0, 1]);
  const fade = lerp(frame, [d - 15, d], [1, 0]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ opacity: fade }}>
        <LogoSlam src={IMG.titleLogo} logoWidth={tall ? 980 : 1240} aspect={941 / 1672} landAt={land} y={tall ? 0.45 : 0.46} />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: tall ? 1560 : height - 120,
            textAlign: "center",
            fontFamily: DOT,
            fontSize: tall ? 50 : 40,
            color: "#e8e2d0",
            letterSpacing: "0.2em",
            opacity: note,
          }}
        >
          ただいま開発中
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const CUT_COMPONENTS: Record<string, React.FC> = { C01, C02, C03, C04, C05, C06, C07, C08, C09, C10, C11, C12, C13, C14, C15, C16 };
