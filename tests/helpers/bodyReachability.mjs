import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PLAYER } from "../../src/config/player.ts";
import { buildCollisionRects } from "../../src/systems/ImageMapCollisionData.ts";
import { readImageMapEvents, readImageMapManifest } from "../../src/systems/ImageMapData.ts";
import { MAPS } from "../../src/config/maps.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Where can the REAL player body (PLAYER.width x PLAYER.height, world px) stand and walk?
 * Cell-level 4-connectivity (is every walkable cell linked?) is not enough: a corridor one cell
 * wide is "connected" but the body cannot pass it. This walks the body itself over the shipped
 * Collision cells (scaled by worldScale, exactly what the Scene creates) on a coarse lattice.
 */
export function analyseBodyReachability(mapDirName, mapId, { margin = 0, step = 3, blockers = [] } = {}) {
  const dir = path.join(REPO_ROOT, "assets/maps", mapDirName);
  const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(dir, "map.json"), "utf-8")));
  const events = readImageMapEvents(JSON.parse(readFileSync(path.join(dir, "events.json"), "utf-8")));
  const cellSize = manifest.collisionCellSize;
  const rects = buildCollisionRects(readPngAsMask(path.join(dir, "collision.png")), cellSize);
  const scale = manifest.worldScale;
  const cell = cellSize * scale;
  const columns = Math.ceil(manifest.width / cellSize);
  const rows = Math.ceil(manifest.height / cellSize);

  // blocked cell grid from the rectangles (each rect is a union of whole cells)
  const blocked = new Uint8Array(columns * rows);
  for (const rect of rects) {
    const r0 = Math.round(rect.y / cellSize);
    const r1 = Math.round((rect.y + rect.height) / cellSize);
    const c0 = Math.round(rect.x / cellSize);
    const c1 = Math.round((rect.x + rect.width) / cellSize);
    for (let r = r0; r < r1; r += 1) for (let c = c0; c < c1; c += 1) blocked[r * columns + c] = 1;
  }
  // extra blockers (native background px rectangles, e.g. NPC bodies) are blocked on top of the mask
  for (const rect of blockers) {
    const r0 = Math.max(0, Math.floor(rect.y / cellSize));
    const r1 = Math.min(rows, Math.ceil((rect.y + rect.height) / cellSize));
    const c0 = Math.max(0, Math.floor(rect.x / cellSize));
    const c1 = Math.min(columns, Math.ceil((rect.x + rect.width) / cellSize));
    for (let r = r0; r < r1; r += 1) for (let c = c0; c < c1; c += 1) blocked[r * columns + c] = 1;
  }
  // 2D prefix sum over cells -> O(1) "does this world-space rectangle touch a blocked cell?"
  const stride = columns + 1;
  const prefix = new Int32Array((rows + 1) * stride);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < columns; c += 1) {
      prefix[(r + 1) * stride + c + 1] = blocked[r * columns + c] + prefix[r * stride + c + 1] + prefix[(r + 1) * stride + c] - prefix[r * stride + c];
    }
  }
  const worldWidth = manifest.width * scale;
  const worldHeight = manifest.height * scale;
  const halfW = PLAYER.width / 2 + margin;
  const halfH = PLAYER.height / 2 + margin;

  const bodyFits = (x, y) => {
    if (x - halfW < 0 || y - halfH < 0 || x + halfW > worldWidth || y + halfH > worldHeight) return false;
    const c0 = Math.floor((x - halfW) / cell);
    const c1 = Math.min(columns - 1, Math.ceil((x + halfW) / cell) - 1);
    const r0 = Math.floor((y - halfH) / cell);
    const r1 = Math.min(rows - 1, Math.ceil((y + halfH) / cell) - 1);
    const sum = prefix[(r1 + 1) * stride + c1 + 1] - prefix[r0 * stride + c1 + 1] - prefix[(r1 + 1) * stride + c0] + prefix[r0 * stride + c0];
    return sum === 0;
  };

  const lw = Math.ceil(worldWidth / step);
  const lh = Math.ceil(worldHeight / step);
  const toLattice = (wx, wy) => [Math.round(wx / step), Math.round(wy / step)];
  const fitsAt = (lx, ly) => lx >= 0 && ly >= 0 && lx < lw && ly < lh && bodyFits(lx * step, ly * step);

  const spawns = MAPS[mapId].spawns;
  const defaultSpawnId = Object.keys(spawns)[0];
  const [sx, sy] = toLattice(spawns[defaultSpawnId].x * scale, spawns[defaultSpawnId].y * scale);

  const reached = new Uint8Array(lw * lh);
  const stack = [];
  const startFits = fitsAt(sx, sy);
  if (startFits) {
    reached[sy * lw + sx] = 1;
    stack.push(sx, sy);
  }
  while (stack.length > 0) {
    const y = stack.pop();
    const x = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= lw || ny >= lh || reached[ny * lw + nx] || !fitsAt(nx, ny)) continue;
      reached[ny * lw + nx] = 1;
      stack.push(nx, ny);
    }
  }
  const canReach = (nativeX, nativeY) => {
    const [lx, ly] = toLattice(nativeX * scale, nativeY * scale);
    // a couple of lattice steps of slack: the Scene lets the body slide into an event zone by its edge
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const x = lx + dx;
        const y = ly + dy;
        if (x >= 0 && y >= 0 && x < lw && y < lh && reached[y * lw + x]) return true;
      }
    }
    return false;
  };

  return {
    startFits,
    spawnResults: Object.entries(spawns).map(([id, spawn]) => ({ id, ok: canReach(spawn.x, spawn.y) })),
    eventResults: events.map((event) => ({ id: event.id, ok: canReach(event.bounds.x + event.bounds.width / 2, event.bounds.y + event.bounds.height / 2) })),
    canReach,
  };
}

// Minimal PNG reader (8-bit RGBA/RGB, non-interlaced) so the tests stay Node/Phaser independent.
export function readPngAsMask(filePath) {
  const buffer = readFileSync(filePath);
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const start = offset + 8;
    if (type === "IHDR") {
      width = buffer.readUInt32BE(start);
      height = buffer.readUInt32BE(start + 4);
      colorType = buffer.readUInt8(start + 9);
    } else if (type === "IDAT") {
      idat.push(buffer.subarray(start, start + length));
    }
    offset = start + length + 4;
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const data = new Uint8ClampedArray(width * height * 4);
  let prev = new Uint8Array(stride);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    const row = new Uint8Array(stride);
    for (let x = 0; x < stride; x += 1) {
      const b = raw[pos + x];
      const a = x >= channels ? row[x - channels] : 0;
      const up = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v;
      if (filter === 0) v = b;
      else if (filter === 1) v = b + a;
      else if (filter === 2) v = b + up;
      else if (filter === 3) v = b + ((a + up) >> 1);
      else {
        const p = a + up - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - c);
        v = b + (pa <= pb && pa <= pc ? a : pb <= pc ? up : c);
      }
      row[x] = v & 0xff;
    }
    pos += stride;
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4;
      const i = x * channels;
      data[o] = row[i];
      data[o + 1] = row[i + 1];
      data[o + 2] = row[i + 2];
      data[o + 3] = channels === 4 ? row[i + 3] : 255;
    }
    prev = row;
  }
  return { width, height, data };
}
