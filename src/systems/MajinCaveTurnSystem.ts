import { DEV_MAJIN_CAVE_BALANCE, getMajinCaveEnemyDamage, getMajinCavePlayerDamage } from "../config/majinCave.ts";
import type { MajinCavePoint } from "../config/majinCave.ts";
import type { BattleAction } from "../data/battleActions.ts";
import { MAGIC_HEAT } from "../data/battleActions.ts";
import type { ItemId } from "../data/items.ts";
import { isMajinCaveWalkable, shortestMajinCavePath } from "./MajinCaveGenerator.ts";
import type { MajinCaveEnemyState } from "./MajinCaveRunState.ts";
import { MajinCaveRunState } from "./MajinCaveRunState.ts";

export type MajinCaveDirection = "up" | "down" | "left" | "right";
export type MajinCavePlayerAction =
  | { readonly valid: false; readonly kind: "blocked" }
  | { readonly valid: true; readonly kind: "move"; readonly target: MajinCavePoint }
  | { readonly valid: true; readonly kind: "attack"; readonly enemy: MajinCaveEnemyState; readonly damage: number; readonly defeated: boolean }
  | { readonly valid: true; readonly kind: "wait" }
  | { readonly valid: true; readonly kind: "heat"; readonly enemy: MajinCaveEnemyState; readonly damage: number; readonly defeated: boolean }
  | { readonly valid: true; readonly kind: "magic"; readonly magic: Extract<BattleAction, { readonly kind: "magic_damage" }>; readonly enemy: MajinCaveEnemyState; readonly damage: number; readonly defeated: boolean }
  | { readonly valid: true; readonly kind: "magic_heal"; readonly magic: Extract<BattleAction, { readonly kind: "heal" }>; readonly recovered: number }
  | { readonly valid: true; readonly kind: "item_heal"; readonly itemId: ItemId; readonly recovered: number }
  | { readonly valid: false; readonly kind: "no_mp" }
  | { readonly valid: false; readonly kind: "not_learned" }
  | { readonly valid: false; readonly kind: "no_target" }
  | { readonly valid: false; readonly kind: "no_effect" }
  | { readonly valid: false; readonly kind: "unsupported_magic" };

export type MajinCaveEnemyEvent =
  | { readonly kind: "attack"; readonly enemy: MajinCaveEnemyState; readonly damage: number }
  | { readonly kind: "move"; readonly enemy: MajinCaveEnemyState }
  | { readonly kind: "wait"; readonly enemy: MajinCaveEnemyState };

const DELTAS: Readonly<Record<MajinCaveDirection, MajinCavePoint>> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

/** No.08-only turn resolver. It intentionally never invokes the normal BattleScene. */
export class MajinCaveTurnSystem {
  movePlayer(run: MajinCaveRunState, direction: MajinCaveDirection): MajinCavePlayerAction {
    const delta = DELTAS[direction];
    const target = { x: run.playerPosition.x + delta.x, y: run.playerPosition.y + delta.y };
    if (!isMajinCaveWalkable(run.currentFloor.grid, target)) return { valid: false, kind: "blocked" };
    const enemy = run.enemyAt(target);
    if (!enemy) {
      run.completePlayerAction("move");
      run.setPlayerPosition(target);
      return { valid: true, kind: "move", target };
    }
    run.completePlayerAction("attack");
    const damage = getMajinCavePlayerDamage(run.hero);
    const defeated = run.damageEnemy(enemy, damage);
    return { valid: true, kind: "attack", enemy, damage, defeated };
  }

  wait(run: MajinCaveRunState): MajinCavePlayerAction {
    run.completePlayerAction("wait");
    return { valid: true, kind: "wait" };
  }

  /**
   * ヒートで隣接する敵を攻撃する。まじんの再生を一時的に止める唯一の手段
   * (BATTLE_SPEC.md §9.1)。MP不足・対象なしはターンを消費しない。
   */
  castHeat(run: MajinCaveRunState, direction: MajinCaveDirection): MajinCavePlayerAction {
    const delta = DELTAS[direction];
    const target = { x: run.playerPosition.x + delta.x, y: run.playerPosition.y + delta.y };
    const enemy = run.enemyAt(target);
    if (!enemy) return { valid: false, kind: "no_target" };
    if (!run.hero.hasHeat) return { valid: false, kind: "not_learned" };
    if (!run.spendPlayerMp(DEV_MAJIN_CAVE_BALANCE.heatMpCost)) return { valid: false, kind: "no_mp" };
    run.completePlayerAction("attack");
    const defeated = run.damageEnemy(enemy, DEV_MAJIN_CAVE_BALANCE.heatDamage, { isHeat: true });
    return { valid: true, kind: "heat", enemy, damage: DEV_MAJIN_CAVE_BALANCE.heatDamage, defeated };
  }

