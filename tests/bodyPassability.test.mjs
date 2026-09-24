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
  ["zabon_village", "map_zabon_village"],
  ["hidden_village", "map_hidden_village"],
  ["rainland_throne_room", "map_rainland_throne_room"],
  ["iwayama_cave_1", "map_iwayama_cave_1"],
  ["iwayama_cave_2", "map_iwayama_cave_2"],
];

test("the player hitbox is a small feet box, not most of the 54x70 sprite", () => {
  assert.ok(PLAYER.width <= 30 && PLAYER.height <= 30, `hitbox ${PLAYER.width}x${PLAYER.height} is too large for the narrow trails`);
});

// Places that used to be silently unreachable (the spawn/exit check alone did not visit them): ruin altars, bridges,
// stairs and trail ends. Native background pixels; each is a point on the trail, inset from the map edge.
const KEY_SPOTS = {
  iwayama_cave_1: [[210, 1050, "south-west torch ledge"], [160, 560, "west stairs (upper)"], [180, 840, "west stairs (lower)"], [440, 740, "lake bridge"], [600, 460, "north bridge"], [400, 300, "north-west hall"], [560, 190, "north passage end"], [600, 760, "east torch ledge"], [940, 560, "east loop"], [808, 900, "east stairs"], [900, 1120, "south-east hall"], [680, 1076, "south bridge"], [480, 960, "south torch ledge"], [872, 250, "north-east landing"]],
  iwayama_cave_2: [[512, 1100, "south stairs"], [300, 930, "south-west ring"], [760, 930, "south-east ring"], [512, 810, "centre stairs"], [512, 600, "central plateau"], [280, 708, "west bridge"], [750, 700, "east bridge"], [140, 580, "west stairs"], [888, 580, "east stairs"], [300, 384, "north-west ring"], [720, 320, "north-east ring"], [512, 330, "north stairs"], [516, 210, "north landing"]],
  zabon_village: [[560, 540, "plaza (west)"], [840, 540, "plaza (east)"], [694, 400, "chief's hall steps"], [580, 220, "hall side stairs"], [120, 512, "west rope bridge"], [300, 870, "pier upper deck"], [240, 900, "pier middle"], [150, 930, "pier lower deck"], [1316, 100, "cave mouth"], [1400, 1060, "south-east road end"], [1130, 1040, "south road end"], [1150, 320, "north-east road fork"], [330, 820, "south-west road to the pier"]],
  hidden_village: [[160, 72, "north-west gate"], [280, 224, "west stair"], [724, 184, "shrine steps"], [520, 376, "central house front"], [790, 424, "plaza"], [1092, 376, "east house front"], [208, 456, "west flower garden"], [864, 640, "lower bridge"], [364, 784, "lower house front"], [1112, 784, "watermill front"], [1320, 912, "cave approach"]],
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
