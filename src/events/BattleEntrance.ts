import Phaser from "phaser";
import { BATTLE_ENTRANCE_DURATION_MS } from "../config/battle.ts";
import { DISPLAY } from "../config/display.ts";
import { createBattleSceneStartData } from "./BattleEventData.ts";
import type { BattleDialogueEvent } from "./BattleEventData.ts";
import type { InputSystem } from "../systems/InputSystem.ts";

const EFFECT_DEPTH = 10_000;
const DARK_BLUE = 0x07122b;
const FLASH_COLOR = 0xe9f5ff;
const SHARD_ANGLES = [-2.65, -2.1, -1.58, -1.04, -0.48, 0.02, 0.55, 1.08, 1.62, 2.15, 2.68, 3.05] as const;
const SHARD_COLORS = [0x57d8ff, 0xffcc66, 0xb994ff] as const;

/** Timing helper, so the four-second contract stays unit-testable. */
export function battleEntranceProgress(elapsedMs: number): number {
  return Phaser.Math.Clamp(elapsedMs / BATTLE_ENTRANCE_DURATION_MS, 0, 1);
}

/**
 * Keeps the field visible and turns it into a short "prism breach" rather than a black-screen spiral.
 * Input stays locked throughout; only the caller decides whether a battle may begin.
 */
export function beginBattleEntrance(scene: Phaser.Scene, actions: InputSystem, event: BattleDialogueEvent): void {
  actions.setLocked(true);
  const centerX = DISPLAY.width / 2;
  const centerY = DISPLAY.height / 2;
  const maxDistance = Math.hypot(DISPLAY.width, DISPLAY.height) * 0.62;
  const overlay = scene.add.rectangle(centerX, centerY, DISPLAY.width, DISPLAY.height, DARK_BLUE, 0).setScrollFactor(0).setDepth(EFFECT_DEPTH);
  const flash = scene.add.rectangle(centerX, centerY, DISPLAY.width, DISPLAY.height, FLASH_COLOR, 0).setScrollFactor(0).setDepth(EFFECT_DEPTH + 2);
  const graphics = scene.add.graphics().setScrollFactor(0).setDepth(EFFECT_DEPTH + 1);
  let elapsedMs = 0;
  let flashTriggered = false;
  let disposed = false;

  const cleanup = (): void => {
    if (disposed) return;
    disposed = true;
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, update);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    scene.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    overlay.destroy();
    graphics.destroy();
    flash.destroy();
  };

  const update = (_time: number, delta: number): void => {
    elapsedMs = Math.min(BATTLE_ENTRANCE_DURATION_MS, elapsedMs + Math.max(0, delta));
    const progress = battleEntranceProgress(elapsedMs);
    const veil = Math.min(0.78, 0.78 * easeOutCubic(progress / 0.46));
    overlay.setAlpha(veil);
    drawPrismBreach(graphics, centerX, centerY, maxDistance, progress);

    if (!flashTriggered && progress >= 0.88) {
      flashTriggered = true;
      scene.cameras.main.shake(120, 0.0025);
      scene.cameras.main.flash(260, 233, 246, 255);
    }
    flash.setAlpha(progress < 0.84 ? 0 : easeInCubic((progress - 0.84) / 0.16) * 0.92);

    if (progress >= 1) {
      cleanup();
      scene.scene.start("BattleScene", createBattleSceneStartData(event));
    }
  };

  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, update);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
}

function drawPrismBreach(graphics: Phaser.GameObjects.Graphics, centerX: number, centerY: number, maxDistance: number, progress: number): void {
  graphics.clear();
  const streakProgress = Phaser.Math.Clamp((progress - 0.08) / 0.72, 0, 1);
  const inward = easeInOutCubic(streakProgress);
  for (const [index, angle] of SHARD_ANGLES.entries()) {
    const color = SHARD_COLORS[index % SHARD_COLORS.length];
    const distance = maxDistance * (1.08 - inward * 0.88) + (index % 3) * 24;
    const tail = 64 + (index % 4) * 18;
    const startX = centerX + Math.cos(angle) * distance;
    const startY = centerY + Math.sin(angle) * distance;
    const endX = centerX + Math.cos(angle) * Math.max(44, distance - tail);
    const endY = centerY + Math.sin(angle) * Math.max(44, distance - tail);
    const alpha = Math.sin(Math.PI * streakProgress) * 0.92;
    graphics.lineStyle(3 + (index % 2), color, alpha);
    graphics.lineBetween(startX, startY, endX, endY);
  }

  const gateProgress = Phaser.Math.Clamp((progress - 0.3) / 0.6, 0, 1);
  const gateAlpha = Math.sin(Math.PI * gateProgress) * 0.88;
  const radius = 42 + gateProgress * 210;
  drawDiamond(graphics, centerX, centerY, radius, 0x9ae9ff, gateAlpha, 4);
  drawDiamond(graphics, centerX, centerY, radius * 0.64, 0xffd77a, gateAlpha * 0.75, 2);
  graphics.fillStyle(0xdff8ff, Phaser.Math.Clamp((progress - 0.68) / 0.2, 0, 1) * 0.7);
  graphics.fillCircle(centerX, centerY, 14 + gateProgress * 40);
}

function drawDiamond(
  graphics: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  radius: number,
  color: number,
  alpha: number,
  lineWidth: number,
): void {
  graphics.lineStyle(lineWidth, color, alpha);
  graphics.beginPath();
  graphics.moveTo(centerX, centerY - radius);
  graphics.lineTo(centerX + radius, centerY);
  graphics.lineTo(centerX, centerY + radius);
  graphics.lineTo(centerX - radius, centerY);
  graphics.closePath();
  graphics.strokePath();
}

function easeOutCubic(value: number): number {
  const progress = Phaser.Math.Clamp(value, 0, 1);
  return 1 - (1 - progress) ** 3;
}

function easeInCubic(value: number): number {
  return Phaser.Math.Clamp(value, 0, 1) ** 3;
}

function easeInOutCubic(value: number): number {
  const progress = Phaser.Math.Clamp(value, 0, 1);
  return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
}
