import type { AdventureRecord } from "./GameStateRepository.ts";
import { GameStateRepository } from "./GameStateRepository.ts";

/**
 * 町の僧侶が付ける「旅の記録」。保存データの正規化・既存の「つづきから」は
 * GameStateRepositoryの責務のままにし、このサービスは記録可能な場所を限定する。
 */
export function recordAdventureAtPriest(repository: GameStateRepository, record: AdventureRecord): void {
  repository.saveAdventureRecord(record);
}

export const PRIEST_RECORD_PAGES = [
  "では　たびの　きろくを\nつけましょう。",
  "たびの　きろくを\nつけた！",
] as const;

export const PRIEST_RECOVERY_PAGES = [
  "……ここは　まちの　きょうかい。\nどうやら　たすかったようだ。",
  "ちからつきるとは\nなにごとだ。\nおおごとに　なるまえに\nてったいするのだ。",
  "からだは　いやしておいた。\nつぎは　むりを　するでないぞ。",
] as const;

export interface PriestRecoveryDestination {
  readonly sceneKey: string;
  readonly spawnId: string;
}

const STARTING_TOWN_PRIEST: PriestRecoveryDestination = {
  sceneKey: "StartingTownScene",
  spawnId: "priest",
};

const BIE_VILLAGE_PRIEST: PriestRecoveryDestination = {
  sceneKey: "BieVillageScene",
  spawnId: "priest",
};

const RAINLAND_TOWN_PRIEST: PriestRecoveryDestination = {
  sceneKey: "RainlandCastleTownScene",
  spawnId: "priest",
};

const ZABON_VILLAGE_PRIEST: PriestRecoveryDestination = {
  sceneKey: "ZabonVillageScene",
  spawnId: "priest",
};

/**
 * 現在実装済みの通常戦闘は、戦闘を始めた地域に対応する僧侶へ戻す。
 * 終盤など特殊な敗北演出はBattleSceneを経由しない専用イベントとして扱う。
 */
const RECOVERY_DESTINATIONS: Readonly<Record<string, PriestRecoveryDestination>> = {
  StartingTownScene: STARTING_TOWN_PRIEST,
  StartingForestScene: STARTING_TOWN_PRIEST,
  StartingForestTestScene: STARTING_TOWN_PRIEST,
  BieVillageScene: BIE_VILLAGE_PRIEST,
  RainlandForest1Scene: RAINLAND_TOWN_PRIEST,
  RainlandForest2Scene: RAINLAND_TOWN_PRIEST,
  RainlandCastleTownScene: RAINLAND_TOWN_PRIEST,
  RainlandCastleScene: RAINLAND_TOWN_PRIEST,
  RainlandCastle3DScene: RAINLAND_TOWN_PRIEST,
  IwayamaCave1Scene: RAINLAND_TOWN_PRIEST,
  IwayamaCave2Scene: RAINLAND_TOWN_PRIEST,
  MajinCaveScene: RAINLAND_TOWN_PRIEST,
  MysteriousTowerExteriorScene: RAINLAND_TOWN_PRIEST,
  MysteriousTower1FScene: RAINLAND_TOWN_PRIEST,
  LakeCastle3DScene: RAINLAND_TOWN_PRIEST,
  ZabonVillageScene: ZABON_VILLAGE_PRIEST,
};

export function getPriestRecoveryDestination(returnSceneKey: string): PriestRecoveryDestination {
  return RECOVERY_DESTINATIONS[returnSceneKey] ?? STARTING_TOWN_PRIEST;
}
