import Phaser from "phaser";
import type { InputSystem } from "../systems/InputSystem.ts";
import { createBattleSceneStartData } from "./BattleEventData.ts";
import type { BattleDialogueEvent } from "./BattleEventData.ts";

/**
 * A small bridge from dialogue data to a Scene transition.  This is intentionally
 * narrower than a general EventSystem, while preserving an extensible data shape.
 */
export function beginDialogueBattleEvent(
  scene: Phaser.Scene,
  actions: InputSystem,
  event: BattleDialogueEvent,
  fadeMs: number,
): void {
  actions.setLocked(true);
  scene.cameras.main.fadeOut(fadeMs, 0, 0, 0);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start("BattleScene", createBattleSceneStartData(event));
  });
}
