import { getNextJumpCard, JUMP_CARD_COIN_COST, JUMP_CARD_DEFINITIONS } from "../data/jumpCards.ts";
import type { JumpCardDefinition } from "../data/jumpCards.ts";
import { getExpForLevel } from "../data/expTable.ts";

/**
 * SaveSystem未実装中の最小GameState境界。
 * 将来のSaveSystemはこのキーと `player.money` / `cards` を自身の完全なGameStateへ
 * migrationして置き換える。Scene固有のLocalStorageキーは作らない。
 */
export const GAME_STATE_STORAGE_KEY = "mq0.game-state";
export const GAME_STATE_VERSION = 1;

export interface JumpCardSaveState {
  /** ガチャ専用通貨。戦闘報酬のG（player.money）とは混ぜない。 */
  readonly jumpCoinCount: number;
  readonly jumpCardCount: number;
  readonly obtainedJumpCards: readonly string[];
}

/**
 * Persistent level progress. 2026-09-22の成長／バランス統合で、Lv1〜25累積EXPテーブル
 * (`expTable.ts`)を正とするcumulative-EXPモデルへ変更した。レベルは`totalExp`から都度算出し、
 * 二重管理(level/exp)による不整合を避ける。
 */
export interface CharacterProgressSaveState {
  readonly totalExp: number;
}