  /** Resolves a learned No.08 spell without leaking cave presentation into the normal BattleScene. */
  castMagic(run: MajinCaveRunState, magic: BattleAction, direction?: MajinCaveDirection): MajinCavePlayerAction {
    if (magic.kind === "magic_damage") {
      if (!direction) return { valid: false, kind: "no_target" };
      if (magic.id === MAGIC_HEAT.id) return this.castHeat(run, direction);
      const delta = DELTAS[direction];
      const enemy = run.enemyAt({ x: run.playerPosition.x + delta.x, y: run.playerPosition.y + delta.y });
      if (!enemy) return { valid: false, kind: "no_target" };
      if (!run.spendPlayerMp(magic.mpCost)) return { valid: false, kind: "no_mp" };
      run.completePlayerAction("magic");
      const defeated = run.damageEnemy(enemy, magic.power);
      return { valid: true, kind: "magic", magic, enemy, damage: magic.power, defeated };
    }
    if (magic.kind === "heal") {
      if (run.playerHp >= run.hero.maxHp) return { valid: false, kind: "no_effect" };
      if (!run.spendPlayerMp(magic.mpCost)) return { valid: false, kind: "no_mp" };
      const recovered = run.recoverPlayer(magic.power);
      run.completePlayerAction("magic");
      return { valid: true, kind: "magic_heal", magic, recovered };
    }
    return { valid: false, kind: "unsupported_magic" };
  }

  /** The inventory boundary stays in the Scene; this method only applies the cave-side healing turn. */
  useHealingItem(run: MajinCaveRunState, itemId: ItemId, power: number): MajinCavePlayerAction {
    if (!Number.isFinite(power) || power <= 0 || run.playerHp >= run.hero.maxHp) return { valid: false, kind: "no_effect" };
    const recovered = run.recoverPlayer(power);
    run.completePlayerAction("item");
    return { valid: true, kind: "item_heal", itemId, recovered };
  }

  resolveEnemyPhase(run: MajinCaveRunState): readonly MajinCaveEnemyEvent[] {
    run.completeEnemyPhase();
    run.applyEnemyRegen();
    const events: MajinCaveEnemyEvent[] = [];
    for (const enemy of [...run.getAliveEnemies()].sort((left, right) => left.id.localeCompare(right.id))) {
      const distance = manhattan(enemy.position, run.playerPosition);
      if (distance === 1) {
        const definition = run.enemyDefinition(enemy);
        const damage = getMajinCaveEnemyDamage(definition.attack, run.hero);
        run.damagePlayer(damage);
        events.push({ kind: "attack", enemy, damage });
        continue;
      }
      if (distance > DEV_MAJIN_CAVE_BALANCE.enemyChaseDistance) {
        events.push({ kind: "wait", enemy });
        continue;
      }
      // Stair cells remain clear during both descent and ascent. The player can still
      // stand on a stair (the path helper permits its target), but an enemy never
      // claims a stair while chasing.
      const occupied = [
        ...run.getAliveEnemies().filter((other) => other.id !== enemy.id).map((other) => other.position),
        run.currentFloor.upStair,
        ...(run.currentFloor.downStair ? [run.currentFloor.downStair] : []),
      ];
      const path = shortestMajinCavePath(run.currentFloor.grid, enemy.position, run.playerPosition, occupied);
      if (path && path.length >= 2 && !samePoint(path[1], run.playerPosition)) {
        enemy.position = { ...path[1] };
        events.push({ kind: "move", enemy });
      } else {
        events.push({ kind: "wait", enemy });
      }
    }
    return events;
  }
}

function manhattan(first: MajinCavePoint, second: MajinCavePoint): number {
  return Math.abs(first.x - second.x) + Math.abs(first.y - second.y);
}

function samePoint(first: MajinCavePoint, second: MajinCavePoint): boolean {
  return first.x === second.x && first.y === second.y;
}
