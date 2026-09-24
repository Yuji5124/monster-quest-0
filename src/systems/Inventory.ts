import { ITEM_DEFINITIONS } from "../data/items.ts";
import type { ItemId } from "../data/items.ts";
import { GameStateRepository } from "./GameStateRepository.ts";

export interface InventorySlot {
  readonly itemId: ItemId;
  readonly quantity: number;
}

/**
 * Item effects are not implemented yet, but battle drops must survive scene changes and reloads.
 */
export class Inventory {
  private readonly quantities = new Map<ItemId, number>();
  private readonly repository: GameStateRepository | undefined;

  constructor(
    initial: Readonly<Partial<Record<ItemId, number>>> = {},
    repository: GameStateRepository | undefined = undefined,
  ) {
    this.repository = repository;
    const saved = repository?.load().inventory ?? {};
    const source = Object.keys(saved).length > 0 ? saved : initial;
    for (const [itemId, quantity] of Object.entries(source)) {
      if (Object.hasOwn(ITEM_DEFINITIONS, itemId) && typeof quantity === "number" && quantity > 0) {
        this.quantities.set(itemId as ItemId, quantity);
      }
    }
  }

  /** 「はじめから」用。メモリ上の所持品を初期所持品へ戻して保存する。 */
  reset(initial: Readonly<Partial<Record<ItemId, number>>> = {}): void {
    this.quantities.clear();
    for (const [itemId, quantity] of Object.entries(initial)) {
      if (Object.hasOwn(ITEM_DEFINITIONS, itemId) && typeof quantity === "number" && quantity > 0) {
        this.quantities.set(itemId as ItemId, quantity);
      }
    }
    this.repository?.saveInventory(Object.fromEntries(this.quantities));
  }

  getSlots(): readonly InventorySlot[] {
    return [...this.quantities.entries()]
      .filter(([itemId]) => itemId in ITEM_DEFINITIONS)
      .map(([itemId, quantity]) => ({ itemId, quantity }));
  }

  /** Adds a valid positive item reward and saves it through the shared GameState boundary. */
  add(itemId: ItemId, quantity = 1): boolean {
    if (!Object.hasOwn(ITEM_DEFINITIONS, itemId) || !Number.isFinite(quantity) || quantity <= 0) return false;
    const wholeQuantity = Math.floor(quantity);
    if (wholeQuantity <= 0) return false;
    this.quantities.set(itemId, (this.quantities.get(itemId) ?? 0) + wholeQuantity);
    this.repository?.saveInventory(Object.fromEntries(this.quantities));
    return true;
  }

  /** Consumes a battle/field item. Returns false (and leaves stock untouched) if not enough is held. */
  remove(itemId: ItemId, quantity = 1): boolean {
    const current = this.quantities.get(itemId) ?? 0;
    if (!Number.isFinite(quantity) || quantity <= 0 || current < quantity) return false;
    const remaining = current - Math.floor(quantity);
    if (remaining > 0) this.quantities.set(itemId, remaining); else this.quantities.delete(itemId);
    this.repository?.saveInventory(Object.fromEntries(this.quantities));
    return true;
  }
}

// DEV_PLACEHOLDER_ITEMS: 正式な入手手段が実装されるまでの、どうぐ画面QA用の初期所持品。
export const DEV_STARTING_ITEMS: Readonly<Partial<Record<ItemId, number>>> = {
  kaifukuyaku: 3,
  dokukeshi: 1,
};

const isBattleRuntimeTest = typeof window !== "undefined"
  && typeof import.meta.env !== "undefined"
  && import.meta.env.DEV
  && new URLSearchParams(window.location.search).has("battleTest");

/** Runtime singleton。partySystem(PartySystem.ts)と同じく、Sceneをまたいで共有する。 */
export const inventory = new Inventory(DEV_STARTING_ITEMS, isBattleRuntimeTest ? undefined : new GameStateRepository());
