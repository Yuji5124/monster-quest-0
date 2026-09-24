/**
 * ブロック城(3D)の人物(NPC)の「スキン」を、画像ファイルを増やさずCanvasで描く。three.jsには依存しない。
 * 体は参考画像と同じブロック人形の比率(頭0.5・胴0.5×0.75×0.25・腕と脚0.25×0.75×0.25ブロック)で、
 * 城のテクスチャと同じ1ブロック=32pxの密度で描く(頭の面は16×16、胴の前後は16×24、腕・脚は8×24)。
 */
export type CharacterOutfit = "soldier" | "royal_guard" | "maid" | "villager" | "king";
export type HairStyle = "short" | "long" | "bun";

export interface CharacterLook {
  readonly outfit: CharacterOutfit;
  readonly skin: number;
  readonly hair: number;
  readonly hairStyle: HairStyle;
  readonly eyes: number;
  /** 服の主色(兵士の陣羽織・メイド服・ドレス)。 */
  readonly primary: number;
  /** 服の副色(鎧の金属・エプロン・襟)。 */
  readonly secondary: number;
  /** 縁取り(金・レース)。 */
  readonly trim: number;
}

/** 箱の6面の順番(three.jsのBoxGeometryと同じ): 右(+x)・左(-x)・上・下・前(+z)・後(-z)。 */
export type BoxFaces = readonly [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement];

export type BodyPart = "head" | "body" | "arm" | "leg" | "skirt";

const GOLD = 0xe2b84a;
const GOLD_DARK = 0x9c7424;
const WHITE = 0xf6f3ea;

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

interface Painter {
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  fill(color: number, x?: number, y?: number, w?: number, h?: number, amount?: number): void;
  /** 布・金属の細かい色むら。 */
  cloth(color: number, x: number, y: number, w: number, h: number, spread?: number): void;
  /** 金属の縦のつや(中央が明るい)。 */
  metal(color: number, x: number, y: number, w: number, h: number): void;
  px(color: number, x: number, y: number, amount?: number): void;
}

function painter(width: number, height: number, seed: number): Painter {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const ctx = element.getContext("2d");
  if (!ctx) throw new Error("2D canvas is not available");
  const random = seeded(seed);
  const self: Painter = {
    canvas: element,
    width,
    height,
    fill(color, x = 0, y = 0, w = width, h = height, amount = 1) {
      ctx.fillStyle = rgb(color, amount);
      ctx.fillRect(x, y, w, h);
    },
    cloth(color, x, y, w, h, spread = 0.1) {
      for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) {
        ctx.fillStyle = rgb(color, 1 - spread / 2 + random() * spread);
        ctx.fillRect(x + i, y + j, 1, 1);
      }
    },
    metal(color, x, y, w, h) {
      for (let i = 0; i < w; i += 1) {
        const t = w <= 1 ? 0.5 : i / (w - 1);
        const shine = 0.78 + 0.42 * Math.sin(t * Math.PI);
        for (let j = 0; j < h; j += 1) {
          ctx.fillStyle = rgb(color, shine * (0.97 + random() * 0.06));
          ctx.fillRect(x + i, y + j, 1, 1);
        }
      }
    },
    px(color, x, y, amount = 1) {
      ctx.fillStyle = rgb(color, amount);
      ctx.fillRect(x, y, 1, 1);
    },
  };
  return self;
}

const FLEUR_SMALL = ["0010100", "0111110", "1011101", "0111110", "0011100", "0111110", "0101010"];

function fleur(p: Painter, left: number, top: number, color = GOLD): void {
  FLEUR_SMALL.forEach((line, y) => [...line].forEach((cell, x) => {
    if (cell === "1") p.px(color, left + x, top + y);
  }));
}

/** 白い毛皮(アーミン)に黒い斑点。王の襟・袖口。 */
function ermine(p: Painter, x: number, y: number, w: number, h: number): void {
  p.cloth(0xf6f3ea, x, y, w, h, 0.05);
  for (let j = 0; j < h; j += 2) for (let i = (j / 2) % 2 === 0 ? 1 : 3; i < w; i += 4) p.px(0x1a1a22, x + i, y + j);
}

