import Phaser from "phaser";
import { DISPLAY } from "../config/display.ts";
import {
  FIELD_AMBIENCE_BY_MAP,
  FIELD_AMBIENCE_DEPTH,
  FIELD_AMBIENCE_REDUCED_MOTION_COUNT_SCALE,
  FIELD_AMBIENCE_TOUCH_COUNT_SCALE,
} from "../config/fieldAmbience.ts";
import type { CloudShadowConfig, FieldAmbienceProfile, MoteConfig, SunRayConfig } from "../config/fieldAmbience.ts";
import type { MapId } from "../config/maps.ts";
import {
  advanceMote,
  createMote,
  gustStrengthAt,
  planGust,
  poseMote,
  randomIn,
  scaledCount,
  wrap,
} from "./FieldAmbiencePlan.ts";
import type { GustPlan, MoteState, Random } from "./FieldAmbiencePlan.ts";

const TEXTURE = {
  cloud: "field-ambience.cloud",
  glow: "field-ambience.glow",
  leaf: "field-ambience.leaf",
  ray: "field-ambience.ray",
} as const;

const VIEW = { width: DISPLAY.width, height: DISPLAY.height } as const;
/** 画面が裏へ回った後などの大きな経過時間で、粒が一気に飛ばないようにする。 */
const MAX_STEP_MS = 100;
const FADE_IN_MS = 1200;

/**
 * 歩行マップへ環境エフェクト(雲の影・漂う粒・木漏れ日・風)をうすく重ねる。
 * 設定は`config/fieldAmbience.ts`のマップ別プロファイル。表示物はすべて画面固定(scrollFactor 0)で、
 * カメラのスクロールを視差付きで差し引いて地面に置かれているように見せる(マップの広さに関係なく数が一定)。
 * 背景・Collision・入力・セーブには触れない。更新はScene UPDATEに載せ、Scene終了時に自動で外れる。
 */
export function startFieldAmbience(scene: Phaser.Scene, mapId: MapId, random: Random = Math.random): void {
  const profile = FIELD_AMBIENCE_BY_MAP[mapId];
  if (!profile) return;
  startFieldAmbienceProfile(scene, profile, random);
}

export function startFieldAmbienceProfile(scene: Phaser.Scene, profile: FieldAmbienceProfile, random: Random = Math.random): void {
  ensureTextures(scene);
  const countScale = chooseCountScale(scene);
  // 全体の強さ。入場直後に少しずつ現れるようにする(カメラのフェードと重なっても唐突に見えない)。
  const intensity = { value: 0 };
  let elapsedMs = 0;

  const clouds = [
    ...(profile.cloudShadows ? createClouds(scene, profile.cloudShadows, "shadow", random) : []),
    ...(profile.mist ? createClouds(scene, profile.mist, "mist", random) : []),
  ];
  const rays = profile.sunRays ? createSunRays(scene, profile.sunRays, random) : [];
  const moteLayers = profile.motes.map((config) => createMoteLayer(scene, config, scaledCount(config.count, countScale), random));

  let gust: GustPlan | undefined = profile.gusts ? planGust(random, profile.gusts) : undefined;
  let gustElapsedMs = gust ? -gust.startInMs : 0;

  const update = (time: number, rawDelta: number): void => {
    const delta = Math.min(rawDelta, MAX_STEP_MS);
    elapsedMs += delta;
    intensity.value = Math.sin(Math.min(1, elapsedMs / FADE_IN_MS) * Math.PI / 2);
    const camera = scene.cameras.main;
    const { scrollX, scrollY } = camera;

    let windX = 0;
    if (gust && profile.gusts) {
      gustElapsedMs += delta;
      windX = gustStrengthAt(gustElapsedMs, gust);
      if (gustElapsedMs >= gust.durationMs) {
        gust = planGust(random, profile.gusts);
        gustElapsedMs = -gust.startInMs;
      }
    }

    for (const cloud of clouds) updateCloud(cloud, delta, windX, scrollX, scrollY, intensity.value);
    for (const ray of rays) updateSunRay(ray, time, intensity.value);
    for (const layer of moteLayers) {
      const windResponse = layer.config.kind === "leaf" ? 1 : layer.config.kind === "glow" ? 0.45 : 0.15;
      for (const mote of layer.motes) {
        advanceMote(mote.state, delta, windX, windResponse);
        const pose = poseMote(mote.state, time, scrollX, scrollY, layer.config.parallax, VIEW);
        mote.image.setPosition(pose.x, pose.y).setAlpha(pose.alpha * intensity.value);
        if (layer.config.kind === "leaf") {
          mote.image.setRotation(pose.rotation).setScale(mote.baseScale * Math.max(0.25, Math.abs(pose.flip)), mote.baseScale);
        }
      }
    }
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  const cleanup = (): void => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
}

function chooseCountScale(scene: Phaser.Scene): number {
  let scale = scene.sys.game.device.input.touch ? FIELD_AMBIENCE_TOUCH_COUNT_SCALE : 1;
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) scale *= FIELD_AMBIENCE_REDUCED_MOTION_COUNT_SCALE;
  } catch {
    // matchMediaが使えない環境では既定の数のまま。
  }
  return scale;
}

