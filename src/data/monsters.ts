import type { DevBattleMonsterId } from "../config/battle.ts";
import { DEV_BOSS_TEST_PLAYER } from "../config/battle.ts";
import type { BattleCombatantDefinition } from "../battle/BattleSystem.ts";
import { DEV_DAIDAIN, DEV_MIRROR, NORMAL_ATTACK } from "./battleActions.ts";
import type { BattleAction } from "./battleActions.ts";

/**
 * モンスター25体のHP/攻撃/防御/素早さ/EXP/ゴールドの正本(2026-09-23ユーザー確定)。
 * `docs/MONSTER_SPEC.md`の一覧表と一致させる。MQ0全体で唯一のこの表から
 * `DEV_BATTLE_MONSTERS`・`src/data/bosses.ts`の戦闘用データを組み立てる。
 *
 * 意図的に含まない項目(TBDのままdocs側で管理する): MP、スキル、出現地域、命中/回避、
 * 状態異常成功率、最終ドロップ品、属性弱点倍率(BattleSystemに弱点システム自体が
 * まだ存在しないため、MONSTER_SPEC.md側の参考表としてのみ管理する)。
 *
 * 例外: No.07まじんのどうくつ(`src/data/majinCaveEnemies.ts`)は、defense概念を持たない
 * 独立したターン制Dungeon RPGの再生ギミック(BATTLE_SPEC.md §9.1)専用に、既存仕様として
 * 別の(この表より低い)HP/攻撃を維持する。意図的な非統合であり重複ではない。
 */
export interface MonsterRosterEntry {
  /** MONSTER_SPEC.mdの表番号 "01"〜"25"。 */
  readonly rosterId: string;
  /** コード内で使う安定した識別子(ローマ字)。 */
  readonly id: string;
  readonly name: string;
  /** 公開表示名。オロチゾンビのみネタバレのため"？？？"。 */
  readonly publicName: string;
  readonly hp: number;
  readonly attack: number;
  readonly defense: number;
  readonly speed: number;
  readonly exp: number;
  readonly gold: number;
  readonly isBoss: boolean;
  readonly spoiler: boolean;
}