const isArmored = (look: CharacterLook): boolean => look.outfit === "soldier" || look.outfit === "royal_guard";
const helmetColor = (look: CharacterLook): number => (look.outfit === "royal_guard" ? GOLD : look.secondary);

// ---------------- 頭 ----------------

function headFront(look: CharacterLook, blink: boolean): HTMLCanvasElement {
  const p = painter(16, 16, 11);
  p.cloth(look.skin, 0, 0, 16, 16, 0.05);
  // 頬と顎の陰
  p.fill(look.skin, 0, 14, 16, 2, 0.88);
  p.fill(look.skin, 0, 0, 1, 16, 0.92);
  p.fill(look.skin, 15, 0, 1, 16, 0.92);
  // 目(白目・瞳・ハイライト)
  if (blink) {
    p.fill(0x3a2a22, 3, 9, 3, 1);
    p.fill(0x3a2a22, 10, 9, 3, 1);
  } else {
    p.fill(0xffffff, 3, 8, 3, 2);
    p.fill(0xffffff, 10, 8, 3, 2);
    p.fill(look.eyes, 4, 8, 2, 2);
    p.fill(look.eyes, 10, 8, 2, 2);
    p.px(0x141018, 5, 9);
    p.px(0x141018, 10, 9);
    p.px(0xffffff, 4, 8);
    p.px(0xffffff, 11, 8);
  }
  // 眉・鼻・口・頬の赤み
  p.fill(look.hair, 3, 6, 3, 1, 0.8);
  p.fill(look.hair, 10, 6, 3, 1, 0.8);
  p.fill(look.skin, 7, 11, 2, 1, 0.82);
  p.fill(0x9a4a42, 6, 13, 4, 1);
  p.px(0xc06a5a, 6, 13);
  p.px(0xe8948a, 2, 11);
  p.px(0xe8948a, 13, 11);

  if (isArmored(look)) {
    // 兜: 頭頂・額の縁・鼻当て・頬当て
    const metal = helmetColor(look);
    p.metal(metal, 0, 0, 16, 5);
    p.fill(metal, 0, 5, 16, 1, 0.7);
    p.metal(metal, 7, 5, 2, 6);
    p.metal(metal, 0, 5, 2, 8);
    p.metal(metal, 14, 5, 2, 8);
    if (look.outfit === "royal_guard") p.fill(0xb8322a, 6, 1, 4, 2);
    else fleur(p, 5, 0, GOLD);
    return p.canvas;
  }
  // 髪: 前髪(ぎざぎざ)と、長髪なら顔の横の房
  p.cloth(look.hair, 0, 0, 16, 4, 0.12);
  for (let x = 0; x < 16; x += 1) {
    const fringe = [5, 4, 5, 3, 4, 5, 3, 4, 4, 3, 5, 4, 3, 5, 4, 5][x];
    p.fill(look.hair, x, 4, 1, fringe - 3, 0.95);
  }
  p.fill(look.hair, 0, 4, 2, 4, 0.9);
  p.fill(look.hair, 14, 4, 2, 4, 0.9);
  if (look.hairStyle === "long") {
    p.cloth(look.hair, 0, 8, 2, 8, 0.12);
    p.cloth(look.hair, 14, 8, 2, 8, 0.12);
  }
  if (look.outfit === "maid") {
    // ヘッドドレス(白いフリル)
    p.fill(WHITE, 2, 0, 12, 2);
    for (let x = 2; x < 14; x += 2) p.px(0xd8d4ca, x, 2);
  }
  if (look.outfit === "villager") {
    // 花の髪飾り
    p.fill(0xf4a6c0, 11, 2, 3, 3);
    p.px(0xf0c832, 12, 3);
  }
  if (look.outfit === "king") {
    // 白いひげ(口ひげと、あごを覆うひげ)。太い白い眉。
    p.fill(look.hair, 3, 6, 3, 1);
    p.fill(look.hair, 10, 6, 3, 1);
    p.cloth(look.hair, 4, 12, 8, 1, 0.06);
    p.cloth(look.hair, 2, 13, 12, 3, 0.1);
    p.fill(look.hair, 1, 11, 2, 5, 0.95);
    p.fill(look.hair, 13, 11, 2, 5, 0.95);
    p.fill(0x9a4a42, 7, 13, 2, 1);
  }
  return p.canvas;
}

