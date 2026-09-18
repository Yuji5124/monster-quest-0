/**
 * ジャンカードの固定定義。名前・画像は原資料の番号確定後にここだけを差し替える。
 * 取得状態はセーブ対象なので、この定義自体は実行中に変更しない。
 */
export interface JumpCardDefinition {
  readonly id: string;
  readonly number: number;
  readonly name: string;
  /** Public-facing name. Spoiler cards can keep their internal name separate. */
  readonly publicName: string;
  readonly imageKey: string | null;
  /** Runtime URL supplied by the asset manifest once a completed card image exists. */
  readonly imagePath: string | null;
  readonly isSpoiler: boolean;
}

export interface JumpCardRecord extends JumpCardDefinition {
  readonly obtained: boolean;
}

export const JUMP_CARD_TOTAL = 45;
export const JUMP_CARD_COST = 20;
export const JUMP_CARD_PAGE_SIZE = 9;
const UNCONFIGURED_CARD_NAME = "未設定";
const VERIFIED_SOURCE_CARD_IMAGE_PATHS = {
  purin: new URL("../../assets/monsters/source/cards/mq0_monster_card_012_a7a8416163.png", import.meta.url).href,
  tamagoGhost: new URL("../../assets/monsters/source/cards/mq0_monster_card_044_c265ac7dd0.jpeg", import.meta.url).href,
  daija: new URL("../../assets/monsters/source/cards/mq0_monster_card_076_4c90d7e8cd.jpeg", import.meta.url).href,
  obakeTsumuri: new URL("../../assets/monsters/source/cards/mq0_monster_card_006_7e4f4add89.jpeg", import.meta.url).href,
  erimakiHebi: new URL("../../assets/monsters/source/cards/mq0_monster_card_020_c26e18b928.jpeg", import.meta.url).href,
  kamaitachi: new URL("../../assets/monsters/source/cards/mq0_monster_card_063_df17a6bc38.jpeg", import.meta.url).href,
  devilBalloon: new URL("../../assets/monsters/source/cards/mq0_monster_card_050_92ba95dc90.jpeg", import.meta.url).href,
  kabutoman: new URL("../../assets/monsters/source/cards/mq0_monster_card_065_d00b8e711b.jpeg", import.meta.url).href,
  snowBomb: new URL("../../assets/monsters/source/cards/mq0_monster_card_030_e0a6225e55.jpeg", import.meta.url).href,
  koakuma: new URL("../../assets/monsters/source/cards/mq0_monster_card_001_c9d442a728.jpeg", import.meta.url).href,
  kirimaneki: new URL("../../assets/monsters/source/cards/mq0_monster_card_039_6f43c43df9.jpeg", import.meta.url).href,
  fancyDuck: new URL("../../assets/monsters/source/cards/mq0_monster_card_071_5b70506c06.jpeg", import.meta.url).href,
  sawagiToriuo: new URL("../../assets/monsters/source/cards/mq0_monster_card_051_a32fa66c1c.jpeg", import.meta.url).href,
  metalPurin: new URL("../../assets/monsters/source/cards/mq0_monster_card_036_426eb472e4.jpeg", import.meta.url).href,
  metalPurinKing: new URL("../../assets/monsters/source/cards/mq0_monster_card_117_69ff5c2137.png", import.meta.url).href,
  yakiPurin: new URL("../../assets/monsters/source/cards/mq0_monster_card_010_28a8a1a26e.jpeg", import.meta.url).href,
  purinJiisan: new URL("../../assets/monsters/source/cards/mq0_monster_card_038_46219916c1.jpeg", import.meta.url).href,
  kinokoJijii: new URL("../../assets/monsters/source/cards/mq0_monster_card_033_9950ef59b5.jpeg", import.meta.url).href,
  darabocchi: new URL("../../assets/monsters/source/cards/mq0_monster_card_040_d0ef93338e.jpeg", import.meta.url).href,
  bakular: new URL("../../assets/monsters/source/cards/mq0_monster_card_002_09296255f3.jpeg", import.meta.url).href,
  majin: new URL("../../assets/monsters/source/cards/mq0_monster_card_055_765fefd06a.jpeg", import.meta.url).href,
  batras: new URL("../../assets/monsters/source/cards/mq0_monster_card_022_60ae3292c1.jpeg", import.meta.url).href,
  demas: new URL("../../assets/monsters/source/cards/mq0_monster_card_023_4e242eb988.jpeg", import.meta.url).href,
  purinKing: new URL("../../assets/monsters/source/cards/mq0_monster_card_066_3c80e81b83.jpeg", import.meta.url).href,
  heat: new URL("../../assets/cards/source/items_skills_cards/mq0_skill_card_023_aeacf7fc72.png", import.meta.url).href,
  iceoon: new URL("../../assets/cards/source/items_skills_cards/mq0_skill_card_049_03bc0d0a0d.png", import.meta.url).href,
  elekitel: new URL("../../assets/cards/source/items_skills_cards/mq0_skill_card_009_bdb6f67e2c.png", import.meta.url).href,
  daidain: new URL("../../assets/cards/source/items_skills_cards/mq0_skill_card_025_1a7feb0ef7.png", import.meta.url).href,
  aisis: new URL("../../assets/cards/source/items_skills_cards/mq0_skill_card_003_b7da75751a.jpeg", import.meta.url).href,
  relifeRifle: new URL("../../assets/cards/source/items_skills_cards/mq0_skill_card_033_e6707051ce.jpeg", import.meta.url).href,
  lifeMirror: new URL("../../assets/cards/source/items_skills_cards/mq0_skill_card_042_0020a50500.png", import.meta.url).href,
  cursedFlame: new URL("../../assets/cards/source/items_skills_cards/mq0_skill_card_054_9e2b2cfc6c.png", import.meta.url).href,
  dogPoop: new URL("../../assets/cards/source/items_skills_cards/mq0_skill_card_051_22b8f49985.png", import.meta.url).href,
  daiHit: new URL("../../assets/cards/source/items_skills_cards/mq0_skill_card_043_019bfe82f7.png", import.meta.url).href,
  coldWater: new URL("../../assets/cards/source/items_skills_cards/mq0_skill_card_044_39f4e072b8.png", import.meta.url).href,
  blowAway: new URL("../../assets/cards/source/items_skills_cards/mq0_skill_card_045_b3a1eba882.png", import.meta.url).href,
  transform: new URL("../../assets/cards/source/items_skills_cards/mq0_skill_card_046_c83956a3e2.png", import.meta.url).href,
  selfDestruct: new URL("../../assets/cards/source/items_skills_cards/mq0_skill_card_048_119b12b105.png", import.meta.url).href,
  glare: new URL("../../assets/cards/source/items_skills_cards/mq0_skill_card_034_7f925d816f.png", import.meta.url).href,
  sacrifice: new URL("../../assets/cards/source/items_skills_cards/mq0_skill_card_015_3735df9d53.png", import.meta.url).href,
  yamataNoOrochi: new URL("../../assets/monsters/source/cards/mq0_monster_card_122_c3c58ad002.png", import.meta.url).href,
  destarossa: new URL("../../assets/monsters/source/cards/mq0_monster_card_115_4fb47deb92.png", import.meta.url).href,
  orochiMaou: new URL("../../assets/monsters/source/cards/mq0_monster_card_084_86fff94571.png", import.meta.url).href,
  orochiZombie: new URL("../../assets/monsters/source/cards/mq0_monster_card_107_3c94b88861.png", import.meta.url).href,
} as const;

