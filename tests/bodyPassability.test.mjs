import assert from "node:assert/strict";
import test from "node:test";
import { PLAYER } from "../src/config/player.ts";
import { analyseBodyReachability } from "./helpers/bodyReachability.mjs";

// The player must be able to WALK (with its real hitbox) to every spawn and every exit of every image map.
// Cell-level "is every walkable cell linked" checks passed even when a 1-cell-wide corridor was impossible
// for the 30x42 body (Rainland forest: ~97% of the trail unreachable). This test uses the body itself.
// A comfort margin is required on top of the bare body so a route is not merely "1px wide": each side gets
// MARGIN extra world px of clearance (measured: every map keeps >= 10px with the 24x24 body and 8px cells).
const MARGIN = 6;

const IMAGE_MAPS = [
  ["starting_place", "map_01_starting_place"],
  ["starting_town", "map_02_starting_town"],
  ["starting_forest", "map_starting_forest"],
  ["bie_village", "map_03_bie_village"],
  ["rainland_forest_1", "map_rainland_forest_1"],
  ["rainland_forest_2", "map_rainland_forest_2"],
  ["rainland_castle_town", "map_rainland_castle_town"],
  ["rainland_castle", "map_05_rainland_castle"],
  ["majin_cave_1", "map_08_majin_cave_1"],
  ["majin_cave_2", "map_08_majin_cave_2"],
  ["majin_cave_3", "map_08_majin_cave_3"],
];

test("the player hitbox is a small feet box, not most of the 54x70 sprite", () => {
  assert.ok(PLAYER.width <= 30 && PLAYER.height <= 30, `hitbox ${PLAYER.width}x${PLAYER.height} is too large for the narrow trails`);
});

// Places that used to be silently unreachable (the spawn/exit check alone did not visit them): ruin altars, bridges,
// stairs and trail ends. Native background pixels; each is a point on the trail, inset from the map edge.
const KEY_SPOTS = {
  rainland_castle_town: [[560, 420, "plaza (west)"], [880, 420, "plaza (east)"], [725, 160, "castle landing"], [730, 225, "castle steps"], [140, 262, "west bridge deck"], [1305, 264, "east bridge deck"], [235, 300, "west road (north)"], [235, 620, "west road (south)"], [1225, 300, "east road (north)"], [1225, 500, "east road"], [1010, 620, "east street"], [1150, 800, "south-east corner"], [400, 560, "market alley"], [725, 700, "south of the plaza"], [728, 1040, "south gate road"]],
  rainland_forest_1: [[656, 165, "ruin altar"], [620, 450, "west bridge"], [935, 497, "east-lake bridge"], [1360, 580, "east wooden stairs"], [1000, 950, "lake-loop east end"], [130, 275, "west trail end"], [1350, 432, "east branch end"]],
  rainland_forest_2: [[150, 232, "ruin 1 altar"], [818, 752, "ruin 2 altar"], [590, 378, "north bridge"], [1195, 745, "east bridge"], [447, 540, "middle stone stairs"], [1428, 536, "east trail end"], [16, 688, "west trail end"], [766, 22, "north trail end"], [1100, 290, "pond-side branch"], [1362, 452, "north-east branch"]],
};

for (const [dir, mapId] of IMAGE_MAPS) {
  test(`${dir}: the real player body can walk from the default spawn to every spawn and exit (${MARGIN}px clearance per side)`, () => {
    const result = analyseBodyReachability(dir, mapId, { margin: MARGIN });
    assert.equal(result.startFits, true, "the default spawn must have room for the body");
    for (const spawn of result.spawnResults) assert.equal(spawn.ok, true, `spawn ${spawn.id} is not reachable/standable for the player body`);
    for (const event of result.eventResults) assert.equal(event.ok, true, `${event.id} is not reachable for the player body`);
  });
}

for (const [dir, mapId] of IMAGE_MAPS.filter(([dir]) => KEY_SPOTS[dir])) {
  test(`${dir}: the real player body can also reach every altar, bridge, staircase and trail end`, () => {
    const result = analyseBodyReachability(dir, mapId, { margin: MARGIN });
    assert.equal(result.startFits, true);
    for (const [x, y, name] of KEY_SPOTS[dir]) assert.equal(result.canReach(x, y), true, `${name} (${x},${y}) is not reachable for the player body`);
  });
}
