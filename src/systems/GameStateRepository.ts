import { getNextJumpCard, JUMP_CARD_COST, JUMP_CARD_DEFINITIONS } from "../data/jumpCards.ts";
import type { JumpCardDefinition } from "../data/jumpCards.ts";

/**
 * SaveSystem未実装中の最小GameState境界。
 * 将来のSaveSystemはこのキーと `player.money` / `cards` を自身の完全なGameStateへ
 * migrationして置き換える。Scene固有のLocalStorageキーは作らない。
 */
export const GAME_STATE_STORAGE_KEY = "mq0.game-state";
export const GAME_STATE_VERSION = 1;

export interface JumpCardSaveState {
  readonly jumpCardCount: number;
  readonly obtainedJumpCards: readonly string[];
}

export interface GameState {
  readonly version: number;
  readonly player: {
    readonly money: number;
  };
  readonly cards: JumpCardSaveState;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type JumpCardDrawResult =
  | { readonly kind: "obtained"; readonly card: JumpCardDefinition; readonly state: GameState }
  | { readonly kind: "insufficientFunds"; readonly state: GameState }
  | { readonly kind: "complete"; readonly state: GameState };

function initialMoney(): number {
  // TEMP_DEV_MONEY: 所持金システム未実装中のガチャ単体確認用。本番では0円から始め、
  // 将来のPlayerData / SaveSystemの player.money がこの値を置き換える。
  return typeof import.meta.env !== "undefined" && import.meta.env.DEV ? 1000 : 0;
}

export function createDefaultGameState(money = initialMoney()): GameState {
  return {
    version: GAME_STATE_VERSION,
    player: { money },
    cards: { jumpCardCount: 0, obtainedJumpCards: [] },
  };
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Safely accepts old/incomplete state while deriving card count from unique valid IDs. */
export function normalizeGameState(value: unknown): GameState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as { version?: unknown; player?: { money?: unknown }; cards?: { obtainedJumpCards?: unknown } };
  if (candidate.version !== GAME_STATE_VERSION) return undefined;

  const money = isFiniteNonNegativeNumber(candidate.player?.money) ? Math.floor(candidate.player.money) : 0;
  const rawIds = Array.isArray(candidate.cards?.obtainedJumpCards) ? candidate.cards.obtainedJumpCards : [];
  const validIds = new Set(getNextCardIds());
  const obtainedJumpCards = rawIds.filter((id): id is string => typeof id === "string" && validIds.has(id));
  const uniqueIds = [...new Set(obtainedJumpCards)].sort((left, right) => getCardOrder(left) - getCardOrder(right));
  return {
    version: GAME_STATE_VERSION,
    player: { money },
    cards: { jumpCardCount: uniqueIds.length, obtainedJumpCards: uniqueIds },
  };
}

function getNextCardIds(): readonly string[] {
  return JUMP_CARD_DEFINITIONS.map((card) => card.id);
}

function getCardOrder(id: string): number {
  return Number(id.slice("card_".length));
}

/**
 * The repository is the sole current persistence boundary for the gacha slice.
 * It uses one future GameState key and never clears or overwrites unreadable JSON.
 */
export class GameStateRepository {
  private readonly storage: KeyValueStorage | undefined;

  constructor(storage: KeyValueStorage | undefined = typeof window === "undefined" ? undefined : window.localStorage) {
    this.storage = storage;
  }

  load(): GameState {
    if (!this.storage) return createDefaultGameState();
    const serialized = this.storage.getItem(GAME_STATE_STORAGE_KEY);
    if (!serialized) return createDefaultGameState();
    try {
      return normalizeGameState(JSON.parse(serialized)) ?? createDefaultGameState();
    } catch {
      // Broken saves remain untouched for a future SaveSystem recovery flow.
      return createDefaultGameState();
    }
  }

  drawNextJumpCard(): JumpCardDrawResult {
    const state = this.load();
    const nextCard = getNextJumpCard(state.cards.obtainedJumpCards);
    if (!nextCard) return { kind: "complete", state };
    if (state.player.money < JUMP_CARD_COST) return { kind: "insufficientFunds", state };

    const nextState: GameState = {
      ...state,
      player: { money: state.player.money - JUMP_CARD_COST },
      cards: {
        jumpCardCount: state.cards.jumpCardCount + 1,
        obtainedJumpCards: [...state.cards.obtainedJumpCards, nextCard.id],
      },
    };
    this.save(nextState);
    return { kind: "obtained", card: nextCard, state: nextState };
  }

  private save(state: GameState): void {
    if (this.storage) this.storage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(state));
  }
}
