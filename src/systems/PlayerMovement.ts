import type { InputSystem } from "./InputSystem.ts";

export type Facing = "up" | "down" | "left" | "right";

/** Phase 5の仮方式: 連続4方向。逆方向は相殺し、縦横同時なら縦を優先する。 */
export function getMovementDirection(input: Pick<InputSystem, "isDown">): Facing | null {
  const vertical = Number(input.isDown("moveDown")) - Number(input.isDown("moveUp"));
  const horizontal = Number(input.isDown("moveRight")) - Number(input.isDown("moveLeft"));
  if (vertical !== 0) return vertical < 0 ? "up" : "down";
  if (horizontal !== 0) return horizontal < 0 ? "left" : "right";
  return null;
}
