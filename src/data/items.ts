/**
 * ITEM_EQUIPMENT_SPEC.md §1-4のデータ項目形・採用済み名称に合わせるアイテム定義。
 * 価格は同spec §10により未確定のため断定しない(null)。ITEM_EQUIPMENT_SPEC.md未採用のアイテムは追加しない。
 *
 * 2026-09-22の成長／バランス統合ユーザー確定仕様により、かいふくやくの回復量は
 * 「ドラクエのやくそう程度・HP25前後」として確定した(§6)。どくけしは毒治療として実装した。
 *
 * 2026-09-23: ITEM_EQUIPMENT_SPEC.md §3の最新17種一覧のうち、既存IDが無かった
 * ひやみず／かいがらのかぶと／いぬのふんをNAMING_CONVENTIONS.mdの命名規則(半角英数字snake_case、
 * の→_no_)で新規追加した。3種とも本編での採用状態・効果・分類は未確定(同spec §3参照)のため、
 * type="unclassified"で名称のみを正本化し、価格／効果／使用可否はnull/falseのまま断定しない。
 * きこりのオノ／まもりのナイフ／かいがらのぼうし／ふしぎなかぎ／いのちのかがみは
 * ITEM_EQUIPMENT_SPEC.md上は採用済みだが、今回のユーザー指示は「新規追加が必要な3項目だけ」に
 * ID追加を限定しているため、このデータマスタへは未追加のまま残す(TBD_REGISTRY.md参照)。
 * 武器・勇者装備7種(ぼくとう/こんぼう/てつのけん/こうてつのけん/ゆうしゃのけん/
 * ゆうしゃのかんむり/ゆうしゃのたて)は既存の`weapons.ts`が正本のため、ここには重複させない。
 */
export type ItemId = "kaifukuyaku" | "dokukeshi" | "hiyamizu" | "kaigara_no_kabuto" | "inu_no_fun";

export type ItemType = "consumable" | "unclassified";
export type ItemEffect = "heal" | "cure_poison";

export interface ItemDefinition {
  readonly id: ItemId;
  readonly name: string;
  readonly type: ItemType;
  readonly price: number | null;
  readonly sellPrice: number | null;
  readonly effect: ItemEffect | null;
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
    effect: "heal",
    power: 25, // ユーザー確定(§6): HP25前後。終盤も大幅インフレさせない。
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
    effect: "cure_poison",
    power: null,
    usableInBattle: true,
    usableOnField: true,
    description: "どくの　じょうたいを　なおす　くすり。",
  },
  // 2026-09-23新規追加。効果・分類はITEM_EQUIPMENT_SPEC.md §3により未確定のため断定しない。
  hiyamizu: {
    id: "hiyamizu",
    name: "ひやみず",
    type: "unclassified",
    price: null,
    sellPrice: null,
    effect: null,
    power: null,
    usableInBattle: false,
    usableOnField: false,
    description: "ひんやりとした　みず。つかいみちは　まだ　きまっていない。",
  },
  kaigara_no_kabuto: {
    id: "kaigara_no_kabuto",
    name: "かいがらのかぶと",
    type: "unclassified",
    price: null,
    sellPrice: null,
    effect: null,
    power: null,
    usableInBattle: false,
    usableOnField: false,
    description: "かいがらで　できた　かぶと。そうびできるかは　まだ　きまっていない。",
  },
  inu_no_fun: {
    id: "inu_no_fun",
    name: "いぬのふん",
    type: "unclassified",
    price: null,
    sellPrice: null,
    effect: null,
    power: null,
    usableInBattle: false,
    usableOnField: false,
    description: "いぬの　ふん。つかいみちは　まだ　きまっていない。",
  },
} as const;
