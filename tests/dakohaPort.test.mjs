import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PLAYER } from "../src/config/player.ts";
import { MAPS } from "../src/config/maps.ts";
import { INTERACTION_REACH } from "../src/config/interaction.ts";
import { findEntrySplash, MAP_ENTRY_SPLASHES } from "../src/config/mapSplash.ts";
import { VILLAGER_SPRITES } from "../src/config/villagerSprites.ts";
import { bodyOffset } from "../src/config/characterWalkSprite.ts";
import { getShop } from "../src/config/shops.ts";
import { getDialogue } from "../src/data/dialogues.ts";
import { buildCollisionRects } from "../src/systems/ImageMapCollisionData.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import { resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/dakoha_port");
const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));
const readPngSize = (file) => {
  const buffer = readFileSync(file);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

test("dakoha-port package: CURRENT manifest, four layers, background and splash are the unmodified user references", () => {
  const manifest = readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
  assert.equal(manifest.id, "map_dakoha_port");
  assert.equal(manifest.assetStatus, "CURRENT");
  for (const asset of [manifest.background, manifest.collision, manifest.events, manifest.objects]) {
    assert.ok(existsSync(path.join(MAP_DIR, asset)), `${asset} must exist beside map.json`);
  }
  const reference = readFileSync(path.join(REPO_ROOT, "assets/maps/reference/reference/港町ダコハ.png"));
  assert.ok(readFileSync(path.join(MAP_DIR, "background.png")).equals(reference), "background.png must be byte-identical to the reference");
  const splashReference = readFileSync(path.join(REPO_ROOT, "assets/maps/reference/reference/港町ダコハ_イメージ.png"));
  assert.ok(readFileSync(path.join(MAP_DIR, "entry_splash.png")).equals(splashReference), "entry_splash.png must be byte-identical to the reference");
  assert.deepEqual(readPngSize(path.join(MAP_DIR, "background.png")), { width: manifest.width, height: manifest.height });
  assert.deepEqual(readPngSize(path.join(MAP_DIR, "collision.png")), { width: manifest.width, height: manifest.height });
  assert.deepEqual(readImageMapObjects(readJson(path.join(MAP_DIR, "objects.json"))), []);
});

test("the world map's 港町ダコハ point enters the port, and the north gate returns to that point", () => {
  const worldMap = readJson(path.join(REPO_ROOT, "assets/maps/world_map/map.json"));
  const destinations = readJson(path.join(REPO_ROOT, "assets/maps/world_map/destinations.json")).destinations;
  const point = destinations.find((destination) => destination.id === "destination_dakoha_port");
  assert.equal(point.implementationStatus, "implemented");
  assert.equal(point.targetMapId, "map_dakoha_port");
  assert.equal(MAPS[point.targetMapId].sceneKey, "DakohaPortScene");
  assert.ok(MAPS[point.targetMapId].spawns[point.targetSpawnId]);

  const events = readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
  const gate = events.find((event) => event.id === "event_dakoha_port_north_gate");
  assert.equal(gate.commands[0].type, "world-map");
  assert.equal(resolveWorldMapEntryDestination(worldMap, destinations, gate.commands[0].worldMapEntryId).id, "destination_dakoha_port");
});

test("entering 港町ダコハ from the world map shows its 5-second image first", () => {
  const splash = MAP_ENTRY_SPLASHES.map_dakoha_port;
  assert.equal(splash.caption, "港町ダコハ");
  assert.equal(splash.fadeInMs + splash.holdMs + splash.fadeOutMs, 5000);
  assert.equal(findEntrySplash("DakohaPortScene", "fromWorldMap")?.mapId, "map_dakoha_port");
});

test("the fromWorldMap spawn's Player body clears the north gate zone (no instant re-trigger)", () => {
  const events = readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
  const gate = events.find((event) => event.id === "event_dakoha_port_north_gate").bounds;
  const spawn = MAPS.map_dakoha_port.spawns.fromWorldMap;
  const overlaps =
    spawn.x + PLAYER.width / 2 > gate.x && spawn.x - PLAYER.width / 2 < gate.x + gate.width &&
    spawn.y + PLAYER.height / 2 > gate.y && spawn.y - PLAYER.height / 2 < gate.y + gate.height;
  assert.equal(overlaps, false);
});

// 2026-09-29ユーザー指示「港町ダコハの村人を追加、宿屋・武器屋を追加」＋「今まで使った村人の画像は使わない」。
// NPC_SPEC.mdの目安7人: 固定5人(やどや・ぶきや・とうだいの老婆・広場の屋台・波止場の漁師)＋歩く2人。
test("dakoha-port has seven data-driven villagers: five fixed at their spot and two local walkers", () => {
  const npcs = MAPS.map_dakoha_port.npcs;
  assert.equal(npcs.length, 7, "NPC_SPEC.md: 目安7人");
  assert.equal(npcs.filter((npc) => !npc.movement).length, 5);
  assert.equal(npcs.filter((npc) => npc.movement?.kind === "wander").length, 2);
  let tarosaMentions = 0;
  for (const npc of npcs) {
    assert.equal(npc.mapId, "map_dakoha_port");
    assert.ok(npc.spriteId && VILLAGER_SPRITES[npc.spriteId], `${npc.id} uses a user-supplied villager sheet`);
    const dialogue = getDialogue(npc.dialogueId);
    assert.ok(dialogue && dialogue.pages.length > 0, `${npc.id} has dialogue`);
    assert.ok(dialogue.pages.length >= 4, `${npc.id} carries a dense conversation (${dialogue.pages.length} pages)`);
    for (const page of dialogue.pages) assert.ok(page.split("\n").length <= 3, `${npc.id} page fits the dialogue box`);
    if (dialogue.pages.some((page) => page.includes("タロサ"))) tarosaMentions += 1;
  }
  assert.ok(tarosaMentions <= 1, "not every villager talks about タロサ");
});

test("dakoha-port villagers use sprites no other map has used before (villager_18〜24, freshly built from unused source sheets)", () => {
  const npcs = MAPS.map_dakoha_port.npcs;
  const dakohaSpriteIds = new Set(npcs.map((npc) => npc.spriteId));
  assert.equal(dakohaSpriteIds.size, 7, "each Dakoha villager has a distinct sprite");
  for (const spriteId of dakohaSpriteIds) {
    assert.ok(/^villager_(1[89]|2[0-4])$/.test(spriteId), `${spriteId} is one of the new villager_18..24 sheets`);
  }
  for (const [mapId, map] of Object.entries(MAPS)) {
    if (mapId === "map_dakoha_port") continue;
    for (const npc of map.npcs ?? []) {
      assert.ok(!dakohaSpriteIds.has(npc.spriteId), `${npc.id} on ${mapId} must not reuse a Dakoha-only sprite`);
    }
  }
});

test("dakoha-port's innkeeper and armory keeper double as its inn and weapon shop (user asked for those two only)", () => {
  assert.equal(getShop("npc_dakoha_port_innkeeper")?.kind, "inn");
  assert.equal(getShop("npc_dakoha_port_armory_keeper")?.kind, "weapon");
  assert.equal(getShop("npc_dakoha_port_lighthouse_widow"), undefined, "the lighthouse widow keeps a plain conversation, not a shop");
  assert.equal(getShop("npc_dakoha_port_market_vendor"), undefined, "the market vendor keeps a plain conversation, not a shop");
  assert.equal(getShop("npc_dakoha_port_fisherman"), undefined, "the fisherman keeps a plain conversation, not a shop");
});

test("dakoha-port fixed villagers can be talked to from the walkable path right below them", () => {
  const manifest = readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
  const scale = manifest.worldScale;
  const collisionRects = buildCollisionRects(readPngAsMask(path.join(MAP_DIR, "collision.png")), manifest.collisionCellSize)
    .map((rect) => ({ x: rect.x * scale, y: rect.y * scale, width: rect.width * scale, height: rect.height * scale }));
  const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  for (const npc of MAPS.map_dakoha_port.npcs.filter((candidate) => !candidate.movement)) {
    assert.equal(npc.facing, "down", `${npc.id} faces the path`);
    const sprite = VILLAGER_SPRITES[npc.spriteId];
    const offset = bodyOffset(sprite, PLAYER.width, PLAYER.height);
    const npcBottom = npc.position.y * scale - sprite.frameHeight / 2 + offset.y + PLAYER.height;
    const player = { x: npc.position.x * scale - PLAYER.width / 2, width: PLAYER.width, height: PLAYER.height };
    let top = npcBottom;
    while (top < npcBottom + 60 && collisionRects.some((rect) => overlaps({ ...player, y: top }, rect))) top += 1;
    assert.equal(collisionRects.some((rect) => overlaps({ ...player, y: top }, rect)), false, `${npc.id} has walkable ground below`);
    assert.ok(top + PLAYER.height / 2 - INTERACTION_REACH <= npcBottom, `${npc.id} is within talking reach (gap ${(top - npcBottom).toFixed(1)}px)`);
  }
});

test("dakoha-port walkers only wander over walkable ground", () => {
  const manifest = readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
  const scale = manifest.worldScale;
  const collisionRects = buildCollisionRects(readPngAsMask(path.join(MAP_DIR, "collision.png")), manifest.collisionCellSize)
    .map((rect) => ({ x: rect.x * scale, y: rect.y * scale, width: rect.width * scale, height: rect.height * scale }));
  const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  for (const npc of MAPS.map_dakoha_port.npcs.filter((candidate) => candidate.movement)) {
    const sprite = VILLAGER_SPRITES[npc.spriteId];
    const offset = bodyOffset(sprite, PLAYER.width, PLAYER.height);
    for (let step = 0; step <= 16; step += 1) {
      const angle = Math.PI * 2 * step / 16;
      const radius = step === 16 ? 0 : npc.movement.radius;
      const x = (npc.position.x + Math.cos(angle) * radius) * scale;
      const y = (npc.position.y + Math.sin(angle) * radius) * scale;
      const body = { x: x - sprite.frameWidth / 2 + offset.x, y: y - sprite.frameHeight / 2 + offset.y, width: PLAYER.width, height: PLAYER.height };
      assert.equal(collisionRects.some((rect) => overlaps(body, rect)), false, `${npc.id} can select a collision area at ${(x / scale).toFixed(1)},${(y / scale).toFixed(1)}`);
    }
  }
});

function readPngAsMask(filePath) {
  const buffer = readFileSync(filePath);
  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idatChunks = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    if (type === "IHDR") {
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      bitDepth = buffer.readUInt8(dataStart + 8);
      colorType = buffer.readUInt8(dataStart + 9);
    } else if (type === "IDAT") {
      idatChunks.push(buffer.subarray(dataStart, dataStart + length));
    }
    offset = dataStart + length + 4;
  }
  assert.equal(bitDepth, 8, "collision.png must be 8-bit for this minimal decoder");
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : (() => { throw new Error(`unsupported PNG colorType ${colorType}`); })();
  const raw = inflateSync(Buffer.concat(idatChunks));
  const stride = width * channels;
  const data = new Uint8ClampedArray(width * height * 4);
  let prevRow = new Uint8Array(stride);
  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filterType = raw[rawOffset];
    rawOffset += 1;
    const row = new Uint8Array(stride);
    for (let x = 0; x < stride; x += 1) {
      const rawByte = raw[rawOffset + x];
      const a = x >= channels ? row[x - channels] : 0;
      const b = prevRow[x];
      const c = x >= channels ? prevRow[x - channels] : 0;
      let value;
      if (filterType === 0) value = rawByte;
      else if (filterType === 1) value = rawByte + a;
      else if (filterType === 2) value = rawByte + b;
      else if (filterType === 3) value = rawByte + Math.floor((a + b) / 2);
      else if (filterType === 4) value = rawByte + paeth(a, b, c);
      else throw new Error(`unsupported PNG filter type ${filterType}`);
      row[x] = value & 0xff;
    }
    rawOffset += stride;
    for (let x = 0; x < width; x += 1) {
      const pixelOffset = (y * width + x) * 4;
      const rowOffset = x * channels;
      data[pixelOffset] = row[rowOffset];
      data[pixelOffset + 1] = row[rowOffset + 1];
      data[pixelOffset + 2] = row[rowOffset + 2];
      data[pixelOffset + 3] = channels === 4 ? row[rowOffset + 3] : 255;
    }
    prevRow = row;
  }
  return { width, height, data };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}
