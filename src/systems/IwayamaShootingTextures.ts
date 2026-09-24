import Phaser from "phaser";
import { DISPLAY } from "../config/display.ts";
import { IWAYAMA_SHOOTING } from "../config/iwayamaShooting.ts";
import type { ShootingRockKind } from "../config/iwayamaShooting.ts";
import { createSeededRandom } from "./IwayamaShooting.ts";

/**
 * 崩落シューティング用の見た目を、画像ファイルを増やさずCanvasで一度だけ描く(Game全体のTextureManagerに残り、再入場では描き直さない)。
 * 色はいわやまのどうくつの背景(茶灰色の岩肌・燭台の橙)に合わせた。正式素材が用意されたら同じキーの画像へ差し替えられる。
 */
export const SHOOTING_TEXTURES = {
  rock: (kind: ShootingRockKind) => `iwsh.rock.${kind}`,
  arrow: "iwsh.arrow",
  glow: "iwsh.glow",
  dust: "iwsh.dust",
  shard: "iwsh.shard",
  spark: "iwsh.spark",
  /** 地面に落ちる影(岩・人物・敵・落石の予兆)。 */
  shadow: "iwsh.shadow",
  /** 見下ろしの洞窟の床(縦に継ぎ目なく並ぶ)。 */
  floor: "iwsh.v.floor",
  /** 通路の左右の岩壁(床と同じ速さで流れる)。 */
  walls: "iwsh.v.walls",
  /** 手前にかぶる暗い岩の張り出し(床より少し速く流れる)。 */
  fore: "iwsh.v.fore",
  /** 画面の上を横切って道を塞ぐ巨大岩壁。 */
  wall: "iwsh.v.wall",
  /** 崩れた岩壁の向こうの明るい空間。 */
  light: "iwsh.v.light",
} as const;

/** 背景の縦の繰り返し単位。 */
const TILE_HEIGHT = 1024;

export function ensureShootingTextures(scene: Phaser.Scene): void {
  for (const kind of ["small", "medium", "large", "explosive"] as const) {
    const radius = IWAYAMA_SHOOTING.rocks[kind].radius;
    drawCanvas(scene, SHOOTING_TEXTURES.rock(kind), radius * 2 + 8, radius * 2 + 8, (context) => drawRock(context, kind, radius));
  }
  drawCanvas(scene, SHOOTING_TEXTURES.arrow, 60, 14, drawArrow);
  drawCanvas(scene, SHOOTING_TEXTURES.glow, 64, 64, (context) => drawRadial(context, 32, "rgba(255,255,255,1)", "rgba(255,255,255,0)"));
  drawCanvas(scene, SHOOTING_TEXTURES.dust, 40, 40, (context) => drawRadial(context, 20, "rgba(176,156,134,0.6)", "rgba(176,156,134,0)"));
  drawCanvas(scene, SHOOTING_TEXTURES.spark, 8, 8, (context) => drawRadial(context, 4, "rgba(255,236,190,1)", "rgba(255,150,60,0)"));
  drawCanvas(scene, SHOOTING_TEXTURES.shadow, 64, 32, (context) => {
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 32);
    gradient.addColorStop(0, "rgba(10,6,4,0.62)");
    gradient.addColorStop(0.6, "rgba(10,6,4,0.4)");
    gradient.addColorStop(1, "rgba(10,6,4,0)");
    context.fillStyle = gradient;
    context.scale(1, 0.5);
    context.fillRect(0, 0, 64, 64);
  });
  drawCanvas(scene, SHOOTING_TEXTURES.shard, 12, 10, (context) => {
    context.fillStyle = "#8f7b67";
    context.beginPath();
    context.moveTo(1, 9);
    context.lineTo(6, 1);
    context.lineTo(11, 7);
    context.closePath();
    context.fill();
    context.fillStyle = "#b7a189";
    context.fillRect(5, 3, 2, 2);
  });
  drawCanvas(scene, SHOOTING_TEXTURES.floor, DISPLAY.width, TILE_HEIGHT, drawFloor);
  drawCanvas(scene, SHOOTING_TEXTURES.walls, DISPLAY.width, TILE_HEIGHT, drawSideWalls);
  drawCanvas(scene, SHOOTING_TEXTURES.fore, DISPLAY.width, TILE_HEIGHT, drawForeLayer);
  drawCanvas(scene, SHOOTING_TEXTURES.wall, DISPLAY.width, IWAYAMA_SHOOTING.wall.height + 40, drawWall);
  drawCanvas(scene, SHOOTING_TEXTURES.light, DISPLAY.width, IWAYAMA_SHOOTING.wall.height + 40, drawLightBeyond);
}

