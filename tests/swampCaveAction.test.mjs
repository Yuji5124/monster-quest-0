import assert from "node:assert/strict";
import test from "node:test";
import { SWAMP_CAVE_ACTION } from "../src/config/swampCaveAction.ts";
import {
  advanceSwampCaveActionRun,
  areAllSwampCaveEnemiesDefeated,
  canOpenSwampCaveChest,
  createSwampCaveActionRun,
  openSwampCaveChest,
  restoreSwampCaveActionRun,
  useSwampCaveAbility,
} from "../src/systems/SwampCaveActionRun.ts";

test("No.17 action run creates a multiple-enemy group and keeps all three distinct skills", () => {
  const run = createSwampCaveActionRun();
  assert.equal(run.enemies.length, 7);
  assert.equal(SWAMP_CAVE_ACTION.abilities.hero_sword.range < SWAMP_CAVE_ACTION.abilities.tarosa_bow.range, true);
  assert.equal(SWAMP_CAVE_ACTION.abilities.mirei_magic.radius > 0, true);

  const sword = useSwampCaveAbility(run, "hero_sword", { x: 722, y: 652 }, 1000);
  assert.equal(sword.valid, true);
  assert.equal(sword.valid && sword.affectedEnemyIds.length, 1, "主人公の剣は近い一体を切る");

  const bow = useSwampCaveAbility(run, "tarosa_bow", { x: 800, y: 790 }, 2000);
  assert.equal(bow.valid, true, "タロサは開始地点からでも遠距離射撃できる");

  const magic = useSwampCaveAbility(run, "mirei_magic", { x: 722, y: 652 }, 3000);
  assert.equal(magic.valid, true);
  assert.equal(magic.valid && magic.affectedEnemyIds.length >= 2, true, "ミレイの魔法は密集した群れへ範囲攻撃する");
});

test("No.17 magic freezes enemies and contact damage uses a bounded party-endurance cooldown", () => {
  const run = createSwampCaveActionRun();
  const first = run.enemies[0];
  const magic = useSwampCaveAbility(run, "mirei_magic", { x: first.x, y: first.y }, 1000);
  assert.equal(magic.valid, true);
  const before = { x: first.x, y: first.y };
  advanceSwampCaveActionRun(run, { x: 900, y: 800 }, 1500, 50);
  assert.deepEqual({ x: first.x, y: first.y }, before, "凍結中の敵は追跡しない");

  const enduranceBefore = run.endurance;
  const hit = advanceSwampCaveActionRun(run, { x: first.x, y: first.y }, 3100, 16);
  assert.equal(hit.contactDamage, true);
  assert.equal(run.endurance, enduranceBefore - 1);
  assert.equal(advanceSwampCaveActionRun(run, { x: first.x, y: first.y }, 3200, 16).contactDamage, false, "接触で毎フレーム減らない");
});

test("No.17 rewards the inner chest only after the group is cleared and restores saved completion", () => {
  const run = createSwampCaveActionRun();
  let time = 1000;
  for (const enemy of run.enemies) {
    const firstHit = useSwampCaveAbility(run, "tarosa_bow", { x: enemy.x, y: enemy.y }, time);
    assert.equal(firstHit.valid, true);
    time += 1000;
    const secondHit = useSwampCaveAbility(run, "tarosa_bow", { x: enemy.x, y: enemy.y }, time);
    assert.equal(secondHit.valid, true);
    time += 1000;
  }
  assert.equal(areAllSwampCaveEnemiesDefeated(run), true);
  assert.equal(canOpenSwampCaveChest(run, SWAMP_CAVE_ACTION.chest), true);
  assert.equal(openSwampCaveChest(run, SWAMP_CAVE_ACTION.chest), true);
  assert.equal(run.chestOpened, true);

  const restored = createSwampCaveActionRun();
  restoreSwampCaveActionRun(restored, { cleared: true, chestOpened: true });
  assert.equal(areAllSwampCaveEnemiesDefeated(restored), true);
  assert.equal(restored.chestOpened, true);
});
