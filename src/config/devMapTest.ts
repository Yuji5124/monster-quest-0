export type DevMapTestId = "no01" | "no02" | "image-no01" | "starting-forest" | "bie-village" | "rainland-forest" | "rainland-castle-town" | "rainland-castle" | "majin-cave" | "zabon-village" | "dakoha-port" | "posaro-castle" | "revival-shrine" | "hidden-village" | "rainland-castle-3d" | "iwayama-cave" | "iwayama-shooting" | "rainland-throne-room" | "lake-castle-3d" | "mysterious-tower" | "demas-tower" | "kotankaim-cave" | "batorasu-fortress" | "swamp-cave" | "stone-town";

const DEV_MAP_TEST_IDS: readonly DevMapTestId[] = ["no01", "no02", "image-no01", "starting-forest", "bie-village", "rainland-forest", "rainland-castle-town", "rainland-castle", "majin-cave", "zabon-village", "dakoha-port", "posaro-castle", "revival-shrine", "hidden-village", "rainland-castle-3d", "iwayama-cave", "iwayama-shooting", "rainland-throne-room", "lake-castle-3d", "mysterious-tower", "demas-tower", "kotankaim-cave", "batorasu-fortress", "swamp-cave", "stone-town"];

/** 通常の起動導線を変更せず、特定マップを単体確認するためのDEV URLを解決する。 */
export function readDevMapTest(search: string): DevMapTestId | null {
  const requested = new URLSearchParams(search).get("mapTest");
  return (DEV_MAP_TEST_IDS as readonly string[]).includes(requested ?? "") ? (requested as DevMapTestId) : null;
}