export const MONSTER_ROSTER: readonly MonsterRosterEntry[] = [
  { rosterId: "01", id: "purin", name: "プリン", publicName: "プリン", hp: 18, attack: 8, defense: 2, speed: 4, exp: 8, gold: 3, isBoss: false, spoiler: false },
  { rosterId: "02", id: "tamago_ghost", name: "たまゴースト", publicName: "たまゴースト", hp: 24, attack: 10, defense: 3, speed: 9, exp: 10, gold: 4, isBoss: false, spoiler: false },
  { rosterId: "03", id: "obake_tsumuri", name: "おばけつむり", publicName: "おばけつむり", hp: 38, attack: 14, defense: 12, speed: 4, exp: 16, gold: 8, isBoss: false, spoiler: false },
  { rosterId: "04", id: "fancy_duck", name: "ファンシーダック", publicName: "ファンシーダック", hp: 42, attack: 15, defense: 7, speed: 14, exp: 18, gold: 10, isBoss: false, spoiler: false },
  { rosterId: "05", id: "snow_bomb", name: "スノーボム", publicName: "スノーボム", hp: 46, attack: 17, defense: 6, speed: 10, exp: 20, gold: 11, isBoss: false, spoiler: false },
  { rosterId: "06", id: "koakuma", name: "こあくま", publicName: "こあくま", hp: 58, attack: 20, defense: 9, speed: 18, exp: 26, gold: 14, isBoss: false, spoiler: false },
  { rosterId: "07", id: "erimaki_hebi", name: "エリマキヘビ", publicName: "エリマキヘビ", hp: 66, attack: 22, defense: 10, speed: 22, exp: 30, gold: 15, isBoss: false, spoiler: false },
  { rosterId: "08", id: "daija", name: "ダイジャ", publicName: "ダイジャ", hp: 82, attack: 26, defense: 15, speed: 19, exp: 38, gold: 18, isBoss: false, spoiler: false },
  { rosterId: "09", id: "majin", name: "まじん", publicName: "まじん", hp: 520, attack: 34, defense: 28, speed: 15, exp: 250, gold: 100, isBoss: true, spoiler: false },
  { rosterId: "10", id: "yaki_purin", name: "やきプリン", publicName: "やきプリン", hp: 78, attack: 24, defense: 9, speed: 16, exp: 48, gold: 22, isBoss: false, spoiler: false },
  { rosterId: "11", id: "kamaitachi", name: "カマイタチ", publicName: "カマイタチ", hp: 88, attack: 26, defense: 13, speed: 32, exp: 54, gold: 25, isBoss: false, spoiler: false },
  { rosterId: "12", id: "kirimaneki", name: "きりまねき", publicName: "きりまねき", hp: 102, attack: 29, defense: 18, speed: 26, exp: 62, gold: 29, isBoss: false, spoiler: false },
  { rosterId: "13", id: "kabutoman", name: "カブトマン", publicName: "カブトマン", hp: 120, attack: 31, defense: 30, speed: 18, exp: 70, gold: 34, isBoss: false, spoiler: false },
  { rosterId: "14", id: "devil_balloon", name: "デビルバルーン", publicName: "デビルバルーン", hp: 108, attack: 34, defense: 15, speed: 34, exp: 78, gold: 38, isBoss: false, spoiler: false },
  { rosterId: "15", id: "purin_king", name: "プリンキング", publicName: "プリンキング", hp: 165, attack: 38, defense: 26, speed: 21, exp: 100, gold: 48, isBoss: false, spoiler: false },
  { rosterId: "16", id: "bakuraa", name: "バクラー", publicName: "バクラー", hp: 820, attack: 48, defense: 36, speed: 22, exp: 420, gold: 250, isBoss: true, spoiler: false },
  { rosterId: "17", id: "sawagi_toriuo", name: "さわぎとりうお", publicName: "さわぎとりうお", hp: 125, attack: 35, defense: 18, speed: 40, exp: 80, gold: 55, isBoss: false, spoiler: false },
  { rosterId: "18", id: "purin_jiisan", name: "プリンじいさん", publicName: "プリンじいさん", hp: 185, attack: 50, defense: 32, speed: 29, exp: 125, gold: 65, isBoss: false, spoiler: false },
  { rosterId: "19", id: "kinoko_jijii", name: "きのこじじい", publicName: "きのこじじい", hp: 200, attack: 52, defense: 36, speed: 20, exp: 135, gold: 70, isBoss: false, spoiler: false },
  { rosterId: "20", id: "demas", name: "デーマス", publicName: "デーマス", hp: 1100, attack: 54, defense: 46, speed: 38, exp: 650, gold: 400, isBoss: true, spoiler: false },
  { rosterId: "21", id: "darabocchi", name: "ダラボッチ", publicName: "ダラボッチ", hp: 340, attack: 69, defense: 54, speed: 25, exp: 230, gold: 110, isBoss: false, spoiler: false },
  { rosterId: "22", id: "batorasu", name: "バトラス", publicName: "バトラス", hp: 2200, attack: 74, defense: 78, speed: 34, exp: 1100, gold: 650, isBoss: true, spoiler: false },
  { rosterId: "23", id: "metal_purin_king", name: "メタルプリンキング", publicName: "メタルプリンキング", hp: 180, attack: 78, defense: 180, speed: 72, exp: 1500, gold: 1000, isBoss: false, spoiler: false },
  { rosterId: "24", id: "orochi_maou", name: "オロチまおう", publicName: "オロチまおう", hp: 3200, attack: 118, defense: 104, speed: 46, exp: 3000, gold: 0, isBoss: true, spoiler: false },
  { rosterId: "25", id: "orochi_zombie", name: "オロチゾンビ", publicName: "？？？", hp: 4200, attack: 132, defense: 112, speed: 55, exp: 0, gold: 0, isBoss: true, spoiler: true },
] as const;

export const MONSTER_ROSTER_BY_ID: Readonly<Record<string, MonsterRosterEntry>> =
  Object.fromEntries(MONSTER_ROSTER.map((monster) => [monster.id, monster]));

/** Looks up a roster entry by its stable code id (e.g. "purin", "orochi_maou"). */
export function getMonsterRosterEntry(id: string): MonsterRosterEntry | undefined {
  return MONSTER_ROSTER_BY_ID[id];
}

export interface DevBattleMonsterDefinition {
  readonly id: DevBattleMonsterId;
  /** User-confirmed display name. Stats remain DEV_BATTLE_BALANCE until the formal monster data pass. */
  readonly displayName: string;
  readonly portraitUrl: string;
  readonly portraitFormat: "png" | "jpeg";
  /** DEV_BATTLE_BALANCE only; never a final MQ0 value. */
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
  readonly speed?: number;
  readonly maxMp?: number;
  readonly isBoss?: boolean;
  readonly enemyActions?: readonly BattleAction[];
  readonly reward?: BattleCombatantDefinition["reward"];
  readonly display?: { readonly scale: number; readonly offsetY: number };
  readonly background?: { readonly key: string; readonly url: string };
  readonly devPlayer?: BattleCombatantDefinition;
}

