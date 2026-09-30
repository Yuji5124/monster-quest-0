import assert from "node:assert/strict";
import test from "node:test";
import {
  BATTLE_FORTRESS_TILE_SIZE,
  buildBattleFortressWallRects,
  generateBattleFortress,
  getBattleFortressWorldBounds,
  verifyBattleFortressPath,
} from "../src/systems/BattleFortressGenerator.ts";
import { getBattleFortressRoomPresentation, isBattleFortressSpecialRoom } from "../src/systems/BattleFortressPresentation.ts";

test("BattleFortressGenerator is deterministic and every checked seed reaches the boss", () => {
  for (const seed of [1, 2, 19, 8008, "batorasu", "fortress-qa"]) {
    const first = generateBattleFortress(seed);
    const second = generateBattleFortress(seed);
    assert.deepEqual(second, first, `seed ${seed} must rebuild the same fortress`);
    assert.equal(first.reachable, true, `seed ${seed} must report its route as reachable`);
    assert.equal(verifyBattleFortressPath(first.tiles, first.entrance, first.boss), true, `seed ${seed} must have entrance→boss path`);
    assert.equal(first.tiles[first.poisonHint.y][first.poisonHint.x], "floor", `seed ${seed} poison hint must be on the main path`);
    assert.deepEqual(first.treasures.map((treasure) => treasure.id).sort(), ["dokukeshi", "kaifukuyaku"]);
    assert.ok(first.mainPathRoomIds.length >= 10, "main path keeps entrance, midpoint, gate, and boss room");
    const specialRooms = first.rooms.filter((room) => isBattleFortressSpecialRoom(room.kind));
    assert.deepEqual(specialRooms.map((room) => room.id), first.specialRoomIds, "every special room is registered for the scene");
    assert.deepEqual(specialRooms.map((room) => room.kind).sort(), ["assembly", "misprint", "reconfigure"]);
    assert.equal(first.rooms.find((room) => room.id === first.poisonGuideRoomId)?.kind, "checkpoint");
  }
});

test("BattleFortressGenerator preserves an authored direct boss gate while varying modules", () => {
  const plans = [1, 2, 8008].map(generateBattleFortress);
  for (const plan of plans) {
    const pathRooms = plan.rooms.filter((room) => !room.optional);
    assert.equal(pathRooms.at(-2)?.kind, "boss-gate");
    assert.equal(pathRooms.at(-1)?.kind, "boss");
    assert.ok(pathRooms.some((room) => room.kind === "checkpoint"));
  }
  const variations = new Set(plans.map((plan) => plan.rooms.map((room) => room.kind).join(",")));
  assert.ok(variations.size > 1, "different seeds should alter room-module composition");
});

test("BattleFortressGenerator collision rectangles never cover a floor tile", () => {
  const plan = generateBattleFortress(8008);
  const walls = buildBattleFortressWallRects(plan);
  assert.ok(walls.length < 120, "merged static bodies stay within the mobile collision budget");
  for (const wall of walls) {
    for (let y = wall.y; y < wall.y + wall.height; y += 1) {
      for (let x = wall.x; x < wall.x + wall.width; x += 1) assert.notEqual(plan.tiles[y][x], "floor");
    }
  }
});

test("BattleFortress world bounds cover the full generated route, not only the viewport", () => {
  const plan = generateBattleFortress(8008);
  const bounds = getBattleFortressWorldBounds(plan);
  assert.deepEqual(bounds, {
    x: 0,
    y: 0,
    width: plan.width * BATTLE_FORTRESS_TILE_SIZE,
    height: plan.height * BATTLE_FORTRESS_TILE_SIZE,
  });
  assert.ok(bounds.width > 960, "the generated route extends beyond the display width");
  assert.ok((plan.entrance.x + 0.5) * BATTLE_FORTRESS_TILE_SIZE < bounds.width);
  assert.ok((plan.boss.x + 0.5) * BATTLE_FORTRESS_TILE_SIZE < bounds.width);
});

test("BattleFortress presentation progresses from cold stone to unstable poison and boss territory", () => {
  const plan = generateBattleFortress(19);
  const findKind = (kind) => plan.rooms.find((room) => room.kind === kind);
  const normal = getBattleFortressRoomPresentation(findKind("entrance"));
  const unstable = getBattleFortressRoomPresentation(findKind("reconfigure"));
  const direct = getBattleFortressRoomPresentation(findKind("direct"));
  const boss = getBattleFortressRoomPresentation(findKind("boss"));
  assert.equal(normal.poison, false);
  assert.equal(unstable.poison, true);
  assert.equal(direct.bossTerritory, true);
  assert.equal(boss.poison, true);
  assert.notEqual(boss.banner, normal.banner, "boss rooms visibly receive the red-black territory palette");
});
