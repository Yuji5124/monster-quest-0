import type { BattleCombatantDefinition } from "../battle/BattleSystem.ts";
import { NORMAL_ATTACK } from "./battleActions.ts";
import { MONSTER_ROSTER_BY_ID } from "./monsters.ts";

/**
 * バトラス・オロチまおう・まじんの戦闘データ。HP/攻撃/防御/素早さ/EXP/ゴールドは
 * 2026-09-23確定の`MONSTER_ROSTER`(`src/data/monsters.ts`)を正本として参照する。
 * MP・命中/回避・状態異常成功率・最終ダメージ式は引き続きTBD(MONSTER_SPEC.md §6)。
 *
 * 正式ポートレート／背景がASSET_INDEX.mdで未確認のため、BattleScene(DEV_BATTLE_MONSTERS)へは
 * まだ接続していない。ここではBattleSystemで直接使えるプレーンなデータのみを提供し、
 * ボス攻略バランスをheadlessシミュレーションテストで検証する。
 */
export const BATORASU: BattleCombatantDefinition = {
  id: "batorasu",
  displayName: MONSTER_ROSTER_BY_ID.batorasu.name,
  maxHp: MONSTER_ROSTER_BY_ID.batorasu.hp,
  maxMp: 0,
  attack: MONSTER_ROSTER_BY_ID.batorasu.attack,
  defense: MONSTER_ROSTER_BY_ID.batorasu.defense,
  speed: MONSTER_ROSTER_BY_ID.batorasu.speed,
  isBoss: true,
  enemyActions: [NORMAL_ATTACK],
  // 毒は無効化しない(BATTLE_SPEC.md §9.2「毒が正規攻略上ほぼ必須」と両立させるため)。
  statusResistance: { poison: false },
  reward: { experience: MONSTER_ROSTER_BY_ID.batorasu.exp, money: MONSTER_ROSTER_BY_ID.batorasu.gold },
};

export const OROCHI_MAOU: BattleCombatantDefinition = {
  id: "orochi_maou",
  displayName: MONSTER_ROSTER_BY_ID.orochi_maou.name,
  maxHp: MONSTER_ROSTER_BY_ID.orochi_maou.hp,
  maxMp: 80,
  attack: MONSTER_ROSTER_BY_ID.orochi_maou.attack,
  defense: MONSTER_ROSTER_BY_ID.orochi_maou.defense,
  speed: MONSTER_ROSTER_BY_ID.orochi_maou.speed,
  isBoss: true,
  enemyActions: [NORMAL_ATTACK, NORMAL_ATTACK],
  reward: { experience: MONSTER_ROSTER_BY_ID.orochi_maou.exp, money: MONSTER_ROSTER_BY_ID.orochi_maou.gold },
};

/**
 * まじんの正本ステータス(BattleCombatantDefinition形)。No.07まじんのどうくつは
 * defense概念を持たない専用ターン制Dungeon RPG実装(`src/data/majinCaveEnemies.ts`)を
 * 既存仕様として維持するため使わないが、将来的にBattleSystemベースの実装へ接続する場合に
 * 備え、正本データをここに用意しておく。
 */
export const MAJIN: BattleCombatantDefinition = {
  id: "majin",
  displayName: MONSTER_ROSTER_BY_ID.majin.name,
  maxHp: MONSTER_ROSTER_BY_ID.majin.hp,
  attack: MONSTER_ROSTER_BY_ID.majin.attack,
  defense: MONSTER_ROSTER_BY_ID.majin.defense,
  speed: MONSTER_ROSTER_BY_ID.majin.speed,
  isBoss: true,
  enemyActions: [NORMAL_ATTACK],
  reward: { experience: MONSTER_ROSTER_BY_ID.majin.exp, money: MONSTER_ROSTER_BY_ID.majin.gold },
};
