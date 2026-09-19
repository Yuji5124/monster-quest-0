import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  OPENING_INTRO,
  OPENING_INTRO_SCENE_KEY,
  getCreditDurationMs,
  getMemorySequenceDurationMs,
  getOpeningIntroDurationMs,
} from "../src/config/openingIntro.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(REPO_ROOT, relative), "utf-8");

// ユーザーが指定した元素材。C.pngは存在せず、この6枚をこの順で使う。
const SOURCE_ORDER = ["A", "B", "D", "E", "F", "G"];

test("the credit shows 'Produced by ARROWARE' for about 3 seconds", () => {
  assert.equal(OPENING_INTRO.credit.line1, "Produced by");
  assert.equal(OPENING_INTRO.credit.line2, "ARROWARE");
  const duration = getCreditDurationMs();
  assert.ok(duration >= 2500 && duration <= 3500, `credit lasts ${duration}ms`);
});

test("the six memory images fade in and out for about 10 seconds in total", () => {
  assert.equal(OPENING_INTRO.images.length, 6);
  const { fadeInMs, holdMs, fadeOutMs } = OPENING_INTRO.memory;
  assert.ok(fadeInMs > 0 && holdMs > 0 && fadeOutMs > 0, "every image fades in, holds and fades out");
  const duration = getMemorySequenceDurationMs();
  assert.ok(duration >= 9000 && duration <= 11000, `memories last ${duration}ms`);
  assert.equal(getOpeningIntroDurationMs(), getCreditDurationMs() + OPENING_INTRO.gapAfterCreditMs + duration + OPENING_INTRO.endBlackMs);
});

test("memory images are the user's A,B,D,E,F,G sources, in that order, with unique texture keys", () => {
  const keys = new Set(OPENING_INTRO.images.map((image) => image.key));
  assert.equal(keys.size, OPENING_INTRO.images.length, "texture keys must be unique");
  OPENING_INTRO.images.forEach((image, index) => {
    const file = new URL(image.url);
    assert.ok(existsSync(file), `${image.url} must exist`);
    const bytes = readFileSync(file);
    assert.equal(bytes.subarray(1, 4).toString("latin1"), "PNG", "must be a real PNG");
    assert.equal(bytes.readUInt32BE(16), 1672, "width");
    assert.equal(bytes.readUInt32BE(20), 941, "height");
    // 参照元が残っている間は、無加工のバイト一致コピーであることを保証する。
    const source = path.join(REPO_ROOT, "assets/title/reference", `${SOURCE_ORDER[index]}.png`);
    if (existsSync(source)) assert.ok(bytes.equals(readFileSync(source)), `memory_0${index + 1}.png must be a byte-identical copy of ${SOURCE_ORDER[index]}.png`);
  });
});

test("BootScene hands off to the intro, and the intro is registered before the title", () => {
  assert.match(read("src/scenes/BootScene.ts"), /scene\.start\(OPENING_INTRO_SCENE_KEY\)/);
  assert.equal(OPENING_INTRO_SCENE_KEY, "OpeningIntroScene");
  const main = read("src/main.ts");
  assert.match(main, /normalScenes = \[BootScene, OpeningIntroScene, TitleScene,/);
});

test("any button during the intro skips to the title menu; the natural end goes to the title screen", () => {
  const scene = read("src/scenes/OpeningIntroScene.ts");
  // 何かボタン = 登録された全action、およびタップ(pointerdown → confirm)。
  assert.match(scene, /for \(const action of INPUT_ACTIONS\)/);
  assert.match(scene, /pointerdown/);
  assert.match(scene, /this\.goToTitle\(true\)/);
  assert.match(scene, /this\.goToTitle\(false\)/);
  assert.match(scene, /skipToMenu/);

  const title = read("src/scenes/TitleScene.ts");
  assert.match(title, /this\.entry\.skipToMenu === true\) this\.enterMenu\(\)/);
});

test("the intro does not touch save data or the opening story flow", () => {
  const scene = read("src/scenes/OpeningIntroScene.ts") + read("src/config/openingIntro.ts");
  assert.doesNotMatch(scene, /localStorage|GameStateRepository|OpeningGlitchScene|StartingPlaceScene/);
});
