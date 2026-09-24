import type { WalkSpriteGeometry } from "./characterWalkSprite.ts";

/**
 * Runtime definitions for the user-supplied villager sheets.
 *
 * The original artwork remains in `assets/characters/reference/reference/村人たち/`.
 * `tools/build_villager_sheets.py` produces the compact, common 3×4 runtime
 * sheets below.  Add a villager here once; maps can then select it by ID
 * without embedding asset paths in scene code.
 */
export const VILLAGER_SPRITES = {
  villager_01: {
    key: "char.villager.01.walk",
    path: new URL("../../assets/characters/npc/villager_01_walk.png", import.meta.url).toString(),
    frameWidth: 70,
    frameHeight: 70,
    walkFrameRate: 6,
    baselineY: 67,
  },
  villager_02: {
    key: "char.villager.02.walk",
    path: new URL("../../assets/characters/npc/villager_02_walk.png", import.meta.url).toString(),
    frameWidth: 70,
    frameHeight: 70,
    walkFrameRate: 6,
    baselineY: 67,
  },
  villager_03: {
    key: "char.villager.03.walk",
    path: new URL("../../assets/characters/npc/villager_03_walk.png", import.meta.url).toString(),
    frameWidth: 70,
    frameHeight: 70,
    walkFrameRate: 6,
    baselineY: 67,
  },
  villager_04: {
    key: "char.villager.04.walk",
    path: new URL("../../assets/characters/npc/villager_04_walk.png", import.meta.url).toString(),
    frameWidth: 70,
    frameHeight: 70,
    walkFrameRate: 6,
    baselineY: 67,
  },
  villager_05: {
    key: "char.villager.05.walk",
    path: new URL("../../assets/characters/npc/villager_05_walk.png", import.meta.url).toString(),
    frameWidth: 70,
    frameHeight: 70,
    walkFrameRate: 6,
    baselineY: 67,
  },
  villager_06: {
    key: "char.villager.06.walk",
    path: new URL("../../assets/characters/npc/villager_06_walk.png", import.meta.url).toString(),
    frameWidth: 70,
    frameHeight: 70,
    walkFrameRate: 6,
    baselineY: 67,
  },
  villager_07: {
    key: "char.villager.07.walk",
    path: new URL("../../assets/characters/npc/villager_07_walk.png", import.meta.url).toString(),
    frameWidth: 70,
    frameHeight: 70,
    walkFrameRate: 6,
    baselineY: 67,
  },
  villager_08: {
    key: "char.villager.08.walk",
    path: new URL("../../assets/characters/npc/villager_08_walk.png", import.meta.url).toString(),
    frameWidth: 70,
    frameHeight: 70,
    walkFrameRate: 6,
    baselineY: 67,
  },
  villager_09: {
    key: "char.villager.09.walk",
    path: new URL("../../assets/characters/npc/villager_09_walk.png", import.meta.url).toString(),
    frameWidth: 70,
    frameHeight: 70,
    walkFrameRate: 6,
    baselineY: 67,
  },
  villager_10: {
    key: "char.villager.10.walk",
    path: new URL("../../assets/characters/npc/villager_10_walk.png", import.meta.url).toString(),
    frameWidth: 70,
    frameHeight: 70,
    walkFrameRate: 6,
    baselineY: 67,
  },
} as const satisfies Record<string, WalkSpriteGeometry>;

export type VillagerSpriteId = keyof typeof VILLAGER_SPRITES;
