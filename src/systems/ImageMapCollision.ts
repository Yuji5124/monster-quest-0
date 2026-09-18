import Phaser from "phaser";
import type { CollisionMaskImageData, CollisionRect } from "./ImageMapCollisionData.ts";

export { buildCollisionRects } from "./ImageMapCollisionData.ts";
export type { CollisionMaskImageData, CollisionRect } from "./ImageMapCollisionData.ts";

export interface ImageMapCollisionRuntime {
  readonly bodies: readonly Phaser.Physics.Arcade.StaticBody[];
  isDebugVisible(): boolean;
  setDebugVisible(visible: boolean): void;
}

/** Creates invisible static bodies and an optional DEV-only visible overlay from prebuilt rectangles. */
export function createImageMapCollision(
  scene: Phaser.Scene,
  rectangles: readonly CollisionRect[],
  visible: boolean,
): ImageMapCollisionRuntime {
  const overlays: Phaser.GameObjects.Rectangle[] = [];
  const bodies: Phaser.Physics.Arcade.StaticBody[] = [];

  for (const rect of rectangles) {
    const overlay = scene.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width, rect.height, 0xe5446d, 0.34);
    overlay.setVisible(visible);
    overlay.setDepth(900);
    scene.physics.add.existing(overlay, true);
    overlays.push(overlay);
    bodies.push(overlay.body as Phaser.Physics.Arcade.StaticBody);
  }

  let debugVisible = visible;
  return {
    bodies,
    isDebugVisible: () => debugVisible,
    setDebugVisible: (nextVisible: boolean): void => {
      debugVisible = nextVisible;
      for (const overlay of overlays) overlay.setVisible(nextVisible);
    },
  };
}

/** Reads a Phaser-loaded PNG into RGBA data once during Scene creation. */
export function readCollisionMaskImageData(scene: Phaser.Scene, textureKey: string): CollisionMaskImageData {
  const source = scene.textures.get(textureKey).getSourceImage() as CanvasImageSource & { width: number; height: number };
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("could not create 2D context for collision mask");
  context.drawImage(source, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}
