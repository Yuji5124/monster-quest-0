import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  RAINLAND_WEATHER_PHASES,
  RAINLAND_WEATHER_PHASE_DISTANCE,
  advanceRainlandWeather,
  createDefaultRainlandWeatherState,
  normalizeRainlandWeatherState,
} from "../src/config/rainlandWeather.ts";
import { createRainlandBattleWeather, isRainlandBattleWeather } from "../src/systems/BattleWeatherBridge.ts";
import { RainlandWeatherController } from "../src/systems/RainlandWeatherController.ts";
import { GameStateRepository } from "../src/systems/GameStateRepository.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

test("rainland weather follows the authored order and never skips an intervening phase", () => {
  let state = createDefaultRainlandWeatherState();
  const observed = [state.phase];
  for (let step = 0; step < RAINLAND_WEATHER_PHASES.length - 1; step += 1) {
    const limit = RAINLAND_WEATHER_PHASE_DISTANCE[state.phase];
    assert.notEqual(limit, null);
    state = advanceRainlandWeather(state, limit);
    observed.push(state.phase);
  }
  assert.deepEqual(observed, [...RAINLAND_WEATHER_PHASES]);
  assert.equal(state.phase, "clearing");
});

test("weather state accepts only a known phase and a finite non-negative distance", () => {
  assert.deepEqual(normalizeRainlandWeatherState({ phase: "fog", phaseDistance: 31.8 }), { phase: "fog", phaseDistance: 31 });
  assert.equal(normalizeRainlandWeatherState({ phase: "storm", phaseDistance: 0 }), undefined);
  assert.equal(normalizeRainlandWeatherState({ phase: "fog", phaseDistance: -1 }), undefined);
  assert.equal(normalizeRainlandWeatherState({ phase: "fog", phaseDistance: Number.NaN }), undefined);
});

test("controller persists phase changes without replacing the manual adventure record", () => {
  const repository = new GameStateRepository(new MemoryStorage());
  repository.saveAdventureRecord({
    mapId: "map_rainland_forest_1",
    sceneKey: "RainlandForest1Scene",
    resume: { kind: "2d", x: 520, y: 610, facing: "up" },
  });
  const controller = new RainlandWeatherController(repository);
  const state = controller.advanceExploration(901);
  assert.equal(state.phase, "drizzle");
  assert.equal(repository.getRainlandForestWeather()?.phase, "drizzle");
  assert.deepEqual(repository.getAdventureRecord(), {
    mapId: "map_rainland_forest_1",
    sceneKey: "RainlandForest1Scene",
    resume: { kind: "2d", x: 520, y: 610, facing: "up" },
  });
});

test("controller checkpoints exploration distance without writing every movement frame", () => {
  const repository = new GameStateRepository(new MemoryStorage());
  const controller = new RainlandWeatherController(repository);
  controller.advanceExploration(119);
  assert.equal(repository.getRainlandForestWeather(), undefined);
  controller.advanceExploration(1);
  assert.deepEqual(repository.getRainlandForestWeather(), { phase: "overcast", phaseDistance: 120 });
});

test("battle bridge is an immutable Rainland snapshot, not a reference to a field scene", () => {
  const weather = createRainlandBattleWeather({ phase: "fog", phaseDistance: 442 });
  assert.deepEqual(weather, { biome: "rainland-forest", phase: "fog" });
  assert.equal(isRainlandBattleWeather(weather), true);
  assert.equal(isRainlandBattleWeather(undefined), false);
});

test("only the Rainland forest creates weather state and BattleScene renders the supplied snapshot", () => {
  const forestSource = readFileSync(path.join(REPO_ROOT, "src/scenes/RainlandForestScene.ts"), "utf-8");
  const battleSource = readFileSync(path.join(REPO_ROOT, "src/scenes/BattleScene.ts"), "utf-8");
  assert.match(forestSource, /weather: "rainland-forest"/);
  assert.match(forestSource, /new RainlandWeatherController\(this\.gameState\)/);
  assert.match(forestSource, /weather: this\.weatherController\.toBattleWeather\(\)/);
  assert.match(battleSource, /new RainlandBattleWeatherPresentation\(this, this\.eventData\.weather\)/);
});
