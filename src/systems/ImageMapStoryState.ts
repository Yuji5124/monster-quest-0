import type { ImageMapAwakeningObject, ImageMapBarrierObject, ImageMapStatueObject } from "./ImageMapData.ts";

/** Anything that can answer "is this save flag set?" (GameStateRepository, a Set wrapper in tests, ...). */
export interface FlagReader {
  hasFlag(flag: string): boolean;
}

/** The text a statue shows right now: its post-event reaction once the changing event has happened. */
export function statuePages(statue: ImageMapStatueObject, flags: FlagReader): readonly string[] {
  return isStatueChanged(statue, flags) && statue.changedPages ? statue.changedPages : statue.pages;
}

export function isStatueChanged(statue: Pick<ImageMapStatueObject, "changedFlag">, flags: FlagReader): boolean {
  return statue.changedFlag !== undefined && flags.hasFlag(statue.changedFlag);
}

export function isBarrierOpen(barrier: Pick<ImageMapBarrierObject, "openedFlag">, flags: FlagReader): boolean {
  return flags.hasFlag(barrier.openedFlag);
}

/** Memory-echo flags the player has not collected yet. */
export function missingRequiredFlags(awakening: Pick<ImageMapAwakeningObject, "requiredFlags">, flags: FlagReader): string[] {
  return awakening.requiredFlags.filter((flag) => !flags.hasFlag(flag));
}

export type AwakeningStage = "locked" | "ready" | "done";

/** locked: echoes are missing / ready: the awakening plays on the next examination / done: it already happened. */
export function awakeningStage(awakening: ImageMapAwakeningObject, flags: FlagReader): AwakeningStage {
  if (flags.hasFlag(awakening.awakenedFlag)) return "done";
  return missingRequiredFlags(awakening, flags).length === 0 ? "ready" : "locked";
}

/** Pages to open for an examination that does NOT play the awakening (locked hint / repeat line). */
export function awakeningStaticPages(awakening: ImageMapAwakeningObject, flags: FlagReader): readonly string[] | undefined {
  const stage = awakeningStage(awakening, flags);
  if (stage === "locked") return awakening.lockedPages;
  if (stage === "done") return awakening.repeatPages;
  return undefined;
}

/** Shortest distance from a point to a rectangle (0 when inside); used to pick the nearest examinable object. */
export function distanceToRect(
  point: { readonly x: number; readonly y: number },
  rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
  return Math.hypot(dx, dy);
}