/** 横顔。frontOnLeftは、その面を見たとき前(顔側)が左に来るか(右面=true、左面=false)。 */
function headSide(look: CharacterLook, frontOnLeft: boolean): HTMLCanvasElement {
  const p = painter(16, 16, 12);
  p.cloth(look.skin, 0, 0, 16, 16, 0.05);
  const front = (x: number): number => (frontOnLeft ? x : 15 - x);
  // 耳
  for (let y = 8; y < 11; y += 1) for (const x of [7, 8]) p.px(look.skin, front(x), y, 0.82);
  if (isArmored(look)) {
    const metal = helmetColor(look);
    p.metal(metal, 0, 0, 16, 6);
    for (let x = 4; x < 16; x += 1) p.fill(metal, front(x), 6, 1, x < 7 ? 6 : 10, 0.9);
    return p.canvas;
  }
  p.cloth(look.hair, 0, 0, 16, 6, 0.12);
  const back = look.hairStyle === "long" ? 16 : 12;
  for (let x = 9; x < 16; x += 1) for (let y = 6; y < back; y += 1) p.px(look.hair, front(x), y, 0.92 + ((x + y) % 3) * 0.04);
  if (look.outfit === "maid") p.fill(WHITE, 0, 0, 16, 2);
  if (look.outfit === "king") for (let x = 0; x < 9; x += 1) p.fill(look.hair, front(x), 11, 1, 5, 0.92);
  return p.canvas;
}

function headBack(look: CharacterLook): HTMLCanvasElement {
  const p = painter(16, 16, 13);
  if (isArmored(look)) {
    p.cloth(look.skin, 0, 0, 16, 16, 0.05);
    p.metal(helmetColor(look), 0, 0, 16, 13);
    p.fill(helmetColor(look), 0, 12, 16, 1, 0.7);
    return p.canvas;
  }
  p.cloth(look.hair, 0, 0, 16, 16, 0.14);
  // 髪の流れ(縦の筋)
  for (let x = 1; x < 16; x += 3) p.fill(look.hair, x, 2, 1, 13, 0.8);
  if (look.hairStyle !== "long") p.cloth(look.skin, 0, 13, 16, 3, 0.05);
  if (look.outfit === "maid") p.fill(WHITE, 0, 0, 16, 2);
  return p.canvas;
}

function headTop(look: CharacterLook): HTMLCanvasElement {
  const p = painter(16, 16, 14);
  if (isArmored(look)) p.metal(helmetColor(look), 0, 0, 16, 16);
  else {
    p.cloth(look.hair, 0, 0, 16, 16, 0.14);
    p.fill(look.hair, 7, 0, 1, 16, 0.8);
    if (look.outfit === "maid") p.fill(WHITE, 0, 12, 16, 4);
  }
  return p.canvas;
}

function plain(color: number, width: number, height: number, amount = 1): HTMLCanvasElement {
  const p = painter(width, height, 15);
  p.cloth(color, 0, 0, width, height, 0.06);
  if (amount !== 1) p.fill(color, 0, 0, width, height, amount);
  return p.canvas;
}

// ---------------- 胴 ----------------

