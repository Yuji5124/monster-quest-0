import assert from "node:assert/strict";
import test from "node:test";
import { advanceRandomEncounter, beginPostBattleCooldown, createRandomEncounterState } from "../src/systems/RandomEncounter.ts";

const CONFIG = { stepDistance: 100, encounterChance: 0.5, postBattleCooldownDistance: 150 };

test("standing still never rolls, even repeatedly", () => {
  const state = createRandomEncounterState();
  for (let i = 0; i < 50; i += 1) {
    assert.equal(advanceRandomEncounter(state, 0, CONFIG, () => 0), false);
  }
  assert.equal(state.distanceSinceLastRoll, 0);
});

test("no roll happens before the configured step distance accumulates", () => {
  const state = createRandomEncounterState();
  assert.equal(advanceRandomEncounter(state, 40, CONFIG, () => 0), false);
  assert.equal(advanceRandomEncounter(state, 40, CONFIG, () => 0), false);
  assert.equal(state.distanceSinceLastRoll, 80);
});

test("crossing the step distance triggers exactly one roll and resets the accumulator", () => {
  const state = createRandomEncounterState();
  advanceRandomEncounter(state, 90, CONFIG, () => 0);
  // random()=0 would win, but distance (90) is still short of stepDistance (100).
  const triggered = advanceRandomEncounter(state, 20, CONFIG, () => 0.1);
  assert.equal(triggered, true);
  assert.equal(state.distanceSinceLastRoll, 0);
});

test("a failed roll resets the accumulator so the next roll needs a fresh full step", () => {
  const state = createRandomEncounterState();
  const triggered = advanceRandomEncounter(state, 100, CONFIG, () => 0.99);
  assert.equal(triggered, false);
  assert.equal(state.distanceSinceLastRoll, 0);
  assert.equal(advanceRandomEncounter(state, 10, CONFIG, () => 0), false);
});

test("post-battle cooldown blocks every roll until its distance is fully walked off", () => {
  const state = createRandomEncounterState();
  beginPostBattleCooldown(state, CONFIG);
  assert.equal(state.cooldownRemaining, 150);
  assert.equal(advanceRandomEncounter(state, 100, CONFIG, () => 0), false);
  assert.equal(state.cooldownRemaining, 50);
  assert.equal(advanceRandomEncounter(state, 40, CONFIG, () => 0), false);
  assert.equal(state.cooldownRemaining, 10);
  // Cooldown fully clears; the leftover 10px counts toward the cooldown only, not the next roll.
  assert.equal(advanceRandomEncounter(state, 10, CONFIG, () => 0), false);
  assert.equal(state.cooldownRemaining, 0);
  assert.equal(state.distanceSinceLastRoll, 0);
  assert.equal(advanceRandomEncounter(state, 100, CONFIG, () => 0), true);
});

test("createRandomEncounterState can start with an initial cooldown (fresh scene after a battle return)", () => {
  const state = createRandomEncounterState(150);
  assert.equal(state.cooldownRemaining, 150);
  assert.equal(advanceRandomEncounter(state, 200, CONFIG, () => 0), false);
});
