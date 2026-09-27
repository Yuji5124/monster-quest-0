import type { ItemId } from "../data/items.ts";
import type { PartyMemberId } from "../systems/PartySystem.ts";

/**
 * No.02はじまりのまちの店・やどや(2026-09-25ユーザー指示「宿屋はお金を出すと休めて回復、
 * 武器屋は武器を売っている、アイテム屋はアイテムを置いている」)。
 *
 * 価格はITEM_EQUIPMENT_SPEC.md §8・TBD_REGISTRY.mdで未確定のため、ここの値はすべて
 * TEMP_TEST_VALUE(序盤の敵のG 3〜10前後から逆算した仮価格)。正式値が決まったらここだけを書き換える。
 * 商品は正式採用済みの名称だけを並べる(タロサの弓・ミレイの杖は正式名称未確定のため売らない)。
 */
export interface InnDefinition {
  readonly kind: "inn";
  /** ひとばんの料金(パーティ全員分)。 */
  readonly price: number;
}

export interface WeaponShopDefinition {
  readonly kind: "weapon";
  readonly stock: readonly { readonly memberId: PartyMemberId; readonly weaponId: string; readonly price: number }[];
}

export interface ItemShopDefinition {
  readonly kind: "item";
  readonly stock: readonly { readonly itemId: ItemId; readonly price: number }[];
}

export type ShopDefinition = InnDefinition | WeaponShopDefinition | ItemShopDefinition;

/** NPC ID → 店。会話(はなす)は同じNPCのdialogueIdをそのまま使う。 */
export const SHOPS: Readonly<Record<string, ShopDefinition>> = {
  npc_start_town_inn_shopkeeper: { kind: "inn", price: 8 },
  npc_start_town_weapon_shopkeeper: {
    kind: "weapon",
    stock: [
      { memberId: "hero", weaponId: "hero_konbo", price: 50 },
      { memberId: "hero", weaponId: "hero_tetsu_no_ken", price: 300 },
    ],
  },
  npc_start_town_item_shopkeeper: {
    kind: "item",
    stock: [
      { itemId: "kaifukuyaku", price: 8 },
      { itemId: "dokukeshi", price: 10 },
    ],
  },
};

export function getShop(npcId: string): ShopDefinition | undefined {
  return Object.hasOwn(SHOPS, npcId) ? SHOPS[npcId] : undefined;
}
