/**
 * Presentation-only phase state. COMMAND remains the current command RPG;
 * CINEMATIC/DODGE are deliberately small extension points for authored bosses.
 */
export const BATTLE_PRESENTATION_PHASES = ["COMMAND", "CINEMATIC", "DODGE", "RESULT"] as const;
export type BattlePresentationPhase = (typeof BATTLE_PRESENTATION_PHASES)[number];

export class BattlePhaseController {
  private phase: BattlePresentationPhase = "COMMAND";

  get current(): BattlePresentationPhase { return this.phase; }
  get acceptsInput(): boolean { return this.phase === "COMMAND" || this.phase === "RESULT"; }

  reset(): void { this.phase = "COMMAND"; }
  enterCinematic(): void { this.phase = "CINEMATIC"; }
  enterDodge(): void { this.phase = "DODGE"; }
  completeCinematic(): void { if (this.phase === "CINEMATIC" || this.phase === "DODGE") this.phase = "COMMAND"; }
  enterResult(): void { this.phase = "RESULT"; }
}
