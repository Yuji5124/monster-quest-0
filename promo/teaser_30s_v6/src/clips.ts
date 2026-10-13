// ゲーム実画面の録画（960×720）。
// - 前回プロモ（promo/trailer_30s_first_half/capture/clips/）の録画は複製せず相対パスで参照する。*_x2.mp4 は元60fpsを2倍に伸ばした30fps扱い（srcFps=60）。
// - *_pc.mp4 は本プロジェクトで撮り直したPC向け版（タッチボタン・HUD非表示、フレーム送り録画の30fps、srcFps=30）。capture/README参照。
import cap_bie from "../../trailer_30s_first_half/capture/clips/cap_bie_x2.mp4";
import cap_shoot_chain from "../../trailer_30s_first_half/capture/clips/cap_shoot_chain_x2.mp4";
import cap_shoot_wall from "../../trailer_30s_first_half/capture/clips/cap_shoot_wall_x2.mp4";
import cap_castle3d_pc from "../capture/clips/cap_castle3d_pc.mp4";
import cap_throne3d_pc from "../capture/clips/cap_throne3d_pc.mp4";
import cap_majin_boss_pc from "../capture/clips/cap_majin_boss_pc.mp4";

export interface ClipSrc {
  src: string;
  /** startFrom の換算に使う「元の秒→このファイルのコマ」の倍率 */
  srcFps: number;
}

export const CLIP = {
  cap_bie: { src: cap_bie, srcFps: 60 },
  cap_shoot_chain: { src: cap_shoot_chain, srcFps: 60 },
  cap_shoot_wall: { src: cap_shoot_wall, srcFps: 60 },
  cap_castle3d_pc: { src: cap_castle3d_pc, srcFps: 30 },
  cap_throne3d_pc: { src: cap_throne3d_pc, srcFps: 30 },
  cap_majin_boss_pc: { src: cap_majin_boss_pc, srcFps: 30 },
} satisfies Record<string, ClipSrc>;

/** 部品（Frame43など）が使う、前回プロモと共通の定数 */
export const CLIP_FPS = 60;
export const GAME_W = 960;
export const GAME_H = 720;