/**
 * 番号・名称は正式45枚表を正本とし、画像ファイル側の整理番号とは混同しない。
 * 画像は本文のカード名と一致する場合だけ設定する。
 */
const VERIFIED_JUMP_CARD_DATA: Readonly<Partial<Record<number, Omit<JumpCardDefinition, "id" | "number">>>> = {
  1: { name: "プリン", publicName: "プリン", imageKey: "card.001.purin", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.purin, isSpoiler: false },
  2: {
    name: "たまゴースト",
    publicName: "たまゴースト",
    imageKey: "card.002.tamago_ghost",
    imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.tamagoGhost,
    isSpoiler: false,
  },
  3: { name: "ダイジャ", publicName: "ダイジャ", imageKey: "card.003.daija", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.daija, isSpoiler: false },
  4: { name: "おばけつむり", publicName: "おばけつむり", imageKey: "card.004.obaketsumuri", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.obakeTsumuri, isSpoiler: false },
  5: { name: "エリマキヘビ", publicName: "エリマキヘビ", imageKey: "card.005.erimaki_hebi", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.erimakiHebi, isSpoiler: false },
  6: { name: "カマイタチ", publicName: "カマイタチ", imageKey: "card.006.kamaitachi", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.kamaitachi, isSpoiler: false },
  7: { name: "デビルバルーン", publicName: "デビルバルーン", imageKey: "card.007.devil_balloon", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.devilBalloon, isSpoiler: false },
  8: { name: "カブトマン", publicName: "カブトマン", imageKey: "card.008.kabutoman", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.kabutoman, isSpoiler: false },
  9: { name: "スノーボム", publicName: "スノーボム", imageKey: "card.009.snow_bomb", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.snowBomb, isSpoiler: false },
  10: { name: "こあくま", publicName: "こあくま", imageKey: "card.010.koakuma", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.koakuma, isSpoiler: false },
  11: { name: "きりまねき", publicName: "きりまねき", imageKey: "card.011.kirimaneki", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.kirimaneki, isSpoiler: false },
  12: { name: "ファンシーダック", publicName: "ファンシーダック", imageKey: "card.012.fancy_duck", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.fancyDuck, isSpoiler: false },
  13: { name: "さわぎとりうお", publicName: "さわぎとりうお", imageKey: "card.013.sawagi_toriuo", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.sawagiToriuo, isSpoiler: false },
  14: { name: "メタルプリン", publicName: "メタルプリン", imageKey: "card.014.metal_purin", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.metalPurin, isSpoiler: false },
  15: { name: "メタルプリンキング", publicName: "メタルプリンキング", imageKey: "card.015.metal_purin_king", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.metalPurinKing, isSpoiler: false },
  16: { name: "やきプリン", publicName: "やきプリン", imageKey: "card.016.yaki_purin", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.yakiPurin, isSpoiler: false },
  17: { name: "プリンじいさん", publicName: "プリンじいさん", imageKey: "card.017.purin_jii_san", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.purinJiisan, isSpoiler: false },
  18: { name: "きのこじじい", publicName: "きのこじじい", imageKey: "card.018.kinoko_jijii", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.kinokoJijii, isSpoiler: false },
  19: { name: "ダラボッチ", publicName: "ダラボッチ", imageKey: "card.019.darabocchi", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.darabocchi, isSpoiler: false },
  20: { name: "バクラー", publicName: "バクラー", imageKey: "card.020.bakular", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.bakular, isSpoiler: false },
  21: { name: "まじん", publicName: "まじん", imageKey: "card.021.majin", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.majin, isSpoiler: false },
  22: { name: "バトラス", publicName: "バトラス", imageKey: "card.022.batras", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.batras, isSpoiler: false },
  23: { name: "デーマス", publicName: "デーマス", imageKey: "card.023.demas", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.demas, isSpoiler: false },
  24: { name: "プリンキング", publicName: "プリンキング", imageKey: "card.024.purin_king", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.purinKing, isSpoiler: false },
  25: { name: "ヒート", publicName: "ヒート", imageKey: "card.025.heat", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.heat, isSpoiler: false },
  26: { name: "アイスーン", publicName: "アイスーン", imageKey: "card.026.iceoon", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.iceoon, isSpoiler: false },
  27: { name: "エレキテル", publicName: "エレキテル", imageKey: "card.027.elekitel", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.elekitel, isSpoiler: false },
  28: { name: "ダイダイン", publicName: "ダイダイン", imageKey: "card.028.daidain", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.daidain, isSpoiler: false },
  29: { name: "アイシス", publicName: "アイシス", imageKey: "card.029.aisis", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.aisis, isSpoiler: false },
  30: { name: "リライフル", publicName: "リライフル", imageKey: "card.030.relife_rifle", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.relifeRifle, isSpoiler: false },
  31: { name: "ひやみず", publicName: "ひやみず", imageKey: "card.031.cold_water", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.coldWater, isSpoiler: false },
  32: { name: "いのちのかがみ", publicName: "いのちのかがみ", imageKey: "card.032.life_mirror", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.lifeMirror, isSpoiler: false },
  33: { name: "のろいのほのお", publicName: "のろいのほのお", imageKey: "card.033.cursed_flame", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.cursedFlame, isSpoiler: false },
  34: { name: "いぬのふん", publicName: "いぬのふん", imageKey: "card.034.dog_poop", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.dogPoop, isSpoiler: false },
  35: { name: "だいヒット", publicName: "だいヒット", imageKey: "card.035.dai_hit", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.daiHit, isSpoiler: false },
  36: { name: "ぶっとばし", publicName: "ぶっとばし", imageKey: "card.036.blow_away", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.blowAway, isSpoiler: false },
  37: { name: "へんしん", publicName: "へんしん", imageKey: "card.037.transform", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.transform, isSpoiler: false },
  38: { name: "じばく", publicName: "じばく", imageKey: "card.038.self_destruct", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.selfDestruct, isSpoiler: false },
  39: { name: "にらみ", publicName: "にらみ", imageKey: "card.039.glare", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.glare, isSpoiler: false },
  40: { name: "いけにえ", publicName: "いけにえ", imageKey: "card.040.sacrifice", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.sacrifice, isSpoiler: false },
  41: { name: "ゆうしゃたち", publicName: "ゆうしゃたち", imageKey: null, imagePath: null, isSpoiler: false },
  42: { name: "ヤマタノオロチ", publicName: "ヤマタノオロチ", imageKey: "card.042.yamata_no_orochi", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.yamataNoOrochi, isSpoiler: false },
  43: { name: "デスタロッサ", publicName: "デスタロッサ", imageKey: "card.043.destarossa", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.destarossa, isSpoiler: false },
  44: { name: "オロチまおう", publicName: "オロチまおう", imageKey: "card.044.orochi_maou", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.orochiMaou, isSpoiler: false },
  45: { name: "オロチゾンビ", publicName: "？？？", imageKey: "card.045.orochi_zombie", imagePath: VERIFIED_SOURCE_CARD_IMAGE_PATHS.orochiZombie, isSpoiler: true },
};

