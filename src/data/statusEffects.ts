/**
 * 状態異常「毒」の共通データ。2026-09-22の成長／バランス統合で新規実装。
 * BATTLE_SPEC.md §14 の方針どおり、バトラス固有処理としてBattleSceneへ直書きせず、
 * ここと敵/装備データの`statusResistance`フラグで表現する。
 */

/** TEMP_TEST_VALUE: 最大HPの5%前後／ターンという指示の初期テスト基準。最終値はTBD。 */
export const POISON_DAMAGE_PERCENT_OF_MAX_HP = 0.05;

export function calculatePoisonDamage(maxHp: number): number {
  return Math.max(1, Math.round(maxHp * POISON_DAMAGE_PERCENT_OF_MAX_HP));
}
