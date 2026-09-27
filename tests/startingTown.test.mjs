import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { MAPS } from "../src/config/maps.ts";
import { PLAYER } from "../src/config/player.ts";
import { INTERACTION_REACH } from "../src/config/interaction.ts";
import { VILLAGER_SPRITES } from "../src/config/villagerSprites.ts";
import { bodyOffset } from "../src/config/characterWalkSprite.ts";
import { buildCollisionRects } from "../src/systems/ImageMapCollisionData.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/starting_town");
const REFERENCE_PATH = path.join(REPO_ROOT, "assets/maps/reference/reference/はじまりのまち.png");

function readPngSize(filePath) {
  const buffer = readFileSync(filePath);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("starting-town image-map manifest points to the four required map layers", () => {
  const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(MAP_DIR, "map.json"), "utf-8")));
  assert.equal(manifest.coordinateSpace, "background-pixels");
  assert.equal(manifest.id, "map_02_starting_town");
  assert.equal(manifest.assetStatus, "CURRENT");
  assert.equal(manifest.background, "background.png");
  assert.equal(manifest.collision, "collision.png");
  assert.equal(manifest.events, "events.json");
  assert.equal(manifest.objects, "objects.json");
  for (const asset of [manifest.background, manifest.collision, manifest.events, manifest.objects]) {
    assert.ok(existsSync(path.join(MAP_DIR, asset)), `${asset} must exist beside map.json`);
  }
});

test("starting-town background is an unmodified copy of the user-supplied reference image", () => {
  assert.ok(existsSync(REFERENCE_PATH), "original reference image must still exist and not be deleted/overwritten");
  const referenceBytes = readFileSync(REFERENCE_PATH);
  const backgroundBytes = readFileSync(path.join(MAP_DIR, "background.png"));
  assert.ok(referenceBytes.equals(backgroundBytes), "background.png must be byte-identical to the reference (not redrawn)");
});

test("starting-town background and collision share the same pixel dimensions as the manifest", () => {
  const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(MAP_DIR, "map.json"), "utf-8")));
  const backgroundSize = readPngSize(path.join(MAP_DIR, "background.png"));
  const collisionSize = readPngSize(path.join(MAP_DIR, "collision.png"));
  assert.deepEqual(backgroundSize, { width: manifest.width, height: manifest.height });
  assert.deepEqual(collisionSize, { width: manifest.width, height: manifest.height });
});

test("starting-town package routes its west-edge event to the point-selection world map", () => {
  const events = readImageMapEvents(JSON.parse(readFileSync(path.join(MAP_DIR, "events.json"), "utf-8")));
  const objects = readImageMapObjects(JSON.parse(readFileSync(path.join(MAP_DIR, "objects.json"), "utf-8")));
  assert.equal(events.length, 1);
  assert.equal(events[0].trigger, "enter");
  assert.equal(events[0].commands[0].type, "world-map");
  assert.equal(events[0].commands[0].worldMapEntryId, "from_starting_town");
  // NPCs still come from MAPS.npcs (dialogue/party-join/battle integration); objects.json stays empty.
  assert.deepEqual(objects, []);
});

test("starting-town collision mask keeps the plaza, west exit and every building's front spawn walkable", () => {
  const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(MAP_DIR, "map.json"), "utf-8")));
  const collisionRects = buildCollisionRects(readPngAsMask(path.join(MAP_DIR, "collision.png")), manifest.collisionCellSize);
  assert.ok(collisionRects.length > 0);

  const isBlocked = (x, y) => collisionRects.some((rect) => x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height);

  const town = MAPS.map_02_starting_town;
  const fieldArrival = town.spawns.fromWorldMap;
  assert.equal(isBlocked(fieldArrival.x, fieldArrival.y), false, "the green field-arrival spawn must be walkable");
  const westExit = readImageMapEvents(JSON.parse(readFileSync(path.join(MAP_DIR, "events.json"), "utf-8"))).find((event) => event.id === "event_starting_town_west_exit");
  assert.ok(westExit, "the blue west-exit event must exist");
  assert.equal(isBlocked(westExit.bounds.x + westExit.bounds.width / 2, westExit.bounds.y + westExit.bounds.height / 2), false, "the blue west exit must be walkable");
  assert.equal(isBlocked(620, 480), false, "the fountain plaza approach must be walkable");

  for (const building of town.buildings) {
    const spawn = town.spawns[building.frontSpawnId];
    assert.ok(spawn, `${building.id} -> missing frontSpawnId ${building.frontSpawnId}`);
    assert.equal(isBlocked(spawn.x, spawn.y), false, `${building.id} frontSpawn (${spawn.x},${spawn.y}) must be walkable`);
    const doorCx = building.door.x + building.door.width / 2;
    const doorCy = building.door.y + building.door.height / 2;
    assert.equal(isBlocked(doorCx, doorCy), false, `${building.id} door center must be walkable (door notch left open)`);
  }

  assert.equal(isBlocked(150, 100), true, "deep forest corners must stay blocked");
  assert.equal(isBlocked(1350, 200), true, "the river must stay blocked");
});

