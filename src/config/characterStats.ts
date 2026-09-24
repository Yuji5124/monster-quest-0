import type { PartyMemberId } from "../systems/PartySystem.ts";
import { getCharacterBaseStatsAtLevel } from "./characterGrowth.ts";
import { getDefaultWeaponForLevel } from "../data/weapons.ts";
import { getExpForNextLevel } from "../data/expTable.ts";

/**
 * Lv1・EXP0時点のキャラクターステータス。2026-09-22の成長／バランス統合により、
 * `characterGrowth.ts`の成長カーブ(ユーザー確定のLv23目標値からの逆算)を単一の正として、
 * ここではLv1のスナップショットだけを提供する(以前は完全に独立した仮値だった)。
 * 実戦闘・フィールドメニューは`CharacterProgression.getStats()`経由でレベル変化を反映する。
 */
export interface CharacterStatsEntry {
  readonly id: PartyMemberId;
  readonly displayName: string;
  readonly level: number;
  readonly exp: number;
  readonly expToNextLevel: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly mp: number;
  readonly maxMp: number;
  readonly attack: number;
  readonly defense: number;
  readonly speed: number;
}

const DISPLAY_NAMES: Readonly<Record<PartyMemberId, string>> = {
  hero: "主人公",
  tarosa: "タロサ",
  mirei: "ミレイ",
};

function level1Stats(memberId: PartyMemberId): CharacterStatsEntry {
  const base = getCharacterBaseStatsAtLevel(memberId, 1);
  const weapon = getDefaultWeaponForLevel(memberId, 1);
  return {
    id: memberId,
    displayName: DISPLAY_NAMES[memberId],
    level: 1,
    exp: 0,
    expToNextLevel: getExpForNextLevel(1),
    hp: base.maxHp,
    maxHp: base.maxHp,
    mp: base.maxMp,
    maxMp: base.maxMp,
    attack: base.attack + weapon.attackBonus,
    defense: base.defense,
    speed: base.speed,
  };
}

export const DEV_CHARACTER_STATS: Readonly<Record<PartyMemberId, CharacterStatsEntry>> = {
  hero: level1Stats("hero"),
  tarosa: level1Stats("tarosa"),
  mirei: level1Stats("mirei"),
} as const;
