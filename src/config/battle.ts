import { SCALE_FACTOR as S } from "./display.ts";

/**
 * DEV_BATTLE_BALANCE only.  These numbers are deliberately separate from the
 * final balance values, which remain TBD in BATTLE_SPEC.md.
 */
export const DEV_BATTLE_PLAYER = {
  id: "dev_battle_player",
  displayName: "主人公",
  maxHp: 30,
  maxMp: 0,
  attack: 8,
  defense: 3,
} as const;

// TEMP_TEST_VALUE: Lv15帯の単独確認用。正式成長・魔法習得へは書き戻さない。
export const DEV_BOSS_TEST_PLAYER = {
  ...DEV_BATTLE_PLAYER, maxHp: 180, maxMp: 32, attack: 42, defense: 18,
} as const;

export const DEV_BATTLE_COMMANDS = ["fight", "magic", "item", "flee"] as const;
export const BATTLE_COMMAND_LABELS = ["こうげき", "まほう", "どうぐ", "にげる"] as const;
export type BattleCommandId = (typeof DEV_BATTLE_COMMANDS)[number];

export const DEV_BATTLE_QUERY_PARAM = "battleTest";
export const DEV_BATTLE_EVENT_FADE_MS = 220;
/**
 * A brisk, controlled pixel-collapse from field to battle. DEV battle queries bypass it.
 * Kept short enough that routine encounters do not stall exploration.
 */
export const BATTLE_ENTRANCE_DURATION_MS = 1_300;
export const DEV_BATTLE_MONSTER_IDS = ["001", "003", "006", "demas", "batorasu", "obake_tsumuri", "fancy_duck", "snow_bomb", "koakuma", "erimaki_hebi", "daija", "yaki_purin", "kamaitachi", "kirimaneki"] as const;
export type DevBattleMonsterId = (typeof DEV_BATTLE_MONSTER_IDS)[number];

export function readDevBattleMonsterId(search: string): DevBattleMonsterId {
  const requested = new URLSearchParams(search).get(DEV_BATTLE_QUERY_PARAM);
  return DEV_BATTLE_MONSTER_IDS.includes(requested as DevBattleMonsterId)
    ? requested as DevBattleMonsterId
    : "003";
}

/** Layout-only DEV_BATTLE_UI values.  Enemy HP visibility is not a final UI decision. */
export const DEV_BATTLE_UI_LAYOUT = {
  enemy: { x: 160 * S, y: 105 * S, maxWidth: 84 * S, maxHeight: 66 * S },
  statusWindow: { x: 8 * S, y: 8 * S, width: 94 * S, height: 38 * S },
  commandWindow: { x: 8 * S, y: 164 * S, width: 76 * S, height: 68 * S },
  messageWindow: { x: 90 * S, y: 164 * S, width: 222 * S, height: 68 * S },
  padding: 6 * S,
  fontSize: 22 * S / 3,
  commandLineHeight: 16 * S,
} as const;

/** Current party is one member; the same row accommodates the planned three. */
export function getBattleStatusWindows(partySize: number) {
  const bounds = DEV_BATTLE_UI_LAYOUT.statusWindow;
  return Array.from({ length: partySize }, (_, index) => ({
    ...bounds, x: bounds.x + index * (bounds.width + 10 * S),
  }));
}

/**
 * 味方の通常攻撃(こうげき)で敵ポートレートに重ねる斬撃エフェクト。正式素材がないため
 * Phaser Graphicsで手続き描画する(TEMP_VISUAL_VALUE: 色・角度・速度は人間の視覚調整対象)。
 * 武器のhitCountぶん斬撃を重ね、2撃目以降は角度を反転して交差させる。
 */
export interface BattleSlashEffectStyle {
  /** 斬撃の芯の色。 */
  readonly coreColor: number;
  /** 斬撃の外側の光の色。 */
  readonly glowColor: number;
  /** 水平からの傾き(度)。正で右下がり。 */
  readonly angleDeg: number;
}

export const BATTLE_SLASH_EFFECT_TIMING = {
  /** 斬撃が伸びきるまで。 */
  drawMs: 90,
  /** 伸びきってから消えるまで。 */
  fadeMs: 200,
  /** 多段攻撃の各撃の間隔。 */
  hitIntervalMs: 120,
} as const;

const DEFAULT_SLASH_STYLE: BattleSlashEffectStyle = { coreColor: 0xffffff, glowColor: 0xbfd8ff, angleDeg: -35 };

export const BATTLE_SLASH_EFFECT_STYLES: Readonly<Record<string, BattleSlashEffectStyle>> = {
  hero: { coreColor: 0xffffff, glowColor: 0x9fd0ff, angleDeg: -35 },
  tarosa: { coreColor: 0xfffbe0, glowColor: 0xffc857, angleDeg: 30 },
  mirei: { coreColor: 0xffffff, glowColor: 0xff9fd8, angleDeg: -20 },
};

/** 各撃の斬撃の角度(度)を返す。2撃目以降は交互に反転させてX字に交差させる。 */
export function getBattleSlashAngles(memberId: string, hitCount = 1): { style: BattleSlashEffectStyle; anglesDeg: number[] } {
  const style = BATTLE_SLASH_EFFECT_STYLES[memberId] ?? DEFAULT_SLASH_STYLE;
  const count = Math.max(1, Math.floor(hitCount));
  const anglesDeg = Array.from({ length: count }, (_, index) => (index % 2 === 0 ? style.angleDeg : -style.angleDeg));
  return { style, anglesDeg };
}

/**
 * だいヒット(とくだいヒット含む)時の大げさな斬撃。通常の斬撃を大きく太くし、金色の光・
 * 追加の交差斬撃・画面の揺れと閃光・「だいヒット！」の文字を重ねる(TEMP_VISUAL_VALUE)。
 */
export const BATTLE_BIG_HIT_EFFECT = {
  /** 刃の長さ・太さの倍率。 */
  lengthScale: 1.7,
  thicknessScale: 2.2,
  /** 刃の外側の光。キャラ色の外にさらに重ねる。 */
  auraColor: 0xffd75e,
  /** 各撃に追加する交差斬撃の数。 */
  extraSlashes: 1,
  sparkCount: 16,
  /** 斬撃の表示時間の倍率(少し長く残して見せる)。 */
  durationScale: 1.6,
  shakeMs: 280,
  shakeIntensity: 0.014,
  flashMs: 160,
  /** 斬撃が伸びきった瞬間に止める時間(ヒットストップ)。 */
  hitStopMs: 70,
  bannerMs: 900,
} as const;

/**
 * TEMP_VISUAL_VALUE: one short, readable impact profile per physical-hit tier.
 * These are presentation values only; rates, damage multipliers and all battle
 * calculations remain in BattleSystem.
 */
export const BATTLE_HIT_FEEDBACK = {
  normal: {
    chargeMs: 42,
    hitStopMs: 42,
    knockbackPx: 5,
    shakeMs: 105,
    shakeIntensity: 0.0035,
    flashMs: 72,
    numberScale: 1,
    uiShakePx: 0,
  },
  dai: {
    chargeMs: 58,
    hitStopMs: 86,
    knockbackPx: 12,
    shakeMs: 180,
    shakeIntensity: 0.007,
    flashMs: 105,
    numberScale: 1.32,
    uiShakePx: 3,
  },
  tokudai: {
    chargeMs: 74,
    hitStopMs: 122,
    knockbackPx: 22,
    shakeMs: 250,
    shakeIntensity: 0.011,
    flashMs: 130,
    numberScale: 1.68,
    uiShakePx: 6,
  },
} as const;
