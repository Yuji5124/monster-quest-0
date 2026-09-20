import type Phaser from "phaser";
import type { InputSystem } from "../systems/InputSystem.ts";
import { beginBattleEntrance } from "./BattleEntrance.ts";
import type { BattleDialogueEvent } from "./BattleEventData.ts";

/**
 * A small bridge from dialogue data to the shared battle-entrance effect. This is intentionally
 * narrower than a general EventSystem, while preserving an extensible data shape.
 */
export function beginDialogueBattleEvent(
  scene: Phaser.Scene,
  actions: InputSystem,
  event: BattleDialogueEvent,
): void {
  beginBattleEntrance(scene, actions, event);
}
