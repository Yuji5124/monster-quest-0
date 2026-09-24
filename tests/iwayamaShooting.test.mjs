import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MAPS } from "../src/config/maps.ts";
import { PLAYER } from "../src/config/player.ts";
import { readDevMapTest } from "../src/config/devMapTest.ts";
import { IWAYAMA_SHOOTING, IWAYAMA_SHOOTING_ENTRIES, IWAYAMA_SHOOTING_SECTIONS } from "../src/config/iwayamaShooting.ts";
import { readImageMapEvents, readImageMapObjects } from "../src/systems/ImageMapData.ts";
import {
  circleOverlapsRect,
  explosionReaches,
  pushRectOutOfCircle,
  readShootingSectionQuery,
  sectionAt,
  simulateExplosionChain,
  wallPhase,
} from "../src/systems/IwayamaShooting.ts";
import { analyseBodyReachability } from "./helpers/bodyReachability.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (file) => JSON.parse(readFileSync(path.join(REPO_ROOT, file), "utf-8"));
// 通路の左右の端(レーン座標)。縦スクロールなので、岩の壁は「左の壁から右の壁まで」を塞ぐ。
const { min: top, max: bottom } = IWAYAMA_SHOOTING.lanes;

/**
 * 同じ`at`で出る岩を、画面へ出た瞬間の位置の円として並べる。向きに依存しない平面で、
 * x = 奥行き(進む方向、aheadぶん奥)、y = 左右の位置(lane)。
 */
const rocksAt = (at) => IWAYAMA_SHOOTING_ENTRIES
  .filter((entry) => entry.kind === "rock" && entry.at === at)
  .map((entry) => {
    const spec = IWAYAMA_SHOOTING.rocks[entry.rock];
    return { x: (entry.ahead ?? 0) + spec.radius, y: entry.lane, radius: spec.radius, hp: spec.hp, explosive: entry.rock === "explosive", kind: entry.rock };
  });

test("1F has one red-circle shooting trigger near the NE stairs; it is saved with an event.* flag and leads to IwayamaShootingScene", () => {
  const objects = readImageMapObjects(readJson("assets/maps/iwayama_cave_1/objects.json"));
  const triggers = objects.filter((object) => object.type === "shooting");
  assert.equal(triggers.length, 1);
  const [trigger] = triggers;
  assert.equal(trigger.sceneKey, "IwayamaShootingScene");
  assert.equal(trigger.clearedFlag, IWAYAMA_SHOOTING.clearedFlag);
  assert.equal(trigger.clearedFlag, "event.iwayama_cave_shooting_cleared");
  assert.equal(trigger.blocking, false);
  // 1Fの最後(2Fへの階段の手前)に置く
  const stairs = readImageMapEvents(readJson("assets/maps/iwayama_cave_1/events.json")).find((event) => event.id === "event_iwayama_cave_1_stairs_to_2f");
  const distance = Math.hypot(trigger.x + trigger.width / 2 - (stairs.bounds.x + stairs.bounds.width / 2), trigger.y - stairs.bounds.y);
  assert.ok(distance < 300, `red circle should be close to the 2F stairs (${Math.round(distance)}px)`);
});

test("the return spawn stands on the red circle, is walkable, and does not overlap any 1F event zone", () => {
  const spawn = MAPS.map_iwayama_cave_1.spawns[IWAYAMA_SHOOTING.returnSpawnId];
  assert.ok(spawn);
  assert.equal(MAPS.map_iwayama_cave_1.sceneKey, IWAYAMA_SHOOTING.returnSceneKey);
  const [trigger] = readImageMapObjects(readJson("assets/maps/iwayama_cave_1/objects.json"));
  assert.ok(spawn.x >= trigger.x && spawn.x <= trigger.x + trigger.width && spawn.y >= trigger.y && spawn.y <= trigger.y + trigger.height);
  for (const event of readImageMapEvents(readJson("assets/maps/iwayama_cave_1/events.json"))) {
    const overlaps = spawn.x + PLAYER.width / 2 > event.bounds.x && spawn.x - PLAYER.width / 2 < event.bounds.x + event.bounds.width &&
      spawn.y + PLAYER.height / 2 > event.bounds.y && spawn.y - PLAYER.height / 2 < event.bounds.y + event.bounds.height;
    assert.equal(overlaps, false, `return spawn overlaps ${event.id}`);
  }
  const reach = analyseBodyReachability("iwayama_cave_1", "map_iwayama_cave_1", { margin: 6 });
  assert.equal(reach.canReach(trigger.x + trigger.width / 2, trigger.y + trigger.height / 2), true, "the red circle must be reachable on foot from the entrance");
});

