// Step 4: 部品 A〜M を1つずつ確かめるための短いテストComposition（2〜3秒）
import React from "react";
import { AbsoluteFill, Img, useVideoConfig } from "remotion";
import { IMG, WALK_SHEET } from "../assets";
import { CLIP, MOMENTS } from "../clips";
import { Frame43 } from "../components/Frame43";
import { FilmGrain, Bloom, Letterbox, Vignette } from "../components/Finish";
import { GameWindow } from "../components/GameWindow";
import { GlitchFlash } from "../components/GlitchFlash";
import { ImpactFrame } from "../components/ImpactFrame";
import { KineticTitle } from "../components/KineticTitle";
import { LogoSlam } from "../components/LogoSlam";
import { CHARACTER_COLOR, NameCard } from "../components/NameCard";
import { Parallax25D } from "../components/Parallax25D";
import { PixelToHD } from "../components/PixelToHD";
import { Clip } from "../components/SpeedRamp";
import { Triptych } from "../components/Triptych";
import { ZoomThrough } from "../components/ZoomThrough";
import { lerp } from "../components/util";
import { useCurrentFrame } from "remotion";

const Dark: React.FC<{ children: React.ReactNode }> = ({ children }) => <AbsoluteFill style={{ backgroundColor: "#000" }}>{children}</AbsoluteFill>;

/** A: 大見出し①（マスクリビール・左寄せ）と②（ポップ→ブラー退場） */
export const TestA: React.FC = () => {
  const { width, height } = useVideoConfig();
  const tall = height > width;
  return (
    <Dark>
      <Img src={IMG.startingPlaceNight} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.45 }} />
      <div style={{ position: "absolute", left: tall ? 80 : 160, top: tall ? 1150 : 380 }}>
        <KineticTitle text="勇者じゃない。" mode="mask" fontSize={tall ? 120 : 150} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: tall ? 1400 : 640, textAlign: "center" }}>
        <KineticTitle text="それでも、歩きだした。" mode="pop" align="center" fontSize={tall ? 88 : 110} stagger={2} charIn={8} exitAt={60} style={{ transform: "translateY(0)" }} />
      </div>
    </Dark>
  );
};

/** B: ビーエの入場イラストを3層パララックス（上）とKen Burns（下） */
export const TestB: React.FC = () => (
  <AbsoluteFill>
    <Parallax25D src={IMG.bieSplash} drift={{ x: -0.6, y: 0.15 }} zoom={0.07} />
  </AbsoluteFill>
);

/** C: ワールドマップへ高速ズームスルー（ビーエのむらの辺りへ） */
export const TestC: React.FC = () => <ZoomThrough src={IMG.worldMap} target={{ x: 0.33, y: 0.57 }} startAt={20} frames={12} />;

/** D: 三分割（拍ごとにスライドイン） */
export const TestD: React.FC = () => (
  <Triptych
    panels={[
      { src: IMG.startingTown, label: "はじまりのまち", focus: { x: 0.5, y: 0.45 } },
      { src: IMG.rainlandTownSplash, label: "レインランドじょうかまち", focus: { x: 0.5, y: 0.4 } },
      { src: IMG.zabonSplash, label: "ザボンのむら", focus: { x: 0.5, y: 0.5 } },
    ]}
    inAt={[4, 20, 36]}
  />
);

/** E: 会話ウィンドウ（ぼかした cap_bie の上に高速タイプ） */
export const TestE: React.FC = () => {
  const { width, height } = useVideoConfig();
  const tall = height > width;
  const w = tall ? 960 : 1300;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: "blur(14px) brightness(0.6)" }}>
        <Frame43 render={(cw, ch) => <Clip src={CLIP.cap_bie} startSec={8} width={cw} height={ch} durationInFrames={75} />} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: (width - w) / 2, top: tall ? 1250 : 700 }}>
        <GameWindow text={"……だがね　このごろ　ときどき\nみずぐるまが　ほんの　いっしゅん\nとまるんだ。"} charsPerFrame={2} startAt={4} width={w} fontSize={tall ? 48 : 50} />
      </div>
    </AbsoluteFill>
  );
};

