/**
 * DEV_PLACEHOLDER: フィールドメニュー「どうぐ」画面の動作確認用アイテム定義。
 * ITEM_EQUIPMENT_SPEC.md §1-4のデータ項目形・採用済み名称に合わせるが、価格・効果・威力は
 * 同spec §10により未確定のため断定しない(null)。ITEM_EQUIPMENT_SPEC.md未採用のアイテムは追加しない。
 */
export type ItemId = "kaifukuyaku" | "dokukeshi";

export type ItemType = "consumable";

export interface ItemDefinition {
  readonly id: ItemId;
  readonly name: string;
  readonly type: ItemType;
  readonly price: number | null;
  readonly sellPrice: number | null;
  readonly effect: string | null;
  readonly power: number | null;
  readonly usableInBattle: boolean;
  readonly usableOnField: boolean;
  readonly description: string;
}

export const ITEM_DEFINITIONS: Readonly<Record<ItemId, ItemDefinition>> = {
  kaifukuyaku: {
    id: "kaifukuyaku",
    name: "かいふくやく",
    type: "consumable",
    price: null,
    sellPrice: null,
    effect: null,
    power: null,
    usableInBattle: true,
    usableOnField: true,
    description: "つかうと　げんきに　なる　くすり。",
  },
  dokukeshi: {
    id: "dokukeshi",
    name: "どくけし",
    type: "consumable",
    price: null,
    sellPrice: null,
    effect: null,
    power: null,
    usableInBattle: true,
    usableOnField: true,
    description: "どくの　じょうたいを　なおす　くすり。",
  },
} as const;
