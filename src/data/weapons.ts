import type { PartyMemberId } from "../systems/PartySystem.ts";

/**
 * 装備武器データ。2026-09-22の成長／バランス統合で新規実装。
 * ITEM_EQUIPMENT_SPEC.md §7「最終攻撃力 = 基礎攻撃力 + 武器補正」を担う。
 *
 * 主人公の剣は`docs/ITEM_EQUIPMENT_SPEC.md`採用済みの正式名称(ぼくとう/こんぼう/てつのけん/
 * こうてつのけん/ゆうしゃのけん)をそのまま使う。タロサの弓・ミレイの杖は、同specが
 * 「具体的な武器名称は未確定のまま正式採用しない」よう指示しているため、正式名称ではなく
 * DEV_PLACEHOLDER_NAMEの識別用ラベルを付け、weaponAction/statusEffect/hitCount/defensePierce等の
 * 汎用フィールドだけをゲームバランスへ接続する。正式名称はユーザー確認待ち。
 */
export interface WeaponActionDefinition {
  readonly id: string;
  readonly name: string;
  /** 通常攻撃1回あたりのヒット数。既定1。 */
  readonly hitCount?: number;
  /** 防御力を割合で無視する(0〜1)。既定0。 */
  readonly defensePierce?: number;
  /** 付与する状態異常。現在は毒のみ実装。 */
  readonly statusEffect?: "poison";
  /** 状態異常の付与確率(0〜1)。 */
  readonly applyChance?: number;
}

export interface WeaponDefinition {
  readonly id: string;
  readonly displayName: string;
  /** ITEM_EQUIPMENT_SPEC.md採用済みの正式名称であればtrue。falseはDEV_PLACEHOLDER_NAME。 */
  readonly officialName: boolean;
  readonly attackBonus: number;
  readonly weaponAction?: WeaponActionDefinition;
}

export const HERO_WEAPONS: readonly WeaponDefinition[] = [
  { id: "hero_bokuto", displayName: "ぼくとう", officialName: true, attackBonus: 4 },
  { id: "hero_konbo", displayName: "こんぼう", officialName: true, attackBonus: 9 },
  { id: "hero_tetsu_no_ken", displayName: "てつのけん", officialName: true, attackBonus: 16 },
  { id: "hero_koutetsu_no_ken", displayName: "こうてつのけん", officialName: true, attackBonus: 24 },
  // No.14ポサロ城で取得。デーマスのとう進行条件と連動(ITEM_EQUIPMENT_SPEC.md §2)。
  { id: "hero_yuusha_no_ken", displayName: "ゆうしゃのけん", officialName: true, attackBonus: 38 },
];

// タロサの弓。名称はDEV_PLACEHOLDER_NAME(正式名称未確定)。
export const TAROSA_WEAPONS: readonly WeaponDefinition[] = [
  {
    id: "tarosa_bow_1", displayName: "弓（初期）", officialName: false, attackBonus: 5,
    weaponAction: { id: "tarosa_bow_1_action", name: "ねらいうち", hitCount: 1 },
  },
  {
    id: "tarosa_bow_2", displayName: "弓（強化）", officialName: false, attackBonus: 16,
    weaponAction: { id: "tarosa_bow_2_action", name: "れんぞくしゃげき", hitCount: 2 },
  },
  // No.19バトラス戦の攻略に必須の毒付与。CHARACTER_GROWTH.md「タロサの本編外の将来」とは無関係。
  {
    id: "tarosa_bow_poison", displayName: "どくやの弓", officialName: false, attackBonus: 38,
    weaponAction: { id: "tarosa_bow_poison_action", name: "どくや", hitCount: 1, defensePierce: 0.15, statusEffect: "poison", applyChance: 0.65 },
  },
];

// ミレイの杖。名称はDEV_PLACEHOLDER_NAME(正式名称未確定)。
export const MIREI_WEAPONS: readonly WeaponDefinition[] = [
  { id: "mirei_staff_1", displayName: "杖（初期）", officialName: false, attackBonus: 2 },
  { id: "mirei_staff_2", displayName: "杖（強化）", officialName: false, attackBonus: 6 },
  { id: "mirei_staff_final", displayName: "杖（終盤）", officialName: false, attackBonus: 14 },
];

export const WEAPON_PROGRESSION: Readonly<Record<PartyMemberId, readonly WeaponDefinition[]>> = {
  hero: HERO_WEAPONS,
  tarosa: TAROSA_WEAPONS,
  mirei: MIREI_WEAPONS,
};

/**
 * そう び選択UI・SaveSystemが未実装のため、レベル閾値に応じた自動最適装備とする
 * (TEMP_TEST_VALUE)。将来ショップ／そうび画面が実装されたら、実際の所持・購入状態に置き換える。
 */
const AUTO_EQUIP_LEVEL_THRESHOLDS: Readonly<Record<PartyMemberId, readonly number[]>> = {
  hero: [1, 5, 10, 15, 20],
  tarosa: [1, 9, 19],
  mirei: [1, 10, 20],
};

export function getDefaultWeaponForLevel(memberId: PartyMemberId, level: number): WeaponDefinition {
  const weapons = WEAPON_PROGRESSION[memberId];
  const thresholds = AUTO_EQUIP_LEVEL_THRESHOLDS[memberId];
  let index = 0;
  for (let i = 0; i < thresholds.length; i += 1) {
    if (level >= thresholds[i]) index = i;
  }
  return weapons[Math.min(index, weapons.length - 1)];
}

export function getWeaponById(memberId: PartyMemberId, weaponId: string): WeaponDefinition | undefined {
  return WEAPON_PROGRESSION[memberId].find((weapon) => weapon.id === weaponId);
}
