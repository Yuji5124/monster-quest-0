import { DEV_MAJIN_CAVE_BALANCE } from "../config/majinCave.ts";
import type { MajinCavePoint } from "../config/majinCave.ts";
import { isMajinCaveWalkable, shortestMajinCavePath } from "./MajinCaveGenerator.ts";
import type { MajinCaveEnemyState } from "./MajinCaveRunState.ts";
import { MajinCaveRunState } from "./MajinCaveRunState.ts";

export type MajinCaveDirection = "up" | "down" | "left" | "right";
export type MajinCavePlayerAction =
  | { readonly valid: false; readonly kind: "blocked" }
  | { readonly valid: true; readonly kind: "move"; readonly target: MajinCavePoint }
  | { readonly valid: true; readonly kind: "attack"; readonly enemy: MajinCaveEnemyState; readonly damage: number; readonly defeated: boolean }
  | { readonly valid: true; readonly kind: "wait" };

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
    const defeated = run.damageEnemy(enemy, DEV_MAJIN_CAVE_BALANCE.playerAttack);
    return { valid: true, kind: "attack", enemy, damage: DEV_MAJIN_CAVE_BALANCE.playerAttack, defeated };
  }

  wait(run: MajinCaveRunState): MajinCavePlayerAction {
    run.completePlayerAction("wait");
    return { valid: true, kind: "wait" };
  }

  resolveEnemyPhase(run: MajinCaveRunState): readonly MajinCaveEnemyEvent[] {
    run.completeEnemyPhase();
    const events: MajinCaveEnemyEvent[] = [];
    for (const enemy of [...run.getAliveEnemies()].sort((left, right) => left.id.localeCompare(right.id))) {
      const distance = manhattan(enemy.position, run.playerPosition);
      if (distance === 1) {
        const definition = run.enemyDefinition(enemy);
        run.damagePlayer(definition.attack);
        events.push({ kind: "attack", enemy, damage: definition.attack });
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
