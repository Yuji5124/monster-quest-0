// Step 2 で録画したゲーム実画面（960×720）。
// *_x2.mp4 は 60fps の録画のタイムスタンプを2倍に伸ばした複製（再エンコードなし・全コマ保持、30fps扱い）。
// Remotion の startFrom は30fps単位の整数なので、こうすると元の60fpsの1コマ単位で頭出しできる。
// 使える区間の秒数は capture/CAPTURE_PLAN.md を参照。
import cap_opening from "../capture/clips/cap_opening_x2.mp4";
import cap_no02 from "../capture/clips/cap_no02_x2.mp4";
import cap_bie from "../capture/clips/cap_bie_x2.mp4";
import cap_castle3d from "../capture/clips/cap_castle3d_x2.mp4";
import cap_majin_explore from "../capture/clips/cap_majin_explore_x2.mp4";
import cap_majin_house from "../capture/clips/cap_majin_house_x2.mp4";
import cap_majin_boss from "../capture/clips/cap_majin_boss_x2.mp4";
import cap_forest_battle from "../capture/clips/cap_forest_battle_x2.mp4";
import cap_shoot_chain from "../capture/clips/cap_shoot_chain_x2.mp4";
import cap_shoot_wall from "../capture/clips/cap_shoot_wall_x2.mp4";
import cap_hidden from "../capture/clips/cap_hidden_x2.mp4";
import cap_lake3d from "../capture/clips/cap_lake3d_x2.mp4";

export const CLIP = {
  cap_opening,
  cap_no02,
  cap_bie,
  cap_castle3d,
  cap_majin_explore,
  cap_majin_house,
  cap_majin_boss,
  cap_forest_battle,
  cap_shoot_chain,
  cap_shoot_wall,
  cap_hidden,
  cap_lake3d,
} as const;

/** 録画の固有値（元の録画は60fps） */
export const CLIP_FPS = 60;
export const GAME_W = 960;
export const GAME_H = 720;

/** CAPTURE_PLAN.md の主要な時刻（秒） */
export const MOMENTS = {
  opening: { noiseStart: 3.4, bootWindows: 5.0, corruption: 6.5, noiseEnd: 7.0, fadeInStart: 9.2, campfireFull: 15.5 },
  bie: { tearStart: 15.82, tearEnd: 15.98 },
  majinHouse: { banner: 2.8 },
  majinBoss: { appears: 2.9 },
  forest: { encounter: 3.7, victory: 10.25 },
  chain: { start: 9.6, end: 10.6 },
  wall: { crack: 3.4, hole: 7.4, collapse: 10.1, collapseEnd: 11.5 },
  lake3d: { usableEnd: 3.5 },
} as const;
