import type { Facing } from "./PlayerMovement.ts";

export interface PartyTrailPoint {
  readonly x: number;
  readonly y: number;
  readonly facing: Facing;
}

function facingFromDelta(dx: number, dy: number, fallback: Facing): Facing {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return fallback;
  return Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
}

/**
 * Leaderの実際の座標列から「後方distance」の地点を返す。
 * 追従者の現在位置へ補間しないため、曲がり角を斜めに短絡しない。
 */
export class PartyTrail {
  private points: PartyTrailPoint[];
  private readonly maxTrailDistance: number;

  constructor(initial: PartyTrailPoint, maxTrailDistance = Number.POSITIVE_INFINITY) {
    this.points = [initial];
    this.maxTrailDistance = maxTrailDistance;
  }

  reset(initial: PartyTrailPoint): void {
    this.points = [initial];
  }

  record(point: PartyTrailPoint): void {
    const previous = this.points[this.points.length - 1];
    if (previous.x === point.x && previous.y === point.y) {
      this.points[this.points.length - 1] = point;
      return;
    }
    this.points.push(point);
    this.trim();
  }

  getPointBehind(distance: number): PartyTrailPoint {
    let remaining = distance;
    for (let index = this.points.length - 1; index > 0; index -= 1) {
      const newer = this.points[index];
      const older = this.points[index - 1];
      const dx = newer.x - older.x;
      const dy = newer.y - older.y;
      const length = Math.hypot(dx, dy);
      if (length === 0) continue;
      if (remaining <= length) {
        const ratio = (length - remaining) / length;
        return {
          x: older.x + dx * ratio,
          y: older.y + dy * ratio,
          facing: facingFromDelta(dx, dy, newer.facing),
        };
      }
      remaining -= length;
    }

    const first = this.points[0];
    const direction = reverseFacing(first.facing);
    return {
      x: first.x + direction.x * remaining,
      y: first.y + direction.y * remaining,
      facing: first.facing,
    };
  }

  private trim(): void {
    let distance = 0;
    for (let index = this.points.length - 1; index > 0; index -= 1) {
      const newer = this.points[index];
      const older = this.points[index - 1];
      distance += Math.hypot(newer.x - older.x, newer.y - older.y);
      if (distance > this.maxTrailDistance) {
        this.points.splice(0, Math.max(0, index - 1));
        return;
      }
    }
  }
}

function reverseFacing(facing: Facing): { readonly x: number; readonly y: number } {
  if (facing === "up") return { x: 0, y: 1 };
  if (facing === "down") return { x: 0, y: -1 };
  if (facing === "left") return { x: 1, y: 0 };
  return { x: -1, y: 0 };
}