/** レインランドのもりの通常敵。表示・背景はビーエのもりの通常敵と同じ扱い(森の戦闘背景・0.7倍表示)。 */
function rainlandForestMonster(id: "obake_tsumuri" | "fancy_duck" | "snow_bomb", portraitUrl: string): DevBattleMonsterDefinition {
  const roster = MONSTER_ROSTER_BY_ID[id];
  return {
    id,
    displayName: roster.name,
    portraitUrl,
    portraitFormat: "png",
    maxHp: roster.hp,
    attack: roster.attack,
    defense: roster.defense,
    speed: roster.speed,
    reward: { experience: roster.exp, money: roster.gold },
    display: { scale: 0.7, offsetY: 0 },
    background: {
      key: "battle.bg.starting_forest",
      url: new URL("../../assets/battle/backgrounds/reference/mq0_battle_bg_013_5ecb71635c.png", import.meta.url).href,
    },
  };
}

/** No.09いわやまのどうくつの通常敵。洞窟の戦闘背景(mq0_battle_bg_009)・0.7倍表示。 */
function iwayamaCaveMonster(id: "koakuma" | "erimaki_hebi" | "daija", portraitUrl: string): DevBattleMonsterDefinition {
  const roster = MONSTER_ROSTER_BY_ID[id];
  return {
    id,
    displayName: roster.name,
    portraitUrl,
    portraitFormat: "png",
    maxHp: roster.hp,
    attack: roster.attack,
    defense: roster.defense,
    speed: roster.speed,
    reward: { experience: roster.exp, money: roster.gold },
    display: { scale: 0.7, offsetY: 0 },
    background: {
      key: "battle.bg.iwayama_cave",
      url: new URL("../../assets/battle/backgrounds/reference/mq0_battle_bg_009_9264defc52.png", import.meta.url).href,
    },
  };
}