test("starting-town red points are seven data-driven villagers: four fixed shopkeepers and three local walkers, plus the one-time tower elder", () => {
  const town = MAPS.map_02_starting_town;
  const shopkeepers = town.npcs.filter((npc) => npc.role === "shopkeeper");
  const walkers = town.npcs.filter((npc) => npc.role === "resident");
  const storyNpcs = town.npcs.filter((npc) => npc.role === "story");
  assert.equal(town.npcs.length, 8);
  assert.equal(shopkeepers.length, 4);
  assert.equal(walkers.length, 3);
  assert.deepEqual(storyNpcs.map((npc) => npc.id), ["npc_start_town_tower_elder"], "the tower elder is the only story NPC outside the seven red-point villagers");
  assert.equal(shopkeepers.every((npc) => !npc.movement), true, "shopkeepers must stay at their storefronts");
  assert.equal(walkers.every((npc) => npc.movement?.kind === "wander"), true, "non-shop red points must wander");
  assert.equal(town.npcs.every((npc) => npc.spriteId), true, "every town villager must select an asset-backed sprite");
  assert.deepEqual(town.spawns.fromField, town.spawns.fromWorldMap, "Field and world-map arrivals share the green south entrance");
  assert.deepEqual(town.spawns.fromWorldMap, { x: 690, y: 1030, facing: "up" });
});

test("starting-town villagers' feet bodies begin on walkable ground", () => {
  const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(MAP_DIR, "map.json"), "utf-8")));
  const collisionRects = buildCollisionRects(readPngAsMask(path.join(MAP_DIR, "collision.png")), manifest.collisionCellSize);
  const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

  for (const npc of MAPS.map_02_starting_town.npcs.filter((candidate) => candidate.movement)) {
    assert.ok(npc.spriteId, `${npc.id} must select a villager sprite`);
    const sprite = VILLAGER_SPRITES[npc.spriteId];
    const offset = bodyOffset(sprite, PLAYER.width, PLAYER.height);
    const positions = [{ ...npc.position }];
    for (let step = 0; step < 16; step += 1) {
      const angle = Math.PI * 2 * step / 16;
      positions.push({
        x: npc.position.x + Math.cos(angle) * npc.movement.radius,
        y: npc.position.y + Math.sin(angle) * npc.movement.radius,
      });
    }
    for (const position of positions) {
      const body = {
        x: position.x - sprite.frameWidth / 2 + offset.x,
        y: position.y - sprite.frameHeight / 2 + offset.y,
        width: PLAYER.width,
        height: PLAYER.height,
      };
      assert.equal(collisionRects.some((rect) => overlaps(body, rect)), false, `${npc.id} can select a collision area at ${position.x.toFixed(1)},${position.y.toFixed(1)}`);
    }
  }
});

test("fixed villagers stand at a door and can be talked to from the walkable path right below", () => {
  const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(MAP_DIR, "map.json"), "utf-8")));
  const scale = manifest.worldScale;
  const collisionRects = buildCollisionRects(readPngAsMask(path.join(MAP_DIR, "collision.png")), manifest.collisionCellSize)
    .map((rect) => ({ x: rect.x * scale, y: rect.y * scale, width: rect.width * scale, height: rect.height * scale }));
  const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  const town = MAPS.map_02_starting_town;

  for (const npc of town.npcs.filter((candidate) => candidate.role === "shopkeeper")) {
    const building = town.buildings.find((candidate) =>
      npc.position.x >= candidate.footprint.x && npc.position.x <= candidate.footprint.x + candidate.footprint.width &&
      Math.abs(npc.position.y - (candidate.door.y + candidate.door.height / 2)) <= 40);
    assert.ok(building, `${npc.id} must stand at a building's door`);
    assert.equal(npc.facing, "down", `${npc.id} faces the path`);

    // Runtime: position is scaled by worldScale; the sprite and its feet body are not.
    const sprite = VILLAGER_SPRITES[npc.spriteId];
    const offset = bodyOffset(sprite, PLAYER.width, PLAYER.height);
    const npcBottom = npc.position.y * scale - sprite.frameHeight / 2 + offset.y + PLAYER.height;
    const player = { x: npc.position.x * scale - PLAYER.width / 2, width: PLAYER.width, height: PLAYER.height };
    // The closest spot right below the NPC where the player's feet body fits on walkable ground.
    let top = npcBottom;
    while (top < npcBottom + 60 && collisionRects.some((rect) => overlaps({ ...player, y: top }, rect))) top += 1;
    const reachEnd = top + PLAYER.height / 2 - INTERACTION_REACH;
    assert.ok(reachEnd <= npcBottom, `${npc.id} is within talking reach (gap ${(top - npcBottom).toFixed(1)}px)`);
  }
});

