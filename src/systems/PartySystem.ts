import { GameStateRepository } from "./GameStateRepository.ts";

export const PARTY_MEMBER_IDS = ["hero", "tarosa", "mirei"] as const;
export type PartyMemberId = (typeof PARTY_MEMBER_IDS)[number];

export interface PartyMember {
  readonly id: PartyMemberId;
  readonly displayName: string;
  readonly joined: boolean;
  /** Zero-based order in the active party. `null` when the member has not joined. */
  readonly order: number | null;
}

interface PartyMemberDefinition {
  readonly id: PartyMemberId;
  readonly displayName: string;
}

const PARTY_MEMBERS: readonly PartyMemberDefinition[] = [
  { id: "hero", displayName: "主人公" },
  { id: "tarosa", displayName: "タロサ" },
  { id: "mirei", displayName: "ミレイ" },
];

export interface PartyPersistence {
  load(): { readonly party: { readonly joinedMemberIds: readonly string[] } };
  savePartyMemberIds(memberIds: readonly string[]): unknown;
}

/**
 * Sceneをまたいで参照する、最小のパーティー状態。
 * 戦闘用のステータスはまだここへ持たせず、加入状態と固定順だけを管理する。
 */
export class PartySystem {
  private readonly persistence: PartyPersistence | undefined;
  private readonly joinedIds = new Set<PartyMemberId>();

  constructor(persistence?: PartyPersistence) {
    this.persistence = persistence;
    const persistedIds = persistence?.load().party.joinedMemberIds ?? ["hero"];
    for (const id of PARTY_MEMBER_IDS) {
      if (id === "hero" || persistedIds.includes(id)) this.joinedIds.add(id);
    }
  }

  hasMember(id: string): id is PartyMemberId {
    return isPartyMemberId(id) && this.joinedIds.has(id);
  }

  /** Returns false when the member is already joined. */
  addMember(id: PartyMemberId): boolean {
    if (id === "mirei" && !this.joinedIds.has("tarosa")) return false;
    if (this.joinedIds.has(id)) return false;
    this.joinedIds.add(id);
    this.persist();
    return true;
  }

  /** 「はじめから」用。主人公1人だけのパーティへ戻す(永続化はGameStateRepository側で行う)。 */
  resetToLeaderOnly(): void {
    this.joinedIds.clear();
    this.joinedIds.add("hero");
  }

  getActiveMembers(): readonly PartyMember[] {
    return PARTY_MEMBERS
      .filter((member) => this.joinedIds.has(member.id))
      .map((member, order) => ({ ...member, joined: true, order }));
  }

  getPartyOrder(): readonly PartyMemberId[] {
    return this.getActiveMembers().map((member) => member.id);
  }

  getMembers(): readonly PartyMember[] {
    return PARTY_MEMBERS.map((member) => {
      const order = this.getPartyOrder().indexOf(member.id);
      return { ...member, joined: order >= 0, order: order >= 0 ? order : null };
    });
  }

  private persist(): void {
    this.persistence?.savePartyMemberIds(this.getPartyOrder());
  }
}

export function isPartyMemberId(id: string): id is PartyMemberId {
  return (PARTY_MEMBER_IDS as readonly string[]).includes(id);
}

/** Runtime singleton. GameStateRepository is the existing app-wide persistence boundary. */
const isPartyRuntimeTest = typeof window !== "undefined"
  && typeof import.meta.env !== "undefined"
  && import.meta.env.DEV
  && new URLSearchParams(window.location.search).has("partyRuntimeTest");

// Browser QA uses an in-memory instance so it never reads or modifies a user's local save.
export const partySystem = new PartySystem(isPartyRuntimeTest ? undefined : new GameStateRepository());
