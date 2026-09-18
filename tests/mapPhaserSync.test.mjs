import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildMergedMap, MAPS_TO_SYNC } from "../tools/mq0-map-ai/sync-map-for-phaser.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("public/assets/maps sync target exists for every registered map", () => {
  for (const { out } of MAPS_TO_SYNC) {
    assert.ok(existsSync(path.join(REPO_ROOT, out)), `missing generated file: ${out} (run "npm run sync:maps")`);
  }
});

test("public/ merged map JSON matches what sync-map-for-phaser would produce right now (no drift from tiled/)", () => {
  for (const { tmj, out } of MAPS_TO_SYNC) {
    const expected = buildMergedMap(tmj);
    const actual = JSON.parse(readFileSync(path.join(REPO_ROOT, out), "utf-8"));
    assert.deepEqual(
      actual,
      expected,
      `${out} is stale relative to ${tmj} -- run "npm run sync:maps" after editing the Tiled source`,
    );
  }
});

test("merged map JSON is self-contained: no tileset entry still has an external 'source' reference", () => {
  for (const { out } of MAPS_TO_SYNC) {
    const merged = JSON.parse(readFileSync(path.join(REPO_ROOT, out), "utf-8"));
    for (const ts of merged.tilesets) {
      assert.equal(ts.source, undefined, `tileset at firstgid ${ts.firstgid} still has an external source (Phaser cannot load this)`);
      assert.equal(typeof ts.name, "string");
      assert.ok(Array.isArray(ts.tiles) || ts.tiles === undefined);
      assert.equal(typeof ts.imagewidth, "number");
      assert.equal(typeof ts.imageheight, "number");
    }
  }
});
