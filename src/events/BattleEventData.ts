import type { DevBattleMonsterId } from "../config/battle.ts";
import { DEV_BATTLE_MONSTER_IDS } from "../config/battle.ts";

export interface BattleDialogueEvent {
  readonly type: "battle";
  readonly eventId: string;
  readonly monsterId: DevBattleMonsterId;
  readonly returnSceneKey: string;
  readonly returnSpawnId: string;
  /** TODO: GameState/SaveSystem integration; not persisted in the DEV event. */
  readonly victoryFlag?: string;
}

export type DialogueAfterEvent = BattleDialogueEvent;

export interface BattleSceneStartData extends BattleDialogueEvent {
  readonly mode: "event";
}

export function createBattleSceneStartData(event: BattleDialogueEvent): BattleSceneStartData {
  return { mode: "event", ...event };
}

export function isBattleDialogueEvent(event: DialogueAfterEvent | undefined): event is BattleDialogueEvent {
  return event?.type === "battle";
}

/** Tiled Object properties -> existing dialogue battle contract. Coordinates stay with the map. */
export function battleEventFromProperties(properties: Record<string, unknown>, returnTarget: { returnSceneKey: string; returnSpawnId: string }): BattleDialogueEvent | undefined {
  if (properties.eventType !== "battle" || typeof properties.eventId !== "string" || !properties.eventId.trim() ||
      !DEV_BATTLE_MONSTER_IDS.includes(properties.enemyId as DevBattleMonsterId)) return undefined;
  return {
    type: "battle", eventId: properties.eventId, monsterId: properties.enemyId as DevBattleMonsterId,
    ...returnTarget,
    ...(typeof properties.victoryFlag === "string" ? { victoryFlag: properties.victoryFlag } : {}),
  };
}
