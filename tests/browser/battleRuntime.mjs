// Browser-only integration harness; excluded from the production entry/build.
// Uses actual Scenes, NPC interaction, shared keyboard input and real texture loading.
import Phaser from 'phaser';
import { BootScene } from '../../src/scenes/BootScene.ts';
import { TitleScene } from '../../src/scenes/TitleScene.ts';
import { OpeningGlitchScene } from '../../src/scenes/OpeningGlitchScene.ts';
import { OpeningIntroScene } from '../../src/scenes/OpeningIntroScene.ts';
import { StartingPlaceScene } from '../../src/scenes/StartingPlaceScene.ts';
import { WorldMapScene } from '../../src/scenes/WorldMapScene.ts';
import { FieldScene } from '../../src/scenes/FieldScene.ts';
import { StartingTownScene } from '../../src/scenes/StartingTownScene.ts';
import { InteriorScene } from '../../src/scenes/InteriorScene.ts';
import { BattleScene } from '../../src/scenes/BattleScene.ts';

const result = document.querySelector('#result');
const errors = [];
window.addEventListener('error', e => errors.push(e.message));
window.addEventListener('unhandledrejection', e => errors.push(String(e.reason)));
const game = new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: 960, height: 720,
  pixelArt: true, roundPixels: true, input: { keyboard: false }, audio: { noAudio: true },
  scene: [BootScene, OpeningIntroScene, TitleScene, OpeningGlitchScene, StartingPlaceScene, WorldMapScene, FieldScene, StartingTownScene, InteriorScene, BattleScene] });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (value, message) => { if (!value) throw new Error(message); };
const report = text => { result.textContent += '\nPASS ' + text; };
async function until(predicate, message) {
  const deadline = performance.now() + 15000;
  while (!predicate()) { if (performance.now() > deadline) throw new Error('Timeout: ' + message); await pause(30); }
}
async function scene(key) {
  await until(() => game.scene.isActive(key) && game.scene.getScene(key).actions, key);
  await pause(80);
  return game.scene.getScene(key);
}
async function key(code, ms = 45) {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }));
  await pause(ms);
  window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
  await pause(55);
}
async function confirm(count = 1) { for (let i = 0; i < count; i++) await key('Enter'); }
async function start(key, data) {
  game.scene.getScenes(true)[0].scene.start(key, data);
  return scene(key);
}
async function npcBattle(spawnId, monsterId) {
  const town = await start('StartingTownScene', { spawnId });
  await pause(250);
  await key('ArrowUp', 220);
  await confirm();
  assert(town.dialogueBox.isOpen, 'NPC dialogue did not open');
  await confirm();
  const battle = await scene('BattleScene');
  assert(battle.battle.getSnapshot().enemy.id === monsterId, 'NPC selected wrong enemy');
  assert(battle.portrait.texture.key === 'battle.monster.' + monsterId, 'stale portrait');
  assert(battle.battle.getSnapshot().state === 'COMMAND', 'dialogue input leaked into battle');
  return battle;
}
async function winDemas(battle) {
  for (let turn = 0; turn < 6; turn++) {
    if (turn % 3 === 2) {
      await key('ArrowDown');
      await confirm(2); // open magic, then cast Mirror
      await confirm(2); // enemy Daidain, then acknowledge
    } else {
      if (turn === 3) await key('ArrowUp');
      await confirm(3);
    }
  }
  assert(battle.battle.getSnapshot().state === 'VICTORY', 'Demas win failed');
  assert(battle.battle.getSnapshot().player.hp === 132, 'reflection did not protect HP');
}
async function returned(spawnId) {
  const town = await scene('StartingTownScene');
  assert(!town.dialogueBox.isOpen, 'return reopened dialogue');
  assert(!town.transitioning, 'return stayed locked');
  const { MAPS } = await import('../../src/config/maps.ts');
  const spawn = MAPS.map_02_starting_town.spawns[spawnId];
  assert(Math.abs(town.player.body.center.x - spawn.x) < 2 && Math.abs(town.player.body.center.y - spawn.y) < 2, 'wrong return coordinate');
  await key('ArrowDown', 100);
  assert(town.player.body.center.y > spawn.y, 'return movement locked');
  return town;
}

document.querySelector('#run').addEventListener('click', async event => {
  event.target.disabled = true;
  result.textContent = 'Running';
  const storageBefore = JSON.stringify({ ...localStorage });
  try {
    await scene('OpeningIntroScene');
    await confirm(); // any button skips the ARROWARE/memory intro straight to the title menu
    await scene('TitleScene');
    await confirm(); // "はじめから"
    await scene('StartingPlaceScene');
    report('Intro skip -> title menu -> opening -> No.01');
    const field = await start('FieldScene', { spawnId: 'fromStartingTown' });
    const x = field.player.body.center.x;
    await key('ArrowRight', 120);
    assert(field.player.body.center.x !== x, 'Field movement failed');
    report('Field boots and player moves');

    let battle = await npcBattle('spawn_battle_event_return', '003');
    await confirm(8);
    assert(battle.battle.getSnapshot().state === 'VICTORY', '003 victory');
    assert(battle.battle.getSnapshot().player.hp === 26, '003 balance regression');
    await confirm();
    await returned('spawn_battle_event_return');
    report('003 NPC -> victory -> town; movement restored');

    battle = await npcBattle('spawn_demas_battle_return', 'demas');
    assert(battle.children.list.some(child => child.texture?.key === 'battle.bg.demas_test'), 'background missing');
    await winDemas(battle);
    await confirm();
    await returned('spawn_demas_battle_return');
    report('Demas NPC -> reflection victory -> town; textures switched after 003');

    battle = await npcBattle('spawn_demas_battle_return', 'demas');
    await key('ArrowUp'); // wrap from attack to flee
    await confirm();
    assert(/にげられない/.test(battle.battle.getSnapshot().message), 'boss escape succeeded');
    await confirm(2);
    await key('ArrowDown'); // wrap back to attack
    for (let i = 0; i < 20 && battle.battle.getSnapshot().state !== 'DEFEAT'; i++) await confirm();
    assert(battle.battle.getSnapshot().state === 'DEFEAT', 'defeat not reached');
    await confirm(); // existing event retry path
    await until(() => battle.battle.getSnapshot().state === 'COMMAND', 'retry');
    assert(battle.battle.getSnapshot().player.hp === 180 && battle.battle.getSnapshot().player.mp === 32, 'retry did not reset stats');
    for (let i = 0; i < 20 && battle.battle.getSnapshot().state !== 'DEFEAT'; i++) await confirm();
    await key('Escape');
    await returned('spawn_demas_battle_return');
    report('Boss escape denied; defeat -> retry -> defeat -> cancel -> town');

    battle = await npcBattle('spawn_battle_event_return', '003');
    await key('ArrowUp'); await confirm();
    assert(battle.battle.getSnapshot().state === 'ESCAPED', 'ordinary escape failed');
    await confirm(); await returned('spawn_battle_event_return');
    report('Normal escape + Demas -> 003 texture switch');
    assert(JSON.stringify({ ...localStorage }) === storageBefore, 'save storage changed');
    assert(errors.length === 0, errors.join('\n'));
    report('No browser exceptions; localStorage untouched');
    result.textContent += '\nALL PASS';
  } catch (error) {
    result.textContent += '\nFAIL ' + error.stack;
    console.error(error);
  }
});
