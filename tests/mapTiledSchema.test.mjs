import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_PATH = path.join(REPO_ROOT, "tiled/maps/mq0_map01_starting_place_day.tmj");
const map = JSON.parse(readFileSync(MAP_PATH, "utf-8"));

function tileLayer(name) {
  return map.layers.find((l) => l.type === "tilelayer" && l.name === name);
}
function objectLayer(name) {
  return map.layers.find((l) => l.type === "objectgroup" && l.name === name);
}

test("No.01 day map JSON loads and is a well-formed Tiled orthogonal map", () => {
  assert.equal(map.type, "map");
  assert.equal(map.orientation, "orthogonal");
  assert.equal(map.tilewidth, 32);
  assert.equal(map.tileheight, 32);
});

test("map dimensions are the expected 48x36 tiles (1536x1536... 1536x1152 px)", () => {
  assert.equal(map.width, 48);
  assert.equal(map.height, 36);
  assert.equal(map.width * map.tilewidth, 1536);
  assert.equal(map.height * map.tileheight, 1152);
});

test("every tileset reference resolves to a real .tsj file on disk", () => {
  const mapDir = path.dirname(MAP_PATH);
  assert.ok(map.tilesets.length > 0);
  for (const ts of map.tilesets) {
    assert.equal(typeof ts.firstgid, "number");
    assert.ok(ts.source, `tileset at firstgid ${ts.firstgid} has no source`);
    const tsjPath = path.resolve(mapDir, ts.source);
    assert.ok(existsSync(tsjPath), `missing referenced tileset: ${ts.source}`);
    const tsj = JSON.parse(readFileSync(tsjPath, "utf-8"));
    assert.equal(typeof tsj.name, "string");
    assert.ok(tsj.name.length > 0);
    // The referenced tileset's own image must also exist on disk.
    const tsjDir = path.dirname(tsjPath);
    const imgPath = path.resolve(tsjDir, tsj.image);
    assert.ok(existsSync(imgPath), `missing tileset image: ${tsj.image} (referenced by ${ts.source})`);
  }
});

test("tileset firstgid chain has no gaps or overlaps", () => {
  const mapDir = path.dirname(MAP_PATH);
  const sorted = [...map.tilesets].sort((a, b) => a.firstgid - b.firstgid);
  for (let i = 0; i < sorted.length; i++) {
    const tsj = JSON.parse(readFileSync(path.resolve(mapDir, sorted[i].source), "utf-8"));
    if (i + 1 < sorted.length) {
      assert.equal(sorted[i].firstgid + tsj.tilecount, sorted[i + 1].firstgid, `gap/overlap after tileset "${tsj.name}"`);
    }
  }
});

test("required standard layers exist: Ground, Terrain, Buildings, Collision, Events", () => {
  for (const name of ["Ground", "Terrain", "Buildings", "Collision"]) {
    assert.ok(tileLayer(name), `missing tile layer "${name}"`);
  }
  assert.ok(objectLayer("Events"), 'missing object layer "Events"');
});

test("Events layer has playerSpawn, exit_north, exit_east, event_campfire", () => {
  const events = objectLayer("Events").objects;
  const byName = Object.fromEntries(events.map((o) => [o.name, o]));

  assert.ok(byName.spawn_starting_place_day, "missing playerSpawn object");
  assert.equal(byName.spawn_starting_place_day.type, "playerSpawn");

  assert.ok(byName.exit_north, "missing exit_north object");
  assert.equal(byName.exit_north.type, "exit");

  assert.ok(byName.exit_east, "missing exit_east object");
  assert.equal(byName.exit_east.type, "exit");

  assert.ok(byName.event_campfire, "missing event_campfire object");
  assert.equal(byName.event_campfire.type, "event");

  for (const obj of events) {
    assert.ok(obj.width > 0 && obj.height > 0, `${obj.name} has a non-positive-area rect`);
  }
});

test("No DEV_PLACEHOLDER visual tiles remain on Ground/Terrain/Buildings (0/0/0)", () => {
  const devTilesetFirstgid = map.tilesets.find((ts) => ts.source.includes("dev_placeholder")).firstgid;
  const mapDir = path.dirname(MAP_PATH);
  const devTsj = JSON.parse(
    readFileSync(path.resolve(mapDir, map.tilesets.find((ts) => ts.source.includes("dev_placeholder")).source), "utf-8"),
  );
  const devGidRange = [devTilesetFirstgid, devTilesetFirstgid + devTsj.tilecount - 1];

  for (const name of ["Ground", "Terrain", "Buildings"]) {
    const layer = tileLayer(name);
    const devCells = layer.data.filter((gid) => gid >= devGidRange[0] && gid <= devGidRange[1]);
    assert.equal(devCells.length, 0, `${name} still references ${devCells.length} DEV_PLACEHOLDER GID cell(s)`);
  }
});

test("Collision layer's only non-empty content is the accepted collision_solid_marker GID", () => {
  const mapDir = path.dirname(MAP_PATH);
  const devEntry = map.tilesets.find((ts) => ts.source.includes("dev_placeholder"));
  const devTsj = JSON.parse(readFileSync(path.resolve(mapDir, devEntry.source), "utf-8"));
  const markerTile = devTsj.tiles.find((t) => t.properties?.some((p) => p.name === "mq0Label" && p.value === "collision_solid_marker"));
  assert.ok(markerTile, "collision_solid_marker tile not found in DEV_PLACEHOLDER tileset");
  const markerGid = devEntry.firstgid + markerTile.id;

  const collision = tileLayer("Collision").data;
  const nonZero = collision.filter((gid) => gid !== 0);
  assert.ok(nonZero.length > 0, "Collision layer is unexpectedly empty");
  for (const gid of nonZero) {
    assert.equal(gid, markerGid, `unexpected non-marker GID ${gid} on Collision layer`);
  }
});
