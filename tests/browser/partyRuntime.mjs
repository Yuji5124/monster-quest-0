// Browser-only integration harness. ?partyRuntimeTest=1 makes PartySystem in-memory,
// so this QA never reads or writes a user's local save.
import Phaser from "phaser";
import { BootScene } from "../../src/scenes/BootScene.ts";
import { BattleScene } from "../../src/scenes/BattleScene.ts";
import { FieldScene } from "../../src/scenes/FieldScene.ts";
import { InteriorScene } from "../../src/scenes/InteriorScene.ts";
import { OpeningGlitchScene } from "../../src/scenes/OpeningGlitchScene.ts";
import { OpeningIntroScene } from "../../src/scenes/OpeningIntroScene.ts";
import { StartingPlaceScene } from "../../src/scenes/StartingPlaceScene.ts";
import { StartingTownScene } from "../../src/scenes/StartingTownScene.ts";
import { TitleScene } from "../../src/scenes/TitleScene.ts";
import { WorldMapScene } from "../../src/scenes/WorldMapScene.ts";
import { partySystem } from "../../src/systems/PartySystem.ts";

const result = document.querySelector("#result");
const errors = [];
window.addEventListener("error", (event) => errors.push(event.message));
window.addEventListener("unhandledrejection", (event) => errors.push(String(event.reason)));
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: "game", width: 960, height: 720, pixelArt: true, roundPixels: true,
  input: { keyboard: false }, audio: { noAudio: true },
  scene: [BootScene, OpeningIntroScene, TitleScene, OpeningGlitchScene, StartingPlaceScene, WorldMapScene, FieldScene, StartingTownScene, InteriorScene, BattleScene],
});
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (value, message) => { if (!value) throw new Error(message); };
const report = (text) => { result.textContent += `\nPASS ${text}`; };
async function until(predicate, message) {
  const deadline = performance.now() + 15000;
  while (!predicate()) {
    if (performance.now() > deadline) throw new Error(`Timeout: ${message}`);
    await pause(30);
  }
}
async function scene(key) {
  await until(() => game.scene.isActive(key) && game.scene.getScene(key).actions, key);
  await pause(80);
  return game.scene.getScene(key);
}
async function start(key, data) {
  game.scene.getScenes(true)[0].scene.start(key, data);
  return scene(key);
}
async function key(code, ms = 50) {
  window.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true }));
  await pause(ms);
  window.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
  await pause(70);
}
async function confirm(count = 1) { for (let index = 0; index < count; index += 1) await key("Enter"); }
function followerCount(town, color) {
  return town.children.list.filter((child) => child instanceof Phaser.GameObjects.Rectangle && child.fillColor === color).length;
}
async function moveToNpc(town, x) {
  // NPC中心のすぐ南 (y=406) に立ち、上向きの正面判定だけを使う。
  const player = town.player;
  const targetY = 406;
  const move = async (code, distance) => key(code, Math.round(distance / 180 * 1000));
  if (player.body.center.y < 418) await move("ArrowDown", 420 - player.body.center.y);
  if (player.body.center.x < x) await move("ArrowRight", x - player.body.center.x);
  if (player.body.center.x > x) await move("ArrowLeft", player.body.center.x - x);
  await move("ArrowUp", player.body.center.y - targetY);
  assert(Math.abs(player.body.center.x - x) < 5 && Math.abs(player.body.center.y - targetY) < 5, "NPC interaction position failed");
}

document.querySelector("#run").addEventListener("click", async (event) => {
  event.target.disabled = true;
  result.textContent = "Running";
  try {
    const town = await start("StartingTownScene", { spawnId: "fromWorldMap" });
    assert(JSON.stringify(partySystem.getPartyOrder()) === JSON.stringify(["hero"]), "party did not begin with hero only");

    await moveToNpc(town, 300); // DEV_PARTY_JOIN_MIREI NPC
    await confirm();
    const firstPosition = town.player.body.center;
    assert(
      town.dialogueBox.isOpen,
      `Mirei prerequisite dialogue did not open (player=${firstPosition.x.toFixed(1)},${firstPosition.y.toFixed(1)} facing=${town.player.facing})`,
    );
    await confirm();
    assert(JSON.stringify(partySystem.getPartyOrder()) === JSON.stringify(["hero"]), "Mirei joined before Tarosa");
    report("Mirei NPC is gated before Tarosa");

    await moveToNpc(town, 450); // DEV_PARTY_JOIN_TAROSA NPC
    await confirm(3); // open -> page 2 -> close/add
    await pause(100);
    assert(
      JSON.stringify(partySystem.getPartyOrder()) === JSON.stringify(["hero", "tarosa"]),
      `Tarosa did not join exactly once (party=${JSON.stringify(partySystem.getPartyOrder())}, player=${town.player.body.center.x.toFixed(1)},${town.player.body.center.y.toFixed(1)} facing=${town.player.facing}, dialogue=${town.dialogueBox.isOpen})`,
    );
    assert(followerCount(town, 0x3d9b77) === 1, "Tarosa follower was not displayed");
    const tarosa = town.children.list.find((child) => child instanceof Phaser.GameObjects.Rectangle && child.fillColor === 0x3d9b77);
    const before = { x: tarosa.x, y: tarosa.y };
    await key("ArrowDown", 240);
    await key("ArrowRight", 240);
    assert(tarosa.x !== before.x || tarosa.y !== before.y, "Tarosa did not follow player movement");
    report("Tarosa joins once and follows the player's route");

    await moveToNpc(town, 300);
    await confirm(3); // open -> page 2 -> close/add
    assert(JSON.stringify(partySystem.getPartyOrder()) === JSON.stringify(["hero", "tarosa", "mirei"]), "Mirei did not join after Tarosa");
    assert(followerCount(town, 0x3d9b77) === 1 && followerCount(town, 0x9b72c2) === 1, "three-person display is incomplete");
    report("Mirei joins after Tarosa; three-person display is active");

    town.scene.start("WorldMapScene", { worldMapEntryId: "from_starting_town" });
    await scene("WorldMapScene");
    await confirm(2); // select the first unlocked point (No.01), then travel
    const startingPlace = await scene("StartingPlaceScene");
    assert(JSON.stringify(partySystem.getPartyOrder()) === JSON.stringify(["hero", "tarosa", "mirei"]), "party state reset after map transition");
    assert(followerCount(startingPlace, 0x3d9b77) === 1 && followerCount(startingPlace, 0x9b72c2) === 1, "followers were not recreated after map transition");
    assert(errors.length === 0, errors.join("\n"));
    report("WorldMapScene -> No.01 keeps and recreates the 3-member party");
    result.textContent += "\nALL PASS";
  } catch (error) {
    result.textContent += `\nFAIL ${error.stack}`;
    console.error(error);
  }
});
