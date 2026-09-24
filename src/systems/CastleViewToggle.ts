import { PLAYER } from "../config/player.ts";
import { PROTAGONIST_BODY_OFFSET, PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import type { Facing } from "./PlayerMovement.ts";

/**
 * 2D⇄3D切替で「同じ場所・同じ向き」を引き継ぐための変換(純粋関数)。
 * 2D: 主人公スプライトの中心(ランタイム座標 = 背景px × worldScale)と上下左右の向き。
 * 3D: 足元の箱の中心(ネイティブ背景px)と向きの角度yaw(ラジアン。0 = 北(画面上)、左回りが正)。
 */
export interface ViewToggleData {
  readonly spawnX: number;
  readonly spawnY: number;
  readonly spawnFacing: Facing;
  /** 3D側で細かい向きを保つための任意値。2Dは上下左右に丸める。 */
  readonly spawnYaw?: number;
}

/** スプライト中心から足元の箱の中心までのずれ(ランタイムpx)。Player(Arcade Body)と同じ計算。 */
export const FEET_OFFSET = {
  x: PROTAGONIST_BODY_OFFSET.x + PLAYER.width / 2 - PROTAGONIST_SPRITE.frameWidth / 2,
  y: PROTAGONIST_BODY_OFFSET.y + PLAYER.height / 2 - PROTAGONIST_SPRITE.frameHeight / 2,
} as const;

/** 足元の箱の半径(ネイティブ背景px)。2Dの24×24(ランタイム) ÷ worldScale。 */
export function feetHalfSize(worldScale: number): number {
  return PLAYER.width / 2 / worldScale;
}

export function spriteToFeet(spriteX: number, spriteY: number, worldScale: number): { x: number; y: number } {
  return { x: (spriteX + FEET_OFFSET.x) / worldScale, y: (spriteY + FEET_OFFSET.y) / worldScale };
}

export function feetToSprite(feetX: number, feetY: number, worldScale: number): { x: number; y: number } {
  return { x: feetX * worldScale - FEET_OFFSET.x, y: feetY * worldScale - FEET_OFFSET.y };
}

const YAW_BY_FACING: Readonly<Record<Facing, number>> = {
  up: 0,
  left: Math.PI / 2,
  down: Math.PI,
  right: -Math.PI / 2,
};

export function facingToYaw(facing: Facing): number {
  return YAW_BY_FACING[facing];
}

export function normalizeYaw(yaw: number): number {
  const turn = Math.PI * 2;
  let value = yaw % turn;
  if (value <= -Math.PI) value += turn;
  if (value > Math.PI) value -= turn;
  return value;
}

/** いちばん近い上下左右へ丸める。 */
export function yawToFacing(yaw: number): Facing {
  const value = normalizeYaw(yaw);
  const quarter = Math.PI / 4;
  if (value > -quarter && value <= quarter) return "up";
  if (value > quarter && value <= 3 * quarter) return "left";
  if (value > -3 * quarter && value <= -quarter) return "right";
  return "down";
}

/** yawの向きに1進んだときの背景上の移動方向(x右・y下が正)。 */
export function forwardVector(yaw: number): { x: number; y: number } {
  return { x: -Math.sin(yaw), y: -Math.cos(yaw) };
}
