import Phaser from "phaser";

interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * 通常の歩行マップ(Field / 町 / 村 / ダンジョン等)で共通利用する、主人公追従Cameraの最小設定。
 * マップ範囲がViewport(960×720)に収まる場合はCamera boundsとViewportが一致し、
 * 実質何もスクロールしない固定画面のまま同じ関数を使い回せる。
 * Interior等の小規模な部屋はそもそも呼ばなくてよい。
 */
export function configureMapCamera(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject & { x: number; y: number },
  bounds: Bounds,
): void {
  const camera = scene.cameras.main;
  camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
  // ドット絵がCameraのスクロール小数値でにじまないよう、スクロール位置を整数へ丸める。
  camera.roundPixels = true;
  // lerp=1(第3・第4引数)でふわつかせず、主人公の移動へ即時追従させる。
  camera.startFollow(target, true, 1, 1);
}
