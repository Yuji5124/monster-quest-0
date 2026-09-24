/**
 * No.09いわやまのどうくつ 1F「崩落の縦スクロール・シューティング」(2026-09-23ユーザー指示、2026-09-24に横→縦へ変更)。
 * 1F北東の階段手前の赤い丸を調べると地震 → 崩落 → タロサの弓で岩を撃ち壊しながら逃げる特殊区間になる。
 * 見下ろし型(戦場の狼のような)で、洞窟の床が上から下へ流れ、タロサは上へ進みながら上へ矢を撃つ。
 * 数値はすべてTEMP_TEST_VALUE(手触りの調整対象)。距離の単位は「スクロールした画面ピクセル」。
 * `lane`は通路の左右の位置(レーン座標。画面Xへは`laneToScreenX`で変換)、`ahead`は出現位置をさらに奥(上)へずらす量。
 */

export type ShootingRockKind = "small" | "medium" | "large" | "explosive";
export type ShootingEnemyMonsterId = "koakuma" | "erimaki_hebi" | "daija";
/** straight=直進 / wave=上下にゆっくり / charge=主人公へ突進 / ambush=岩陰から上下へ飛び出す */
export type ShootingEnemyMotion = "straight" | "wave" | "charge" | "ambush";
export type ShootingSectionId = "rocks" | "medium" | "enemies" | "explosion" | "chain" | "collapse" | "wall";

export type ShootingEntry =
  /** `at`までスクロールした時点で画面の上端(y=-半径)に現れる。`ahead`はさらに奥(上)へずらす量。 */
  | { readonly at: number; readonly kind: "rock"; readonly rock: ShootingRockKind; readonly lane: number; readonly ahead?: number }
  | { readonly at: number; readonly kind: "enemy"; readonly monsterId: ShootingEnemyMonsterId; readonly lane: number; readonly motion: ShootingEnemyMotion; readonly ahead?: number }
  /** 天井から落ちてくる岩。地面に影(予兆)が広がってから落ち、着地で砕ける。`lane`は落ちる位置。 */
  | { readonly at: number; readonly kind: "fallingRock"; readonly lane: number };

export interface ShootingSection {
  readonly id: ShootingSectionId;
  /** 仕様書上のSection記号(A〜G)。 */
  readonly letter: string;
  /** 区間の開始距離。失敗時の再挑戦チェックポイントでもある。 */
  readonly start: number;
  /** 区間中の基本スクロール速度(px/秒)。 */
  readonly scrollSpeed: number;
  /** 背景だけで落ちる小石(当たり判定なし)の1秒あたりの数。 */
  readonly ambientPebblesPerSecond: number;
  /** 区間中、周期的に入る弱い画面揺れの間隔(ms)。0なら揺らさない。 */
  readonly rumbleIntervalMs: number;
}

export const IWAYAMA_SHOOTING_SECTIONS: readonly ShootingSection[] = [
  { id: "rocks", letter: "A", start: 0, scrollSpeed: 170, ambientPebblesPerSecond: 1, rumbleIntervalMs: 0 },
  { id: "medium", letter: "B", start: 2100, scrollSpeed: 175, ambientPebblesPerSecond: 1.2, rumbleIntervalMs: 0 },
  { id: "enemies", letter: "C", start: 5300, scrollSpeed: 180, ambientPebblesPerSecond: 1.2, rumbleIntervalMs: 0 },
  { id: "explosion", letter: "D", start: 8700, scrollSpeed: 175, ambientPebblesPerSecond: 1.4, rumbleIntervalMs: 0 },
  { id: "chain", letter: "E", start: 11100, scrollSpeed: 175, ambientPebblesPerSecond: 1.6, rumbleIntervalMs: 0 },
  { id: "collapse", letter: "F", start: 14500, scrollSpeed: 200, ambientPebblesPerSecond: 4, rumbleIntervalMs: 2600 },
  { id: "wall", letter: "G", start: 17900, scrollSpeed: 170, ambientPebblesPerSecond: 2.5, rumbleIntervalMs: 0 },
];

