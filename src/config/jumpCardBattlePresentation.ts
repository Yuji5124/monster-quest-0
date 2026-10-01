/**
 * Presentation-only timing for the Rainland Jump Card battle.
 *
 * The 42.195 km dash is a visual race to decide the opening attack.  It is
 * deliberately separate from JumpCardBattle.ts: the distance, clock, and
 * effects never influence the random janken result or save data.
 */
export const JUMP_CARD_BATTLE_PRESENTATION = {
  dashDistanceKm: 42.195,
  beatDurationMs: 190,
  revealHoldMs: 260,
  beatProgressKm: [10.548, 21.097, 31.646] as const,
} as const;

export function formatJumpCardBattleClock(elapsedMs: number): string {
  const wholeSeconds = Math.max(0, elapsedMs) / 1000;
  return `${Math.floor(wholeSeconds / 60).toString().padStart(2, "0")}:${(wholeSeconds % 60).toFixed(1).padStart(4, "0")}`;
}

export function formatJumpCardBattleDistance(distanceKm: number): string {
  return `${Math.max(0, distanceKm).toFixed(3)} / ${JUMP_CARD_BATTLE_PRESENTATION.dashDistanceKm.toFixed(3)} km`;
}
