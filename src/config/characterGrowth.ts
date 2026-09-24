import type { PartyMemberId } from "../systems/PartySystem.ts";
import type { BattleAction } from "../data/battleActions.ts";
import {
  MAGIC_LIFE, MAGIC_RELIFE, MAGIC_HEAT, MAGIC_BEATER, MAGIC_BEATEST, MAGIC_ICESOON,
  MAGIC_ELEKITEL, MAGIC_MOVE, MAGIC_MIST, MAGIC_PANIC, DEV_MIRROR, DEV_DAIDAIN,
} from "../data/battleActions.ts";
import { MAX_CHARACTER_LEVEL } from "../data/expTable.ts";

/**
 * 主人公・タロサ・ミレイの成長曲線。2026-09-22ユーザー確定仕様
 * 「主人公・タロサ・ミレイ 成長／装備／経験値／ボス攻略バランス実装」の§1・§4を反映する。
 * CHARACTER_GROWTH.md §7-8 と同期する。
 *
 * Lv1とLv23の目標値を直線補間し、Lv24・25は同じ傾きで延長する(TEMP_TEST_VALUE：曲線の
 * 形状そのものは指示になく、AIによる実装上の選択。最終的な成長率カーブはTBD)。
 * HP: 主人公＞タロサ＞ミレイ / MP: ミレイ＞主人公＞タロサ / 攻撃: タロサ＞主人公＞ミレイ
 * という指示された関係が、Lv1〜25の全域で崩れないように基準値を選んでいる。
 */
interface StatCurve {
  readonly base: number;
  /** Lv23時点の目標値(基礎値。武器補正は含まない)。 */
  readonly target: number;
}

interface CharacterCurveDefinition {
  readonly hp: StatCurve;
  readonly mp: StatCurve;
  readonly attack: StatCurve;
  /** 防御・素早さはユーザー指示に数値がないため、HP/攻撃と矛盾しない範囲のTEMP_TEST_VALUE。 */
  readonly defense: StatCurve;
  readonly speed: StatCurve;
}

const TARGET_LEVEL = 23;

const CHARACTER_CURVES: Readonly<Record<PartyMemberId, CharacterCurveDefinition>> = {
  hero: {
    hp: { base: 32, target: 220 },
    mp: { base: 6, target: 95 },
    attack: { base: 9, target: 70 },
    defense: { base: 6, target: 55 },
    speed: { base: 8, target: 40 },
  },
  tarosa: {
    hp: { base: 28, target: 200 },
    mp: { base: 4, target: 50 },
    attack: { base: 11, target: 78 },
    defense: { base: 5, target: 45 },
    speed: { base: 10, target: 48 },
  },
  mirei: {
    hp: { base: 22, target: 160 },
    mp: { base: 10, target: 142 },
    attack: { base: 5, target: 42 },
    defense: { base: 4, target: 30 },
    speed: { base: 7, target: 34 },
  },
};

function statAtLevel(curve: StatCurve, level: number): number {
  const perLevel = (curve.target - curve.base) / (TARGET_LEVEL - 1);
  return Math.round(curve.base + perLevel * (level - 1));
}

export interface CharacterBaseStats {
  readonly level: number;
  readonly maxHp: number;
  readonly maxMp: number;
  /** 武器補正を含まない基礎攻撃力。 */
  readonly attack: number;
  readonly defense: number;
  readonly speed: number;
}

export function getCharacterBaseStatsAtLevel(memberId: PartyMemberId, level: number): CharacterBaseStats {
  const clampedLevel = Math.min(MAX_CHARACTER_LEVEL, Math.max(1, Math.floor(level)));
  const curve = CHARACTER_CURVES[memberId];
  return {
    level: clampedLevel,
    maxHp: statAtLevel(curve.hp, clampedLevel),
    maxMp: statAtLevel(curve.mp, clampedLevel),
    attack: statAtLevel(curve.attack, clampedLevel),
    defense: statAtLevel(curve.defense, clampedLevel),
    speed: statAtLevel(curve.speed, clampedLevel),
  };
}

/**
 * 魔法習得表。§5のユーザー確定内容を反映する。ムーブ／ミスト／パニックの正確な習得Lvは
 * タロサの「候補」としか指示されていないため、序盤〜中盤に分散させたTEMP_TEST_VALUE。
 * エレキテルは既存正本(採用済み固有魔法)を維持するが、習得Lvは引き続きTBDのため暫定でLv1。
 */
interface MagicLearnEntry {
  readonly level: number;
  readonly magic: BattleAction;
}

const MAGIC_LEARN_TABLE: Readonly<Record<PartyMemberId, readonly MagicLearnEntry[]>> = {
  hero: [
    { level: 1, magic: MAGIC_ELEKITEL }, // TEMP_TEST_VALUE: 習得LvはTBD、暫定で初期習得
    { level: 3, magic: MAGIC_LIFE },
    { level: 8, magic: MAGIC_HEAT },
    { level: 13, magic: MAGIC_BEATER },
  ],
  tarosa: [
    { level: 5, magic: MAGIC_MOVE },
    { level: 10, magic: MAGIC_MIST },
    { level: 16, magic: MAGIC_PANIC },
  ],
  mirei: [
    { level: 1, magic: MAGIC_LIFE },
    { level: 6, magic: MAGIC_ICESOON },
    { level: 10, magic: MAGIC_RELIFE },
    { level: 14, magic: DEV_MIRROR },
    { level: 18, magic: DEV_DAIDAIN },
    { level: 22, magic: MAGIC_BEATEST },
  ],
};

export function getLearnedMagicAtLevel(memberId: PartyMemberId, level: number): readonly BattleAction[] {
  return MAGIC_LEARN_TABLE[memberId].filter((entry) => entry.level <= level).map((entry) => entry.magic);
}

export function getMagicLearnTable(memberId: PartyMemberId): readonly MagicLearnEntry[] {
  return MAGIC_LEARN_TABLE[memberId];
}
