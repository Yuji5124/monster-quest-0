import type { JumpCardBattleDefinition } from "../config/jumpCardBattles.ts";

export const JANKEN_POSES = ["rock", "scissors", "paper"] as const;
export type JankenPose = (typeof JANKEN_POSES)[number];

export type JankenResult = "player" | "opponent" | "tie";

/** Returns who earns the opening attack. A tie deliberately asks for another throw. */
export function resolveJanken(player: JankenPose, opponent: JankenPose): JankenResult {
  if (player === opponent) return "tie";
  if (
    (player === "rock" && opponent === "scissors")
    || (player === "scissors" && opponent === "paper")
    || (player === "paper" && opponent === "rock")
  ) return "player";
  return "opponent";
}

/** A card battle only reads ownership; card matches never consume or mutate the collection. */
export function canStartJumpCardBattle(
  battle: Pick<JumpCardBattleDefinition, "requiredPlayerCardId">,
  obtainedCardIds: readonly string[],
): boolean {
  return obtainedCardIds.includes(battle.requiredPlayerCardId);
}
