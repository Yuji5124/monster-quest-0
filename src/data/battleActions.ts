/** TEMP_TEST_VALUE: final costs, duration, source of Mirror and effects are TBD. */
export type BattleAction =
  | { readonly id: string; readonly kind: "attack" }
  | { readonly id: string; readonly kind: "magic_damage"; readonly name: string; readonly mpCost: number; readonly power: number; readonly reflectable: boolean }
  | { readonly id: string; readonly kind: "mirror"; readonly name: string; readonly mpCost: number; readonly charges: number };

export const NORMAL_ATTACK: BattleAction = { id: "attack", kind: "attack" };
export const DEV_MIRROR: BattleAction = { id: "magic_mirror", kind: "mirror", name: "ミラー", mpCost: 4, charges: 1 };
export const DEV_DAIDAIN: BattleAction = { id: "magic_daidain", kind: "magic_damage", name: "ダイダイン", mpCost: 12, power: 120, reflectable: true };
