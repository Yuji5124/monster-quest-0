import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/starting_place");

test("image-map manifest points to the four required map layers", () => {
  const manifest = readImageMapManifest(JSON.parse(readFileSync(path.join(MAP_DIR, "map.json"), "utf-8")));
  assert.equal(manifest.coordinateSpace, "background-pixels");
  assert.equal(manifest.id, "map_01_starting_place");
  assert.equal(manifest.assetStatus, "CURRENT");
  assert.equal(manifest.background, "background.png");
  assert.equal(manifest.collision, "collision.png");
  assert.equal(manifest.events, "events.json");
  assert.equal(manifest.objects, "objects.json");
  assert.ok(manifest.width > 0 && manifest.height > 0);
  for (const asset of [manifest.background, manifest.collision, manifest.events, manifest.objects]) {
    assert.ok(existsSync(path.join(MAP_DIR, asset)), `${asset} must exist beside map.json`);
  }
});

test("image-map package routes both No.01 trail exits to the point-selection world map", () => {
  const events = readImageMapEvents(JSON.parse(readFileSync(path.join(MAP_DIR, "events.json"), "utf-8")));
  const objects = readImageMapObjects(JSON.parse(readFileSync(path.join(MAP_DIR, "objects.json"), "utf-8")));
  assert.equal(events.length, 2);
  for (const event of events) {
    assert.equal(event.trigger, "enter");
    assert.equal(event.commands[0].type, "world-map");
    assert.equal(event.commands[0].worldMapEntryId, "from_starting_place");
  }
  assert.deepEqual(objects, []);
});

test("image-map chests accept exactly one reward type", () => {
  const baseChest = {
    id: "chest_test",
    type: "chest",
    label: "たからばこ",
    x: 16,
    y: 24,
    width: 44,
    height: 36,
    blocking: true,
    openedFlag: "chest.test_opened",
  };
  const [coinChest] = readImageMapObjects({ objects: [{ ...baseChest, jumpCoinCount: 1 }] });
  assert.equal(coinChest.type, "chest");
  assert.equal(coinChest.jumpCoinCount, 1);
  assert.equal(coinChest.itemId, undefined);

  assert.throws(
    () => readImageMapObjects({ objects: [{ ...baseChest }] }),
    /exactly one of itemId or jumpCoinCount/,
  );
  assert.throws(
    () => readImageMapObjects({ objects: [{ ...baseChest, itemId: "kaifukuyaku", jumpCoinCount: 1 }] }),
    /exactly one of itemId or jumpCoinCount/,
  );
});
