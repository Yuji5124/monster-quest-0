/** 先輩向けデモ版の公開範囲。No.09までの地点だけをワールドマップに表示する。 */
export const DEMO_EDITION = true;

export const DEMO_WORLD_MAP_DESTINATION_IDS = new Set([
  "destination_starting_place", "destination_starting_town", "destination_starting_forest",
  "destination_bie_village", "destination_rainland_forest", "destination_rainland_castle_town",
  "destination_majin_cave", "destination_zabon_village", "destination_iwayama_cave",
]);

export function isDemoWorldMapDestination(id: string): boolean {
  return !DEMO_EDITION || DEMO_WORLD_MAP_DESTINATION_IDS.has(id);
}

/** デモ版も本編と同じ進行フラグを使い、地点ごとの解放順を変えない。 */
export function getDemoUnlockFlag(id: string, unlockFlag: string | null): string | null {
  void id;
  return unlockFlag;
}