export const IWAYAMA_SHOOTING = {
  /** 初回のみの強制イベント。クリア後は赤い丸が消え、普通に通れる。 */
  clearedFlag: "event.iwayama_cave_shooting_cleared",
  returnSceneKey: "IwayamaCave1Scene",
  /** クリア後に戻る1Fの位置(赤い丸のあった場所、maps.tsのspawn)。 */
  returnSpawnId: "afterShooting",
  /** 崩落演出だけを見せて操作を受け付けない時間(ms)。 */
  prologueMs: 1700,
  /** 失敗 → チェックポイントへ戻るまでの暗転(ms)。長いリロードにしない。 */
  retryFadeMs: 320,
  /** 通路の左右の範囲(レーン座標)。両側は岩の壁。 */
  lanes: { min: 122, max: 612 },
  /** レーン座標 → 画面X(通路を画面の中央に置く)。 */
  laneOffsetX: 113,
  player: {
    /** 開始位置(レーン座標のX、画面のY)。 */
    startLane: 367,
    startY: 560,
    /** 上下に動ける範囲(画面Y)。上へ行きすぎると岩に反応できないので、画面の上から少し下まで。 */
    minY: 150,
    maxY: 668,
    speed: 250,
    dashSpeed: 390,
    /** 見た目(タロサ44×70)より小さい当たり判定(体の下半分)。 */
    hitWidth: 24,
    hitHeight: 30,
    /** イベント専用の耐久値。通常HPには影響しない。 */
    maxHp: 5,
    invulnerableMs: 1200,
  },
  arrow: {
    /** 連射間隔。視認できる速さに留める(120〜180msの範囲で調整)。 */
    cooldownMs: 150,
    speed: 920,
    damage: 1,
    /** 同時に画面に出せる矢の上限(プールの大きさ)。 */
    poolSize: 16,
  },
  rocks: {
    small: { radius: 20, hp: 1, contactDamage: 1 },
    medium: { radius: 34, hp: 3, contactDamage: 1 },
    large: { radius: 54, hp: 6, contactDamage: 1 },
    explosive: { radius: 30, hp: 1, contactDamage: 1 },
  },
  explosion: {
    /** 爆発の中心から、対象の外周までの距離がこれ以下なら巻き込む。 */
    radius: 150,
    damage: 10,
    /** 連鎖で次の爆発岩に着火するまでの間。連鎖を目で追えるように少し遅らせる。 */
    chainDelayMs: 150,
  },
  enemy: { hp: 2, radius: 26, contactDamage: 1, displayHeight: 58 },
  /** 落石: 影が広がる予兆 → 落下(見た目は上から縮みながら落ちる) → 着地で砕ける。着地の瞬間に影の上にいるとダメージ。 */
  fallingRock: { warningMs: 900, fallMs: 320, radius: 30, hp: 1, aheadY: 150 },
  wall: {
    /** 登場位置(区間Gの開始から少し先)。 */
    at: 18050,
    /** 岩壁の下端がこのY座標まで来たらスクロールが止まる。 */
    stopY: 230,
    /** 岩壁の厚み(画面の上から下端まで)。 */
    height: 300,
    /** HPバーは出さず、ヒビ・光漏れの段階で見せる。約7秒の連射で崩れる。 */
    hp: 48,
  },
  /** 崩壊後、主人公たちが走り抜けて暗転するまで(ms)。 */
  outroRunMs: 1500,
  outroFadeMs: 700,
  /** 同時に存在できる破片・粉塵・火花の上限(モバイルのFPS低下を避ける)。 */
  particleCaps: { debris: 90, dust: 60, sparks: 50 },
} as const;

/** レーン座標 → 画面X。 */
export function laneToScreenX(lane: number): number {
  return lane + IWAYAMA_SHOOTING.laneOffsetX;
}

const LANE_MIN = IWAYAMA_SHOOTING.lanes.min;
const LANE_MAX = IWAYAMA_SHOOTING.lanes.max;

function rock(at: number, kind: ShootingRockKind, lane: number, ahead = 0): ShootingEntry {
  return ahead ? { at, kind: "rock", rock: kind, lane, ahead } : { at, kind: "rock", rock: kind, lane };
}

function enemy(at: number, monsterId: ShootingEnemyMonsterId, lane: number, motion: ShootingEnemyMotion, ahead = 0): ShootingEntry {
  return ahead ? { at, kind: "enemy", monsterId, lane, motion, ahead } : { at, kind: "enemy", monsterId, lane, motion };
}

/** 通路の左の壁から右の壁までを隙間なく塞ぐ横一列の岩。撃って穴を開けないと通れない。 */
function barrier(at: number, kinds: readonly ShootingRockKind[]): ShootingEntry[] {
  const step = (LANE_MAX - LANE_MIN) / (kinds.length - 1);
  return kinds.map((kind, index) => rock(at, kind, Math.round(LANE_MIN + step * index)));
}