export const JUMP_CARD_DEFINITIONS: readonly JumpCardDefinition[] = Array.from(
  { length: JUMP_CARD_TOTAL },
  (_, index) => {
    const number = index + 1;
    const verified = VERIFIED_JUMP_CARD_DATA[number];
    return {
      id: `card_${String(number).padStart(2, "0")}`,
      number,
      // 正式45枚表にない番号は設定しない。
      name: UNCONFIGURED_CARD_NAME,
      publicName: UNCONFIGURED_CARD_NAME,
      // 画像未確認カードは画像をロードしない。
      imageKey: null,
      imagePath: null,
      isSpoiler: false,
      ...verified,
    };
  },
);

export interface JumpCardImageLoader {
  image(key: string, url: string): unknown;
}

/**
 * 画像はカード定義に集約し、Scene側へパスを散在させない。
 * imageKey/imagePathを設定したカードだけを安全に読む。
 */
export function preloadJumpCardImages(loader: JumpCardImageLoader): void {
  for (const card of JUMP_CARD_DEFINITIONS) {
    if (card.imageKey && card.imagePath) loader.image(card.imageKey, card.imagePath);
  }
}

export function getJumpCardDisplayName(card: Pick<JumpCardDefinition, "publicName" | "isSpoiler">): string {
  return card.isSpoiler ? "？？？" : card.publicName;
}

export function getJumpCardRecords(obtainedIds: readonly string[]): readonly JumpCardRecord[] {
  const obtained = new Set(obtainedIds);
  return JUMP_CARD_DEFINITIONS.map((card) => ({ ...card, obtained: obtained.has(card.id) }));
}

/** 図鑑一覧は常に番号順の定義から作る。取得状態だけを合成し、保存状態は変更しない。 */
export function getJumpCardPage(records: readonly JumpCardRecord[], pageIndex: number): readonly JumpCardRecord[] {
  const start = pageIndex * JUMP_CARD_PAGE_SIZE;
  return records.slice(start, start + JUMP_CARD_PAGE_SIZE);
}

export function getNextJumpCard(obtainedIds: readonly string[]): JumpCardDefinition | undefined {
  const obtained = new Set(obtainedIds);
  return JUMP_CARD_DEFINITIONS.find((card) => !obtained.has(card.id));
}