test("the tower elder stands on open road east of the weapon shop, clear of other villagers, and can be reached from the side he faces", () => {
  const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(MAP_DIR, "map.json"), "utf-8")));
  const scale = manifest.worldScale;
  const collisionRects = buildCollisionRects(readPngAsMask(path.join(MAP_DIR, "collision.png")), manifest.collisionCellSize)
    .map((rect) => ({ x: rect.x * scale, y: rect.y * scale, width: rect.width * scale, height: rect.height * scale }));
  const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  const town = MAPS.map_02_starting_town;
  const feetBody = (npc) => {
    const sprite = VILLAGER_SPRITES[npc.spriteId];
    const offset = bodyOffset(sprite, PLAYER.width, PLAYER.height);
    return {
      x: npc.position.x * scale - sprite.frameWidth / 2 + offset.x,
      y: npc.position.y * scale - sprite.frameHeight / 2 + offset.y,
      width: PLAYER.width,
      height: PLAYER.height,
    };
  };

  const elder = town.npcs.find((npc) => npc.id === "npc_start_town_tower_elder");
  const body = feetBody(elder);
  assert.equal(collisionRects.some((rect) => overlaps(body, rect)), false, "his feet must start on walkable ground");
  // 主人公が立てる足元Bodyの余白: 向いている左側に、Bodyが1つ入る空きがある。
  const facingSide = { ...body, x: body.x - PLAYER.width - 2 };
  assert.equal(elder.facing, "left");
  assert.equal(collisionRects.some((rect) => overlaps(facingSide, rect)), false, "the player can stand on the side he faces");

  const weaponShop = town.buildings.find((building) => building.kind === "weapon_shop");
  assert.ok(elder.position.x > weaponShop.footprint.x + weaponShop.footprint.width / 2, "east of the weapon shop's centre");
  assert.ok(Math.abs(elder.position.x - weaponShop.door.x) < 160 && elder.position.y > weaponShop.door.y, "within a short walk of the weapon shop door");
  for (const other of town.npcs.filter((npc) => npc.id !== elder.id)) {
    const otherBodies = other.movement
      ? Array.from({ length: 16 }, (_, step) => {
          const angle = Math.PI * 2 * step / 16;
          return feetBody({ ...other, position: { x: other.position.x + Math.cos(angle) * other.movement.radius, y: other.position.y + Math.sin(angle) * other.movement.radius } });
        })
      : [feetBody(other)];
    for (const otherBody of otherBodies) assert.equal(overlaps(body, otherBody), false, `${other.id} must never overlap the elder`);
  }
});

test("no building frontSpawn's full Player body overlaps its own door trigger zone (no instant re-trigger)", () => {
  const PLAYER_WIDTH = PLAYER.width;
  const PLAYER_HEIGHT = PLAYER.height;
  const town = MAPS.map_02_starting_town;
  for (const building of town.buildings) {
    const spawn = town.spawns[building.frontSpawnId];
    const halfW = PLAYER_WIDTH / 2;
    const halfH = PLAYER_HEIGHT / 2;
    const door = building.door;
    const overlap =
      spawn.x + halfW > door.x && spawn.x - halfW < door.x + door.width &&
      spawn.y + halfH > door.y && spawn.y - halfH < door.y + door.height;
    assert.equal(overlap, false, `${building.id} frontSpawn body overlaps its own door zone`);
  }
});

// Minimal PNG reader (8-bit RGBA/RGB, non-interlaced), mirrors tests/bieVillage.test.mjs so this
// file stays Node/Phaser-independent instead of depending on the browser Canvas the runtime uses.
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
