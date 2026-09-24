import type { MajinCaveEnemyId } from "../data/majinCaveEnemies.ts";

export const MAJIN_CAVE_MONSTER_FRAME_WIDTH = 64;
export const MAJIN_CAVE_MONSTER_FRAME_HEIGHT = 64;
export const MAJIN_CAVE_MONSTER_FRAME_COUNT = 16;
export const MAJIN_CAVE_MAJIN_FRAME_WIDTH = 320;
export const MAJIN_CAVE_MAJIN_FRAME_HEIGHT = 320;

export type MajinCaveAnimatedMonsterId = MajinCaveEnemyId;
export type MajinCaveMonsterAnimationName = "idle" | "attack" | "damage" | "defeat";

export interface MajinCaveMonsterAnimationSpec {
  readonly frames: readonly number[];
  readonly frameRate: number;
  readonly repeat: number;
}

export interface MajinCaveMonsterSpriteProfile {
  readonly monsterId: MajinCaveAnimatedMonsterId;
  readonly textureKey: string;
  /** Repository-relative path kept for the asset catalog and diagnostics. */
  readonly assetPath: string;
  readonly assetUrl: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  /** Chosen against the 32px cave grid; Majin intentionally occupies about 2.35 tiles. */
  readonly displayScale: number;
  readonly originX: number;
  readonly originY: number;
  readonly animationSpecs: Readonly<Record<MajinCaveMonsterAnimationName, MajinCaveMonsterAnimationSpec>>;
  /** Hold the final defeat pose before the view object is removed. */
  readonly defeatHoldMs?: number;
}

export const MAJIN_CAVE_MONSTER_ANIMATION_SPECS: Readonly<Record<MajinCaveMonsterAnimationName, MajinCaveMonsterAnimationSpec>> = {
  idle: { frames: [0, 1, 2, 3], frameRate: 5, repeat: -1 },
  attack: { frames: [4, 5, 6, 7], frameRate: 10, repeat: 0 },
  damage: { frames: [8, 9, 10, 11], frameRate: 10, repeat: 0 },
  defeat: { frames: [12, 13, 14, 15], frameRate: 7, repeat: 0 },
} as const;

/**
 * User-supplied Majin sheet contract: 4x4 (left-to-right / top-to-bottom), 320px cells.
 * Attack's third pose is frame 6, so its impact lands halfway through the 400ms playback.
 */
export const MAJIN_CAVE_MAJIN_ANIMATION_SPECS: Readonly<Record<MajinCaveMonsterAnimationName, MajinCaveMonsterAnimationSpec>> = {
  idle: { frames: [0, 1, 2, 3], frameRate: 8, repeat: -1 },
  attack: { frames: [4, 5, 6, 7], frameRate: 10, repeat: 0 },
  damage: { frames: [8, 9, 8], frameRate: 12, repeat: 0 },
  defeat: { frames: [12, 13, 14, 15], frameRate: 8, repeat: 0 },
} as const;

function spriteAsset(monsterId: MajinCaveAnimatedMonsterId): { readonly assetPath: string; readonly assetUrl: string } {
  const assetPath = `assets/monsters/majin_cave/monster_${monsterId}.png`;
  // Keep each URL a literal. Vite does not transform a variable segment inside `new URL()`;
  // a dynamic URL would work in source only by coincidence and disappear from the production bundle.
  const assetUrls: Readonly<Record<MajinCaveAnimatedMonsterId, string>> = {
    purin: new URL("../../assets/monsters/majin_cave/monster_purin.png", import.meta.url).toString(),
    tamago_ghost: new URL("../../assets/monsters/majin_cave/monster_tamago_ghost.png", import.meta.url).toString(),
    obake_tsumuri: new URL("../../assets/monsters/majin_cave/monster_obake_tsumuri.png", import.meta.url).toString(),
    fancy_duck: new URL("../../assets/monsters/majin_cave/monster_fancy_duck.png", import.meta.url).toString(),
    snow_bomb: new URL("../../assets/monsters/majin_cave/monster_snow_bomb.png", import.meta.url).toString(),
    koakuma: new URL("../../assets/monsters/majin_cave/monster_koakuma.png", import.meta.url).toString(),
    erimaki_hebi: new URL("../../assets/monsters/majin_cave/monster_erimaki_hebi.png", import.meta.url).toString(),
    daija: new URL("../../assets/monsters/majin_cave/monster_daija.png", import.meta.url).toString(),
    majin: new URL("../../assets/monsters/majin_cave/monster_majin_dungeon.png", import.meta.url).toString(),
  };
  return { assetPath, assetUrl: assetUrls[monsterId] };
}

