import type { BattleCombatantDefinition } from "./BattleSystem.ts";
import { getCharacterBaseStatsAtLevel, getLearnedMagicAtLevel } from "../config/characterGrowth.ts";
import { getDefaultWeaponForLevel, getWeaponById } from "../data/weapons.ts";
import type { PartyMemberId } from "../systems/PartySystem.ts";

const DISPLAY_NAMES: Readonly<Record<PartyMemberId, string>> = {
  hero: "主人公",
  tarosa: "タロサ",
  mirei: "ミレイ",
};

/**
 * CHARACTER_GROWTH.md・characterGrowth.ts・weapons.tsから、実戦闘で使うBattleCombatantDefinitionを
 * 組み立てる。「最終攻撃力 = 基礎攻撃力 + 武器補正」(ITEM_EQUIPMENT_SPEC.md §7)をここで反映する。
 */
/**
 * `weaponIdOverride`はテスト・バランス検証用(例: 「装備不足」パターンや「毒の弓をまだ持たない」
 * パターンの再現)。通常のゲームプレイでは省略し、レベル基準の自動最適装備を使う。
 */
export function buildPartyCombatant(memberId: PartyMemberId, level: number, weaponIdOverride?: string): BattleCombatantDefinition {
  const base = getCharacterBaseStatsAtLevel(memberId, level);
  const weapon = (weaponIdOverride && getWeaponById(memberId, weaponIdOverride)) || getDefaultWeaponForLevel(memberId, level);
  return {
    id: memberId,
    displayName: DISPLAY_NAMES[memberId],
    maxHp: base.maxHp,
    maxMp: base.maxMp,
    attack: base.attack + weapon.attackBonus,
    defense: base.defense,
    speed: base.speed,
    learnedMagic: getLearnedMagicAtLevel(memberId, level),
    weaponAction: weapon.weaponAction,
  };
}

export function buildParty(levels: Readonly<Partial<Record<PartyMemberId, number>>>): BattleCombatantDefinition[] {
  return (Object.keys(levels) as PartyMemberId[])
    .filter((id) => levels[id] !== undefined)
    .map((id) => buildPartyCombatant(id, levels[id]!));
}
