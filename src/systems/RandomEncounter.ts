import type { RandomEncounterConfig } from "../config/encounter.ts";

/**
 * Distance-accumulating encounter gate (BATTLE_SPEC.md §11: "移動数を水増しするほど高エンカウントにしない").
 * Phaser-free so the roll/cooldown rules stay unit-testable; Scenes feed it the actual
 * per-frame movement distance (0 while stopped or blocked by Collision).
 */
export interface RandomEncounterState {
  distanceSinceLastRoll: number;
  cooldownRemaining: number;
}

export function createRandomEncounterState(initialCooldown = 0): RandomEncounterState {
  return { distanceSinceLastRoll: 0, cooldownRemaining: Math.max(0, initialCooldown) };
}

/** Blocks rolling until postBattleCooldownDistance has been walked off, so a fight never restarts instantly. */
export function beginPostBattleCooldown(state: RandomEncounterState, config: RandomEncounterConfig): void {
  state.distanceSinceLastRoll = 0;
  state.cooldownRemaining = config.postBattleCooldownDistance;
}

/**
 * Call once per frame with the distance actually moved since the previous frame.
 * Returns true only on the frame an encounter should start; callers must react immediately
 * (the accumulator is already consumed) rather than re-checking later.
 */
export function advanceRandomEncounter(
  state: RandomEncounterState,
  movedDistance: number,
  config: RandomEncounterConfig,
  random: () => number = Math.random,
): boolean {
  if (movedDistance <= 0) return false;
  if (state.cooldownRemaining > 0) {
    state.cooldownRemaining = Math.max(0, state.cooldownRemaining - movedDistance);
    return false;
  }
  state.distanceSinceLastRoll += movedDistance;
  if (state.distanceSinceLastRoll < config.stepDistance) return false;
  state.distanceSinceLastRoll = 0;
  return random() < config.encounterChance;
}
