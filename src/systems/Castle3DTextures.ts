/**
 * ブロック城(3D)用のドット絵テクスチャを、画像ファイルを増やさずCanvasで描く。
 * 2026-09-23: 画質向上のため1ブロック32×32pxへ描き直した(石の面取りの光と影・レンガ1個ずつの色むら・絨毯の織り目・大きい紋章)。
 * 乱数は固定シードなので毎回同じ絵になる。three.jsには依存しない(Canvasを返すだけ)。
 */
export type Castle3DTextureId =
  | "wall_brick" | "wall_trim" | "wall_base" | "stairs"
  | "banner" | "door" | "painting" | "leaves" | "pot" | "wood" | "cushion"
  | "ceiling" | "ceiling_panel" | "pedestal" | "flowers" | "window" | "lantern" | "iron"
  | "column" | "capital" | "tapestry";

/** 1ブロックのテクスチャの一辺(px)。 */
export const TEXTURE_SIZE = 32;
const S = TEXTURE_SIZE;

// 辺のビット(Castle3DLayoutのEDGE_*と同じ): 北1・東2・南4・西8。
const NORTH = 1;
const EAST = 2;
const SOUTH = 4;
const WEST = 8;

const GOLD = 0xe2b84a;
const GOLD_DARK = 0x9c7424;
const ROYAL = 0x2f4f9e;
const STONE = 0xe6dfcf;

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function rgb(color: number, amount = 1): string {
  const clamp = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
  return `rgb(${clamp(((color >> 16) & 0xff) * amount)},${clamp(((color >> 8) & 0xff) * amount)},${clamp((color & 0xff) * amount)})`;
}

function canvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const ctx = element.getContext("2d");
  if (!ctx) throw new Error("2D canvas is not available");
  return { canvas: element, ctx };
}

function noise(ctx: CanvasRenderingContext2D, x0: number, y0: number, width: number, height: number, base: number, spread: number, random: () => number): void {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      ctx.fillStyle = rgb(base, 1 - spread / 2 + random() * spread);
      ctx.fillRect(x0 + x, y0 + y, 1, 1);
    }
  }
}

/** 面取りした石の板: 上と左の縁を明るく、下と右の縁を暗くして立体感を出す。 */
function bevel(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, base: number, random: () => number, spread = 0.1): void {
  noise(ctx, x, y, width, height, base, spread, random);
  ctx.fillStyle = rgb(base, 1.12);
  ctx.fillRect(x, y, width, 1);
  ctx.fillRect(x, y, 1, height);
  ctx.fillStyle = rgb(base, 0.8);
  ctx.fillRect(x, y + height - 1, width, 1);
  ctx.fillRect(x + width - 1, y, 1, height);
}

// 7×8の百合の紋章(1 = 金)。scale倍で描く。
const FLEUR = [
  "0001000",
  "0011100",
  "1001001",
  "1101011",
  "0111110",
  "0001000",
  "0111110",
  "0010100",
];

function drawFleur(ctx: CanvasRenderingContext2D, left: number, top: number, scale: number, color = GOLD): void {
  FLEUR.forEach((line, y) => [...line].forEach((cell, x) => {
    if (cell !== "1") return;
    ctx.fillStyle = rgb(color);
    ctx.fillRect(left + x * scale, top + y * scale, scale, scale);
    // 右下に一段暗い影を付けて浮き彫りに見せる
    ctx.fillStyle = rgb(GOLD_DARK);
    ctx.fillRect(left + x * scale + scale - 1, top + y * scale + scale - 1, 1, 1);
  }));
}

