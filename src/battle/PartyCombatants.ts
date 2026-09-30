import type { BattleCombatantDefinition } from "./BattleSystem.ts";
import { getCharacterBaseStatsAtLevel, getLearnedMagicAtLevel } from "../config/characterGrowth.ts";
import { DEBUG_PARTY_LEVEL, DEBUG_PARTY_MEMBER_IDS } from "../config/debugMode.ts";
import { MAX_CHARACTER_LEVEL } from "../data/expTable.ts";
import { getEquippedWeapon, getWeaponById } from "../data/weapons.ts";
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
 * パターンの再現)。通常のゲームプレイでは省略し、`live`でぶきやの購入装備と持ち越しHP/MPを渡す。
 */
export interface LivePartyState {
  readonly equippedWeaponId?: string;
  readonly hp?: number;
  readonly mp?: number;
}

export function buildPartyCombatant(
  memberId: PartyMemberId,
  level: number,
  weaponIdOverride?: string,
  live: LivePartyState = {},
  maxLevel: number = MAX_CHARACTER_LEVEL,
): BattleCombatantDefinition {
  const base = getCharacterBaseStatsAtLevel(memberId, level, maxLevel);
  const weapon = (weaponIdOverride && getWeaponById(memberId, weaponIdOverride)) || getEquippedWeapon(memberId, level, live.equippedWeaponId);
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
    initialHp: live.hp,
    initialMp: live.mp,
  };
}

/**
 * DEBUG_MODE専用の戦闘編成。加入状況・セーブ(レベル/購入装備/持ち越しHP・MP)を一切見ず、
 * 主人公一人をLv30・全快・レベル基準の最強自動装備で組み立てる。
 * Lv30は正式な成長上限Lv25の外側にあるDEBUG_ONLY値(TEMP_TEST_VALUEカーブの直線延長)。
 */
export function buildDebugParty(level: number = DEBUG_PARTY_LEVEL): BattleCombatantDefinition[] {
  return DEBUG_PARTY_MEMBER_IDS.map((id) => buildPartyCombatant(id, level, undefined, {}, Math.max(level, MAX_CHARACTER_LEVEL)));
}

export function buildParty(levels: Readonly<Partial<Record<PartyMemberId, number>>>): BattleCombatantDefinition[] {
  return (Object.keys(levels) as PartyMemberId[])
    .filter((id) => levels[id] !== undefined)
    .map((id) => buildPartyCombatant(id, levels[id]!));
}
