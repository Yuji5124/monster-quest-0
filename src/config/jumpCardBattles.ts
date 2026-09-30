/**
 * Small, data-owned card-battle encounters.  The regular RPG battle system is
 * intentionally not involved: these matches are an optional card minigame and
 * never alter party HP, money, or card ownership.
 */
export interface JumpCardBattleDefinition {
  readonly id: string;
  readonly opponentName: string;
  /** A player must own this card to accept this particular challenge. */
  readonly requiredPlayerCardId: string;
  /** The card placed by the opponent on the right side of the battle screen. */
  readonly opponentCardId: string;
  /** This first encounter is deliberately one round; future challengers can opt in independently. */
  readonly rounds: number;
}

/**
 * Add future card-battle NPCs here, then assign the resulting id to their
 * `NpcDefinition.jumpCardBattleId`.  This keeps NPC placement separate from
 * the dedicated card-battle screen.
 */
export const JUMP_CARD_BATTLES = {
  rainland_purin_challenge: {
    id: "rainland_purin_challenge",
    opponentName: "カードしょうぶのひと",
    requiredPlayerCardId: "card_01",
    opponentCardId: "card_01",
    rounds: 1,
  },
} as const satisfies Record<string, JumpCardBattleDefinition>;

export type JumpCardBattleId = keyof typeof JUMP_CARD_BATTLES;
export const DEFAULT_JUMP_CARD_BATTLE_ID: JumpCardBattleId = "rainland_purin_challenge";

export function getJumpCardBattle(id: string): JumpCardBattleDefinition | undefined {
  return JUMP_CARD_BATTLES[id as JumpCardBattleId];
}