test("sections A〜G are ordered, and every entry sits inside the passage in distance order", () => {
  assert.deepEqual(IWAYAMA_SHOOTING_SECTIONS.map((section) => section.letter).join(""), "ABCDEFG");
  for (let index = 1; index < IWAYAMA_SHOOTING_SECTIONS.length; index += 1) {
    assert.ok(IWAYAMA_SHOOTING_SECTIONS[index].start > IWAYAMA_SHOOTING_SECTIONS[index - 1].start);
  }
  for (let index = 1; index < IWAYAMA_SHOOTING_ENTRIES.length; index += 1) {
    assert.ok(IWAYAMA_SHOOTING_ENTRIES[index].at >= IWAYAMA_SHOOTING_ENTRIES[index - 1].at);
  }
  for (const entry of IWAYAMA_SHOOTING_ENTRIES) {
    assert.ok(entry.lane >= top && entry.lane <= bottom, `entry at ${entry.at} lane=${entry.lane}`);
  }
  // Section Aは小岩だけ、敵はSection C以降、爆発岩はSection D以降、落石はSection Fだけ
  const inSection = (id) => IWAYAMA_SHOOTING_ENTRIES.filter((entry) => sectionAt(entry.at).id === id);
  assert.ok(inSection("rocks").every((entry) => entry.kind === "rock" && entry.rock === "small"));
  const firstEnemy = IWAYAMA_SHOOTING_ENTRIES.find((entry) => entry.kind === "enemy");
  assert.equal(sectionAt(firstEnemy.at).id, "enemies");
  const firstExplosive = IWAYAMA_SHOOTING_ENTRIES.find((entry) => entry.kind === "rock" && entry.rock === "explosive");
  assert.equal(sectionAt(firstExplosive.at).id, "explosion");
  assert.ok(IWAYAMA_SHOOTING_ENTRIES.filter((entry) => entry.kind === "fallingRock").every((entry) => sectionAt(entry.at).id === "collapse"));
  assert.ok(IWAYAMA_SHOOTING.wall.at > IWAYAMA_SHOOTING_SECTIONS.at(-1).start);
});

test("the whole run is short: about 2〜4 minutes including the prologue and the wall", () => {
  let seconds = IWAYAMA_SHOOTING.prologueMs / 1000;
  for (let index = 0; index < IWAYAMA_SHOOTING_SECTIONS.length; index += 1) {
    const section = IWAYAMA_SHOOTING_SECTIONS[index];
    const end = IWAYAMA_SHOOTING_SECTIONS[index + 1]?.start ?? IWAYAMA_SHOOTING.wall.at + IWAYAMA_SHOOTING.wall.stopY + 10;
    seconds += (end - section.start) / section.scrollSpeed;
  }
  seconds += (IWAYAMA_SHOOTING.wall.hp * IWAYAMA_SHOOTING.arrow.cooldownMs) / 1000;
  seconds += (IWAYAMA_SHOOTING.outroRunMs + IWAYAMA_SHOOTING.outroFadeMs) / 1000;
  assert.ok(seconds >= 100 && seconds <= 240, `about ${Math.round(seconds)}s`);
  assert.ok(IWAYAMA_SHOOTING.arrow.cooldownMs >= 120 && IWAYAMA_SHOOTING.arrow.cooldownMs <= 180);
});

test("barrier columns leave no gap the player could slip through without shooting", () => {
  const barrierAts = [1600, 4550, 7700, 10000, 16200];
  for (const at of barrierAts) {
    const column = rocksAt(at).filter((rock) => rock.x - rock.radius === 0).sort((a, b) => a.y - b.y);
    assert.ok(column.length >= 7, `barrier at ${at}`);
    assert.ok(column[0].y - column[0].radius <= top + IWAYAMA_SHOOTING.player.hitWidth, `left gap at ${at}`);
    assert.ok(column.at(-1).y + column.at(-1).radius >= bottom - 4, `right gap at ${at}`);
    for (let index = 1; index < column.length; index += 1) {
      const gap = column[index].y - column[index].radius - (column[index - 1].y + column[index - 1].radius);
      assert.ok(gap < IWAYAMA_SHOOTING.player.hitWidth, `gap ${gap} at ${at}`);
    }
  }
});

