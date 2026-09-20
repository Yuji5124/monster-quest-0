import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  getOpeningCampfireControlReleaseMs,
  OPENING_CAMPFIRE,
  OPENING_CAMPFIRE_NARRATION,
} from "../src/config/openingCampfire.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(REPO_ROOT, relative), "utf-8");

test("the No.01 opening is dark and silent first, then reveals over 0:02-0:07", () => {
  assert.equal(OPENING_CAMPFIRE.initialSilenceMs, 700);
  assert.equal(OPENING_CAMPFIRE.ambienceStartMs, 700);
  assert.equal(OPENING_CAMPFIRE.revealStartMs, 2000);
  assert.equal(OPENING_CAMPFIRE.revealDurationMs, 5000);
  assert.equal(OPENING_CAMPFIRE.narrationStartMs, 7000);
  assert.ok(OPENING_CAMPFIRE.nightVeilAlpha > 0 && OPENING_CAMPFIRE.nightVeilAlpha < 0.5, "the completed scene must remain night-dark");
});

test("the requested narration is preserved in its authored order", () => {
  assert.deepEqual(OPENING_CAMPFIRE_NARRATION, [
    "この世界では、いま――",
    "モンスターたちの支配が、\n　少しずつ広がっていた。",
    "町と町をつなぐ道は危険に満ち、\n　人々は不安の中で暮らしていた。",
    "それでも――\n　希望の火が消えたわけではない。",
    "名も知らぬ土地を歩く、\n　ひとりの旅人がいた。",
    "その旅人は今日もまた、\n　旅を続けるのであった――。",
  ]);
  assert.ok(getOpeningCampfireControlReleaseMs() >= 24000 && getOpeningCampfireControlReleaseMs() <= 26000);
});

test("new game enters the campfire sequence, keeps controls locked, then releases to ambience without BGM", () => {
  const title = read("src/scenes/TitleScene.ts");
  const startingPlace = read("src/scenes/StartingPlaceScene.ts");
  const ambience = read("src/systems/OpeningCampfireAudio.ts");

  assert.match(title, /openingCampfireAudio\.prepareFromUserGesture\(\)/);
  assert.match(title, /scene\.start\("StartingPlaceScene", \{ openingSequence: true \}\)/);
  assert.doesNotMatch(title, /action === "START_GAME"\) this\.scene\.start\("OpeningGlitchScene"\)/);
  assert.match(startingPlace, /if \(this\.openingInputLocked\) this\.actions\.setLocked\(true\)/);
  assert.match(startingPlace, /openingCampfireAudio\.startFireAndWind\(\)/);
  assert.match(startingPlace, /openingCampfireAudio\.enableFieldAmbience\(\)/);
  assert.match(startingPlace, /this\.player\.setFacing\("up"\)/);
  assert.match(startingPlace, /"…………。"/);
  assert.doesNotMatch(startingPlace, /this\.sound\.play|this\.sound\.add/);
  assert.match(ambience, /Web Audio/);
  assert.doesNotMatch(ambience, /createMediaElementSource|HTMLAudioElement/);
});
