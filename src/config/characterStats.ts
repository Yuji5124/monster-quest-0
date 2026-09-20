import type { PartyMemberId } from "../systems/PartySystem.ts";

/**
 * HP/MP/こうげき/ぼうぎょ/すばやさはTEMP_TEST_VALUE。
 * 全員Lv1・EXP 0開始はユーザー確定。最終成長率・EXP曲線はTBDのため、現在は
 * 小さな仮閾値で画面・保存・勝利報酬を接続する。戦闘側のDEV_BATTLE_PLAYERとは別管理。
 */
export interface CharacterStatsEntry {
  readonly id: PartyMemberId;
  readonly displayName: string;
  readonly level: number;
  readonly exp: number;
  readonly expToNextLevel: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly mp: number;
  readonly maxMp: number;
  readonly attack: number;
  readonly defense: number;
  readonly speed: number;
}

export const DEV_CHARACTER_STATS: Readonly<Record<PartyMemberId, CharacterStatsEntry>> = {
  hero: {
    id: "hero",
    displayName: "主人公",
    level: 1, exp: 0, expToNextLevel: 10,
    hp: 42, maxHp: 42, mp: 8, maxMp: 8,
    attack: 12, defense: 7, speed: 9,
  },
  tarosa: {
    id: "tarosa",
    displayName: "タロサ",
    level: 1, exp: 0, expToNextLevel: 10,
    hp: 38, maxHp: 38, mp: 4, maxMp: 4,
    attack: 14, defense: 5, speed: 11,
  },
  mirei: {
    id: "mirei",
    displayName: "ミレイ",
    level: 1, exp: 0, expToNextLevel: 10,
    hp: 30, maxHp: 30, mp: 16, maxMp: 16,
    attack: 6, defense: 5, speed: 8,
  },
} as const;
