import { SWAMP_CAVE_ACTION } from "../config/swampCaveAction.ts";
import type { SwampCaveAbilityId, SwampCaveEnemySpawn, SwampCavePoint } from "../config/swampCaveAction.ts";

export interface SwampCaveEnemyState extends Omit<SwampCaveEnemySpawn, "x" | "y"> {
  x: number;
  y: number;
  hp: number;
  alive: boolean;
  frozenUntil: number;
  hitUntil: number;
}

export interface SwampCaveActionRun {
  phase: "action" | "final";
  endurance: number;
  damageReadyAt: number;
  readonly abilityReadyAt: Record<SwampCaveAbilityId, number>;
  readonly enemies: SwampCaveEnemyState[];
  chestOpened: boolean;
}

export type SwampCaveAbilityResult =
  | { readonly valid: false; readonly reason: "cooldown" | "no_target" }
  | {
    readonly valid: true;
    readonly abilityId: SwampCaveAbilityId;
    readonly target: SwampCavePoint;
    readonly affectedEnemyIds: readonly string[];
    readonly defeatedEnemyIds: readonly string[];
  };

export interface SwampCaveAdvanceResult {
  readonly contactDamage: boolean;
  readonly defeatedCount: number;
}

export function createSwampCaveActionRun(): SwampCaveActionRun {
  return {
    phase: "action",
    endurance: SWAMP_CAVE_ACTION.player.endurance,
    damageReadyAt: 0,
    abilityReadyAt: { hero_sword: 0, tarosa_bow: 0, mirei_magic: 0 },
    enemies: SWAMP_CAVE_ACTION.enemies.map((enemy) => ({
      ...enemy,
      hp: SWAMP_CAVE_ACTION.enemy.maxHp,
      alive: true,
      frozenUntil: 0,
      hitUntil: 0,
    })),
    chestOpened: false,
  };
}

/** Moves only living, unfrozen enemies and applies at most one party-endurance hit per cooldown. */
export function advanceSwampCaveActionRun(
  run: SwampCaveActionRun,
  player: SwampCavePoint,
  time: number,
  deltaMs: number,
): SwampCaveAdvanceResult {
  const seconds = Math.min(Math.max(deltaMs, 0), 50) / 1000;
  for (const enemy of run.enemies) {
    if (!enemy.alive || enemy.frozenUntil > time) continue;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0.001) {
      const travel = Math.min(distance, SWAMP_CAVE_ACTION.enemy.speed * seconds);
      enemy.x += (dx / distance) * travel;
      enemy.y += (dy / distance) * travel;
    }
  }

  const touching = run.enemies.some((enemy) => enemy.alive && distanceBetween(enemy, player) <= SWAMP_CAVE_ACTION.enemy.contactRadius);
  if (!touching || time < run.damageReadyAt) return { contactDamage: false, defeatedCount: defeatedEnemyCount(run) };
  run.endurance = Math.max(0, run.endurance - 1);
  run.damageReadyAt = time + SWAMP_CAVE_ACTION.player.hurtInvulnerableMs;
  return { contactDamage: true, defeatedCount: defeatedEnemyCount(run) };
}

export function useSwampCaveAbility(
  run: SwampCaveActionRun,
  abilityId: SwampCaveAbilityId,
  origin: SwampCavePoint,
  time: number,
): SwampCaveAbilityResult {
  const ability = SWAMP_CAVE_ACTION.abilities[abilityId];
  if (time < run.abilityReadyAt[abilityId]) return { valid: false, reason: "cooldown" };
  const target = closestLivingEnemy(run, origin, ability.range);
  if (!target) return { valid: false, reason: "no_target" };

  run.abilityReadyAt[abilityId] = time + ability.cooldownMs;
  const magic = abilityId === "mirei_magic" ? SWAMP_CAVE_ACTION.abilities.mirei_magic : null;
  const affected = magic
    ? run.enemies.filter((enemy) => enemy.alive && distanceBetween(enemy, target) <= magic.radius)
    : [target];
  const defeatedEnemyIds: string[] = [];
  for (const enemy of affected) {
    enemy.hp = Math.max(0, enemy.hp - ability.damage);
    enemy.hitUntil = time + 160;
    if (magic) enemy.frozenUntil = time + magic.freezeMs;
    if (enemy.hp === 0) {
      enemy.alive = false;
      defeatedEnemyIds.push(enemy.id);
    }
  }
  return {
    valid: true,
    abilityId,
    target: { x: target.x, y: target.y },
    affectedEnemyIds: affected.map((enemy) => enemy.id),
    defeatedEnemyIds,
  };
}

export function defeatedEnemyCount(run: SwampCaveActionRun): number {
  return run.enemies.filter((enemy) => !enemy.alive).length;
}

export function areAllSwampCaveEnemiesDefeated(run: SwampCaveActionRun): boolean {
  return run.enemies.every((enemy) => !enemy.alive);
}

export function canOpenSwampCaveChest(run: SwampCaveActionRun, player: SwampCavePoint): boolean {
  return run.phase === "final" && !run.chestOpened && areAllSwampCaveEnemiesDefeated(run) && distanceBetween(player, SWAMP_CAVE_ACTION.chest) <= SWAMP_CAVE_ACTION.chest.radius;
}

export function openSwampCaveChest(run: SwampCaveActionRun, player: SwampCavePoint): boolean {
  if (!canOpenSwampCaveChest(run, player)) return false;
  run.chestOpened = true;
  return true;
}

/** The block-built action course is cleared before the short background-backed inner room opens. */
export function canEnterSwampCaveFinalRoom(run: SwampCaveActionRun, player: SwampCavePoint): boolean {
  return run.phase === "action" && areAllSwampCaveEnemiesDefeated(run) && distanceBetween(player, SWAMP_CAVE_ACTION.exit) <= SWAMP_CAVE_ACTION.exit.radius;
}

export function enterSwampCaveFinalRoom(run: SwampCaveActionRun, player: SwampCavePoint): boolean {
  if (!canEnterSwampCaveFinalRoom(run, player)) return false;
  run.phase = "final";
  return true;
}

export function restoreSwampCaveActionRun(run: SwampCaveActionRun, progress: { readonly cleared: boolean; readonly chestOpened: boolean }): void {
  if (progress.cleared || progress.chestOpened) {
    for (const enemy of run.enemies) {
      enemy.hp = 0;
      enemy.alive = false;
    }
  }
  run.chestOpened = progress.chestOpened;
  if (progress.chestOpened) run.phase = "final";
}

function closestLivingEnemy(run: SwampCaveActionRun, origin: SwampCavePoint, range: number): SwampCaveEnemyState | undefined {
  let closest: SwampCaveEnemyState | undefined;
  let closestDistance = range;
  for (const enemy of run.enemies) {
    if (!enemy.alive) continue;
    const distance = distanceBetween(enemy, origin);
    if (distance <= closestDistance) {
      closest = enemy;
      closestDistance = distance;
    }
  }
  return closest;
}

function distanceBetween(a: SwampCavePoint, b: SwampCavePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