function repeat<T>(count: number, make: (index: number) => T): T[] {
  return Array.from({ length: count }, (_, index) => make(index));
}

// Section A: 小岩だけ。「撃てば壊れる」を覚える。最後に小岩の壁を1枚だけ撃ち抜かせる。
const SECTION_A: ShootingEntry[] = [
  rock(180, "small", 367),
  rock(420, "small", 260),
  rock(560, "small", 470),
  rock(760, "small", 367),
  rock(900, "small", 210),
  rock(900, "small", 520),
  ...repeat(3, (index) => rock(1100, "small", 327 + index * 40)),
  rock(1300, "small", 180),
  rock(1330, "small", 560),
  ...barrier(1600, repeat(13, () => "small" as const)),
  rock(1880, "small", 300),
  rock(1940, "small", 440),
];

// Section B: 小岩+中岩(3発)。左右に動かないと抜けられない配置。大岩(避けてもよい)を少しだけ見せる。
const SECTION_B: ShootingEntry[] = [
  rock(2250, "medium", 367),
  rock(2450, "medium", 200),
  rock(2450, "small", 300),
  rock(2650, "medium", 530),
  rock(2650, "small", 430),
  rock(2900, "large", 250),
  rock(2900, "small", 400),
  rock(2900, "small", 440),
  rock(3150, "medium", 180),
  rock(3150, "medium", 260),
  rock(3150, "medium", 470),
  rock(3150, "medium", 550),
  rock(3450, "large", 470),
  rock(3450, "small", 180),
  rock(3450, "small", 230),
  rock(3700, "medium", 367),
  rock(3700, "small", 180),
  rock(3700, "small", 560),
  rock(3950, "large", 200),
  rock(3950, "large", 540),
  ...repeat(3, (index) => rock(4150, "small", 330 + index * 38)),
  // 中岩の壁。一か所を3発で崩して抜ける。
  ...barrier(4550, repeat(9, () => "medium" as const)),
  rock(4900, "small", 250),
  rock(4950, "medium", 480),
];

// Section C: 敵+岩。敵は少数で、岩を壊しながら対応する程度。
const SECTION_C: ShootingEntry[] = [
  enemy(5450, "koakuma", 300, "straight"),
  enemy(5550, "koakuma", 450, "straight"),
  rock(5650, "medium", 200),
  rock(5650, "small", 540),
  enemy(5900, "erimaki_hebi", 367, "wave"),
  rock(6050, "large", 260),
  enemy(6050, "koakuma", 260, "ambush", 10),
  rock(6100, "small", 470),
  rock(6100, "small", 520),
  enemy(6350, "daija", 520, "charge"),
  rock(6450, "medium", 367),
  rock(6450, "medium", 180),
  enemy(6700, "erimaki_hebi", 220, "wave"),
  enemy(6750, "erimaki_hebi", 500, "wave"),
  rock(6900, "large", 470),
  enemy(6900, "koakuma", 470, "ambush", 10),
  rock(6950, "small", 210),
  rock(7200, "medium", 300),
  rock(7200, "medium", 440),
  enemy(7350, "daija", 200, "charge"),
  enemy(7400, "koakuma", 367, "straight"),
  ...barrier(7700, ["medium", "small", "medium", "small", "large", "small", "medium", "small", "medium"]),
  enemy(8050, "erimaki_hebi", 300, "wave"),
  enemy(8150, "koakuma", 480, "straight"),
  rock(8300, "small", 367),
];

// Section D: 爆発岩の登場。岩の輪の中心 → 中岩の壁に埋まった爆発岩、の順で「撃つと周りまで壊れる」を見せる。
// 輪は正面(手前)に岩が来ないよう半コマ回し、真下から撃てば中心の爆発岩に届くようにする。
const ringAround = (at: number, centerLane: number, kind: ShootingRockKind, radius: number, count: number): ShootingEntry[] =>
  repeat(count, (index) => {
    const angle = (Math.PI * 2 * index + Math.PI) / count;
    return rock(at, kind, Math.round(centerLane + Math.sin(angle) * radius), Math.round(Math.cos(angle) * radius) + radius);
  });
