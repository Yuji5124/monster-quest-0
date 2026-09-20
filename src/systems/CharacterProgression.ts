import { DEV_CHARACTER_STATS } from "../config/characterStats.ts";
import type { CharacterStatsEntry } from "../config/characterStats.ts";
import { GameStateRepository } from "./GameStateRepository.ts";
import type { CharacterProgressSaveState } from "./GameStateRepository.ts";
import type { PartyMemberId } from "./PartySystem.ts";

// TEMP_TEST_VALUE: the final EXP curve belongs to CHARACTER_GROWTH.md's balance pass.
const EXP_TO_NEXT_LEVEL = 10;

export interface ExperienceAwardResult {
  readonly leveledUpMemberIds: readonly PartyMemberId[];
}

export function getExperienceToNextLevel(level: number): number {
  return Math.max(1, Math.floor(level)) * EXP_TO_NEXT_LEVEL;
}

/** Keeps level / EXP independent from the still-temporary HP and battle-stat values. */
export class CharacterProgression {
  private readonly repository: GameStateRepository | undefined;

  constructor(repository: GameStateRepository | undefined = undefined) {
    this.repository = repository;
  }

  getStats(memberId: PartyMemberId): CharacterStatsEntry {
    const base = DEV_CHARACTER_STATS[memberId];
    const progress = this.repository?.load().party.characterProgress[memberId] ?? { level: 1, exp: 0 };
    return {
      ...base,
      level: progress.level,
      exp: progress.exp,
      expToNextLevel: getExperienceToNextLevel(progress.level),
    };
  }

  awardExperience(memberIds: readonly PartyMemberId[], amount: number): ExperienceAwardResult {
    const experience = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    if (!this.repository || experience === 0 || memberIds.length === 0) return { leveledUpMemberIds: [] };
    const state = this.repository.load();
    const progress: Record<string, CharacterProgressSaveState> = { ...state.party.characterProgress };
    const leveledUpMemberIds: PartyMemberId[] = [];
    for (const memberId of [...new Set(memberIds)]) {
      const current = progress[memberId] ?? { level: 1, exp: 0 };
      let level = current.level;
      let exp = current.exp + experience;
      let leveledUp = false;
      while (exp >= getExperienceToNextLevel(level)) {
        exp -= getExperienceToNextLevel(level);
        level += 1;
        leveledUp = true;
      }
      progress[memberId] = { level, exp };
      if (leveledUp) leveledUpMemberIds.push(memberId);
    }
    this.repository.saveCharacterProgress(progress);
    return { leveledUpMemberIds };
  }
}

const isBattleRuntimeTest = typeof window !== "undefined"
  && typeof import.meta.env !== "undefined"
  && import.meta.env.DEV
  && new URLSearchParams(window.location.search).has("battleTest");

// Direct battle visual QA must never add EXP to a real local save.
export const characterProgression = new CharacterProgression(isBattleRuntimeTest ? undefined : new GameStateRepository());
