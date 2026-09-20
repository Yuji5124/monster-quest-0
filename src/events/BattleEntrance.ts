import Phaser from "phaser";
import { BATTLE_ENTRANCE_DURATION_MS } from "../config/battle.ts";
import { DISPLAY } from "../config/display.ts";
import { createBattleSceneStartData } from "./BattleEventData.ts";
import type { BattleDialogueEvent } from "./BattleEventData.ts";
import type { InputSystem } from "../systems/InputSystem.ts";

const EFFECT_DEPTH = 10_000;
const VOID_COLOR = 0x05070d;
const PIXEL_COLUMNS = 24;
const PIXEL_ROWS = 18;
const PIXEL_COLORS = [0x182233, 0x273a4b, 0x42333f, 0x28434a] as const;

/** Timing helper, so the entrance duration stays unit-testable. */
export function battleEntranceProgress(elapsedMs: number): number {
  return Phaser.Math.Clamp(elapsedMs / BATTLE_ENTRANCE_DURATION_MS, 0, 1);
}

/**
 * Pulls the field into a restrained, slightly corrupted pixel vortex. The transient muted
 * red/teal fragments suggest the world's instability without using a late-game-strength glitch.
 * Input stays locked throughout; only the caller decides whether a battle may begin.
 */
export function beginBattleEntrance(scene: Phaser.Scene, actions: InputSystem, event: BattleDialogueEvent): void {
  actions.setLocked(true);
  const centerX = DISPLAY.width / 2;
  const centerY = DISPLAY.height / 2;
  const overlay = scene.add.rectangle(centerX, centerY, DISPLAY.width, DISPLAY.height, VOID_COLOR, 0).setScrollFactor(0).setDepth(EFFECT_DEPTH);
  const graphics = scene.add.graphics().setScrollFactor(0).setDepth(EFFECT_DEPTH + 1);
  let elapsedMs = 0;
  let disposed = false;

  const cleanup = (): void => {
    if (disposed) return;
    disposed = true;
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, update);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    scene.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    overlay.destroy();
    graphics.destroy();
  };

  const update = (_time: number, delta: number): void => {
    elapsedMs = Math.min(BATTLE_ENTRANCE_DURATION_MS, elapsedMs + Math.max(0, delta));
    const progress = battleEntranceProgress(elapsedMs);
    overlay.setAlpha(easeInCubic(progress));
    drawPixelVortex(graphics, centerX, centerY, progress);

    if (progress >= 1) {
      cleanup();
      scene.scene.start("BattleScene", createBattleSceneStartData(event));
    }
  };

  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, update);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
}

function drawPixelVortex(graphics: Phaser.GameObjects.Graphics, centerX: number, centerY: number, progress: number): void {
  graphics.clear();
  const pull = easeInOutCubic(Phaser.Math.Clamp((progress - 0.03) / 0.9, 0, 1));
  const tileWidth = DISPLAY.width / PIXEL_COLUMNS;
  const tileHeight = DISPLAY.height / PIXEL_ROWS;
  const fragmentAlpha = 0.18 + Math.sin(Math.PI * pull) * 0.5;

  for (let row = 0; row < PIXEL_ROWS; row += 1) {
    for (let column = 0; column < PIXEL_COLUMNS; column += 1) {
      const sourceX = (column + 0.5) * tileWidth;
      const sourceY = (row + 0.5) * tileHeight;
      const relativeX = sourceX - centerX;
      const relativeY = sourceY - centerY;
      const sourceDistance = Math.hypot(relativeX, relativeY);
      const sourceAngle = Math.atan2(relativeY, relativeX);
      const direction = (row + column) % 2 === 0 ? 1 : -1;
      const angle = sourceAngle + direction * (0.08 + sourceDistance / DISPLAY.width * 0.34) * pull;
      const distance = sourceDistance * (1 - pull * 0.985);
      const fragmentWidth = Math.max(2, tileWidth * (0.32 + (column % 3) * 0.05) * (1 - pull * 0.48));
      const fragmentHeight = Math.max(2, tileHeight * (0.22 + (row % 3) * 0.04) * (1 - pull * 0.48));
      const x = centerX + Math.cos(angle) * distance - fragmentWidth / 2;
      const y = centerY + Math.sin(angle) * distance - fragmentHeight / 2;
      const color = PIXEL_COLORS[(column * 3 + row) % PIXEL_COLORS.length];
      graphics.fillStyle(color, fragmentAlpha * (0.72 + ((row + column) % 4) * 0.07));
      graphics.fillRect(x, y, fragmentWidth, fragmentHeight);
    }
  }

  // A handful of offset scan lines keep the vortex tied to the world's controlled glitches.
  const tearAlpha = Math.sin(Math.PI * Phaser.Math.Clamp((progress - 0.18) / 0.45, 0, 1)) * 0.17;
  if (tearAlpha > 0) {
    for (const [index, ratio] of [0.24, 0.46, 0.71].entries()) {
      const y = DISPLAY.height * ratio;
      const width = DISPLAY.width * (0.18 - index * 0.025) * (1 - pull);
      graphics.fillStyle(index === 1 ? 0x5a2936 : 0x1c4e54, tearAlpha);
      graphics.fillRect(centerX - width / 2, y, width, Math.max(2, 4 * (1 - pull)));
    }
  }
}

function easeInCubic(value: number): number {
  return Phaser.Math.Clamp(value, 0, 1) ** 3;
}

function easeInOutCubic(value: number): number {
  const progress = Phaser.Math.Clamp(value, 0, 1);
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}
