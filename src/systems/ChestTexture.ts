import Phaser from "phaser";

/**
 * 画像マップ用の宝箱(閉)。カタログに宝箱の正式画像が無いため、ビットマップ素材を作らずにコードで描く。
 * 背景(塗り絵風の高解像度イラスト)になじむよう、木目・丸いフタ・金具・鋲・鍵穴・陰影・接地影を
 * 論理64×56の座標で描き、SCALE倍のCanvasへ描いてからLINEARで縮小表示する(拡大・Retinaでも輪郭が荒れない)。
 */
export const CHEST_TEXTURE_KEY = "object.chest.closed";
export const CHEST_GLINT_TEXTURE_KEY = "object.chest.glint";
/** 論理サイズ(表示時の縦横比)。 */
export const CHEST_LOGICAL_SIZE = { width: 64, height: 56 } as const;
const SCALE = 4;

const OUTLINE = "#2a150a";

/** 宝箱テクスチャを1度だけ作る(Scene再入時は再利用)。 */
export function ensureChestTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(CHEST_TEXTURE_KEY)) {
    const texture = scene.textures.createCanvas(CHEST_TEXTURE_KEY, CHEST_LOGICAL_SIZE.width * SCALE, CHEST_LOGICAL_SIZE.height * SCALE);
    if (texture) {
      const context = texture.getContext();
      context.scale(SCALE, SCALE);
      drawChest(context);
      texture.refresh();
      texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }
  if (!scene.textures.exists(CHEST_GLINT_TEXTURE_KEY)) {
    const size = 16 * SCALE;
    const texture = scene.textures.createCanvas(CHEST_GLINT_TEXTURE_KEY, size, size);
    if (texture) {
      drawGlint(texture.getContext(), size);
      texture.refresh();
      texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }
}

/**
 * 判定(bounds)の幅に合わせ、論理64×56の縦横比のまま宝箱を表示する。下端は判定の下端にそろえる。
 * フタの左上の角で、ときどき小さく光る(調べられる物だと分かるように)。centerはboundsの中心(ワールド座標)。
 * 2026-09-27: StartingForestSceneの実装を、レインランドのもり(その2)の宝箱と共有するためここへ移した。
 */
export function createChestVisual(
  scene: Phaser.Scene,
  center: { readonly x: number; readonly y: number },
  bounds: { readonly width: number; readonly height: number },
): Phaser.GameObjects.Container {
  ensureChestTextures(scene);
  const width = Math.max(40, bounds.width * 1.0);
  const height = width * (CHEST_LOGICAL_SIZE.height / CHEST_LOGICAL_SIZE.width);
  const chest = scene.add.image(0, bounds.height / 2, CHEST_TEXTURE_KEY).setOrigin(0.5, 1).setDisplaySize(width, height);
  const glint = scene.add.image(-width * 0.2, bounds.height / 2 - height * 0.78, CHEST_GLINT_TEXTURE_KEY)
    .setDisplaySize(width * 0.3, width * 0.3).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({
    targets: glint,
    alpha: { from: 0, to: 0.9 },
    scale: { from: glint.scale * 0.4, to: glint.scale },
    angle: { from: 0, to: 45 },
    duration: 320,
    yoyo: true,
    repeat: -1,
    repeatDelay: 2600,
    ease: "Sine.easeOut",
  });
  return scene.add.container(center.x, center.y, [chest, glint]).setDepth(950 + center.y * 0.01);
}

function drawChest(ctx: CanvasRenderingContext2D): void {
  const left = 6;
  const right = 58;
  const seamY = 27;
  const bottomY = 49;
  const lidTopY = 11;
  const random = seededRandom(0x5eed);

  // 接地影(やわらかい楕円)。
  const shadowY = 51.5 / 0.3;
  const shadow = ctx.createRadialGradient(32, shadowY, 4, 32, shadowY, 32);
  shadow.addColorStop(0, "rgba(10, 20, 8, 0.6)");
  shadow.addColorStop(0.6, "rgba(10, 20, 8, 0.3)");
  shadow.addColorStop(1, "rgba(10, 20, 8, 0)");
  ctx.save();
  ctx.scale(1, 0.3);
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(32, shadowY, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 本体(前面)。上が明るく下が暗い木の色。
  const bodyPath = (): void => roundedRectPath(ctx, left, seamY, right - left, bottomY - seamY, 2.5);
  const bodyFill = ctx.createLinearGradient(0, seamY, 0, bottomY);
  bodyFill.addColorStop(0, "#9a5528");
  bodyFill.addColorStop(0.55, "#7a3f1c");
  bodyFill.addColorStop(1, "#4e2610");
  bodyPath();
  ctx.fillStyle = bodyFill;
  ctx.fill();
  ctx.save();
  bodyPath();
  ctx.clip();
  drawPlanks(ctx, left, seamY, right - left, bottomY - seamY, random, "horizontal");
  // 下端の陰(地面に近いほど暗い)。
  const occlusion = ctx.createLinearGradient(0, bottomY - 7, 0, bottomY);
  occlusion.addColorStop(0, "rgba(20, 8, 2, 0)");
  occlusion.addColorStop(1, "rgba(20, 8, 2, 0.45)");
  ctx.fillStyle = occlusion;
  ctx.fillRect(left, bottomY - 7, right - left, 7);
  ctx.restore();

  // フタ(かまぼこ型)。上面は光を受けて明るい。
  const lidPath = (): void => {
    ctx.beginPath();
    ctx.moveTo(left - 1, seamY + 0.5);
    ctx.lineTo(left - 1, lidTopY + 7);
    ctx.bezierCurveTo(left - 1, lidTopY - 1, right + 1, lidTopY - 1, right + 1, lidTopY + 7);
    ctx.lineTo(right + 1, seamY + 0.5);
    ctx.closePath();
  };
  const lidFill = ctx.createLinearGradient(0, lidTopY, 0, seamY);
  lidFill.addColorStop(0, "#d58a46");
  lidFill.addColorStop(0.35, "#b0652e");
  lidFill.addColorStop(1, "#7c3f1a");
  lidPath();
  ctx.fillStyle = lidFill;
  ctx.fill();
  ctx.save();
  lidPath();
  ctx.clip();
  drawPlanks(ctx, left - 1, lidTopY, right - left + 2, seamY - lidTopY, random, "vertical");
  // 左上からの光のつや。
  const sheen = ctx.createRadialGradient(22, lidTopY + 3, 1, 22, lidTopY + 3, 20);
  sheen.addColorStop(0, "rgba(255, 226, 170, 0.45)");
  sheen.addColorStop(1, "rgba(255, 226, 170, 0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(left - 1, lidTopY - 2, right - left + 2, seamY - lidTopY + 2);
  ctx.restore();

  // フタの下の影(フタが本体に少しかぶる)。
  ctx.fillStyle = "rgba(25, 10, 3, 0.5)";
  ctx.fillRect(left, seamY + 1.5, right - left, 2);

  // 金具: 左右の縦帯(フタから本体まで)、フタの縁、底の縁。
  for (const x of [left + 3, right - 9]) {
    drawGoldBand(ctx, x, lidTopY + 3.5, 6, bottomY - lidTopY - 4, "vertical");
  }
  drawGoldBand(ctx, left - 1.5, seamY - 1.5, right - left + 3, 3.6, "horizontal");
  drawGoldBand(ctx, left - 0.5, bottomY - 3.2, right - left + 1, 3.2, "horizontal");

  // 鋲。
  for (const x of [left + 6, right - 6]) {
    for (const y of [seamY + 6, seamY + 14, lidTopY + 9]) drawRivet(ctx, x, y);
  }

  // 錠前の板と鍵穴。
  drawLockPlate(ctx, 32, seamY + 1);

  // 輪郭(背景イラストの線の強さに合わせて細め)。
  ctx.lineJoin = "round";
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = OUTLINE;
  lidPath();
  ctx.stroke();
  bodyPath();
  ctx.stroke();

  // 縁のハイライト(左上の稜線)。
  ctx.strokeStyle = "rgba(255, 220, 160, 0.55)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(left + 0.2, seamY - 2);
  ctx.lineTo(left + 0.2, lidTopY + 7);
  ctx.bezierCurveTo(left + 0.2, lidTopY + 0.5, 30, lidTopY - 0.2, 34, lidTopY + 0.3);
  ctx.stroke();
}

/** 板の継ぎ目と木目。 */
function drawPlanks(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  random: () => number,
  direction: "horizontal" | "vertical",
): void {
  const plankCount = direction === "horizontal" ? 3 : 5;
  const along = direction === "horizontal" ? height : width;
  const step = along / plankCount;
  // 継ぎ目。
  ctx.strokeStyle = "rgba(35, 14, 4, 0.7)";
  ctx.lineWidth = 0.7;
  for (let index = 1; index < plankCount; index += 1) {
    ctx.beginPath();
    if (direction === "horizontal") {
      ctx.moveTo(x, y + step * index);
      ctx.lineTo(x + width, y + step * index);
    } else {
      ctx.moveTo(x + step * index, y);
      ctx.lineTo(x + step * index, y + height);
    }
    ctx.stroke();
    // 継ぎ目のすぐ下(右)の光。
    ctx.strokeStyle = "rgba(255, 200, 140, 0.18)";
    ctx.beginPath();
    if (direction === "horizontal") {
      ctx.moveTo(x, y + step * index + 0.7);
      ctx.lineTo(x + width, y + step * index + 0.7);
    } else {
      ctx.moveTo(x + step * index + 0.7, y);
      ctx.lineTo(x + step * index + 0.7, y + height);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(35, 14, 4, 0.7)";
  }
  // 木目(ゆるく波打つ細線)。
  ctx.lineWidth = 0.35;
  const grainCount = direction === "horizontal" ? 14 : 18;
  for (let index = 0; index < grainCount; index += 1) {
    const offset = random() * along;
    const dark = random() < 0.6;
    ctx.strokeStyle = dark ? `rgba(40, 16, 4, ${0.18 + random() * 0.2})` : `rgba(255, 196, 130, ${0.08 + random() * 0.12})`;
    const start = random() * 0.3;
    const end = 0.7 + random() * 0.3;
    const wave = 0.3 + random() * 0.6;
    ctx.beginPath();
    if (direction === "horizontal") {
      const x0 = x + width * start;
      const x1 = x + width * end;
      ctx.moveTo(x0, y + offset);
      ctx.bezierCurveTo(x0 + (x1 - x0) / 3, y + offset - wave, x0 + (2 * (x1 - x0)) / 3, y + offset + wave, x1, y + offset);
    } else {
      const y0 = y + height * start;
      const y1 = y + height * end;
      ctx.moveTo(x + offset, y0);
      ctx.bezierCurveTo(x + offset - wave, y0 + (y1 - y0) / 3, x + offset + wave, y0 + (2 * (y1 - y0)) / 3, x + offset, y1);
    }
    ctx.stroke();
  }
  // 節(ふし)を1つ。
  const knotX = x + width * (0.25 + random() * 0.5);
  const knotY = y + height * (0.3 + random() * 0.4);
  ctx.fillStyle = "rgba(45, 18, 5, 0.35)";
  ctx.beginPath();
  ctx.ellipse(knotX, knotY, 1.4, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
}

function goldGradient(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  gradient.addColorStop(0, "#fff1a8");
  gradient.addColorStop(0.3, "#f2c24a");
  gradient.addColorStop(0.65, "#c98a1e");
  gradient.addColorStop(1, "#7e4f0c");
  return gradient;
}

function drawGoldBand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  direction: "horizontal" | "vertical",
): void {
  ctx.fillStyle = direction === "vertical" ? goldGradient(ctx, x, 0, x + width, 0) : goldGradient(ctx, 0, y, 0, y + height);
  roundedRectPath(ctx, x, y, width, height, 1);
  ctx.fill();
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = "#5a3406";
  ctx.stroke();
  // 金属の細いハイライト。
  ctx.strokeStyle = "rgba(255, 252, 220, 0.8)";
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  if (direction === "vertical") {
    ctx.moveTo(x + 1.1, y + 1);
    ctx.lineTo(x + 1.1, y + height - 1);
  } else {
    ctx.moveTo(x + 1, y + 0.8);
    ctx.lineTo(x + width - 1, y + 0.8);
  }
  ctx.stroke();
}

function drawRivet(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const gradient = ctx.createRadialGradient(x - 0.4, y - 0.4, 0.1, x, y, 1.2);
  gradient.addColorStop(0, "#fffbe0");
  gradient.addColorStop(0.5, "#e0a93a");
  gradient.addColorStop(1, "#6a400a");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 1.15, 0, Math.PI * 2);
  ctx.fill();
}

/** 盾形の錠前板と鍵穴。(cx, top)は板の上端中央。 */
function drawLockPlate(ctx: CanvasRenderingContext2D, cx: number, top: number): void {
  const halfWidth = 5.5;
  const height = 12;
  const platePath = (): void => {
    ctx.beginPath();
    ctx.moveTo(cx - halfWidth, top - 3);
    ctx.lineTo(cx + halfWidth, top - 3);
    ctx.lineTo(cx + halfWidth, top + height * 0.5);
    ctx.quadraticCurveTo(cx + halfWidth, top + height - 1.5, cx, top + height);
    ctx.quadraticCurveTo(cx - halfWidth, top + height - 1.5, cx - halfWidth, top + height * 0.5);
    ctx.closePath();
  };
  // 板の落ち影。
  ctx.save();
  ctx.translate(0.6, 0.9);
  platePath();
  ctx.fillStyle = "rgba(25, 10, 3, 0.45)";
  ctx.fill();
  ctx.restore();
  platePath();
  ctx.fillStyle = goldGradient(ctx, cx - halfWidth, top - 3, cx + halfWidth, top + height);
  ctx.fill();
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = "#4e2d05";
  ctx.stroke();
  // 内側の縁取り。
  ctx.save();
  ctx.translate(cx, top + 3.5);
  ctx.scale(0.72, 0.72);
  ctx.translate(-cx, -(top + 3.5));
  platePath();
  ctx.strokeStyle = "rgba(120, 72, 10, 0.7)";
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.restore();
  // 鍵穴。
  ctx.fillStyle = "#1b0c03";
  ctx.beginPath();
  ctx.arc(cx, top + 3.4, 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 0.8, top + 3.8);
  ctx.lineTo(cx + 0.8, top + 3.8);
  ctx.lineTo(cx + 1.2, top + 7.4);
  ctx.lineTo(cx - 1.2, top + 7.4);
  ctx.closePath();
  ctx.fill();
  // 板の上のつや。
  ctx.fillStyle = "rgba(255, 255, 230, 0.55)";
  ctx.beginPath();
  ctx.ellipse(cx - 2.6, top - 1, 1.6, 0.6, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

/** 4方向に伸びる小さなきらめき(十字の光)。 */
function drawGlint(ctx: CanvasRenderingContext2D, size: number): void {
  const center = size / 2;
  const halo = ctx.createRadialGradient(center, center, 0, center, center, center * 0.55);
  halo.addColorStop(0, "rgba(255, 250, 215, 0.95)");
  halo.addColorStop(1, "rgba(255, 236, 160, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "rgba(255, 252, 230, 0.95)";
  for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
    ctx.beginPath();
    ctx.moveTo(center - dx * center, center - dy * center);
    ctx.lineTo(center + dy * size * 0.05, center + dx * size * 0.05);
    ctx.lineTo(center + dx * center, center + dy * center);
    ctx.lineTo(center - dy * size * 0.05, center - dx * size * 0.05);
    ctx.closePath();
    ctx.fill();
  }
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/** 毎回同じ木目になるよう固定シードの乱数を使う。 */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