test("Section D: a straight arrow reaches the ringed explosive rock, and that one arrow clears the whole ring", () => {
  for (const at of [8850, 9450]) {
    const ring = rocksAt(at);
    const origin = ring.findIndex((rock) => rock.explosive);
    // 真下(同じレーン)から撃った矢の先端(半径4)が最初に触れる岩は爆発岩
    const firstHit = ring
      .filter((rock) => Math.abs(rock.y - ring[origin].y) < rock.radius + 4)
      .sort((a, b) => a.x - b.x)[0];
    assert.equal(firstHit, ring[origin], `ring at ${at} shields its explosive rock`);
    assert.equal(simulateExplosionChain(ring, origin).destroyed.size, ring.length);
  }
});

test("Section D: the explosive rock in the wall of medium/large rocks blows a hole through it", () => {
  const wall = rocksAt(10000);
  const origin = wall.findIndex((rock) => rock.explosive);
  const result = simulateExplosionChain(wall, origin);
  assert.ok(result.destroyed.size >= 3);
});

test("Section E: a single arrow sets off the whole chain fan and wipes out the large-rock barrier behind it", () => {
  for (const at of [11300, 13300]) {
    const group = rocksAt(at);
    const origin = group.findIndex((rock) => rock.explosive && rock.x === rock.radius && rock.y === 367);
    const result = simulateExplosionChain(group, origin);
    const explosives = group.filter((rock) => rock.explosive).length;
    assert.equal(result.waves.flat().length, explosives, `all explosives ignite at ${at}`);
    assert.ok(result.waves.length >= 3, "the fire visibly travels in several waves");
    group.forEach((rock, index) => {
      if (rock.kind === "large") assert.ok(result.destroyed.has(index), `large rock ${index} at ${at} survives`);
    });
  }
  // 斜めの列も端から端まで連鎖する
  const diagonal = rocksAt(12450);
  const topMost = diagonal.findIndex((rock) => rock.explosive && rock.y === 150);
  assert.equal(simulateExplosionChain(diagonal, topMost).waves.flat().length, diagonal.filter((rock) => rock.explosive).length);
});

test("explosions reach targets by their outer edge, and a lone explosive rock far away is not ignited", () => {
  assert.equal(explosionReaches({ x: 0, y: 0 }, 150, { x: 170, y: 0, radius: 30 }), true);
  assert.equal(explosionReaches({ x: 0, y: 0 }, 150, { x: 200, y: 0, radius: 30 }), false);
  const result = simulateExplosionChain([
    { x: 0, y: 0, radius: 30, hp: 1, explosive: true },
    { x: 600, y: 0, radius: 30, hp: 1, explosive: true },
  ], 0);
  assert.deepEqual([...result.destroyed], [0]);
});

test("the giant wall has no HP bar: its hits map to 5 visual phases, ending in collapse", () => {
  const maxHp = IWAYAMA_SHOOTING.wall.hp;
  assert.equal(wallPhase(maxHp), 1);
  const phases = [];
  for (let hp = maxHp; hp >= 0; hp -= 1) phases.push(wallPhase(hp));
  assert.deepEqual([...new Set(phases)], [1, 2, 3, 4, 5]);
  assert.equal(wallPhase(0), 5);
  assert.equal(wallPhase(1), 4);
});

test("player collision helpers push the body out of rocks instead of letting it sink in", () => {
  const rect = { x: 0, y: 0, width: 20, height: 30 };
  assert.equal(circleOverlapsRect({ x: 30, y: 15, radius: 15 }, rect), true);
  assert.equal(circleOverlapsRect({ x: 40, y: 15, radius: 15 }, rect), false);
  const push = pushRectOutOfCircle(rect, { x: 30, y: 15, radius: 15 });
  assert.ok(push.dx < 0 && Math.abs(push.dy) < 1e-9);
  const moved = { ...rect, x: rect.x + push.dx };
  assert.equal(circleOverlapsRect({ x: 30, y: 15, radius: 15 - 1e-6 }, moved), false);
});

test("debug entry: ?mapTest=iwayama-shooting and ?shootingSection accept ids or letters", () => {
  assert.equal(readDevMapTest("?mapTest=iwayama-shooting"), "iwayama-shooting");
  assert.equal(readShootingSectionQuery("?mapTest=iwayama-shooting&shootingSection=explosion"), "explosion");
  assert.equal(readShootingSectionQuery("?shootingSection=wall"), "wall");
  assert.equal(readShootingSectionQuery("?shootingSection=E"), "chain");
  assert.equal(readShootingSectionQuery("?shootingSection=nope"), null);
  assert.equal(readShootingSectionQuery(""), null);
});
