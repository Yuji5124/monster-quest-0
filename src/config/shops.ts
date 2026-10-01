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
  // No.04ビーエのむら(2026-09-27ユーザー指示「村人を再度見直し、宿屋・武器屋・道具屋等の役割を追加」)。
  // 山あいの小さな村のため専用の店番は増やさず、既存の固定村人3人がそれぞれの生業と兼業する形にした
  // (水車小屋の主=刃物の手入れもする村いちばんの鍛冶仕事、北東の家の農家=広い家で旅人へ部屋を貸す、
  // 店先の日よけの人=干した薬草を旅人へも分ける)。品揃え・価格はNo.02と同じTEMP_TEST_VALUEをそのまま
  // 再利用し、地域ごとの経済差はTBD(TBD_REGISTRY.md)。
  npc_bie_village_miller: {
    kind: "weapon",
    stock: [
      { memberId: "hero", weaponId: "hero_konbo", price: 50 },
      { memberId: "hero", weaponId: "hero_tetsu_no_ken", price: 300 },
    ],
  },
  npc_bie_village_farmer: { kind: "inn", price: 8 },
  npc_bie_village_herb_drier: {
    kind: "item",
    stock: [
      { itemId: "kaifukuyaku", price: 8 },
      { itemId: "dokukeshi", price: 10 },
    ],
  },
  // No.10かくれざと(2026-09-27ユーザー指示「宿屋・武器屋・道具屋を強化」)。ビーエのむらと同じく専用の
  // 店番は増やさず、固定住民3人が生業と兼業する(水車小屋の主=こむぎひきのかたわら刃物の手入れをするので
  // ぶきや、まんなかの家の人=あまった部屋を旅人に貸すのでやどや、西の家の人=やまの薬草を分けるのでどうぐや)。
  // 品揃え・価格はNo.02・ビーエのむらと同じTEMP_TEST_VALUEを再利用し、地域ごとの経済差はTBD(TBD_REGISTRY.md)。
  npc_hidden_village_watermill_keeper: {
    kind: "weapon",
    stock: [
      { memberId: "hero", weaponId: "hero_konbo", price: 50 },
      { memberId: "hero", weaponId: "hero_tetsu_no_ken", price: 300 },
    ],
  },
  npc_hidden_village_central_householder: { kind: "inn", price: 8 },
  npc_hidden_village_west_householder: {
    kind: "item",
    stock: [
      { itemId: "kaifukuyaku", price: 8 },
      { itemId: "dokukeshi", price: 10 },
    ],
  },
  // No.12港町ダコハ(2026-09-29ユーザー指示「村人を追加、他の村と同じように宿屋・武器屋を追加」)。
  // ユーザー指示は宿屋・武器屋の2つだけのため、道具屋は今回追加しない。やどやの主人・ぶきやの店主は
  // 専用の店番として配置した固定村人(config/maps.ts、role: "shopkeeper")。品揃え・価格は他の町と同じ
  // TEMP_TEST_VALUEを再利用し、地域ごとの経済差はTBD(TBD_REGISTRY.md)。
  npc_dakoha_port_innkeeper: { kind: "inn", price: 8 },
  npc_dakoha_port_armory_keeper: {
    kind: "weapon",
    stock: [
      { memberId: "hero", weaponId: "hero_konbo", price: 50 },
      { memberId: "hero", weaponId: "hero_tetsu_no_ken", price: 300 },
    ],
  },
  // No.08ザボンのむら(2026-10-01ユーザー指定)。新しい店専用NPCは増やさず、既存の固定住民が
  // 大きな集会所=やどや、かやぶきの家=ぶきや、東の日よけ家=どうぐやを兼業する。
  // 品揃え・価格は他の初期村と同じTEMP_TEST_VALUE。
  npc_zabon_village_elder: { kind: "inn", price: 8 },
  npc_zabon_village_roof_mender: {
    kind: "weapon",
    stock: [
      { memberId: "hero", weaponId: "hero_konbo", price: 50 },
      { memberId: "hero", weaponId: "hero_tetsu_no_ken", price: 300 },
    ],
  },
  npc_zabon_village_tanner: {
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
