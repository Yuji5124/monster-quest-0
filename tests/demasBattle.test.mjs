import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { BattleSystem, resolveMagicDamage } from "../src/battle/BattleSystem.ts";
import { DEV_BATTLE_MONSTERS, getDevBattleMonster } from "../src/data/monsters.ts";
import { DEV_DAIDAIN, DEV_MIRROR } from "../src/data/battleActions.ts";
import { readDevBattleMonsterId, DEV_BATTLE_UI_LAYOUT, getBattleStatusWindows } from "../src/config/battle.ts";
import { battleEventFromProperties, createBattleSceneStartData } from "../src/events/BattleEventData.ts";
import { DIALOGUES } from "../src/data/dialogues.ts";
import { MAPS } from "../src/config/maps.ts";

const demas = DEV_BATTLE_MONSTERS.demas;
const turn = (battle, command = "fight", magic) => {
  battle.confirm(command, magic);
  battle.confirm();
  return battle.confirm();
};

test("Demas query and existing asset paths resolve; prototype names are invalid", () => {
  assert.equal(readDevBattleMonsterId("?battleTest=demas"), "demas");
  assert.equal(getDevBattleMonster("demas"), demas);
  assert.equal(getDevBattleMonster("toString"), undefined);
  assert.equal(getDevBattleMonster("__proto__"), undefined);
  assert.ok(demas.isBoss);
  assert.ok(existsSync(new URL(demas.portraitUrl)));
  assert.ok(existsSync(new URL(demas.background.url)));
});

test("Demas cycles physical attack, Mirror, Daidain with MP consumption", () => {
  const battle = new BattleSystem(demas.devPlayer, demas);
  let s = turn(battle);
  assert.equal(s.player.hp, 156);
  assert.equal(s.enemy.mp, 60);
  s = turn(battle);
  assert.equal(s.enemy.status.mirror, 1);
  assert.equal(s.enemy.mp, 56);
  battle.confirm();
  s = battle.confirm();
  assert.match(s.message, /ダイダイン/);
  assert.equal(s.player.hp, 36);
  assert.equal(s.enemy.mp, 44);
});

test("player Mirror reflects Daidain back even while enemy Mirror is active", () => {
  const battle = new BattleSystem(demas.devPlayer, demas);
  turn(battle);
  turn(battle);
  const before = battle.getSnapshot();
  battle.confirm("magic", DEV_MIRROR.id);
  const s = battle.confirm();
  assert.match(s.message, /はねかえした/);
  assert.equal(s.player.hp, before.player.hp);
  assert.equal(s.player.mp, 28);
  assert.equal(s.enemy.hp, before.enemy.hp - DEV_DAIDAIN.power);
  assert.equal(s.player.status.mirror, 0);
  assert.equal(s.enemy.status.mirror, 1);
});

test("using the reflection pattern wins with shipped test stats; ordinary attacks can lose", () => {
  const battle = new BattleSystem(demas.devPlayer, demas);
  let s;
  for (let i = 0; i < 10; i++) {
    s = turn(battle, i % 3 === 2 ? "magic" : "fight", DEV_MIRROR.id);
    if (s.state === "VICTORY") break;
  }
  assert.equal(s.state, "VICTORY");
  assert.ok(s.player.hp > 0);
  assert.equal(s.enemy.hp, 0);
  assert.match(s.message, /デーマスを　たおした/);
  const defeat = new BattleSystem(demas.devPlayer, demas);
  for (let i = 0; i < 10; i++) turn(defeat);
  assert.equal(defeat.getSnapshot().state, "DEFEAT");
  assert.equal(defeat.getSnapshot().player.hp, 0);
});

test("lethal reflection waits for acknowledgement then wins without another attack", () => {
  const battle = new BattleSystem(demas.devPlayer, { ...demas, maxHp: 100, enemyActions: [DEV_DAIDAIN] });
  battle.confirm("magic", DEV_MIRROR.id);
  const reflected = battle.confirm();
  assert.equal(reflected.state, "ENEMY_ACTION");
  assert.equal(reflected.enemy.hp, 0);
  assert.match(reflected.message, /はねかえした/);
  const win = battle.confirm();
  assert.equal(win.state, "VICTORY");
  assert.equal(win.player.hp, 180);
});

test("boss escape fails and consumes a turn; ordinary enemy escape terminates safely", () => {
  const battle = new BattleSystem(demas.devPlayer, demas);
  assert.match(battle.confirm("flee").message, /にげられない/);
  assert.equal(battle.confirm().player.hp, 156);
  const normal = new BattleSystem(demas.devPlayer, DEV_BATTLE_MONSTERS["003"]);
  assert.equal(normal.confirm("flee").state, "ESCAPED");
  assert.equal(normal.confirm().player.hp, 180);
});

