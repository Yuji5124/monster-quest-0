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
  ["dakoha_port", "map_dakoha_port"],
  ["posaro_castle", "map_posaro_castle"],
  ["revival_shrine", "map_revival_shrine"],
  ["hidden_village", "map_hidden_village"],
  ["stone_town", "map_stone_town"],
  ["rainland_throne_room", "map_rainland_throne_room"],
  ["iwayama_cave_1", "map_iwayama_cave_1"],
  ["iwayama_cave_2", "map_iwayama_cave_2"],
  ["mysterious_tower_exterior", "map_mysterious_tower_exterior"],
  ["mysterious_tower_1f", "map_mysterious_tower_1f"],
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
  dakoha_port: [[612, 128, "north gate landing"], [612, 300, "central stairs"], [470, 520, "plaza (west)"], [760, 470, "plaza (east)"], [232, 260, "west upper stairs"], [212, 360, "west stone ramp"], [150, 690, "south-west terrace steps"], [368, 800, "west long pier"], [368, 920, "west pier end"], [608, 700, "central stone dock"], [608, 820, "central dock end"], [984, 700, "east pier"], [1300, 650, "east dock"], [1150, 480, "crane quay"], [1300, 512, "east jetty"], [1100, 395, "east stairs"], [1250, 205, "lighthouse path"]],
  // The fallen wall (objects.json barrier) is a runtime body, so the mask keeps the stairs, terrace and north gate reachable.
  stone_town: [[724, 1000, "south gate"], [724, 850, "neck"], [780, 700, "plaza south"], [470, 560, "plaza west lane"], [980, 560, "plaza east lane"], [724, 345, "north of the plaza statue"], [724, 250, "north stairs"], [724, 180, "upper terrace"], [724, 40, "north gate"], [150, 553, "bakery counter front"], [360, 580, "west terrace"], [1174, 613, "bridge deck"], [1330, 600, "east bank"], [1300, 770, "east bank south"], [1070, 600, "canal quay"]],
  posaro_castle: [[724, 1016, "south entrance stairs"], [724, 800, "central hall"], [724, 500, "central sigil"], [724, 320, "throne stairs"], [724, 176, "upper dais approach"]],
  revival_shrine: [[836, 790, "gate passage"], [720, 700, "lower court (west)"], [960, 700, "lower court (east)"], [836, 620, "lower stairs"], [836, 480, "middle court"], [600, 476, "west bridge"], [300, 480, "west island sigil"], [836, 300, "upper stairs"], [836, 210, "upper terrace"], [836, 130, "altar"]],
  hidden_village: [[160, 72, "north-west gate"], [280, 224, "west stair"], [724, 184, "shrine steps"], [520, 376, "central house front"], [790, 424, "plaza"], [1092, 376, "east house front"], [208, 456, "west flower garden"], [864, 640, "lower bridge"], [364, 784, "lower house front"], [1112, 784, "watermill front"], [1320, 912, "cave approach"]],
  mysterious_tower_exterior: [[768, 840, "world-map bridge approach"], [640, 680, "landkeeper"], [768, 416, "old stone tower exit"], [768, 912, "world-map bridge exit"]],
  mysterious_tower_1f: [[480, 560, "return door"], [480, 412, "core approach"]],
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