// Direct Vite URLs retain the source files and avoid an unnecessary runtime copy.
export const DEV_BATTLE_MONSTERS: Record<DevBattleMonsterId, DevBattleMonsterDefinition> = {
  // No.03ビーエのもり（内部starting_forest）の通常敵。HP/攻撃/防御/素早さ/EXP/ゴールドはMONSTER_ROSTERの正本を参照する。
  "001": {
    id: "001",
    displayName: MONSTER_ROSTER_BY_ID.tamago_ghost.name,
    portraitUrl: new URL("../../assets/monsters/source/portraits/mq0_monster_001_0d78a307c8.png", import.meta.url).href,
    portraitFormat: "png",
    maxHp: MONSTER_ROSTER_BY_ID.tamago_ghost.hp,
    attack: MONSTER_ROSTER_BY_ID.tamago_ghost.attack,
    defense: MONSTER_ROSTER_BY_ID.tamago_ghost.defense,
    speed: MONSTER_ROSTER_BY_ID.tamago_ghost.speed,
    // 固有ドロップ(かいふくやく)の確率自体は未確定のためTEMP_TEST_VALUEを維持。EXP/ゴールドのみ確定値。
    reward: {
      experience: MONSTER_ROSTER_BY_ID.tamago_ghost.exp,
      money: MONSTER_ROSTER_BY_ID.tamago_ghost.gold,
      drops: [{ itemId: "kaifukuyaku", chance: 0.15 }], // TEMP_TEST_VALUE
    },
    display: { scale: 0.7, offsetY: 0 },
    background: {
      key: "battle.bg.starting_forest",
      url: new URL("../../assets/battle/backgrounds/reference/mq0_battle_bg_013_5ecb71635c.png", import.meta.url).href,
    },
  },
  "003": {
    id: "003",
    displayName: MONSTER_ROSTER_BY_ID.purin.name,
    portraitUrl: new URL("../../assets/monsters/source/portraits/mq0_monster_003_1e2e150bba.png", import.meta.url).href,
    portraitFormat: "png",
    maxHp: MONSTER_ROSTER_BY_ID.purin.hp,
    attack: MONSTER_ROSTER_BY_ID.purin.attack,
    defense: MONSTER_ROSTER_BY_ID.purin.defense,
    speed: MONSTER_ROSTER_BY_ID.purin.speed,
    // 固有ドロップ(どくけし)の確率自体は未確定のためTEMP_TEST_VALUEを維持。EXP/ゴールドのみ確定値。
    reward: {
      experience: MONSTER_ROSTER_BY_ID.purin.exp,
      money: MONSTER_ROSTER_BY_ID.purin.gold,
      drops: [{ itemId: "dokukeshi", chance: 0.1 }], // TEMP_TEST_VALUE
    },
    display: { scale: 0.7, offsetY: 0 },
    background: {
      key: "battle.bg.starting_forest",
      url: new URL("../../assets/battle/backgrounds/reference/mq0_battle_bg_013_5ecb71635c.png", import.meta.url).href,
    },
  },
  // No.05レインランドのもりの通常敵(2026-09-23ユーザー指示。ビーエのもりと同じランダムエンカウント戦闘)。
  // HP/攻撃/防御/素早さ/EXP/ゴールドはMONSTER_ROSTERの正本。固有ドロップは未確定のため設定しない
  // (MONSTER_SPEC.md §1.1: AIが新規の固有ドロップを推測で設定しない)。
  obake_tsumuri: rainlandForestMonster(
    "obake_tsumuri",
    // 単体画像が存在しないため、名前入りカードmq0_monster_card_006の絵部分を透過切り抜きした派生画像。
    new URL("../../assets/monsters/battle/monster_03_obake_tsumuri.png", import.meta.url).href,
  ),
  fancy_duck: rainlandForestMonster(
    "fancy_duck",
    // 名前入りカードmq0_monster_card_047/071/112と外見を照合した透過単体画像。
    new URL("../../assets/monsters/source/portraits/mq0_monster_027_74e342f3ed.png", import.meta.url).href,
  ),
  snow_bomb: rainlandForestMonster(
    "snow_bomb",
    // 名前入りカードmq0_monster_card_008/030/123と外見を照合した透過単体画像。
    new URL("../../assets/monsters/source/portraits/mq0_monster_028_72713e1026.png", import.meta.url).href,
  ),
  // No.09いわやまのどうくつの通常敵(2026-09-23ユーザー指示「ランダム戦闘」)。能力値・EXP・ゴールドはMONSTER_ROSTERの正本。
  // 画像は名前入りカード(こあくま=card_001、エリマキヘビ=card_020、ダイジャ=card_076)と外見を照合した透過単体画像。
  // 固有ドロップは未確定のため設定しない(MONSTER_SPEC.md §1.1)。
  koakuma: iwayamaCaveMonster(
    "koakuma",
    new URL("../../assets/monsters/source/portraits/mq0_monster_046_4ef802b3f2.png", import.meta.url).href,
  ),
  erimaki_hebi: iwayamaCaveMonster(
    "erimaki_hebi",
    new URL("../../assets/monsters/source/portraits/mq0_monster_012_6e2fb0c1ac.png", import.meta.url).href,
  ),
  daija: iwayamaCaveMonster(
    "daija",
    new URL("../../assets/monsters/source/portraits/mq0_monster_011_1e59d48bf6.png", import.meta.url).href,
  ),
  "006": {
    id: "006",
    displayName: "MONSTER 006",
    portraitUrl: new URL("../../assets/monsters/source/portraits/mq0_monster_006_7c8f45a8e1.jpeg", import.meta.url).href,
    portraitFormat: "jpeg",
    maxHp: 24,
    attack: 6,
    defense: 3,
    reward: { experience: 5, money: 4 }, // TEMP_TEST_VALUE
  },
  demas: {
    id: "demas",
    displayName: "デーマス",
    // Verified against named card_125 / promo_019; use the standalone transparent portrait.
    portraitUrl: new URL("../../assets/monsters/source/portraits/mq0_monster_030_54c4041dec.png", import.meta.url).href,
    portraitFormat: "png",
    isBoss: true,
    // TEMP_TEST_VALUE / DEV_BATTLE_BALANCE, not the source card's 1000/500/300.
    // 2026-09-23確定のMONSTER_ROSTER正本(HP1100/攻撃54/防御46/素早さ38)とはまだ異なる。
    // このHP/MP/攻撃/防御は、下のdevPlayer(CHARACTER_GROWTH.md指定でTEMP_TEST_VALUEのまま
    // 変更しない)と1対1で調整されたミラー攻略ギミック検証専用の組であり、どちらか一方だけを
    // 正本値へ差し替えるとdemasBattle.test.mjsの逐次アサーションが破綻する。今回は対象外とし、
    // 実際のパーティで戦う本戦バランスはbossBalance.test.mjsのbuildPartyCombatant経由で別途検証する。
    maxHp: 360, maxMp: 60, attack: 42, defense: 12,
    // EXP/ゴールドはこのDEV NPC経由でも実セーブへ加算されるため、MONSTER_ROSTERの確定値を反映する。
    reward: { experience: MONSTER_ROSTER_BY_ID.demas.exp, money: MONSTER_ROSTER_BY_ID.demas.gold },
    enemyActions: [NORMAL_ATTACK, DEV_MIRROR, DEV_DAIDAIN],
    display: { scale: 1.7, offsetY: 0 },
    background: {
      key: "battle.bg.demas_test",
      url: new URL("../../assets/battle/backgrounds/reference/mq0_battle_bg_008_c44a414baf.png", import.meta.url).href,
    },
    devPlayer: { ...DEV_BOSS_TEST_PLAYER, learnedMagic: [DEV_MIRROR] },
  },
};

export function getDevBattleMonster(id: string | null): DevBattleMonsterDefinition | undefined {
  return id && Object.hasOwn(DEV_BATTLE_MONSTERS, id)
    ? DEV_BATTLE_MONSTERS[id as DevBattleMonsterId]
    : undefined;
}
