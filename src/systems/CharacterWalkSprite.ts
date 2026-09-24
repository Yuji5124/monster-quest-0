import Phaser from "phaser";
import { walkFrames } from "../config/characterWalkSprite.ts";
import type { WalkDirection, WalkSpriteGeometry } from "../config/characterWalkSprite.ts";

/** そのSceneでまだ読み込んでいなければキューへ追加する。Scene#preload()から呼ぶ。 */
export function preloadWalkSprite(scene: Phaser.Scene, geometry: WalkSpriteGeometry): void {
  if (scene.textures.exists(geometry.key)) return;
  scene.load.spritesheet(geometry.key, geometry.path, {
    frameWidth: geometry.frameWidth,
    frameHeight: geometry.frameHeight,
  });
}

export function walkAnimKey(geometry: WalkSpriteGeometry, direction: WalkDirection): string {
  return `${geometry.key}.walk.${direction}`;
}

const DIRECTIONS: readonly WalkDirection[] = ["down", "left", "right", "up"];

/**
 * AnimationManagerはScene単位ではなくGame全体で共有されるため、複数SceneやPartyFollowersが
 * 同じキャラを生成しても1回しか登録しない。Sprite生成前にScene#create()から呼ぶ。
 */
export function ensureWalkAnimations(scene: Phaser.Scene, geometry: WalkSpriteGeometry): void {
  for (const direction of DIRECTIONS) {
    const key = walkAnimKey(geometry, direction);
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(geometry.key, { frames: walkFrames(direction) }),
      frameRate: geometry.walkFrameRate,
      yoyo: true,
      repeat: -1,
    });
  }
}
