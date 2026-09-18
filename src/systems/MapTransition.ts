import Phaser from "phaser";
import { MAPS } from "../config/maps.ts";
import type { MapExitTrigger } from "../config/maps.ts";
import type { InputSystem } from "./InputSystem.ts";

// DEV_PLACEHOLDER: 出口領域を目視できるようにする仮マーカー色。正式なドア/出入口表現ではない。
const EXIT_ZONE_COLOR = 0x4a6a3a;
const EXIT_ZONE_ALPHA = 0.25;

/** 出口トリガー用の静的Body。見える仮マーカーとして描画する。 */
export function createExitZone(
  scene: Phaser.Scene,
  bounds: { x: number; y: number; width: number; height: number },
): Phaser.Physics.Arcade.StaticBody {
  const marker = scene.add.rectangle(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
    bounds.width,
    bounds.height,
    EXIT_ZONE_COLOR,
    EXIT_ZONE_ALPHA,
  );
  scene.physics.add.existing(marker, true);
  return marker.body as Phaser.Physics.Arcade.StaticBody;
}

/**
 * 移動 → 入力ロック → 短い暗転 → Scene切替、までを1か所にまとめる。
 * 新Sceneでの spawn 反映とフェードイン・入力解除は各Sceneのcreate()側の責務とする。
 * dataは新Sceneのcreate(data)へそのまま渡す(mapId/spawnId方式・interiorId方式の両方で使う)。
 */
export function beginMapTransition(
  scene: Phaser.Scene,
  actions: InputSystem,
  targetSceneKey: string,
  data: Record<string, string>,
  fadeMs: number,
): void {
  actions.setLocked(true);
  scene.cameras.main.fadeOut(fadeMs, 0, 0, 0);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(targetSceneKey, data);
  });
}

/** Resolves a data-defined local or world-map exit without embedding route decisions in individual Scenes. */
export function beginConfiguredMapExitTransition(
  scene: Phaser.Scene,
  actions: InputSystem,
  exit: MapExitTrigger,
  fadeMs: number,
): void {
  if (exit.kind === "world-map") {
    beginMapTransition(scene, actions, "WorldMapScene", { worldMapEntryId: exit.worldMapEntryId }, fadeMs);
    return;
  }
  const target = MAPS[exit.targetMapId];
  beginMapTransition(scene, actions, target.sceneKey, { spawnId: exit.targetSpawnId }, fadeMs);
}