function drawCanvas(scene: Phaser.Scene, key: string, width: number, height: number, draw: (context: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return;
  draw(texture.getContext());
  texture.refresh();
}

function drawRadial(context: CanvasRenderingContext2D, radius: number, inner: string, outer: string): void {
  const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  context.fillStyle = gradient;
  context.fillRect(0, 0, radius * 2, radius * 2);
}

function jaggedPolygon(random: () => number, cx: number, cy: number, radius: number, points: number, roughness: number): [number, number][] {
  return Array.from({ length: points }, (_, index) => {
    const angle = (Math.PI * 2 * index) / points + (random() - 0.5) * 0.3;
    const distance = radius * (1 - roughness + random() * roughness);
    return [cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance];
  });
}

function fillPolygon(context: CanvasRenderingContext2D, points: readonly [number, number][]): void {
  context.beginPath();
  points.forEach(([x, y], index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
  context.closePath();
  context.fill();
}

function drawRock(context: CanvasRenderingContext2D, kind: ShootingRockKind, radius: number): void {
  const random = createSeededRandom(kind.length * 977 + radius);
  const center = radius + 4;
  const explosive = kind === "explosive";
  const outline = jaggedPolygon(random, center, center, radius, kind === "small" ? 9 : 13, 0.2);
  // 影 → 本体(左上から光) → 縁
  context.fillStyle = explosive ? "#1a1312" : "#3b3129";
  fillPolygon(context, outline.map(([x, y]) => [x + 1.5, y + 2]));
  const gradient = context.createRadialGradient(center - radius * 0.35, center - radius * 0.4, radius * 0.1, center, center, radius * 1.05);
  gradient.addColorStop(0, explosive ? "#5d4640" : "#b6a088");
  gradient.addColorStop(0.55, explosive ? "#3b2d2a" : "#85725f");
  gradient.addColorStop(1, explosive ? "#211818" : "#4d4036");
  context.fillStyle = gradient;
  fillPolygon(context, outline);
  // 岩肌の粒
  for (let index = 0; index < radius * 1.4; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = random() * radius * 0.8;
    context.fillStyle = random() > 0.5 ? "rgba(255,240,220,0.12)" : "rgba(20,12,8,0.18)";
    context.fillRect(center + Math.cos(angle) * distance, center + Math.sin(angle) * distance, 2, 2);
  }
  if (explosive) {
    // 赤〜橙に光る亀裂
    context.shadowColor = "rgba(255,120,40,0.95)";
    context.shadowBlur = 7;
    context.lineCap = "round";
    for (const [width, color] of [[3.2, "#ff5a1f"], [1.4, "#ffd28a"]] as const) {
      context.strokeStyle = color;
      context.lineWidth = width;
      const crackRandom = createSeededRandom(4242);
      for (let crack = 0; crack < 4; crack += 1) {
        const angle = (Math.PI * 2 * crack) / 4 + crackRandom() * 0.6;
        context.beginPath();
        context.moveTo(center, center);
        let x = center;
        let y = center;
        for (let step = 1; step <= 3; step += 1) {
          x = center + Math.cos(angle + (crackRandom() - 0.5) * 0.7) * radius * 0.28 * step;
          y = center + Math.sin(angle + (crackRandom() - 0.5) * 0.7) * radius * 0.28 * step;
          context.lineTo(x, y);
        }
        context.stroke();
      }
    }
    context.shadowBlur = 0;
    const core = context.createRadialGradient(center, center, 0, center, center, radius * 0.35);
    core.addColorStop(0, "rgba(255,220,150,0.95)");
    core.addColorStop(1, "rgba(255,90,30,0)");
    context.fillStyle = core;
    context.fillRect(0, 0, center * 2, center * 2);
  } else if (kind !== "small") {
    context.strokeStyle = "rgba(40,30,24,0.7)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(center - radius * 0.3, center - radius * 0.5);
    context.lineTo(center - radius * 0.05, center - radius * 0.05);
    context.lineTo(center + radius * 0.3, center + radius * 0.15);
    context.stroke();
  }
  context.strokeStyle = explosive ? "rgba(10,6,6,0.9)" : "rgba(40,30,24,0.85)";
  context.lineWidth = 2;
  context.beginPath();
  outline.forEach(([x, y], index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
  context.closePath();
  context.stroke();
}

/** タロサの矢。やじり・矢柄・矢羽根。青白い光の尾はScene側で加算合成の光を重ねる。 */
function drawArrow(context: CanvasRenderingContext2D): void {
  context.strokeStyle = "#c9a16a";
  context.lineWidth = 2.6;
  context.beginPath();
  context.moveTo(8, 7);
  context.lineTo(48, 7);
  context.stroke();
  context.fillStyle = "#eef4fb";
  context.beginPath();
  context.moveTo(59, 7);
  context.lineTo(47, 2);
  context.lineTo(50, 7);
  context.lineTo(47, 12);
  context.closePath();
  context.fill();
  context.fillStyle = "#e9e4da";
  for (const offset of [-1, 1]) {
    context.beginPath();
    context.moveTo(3, 7 + offset * 5);
    context.lineTo(14, 7 + offset * 1);
    context.lineTo(9, 7 + offset * 1);
    context.lineTo(0, 7 + offset * 5);
    context.closePath();
    context.fill();
  }
}

/** 縦に継ぎ目なく並ぶよう、はみ出した形を上下へ折り返して描く。 */
function wrapped(y: number, draw: (y: number) => void): void {
  draw(y);
  if (y < 160) draw(y + TILE_HEIGHT);
  if (y > TILE_HEIGHT - 160) draw(y - TILE_HEIGHT);
}

const PASSAGE_LEFT = IWAYAMA_SHOOTING.lanes.min + IWAYAMA_SHOOTING.laneOffsetX;
const PASSAGE_RIGHT = IWAYAMA_SHOOTING.lanes.max + IWAYAMA_SHOOTING.laneOffsetX;

/** 見下ろしの洞窟の床: 土と平たい石、ひび、小石。通路の中央ほど少し明るい(燭台の明かり)。 */
function drawFloor(context: CanvasRenderingContext2D): void {
  const random = createSeededRandom(11);
  context.fillStyle = "#4a3e33";
  context.fillRect(0, 0, DISPLAY.width, TILE_HEIGHT);
  // 土のむら
  for (let index = 0; index < 260; index += 1) {
    const x = random() * DISPLAY.width;
    const y = random() * TILE_HEIGHT;
    const radius = 20 + random() * 60;
    const shade = random() > 0.5 ? "rgba(96,80,64,0.22)" : "rgba(30,22,16,0.22)";
    const angle = random() * Math.PI;
    wrapped(y, (drawY) => {
      context.fillStyle = shade;
      context.beginPath();
      context.ellipse(x, drawY, radius, radius * 0.7, angle, 0, Math.PI * 2);
      context.fill();
    });
  }
  // 平たい石(地面に埋まった岩)。撃てる岩(明るく、縁取りと影がある)と見間違えないよう、低く暗く・輪郭をぼかす。
  for (let index = 0; index < 60; index += 1) {
    const x = PASSAGE_LEFT - 20 + random() * (PASSAGE_RIGHT - PASSAGE_LEFT + 40);
    const y = random() * TILE_HEIGHT;
    const radius = 14 + random() * 30;
    const points = jaggedPolygon(random, 0, 0, radius, 8, 0.3);
    const light = Math.floor(66 + random() * 14);
    wrapped(y, (drawY) => {
      context.fillStyle = `rgba(${light},${light - 10},${light - 22},0.7)`;
      fillPolygon(context, points.map(([px, py]) => [x + px, drawY + py * 0.6]));
      context.fillStyle = "rgba(20,14,10,0.25)";
      fillPolygon(context, points.map(([px, py]) => [x + px * 0.8 + 1, drawY + py * 0.45 + 3]));
    });
  }
  // ひび
  context.strokeStyle = "rgba(18,12,8,0.55)";
  context.lineWidth = 2;
  for (let index = 0; index < 26; index += 1) {
    let x = PASSAGE_LEFT + random() * (PASSAGE_RIGHT - PASSAGE_LEFT);
    let y = 60 + random() * (TILE_HEIGHT - 120);
    context.beginPath();
    context.moveTo(x, y);
    for (let step = 0; step < 4; step += 1) {
      x += (random() - 0.5) * 40;
      y += (random() - 0.5) * 40;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  // 小石
  for (let index = 0; index < 700; index += 1) {
    context.fillStyle = random() > 0.4 ? "rgba(170,150,124,0.5)" : "rgba(14,10,8,0.5)";
    context.fillRect(random() * DISPLAY.width, random() * TILE_HEIGHT, 2 + random() * 2, 2);
  }
  // 通路の中央は明るく、壁ぎわは暗く
  const light = context.createLinearGradient(PASSAGE_LEFT - 60, 0, PASSAGE_RIGHT + 60, 0);
  light.addColorStop(0, "rgba(0,0,0,0.45)");
  light.addColorStop(0.5, "rgba(255,200,130,0.08)");
  light.addColorStop(1, "rgba(0,0,0,0.45)");
  context.fillStyle = light;
  context.fillRect(0, 0, DISPLAY.width, TILE_HEIGHT);
}

/** 通路の左右の岩壁。上から見た岩の頭(明るい)と、通路側へ落ちる影。 */
function drawSideWalls(context: CanvasRenderingContext2D): void {
  const random = createSeededRandom(37);
  const edge = (base: number, side: -1 | 1): number[] => {
    const values: number[] = [];
    for (let y = 0; y <= TILE_HEIGHT; y += 16) values.push(base + side * (random() * 28));
    values[values.length - 1] = values[0];
    return values;
  };
  const leftEdge = edge(PASSAGE_LEFT - 16, -1);
  const rightEdge = edge(PASSAGE_RIGHT + 16, 1);
  const wallShape = (values: number[], outerX: number, color: string, shift = 0): void => {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(outerX, 0);
    values.forEach((value, index) => context.lineTo(value + shift, index * 16));
    context.lineTo(outerX, TILE_HEIGHT);
    context.closePath();
    context.fill();
  };
  // 通路へ落ちる影 → 壁の側面 → 岩の頭
  wallShape(leftEdge, 0, "rgba(8,5,4,0.55)", 22);
  wallShape(rightEdge, DISPLAY.width, "rgba(8,5,4,0.55)", -10);
  wallShape(leftEdge, 0, "#2b231d", 10);
  wallShape(rightEdge, DISPLAY.width, "#2b231d", -4);
  wallShape(leftEdge, 0, "#5a4b3e");
  wallShape(rightEdge, DISPLAY.width, "#5a4b3e");
  // 岩の頭のでこぼこ(丸い岩の集まり)
  for (let index = 0; index < 150; index += 1) {
    const left = index % 2 === 0;
    const y = random() * TILE_HEIGHT;
    const x = left ? random() * (PASSAGE_LEFT - 60) : PASSAGE_RIGHT + 60 + random() * (DISPLAY.width - PASSAGE_RIGHT - 60);
    const radius = 18 + random() * 36;
    const points = jaggedPolygon(random, 0, 0, radius, 9, 0.3);
    const light = Math.floor(78 + random() * 40);
    wrapped(y, (drawY) => {
      context.fillStyle = "rgba(10,6,4,0.5)";
      fillPolygon(context, points.map(([px, py]) => [x + px + 4, drawY + py + 6]));
      context.fillStyle = `rgb(${light},${light - 14},${light - 28})`;
      fillPolygon(context, points.map(([px, py]) => [x + px, drawY + py]));
      context.fillStyle = "rgba(255,236,200,0.14)";
      fillPolygon(context, points.map(([px, py]) => [x + px * 0.55 - radius * 0.2, drawY + py * 0.55 - radius * 0.2]));
    });
  }
  context.strokeStyle = "rgba(200,176,146,0.45)";
  context.lineWidth = 2;
  for (const values of [leftEdge, rightEdge]) {
    context.beginPath();
    values.forEach((value, index) => (index === 0 ? context.moveTo(value, 0) : context.lineTo(value, index * 16)));
    context.stroke();
  }
}

/** 手前をよぎる暗い岩の張り出し。画面の左右の端だけにかかり、通路はふさがない。 */
function drawForeLayer(context: CanvasRenderingContext2D): void {
  const random = createSeededRandom(53);
  context.fillStyle = "rgba(6,4,3,0.88)";
  for (const [y, left, length, width] of [[120, true, 150, 160], [460, false, 130, 200], [780, true, 110, 140], [900, false, 150, 150]] as const) {
    const points: [number, number][] = left
      ? [[0, y - width / 2], [length * 0.7, y - width / 4], [length, y + (random() - 0.5) * 20], [length * 0.6, y + width / 3], [0, y + width / 2]]
      : [[DISPLAY.width, y - width / 2], [DISPLAY.width - length * 0.6, y - width / 3], [DISPLAY.width - length, y], [DISPLAY.width - length * 0.7, y + width / 4], [DISPLAY.width, y + width / 2]];
    fillPolygon(context, points);
  }
}

/** 画面の上を横切って道を塞ぐ巨大な岩壁(見下ろし)。下端はぎざぎざで、大小の岩を積み重ねた見た目。 */
function drawWall(context: CanvasRenderingContext2D): void {
  const random = createSeededRandom(71);
  const height = IWAYAMA_SHOOTING.wall.height + 40;
  const outline: [number, number][] = [[0, 0], [DISPLAY.width, 0]];
  for (let x = DISPLAY.width; x >= 0; x -= 24) outline.push([x, height - 14 - random() * 26]);
  // 手前(下)へ落ちる影
  context.fillStyle = "rgba(8,5,4,0.55)";
  fillPolygon(context, outline.map(([x, y]) => [x, y === 0 ? 0 : Math.min(height, y + 12)]));
  context.fillStyle = "#2c241f";
  fillPolygon(context, outline);
  context.save();
  context.beginPath();
  outline.forEach(([x, y], index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
  context.closePath();
  context.clip();
  for (let index = 0; index < 220; index += 1) {
    const x = random() * DISPLAY.width;
    const y = random() * height;
    const radius = 22 + random() * 46;
    const light = Math.floor(95 + random() * 45 - (1 - y / height) * 40);
    const gradient = context.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
    gradient.addColorStop(0, `rgb(${light + 40},${light + 26},${light + 10})`);
    gradient.addColorStop(1, `rgb(${light - 30},${light - 40},${light - 48})`);
    context.fillStyle = gradient;
    fillPolygon(context, jaggedPolygon(random, x, y, radius, 10, 0.25));
    context.strokeStyle = "rgba(30,22,18,0.8)";
    context.lineWidth = 2;
    context.stroke();
  }
  context.restore();
  context.strokeStyle = "rgba(18,12,10,0.95)";
  context.lineWidth = 4;
  context.beginPath();
  outline.slice(2).forEach(([x, y], index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
  context.stroke();
}

/** 崩れた岩壁の向こうに見える、少し明るい空間(上ほど明るい)。 */
function drawLightBeyond(context: CanvasRenderingContext2D): void {
  const height = IWAYAMA_SHOOTING.wall.height + 40;
  context.fillStyle = "#3a3128";
  context.fillRect(0, 0, DISPLAY.width, height);
  const glow = context.createRadialGradient(DISPLAY.width / 2, 0, 20, DISPLAY.width / 2, 0, height * 1.3);
  glow.addColorStop(0, "rgba(255,246,220,1)");
  glow.addColorStop(0.4, "rgba(250,222,168,0.85)");
  glow.addColorStop(1, "rgba(80,64,50,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, DISPLAY.width, height);
}