export interface GameState {
  readonly version: number;
  readonly player: {
    readonly money: number;
  };
  readonly cards: JumpCardSaveState;
  /** DEV party recruitment state. Full SaveSystem移行時もこの順を引き継ぐ。 */
  readonly party: {
    readonly joinedMemberIds: readonly string[];
    readonly characterProgress: Readonly<Record<string, CharacterProgressSaveState>>;
  };
  /** Item quantities from battle rewards. Item effects remain outside this storage boundary. */
  readonly inventory: Readonly<Record<string, number>>;
  /** True-only, named progress flags for one-time events, chests, bosses, and world unlocks. */
  readonly flags: Readonly<Record<string, true>>;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type JumpCardDrawResult =
  | { readonly kind: "obtained"; readonly card: JumpCardDefinition; readonly state: GameState }
  | { readonly kind: "insufficientCoins"; readonly state: GameState }
  | { readonly kind: "complete"; readonly state: GameState };

function initialMoney(): number {
  // TEMP_DEV_MONEY: 戦闘報酬Gの確認用。本番では0Gから始め、
  // 将来のPlayerData / SaveSystemの player.money がこの値を置き換える。
  return typeof import.meta.env !== "undefined" && import.meta.env.DEV ? 1000 : 0;
}

function initialJumpCoinCount(): number {
  // TEMP_DEV_JUMP_COINS: コイン配布導線が未実装でも、開発中に45枚の固定順を確認できる値。
  // 本番の獲得方法は今後のSaveSystem/イベント側で与え、通常の所持金からは変換しない。
  return typeof import.meta.env !== "undefined" && import.meta.env.DEV
    ? JUMP_CARD_COIN_COST * JUMP_CARD_DEFINITIONS.length
    : 0;
}

export interface DefaultGameStateOptions {
  readonly money?: number;
  readonly jumpCoinCount?: number;
}

export function createDefaultGameState(options: DefaultGameStateOptions = {}): GameState {
  const money = options.money ?? initialMoney();
  const jumpCoinCount = options.jumpCoinCount ?? initialJumpCoinCount();
  return {
    version: GAME_STATE_VERSION,
    player: { money },
    cards: { jumpCoinCount, jumpCardCount: 0, obtainedJumpCards: [] },
    party: { joinedMemberIds: ["hero"], characterProgress: createInitialCharacterProgress() },
    inventory: {},
    flags: {},
  };
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Safely accepts old/incomplete state while deriving card count from unique valid IDs. */
export function normalizeGameState(value: unknown): GameState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as {
    version?: unknown;
    player?: { money?: unknown };
    cards?: { jumpCoinCount?: unknown; obtainedJumpCards?: unknown };
    party?: { joinedMemberIds?: unknown; characterProgress?: unknown };
    inventory?: unknown;
    flags?: unknown;
  };
  if (candidate.version !== GAME_STATE_VERSION) return undefined;

  const money = isFiniteNonNegativeNumber(candidate.player?.money) ? Math.floor(candidate.player.money) : 0;
  // 旧ガチャはplayer.moneyを直接消費していた。まだジャンコインを持たない旧セーブだけは、
  // その残高をコインへ一度だけ引き継ぐ。Gも保持するため、戦闘報酬は失われない。
  const jumpCoinCount = isFiniteNonNegativeNumber(candidate.cards?.jumpCoinCount)
    ? Math.floor(candidate.cards.jumpCoinCount)
    : money;
  const rawIds = Array.isArray(candidate.cards?.obtainedJumpCards) ? candidate.cards.obtainedJumpCards : [];
  const validIds = new Set(getNextCardIds());
  const obtainedJumpCards = rawIds.filter((id): id is string => typeof id === "string" && validIds.has(id));
  const uniqueIds = [...new Set(obtainedJumpCards)].sort((left, right) => getCardOrder(left) - getCardOrder(right));
  const savedPartyIds = Array.isArray(candidate.party?.joinedMemberIds) ? candidate.party.joinedMemberIds : [];
  const joinedMemberIds = normalizePartyMemberIds(savedPartyIds);
  const characterProgress = normalizeCharacterProgress(candidate.party?.characterProgress);
  const inventory = normalizeInventory(candidate.inventory);
  const flags = normalizeFlags(candidate.flags);
  return {
    version: GAME_STATE_VERSION,
    player: { money },
    cards: { jumpCoinCount, jumpCardCount: uniqueIds.length, obtainedJumpCards: uniqueIds },
    party: { joinedMemberIds, characterProgress },
    inventory,
    flags,
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
    if (state.cards.jumpCoinCount < JUMP_CARD_COIN_COST) return { kind: "insufficientCoins", state };

    const nextState: GameState = {
      ...state,
      cards: {
        jumpCoinCount: state.cards.jumpCoinCount - JUMP_CARD_COIN_COST,
        jumpCardCount: state.cards.jumpCardCount + 1,
        obtainedJumpCards: [...state.cards.obtainedJumpCards, nextCard.id],
      },
    };
    this.save(nextState);
    return { kind: "obtained", card: nextCard, state: nextState };
  }

  /**
   * 「はじめから」用。パーティを主人公1人・全員Lv1(EXP0)へ戻し、所持金・道具・
   * ジャンカード(取得済みカード0枚・ジャンコイン初期値)もすべて初期値へ戻す
   * (2026-09-23ユーザー指示「カード数リセット」)。「もういちど」はNew Gameではないため、
   * この処理を使わない(CLAUDE.md「ジャンカード取得情報を削除しない」はそちらの制約)。
   */
  startNewGame(): GameState {
    const nextState = createDefaultGameState();
    this.save(nextState);
    return nextState;
  }

  /** Preserves the existing card/player fields while persisting party recruitment state. */
  savePartyMemberIds(memberIds: readonly string[]): GameState {
    const state = this.load();
    const joinedMemberIds = normalizePartyMemberIds(memberIds);
    const nextState: GameState = { ...state, party: { ...state.party, joinedMemberIds } };
    this.save(nextState);
    return nextState;
  }

  /** Adds a non-negative battle gold reward without replacing cards, party, or inventory. */
  addMoney(amount: number): GameState {
    const state = this.load();
    const safeAmount = isFiniteNonNegativeNumber(amount) ? Math.floor(amount) : 0;
    const nextState: GameState = { ...state, player: { money: state.player.money + safeAmount } };
    this.save(nextState);
    return nextState;
  }

  /** Adds gacha-only ジャンコイン without affecting battle gold or card ownership. */
  addJumpCoins(amount: number): GameState {
    const state = this.load();
    const safeAmount = isFiniteNonNegativeNumber(amount) ? Math.floor(amount) : 0;
    const nextState: GameState = {
      ...state,
      cards: { ...state.cards, jumpCoinCount: state.cards.jumpCoinCount + safeAmount },
    };
    this.save(nextState);
    return nextState;
  }

  /** Persists only normalized character progression; party membership remains untouched. */
  saveCharacterProgress(progress: Readonly<Record<string, CharacterProgressSaveState>>): GameState {
    const state = this.load();
    const nextState: GameState = {
      ...state,
      party: { ...state.party, characterProgress: normalizeCharacterProgress(progress) },
    };
    this.save(nextState);
    return nextState;
  }

  /** Persists positive inventory quantities while retaining unrelated save state. */
  saveInventory(inventory: Readonly<Record<string, number>>): GameState {
    const state = this.load();
    const nextState: GameState = { ...state, inventory: normalizeInventory(inventory) };
    this.save(nextState);
    return nextState;
  }

  /** Reads the saved true-only flags without exposing the mutable storage record. */
  getFlags(): ReadonlySet<string> {
    return new Set(Object.keys(this.load().flags));
  }

  hasFlag(flag: string): boolean {
    return this.load().flags[flag] === true;
  }

  /** Idempotently records a valid progress flag while retaining every other saved subsystem. */
  setFlag(flag: string): GameState {
    const state = this.load();
    if (!isSaveFlag(flag) || state.flags[flag] === true) return state;
    const nextState: GameState = { ...state, flags: { ...state.flags, [flag]: true } };
    this.save(nextState);
    return nextState;
  }

  private save(state: GameState): void {
    if (this.storage) this.storage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(state));
  }
}