function profile(monsterId: Exclude<MajinCaveAnimatedMonsterId, "majin">, displayScale: number): MajinCaveMonsterSpriteProfile {
  const asset = spriteAsset(monsterId);
  return {
    monsterId,
    textureKey: `majin-cave:monster:${monsterId}`,
    ...asset,
    frameWidth: MAJIN_CAVE_MONSTER_FRAME_WIDTH,
    frameHeight: MAJIN_CAVE_MONSTER_FRAME_HEIGHT,
    displayScale,
    originX: 0.5,
    originY: 0.82,
    animationSpecs: MAJIN_CAVE_MONSTER_ANIMATION_SPECS,
  };
}

function majinProfile(): MajinCaveMonsterSpriteProfile {
  const asset = spriteAsset("majin");
  return {
    monsterId: "majin",
    textureKey: "majin-cave:monster:majin",
    ...asset,
    frameWidth: MAJIN_CAVE_MAJIN_FRAME_WIDTH,
    frameHeight: MAJIN_CAVE_MAJIN_FRAME_HEIGHT,
    displayScale: 0.235,
    originX: 0.5,
    originY: 0.93,
    animationSpecs: MAJIN_CAVE_MAJIN_ANIMATION_SPECS,
    defeatHoldMs: 700,
  };
}

/**
 * One explicit data table binds stable existing IDs to supplied sheets. Scene code never
 * selects an image from appearance or a localized display name.
 */
export const MAJIN_CAVE_MONSTER_SPRITE_PROFILES: Readonly<Record<MajinCaveAnimatedMonsterId, MajinCaveMonsterSpriteProfile>> = {
  purin: profile("purin", 0.52),
  tamago_ghost: profile("tamago_ghost", 0.5),
  obake_tsumuri: profile("obake_tsumuri", 0.54),
  fancy_duck: profile("fancy_duck", 0.53),
  snow_bomb: profile("snow_bomb", 0.55),
  koakuma: profile("koakuma", 0.53),
  erimaki_hebi: profile("erimaki_hebi", 0.55),
  daija: profile("daija", 0.57),
  majin: majinProfile(),
} as const;

export function getMajinCaveMonsterSpriteProfile(monsterId: MajinCaveEnemyId): MajinCaveMonsterSpriteProfile | undefined {
  return MAJIN_CAVE_MONSTER_SPRITE_PROFILES[monsterId];
}

export function majinCaveMonsterAnimationKey(profile: MajinCaveMonsterSpriteProfile, animation: MajinCaveMonsterAnimationName): string {
  return `${profile.textureKey}:${animation}`;
}

export function majinCaveMonsterAnimationDurationMs(
  animation: MajinCaveMonsterAnimationName,
  profile?: MajinCaveMonsterSpriteProfile,
): number {
  const spec = (profile?.animationSpecs ?? MAJIN_CAVE_MONSTER_ANIMATION_SPECS)[animation];
  return Math.round((spec.frames.length / spec.frameRate) * 1000);
}

/** Pure duplicate-registration check used by both tests and Phaser integration. */
export function missingMajinCaveMonsterAnimationKeys(profile: MajinCaveMonsterSpriteProfile, exists: (key: string) => boolean): readonly string[] {
  return (Object.keys(profile.animationSpecs) as MajinCaveMonsterAnimationName[])
    .map((name) => majinCaveMonsterAnimationKey(profile, name))
    .filter((key) => !exists(key));
}