test("insufficient MP, unknown magic and empty items do not spend a turn; enemy falls back to attack", () => {
  const battle = new BattleSystem({ ...demas.devPlayer, maxMp: 0 }, { ...demas, maxMp: 0, enemyActions: [DEV_DAIDAIN] });
  assert.match(battle.confirm("magic", DEV_MIRROR.id).message, /MP/);
  assert.equal(battle.getSnapshot().state, "COMMAND");
  assert.match(battle.confirm("magic", "unknown").message, /まほうがない/);
  assert.match(battle.confirm("item").message, /どうぐがない/);
  battle.confirm();
  const s = battle.confirm();
  assert.equal(s.player.hp, 156);
  assert.equal(s.enemy.mp, 0);
});

test("generic reflection is single-use, bypassable, and also applies to player magic", () => {
  const caster = { ...demas.devPlayer, hp: 180, mp: 32, status: { mirror: 1 } };
  const target = { ...demas, hp: 360, mp: 60, status: { mirror: 1 } };
  assert.equal(resolveMagicDamage(caster, target, 20, false).reflected, false);
  assert.equal(target.hp, 340);
  assert.equal(target.status.mirror, 1);
  assert.equal(resolveMagicDamage(caster, target, 20, true).reflected, true);
  assert.equal(caster.hp, 160);
  assert.equal(caster.status.mirror, 1);
  assert.equal(target.status.mirror, 0);
  resolveMagicDamage(caster, target, 20, true);
  assert.equal(target.hp, 320);
  const battle = new BattleSystem({ ...demas.devPlayer, maxHp: 1, learnedMagic: [DEV_DAIDAIN] }, { ...demas, enemyActions: [DEV_MIRROR] });
  turn(battle);
  assert.equal(battle.confirm("magic", DEV_DAIDAIN.id).state, "DEFEAT");
});

test("snapshots, new battles, and fixed data do not leak Mirror or HP state", () => {
  const battle = new BattleSystem(demas.devPlayer, demas);
  const s = battle.confirm("magic", DEV_MIRROR.id);
  s.player.status.mirror = 99;
  s.party[0].status.mirror = 99;
  assert.equal(battle.getSnapshot().player.status.mirror, 1);
  const fresh = new BattleSystem(demas.devPlayer, demas).getSnapshot();
  assert.equal(fresh.player.status.mirror, 0);
  assert.equal(fresh.enemy.hp, demas.maxHp);
  assert.equal(fresh.enemy.mp, demas.maxMp);
  assert.equal("status" in demas, false);
});

test("Demas NPC uses the existing event contract and Tiled properties resolve to it", () => {
  const event = DIALOGUES.dev_demas_battle_npc.afterDialogue;
  assert.deepEqual(battleEventFromProperties({ eventType: "battle", eventId: "demas_battle", enemyId: "demas", victoryFlag: "boss.demas_defeated" }, {
    returnSceneKey: event.returnSceneKey, returnSpawnId: event.returnSpawnId,
  }), event);
  assert.equal(createBattleSceneStartData(event).mode, "event");
  const town = MAPS.map_02_starting_town;
  assert.ok(town.npcs.some(npc => npc.dialogueId === "dev_demas_battle_npc"));
  const spawn = town.spawns[event.returnSpawnId];
  assert.ok(spawn);
  // Return body clears all NPCs and every building's footprint in the current town layout.
  assert.ok(town.npcs.every(npc => Math.abs(npc.position.y - spawn.y) > 42));
  const halfW = 15;
  const halfH = 21;
  for (const building of town.buildings) {
    const f = building.footprint;
    const overlap =
      spawn.x + halfW > f.x && spawn.x - halfW < f.x + f.width &&
      spawn.y + halfH > f.y && spawn.y - halfH < f.y + f.height;
    assert.equal(overlap, false, `${building.id} overlaps the Demas return spawn`);
  }
  for (const props of [{}, { eventType: "battle", eventId: "x", enemyId: "toString" }, { eventType: "battle", eventId: "", enemyId: "demas" }]) {
    assert.equal(battleEventFromProperties(props, { returnSceneKey: "StartingTownScene", returnSpawnId: event.returnSpawnId }), undefined);
  }
});

test("three normal enemy slots and enlarged boss fit between top status and bottom commands", () => {
  const layout = DEV_BATTLE_UI_LAYOUT;
  assert.ok(layout.enemy.maxWidth * 3 < 912);
  const bossHeight = layout.enemy.maxHeight * demas.display.scale;
  assert.ok(layout.enemy.y - bossHeight / 2 > layout.statusWindow.y + layout.statusWindow.height);
  assert.ok(layout.enemy.y + bossHeight / 2 < layout.commandWindow.y);
  const windows = getBattleStatusWindows(3);
  assert.equal(windows.length, 3);
  assert.ok(windows[2].x + windows[2].width <= 960 - 24);
});
