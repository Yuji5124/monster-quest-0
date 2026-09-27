import Phaser from "phaser";
import { WORLD_MAP_CLOUDS } from "../config/worldMapPresentation.ts";
import type { WorldMapCloudLayerConfig } from "../config/worldMapPresentation.ts";
import { randomIn, wrap } from "./FieldAmbiencePlan.ts";
import type { Random } from "./FieldAmbiencePlan.ts";

const TEXTURE = {
  puff: "world-map.cloud-puff",
  wisp: "world-map.cloud-wisp",
} as const;

interface MapSize {
  readonly width: number;
  readonly height: number;
}

interface CloudRuntime {
  readonly parts: readonly { readonly image: Phaser.GameObjects.Image; readonly dx: number; readonly dy: number; readonly alpha: number }[];
  readonly speed: number;
  readonly bobPeriodMs: number;
  readonly phase: number;
  readonly bob: number;
  readonly margin: number;
  baseX: number;
  readonly y: number;
}

/**
 * 世界地図の上空をゆっくり流れる雲を作る。雲は地図(ワールド座標)に置くので、行き先選択時のズーム・パンにも一緒に付いてくる。
 * 戻り値の表示物はHUD用Cameraから除外する必要がある(WorldMapSceneがhudCamera.ignoreへ渡す)。
 * 更新はScene UPDATEに載せ、Scene終了時に外す。地点の判定・入力・セーブには触れない。
 */
export function startWorldMapClouds(scene: Phaser.Scene, map: MapSize, random: Random = Math.random): Phaser.GameObjects.GameObject[] {
  ensureTextures(scene);
  const cfg = WORLD_MAP_CLOUDS;
  const clouds = [
    ...createLayer(scene, cfg.clouds, "cloud", map, random),
    ...createLayer(scene, cfg.wisps, "wisp", map, random),
  ];

  let elapsedMs = 0;
  const update = (_time: number, rawDelta: number): void => {
    const delta = Math.min(rawDelta, 100);
    elapsedMs += delta;
    const fade = Math.sin(Math.min(1, elapsedMs / cfg.fadeInMs) * Math.PI / 2);
    // 風の強さがゆっくり増減する。全部の雲が同じ速さで平行移動するだけに見えないようにする。
    const gust = 1 + Math.sin((elapsedMs / cfg.gustPeriodMs) * Math.PI * 2) * cfg.gustAmount;
    for (const cloud of clouds) {
      cloud.baseX += cloud.speed * gust * (delta / 1000);
      const x = wrap(cloud.baseX, map.width + cloud.margin * 2) - cloud.margin;
      const y = cloud.y + Math.sin((elapsedMs / cloud.bobPeriodMs + cloud.phase) * Math.PI * 2) * cloud.bob;
      for (const part of cloud.parts) part.image.setPosition(x + part.dx, y + part.dy).setAlpha(part.alpha * fade);
    }
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  const cleanup = (): void => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  return clouds.flatMap((cloud) => cloud.parts.map((part) => part.image));
}

function createLayer(scene: Phaser.Scene, layer: WorldMapCloudLayerConfig, kind: "cloud" | "wisp", map: MapSize, random: Random): CloudRuntime[] {
  const cfg = WORLD_MAP_CLOUDS;
  // 影のずれぶんも含めて、画面端で雲がぱっと消えない余白を取る。
  const margin = layer.width.max / 2 + cfg.shadowOffset.x;
  const span = map.width + margin * 2;
  return Array.from({ length: layer.count }, (_, index) => {
    const width = randomIn(random, layer.width);
    const height = width * randomIn(random, layer.aspect);
    const alpha = randomIn(random, layer.alpha);
    const flip = random() < 0.5;
    const angle = randomIn(random, { min: -6, max: 6 });
    const make = (texture: string, depth: number, tint: number): Phaser.GameObjects.Image =>
      scene.add.image(0, 0, texture).setDisplaySize(width, height).setFlipX(flip).setAngle(angle)
        .setDepth(depth).setTint(tint).setAlpha(0);
    const parts = kind === "cloud"
      ? [
        { image: make(TEXTURE.puff, cfg.depth.shadow, cfg.shadowColor), dx: cfg.shadowOffset.x, dy: cfg.shadowOffset.y, alpha: cfg.shadowAlpha },
        { image: make(TEXTURE.puff, cfg.depth.underside, cfg.undersideColor), dx: 0, dy: height * 0.08, alpha },
        { image: make(TEXTURE.puff, cfg.depth.cloud, 0xffffff), dx: 0, dy: 0, alpha },
      ]
      : [{ image: make(TEXTURE.wisp, cfg.depth.wisp, 0xffffff), dx: 0, dy: 0, alpha }];
    return {
      parts,
      speed: randomIn(random, layer.speed),
      bobPeriodMs: randomIn(random, { min: 6000, max: 11000 }),
      phase: random(),
      bob: layer.bob,
      margin,
      // 横は等間隔にずらし、縦は地図の上下に散らす(雲が1か所に固まらないようにする)。
      baseX: (span / layer.count) * (index + random() * 0.7),
      y: map.height * ((index + 0.2 + random() * 0.6) / layer.count),
    };
  });
}

// ---- テクスチャ(Canvasで一度だけ作る。画像ファイルは追加しない) ----

function ensureTextures(scene: Phaser.Scene): void {
  drawTexture(scene, TEXTURE.puff, 256, 160, (context) => {
    // 丸いかたまりを重ねた積雲。すべてのかたまりをCanvasの内側へ収め、縁が直線で切れないようにする。
    const puffs = [
      { x: 68, y: 100, r: 38 },
      { x: 112, y: 86, r: 46 },
      { x: 162, y: 90, r: 44 },
      { x: 200, y: 106, r: 32 },
      { x: 138, y: 58, r: 36 },
      { x: 92, y: 62, r: 28 },
      { x: 128, y: 112, r: 38 },
    ];
    for (const puff of puffs) {
      const gradient = context.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.r);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.62, "rgba(255,255,255,0.9)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 256, 160);
    }
  });
  drawTexture(scene, TEXTURE.wisp, 256, 64, (context) => {
    context.save();
    context.scale(1, 0.25);
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.45)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    context.restore();
  });
}

function drawTexture(scene: Phaser.Scene, key: string, width: number, height: number, draw: (context: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, width, height);
  if (!canvas) return;
  draw(canvas.getContext());
  canvas.refresh();
  canvas.setFilter(Phaser.Textures.FilterMode.LINEAR);
}
