import Phaser from "phaser";
import { DAKOHA_PORT_AMBIENCE } from "../config/dakohaPortAmbience.ts";
import type { DakohaPortAmbienceConfig, HarborGlintAnchor } from "../config/dakohaPortAmbience.ts";

interface HarborGlintRuntime {
  readonly anchor: HarborGlintAnchor;
  readonly image: Phaser.GameObjects.Image;
  readonly phase: number;
}

const TEXTURE_KEY = "dakoha-port-ambience.water-glint";

/**
 * 港の水面光と灯台の回転灯を重ねる。
 *
 * 背景の一部をコピー／変形しないため、Datamoshのような破綻や正本背景の改変は起こさない。
 * Path Tracingの「光源から水面へ届く光」を2Dで読み替えた、少数の加算合成だけの演出である。
 */
export function startDakohaPortAmbience(
  scene: Phaser.Scene,
  worldScale: number,
  config: DakohaPortAmbienceConfig = DAKOHA_PORT_AMBIENCE,
): void {
  ensureWaterGlintTexture(scene);
  const reducedMotion = prefersReducedMotion();
  const glints = config.glints.map((anchor, index) => createGlint(scene, anchor, index, worldScale, config));
  const lighthouse = scene.add.graphics().setDepth(config.lightDepth).setBlendMode(Phaser.BlendModes.ADD);
  let elapsedMs = 0;
  let sinceLighthouseDrawMs = Number.POSITIVE_INFINITY;

  const update = (_time: number, rawDelta: number): void => {
    // バックグラウンド復帰直後に大きく飛ばないよう、通常の環境演出と同じ上限を置く。
    const delta = Math.min(rawDelta, 100);
    if (!reducedMotion) elapsedMs += delta;
    sinceLighthouseDrawMs += delta;

    for (const glint of glints) poseGlint(glint, elapsedMs, worldScale, reducedMotion);
    if (sinceLighthouseDrawMs >= config.lighthouse.redrawIntervalMs) {
      drawLighthouseBeam(lighthouse, elapsedMs, worldScale, config, reducedMotion);
      sinceLighthouseDrawMs = 0;
    }
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  const cleanup = (): void => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
}

function createGlint(
  scene: Phaser.Scene,
  anchor: HarborGlintAnchor,
  index: number,
  worldScale: number,
  config: DakohaPortAmbienceConfig,
): HarborGlintRuntime {
  const image = scene.add.image(anchor.x * worldScale, anchor.y * worldScale, TEXTURE_KEY)
    .setDisplaySize(anchor.width * worldScale, anchor.height * worldScale)
    .setDepth(config.glintDepth)
    .setBlendMode(Phaser.BlendModes.ADD);
  return { anchor, image, phase: index * 0.61803398875 };
}

function poseGlint(runtime: HarborGlintRuntime, elapsedMs: number, worldScale: number, reducedMotion: boolean): void {
  const { anchor, image, phase } = runtime;
  const wave = reducedMotion ? 0.65 : 0.5 + 0.5 * Math.sin((elapsedMs / anchor.periodMs + phase) * Math.PI * 2);
  const drift = reducedMotion ? 0 : Math.sin((elapsedMs / (anchor.periodMs * 0.73) + phase) * Math.PI * 2) * anchor.driftX;
  image.setPosition((anchor.x + drift) * worldScale, anchor.y * worldScale);
  image.setAlpha(anchor.alpha * (0.35 + wave * 0.65));
  image.setScale(1 + (reducedMotion ? 0 : (wave - 0.5) * 0.14), 1);
}

function drawLighthouseBeam(
  graphics: Phaser.GameObjects.Graphics,
  elapsedMs: number,
  worldScale: number,
  config: DakohaPortAmbienceConfig,
  reducedMotion: boolean,
): void {
  const lighthouse = config.lighthouse;
  const progress = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin((elapsedMs / lighthouse.sweepPeriodMs) * Math.PI * 2);
  const angle = Phaser.Math.Linear(lighthouse.sweepDegrees.min, lighthouse.sweepDegrees.max, progress);
  const alphaWave = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin((elapsedMs / 2300) * Math.PI * 2);
  const alpha = Phaser.Math.Linear(lighthouse.alpha.min, lighthouse.alpha.max, alphaWave);
  const originX = lighthouse.origin.x * worldScale;
  const originY = lighthouse.origin.y * worldScale;
  const left = endpoint(originX, originY, angle - lighthouse.halfAngleDegrees, lighthouse.reach * worldScale);
  const right = endpoint(originX, originY, angle + lighthouse.halfAngleDegrees, lighthouse.reach * worldScale);

  graphics.clear();
  graphics.fillStyle(lighthouse.color, alpha);
  graphics.fillTriangle(originX, originY, left.x, left.y, right.x, right.y);
  // 中心を少しだけ明るくして、単色の三角形ではなく灯の芯に見せる。
  const coreLeft = endpoint(originX, originY, angle - lighthouse.halfAngleDegrees * 0.24, lighthouse.reach * worldScale);
  const coreRight = endpoint(originX, originY, angle + lighthouse.halfAngleDegrees * 0.24, lighthouse.reach * worldScale);
  graphics.fillStyle(0xffffff, alpha * 0.23);
  graphics.fillTriangle(originX, originY, coreLeft.x, coreLeft.y, coreRight.x, coreRight.y);
}

function endpoint(originX: number, originY: number, angleDegrees: number, length: number): { readonly x: number; readonly y: number } {
  const radians = Phaser.Math.DegToRad(angleDegrees);
  return { x: originX + Math.cos(radians) * length, y: originY + Math.sin(radians) * length };
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return false;
  }
}

function ensureWaterGlintTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURE_KEY)) return;
  const canvas = scene.textures.createCanvas(TEXTURE_KEY, 96, 24);
  if (!canvas) return;
  const context = canvas.getContext();
  const lines = [
    { x: 10, y: 6, width: 54, alpha: 0.14 },
    { x: 28, y: 10, width: 47, alpha: 0.42 },
    { x: 4, y: 14, width: 66, alpha: 0.25 },
    { x: 43, y: 18, width: 38, alpha: 0.16 },
  ];
  for (const line of lines) {
    const gradient = context.createLinearGradient(line.x, 0, line.x + line.width, 0);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.22, `rgba(221,249,255,${line.alpha})`);
    gradient.addColorStop(0.56, `rgba(255,255,232,${Math.min(1, line.alpha * 1.45)})`);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(line.x, line.y, line.width, 1.3);
  }
  canvas.refresh();
  canvas.setFilter(Phaser.Textures.FilterMode.LINEAR);
}
