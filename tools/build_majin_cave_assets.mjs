import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { deflateSync } from "node:zlib";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REFERENCE_DIR = path.join(REPO_ROOT, "assets", "maps", "reference", "reference");
const MAPS = [
  {
    directory: "majin_cave_1",
    reference: "まじんのどうくつ_その１.png",
    paths: [
      [[1160, 1000], [1120, 900], [1050, 815], [930, 755], [825, 660], [745, 570], [635, 520], [560, 470], [520, 370], [420, 300], [320, 230], [210, 155], [145, 92]],
      [[745, 570], [845, 485], [945, 395], [1045, 300], [1140, 205], [1220, 135]],
      [[635, 520], [520, 560], [405, 590], [300, 535], [220, 455]],
    ],
  },
  {
    directory: "majin_cave_2",
    reference: "まじんのどうくつ_その2.png",
    paths: [
      [[1300, 995], [1240, 880], [1120, 790], [1000, 690], [875, 620], [745, 590], [630, 510], [525, 440], [420, 350], [305, 250], [205, 140], [145, 80]],
      [[875, 620], [1000, 560], [1135, 485], [1260, 400], [1300, 300]],
      [[630, 510], [550, 610], [465, 690], [360, 720]],
    ],
  },
  {
    directory: "majin_cave_3",
    reference: "まじんのどうくつ_その3.png",
    paths: [
      [[250, 1000], [330, 900], [410, 810], [540, 740], [670, 690], [790, 610], [890, 520], [965, 420], [1050, 310], [1110, 210], [1150, 125]],
      [[670, 690], [550, 590], [420, 520], [310, 445]],
      [[790, 610], [880, 690], [990, 745], [1110, 790]],
    ],
  },
];

const WIDTH = 1448;
const HEIGHT = 1086;
const CORRIDOR_RADIUS = 48;
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

for (const map of MAPS) {
  const directory = path.join(REPO_ROOT, "assets", "maps", map.directory);
  mkdirSync(directory, { recursive: true });
  copyFileSync(path.join(REFERENCE_DIR, map.reference), path.join(directory, "background.png"));
  writeFileSync(path.join(directory, "collision.png"), encodeMask(createMask(map.paths)));
}

// The key art is intentionally kept separate from the walkable backgrounds. It is the entrance splash.
const splashDirectory = path.join(REPO_ROOT, "assets", "maps", "majin_cave_1");
copyFileSync(path.join(REFERENCE_DIR, "まじんのどうくつ.png"), path.join(splashDirectory, "entry_splash.png"));

function createMask(paths) {
  const walkable = new Uint8Array(WIDTH * HEIGHT);
  for (const points of paths) {
    for (let index = 1; index < points.length; index += 1) drawSegment(walkable, points[index - 1], points[index]);
  }
  return walkable;
}

function drawSegment(mask, [fromX, fromY], [toX, toY]) {
  const steps = Math.ceil(Math.hypot(toX - fromX, toY - fromY) / 3);
  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    drawDisc(mask, Math.round(fromX + (toX - fromX) * progress), Math.round(fromY + (toY - fromY) * progress));
  }
}

function drawDisc(mask, centerX, centerY) {
  const minY = Math.max(0, centerY - CORRIDOR_RADIUS);
  const maxY = Math.min(HEIGHT - 1, centerY + CORRIDOR_RADIUS);
  for (let y = minY; y <= maxY; y += 1) {
    const horizontal = Math.floor(Math.sqrt(CORRIDOR_RADIUS ** 2 - (y - centerY) ** 2));
    const minX = Math.max(0, centerX - horizontal);
    const maxX = Math.min(WIDTH - 1, centerX + horizontal);
    mask.fill(1, y * WIDTH + minX, y * WIDTH + maxX + 1);
  }
}

function encodeMask(mask) {
  const rows = Buffer.allocUnsafe((WIDTH * 3 + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    const rowStart = y * (WIDTH * 3 + 1);
    rows[rowStart] = 0;
    for (let x = 0; x < WIDTH; x += 1) {
      const color = mask[y * WIDTH + x] === 1 ? 255 : 0;
      const pixelStart = rowStart + 1 + x * 3;
      rows[pixelStart] = color;
      rows[pixelStart + 1] = color;
      rows[pixelStart + 2] = color;
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", Buffer.from([0, 0, 5, 168, 0, 0, 4, 62, 8, 2, 0, 0, 0])),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type, payload) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, payload])));
  return Buffer.concat([length, typeBuffer, payload, checksum]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