const SECTION_D: ShootingEntry[] = [
  rock(8850, "explosive", 367, 70),
  ...ringAround(8850, 367, "small", 70, 8),
  rock(9250, "small", 200),
  rock(9250, "small", 540),
  rock(9450, "explosive", 250, 80),
  ...ringAround(9450, 250, "medium", 80, 6),
  enemy(9500, "koakuma", 500, "straight"),
  // 中岩・大岩の壁の中央に爆発岩。撃てば壁に大穴が開く。
  ...barrier(10000, ["medium", "large", "medium", "medium", "explosive", "medium", "medium", "large", "medium"]),
  rock(10400, "medium", 250),
  rock(10400, "explosive", 367),
  rock(10400, "medium", 480),
  rock(10450, "small", 180),
  rock(10450, "small", 560),
];

// Section E: 爆発岩の連鎖。一発の矢 → 大連鎖 → 大岩の壁が消える、を2回。
const chainFan = (at: number): ShootingEntry[] => [
  rock(at, "explosive", 367),
  rock(at, "explosive", 250, 110),
  rock(at, "explosive", 484, 110),
  rock(at, "explosive", 160, 220),
  rock(at, "explosive", 574, 220),
  rock(at, "explosive", 367, 230),
  ...barrier(at, ["large", "large", "large", "large", "large", "large"]).map((entry) => ({ ...entry, ahead: 330 })),
  ...repeat(4, (index) => rock(at, "medium", 200 + index * 110, 160)),
];
const SECTION_E: ShootingEntry[] = [
  ...chainFan(11300),
  rock(12000, "small", 250),
  rock(12000, "small", 480),
  enemy(12100, "erimaki_hebi", 367, "wave"),
  // 斜めに並ぶ爆発岩の列(左から右へ火が走る)。
  ...repeat(6, (index) => rock(12450, "explosive", 150 + index * 84, index * 80)),
  ...repeat(5, (index) => rock(12450, "medium", 192 + index * 84, index * 80 + 40)),
  rock(12500, "large", 560, 80),
  enemy(12900, "koakuma", 220, "straight"),
  enemy(12950, "koakuma", 500, "straight"),
  ...chainFan(13300),
  rock(14100, "small", 300),
  rock(14150, "small", 440),
];

// Section F: 崩落激化。落石・背景の小石・揺れが増えるが、見える範囲は保つ。
const SECTION_F: ShootingEntry[] = [
  { at: 14650, kind: "fallingRock", lane: 520 },
  rock(14700, "medium", 400),
  rock(14700, "small", 220),
  { at: 14950, kind: "fallingRock", lane: 380 },
  { at: 15100, kind: "fallingRock", lane: 600 },
  rock(15150, "large", 520),
  rock(15150, "explosive", 300),
  rock(15180, "medium", 200, 60),
  enemy(15400, "daija", 250, "charge"),
  { at: 15500, kind: "fallingRock", lane: 300 },
  { at: 15600, kind: "fallingRock", lane: 480 },
  rock(15700, "medium", 367),
  rock(15700, "small", 180),
  rock(15700, "small", 550),
  { at: 16000, kind: "fallingRock", lane: 560 },
  ...barrier(16200, ["large", "medium", "large", "explosive", "large", "medium", "large"]),
  { at: 16450, kind: "fallingRock", lane: 360 },
  { at: 16600, kind: "fallingRock", lane: 540 },
  enemy(16650, "erimaki_hebi", 450, "wave"),
  rock(16800, "medium", 250),
  { at: 16950, kind: "fallingRock", lane: 420 },
  { at: 17100, kind: "fallingRock", lane: 260 },
  rock(17200, "small", 400),
  rock(17200, "small", 480),
  { at: 17400, kind: "fallingRock", lane: 500 },
  rock(17500, "medium", 300),
];

/** 距離順に並んだ全配置(巨大岩壁は`IWAYAMA_SHOOTING.wall`で別管理)。 */
export const IWAYAMA_SHOOTING_ENTRIES: readonly ShootingEntry[] = [
  ...SECTION_A,
  ...SECTION_B,
  ...SECTION_C,
  ...SECTION_D,
  ...SECTION_E,
  ...SECTION_F,
].sort((left, right) => left.at - right.at);

/** 調べるとイベントが始まる赤い丸の会話(台詞は仮)。 */
export const IWAYAMA_SHOOTING_TEXT = {
  prelude: ["……？", "タロサ「なんだ？」"],
  /** 復帰後はシューティングを説明せず、短い沈黙だけで普通の探索へ戻す。 */
  afterReturn: ["…………"],
} as const;
