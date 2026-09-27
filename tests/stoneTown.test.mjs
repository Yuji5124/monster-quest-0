import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PLAYER } from "../src/config/player.ts";
import { INTERACTION_REACH, INTERACTION_SPAN } from "../src/config/interaction.ts";
import { MAPS } from "../src/config/maps.ts";
import { STONE_TOWN_ENTRY } from "../src/config/stoneTown.ts";
import { STORY_FLAGS } from "../src/config/storyFlags.ts";
import { FIELD_AMBIENCE_BY_MAP } from "../src/config/fieldAmbience.ts";
import { MAP_ENTRY_SPLASHES, findEntrySplash } from "../src/config/mapSplash.ts";
import { canInteract } from "../src/systems/Interaction.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import {
  awakeningStage,
  awakeningStaticPages,
  distanceToRect,
  isBarrierOpen,
  isStatueChanged,
  missingRequiredFlags,
  statuePages,
} from "../src/systems/ImageMapStoryState.ts";
import { resolveWorldMapEntryDestination } from "../src/systems/WorldMapData.ts";
import { analyseBodyReachability, readPngAsMask } from "./helpers/bodyReachability.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP_DIR = path.join(REPO_ROOT, "assets/maps/stone_town");
const SCALE = 1.5;
const readJson = (file) => JSON.parse(readFileSync(file, "utf-8"));
const readPngSize = (file) => {
  const buffer = readFileSync(file);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};
const objects = () => readImageMapObjects(readJson(path.join(MAP_DIR, "objects.json")));
const flagsOf = (...flags) => ({ hasFlag: (flag) => flags.includes(flag) });

test("stone-town package: four layers, the walking background is a declared DEV_PLACEHOLDER, the entry image is the unmodified user artwork", () => {
  const manifest = readImageMapManifest(readJson(path.join(MAP_DIR, "map.json")));
  assert.equal(manifest.id, "map_stone_town");
  // No top-down walking background was supplied (only いしのまち_イメージ.png), so the background must stay flagged until a formal one arrives.
  assert.equal(manifest.assetStatus, "DEV_PLACEHOLDER");
  assert.equal(manifest.worldScale, SCALE);
  for (const asset of [manifest.background, manifest.collision, manifest.events, manifest.objects]) {
    assert.ok(existsSync(path.join(MAP_DIR, asset)), `${asset} must exist beside map.json`);
  }
  assert.deepEqual(readPngSize(path.join(MAP_DIR, "background.png")), { width: manifest.width, height: manifest.height });
  assert.deepEqual(readPngSize(path.join(MAP_DIR, "collision.png")), { width: manifest.width, height: manifest.height });
  const reference = readFileSync(path.join(REPO_ROOT, "assets/maps/reference/reference/新しいフォルダー/いしのまち_イメージ.png"));
  assert.ok(readFileSync(path.join(MAP_DIR, "entry_splash.png")).equals(reference), "entry_splash.png must stay byte-identical to the user's illustration");
});

test("stone-town is registered, gets a 5 second entry splash from the world map only, and uses the quiet dust ambience", () => {
  assert.equal(MAPS.map_stone_town.sceneKey, "StoneTownScene");
  assert.deepEqual(MAPS.map_stone_town.npcs, [], "the petrified townspeople are painted statues (objects.json), not walking NPCs");
  assert.ok(MAPS.map_stone_town.spawns.fromWorldMap);
  const splash = MAP_ENTRY_SPLASHES.map_stone_town;
  assert.equal(splash.caption, "いしのまち");
  assert.equal(splash.fadeInMs + splash.holdMs + splash.fadeOutMs, 5000);
  assert.ok(findEntrySplash("StoneTownScene", "fromWorldMap"));
  assert.equal(findEntrySplash("StoneTownScene", "elsewhere"), undefined);
  assert.equal(FIELD_AMBIENCE_BY_MAP.map_stone_town?.id, "indoor");
  const mainSource = readFileSync(path.join(REPO_ROOT, "src/main.ts"), "utf-8");
  assert.match(mainSource, /StoneTownScene/);
});

test("both gates return to the world map at the stone town point, and the arrival spawn clears the exit zones", () => {
  const events = readImageMapEvents(readJson(path.join(MAP_DIR, "events.json")));
  const worldMap = readJson(path.join(REPO_ROOT, "assets/maps/world_map/map.json"));
  const destinations = readJson(path.join(REPO_ROOT, "assets/maps/world_map/destinations.json")).destinations;
  assert.deepEqual(events.map((event) => event.id).sort(), ["event_stone_town_north_exit", "event_stone_town_south_exit"]);
  for (const event of events) {
    assert.equal(event.commands[0].type, "world-map");
    const destination = resolveWorldMapEntryDestination(worldMap, destinations, event.commands[0].worldMapEntryId);
    assert.equal(destination.id, "destination_stone_town");
    assert.equal(MAPS[destination.targetMapId].sceneKey, "StoneTownScene");
    assert.ok(MAPS[destination.targetMapId].spawns[destination.targetSpawnId]);
  }
  const spawn = MAPS.map_stone_town.spawns.fromWorldMap;
  for (const event of events) {
    const b = event.bounds;
    const overlaps = spawn.x + PLAYER.width / 2 > b.x && spawn.x - PLAYER.width / 2 < b.x + b.width
      && spawn.y + PLAYER.height / 2 > b.y && spawn.y - PLAYER.height / 2 < b.y + b.height;
    assert.equal(overlaps, false, `arrival spawn must not sit inside ${event.id}`);
  }
});

