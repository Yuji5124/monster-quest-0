import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DAKOHA_PORT_AMBIENCE } from "../src/config/dakohaPortAmbience.ts";
import { FIELD_AMBIENCE_BY_MAP, FIELD_AMBIENCE_PROFILES } from "../src/config/fieldAmbience.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("dakoha harbour ambience: every water glint stays inside the current background", () => {
  const { width, height } = DAKOHA_PORT_AMBIENCE.mapSize;
  assert.equal(DAKOHA_PORT_AMBIENCE.glints.length, 10);
  for (const glint of DAKOHA_PORT_AMBIENCE.glints) {
    assert.ok(glint.x - glint.width / 2 >= 0, `${glint.id} must not leave the west edge`);
    assert.ok(glint.x + glint.width / 2 <= width, `${glint.id} must not leave the east edge`);
    assert.ok(glint.y - glint.height / 2 >= 0, `${glint.id} must not leave the north edge`);
    assert.ok(glint.y + glint.height / 2 <= height, `${glint.id} must not leave the south edge`);
  }
});

test("dakoha harbour ambience: the lighthouse remains a small, throttled visual layer", () => {
  const { lighthouse } = DAKOHA_PORT_AMBIENCE;
  assert.ok(lighthouse.sweepDegrees.min < lighthouse.sweepDegrees.max);
  assert.ok(lighthouse.alpha.max <= 0.1, "the beam must not obscure the original port art");
  assert.ok(lighthouse.redrawIntervalMs >= 33, "the beam must not force a graphics redraw every frame");
  assert.equal(FIELD_AMBIENCE_BY_MAP.map_dakoha_port, FIELD_AMBIENCE_PROFILES.harbor);
});

test("dakoha port scene installs only the visual ambience extension", () => {
  const source = readFileSync(path.join(REPO_ROOT, "src/scenes/DakohaPortScene.ts"), "utf-8");
  assert.match(source, /startDakohaPortAmbience\(this, 1\.5, DAKOHA_PORT_AMBIENCE\)/);
  assert.doesNotMatch(source, /from ["']three["']/);
});