function bodyFront(look: CharacterLook): HTMLCanvasElement {
  const p = painter(16, 24, 21);
  switch (look.outfit) {
    case "soldier":
      // 鋼の胸当て + 青い陣羽織(金の縁と紋章) + 革のベルト
      p.metal(look.secondary, 0, 0, 16, 24);
      p.fill(look.secondary, 0, 0, 16, 2, 0.7);
      p.cloth(look.primary, 4, 2, 8, 22, 0.1);
      p.fill(look.trim, 4, 2, 1, 22);
      p.fill(look.trim, 11, 2, 1, 22);
      fleur(p, 4, 6);
      p.fill(0x6a4424, 0, 16, 16, 2);
      p.fill(GOLD, 7, 16, 2, 2);
      p.px(GOLD_DARK, 8, 17);
      break;
    case "royal_guard":
      // 白銀の鎧に金の縁、胸に大きな紋章、赤い飾り帯
      p.metal(look.secondary, 0, 0, 16, 24);
      p.fill(look.trim, 0, 0, 16, 1);
      p.fill(look.trim, 3, 3, 10, 1);
      p.fill(look.trim, 3, 3, 1, 10);
      p.fill(look.trim, 12, 3, 1, 10);
      p.fill(look.trim, 3, 12, 10, 1);
      fleur(p, 4, 4, look.primary);
      for (let i = 0; i < 12; i += 1) p.fill(0xb8322a, 2 + i, 14 + Math.floor(i / 2), 2, 1);
      p.fill(0x5a3a22, 0, 20, 16, 2);
      p.fill(GOLD, 7, 20, 2, 2);
      break;
    case "maid":
      // 黒いワンピース + 白い襟 + 白いエプロンの胸当て(フリル) + 腰のリボン
      p.cloth(look.primary, 0, 0, 16, 24, 0.08);
      p.fill(WHITE, 4, 0, 8, 2);
      p.fill(0xb8322a, 7, 1, 2, 2);
      p.cloth(look.secondary, 4, 5, 8, 12, 0.05);
      for (let y = 5; y < 17; y += 2) {
        p.px(0xd8d4ca, 3, y);
        p.px(0xd8d4ca, 12, y);
      }
      p.fill(look.secondary, 0, 16, 16, 2);
      p.fill(0xd8d4ca, 0, 17, 16, 1);
      break;
    case "king":
      // 赤い王衣 + 白い毛皮の襟 + 金の前立てとボタン + 金の帯
      p.cloth(look.primary, 0, 0, 16, 24, 0.12);
      ermine(p, 0, 0, 16, 4);
      p.fill(look.trim, 7, 4, 2, 20);
      for (let y = 6; y < 16; y += 3) p.px(0xfff0b0, 7, y);
      p.fill(look.trim, 0, 16, 16, 2);
      p.fill(0x3a6ad8, 7, 16, 2, 2);
      break;
    case "villager":
      // ドレス + レースの襟 + 胸元の編み上げ + 金のネックレス
      p.cloth(look.primary, 0, 0, 16, 24, 0.1);
      p.fill(look.trim, 2, 0, 12, 3);
      for (let x = 2; x < 14; x += 2) p.px(0xd8d0bc, x, 3);
      p.px(GOLD, 7, 4);
      p.px(GOLD, 8, 4);
      p.px(0x8fd0e8, 7, 5);
      for (let y = 7; y < 16; y += 2) {
        p.px(look.trim, 6, y);
        p.px(look.trim, 9, y);
        p.px(look.trim, 7, y + 1);
        p.px(look.trim, 8, y + 1);
      }
      p.fill(look.primary, 0, 16, 16, 2, 0.7);
      break;
  }
  return p.canvas;
}