test("objects.json parses and its flag/reference graph is consistent", () => {
  const all = objects();
  const ids = all.map((object) => object.id);
  assert.equal(new Set(ids).size, ids.length, "object ids must be unique");
  const statues = all.filter((object) => object.type === "statue");
  const barriers = all.filter((object) => object.type === "barrier");
  const awakenings = all.filter((object) => object.type === "awakening");
  assert.ok(statues.length >= 12, "the town needs enough statues to read as petrified as a whole");
  assert.equal(barriers.length, 1);
  assert.equal(awakenings.length, 1);
  const [awakening] = awakenings;
  const [barrier] = barriers;
  assert.equal(awakening.opensBarrierId, barrier.id);
  // every echo the plaza statue asks for can actually be collected from a statue
  const examinedFlags = new Set(statues.map((statue) => statue.examinedFlag).filter(Boolean));
  for (const flag of awakening.requiredFlags) assert.ok(examinedFlags.has(flag), `${flag} must be granted by a statue`);
  // statues that react to the awakening use the awakening's own flag
  for (const statue of statues.filter((candidate) => candidate.changedFlag)) assert.equal(statue.changedFlag, awakening.awakenedFlag);
  assert.notEqual(barrier.openedFlag, awakening.awakenedFlag);
  assert.equal(STONE_TOWN_ENTRY.flag, STORY_FLAGS.stoneTownEntered);
  assert.ok(!examinedFlags.has(STONE_TOWN_ENTRY.flag));
});

test("every text page is short (max 3 lines) and stays clear of unconfirmed story secrets", () => {
  const pages = [...STONE_TOWN_ENTRY.pages];
  for (const object of objects()) {
    for (const key of ["pages", "changedPages", "lockedPages", "afterPages", "repeatPages"]) pages.push(...(object[key] ?? []));
  }
  assert.ok(pages.length > 30);
  for (const page of pages) {
    const lines = page.split("\n");
    assert.ok(lines.length <= 3, `page has more than 3 lines: ${page}`);
    for (const line of lines) assert.ok([...line].length <= 24, `line is too long for the dialogue window: ${line}`);
    // GAME_SPEC / CLAUDE.md: never hint at the Jump Card secret or the traveller's pass-phrase this early.
    assert.doesNotMatch(page, /ジャンカード|じゃんかーど|あいことば|合言葉|あたま\s*も\s*じ|頭文字/);
  }
});

test("statue rectangles are blocked footprints in the collision mask, and the fallen wall stands in walkable stairs", () => {
  const mask = readPngAsMask(path.join(MAP_DIR, "collision.png"));
  const walkable = (x, y) => mask.data[(Math.floor(y) * mask.width + Math.floor(x)) * 4] > 127;
  for (const object of objects().filter((candidate) => candidate.type === "statue")) {
    assert.equal(walkable(object.x + object.width / 2, object.y + object.height / 2), false, `${object.id} must block its own footprint`);
    assert.equal(object.blocking, false, `${object.id} is blocked by the mask, not by a second runtime body`);
  }
  const barrier = objects().find((candidate) => candidate.type === "barrier");
  assert.equal(barrier.blocking, true);
  for (let x = barrier.x + 8; x < barrier.x + barrier.width - 8; x += 8) {
    assert.equal(walkable(x, barrier.y + barrier.height / 2), true, "the fallen wall's own body blocks a passage the mask leaves open");
  }
});

test("the plaza statue's star sits above the fallen wall (not hidden by the rubble) and inside the statue's rectangle span", () => {
  const all = objects();
  const awakening = all.find((candidate) => candidate.type === "awakening");
  const barrier = all.find((candidate) => candidate.type === "barrier");
  assert.ok(awakening.glow.y > barrier.y + barrier.height, "the star must be drawn below the wall so the glow is visible");
  assert.ok(awakening.glow.x > awakening.x && awakening.glow.x < awakening.x + awakening.width);
});