// ---- 雲の影・夜霧 ----

interface CloudRuntime {
  readonly image: Phaser.GameObjects.Image;
  readonly config: CloudShadowConfig;
  readonly alpha: number;
  readonly speedScale: number;
  baseX: number;
  baseY: number;
  readonly spanX: number;
  readonly spanY: number;
  readonly margin: number;
}

function createClouds(scene: Phaser.Scene, config: CloudShadowConfig, kind: "shadow" | "mist", random: Random): CloudRuntime[] {
  const margin = config.width.max;
  const spanX = VIEW.width + margin * 2;
  const spanY = VIEW.height + margin * 2;
  return Array.from({ length: config.count }, (_, index) => {
    const width = randomIn(random, config.width);
    const image = scene.add.image(0, 0, TEXTURE.cloud)
      .setScrollFactor(0)
      .setDepth(kind === "mist" ? FIELD_AMBIENCE_DEPTH.mist : FIELD_AMBIENCE_DEPTH.cloudShadow)
      .setBlendMode(kind === "mist" ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL)
      .setTint(config.color)
      .setAlpha(0)
      .setDisplaySize(width, width * randomIn(random, { min: 0.5, max: 0.7 }))
      .setAngle(randomIn(random, { min: -12, max: 12 }));
    return {
      image,
      config,
      alpha: randomIn(random, config.alpha),
      speedScale: randomIn(random, { min: 0.75, max: 1.25 }),
      // 横方向に等間隔ずつずらして置き、雲の影が重なって濃くなりすぎないようにする。
      baseX: (spanX / config.count) * (index + random() * 0.6),
      baseY: random() * spanY,
      spanX,
      spanY,
      margin,
    };
  });
}

function updateCloud(cloud: CloudRuntime, delta: number, windX: number, scrollX: number, scrollY: number, intensity: number): void {
  const seconds = delta / 1000;
  cloud.baseX += (cloud.config.driftX + windX * 0.25) * cloud.speedScale * seconds;
  cloud.baseY += cloud.config.driftY * cloud.speedScale * seconds;
  // 雲の影は地面に落ちているので、視差1(地面と同じ)でスクロールする。
  const x = wrap(cloud.baseX - scrollX, cloud.spanX) - cloud.margin;
  const y = wrap(cloud.baseY - scrollY, cloud.spanY) - cloud.margin;
  cloud.image.setPosition(x, y).setAlpha(cloud.alpha * intensity);
}

// ---- 木漏れ日 ----

interface SunRayRuntime {
  readonly image: Phaser.GameObjects.Image;
  readonly alpha: { readonly min: number; readonly max: number };
  readonly periodMs: number;
  readonly phase: number;
}

function createSunRays(scene: Phaser.Scene, config: SunRayConfig, random: Random): SunRayRuntime[] {
  return Array.from({ length: config.count }, (_, index) => {
    // 画面の左上から右下へ斜めに差す帯。帯ごとに位置・太さ・角度を少しずつ変える。
    const x = VIEW.width * (0.12 + index * 0.24 + random() * 0.08);
    const image = scene.add.image(x, -40, TEXTURE.ray)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(FIELD_AMBIENCE_DEPTH.sunRay)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(config.color)
      .setAlpha(0)
      .setDisplaySize(randomIn(random, { min: 90, max: 170 }), VIEW.height * 1.35)
      .setAngle(randomIn(random, { min: -34, max: -26 }));
    return { image, alpha: config.alpha, periodMs: randomIn(random, config.pulsePeriodMs), phase: random() };
  });
}

