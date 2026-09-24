/** TEMP_TEST_VALUE: final costs, duration, source of Mirror and effects are TBD. */
export type BattleAction =
  | { readonly id: string; readonly kind: "attack" }
  | { readonly id: string; readonly kind: "magic_damage"; readonly name: string; readonly mpCost: number; readonly power: number; readonly reflectable: boolean; readonly tag?: "heat" }
  | { readonly id: string; readonly kind: "mirror"; readonly name: string; readonly mpCost: number; readonly charges: number }
  | { readonly id: string; readonly kind: "heal"; readonly name: string; readonly mpCost: number; readonly power: number }
  | { readonly id: string; readonly kind: "revive"; readonly name: string; readonly mpCost: number; readonly reviveHpPercent: number }
  | { readonly id: string; readonly kind: "buff"; readonly name: string; readonly mpCost: number; readonly stat: "speed" | "defense"; readonly amount: number }
  | { readonly id: string; readonly kind: "debuff"; readonly name: string; readonly mpCost: number; readonly stat: "attack"; readonly amount: number };

export const NORMAL_ATTACK: BattleAction = { id: "attack", kind: "attack" };
export const DEV_MIRROR: BattleAction = { id: "magic_mirror", kind: "mirror", name: "ミラー", mpCost: 4, charges: 1 };
export const DEV_DAIDAIN: BattleAction = { id: "magic_daidain", kind: "magic_damage", name: "ダイダイン", mpCost: 12, power: 120, reflectable: true };

/**
 * 2026-09-22 成長／バランス統合で追加。MAGIC_SPEC.md §11のとおり、MPコスト・威力・
 * 成功率はTEMP_TEST_VALUEであり最終値ではない。魔法名と対象キャラクター・習得Lvは
 * `characterGrowth.ts`のMAGIC_LEARN_TABLE（今回のユーザー確定仕様）を正とする。
 */
export const MAGIC_LIFE: BattleAction = { id: "magic_life", kind: "heal", name: "ライフ", mpCost: 6, power: 40 };
export const MAGIC_RELIFE: BattleAction = { id: "magic_relife", kind: "revive", name: "リライフ", mpCost: 14, reviveHpPercent: 0.5 };
// ヒート: No.07まじん戦の攻略軸。tag "heat" はまじんどうくつ側の再生阻害と意味的に対応する。
export const MAGIC_HEAT: BattleAction = { id: "magic_heat", kind: "magic_damage", name: "ヒート", mpCost: 8, power: 45, reflectable: true, tag: "heat" };
export const MAGIC_BEATER: BattleAction = { id: "magic_beater", kind: "magic_damage", name: "ビーター", mpCost: 10, power: 55, reflectable: true };
export const MAGIC_BEATEST: BattleAction = { id: "magic_beatest", kind: "magic_damage", name: "ビーテスト", mpCost: 16, power: 85, reflectable: true };
export const MAGIC_ICESOON: BattleAction = { id: "magic_icesoon", kind: "magic_damage", name: "アイスーン", mpCost: 9, power: 50, reflectable: true };
// 主人公固有魔法。習得Lvは未確定のため、暫定でLv1固有習得として扱う(TEMP_TEST_VALUE)。
// mpCostはLv1主人公の最大MP(6)以下に収め、習得直後から実際に使えるようにしてある。
export const MAGIC_ELEKITEL: BattleAction = { id: "magic_elekitel", kind: "magic_damage", name: "エレキテル", mpCost: 5, power: 32, reflectable: true };
// ムーブの素早さ上昇は、行動順が素早さ基準に実装されるまで数値を保持するのみで効果は未接続(BATTLE_SPEC.md §3 TBD)。
export const MAGIC_MOVE: BattleAction = { id: "magic_move", kind: "buff", name: "ムーブ", mpCost: 4, stat: "speed", amount: 6 };
export const MAGIC_MIST: BattleAction = { id: "magic_mist", kind: "buff", name: "ミスト", mpCost: 4, stat: "defense", amount: 10 };
export const MAGIC_PANIC: BattleAction = { id: "magic_panic", kind: "debuff", name: "パニック", mpCost: 5, stat: "attack", amount: 8 };