test("story rules: statue pages change after the event, the plaza statue is locked until every echo is heard, then plays once", () => {
  const all = objects();
  const baker = all.find((candidate) => candidate.id === "statue_baker");
  const awakening = all.find((candidate) => candidate.type === "awakening");
  const barrier = all.find((candidate) => candidate.type === "barrier");
  assert.deepEqual(statuePages(baker, flagsOf()), baker.pages);
  assert.equal(isStatueChanged(baker, flagsOf()), false);
  assert.deepEqual(statuePages(baker, flagsOf(awakening.awakenedFlag)), baker.changedPages);
  assert.equal(isBarrierOpen(barrier, flagsOf()), false);
  assert.equal(isBarrierOpen(barrier, flagsOf(barrier.openedFlag)), true);

  assert.equal(awakeningStage(awakening, flagsOf()), "locked");
  assert.deepEqual(awakeningStaticPages(awakening, flagsOf()), awakening.lockedPages);
  const [first, second, third] = awakening.requiredFlags;
  assert.deepEqual(missingRequiredFlags(awakening, flagsOf(first, second)), [third]);
  assert.equal(awakeningStage(awakening, flagsOf(first, second)), "locked");
  assert.equal(awakeningStage(awakening, flagsOf(first, second, third)), "ready");
  assert.equal(awakeningStaticPages(awakening, flagsOf(first, second, third)), undefined, "ready examinations play the awakening instead");
  assert.equal(awakeningStage(awakening, flagsOf(first, second, third, awakening.awakenedFlag)), "done");
  assert.deepEqual(awakeningStaticPages(awakening, flagsOf(awakening.awakenedFlag)), awakening.repeatPages);
  assert.equal(distanceToRect({ x: 5, y: 5 }, { x: 0, y: 0, width: 10, height: 10 }), 0);
  assert.equal(distanceToRect({ x: 13, y: 14 }, { x: 0, y: 0, width: 10, height: 10 }), 5);
});

test("the real player body reaches every spawn, exit and key spot; the fallen wall gates the north route", () => {
  const all = objects();
  const barrier = all.find((candidate) => candidate.type === "barrier");
  const open = analyseBodyReachability("stone_town", "map_stone_town", { margin: 6 });
  assert.equal(open.startFits, true);
  for (const spawn of open.spawnResults) assert.equal(spawn.ok, true, `spawn ${spawn.id}`);
  for (const event of open.eventResults) assert.equal(event.ok, true, `${event.id} must be reachable once the wall is gone`);

  const closed = analyseBodyReachability("stone_town", "map_stone_town", { margin: 6, blockers: [barrier] });
  const north = closed.eventResults.find((event) => event.id === "event_stone_town_north_exit");
  const south = closed.eventResults.find((event) => event.id === "event_stone_town_south_exit");
  assert.equal(south.ok, true);
  assert.equal(north.ok, false, "the north exit must stay closed while the fallen wall stands");
  const elder = all.find((candidate) => candidate.id === "statue_elder");
  assert.equal(closed.canReach(elder.x + elder.width / 2, elder.y + elder.height + 14), false, "the elder is behind the wall");
  assert.equal(open.canReach(elder.x + elder.width / 2, elder.y + elder.height + 14), true);

  // every area the town promises: plaza lanes, both terraces, the bridge, the east bank, the terrace, both stair ends
  const spots = [[724, 1000, "south gate"], [724, 850, "neck"], [780, 700, "plaza south"], [470, 560, "plaza west lane"], [980, 560, "plaza east lane"], [724, 345, "north of the star"],
    [724, 340, "stairs foot"], [724, 250, "stairs"], [724, 180, "terrace"], [150, 553, "bakery counter"], [360, 580, "west terrace"], [1174, 613, "bridge"], [1330, 600, "east bank"], [1300, 770, "east bank south"], [1070, 600, "quay"]];
  for (const [x, y, name] of spots) {
    const reachable = name === "stairs" || name === "terrace" ? open : closed;
    assert.equal(reachable.canReach(x, y), true, `${name} (${x},${y}) is not reachable for the player body`);
  }
});

test("every statue, the wall and the plaza statue can be examined from a spot the real player body can stand on", () => {
  const all = objects();
  const barrier = all.find((candidate) => candidate.type === "barrier");
  const open = analyseBodyReachability("stone_town", "map_stone_town", { margin: 6 });
  const closed = analyseBodyReachability("stone_town", "map_stone_town", { margin: 6, blockers: [barrier] });
  const facings = ["up", "down", "left", "right"];
  for (const object of all) {
    // everything but the elder is examined from the plaza side, where the wall still stands
    const reach = object.id === "statue_elder" ? open : closed;
    const world = { x: object.x * SCALE, y: object.y * SCALE, width: object.width * SCALE, height: object.height * SCALE };
    let found = false;
    for (let y = object.y - 40; y <= object.y + object.height + 40 && !found; y += 2) {
      for (let x = object.x - 40; x <= object.x + object.width + 40 && !found; x += 2) {
        if (!reach.canReach(x, y)) continue;
        // the body centre can never be inside the object's own blocked footprint
        if (x > object.x && x < object.x + object.width && y > object.y && y < object.y + object.height && object.type !== "barrier") continue;
        const center = { x: x * SCALE, y: y * SCALE };
        found = facings.some((facing) => canInteract(center, facing, world, INTERACTION_REACH, INTERACTION_SPAN));
      }
    }
    assert.equal(found, true, `${object.id} has no reachable spot from which it can be examined`);
  }
});
