import type { DevBattleMonsterId } from "../config/battle.ts";
import { DEV_BATTLE_MONSTER_IDS } from "../config/battle.ts";
import type { Facing } from "../systems/PlayerMovement.ts";

export interface BattleDialogueEvent {
  readonly type: "battle";
  readonly eventId: string;
  readonly monsterId: DevBattleMonsterId;
  /** Optional local-map name for this encounter; the shared battle stats and sprite stay keyed by monsterId. */
  readonly monsterDisplayName?: string;
  readonly returnSceneKey: string;
  readonly returnSpawnId: string;
  /** Persistent flag committed by BattleScene only on a victory. */
  readonly victoryFlag?: string;
  /** Additional persistent flags committed with victory only (for a boss's world-state unlock, etc.). */
  readonly victoryFlags?: readonly string[];
  /**
   * Random-field encounters (e.g. starting_forest) return the player to the exact
   * pre-battle position instead of a named spawn. NPC-triggered events leave these unset
   * and keep using returnSpawnId, which stays required for that case.
   */
  readonly returnSpawnX?: number;
  readonly returnSpawnY?: number;
  readonly returnFacing?: Facing;
}

/** DEV recruitment event. The dialogue chooses this only when its prerequisite is satisfied. */
export interface PartyJoinDialogueEvent {
  readonly type: "party-join";
  readonly eventId: "DEV_PARTY_JOIN_TAROSA" | "DEV_PARTY_JOIN_MIREI";
  readonly memberId: "tarosa" | "mirei";
}

export type DialogueAfterEvent = BattleDialogueEvent | PartyJoinDialogueEvent;

export interface BattleSceneStartData extends BattleDialogueEvent {
  readonly mode: "event";
}

export function createBattleSceneStartData(event: BattleDialogueEvent): BattleSceneStartData {
  return { mode: "event", ...event };
}

export function isBattleDialogueEvent(event: DialogueAfterEvent | undefined): event is BattleDialogueEvent {
  return event?.type === "battle";
}

export function isPartyJoinDialogueEvent(event: DialogueAfterEvent | undefined): event is PartyJoinDialogueEvent {
  return event?.type === "party-join";
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
