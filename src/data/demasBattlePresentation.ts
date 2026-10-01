/**
 * Renderer-only presentation data for the No.16 Demas encounter.
 * Gameplay values, turn order, and reflection are deliberately kept in BattleSystem.
 * All timing and colour values are TEMP_VISUAL_VALUE: tune them visually without
 * changing combat balance.
 */
export interface DemasBattleSpriteSheetDefinition {
  readonly key: string;
  readonly url: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
}

export const DEMAS_BATTLE_SPRITE_SHEET: DemasBattleSpriteSheetDefinition = {
  key: "battle.monster.demas.animated",
  url: new URL("../../assets/monsters/battle/デマスのモンスターアニメーションスプライトシート (1).png", import.meta.url).href,
  // The supplied 1254x1254 sheet has four 313px columns and three 418px rows.
  // Its two spare horizontal pixels are intentionally ignored by Phaser's sheet grid.
  frameWidth: 313,
  frameHeight: 418,
};

/** Keep edge-touching source poses inside the battle layout through frame changes and camera zoom. */
export const DEMAS_SPRITE_SAFE_INSET_PX = 6;

export type DemasAnimationState = "idle" | "chant" | "cast" | "damaged" | "weak";

/**
 * 2026-10-02 user direction: the Demas encounter is a two-person boss battle
 * for the protagonist and Tarosa around Lv22. BattleScene reads this authored
 * order for map events; the development query uses the matching fixture.
 */
export const DEMAS_BATTLE_PARTY_IDS = ["hero", "tarosa"] as const;

export const DEMAS_BATTLE_PRESENTATION = {
  animations: {
    idle: { frames: [0, 1, 2, 3], frameRate: 5, repeat: -1 },
    chant: { frames: [4, 5, 6, 7], frameRate: 7, repeat: 0 },
    cast: { frames: [8, 9, 10, 11], frameRate: 12, repeat: 0 },
    damaged: { frames: [11, 10, 9, 8], frameRate: 14, repeat: 0 },
    weak: { frames: [7, 6, 5, 4], frameRate: 4, repeat: -1 },
  } satisfies Record<DemasAnimationState, { readonly frames: readonly number[]; readonly frameRate: number; readonly repeat: number }>,
  weakHpRatio: 0.35,
  idle: {
    floatPx: 5,
    swayDeg: 0.85,
    scaleX: 1.018,
    scaleY: 0.988,
    durationMs: 1_250,
  },
  normalCast: {
    durationMs: 620,
    pressureZoom: 1.014,
    shakeIntensity: 0.0035,
  },
  /**
   * Renderer-only magic pressure. These remain behind the portrait/HUD: they
   * suggest slices, held frames and a reduced/dithered palette without
   * applying a destructive post-process to the game's UI.
   */
  screenEffects: {
    echoOffsetPx: 7,
    echoAlpha: 0.16,
    sliceCount: 5,
    sliceOffsetPx: 13,
    // 16px keeps the one-shot daidain dither light enough for the iPhone Safari target.
    ditherCellPx: 16,
    daidainPointCount: 34,
    normalDurationMs: 260,
    daidainDurationMs: 940,
    frameHoldMs: 90,
  },
  daidain: {
    warningMs: 380,
    gatherMs: 420,
    stillnessMs: 90,
    beamMs: 270,
    mirrorHoldMs: 180,
    returnMs: 280,
    /** Long enough for the reflected-hit sheet pose and recoil to read before returning to idle. */
    reflectedImpactMs: 500,
    recoverMs: 240,
    pressureZoom: 1.028,
    edgeInset: 30,
    particleCount: 28,
    colours: {
      deep: 0x171431,
      violet: 0x806cff,
      blue: 0x78d8ff,
      white: 0xf5fbff,
      mirror: 0xc9f6ff,
    },
  },
} as const;
