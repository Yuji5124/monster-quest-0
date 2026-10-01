import type { DevBattleMonsterId } from "../config/battle.ts";
import { DEV_BATTLE_MONSTER_IDS } from "../config/battle.ts";
import type { RainlandWeatherPhase } from "../config/rainlandWeather.ts";
import type { Facing } from "../systems/PlayerMovement.ts";
import type { PartyMemberId } from "../systems/PartySystem.ts";

/** Immutable field-weather snapshot passed into BattleScene at encounter entry. */
export interface BattleWeatherContext {
  readonly biome: "rainland-forest";
  readonly phase: RainlandWeatherPhase;
}

export interface BattleDialogueEvent {
  readonly type: "battle";
  readonly eventId: string;
  readonly monsterId: DevBattleMonsterId;
  /** Optional local-map name for this encounter; the shared battle stats and sprite stay keyed by monsterId. */
  readonly monsterDisplayName?: string;
  readonly returnSceneKey: string;
  readonly returnSpawnId: string;
  /**
   * 通常戦闘は全滅時に地域の僧侶へ戻る。物語上の特殊敗北だけは専用演出側で
   * "special" を指定し、この共通復帰を使わない。
   */
  readonly defeatRoute?: "priest" | "special";
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
  /** Optional scene-specific floor/layer to restore after a battle. */
  readonly returnFloor?: number;
  /** Optional exact first-person camera yaw. 2D maps continue to use returnFacing. */
  readonly returnYaw?: number;
  /** Optional local encounter backdrop. It overrides only this event, not the shared monster definition. */
  readonly battleBackground?: { readonly key: string; readonly url: string };
  /** Optional local-map weather snapshot. BattleScene never reaches back into the field Scene. */
  readonly weather?: BattleWeatherContext;
}

/** DEV recruitment event. The dialogue chooses this only when its prerequisite is satisfied. */
export interface PartyJoinDialogueEvent {
  readonly type: "party-join";
  readonly eventId: "DEV_PARTY_JOIN_TAROSA" | "DEV_PARTY_JOIN_MIREI";
  readonly memberId: "tarosa" | "mirei";
}

/** 会話を読み終えた時点で、一度きりの進行フラグを保存する(店主から場所を聞いて世界地図の地点が解放される等)。 */
export interface StoryFlagsDialogueEvent {
  readonly type: "story-flags";
  readonly eventId: string;
  readonly flags: readonly string[];
}

/**
 * 会話を読み終えると画面が暗転し、そのNPCが町から去る一度きりのイベント。
 * フラグは暗転中(NPCを消す瞬間)に保存し、明転後には最初からいない状態と同じになる。
 */
export interface NpcDepartDialogueEvent {
  readonly type: "npc-depart";
  readonly eventId: string;
  readonly npcId: string;
  readonly flags: readonly string[];
  /** 去ると同時にパーティへ加わる場合だけ指定する(ミレイがかくれざとを去り旅の仲間になる等)。 */
  readonly joinsPartyAs?: PartyMemberId;
}

/**
 * 会話を読み終えると、額縁つきの一枚絵を挟んでから続きの会話を開く(王がタロサの話をする場面など)。
 * 一枚絵はcontinuationPagesが読み終わるまで表示したままにし、閉じた時点でthenFlagsを保存する。
 */
export interface PortraitInterludeDialogueEvent {
  readonly type: "portrait-interlude";
  readonly portrait: {
    readonly key: string;
    readonly path: string;
    readonly crop: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
    readonly displayHeight: number;
  };
  readonly continuationPages: readonly string[];
  readonly thenFlags?: readonly string[];
}

export type DialogueAfterEvent =
  | BattleDialogueEvent
  | PartyJoinDialogueEvent
  | StoryFlagsDialogueEvent
  | NpcDepartDialogueEvent
  | PortraitInterludeDialogueEvent;

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

export function isStoryFlagsDialogueEvent(event: DialogueAfterEvent | undefined): event is StoryFlagsDialogueEvent {
  return event?.type === "story-flags";
}

export function isNpcDepartDialogueEvent(event: DialogueAfterEvent | undefined): event is NpcDepartDialogueEvent {
  return event?.type === "npc-depart";
}

export function isPortraitInterludeDialogueEvent(event: DialogueAfterEvent | undefined): event is PortraitInterludeDialogueEvent {
  return event?.type === "portrait-interlude";
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
