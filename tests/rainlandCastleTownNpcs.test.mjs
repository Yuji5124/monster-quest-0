import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { PLAYER } from "../src/config/player.ts";
import { MAPS } from "../src/config/maps.ts";
import { INTERACTION_REACH } from "../src/config/interaction.ts";
import { VILLAGER_SPRITES } from "../src/config/villagerSprites.ts";
import { bodyOffset } from "../src/config/characterWalkSprite.ts";
import { getDialogue } from "../src/data/dialogues.ts";
import { buildCollisionRects } from "../src/systems/ImageMapCollisionData.ts";
import { readImageMapManifest } from "../src/systems/ImageMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/rainland_castle_town");
const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));
const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

function runtimeCollision() {
  const manifest = readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
  const scale = manifest.worldScale;
  const rects = buildCollisionRects(readPngAsMask(path.join(MAP_DIR, "collision.png")), manifest.collisionCellSize)
    .map((rect) => ({ x: rect.x * scale, y: rect.y * scale, width: rect.width * scale, height: rect.height * scale }));
  return { scale, rects };
}

test("rainland-castle-town has its eight residents, demo card-preparation NPC, and fixed priest", () => {
  const npcs = MAPS.map_rainland_castle_town.npcs;
  assert.equal(npcs.length, 10);
  assert.equal(npcs.filter((npc) => !npc.movement).length, 7);
  assert.equal(npcs.filter((npc) => npc.movement?.kind === "wander").length, 3);
  assert.equal(new Set(npcs.map((npc) => npc.spriteId)).size, npcs.length, "each villager looks different within the town");
  let kingMentions = 0;
  for (const npc of npcs) {
    assert.equal(npc.mapId, "map_rainland_castle_town");
    assert.ok(npc.spriteId && VILLAGER_SPRITES[npc.spriteId], `${npc.id} uses a user-supplied villager sheet`);
    const dialogue = getDialogue(npc.dialogueId);
    assert.ok(dialogue && dialogue.pages.length > 0, `${npc.id} has dialogue`);
    if (npc.role === "priest") {
      assert.equal(npc.id, "npc_rainland_town_priest");
      continue;
    }
    if (npc.id === "npc_rainland_town_purin_card_battler") {
      assert.equal(npc.jumpCardBattleId, undefined, "the demo must not launch the card-battle scene");
      assert.deepEqual(dialogue.pages, ["ジャンカードで　対戦ができるように\n準備しています。"]);
      continue;
    }
    // 2026-09-27ユーザー依頼「もっと密度の高い情報がいきかっています」: 城下町は情報が集まる町なので、1人4ページ以上。
    assert.ok(dialogue.pages.length >= 4, `${npc.id} carries a dense conversation (${dialogue.pages.length} pages)`);
    for (const page of dialogue.pages) {
      assert.ok(page.split("\n").length <= 3, `${npc.id} page fits the dialogue box`);
      // NPC/04_rainland_castle.md §4: no hints about Mirei's identity; CLAUDE.md: no jump-card hints in the main story.
      assert.doesNotMatch(page, /ミレイ|ひめ|姫|ジャンカード|あいことば/, `${npc.id} keeps story secrets`);
    }
    if (dialogue.pages.some((page) => page.includes("おうさま"))) kingMentions += 1;
  }
  assert.ok(kingMentions <= 1, "the royal family is one villager's topic, not everyone's");
});

test("rainland-castle-town fixed villagers can be talked to from the walkable path right below them", () => {
  const { scale, rects } = runtimeCollision();
  for (const npc of MAPS.map_rainland_castle_town.npcs.filter((candidate) => !candidate.movement)) {
    assert.equal(npc.facing, "down", `${npc.id} faces the path`);
    const sprite = VILLAGER_SPRITES[npc.spriteId];
    const offset = bodyOffset(sprite, PLAYER.width, PLAYER.height);
    const npcBottom = npc.position.y * scale - sprite.frameHeight / 2 + offset.y + PLAYER.height;
    const player = { x: npc.position.x * scale - PLAYER.width / 2, width: PLAYER.width, height: PLAYER.height };
    let top = npcBottom;
    while (top < npcBottom + 60 && rects.some((rect) => overlaps({ ...player, y: top }, rect))) top += 1;
    assert.equal(rects.some((rect) => overlaps({ ...player, y: top }, rect)), false, `${npc.id} has walkable ground below`);
    assert.equal(rects.some((rect) => overlaps({ ...player, y: top + PLAYER.height }, rect)), false, `${npc.id} is reachable from the road`);
    assert.ok(top + PLAYER.height / 2 - INTERACTION_REACH <= npcBottom, `${npc.id} is within talking reach (gap ${(top - npcBottom).toFixed(1)}px)`);
  }
});

test("rainland-castle-town walkers only wander over walkable ground", () => {
  const { scale, rects } = runtimeCollision();
  for (const npc of MAPS.map_rainland_castle_town.npcs.filter((candidate) => candidate.movement)) {
    const sprite = VILLAGER_SPRITES[npc.spriteId];
    const offset = bodyOffset(sprite, PLAYER.width, PLAYER.height);
    for (let step = 0; step <= 16; step += 1) {
      const angle = Math.PI * 2 * step / 16;
      const radius = step === 16 ? 0 : npc.movement.radius;
      const x = (npc.position.x + Math.cos(angle) * radius) * scale;
      const y = (npc.position.y + Math.sin(angle) * radius) * scale;
      const body = { x: x - sprite.frameWidth / 2 + offset.x, y: y - sprite.frameHeight / 2 + offset.y, width: PLAYER.width, height: PLAYER.height };
      assert.equal(rects.some((rect) => overlaps(body, rect)), false, `${npc.id} can select a collision area at ${(x / scale).toFixed(1)},${(y / scale).toFixed(1)}`);
    }
  }
});

test("rainland-castle-town villagers stay clear of the gate events and the arrival spawns", () => {
  const events = readJson(path.join(MAP_DIR, "events.json")).events;
  const spawns = Object.values(MAPS.map_rainland_castle_town.spawns);
  for (const npc of MAPS.map_rainland_castle_town.npcs) {
    const reach = (npc.movement?.radius ?? 0) + 40;
    for (const event of events) {
      const b = event.bounds;
      assert.equal(overlaps({ x: npc.position.x - reach, y: npc.position.y - reach, width: reach * 2, height: reach * 2 }, b), false, `${npc.id} is away from ${event.id}`);
    }
    for (const spawn of spawns) assert.ok(Math.hypot(spawn.x - npc.position.x, spawn.y - npc.position.y) > reach, `${npc.id} does not block a spawn`);
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