/** 壁・置物に接する辺を暗くする(簡易アンビエントオクルージョン)。 */
function edgeShade(ctx: CanvasRenderingContext2D, edges: number): void {
  const depth = 10;
  const strength = 0.34;
  const band = (x: number, y: number, w: number, h: number, horizontal: boolean, reverse: boolean): void => {
    const gradient = horizontal
      ? ctx.createLinearGradient(0, reverse ? y + h : y, 0, reverse ? y : y + h)
      : ctx.createLinearGradient(reverse ? x + w : x, 0, reverse ? x : x + w, 0);
    gradient.addColorStop(0, `rgba(40,28,12,${strength})`);
    gradient.addColorStop(1, "rgba(40,28,12,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
  };
  if (edges & NORTH) band(0, 0, S, depth, true, false);
  if (edges & SOUTH) band(0, S - depth, S, depth, true, true);
  if (edges & WEST) band(0, 0, depth, S, false, false);
  if (edges & EAST) band(S - depth, 0, depth, S, false, true);
}

/** 石の床(2×2の面取りタイル)。shadeは壁ぎわの辺(暗くする)。 */
export function drawStoneFloorTexture(shadeEdges: number): HTMLCanvasElement {
  const { canvas: c, ctx } = canvas(S, S);
  const random = seeded(11);
  const tones = [0xe4ddcd, 0xdcd4c2, 0xe8e2d4, 0xd9d1be];
  for (let ty = 0; ty < 2; ty += 1) for (let tx = 0; tx < 2; tx += 1) bevel(ctx, tx * 16, ty * 16, 16, 16, tones[ty * 2 + tx], random, 0.08);
  // 大理石のうっすらした筋
  ctx.fillStyle = "rgba(150,140,120,0.35)";
  for (const [x, y] of [[3, 5], [4, 6], [5, 6], [6, 7], [20, 22], [21, 22], [22, 23], [23, 24], [24, 24]]) ctx.fillRect(x, y, 1, 1);
  edgeShade(ctx, shadeEdges);
  return c;
}

/**
 * 絨毯。edgesは絨毯でない床と接する辺で、その辺の内側に金の線(外側は濃紺の縁)を引く(参考画像の絨毯の金の縁取り)。
 * emblemは金の紋章、shadeEdgesは壁ぎわの暗がり。
 */
export function drawCarpetTexture(edges: number, emblem: boolean, shadeEdges = 0): HTMLCanvasElement {
  const { canvas: c, ctx } = canvas(S, S);
  const random = seeded(21);
  // 織り目: 2px単位の市松でわずかに明暗を付ける
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const weave = ((x >> 1) + (y >> 1)) % 2 === 0 ? 1.04 : 0.95;
      ctx.fillStyle = rgb(ROYAL, weave * (0.94 + random() * 0.1));
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const border = (x: number, y: number, w: number, h: number): void => {
    ctx.fillStyle = rgb(0x1e336c);
    ctx.fillRect(x, y, w, h);
  };
  const line = (x: number, y: number, w: number, h: number): void => {
    ctx.fillStyle = rgb(GOLD);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = rgb(GOLD_DARK);
    ctx.fillRect(x + (w === 1 ? 1 : 0), y + (h === 1 ? 1 : 0), w, h);
  };
  if (edges & NORTH) { border(0, 0, S, 2); line(0, 4, S, 1); }
  if (edges & SOUTH) { border(0, S - 2, S, 2); line(0, S - 6, S, 1); }
  if (edges & WEST) { border(0, 0, 2, S); line(4, 0, 1, S); }
  if (edges & EAST) { border(S - 2, 0, 2, S); line(S - 6, 0, 1, S); }
  if (emblem) drawFleur(ctx, 9, 8, 2);
  edgeShade(ctx, shadeEdges);
  return c;
}

/** 窓から差し込む光の筋: 窓側(上)が明るく、床側(下)と左右の縁へ向かって消える。 */
export function drawLightShaftTexture(): HTMLCanvasElement {
  const { canvas: c, ctx } = canvas(32, 64);
  for (let y = 0; y < 64; y += 1) {
    const along = 1 - y / 63;
    for (let x = 0; x < 32; x += 1) {
      const across = Math.sin((x + 0.5) / 32 * Math.PI);
      const alpha = Math.pow(along, 1.4) * across * across;
      ctx.fillStyle = `rgba(255,236,190,${alpha.toFixed(3)})`;
      ctx.fillRect(x, 63 - y, 1, 1);
    }
  }
  return c;
}

/** 燭台・ランタンの光の輪(加算合成用の放射グラデーション)。 */
export function drawGlowTexture(): HTMLCanvasElement {
  const { canvas: c, ctx } = canvas(64, 64);
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,226,150,0.95)");
  gradient.addColorStop(0.25, "rgba(255,196,96,0.45)");
  gradient.addColorStop(1, "rgba(255,170,60,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return c;
}

export function drawCastle3DTexture(id: Castle3DTextureId): HTMLCanvasElement {
  switch (id) {
    case "wall_brick": {
      // 白い石のレンガ: 高さ8pxの段を4段、段ごとに半分ずらす。1個ずつ色むら・上の縁に光・下の縁に影。
      const { canvas: c, ctx } = canvas(S, S);
      const random = seeded(31);
      ctx.fillStyle = rgb(0xb9ae98);
      ctx.fillRect(0, 0, S, S);
      for (let row = 0; row < 4; row += 1) {
        const offset = row % 2 === 0 ? 0 : -8;
        for (let x = offset; x < S; x += 16) {
          const tone = [0xe9e2d2, 0xe2dac8, 0xede7d9, 0xdfd6c3][Math.floor(random() * 4)];
          const left = Math.max(0, x);
          const width = Math.min(x + 15, S) - left;
          if (width > 0) bevel(ctx, left, row * 8, width, 7, tone, random, 0.08);
        }
      }
      return c;
    }
    case "wall_base": {
      // 壁の腰(一番下の段): 少し濃い石の大きな板と、上の縁の飾り線。
      const { canvas: c, ctx } = canvas(S, S);
      const random = seeded(35);
      bevel(ctx, 0, 0, 16, S, 0xcfc5ae, random, 0.08);
      bevel(ctx, 16, 0, 16, S, 0xc9bfa7, random, 0.08);
      ctx.fillStyle = rgb(0xf1ebde);
      ctx.fillRect(0, 0, S, 3);
      ctx.fillStyle = rgb(0xa89c82);
      ctx.fillRect(0, 3, S, 1);
      return c;
    }
    case "wall_trim": {
      // 天井際の蛇腹: 白い石・金の細線・青い帯(参考画像の天井際の青いブロック)。
      const { canvas: c, ctx } = canvas(S, S);
      const random = seeded(41);
      noise(ctx, 0, 0, S, 20, 0xf1ebde, 0.06, random);
      ctx.fillStyle = rgb(0xc9bea6);
      ctx.fillRect(0, 19, S, 1);
      ctx.fillStyle = rgb(GOLD);
      ctx.fillRect(0, 20, S, 2);
      noise(ctx, 0, 22, S, 10, 0x35569f, 0.1, random);
      ctx.fillStyle = rgb(0x24407e);
      ctx.fillRect(0, S - 1, S, 1);
      return c;
    }
    case "stairs": {
      const { canvas: c, ctx } = canvas(S, S);
      const random = seeded(51);
      bevel(ctx, 0, 0, S, S, 0xe6dfcf, random, 0.08);
      ctx.fillStyle = rgb(0x9c8f76);
      ctx.fillRect(0, S - 3, S, 3);
      return c;
    }
    case "banner": {
      // 32×64: 青地に金の縁と大きな紋章、下が燕尾に尖る。上に吊り棒。
      const { canvas: c, ctx } = canvas(32, 64);
      const random = seeded(61);
      ctx.fillStyle = rgb(0x6a5230);
      ctx.fillRect(0, 0, 32, 3);
      for (let y = 3; y < 52; y += 1) {
        for (let x = 3; x < 29; x += 1) {
          ctx.fillStyle = rgb(0x2d4f9c, 0.9 + random() * 0.14 - (x < 6 || x > 25 ? 0.12 : 0));
          ctx.fillRect(x, y, 1, 1);
        }
      }
      for (let i = 0; i < 12; i += 1) {
        ctx.fillStyle = rgb(0x2d4f9c, 0.9);
        ctx.fillRect(3 + i, 52 + i, 26 - i * 2, 1);
      }
      ctx.fillStyle = rgb(GOLD);
      ctx.fillRect(3, 3, 26, 2);
      ctx.fillRect(3, 3, 2, 49);
      ctx.fillRect(27, 3, 2, 49);
      for (let i = 0; i < 12; i += 1) {
        ctx.fillRect(3 + i, 52 + i, 2, 1);
        ctx.fillRect(27 - i, 52 + i, 2, 1);
      }
      drawFleur(ctx, 9, 18, 2);
      return c;
    }
    case "door": {
      // 64×64: 金の枠の青い両開き扉、それぞれに紋章と取っ手、上部はアーチ風の段。
      const { canvas: c, ctx } = canvas(64, 64);
      const random = seeded(71);
      noise(ctx, 0, 0, 64, 64, GOLD, 0.12, random);
      ctx.fillStyle = rgb(GOLD_DARK);
      ctx.fillRect(3, 3, 58, 1);
      for (const left of [5, 33]) {
        noise(ctx, left, 6, 26, 58, 0x23408a, 0.12, random);
        ctx.fillStyle = rgb(0x1a3170);
        ctx.fillRect(left + 3, 10, 20, 1);
        ctx.fillRect(left + 3, 10, 1, 50);
        ctx.fillStyle = rgb(0x3a5eb0);
        ctx.fillRect(left + 22, 10, 1, 50);
        drawFleur(ctx, left + 6, 22, 2);
      }
      ctx.fillStyle = rgb(0xfff0b0);
      ctx.fillRect(27, 36, 3, 3);
      ctx.fillRect(34, 36, 3, 3);
      return c;
    }
    case "painting": {
      // 48×32: 金の額縁に、湖と山と城の風景画。
      const { canvas: c, ctx } = canvas(48, 32);
      const random = seeded(81);
      noise(ctx, 0, 0, 48, 32, 0xb8923e, 0.18, random);
      ctx.fillStyle = rgb(0x7a5a24);
      ctx.fillRect(3, 3, 42, 26);
      const sky = ctx.createLinearGradient(0, 4, 0, 18);
      sky.addColorStop(0, "#7fb2e6");
      sky.addColorStop(1, "#cfe4f5");
      ctx.fillStyle = sky;
      ctx.fillRect(4, 4, 40, 14);
      ctx.fillStyle = "#7d8fb2";
      for (let i = 0; i < 10; i += 1) ctx.fillRect(6 + i, 17 - i, 1, i + 1);
      for (let i = 0; i < 9; i += 1) ctx.fillRect(25 - i, 17 - i, 1, i + 1);
      for (let i = 0; i < 8; i += 1) ctx.fillRect(28 + i, 17 - i, 1, i + 1);
      for (let i = 0; i < 8; i += 1) ctx.fillRect(43 - i, 17 - i, 1, i + 1);
      ctx.fillStyle = "#f4f6fb";
      ctx.fillRect(15, 8, 2, 2);
      ctx.fillRect(35, 10, 2, 2);
      ctx.fillStyle = "#4f7a45";
      ctx.fillRect(4, 18, 40, 4);
      ctx.fillStyle = "#5c8fc4";
      ctx.fillRect(4, 22, 40, 6);
      ctx.fillStyle = "#e8e0cf";
      ctx.fillRect(30, 12, 4, 7);
      ctx.fillStyle = "#35569f";
      ctx.fillRect(29, 10, 6, 2);
      return c;
    }
    case "leaves": {
      const { canvas: c, ctx } = canvas(S, S);
      const random = seeded(91);
      noise(ctx, 0, 0, S, S, 0x4f8f3a, 0.5, random);
      for (let i = 0; i < 18; i += 1) {
        ctx.fillStyle = rgb(0x8fcf5e, 0.9 + random() * 0.2);
        ctx.fillRect(Math.floor(random() * 31), Math.floor(random() * 31), 2, 1);
      }
      return c;
    }
    case "flowers": {
      // 葉の上に白い5弁の花と黄色い芯(参考画像の白い花)。
      const { canvas: c, ctx } = canvas(S, S);
      const random = seeded(121);
      noise(ctx, 0, 0, S, S, 0x5a9a3e, 0.5, random);
      for (let i = 0; i < 12; i += 1) {
        ctx.fillStyle = rgb(0x8fcf5e);
        ctx.fillRect(Math.floor(random() * 31), Math.floor(random() * 31), 2, 1);
      }
      for (let i = 0; i < 9; i += 1) {
        const x = 2 + Math.floor(random() * 27);
        const y = 2 + Math.floor(random() * 27);
        ctx.fillStyle = "#fbfbf4";
        ctx.fillRect(x - 2, y - 1, 5, 3);
        ctx.fillRect(x - 1, y - 2, 3, 5);
        ctx.fillStyle = "#d8d8cc";
        ctx.fillRect(x + 1, y + 1, 1, 1);
        ctx.fillStyle = "#f0c832";
        ctx.fillRect(x, y, 1, 1);
      }
      return c;
    }
    case "pot": {
      const { canvas: c, ctx } = canvas(S, S);
      const random = seeded(101);
      bevel(ctx, 0, 0, S, S, 0xd2c8b2, random, 0.1);
      ctx.fillStyle = rgb(0xf1ebde);
      ctx.fillRect(0, 0, S, 3);
      ctx.fillStyle = rgb(0xa89c82);
      ctx.fillRect(0, 3, S, 1);
      return c;
    }
    case "wood": {
      const { canvas: c, ctx } = canvas(S, S);
      const random = seeded(111);
      for (let plank = 0; plank < 4; plank += 1) {
        noise(ctx, 0, plank * 8, S, 8, [0x8a5a32, 0x7f5230, 0x935f36, 0x86582f][plank], 0.14, random);
        ctx.fillStyle = rgb(0x5a3a1e);
        ctx.fillRect(0, plank * 8 + 7, S, 1);
      }
      return c;
    }
    case "cushion": {
      const { canvas: c, ctx } = canvas(S, S);
      const random = seeded(131);
      noise(ctx, 0, 0, S, S, ROYAL, 0.12, random);
      ctx.fillStyle = rgb(GOLD);
      ctx.fillRect(0, 0, S, 2);
      ctx.fillRect(0, S - 2, S, 2);
      return c;
    }
    case "ceiling": {
      // 白い石の天井板(面取り)。
      const { canvas: c, ctx } = canvas(S, S);
      const random = seeded(141);
      bevel(ctx, 0, 0, S, S, 0xf0e9da, random, 0.06);
      return c;
    }
    case "ceiling_panel": {
      // 格天井の青い格間(2×2ブロックで1枚)。金の鋲を散らす。
      const { canvas: c, ctx } = canvas(S, S);
      const random = seeded(151);
      noise(ctx, 0, 0, S, S, 0x3a5ca8, 0.12, random);
      ctx.fillStyle = rgb(GOLD);
      ctx.fillRect(15, 15, 2, 2);
      return c;
    }
    case "pedestal": {
      // 台座の側面: 白い石に、金の縁の青い板と大きな紋章(参考画像の手すりの柱)。
      const { canvas: c, ctx } = canvas(S, S);
      const random = seeded(161);
      bevel(ctx, 0, 0, S, S, STONE, random, 0.08);
      ctx.fillStyle = rgb(GOLD);
      ctx.fillRect(5, 4, 22, 24);
      noise(ctx, 7, 6, 18, 20, ROYAL, 0.12, random);
      drawFleur(ctx, 9, 8, 2);
      return c;
    }
    case "window": {
      // 32×48: 白い石のアーチ枠の中に、青空・雲・雪山・遠くの城の塔・森。
      const { canvas: c, ctx } = canvas(32, 48);
      const random = seeded(171);
      noise(ctx, 0, 0, 32, 48, 0xe9e2d2, 0.08, random);
      const sky = ctx.createLinearGradient(0, 4, 0, 34);
      sky.addColorStop(0, "#6aa6e4");
      sky.addColorStop(1, "#cfe6f8");
      ctx.fillStyle = sky;
      ctx.fillRect(4, 10, 24, 34);
      ctx.fillRect(6, 6, 20, 4);
      ctx.fillRect(10, 4, 12, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(7, 12, 8, 2);
      ctx.fillRect(9, 11, 4, 1);
      ctx.fillRect(18, 16, 6, 2);
      ctx.fillStyle = "#8193b8";
      for (let i = 0; i < 12; i += 1) ctx.fillRect(4 + i, 32 - i, 1, 12 + i);
      for (let i = 0; i < 12; i += 1) ctx.fillRect(27 - i, 30 - i, 1, 14 + i);
      ctx.fillStyle = "#f4f6fb";
      for (let i = 0; i < 3; i += 1) ctx.fillRect(14 - i, 21 + i, 2 + i * 2, 1);
      for (let i = 0; i < 3; i += 1) ctx.fillRect(16 + i, 19 + i, 2, 1);
      ctx.fillStyle = "#e9e2d2";
      ctx.fillRect(19, 26, 4, 12);
      ctx.fillStyle = "#35569f";
      for (let i = 0; i < 4; i += 1) ctx.fillRect(21 - i, 22 + i, 1 + i * 2, 1);
      ctx.fillStyle = "#3f7a3a";
      ctx.fillRect(4, 38, 24, 6);
      ctx.fillStyle = "#2f6a32";
      for (let x = 4; x < 28; x += 3) ctx.fillRect(x, 36 + (x % 2), 2, 3);
      ctx.fillStyle = rgb(0xb9ae98);
      ctx.fillRect(2, 44, 28, 4);
      ctx.fillStyle = rgb(0xf4efe4);
      ctx.fillRect(2, 44, 28, 1);
      return c;
    }
    case "lantern": {
      const { canvas: c, ctx } = canvas(16, 16);
      ctx.fillStyle = "#ffd878";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#fff4c8";
      ctx.fillRect(5, 3, 6, 10);
      ctx.fillStyle = "#4a3a22";
      ctx.fillRect(0, 0, 16, 2);
      ctx.fillRect(0, 14, 16, 2);
      ctx.fillRect(0, 0, 2, 16);
      ctx.fillRect(14, 0, 2, 16);
      ctx.fillRect(7, 0, 2, 16);
      return c;
    }
    case "tapestry": {
      // 64×96: 玉座の後ろの大きな垂れ幕。青地に金の二重縁と大きな紋章、上に金の吊り棒、下に房飾り。
      const { canvas: c, ctx } = canvas(64, 96);
      const random = seeded(201);
      ctx.fillStyle = rgb(0x6a5230);
      ctx.fillRect(0, 0, 64, 4);
      ctx.fillStyle = rgb(GOLD);
      ctx.fillRect(0, 0, 4, 5);
      ctx.fillRect(60, 0, 4, 5);
      noise(ctx, 4, 4, 56, 84, 0x2d4f9c, 0.12, random);
      ctx.fillStyle = rgb(GOLD);
      ctx.fillRect(4, 4, 56, 2);
      ctx.fillRect(4, 4, 2, 84);
      ctx.fillRect(58, 4, 2, 84);
      ctx.fillRect(4, 86, 56, 2);
      ctx.fillStyle = rgb(GOLD_DARK);
      ctx.fillRect(9, 9, 46, 1);
      ctx.fillRect(9, 9, 1, 74);
      ctx.fillRect(54, 9, 1, 74);
      ctx.fillRect(9, 82, 46, 1);
      drawFleur(ctx, 18, 26, 4);
      for (let x = 5; x < 59; x += 3) {
        ctx.fillStyle = rgb(GOLD, 0.9 + (x % 2) * 0.1);
        ctx.fillRect(x, 88, 2, 6 + (x % 4 === 0 ? 2 : 0));
      }
      return c;
    }
    case "column": {
      // 付け柱の柱身: 縦の溝(フルーティング)の入った白い石。
      const { canvas: c, ctx } = canvas(S, S);
      const random = seeded(191);
      noise(ctx, 0, 0, S, S, 0xefe9dc, 0.06, random);
      for (let x = 2; x < S; x += 6) {
        ctx.fillStyle = rgb(0xc9bea6);
        ctx.fillRect(x, 0, 2, S);
        ctx.fillStyle = rgb(0xfaf6ec);
        ctx.fillRect(x + 2, 0, 1, S);
      }
      return c;
    }
    case "capital": {
      // 柱頭・柱の台・扉のアーチ枠: 面取りした明るい石に金の細線。
      const { canvas: c, ctx } = canvas(S, S);
      const random = seeded(195);
      bevel(ctx, 0, 0, S, S, 0xf1ebde, random, 0.06);
      ctx.fillStyle = rgb(GOLD);
      ctx.fillRect(0, S - 5, S, 1);
      ctx.fillStyle = rgb(0xc9bea6);
      ctx.fillRect(0, S - 4, S, 1);
      return c;
    }
    case "iron": {
      const { canvas: c, ctx } = canvas(8, 8);
      noise(ctx, 0, 0, 8, 8, 0x3a3a44, 0.3, seeded(181));
      return c;
    }
  }
}
