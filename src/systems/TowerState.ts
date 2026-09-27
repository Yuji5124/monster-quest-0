/**
 * 不思議なとう固有の最小保存状態。
 *
 * 現時点では成長の開始値だけを永続化する。住民・施設・素材・AI状態は、
 * 本編の移住条件とUIが確定するまで保存データへ推測で追加しない。
 */
export const DEFAULT_TOWER_LEVEL = 1;

export interface TowerSaveState {
  readonly towerLevel: number;
}

export function createDefaultTowerState(): TowerSaveState {
  return { towerLevel: DEFAULT_TOWER_LEVEL };
}

/** Missing or malformed legacy data starts at level 1 without invalidating the whole save. */
export function normalizeTowerState(value: unknown): TowerSaveState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return createDefaultTowerState();
  const towerLevel = (value as { towerLevel?: unknown }).towerLevel;
  if (typeof towerLevel !== "number" || !Number.isFinite(towerLevel) || !Number.isInteger(towerLevel) || towerLevel < DEFAULT_TOWER_LEVEL) {
    return createDefaultTowerState();
  }
  return { towerLevel };
}

/**
 * Future boundary only — this is intentionally not persisted or called yet.
 * Resident IDs must be the existing `NpcDefinition.id`; no town Scene should be
 * mutated directly when a resident joins the tower.
 */
export interface TowerResidentProposal {
  readonly residentId: string;
  readonly originMapId: string;
  readonly role: string;
  readonly joinedTower: boolean;
}

/**
 * Future LLM adapters receive an immutable snapshot and return only validated
 * proposals. A tower application service must approve and persist those proposals;
 * an adapter must never receive a Phaser Scene or a GameStateRepository instance.
 */
export interface TowerAIService {
  propose(input: Readonly<{ towerLevel: number; residents: readonly TowerResidentProposal[] }>): Promise<readonly TowerResidentProposal[]>;
}