function updateSunRay(ray: SunRayRuntime, time: number, intensity: number): void {
  const wave = 0.5 + 0.5 * Math.sin((time / ray.periodMs + ray.phase) * Math.PI * 2);
  ray.image.setAlpha((ray.alpha.min + (ray.alpha.max - ray.alpha.min) * wave) * intensity);
}

// ---- 漂う粒 ----

interface MoteRuntime {
  readonly state: MoteState;
  readonly image: Phaser.GameObjects.Image;
  readonly baseScale: number;
}

interface MoteLayer {
  readonly config: MoteConfig;
  readonly motes: readonly MoteRuntime[];
}

function createMoteLayer(scene: Phaser.Scene, config: MoteConfig, count: number, random: Random): MoteLayer {
  const texture = config.kind === "leaf" ? TEXTURE.leaf : TEXTURE.glow;
  const textureWidth = config.kind === "leaf" ? 16 : 32;
  const motes = Array.from({ length: count }, () => {
    const state = createMote(random, config, VIEW);
    // glow/dustのテクスチャは縁がぼけているので、見た目の大きさより広めに表示する。
    const baseScale = (config.kind === "leaf" ? state.size : state.size * 2.4) / textureWidth;
    const image = scene.add.image(0, 0, texture)
      .setScrollFactor(0)
      .setDepth(FIELD_AMBIENCE_DEPTH.mote)
      .setTint(state.color)
      .setScale(baseScale)
      .setAlpha(0);
    if (config.kind !== "leaf") image.setBlendMode(Phaser.BlendModes.ADD);
    return { state, image, baseScale };
  });
  return { config, motes };
}

// ---- テクスチャ(起動時に一度だけCanvasで作る。画像ファイルは追加しない) ----

function ensureTextures(scene: Phaser.Scene): void {
  drawTexture(scene, TEXTURE.glow, 32, 32, (context) => {
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.3, "rgba(255,255,255,0.75)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
  });
  drawTexture(scene, TEXTURE.leaf, 16, 8, (context) => {
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.moveTo(0, 4);
    context.quadraticCurveTo(8, -1.5, 16, 4);
    context.quadraticCurveTo(8, 9.5, 0, 4);
    context.fill();
    // 葉脈の線を少しだけ暗くして、ただの楕円に見えないようにする。
    context.strokeStyle = "rgba(0,0,0,0.25)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(1, 4);
    context.lineTo(15, 4);
    context.stroke();
  });
  drawTexture(scene, TEXTURE.cloud, 256, 160, (context) => {
    // ぼけた円をいくつか重ねて、形の整いすぎない雲の影にする。中心はほぼ不透明にし、設定のalphaがそのまま影の濃さになるようにする。
    const puffs = [
      { x: 128, y: 84, r: 70 },
      { x: 78, y: 92, r: 52 },
      { x: 178, y: 90, r: 56 },
      { x: 110, y: 58, r: 46 },
      { x: 160, y: 62, r: 42 },
    ];
    for (const puff of puffs) {
      const gradient = context.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.r);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.55, "rgba(255,255,255,0.8)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 256, 160);
    }
  });
  drawTexture(scene, TEXTURE.ray, 64, 256, (context) => {
    const across = context.createLinearGradient(0, 0, 64, 0);
    across.addColorStop(0, "rgba(255,255,255,0)");
    across.addColorStop(0.5, "rgba(255,255,255,1)");
    across.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = across;
    context.fillRect(0, 0, 64, 256);
    // 差し込み口が明るく、先へ行くほど薄れる。
    context.globalCompositeOperation = "destination-in";
    const along = context.createLinearGradient(0, 0, 0, 256);
    along.addColorStop(0, "rgba(255,255,255,1)");
    along.addColorStop(0.7, "rgba(255,255,255,0.45)");
    along.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = along;
    context.fillRect(0, 0, 64, 256);
    context.globalCompositeOperation = "source-over";
  });
}

function drawTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, width, height);
  if (!canvas) return;
  draw(canvas.getContext());
  canvas.refresh();
  // 他の画像マップ背景と同じく、ぼかしの縁がドット状にならないようLINEARで表示する。
  canvas.setFilter(Phaser.Textures.FilterMode.LINEAR);
}