/** F: 起動ノイズの3コマを1〜2fずつフラッシュ（C01想定）。乱れは最大4f */
export const TestF: React.FC = () => {
  const frame = useCurrentFrame();
  // 0-11f: 起動ノイズの3コマ（BOOT / INIT_PLAYERウィンドウ / 崩れ）を黒の間に1〜2fずつ
  const pick = frame < 3 ? MOMENTS.opening.noiseStart + 0.25 : frame < 6 ? MOMENTS.opening.bootWindows : MOMENTS.opening.corruption;
  const visible = [1, 2, 4, 7, 8].includes(frame);
  return (
    <Dark>
      {visible && (
        <GlitchFlash frames={[2, 7]} seed="c01">
          <Frame43 render={(w, h) => <Clip src={CLIP.cap_opening} startSec={pick} width={w} height={h} durationInFrames={1} />} />
        </GlitchFlash>
      )}
      {/* 後半: ビーエのチリチリ4fにRGBずれを足す（C07想定） */}
      {frame >= 30 && (
        <GlitchFlash frames={[36, 37, 38, 39]} seed="bie" rgb={6} intensity={0.35} scanlines={false}>
          <Frame43 render={(w, h) => <Clip src={CLIP.cap_bie} startSec={MOMENTS.bie.tearStart - 0.2} width={w} height={h} durationInFrames={60} />} />
        </GlitchFlash>
      )}
    </Dark>
  );
};

/** G: スピードランプ（1.0→2.5→0.6倍）。レインランドじょう3D */
export const TestG: React.FC = () => (
  <Frame43
    render={(w, h) => (
      <Clip src={CLIP.cap_castle3d} startSec={0.6} width={w} height={h} durationInFrames={45}
        ramp={[{ at: 0, rate: 1 }, { at: 12, rate: 2.5 }, { at: 30, rate: 0.6 }, { at: 45, rate: 0.6 }]} />
    )}
  />
);

/** H: インパクトフレーム（まじん出現の直後に衝撃） */
export const TestH: React.FC = () => (
  <ImpactFrame at={20} center={{ x: 0.56, y: 0.35 }}>
    <Frame43 render={(w, h) => <Clip src={CLIP.cap_majin_boss} startSec={MOMENTS.majinBoss.appears - 0.4} width={w} height={h} durationInFrames={60} />} />
  </ImpactFrame>
);

/** I: タロサの歩行ドット → 立ち絵（0.4秒） */
export const TestI: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <Dark>
      <PixelToHD
        sprite={{ src: WALK_SHEET.tarosa.src, cellW: WALK_SHEET.tarosa.cellW, cellH: WALK_SHEET.tarosa.cellH, col: 1, row: 0 }}
        hd={IMG.tarosaStanding}
        width={width}
        height={height}
        from={15}
        to={27}
        spriteScale={9}
        hdFocus={{ x: 0.5, y: 0.3 }}
      />
    </Dark>
  );
};

/** J: 名前カード（タロサ＝緑、ミレイ＝紫・左右反転） */
export const TestJ: React.FC = () => {
  const frame = useCurrentFrame();
  const mirei = frame >= 40;
  return (
    <Dark>
      <Img src={mirei ? IMG.mireiBack : IMG.tarosaStanding} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 30%" }} />
      {!mirei ? (
        <NameCard name="タロサ" title="ザボンの弓使い" quote={"どりょく　すれば\nかならず　つよく　なれる"} color={CHARACTER_COLOR.tarosa} startAt={2} />
      ) : (
        <NameCard name="ミレイ" title="かくれざとの魔法使い" color={CHARACTER_COLOR.mirei} mirror startAt={42} />
      )}
    </Dark>
  );
};

/** K: 4:3→16:9 配置（No.02 3人追従） */
export const TestK: React.FC = () => <Frame43 render={(w, h) => <Clip src={CLIP.cap_no02} startSec={3.0} width={w} height={h} durationInFrames={60} />} />;

/** L: 仕上げ（焚き火にブルーム＋ビネット＋グレイン＋シネスコ帯が閉じる） */
export const TestL: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Dark>
      <Bloom amount={0.7} radius={26}>
        <Frame43 render={(w, h) => <Clip src={CLIP.cap_opening} startSec={13.5} width={w} height={h} durationInFrames={75} />} />
      </Bloom>
      <Vignette strength={0.7} />
      <FilmGrain opacity={0.03} />
      <Letterbox amount={lerp(frame, [15, 40], [0, 1])} />
    </Dark>
  );
};

/** M: ロゴスラム */
export const TestM: React.FC = () => {
  const { width, height } = useVideoConfig();
  const tall = height > width;
  const w = tall ? 980 : 1180;
  return (
    <AbsoluteFill>
      <LogoSlam src={IMG.titleLogo} logoWidth={w} aspect={941 / 1672} landAt={6} />
      <FilmGrain />
    </AbsoluteFill>
  );
};
