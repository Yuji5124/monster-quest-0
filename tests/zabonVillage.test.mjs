import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PLAYER } from "../src/config/player.ts";
import { MAPS } from "../src/config/maps.ts";
import { getShop } from "../src/config/shops.ts";
import { inflateSync } from "node:zlib";
import { INTERACTION_REACH } from "../src/config/interaction.ts";
import { VILLAGER_SPRITES } from "../src/config/villagerSprites.ts";
import { TAROSA_SPRITE } from "../src/config/tarosaSprite.ts";
import { STORY_FLAGS } from "../src/config/storyFlags.ts";
import { bodyOffset } from "../src/config/characterWalkSprite.ts";
import { getDialogue } from "../src/data/dialogues.ts";
import { buildCollisionRects } from "../src/systems/ImageMapCollisionData.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import { resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/zabon_village");
const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));
const readPngSize = (file) => {
  const buffer = readFileSync(file);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

test("zabon-village package: CURRENT manifest, four layers, background is the unmodified user reference", () => {
  const manifest = readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
  assert.equal(manifest.id, "map_zabon_village");
  assert.equal(manifest.assetStatus, "CURRENT");
  for (const asset of [manifest.background, manifest.collision, manifest.events, manifest.objects]) {
    assert.ok(existsSync(path.join(MAP_DIR, asset)), `${asset} must exist beside map.json`);
  }
  const reference = readFileSync(path.join(REPO_ROOT, "assets/maps/reference/reference/ザボンのむら　新.png"));
  assert.ok(readFileSync(path.join(MAP_DIR, "background.png")).equals(reference), "background.png must be byte-identical to the reference");
  assert.deepEqual(readPngSize(path.join(MAP_DIR, "background.png")), { width: manifest.width, height: manifest.height });
  assert.deepEqual(readPngSize(path.join(MAP_DIR, "collision.png")), { width: manifest.width, height: manifest.height });
});

test("zabon-village north exit leads to the world map and the world map leads back to the village", () => {
  const events = readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
  const exit = events.find((event) => event.id === "event_zabon_village_north_exit");
  assert.equal(exit.commands[0].type, "world-map");
  const worldMap = readJson(path.join(REPO_ROOT, "assets/maps/world_map/map.json"));
  const destinations = readJson(path.join(REPO_ROOT, "assets/maps/world_map/destinations.json")).destinations;
  const destination = resolveWorldMapEntryDestination(worldMap, destinations, exit.commands[0].worldMapEntryId);
  assert.equal(destination.id, "destination_zabon_village");
  assert.equal(destination.implementationStatus, "implemented");
  assert.equal(MAPS[destination.targetMapId].sceneKey, "ZabonVillageScene");
  assert.ok(MAPS[destination.targetMapId].spawns[destination.targetSpawnId]);
  // No NPCs yet: docs/NPC_SPEC.md still lists ザボンのむら's NPC layout as under review.
  assert.deepEqual(readImageMapObjects(readJson(path.join(MAP_DIR, "objects.json"))), []);
});

test("the fromWorldMap spawn's Player body clears the north exit zone (no instant re-trigger)", () => {
  const events = readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
  const gate = events.find((event) => event.id === "event_zabon_village_north_exit").bounds;
  const spawn = MAPS.map_zabon_village.spawns.fromWorldMap;
  const overlaps =
    spawn.x + PLAYER.width / 2 > gate.x && spawn.x - PLAYER.width / 2 < gate.x + gate.width &&
    spawn.y + PLAYER.height / 2 > gate.y && spawn.y - PLAYER.height / 2 < gate.y + gate.height;
  assert.equal(overlaps, false);
});

test("zabon-village has six residents: four fixed at doors and two local walkers", () => {
  const villagers = MAPS.map_zabon_village.npcs.filter((npc) => !npc.characterId && npc.role !== "priest");
  assert.equal(villagers.length, 6, "NPC_SPEC.md: 目安6人");
  assert.equal(villagers.filter((npc) => !npc.movement).length, 4);
  assert.equal(villagers.filter((npc) => npc.movement?.kind === "wander").length, 2);
  let tarosaMentions = 0;
  for (const npc of villagers) {
    assert.equal(npc.mapId, "map_zabon_village");
    assert.ok(npc.spriteId && VILLAGER_SPRITES[npc.spriteId], `${npc.id} uses a user-supplied villager sheet`);
    const dialogue = getDialogue(npc.dialogueId);
    assert.ok(dialogue && dialogue.pages.length > 0, `${npc.id} has dialogue`);
    // 2026-09-27ユーザー依頼「住人の立ち位置、会話内容を他に合わせて更新」: レインランドじょうかまちと同じく1人4ページ以上。
    assert.ok(dialogue.pages.length >= 4, `${npc.id} carries a dense conversation (${dialogue.pages.length} pages)`);
    for (const page of dialogue.pages) assert.ok(page.split("\n").length <= 3, `${npc.id} page fits the dialogue box`);
    if (dialogue.pages.some((page) => page.includes("タロサ"))) tarosaMentions += 1;
  }
  assert.ok(tarosaMentions <= 1, "not every villager talks about タロサ");
});

test("zabon-village has a save priest at the guardian pillar and its three storefront services", () => {
  const map = MAPS.map_zabon_village;
  const priest = map.npcs.find((npc) => npc.id === "npc_zabon_village_priest");
  assert.deepEqual([priest?.role, priest?.facing, priest?.position], ["priest", "down", { x: 716, y: 590 }]);
  assert.deepEqual(map.spawns.priest, { x: 716, y: 650, facing: "up" });
  assert.equal(getShop("npc_zabon_village_elder")?.kind, "inn");
  assert.equal(getShop("npc_zabon_village_roof_mender")?.kind, "weapon");
  assert.equal(getShop("npc_zabon_village_tanner")?.kind, "item");
});

test("after the Majin report, Tarosa waits at the range, refuses once, then leaves to rescue the hero", () => {
  const tarosa = MAPS.map_zabon_village.npcs.find((npc) => npc.id === "npc_zabon_tarosa");
  assert.deepEqual(
    [tarosa?.characterId, tarosa?.role, tarosa?.requiredFlag, tarosa?.departedFlag],
    ["tarosa", "story", STORY_FLAGS.majinCaveReportedToKing, STORY_FLAGS.tarosaJoinedAtIwayama],
  );
  assert.equal(tarosa?.spriteId, undefined, "Tarosa must use his supplied character sheet, not a villager substitute");
  const refusal = getDialogue("npc_zabon_tarosa", undefined, { hasFlag: () => false });
  assert.equal(refusal.afterDialogue?.type, "story-flags");
  assert.deepEqual(refusal.afterDialogue?.flags, [STORY_FLAGS.tarosaRefusedRequest]);
  assert.match(refusal.pages.join("\n"), /ひとりで　いく/);
  const afterRefusal = getDialogue("npc_zabon_tarosa", undefined, { hasFlag: (flag) => flag === STORY_FLAGS.tarosaRefusedRequest });
  assert.equal(afterRefusal.afterDialogue, undefined);
  assert.match(afterRefusal.pages.join("\n"), /あとから　いく/);
});

test("zabon-village fixed villagers can be talked to from the walkable path right below them", () => {
  const manifest = readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
  const scale = manifest.worldScale;
  const collisionRects = buildCollisionRects(readPngAsMask(path.join(MAP_DIR, "collision.png")), manifest.collisionCellSize)
    .map((rect) => ({ x: rect.x * scale, y: rect.y * scale, width: rect.width * scale, height: rect.height * scale }));
  const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  for (const npc of MAPS.map_zabon_village.npcs.filter((candidate) => !candidate.movement && !candidate.characterId)) {
    assert.equal(npc.facing, "down", `${npc.id} faces the path`);
    const sprite = VILLAGER_SPRITES[npc.spriteId];
    const offset = bodyOffset(sprite, PLAYER.width, PLAYER.height);
    const npcBottom = npc.position.y * scale - sprite.frameHeight / 2 + offset.y + PLAYER.height;
    const player = { x: npc.position.x * scale - PLAYER.width / 2, width: PLAYER.width, height: PLAYER.height };
    let top = npcBottom;
    while (top < npcBottom + 60 && collisionRects.some((rect) => overlaps({ ...player, y: top }, rect))) top += 1;
    assert.equal(collisionRects.some((rect) => overlaps({ ...player, y: top }, rect)), false, `${npc.id} has walkable ground below`);
    assert.equal(collisionRects.some((rect) => overlaps({ ...player, y: top + PLAYER.height }, rect)), false, `${npc.id} is reachable from the road`);
    assert.ok(top + PLAYER.height / 2 - INTERACTION_REACH <= npcBottom, `${npc.id} is within talking reach (gap ${(top - npcBottom).toFixed(1)}px)`);
  }
});

test("Tarosa's story position is reachable from the archery-range path", () => {
  const manifest = readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
  const scale = manifest.worldScale;
  const collisionRects = buildCollisionRects(readPngAsMask(path.join(MAP_DIR, "collision.png")), manifest.collisionCellSize)
    .map((rect) => ({ x: rect.x * scale, y: rect.y * scale, width: rect.width * scale, height: rect.height * scale }));
  const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  const tarosa = MAPS.map_zabon_village.npcs.find((npc) => npc.id === "npc_zabon_tarosa");
  assert.ok(tarosa);
  const offset = bodyOffset(TAROSA_SPRITE, PLAYER.width, PLAYER.height);
  const npcBottom = tarosa.position.y * scale - TAROSA_SPRITE.frameHeight / 2 + offset.y + PLAYER.height;
  const player = { x: tarosa.position.x * scale - PLAYER.width / 2, width: PLAYER.width, height: PLAYER.height };
  let top = npcBottom;
  while (top < npcBottom + 60 && collisionRects.some((rect) => overlaps({ ...player, y: top }, rect))) top += 1;
  assert.equal(collisionRects.some((rect) => overlaps({ ...player, y: top }, rect)), false, "Tarosa has walkable ground below");
  assert.equal(collisionRects.some((rect) => overlaps({ ...player, y: top + PLAYER.height }, rect)), false, "Tarosa is reachable from the range path");
  assert.ok(top + PLAYER.height / 2 - INTERACTION_REACH <= npcBottom, "Tarosa is within talking reach");
});

test("zabon-village walkers only wander over walkable ground", () => {
  const manifest = readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
  const scale = manifest.worldScale;
  const collisionRects = buildCollisionRects(readPngAsMask(path.join(MAP_DIR, "collision.png")), manifest.collisionCellSize)
    .map((rect) => ({ x: rect.x * scale, y: rect.y * scale, width: rect.width * scale, height: rect.height * scale }));
  const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  for (const npc of MAPS.map_zabon_village.npcs.filter((candidate) => candidate.movement)) {
    const sprite = VILLAGER_SPRITES[npc.spriteId];
    const offset = bodyOffset(sprite, PLAYER.width, PLAYER.height);
    for (let step = 0; step <= 16; step += 1) {
      const angle = Math.PI * 2 * step / 16;
      const radius = step === 16 ? 0 : npc.movement.radius;
      // Runtime units: position and radius are scaled by worldScale; the sprite and its feet body are not.
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
