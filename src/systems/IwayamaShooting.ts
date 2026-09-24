import { IWAYAMA_SHOOTING, IWAYAMA_SHOOTING_SECTIONS } from "../config/iwayamaShooting.ts";
import type { ShootingSection, ShootingSectionId } from "../config/iwayamaShooting.ts";

/**
 * いわやまのどうくつ崩落シューティングのPhaser非依存ロジック(当たり判定・爆発の連鎖・岩壁の段階・区間)。
 * Sceneとテストが同じ関数を使う。
 */

export interface ShootingCircle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface ShootingRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** 左上基準の矩形と円が重なるか。 */
export function circleOverlapsRect(circle: ShootingCircle, rect: ShootingRect): boolean {
  const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

/**
 * 矩形を円の外へ押し出す移動量(重なっていなければ0)。岩の中へめり込ませないために使う。
 * 円の中心が矩形の中にあるときは`backward`(進行方向の反対。縦スクロールでは下)へ押し出す。
 */
export function pushRectOutOfCircle(
  rect: ShootingRect,
  circle: ShootingCircle,
  backward: { readonly x: number; readonly y: number } = { x: 0, y: 1 },
): { readonly dx: number; readonly dy: number } {
  const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  let dx = nearestX - circle.x;
  let dy = nearestY - circle.y;
  let distance = Math.hypot(dx, dy);
  if (distance >= circle.radius) return { dx: 0, dy: 0 };
  if (distance === 0) {
    dx = backward.x;
    dy = backward.y;
    distance = 1;
  }
  const push = circle.radius - distance;
  return { dx: (dx / distance) * push, dy: (dy / distance) * push };
}

/** 爆発に巻き込まれるか。爆心から対象の外周までの距離が爆発半径以下なら巻き込む。 */
export function explosionReaches(center: { readonly x: number; readonly y: number }, radius: number, target: ShootingCircle): boolean {
  return Math.hypot(target.x - center.x, target.y - center.y) - target.radius <= radius;
}

export interface ChainTarget extends ShootingCircle {
  readonly hp: number;
  readonly explosive: boolean;
}

export interface ChainResult {
  /** 爆発した爆発岩のindexを、着火の波ごとに並べたもの(0番目が最初の一発)。 */
  readonly waves: readonly (readonly number[])[];
  /** 連鎖が終わった時点で壊れた対象のindex。 */
  readonly destroyed: ReadonlySet<number>;
}

/**
 * 一つの爆発岩を撃ったときの連鎖を最後まで計算する。Sceneは同じ`explosionReaches`で1波ずつ遅らせて再生する。
 * 爆発岩は巻き込まれた時点でHPに関係なく着火する。
 */
export function simulateExplosionChain(
  targets: readonly ChainTarget[],
  originIndex: number,
  radius: number = IWAYAMA_SHOOTING.explosion.radius,
  damage: number = IWAYAMA_SHOOTING.explosion.damage,
): ChainResult {
  const hp = targets.map((target) => target.hp);
  const destroyed = new Set<number>([originIndex]);
  const ignited = new Set<number>([originIndex]);
  const waves: number[][] = [];
  let wave = [originIndex];
  while (wave.length > 0) {
    waves.push(wave);
    const next: number[] = [];
    for (const index of wave) {
      targets.forEach((target, candidate) => {
        if (destroyed.has(candidate) || !explosionReaches(targets[index], radius, target)) return;
        if (target.explosive) {
          if (!ignited.has(candidate)) {
            ignited.add(candidate);
            destroyed.add(candidate);
            next.push(candidate);
          }
          return;
        }
        hp[candidate] -= damage;
        if (hp[candidate] <= 0) destroyed.add(candidate);
      });
    }
    wave = next;
  }
  return { waves, destroyed };
}

/**
 * 巨大岩壁の見た目の段階。HPバーの代わりに、1=ほぼ無傷 / 2=細いヒビ / 3=大きな亀裂 / 4=中心部崩壊 / 5=完全破壊。
 */
export function wallPhase(hp: number, maxHp: number = IWAYAMA_SHOOTING.wall.hp): 1 | 2 | 3 | 4 | 5 {
  if (hp <= 0) return 5;
  const damageRatio = 1 - hp / maxHp;
  return Math.min(4, 1 + Math.floor(damageRatio * 4)) as 1 | 2 | 3 | 4;
}

/** その距離が属する区間(チェックポイント)。 */
export function sectionAt(distance: number): ShootingSection {
  let current = IWAYAMA_SHOOTING_SECTIONS[0];
  for (const section of IWAYAMA_SHOOTING_SECTIONS) {
    if (section.start <= distance) current = section;
  }
  return current;
}

/**
 * DEV用`?shootingSection=`。区間ID(rocks/medium/enemies/explosion/chain/collapse/wall)か記号(A〜G)を受け付ける。
 */
export function readShootingSectionQuery(search: string): ShootingSectionId | null {
  const requested = new URLSearchParams(search).get("shootingSection")?.trim().toLowerCase();
  if (!requested) return null;
  const section = IWAYAMA_SHOOTING_SECTIONS.find((candidate) => candidate.id === requested || candidate.letter.toLowerCase() === requested);
  return section?.id ?? null;
}

/** 再現できる擬似乱数(背景・破片・ヒビの形を毎回同じにする)。 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