function bodyBack(look: CharacterLook): HTMLCanvasElement {
  const p = painter(16, 24, 22);
  switch (look.outfit) {
    case "soldier":
      p.metal(look.secondary, 0, 0, 16, 24);
      p.cloth(look.primary, 3, 2, 10, 22, 0.1);
      p.fill(look.trim, 3, 2, 10, 1);
      p.fill(0x6a4424, 0, 16, 16, 2);
      break;
    case "royal_guard":
      p.metal(look.secondary, 0, 0, 16, 24);
      p.fill(0x5a3a22, 0, 20, 16, 2);
      break;
    case "maid":
      p.cloth(look.primary, 0, 0, 16, 24, 0.08);
      p.fill(look.secondary, 0, 16, 16, 2);
      // 腰の大きなリボン
      p.fill(look.secondary, 4, 13, 3, 4);
      p.fill(look.secondary, 9, 13, 3, 4);
      p.fill(look.secondary, 7, 14, 2, 2, 0.9);
      p.fill(look.secondary, 6, 17, 1, 4);
      p.fill(look.secondary, 9, 17, 1, 4);
      break;
    case "villager":
      p.cloth(look.primary, 0, 0, 16, 24, 0.1);
      p.cloth(look.trim, 0, 0, 16, 8, 0.06);
      for (let x = 0; x < 16; x += 2) p.px(0xd8d0bc, x, 8);
      break;
    case "king":
      p.cloth(look.primary, 0, 0, 16, 24, 0.12);
      ermine(p, 0, 0, 16, 5);
      p.fill(look.trim, 0, 16, 16, 2);
      break;
  }
  return p.canvas;
}

function bodySide(look: CharacterLook): HTMLCanvasElement {
  const p = painter(8, 24, 23);
  if (isArmored(look)) {
    p.metal(look.secondary, 0, 0, 8, 24);
    p.fill(look.outfit === "soldier" ? 0x6a4424 : 0x5a3a22, 0, look.outfit === "soldier" ? 16 : 20, 8, 2);
  } else {
    p.cloth(look.primary, 0, 0, 8, 24, 0.1);
    if (look.outfit === "maid") p.fill(look.secondary, 0, 16, 8, 2);
  }
  return p.canvas;
}

// ---------------- 腕 ----------------

function armFace(look: CharacterLook, seed: number): HTMLCanvasElement {
  const p = painter(8, 24, seed);
  switch (look.outfit) {
    case "soldier":
      p.metal(look.secondary, 0, 0, 8, 6);
      p.fill(look.secondary, 0, 6, 8, 1, 0.65);
      // 鎖かたびら(格子)
      for (let y = 7; y < 18; y += 1) for (let x = 0; x < 8; x += 1) p.px(0x8a909c, x, y, (x + y) % 2 === 0 ? 1.08 : 0.82);
      p.metal(look.secondary, 0, 18, 8, 6);
      break;
    case "royal_guard":
      p.metal(look.trim, 0, 0, 8, 6);
      p.cloth(look.secondary, 0, 6, 8, 12, 0.06);
      p.fill(look.trim, 0, 17, 8, 1);
      p.cloth(WHITE, 0, 18, 8, 6, 0.05);
      break;
    case "maid":
      p.cloth(look.primary, 0, 0, 8, 17, 0.08);
      p.fill(WHITE, 0, 16, 8, 2);
      p.cloth(look.skin, 0, 18, 8, 6, 0.05);
      break;
    case "king":
      p.cloth(look.primary, 0, 0, 8, 15, 0.12);
      p.fill(look.trim, 0, 14, 8, 1);
      ermine(p, 0, 15, 8, 4);
      p.cloth(look.skin, 0, 19, 8, 5, 0.05);
      break;
    case "villager":
      p.cloth(look.primary, 0, 0, 8, 6, 0.14);
      p.fill(look.primary, 0, 5, 8, 1, 0.75);
      p.cloth(look.primary, 0, 6, 8, 10, 0.08);
      p.fill(look.trim, 0, 16, 8, 2);
      p.cloth(look.skin, 0, 18, 8, 6, 0.05);
      break;
  }
  return p.canvas;
}

// ---------------- 脚 ----------------

