import Phaser from "phaser";

// Character art is deliberately left untouched; this shared ellipse provides a small grounding cue.
const CHARACTER_SHADOW_WIDTH = 30;
const CHARACTER_SHADOW_HEIGHT = 9;
const CHARACTER_SHADOW_COLOR = 0x05070b;
const CHARACTER_SHADOW_ALPHA = 0.32;

export function createCharacterGroundShadow(scene: Phaser.Scene, x: number, groundY: number, characterDepth: number): Phaser.GameObjects.Ellipse {
  return scene.add
    .ellipse(x, groundY + 3, CHARACTER_SHADOW_WIDTH, CHARACTER_SHADOW_HEIGHT, CHARACTER_SHADOW_COLOR, CHARACTER_SHADOW_ALPHA)
    .setDepth(characterDepth - 0.01);
}

/** Keeps the shared shadow immediately behind a character and on its physical foot line. */
export function placeCharacterGroundShadow(
  shadow: Phaser.GameObjects.Ellipse,
  x: number,
  groundY: number,
  characterDepth: number,
): void {
  shadow.setPosition(x, groundY + 3).setDepth(characterDepth - 0.01);
}