/** Keeps the DEV party in its formal join order even if an old/manual save is malformed. */
function normalizePartyMemberIds(memberIds: readonly unknown[]): string[] {
  const joinedMemberIds = ["hero"];
  if (memberIds.includes("tarosa")) joinedMemberIds.push("tarosa");
  if (joinedMemberIds.includes("tarosa") && memberIds.includes("mirei")) joinedMemberIds.push("mirei");
  return joinedMemberIds;
}

function createInitialCharacterProgress(): Record<string, CharacterProgressSaveState> {
  return {
    hero: { totalExp: 0 },
    tarosa: { totalExp: 0 },
    mirei: { totalExp: 0 },
  };
}

/**
 * 新形式`{totalExp}`はそのまま受け付ける。ExP曲線改定前の旧形式`{level, exp}`は、
 * そのレベルに到達するのに必要な累積EXPへ一度だけ切り上げ移行する(旧`exp`の端数は
 * 曲線が別物のため正確には引き継げない。安全側に倒し前進のみを保証する)。
 */
function normalizeCharacterProgress(value: unknown): Record<string, CharacterProgressSaveState> {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const initial = createInitialCharacterProgress();
  for (const memberId of Object.keys(initial)) {
    const entry = source[memberId];
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as { totalExp?: unknown; level?: unknown; exp?: unknown };
    if (isFiniteNonNegativeNumber(candidate.totalExp)) {
      initial[memberId] = { totalExp: Math.floor(candidate.totalExp) };
    } else if (isFiniteNonNegativeNumber(candidate.level) && candidate.level >= 1) {
      initial[memberId] = { totalExp: getExpForLevel(Math.floor(candidate.level)) };
    }
  }
  return initial;
}

function normalizeInventory(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([itemId, quantity]) => itemId.length > 0 && isFiniteNonNegativeNumber(quantity) && quantity > 0)
      .map(([itemId, quantity]) => [itemId, Math.floor(quantity as number)]),
  );
}

function isSaveFlag(value: unknown): value is string {
  return typeof value === "string" && /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(value);
}

/** Missing flags from old v1 saves are a safe empty record; false/unknown entries never unlock content. */
function normalizeFlags(value: unknown): Record<string, true> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([flag, enabled]) => isSaveFlag(flag) && enabled === true)
      .map(([flag]) => [flag, true]),
  ) as Record<string, true>;
}
