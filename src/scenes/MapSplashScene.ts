import Phaser from "phaser";
import { DISPLAY } from "../config/display.ts";
import { MAP_ENTRY_SPLASHES, getEntrySplashDurationMs } from "../config/mapSplash.ts";
import type { MapId } from "../config/maps.ts";

export const MAP_SPLASH_SCENE_KEY = "MapSplashScene";

export interface MapSplashSceneData {
  readonly mapId: MapId;
  readonly sceneKey: string;
  readonly data: Record<string, string>;
}

// ゆっくり寄っていく投影感。表示時間に応じて1.00→1.045倍。
const SLOW_ZOOM_TO = 1.045;

/**
 * 町の入場演出。MapTransitionが暗転した直後に呼ばれ、画像を暗転の中でフェードイン→保持→フェードアウトしたのち、
 * 本来の遷移先Sceneへ入る。フェードアウト終了時点で画面は再び黒なので、遷移先の通常のフェードインへ途切れず続く。
 * 演出中は入力を受け付けない(このSceneはInputSystemを作らない)。
 */
export class MapSplashScene extends Phaser.Scene {
  private pending!: MapSplashSceneData;

  constructor() {
    super({ key: MAP_SPLASH_SCENE_KEY });
  }

  init(data: MapSplashSceneData): void {
    this.pending = data;
  }

  preload(): void {
    const splash = MAP_ENTRY_SPLASHES[this.pending.mapId];
    if (!splash) throw new Error(`no entry splash is defined for ${this.pending.mapId}`);
    // 同じキーは読み込み済みなら再ダウンロードされない。
    this.load.image(this.textureKey(), splash.imageUrl);
  }

  create(): void {
    const splash = MAP_ENTRY_SPLASHES[this.pending.mapId]!;
    this.cameras.main.setBackgroundColor("#000000");
    this.textures.get(this.textureKey()).setFilter(Phaser.Textures.FilterMode.LINEAR);

    const image = this.add.image(DISPLAY.width / 2, DISPLAY.height / 2, this.textureKey()).setAlpha(0);
    image.setScale(Math.max(DISPLAY.width / image.width, DISPLAY.height / image.height));
    const baseScale = image.scaleX;

    const isBottomRight = splash.captionPosition === "bottom-right";
    const caption = this.add.text(isBottomRight ? DISPLAY.width - 42 : DISPLAY.width / 2, DISPLAY.height - 42, splash.caption, {
      color: "#ffffff",
      fontFamily: "sans-serif",
      fontSize: "34px",
      fontStyle: "bold",
      stroke: "#0a1526",
      strokeThickness: 8,
    }).setOrigin(isBottomRight ? 1 : 0.5, 1).setAlpha(0);

    const total = getEntrySplashDurationMs(splash);
    // フェードイン(fadeInMs) → 保持(holdMs) → フェードアウト(fadeOutMs)を順に刻む。
    // 見た目(Tween)と同じ時計で終わらせるため、遷移先へ進むのもチェーンの完了時にする。
    this.tweens.chain({
      targets: [image, caption],
      tweens: [
        { alpha: 1, duration: splash.fadeInMs, ease: "Sine.easeInOut" },
        { alpha: 1, duration: splash.holdMs },
        { alpha: 0, duration: splash.fadeOutMs, ease: "Sine.easeInOut" },
      ],
      onComplete: () => this.scene.start(this.pending.sceneKey, this.pending.data),
    });
    this.tweens.add({ targets: image, scale: baseScale * SLOW_ZOOM_TO, duration: total, ease: "Sine.easeInOut" });
  }

  private textureKey(): string {
    return `map-splash.${this.pending.mapId}`;
  }
}
