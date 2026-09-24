import { getCharacterBaseStatsAtLevel, getMagicLearnTable } from "../config/characterGrowth.ts";
import type { CharacterStatsEntry } from "../config/characterStats.ts";
import { getDefaultWeaponForLevel } from "../data/weapons.ts";
import { getExpForLevel, getExpForNextLevel, getLevelForTotalExp } from "../data/expTable.ts";
import { GameStateRepository } from "./GameStateRepository.ts";
import type { CharacterProgressSaveState } from "./GameStateRepository.ts";
import type { PartyMemberId } from "./PartySystem.ts";

const DISPLAY_NAMES: Readonly<Record<PartyMemberId, string>> = {
  hero: "主人公",
  tarosa: "タロサ",
  mirei: "ミレイ",
};

/**
 * 2026-09-22の成長／バランス統合により、CHARACTER_GROWTH.md §2のLv1〜25累積EXPテーブルと
 * `characterGrowth.ts`の成長カーブを正とする。以前のTEMP_TEST_VALUE(level*10)は廃止した。
 */
export function getExperienceToNextLevel(level: number): number {
  return getExpForNextLevel(level) - getExpForLevel(level);
}

export interface CharacterLevelUp {
  readonly memberId: PartyMemberId;
  readonly displayName: string;
  readonly fromLevel: number;
  readonly toLevel: number;
  /** fromLevel+1〜toLevelの間に新しく覚えた魔法名(習得表の順)。 */
  readonly learnedMagicNames: readonly string[];
  /** fromLevel→toLevelの能力増加量。攻撃力はフィールドメニューと同じく武器補正込み。 */
  readonly statGains: CharacterStatGains;
}

export interface CharacterStatGains {
  readonly maxHp: number;
  readonly maxMp: number;
  readonly attack: number;
  readonly defense: number;
  readonly speed: number;
}

/** 戦闘終了時の説明ページ用。表示順と名称はフィールドメニューのステータスに合わせる。 */
const STAT_GAIN_LABELS: readonly (readonly [keyof CharacterStatGains, string])[] = [
  ["maxHp", "さいだいHP"],
  ["maxMp", "さいだいMP"],
  ["attack", "こうげき"],
  ["defense", "ぼうぎょ"],
  ["speed", "すばやさ"],
];

function levelStats(memberId: PartyMemberId, level: number): CharacterStatGains {
  const base = getCharacterBaseStatsAtLevel(memberId, level);
  const weapon = getDefaultWeaponForLevel(memberId, level);
  return { maxHp: base.maxHp, maxMp: base.maxMp, attack: base.attack + weapon.attackBonus, defense: base.defense, speed: base.speed };
}

function statGainsBetween(memberId: PartyMemberId, fromLevel: number, toLevel: number): CharacterStatGains {
  const before = levelStats(memberId, fromLevel);
  const after = levelStats(memberId, toLevel);
  return {
    maxHp: after.maxHp - before.maxHp,
    maxMp: after.maxMp - before.maxMp,
    attack: after.attack - before.attack,
    defense: after.defense - before.defense,
    speed: after.speed - before.speed,
  };
}

/** 「さいだいHP　+8」のように、増えた能力だけを1項目ずつ返す(増加0の能力は省く)。 */
export function formatStatGainEntries(gains: CharacterStatGains): string[] {
  return STAT_GAIN_LABELS
    .filter(([key]) => gains[key] > 0)
    .map(([key, label]) => `${label}　+${gains[key]}`);
}

export interface ExperienceAwardResult {
  readonly leveledUpMemberIds: readonly PartyMemberId[];
  readonly levelUps: readonly CharacterLevelUp[];
}

/** 勝利メッセージ用。「主人公は　レベル3に　あがった！」「ライフを　おぼえた！」の行を返す。 */
export function formatLevelUpLines(levelUps: readonly CharacterLevelUp[]): string[] {
  return levelUps.flatMap((levelUp) => [
    `${levelUp.displayName}は　レベル${levelUp.toLevel}に　あがった！`,
    ...levelUp.learnedMagicNames.map((name) => `${levelUp.displayName}は　${name}を　おぼえた！`),
  ]);
}

/** Keeps level / EXP derived from a single cumulative counter; HP等はcharacterGrowth.tsが担う。 */
export class CharacterProgression {
  private readonly repository: GameStateRepository | undefined;

  constructor(repository: GameStateRepository | undefined = undefined) {
    this.repository = repository;
  }

  getStats(memberId: PartyMemberId): CharacterStatsEntry {
    const totalExp = this.repository?.load().party.characterProgress[memberId]?.totalExp ?? 0;
    const level = getLevelForTotalExp(totalExp);
    const base = getCharacterBaseStatsAtLevel(memberId, level);
    const weapon = getDefaultWeaponForLevel(memberId, level);
    const currentThreshold = getExpForLevel(level);
    const span = getExpForNextLevel(level) - currentThreshold;
    return {
      id: memberId,
      displayName: DISPLAY_NAMES[memberId],
      level,
      exp: span > 0 ? Math.min(span, totalExp - currentThreshold) : 0,
      expToNextLevel: span > 0 ? span : 1,
      hp: base.maxHp,
      maxHp: base.maxHp,
      mp: base.maxMp,
      maxMp: base.maxMp,
      attack: base.attack + weapon.attackBonus,
      defense: base.defense,
      speed: base.speed,
    };
  }

  awardExperience(memberIds: readonly PartyMemberId[], amount: number): ExperienceAwardResult {
    const experience = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    if (!this.repository || experience === 0 || memberIds.length === 0) return { leveledUpMemberIds: [], levelUps: [] };
    const state = this.repository.load();
    const progress: Record<string, CharacterProgressSaveState> = { ...state.party.characterProgress };
    const levelUps: CharacterLevelUp[] = [];
    for (const memberId of [...new Set(memberIds)]) {
      const before = progress[memberId]?.totalExp ?? 0;
      const after = before + experience;
      progress[memberId] = { totalExp: after };
      const fromLevel = getLevelForTotalExp(before);
      const toLevel = getLevelForTotalExp(after);
      if (toLevel <= fromLevel) continue;
      const learnedMagicNames = getMagicLearnTable(memberId)
        .filter((entry) => entry.level > fromLevel && entry.level <= toLevel)
        .map((entry) => ("name" in entry.magic ? entry.magic.name : entry.magic.id));
      const statGains = statGainsBetween(memberId, fromLevel, toLevel);
      levelUps.push({ memberId, displayName: DISPLAY_NAMES[memberId], fromLevel, toLevel, learnedMagicNames, statGains });
    }
    this.repository.saveCharacterProgress(progress);
    return { leveledUpMemberIds: levelUps.map((levelUp) => levelUp.memberId), levelUps };
  }
}

const isBattleRuntimeTest = typeof window !== "undefined"
  && typeof import.meta.env !== "undefined"
  && import.meta.env.DEV
  && new URLSearchParams(window.location.search).has("battleTest");

// Direct battle visual QA must never add EXP to a real local save.
export const characterProgression = new CharacterProgression(isBattleRuntimeTest ? undefined : new GameStateRepository());