function legFace(look: CharacterLook, seed: number): HTMLCanvasElement {
  const p = painter(8, 24, seed);
  switch (look.outfit) {
    case "soldier":
      p.cloth(0x2a2f3c, 0, 0, 8, 12, 0.08);
      p.metal(look.secondary, 0, 12, 8, 8);
      p.fill(look.secondary, 0, 12, 8, 1, 0.7);
      p.cloth(0x5a3a22, 0, 20, 8, 4, 0.08);
      break;
    case "royal_guard":
      p.cloth(WHITE, 0, 0, 8, 12, 0.05);
      p.metal(look.trim, 0, 12, 8, 8);
      p.cloth(0x4a2e1a, 0, 20, 8, 4, 0.08);
      break;
    case "maid":
      p.cloth(look.primary, 0, 0, 8, 10, 0.08);
      p.cloth(WHITE, 0, 10, 8, 10, 0.04);
      p.cloth(0x1a1a22, 0, 20, 8, 4, 0.08);
      p.px(0x6a6a78, 2, 21);
      break;
    case "king":
      p.cloth(look.primary, 0, 0, 8, 18, 0.12);
      p.fill(look.trim, 0, 16, 8, 2);
      p.cloth(0x5a2a1a, 0, 18, 8, 6, 0.08);
      p.fill(look.trim, 0, 18, 8, 1);
      break;
    case "villager":
      p.cloth(look.primary, 0, 0, 8, 12, 0.1);
      p.cloth(0xe8dcc8, 0, 12, 8, 8, 0.05);
      p.cloth(0x6a4424, 0, 20, 8, 4, 0.08);
      break;
  }
  return p.canvas;
}

// ---------------- スカート(メイド・町の人) ----------------

function skirtFace(look: CharacterLook, front: boolean): HTMLCanvasElement {
  const p = painter(18, 16, front ? 41 : 42);
  p.cloth(look.primary, 0, 0, 18, 16, 0.1);
  // ひだ(縦の陰)
  for (let x = 2; x < 18; x += 4) p.fill(look.primary, x, 2, 1, 14, 0.78);
  if (look.outfit === "maid") {
    if (front) {
      p.cloth(look.secondary, 4, 0, 10, 14, 0.04);
      for (let x = 4; x < 14; x += 2) p.px(0xd8d4ca, x, 14);
    }
    p.fill(WHITE, 0, 15, 18, 1);
  } else {
    p.fill(look.trim, 0, 13, 18, 3);
    for (let x = 0; x < 18; x += 2) p.px(0xd8d0bc, x, 12);
  }
  return p.canvas;
}

/**
 * 部位ごとの6面のスキン。headはまばたき用に目を閉じた前面も返す(blinkFront)。
 */
export function paintCharacterPart(look: CharacterLook, part: BodyPart): { faces: BoxFaces; blinkFront?: HTMLCanvasElement } {
  switch (part) {
    case "head":
      return {
        faces: [headSide(look, true), headSide(look, false), headTop(look), plain(look.skin, 16, 16, 0.85), headFront(look, false), headBack(look)],
        blinkFront: headFront(look, true),
      };
    case "body": {
      const top = isArmored(look) ? plain(look.secondary, 16, 8) : plain(look.primary, 16, 8);
      return { faces: [bodySide(look), bodySide(look), top, top, bodyFront(look), bodyBack(look)] };
    }
    case "arm": {
      const face = armFace(look, 31);
      const top = isArmored(look) ? plain(look.outfit === "royal_guard" ? look.trim : look.secondary, 8, 8) : plain(look.primary, 8, 8);
      return { faces: [face, face, top, plain(look.outfit === "soldier" ? look.secondary : look.skin, 8, 8), face, armFace(look, 32)] };
    }
    case "leg": {
      const face = legFace(look, 33);
      return { faces: [face, face, plain(0x2a2f3c, 8, 8), plain(0x3a2a1a, 8, 8), face, legFace(look, 34)] };
    }
    case "skirt": {
      const side = skirtFace(look, false);
      return { faces: [side, side, plain(look.primary, 18, 16), plain(look.primary, 18, 16, 0.6), skirtFace(look, true), side] };
    }
  }
}

/** スカートを着る服か(メイド・町の人)。 */
export function wearsSkirt(look: CharacterLook): boolean {
  return look.outfit === "maid" || look.outfit === "villager";
}
