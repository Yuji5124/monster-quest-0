import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { BattleSystem } from "../src/battle/BattleSystem.ts";
import { DEV_DAIDAIN } from "../src/data/battleActions.ts";
import { DEMAS_BATTLE_PARTY_IDS, DEMAS_BATTLE_PRESENTATION, DEMAS_BATTLE_SPRITE_SHEET } from "../src/data/demasBattlePresentation.ts";
import { DEV_BATTLE_MONSTERS } from "../src/data/monsters.ts";

test("Demas battle presentation uses the supplied 4x3 sheet for every required state", () => {
  assert.ok(existsSync(new URL(DEMAS_BATTLE_SPRITE_SHEET.url)));
  assert.deepEqual([DEMAS_BATTLE_SPRITE_SHEET.frameWidth, DEMAS_BATTLE_SPRITE_SHEET.frameHeight], [313, 418]);
  assert.equal(DEV_BATTLE_MONSTERS.demas.battleSpriteSheet, DEMAS_BATTLE_SPRITE_SHEET);
  for (const state of ["idle", "chant", "cast", "damaged", "weak"]) {
    const animation = DEMAS_BATTLE_PRESENTATION.animations[state];
    assert.ok(animation.frames.length >= 3, `${state} needs a visible frame sequence`);
    assert.ok(animation.frames.every((frame) => frame >= 0 && frame < 12), `${state} references only supplied sheet frames`);
  }
  assert.equal(DEMAS_BATTLE_PRESENTATION.animations.idle.repeat, -1);
  assert.equal(DEMAS_BATTLE_PRESENTATION.animations.weak.repeat, -1);
});

test("Demas query fixture and authored event order are hero and Tarosa", () => {
  const demas = DEV_BATTLE_MONSTERS.demas;
  assert.deepEqual(DEMAS_BATTLE_PARTY_IDS, ["hero", "tarosa"]);
  assert.deepEqual(demas.devParty?.map((member) => member.id), DEMAS_BATTLE_PARTY_IDS);
  assert.deepEqual(demas.devParty?.map((member) => member.displayName), ["主人公", "タロサ"]);

  const battle = new BattleSystem(demas.devParty, demas, () => 1);
  assert.deepEqual(battle.getSnapshot().party.map((member) => member.id), DEMAS_BATTLE_PARTY_IDS);
  battle.confirm("fight");
  assert.equal(battle.confirm().actingIndex, 1, "Tarosa takes the second command");
});

test("Demas screen effects are bounded, background-only magic pressure parameters", () => {
  const effect = DEMAS_BATTLE_PRESENTATION.screenEffects;
  assert.ok(effect.echoOffsetPx > 0 && effect.echoAlpha > 0 && effect.echoAlpha < 0.25);
  assert.ok(effect.sliceCount >= 3 && effect.sliceCount <= 8);
  assert.ok(effect.ditherCellPx >= 8 && effect.ditherCellPx <= 16);
  assert.equal(effect.frameHoldMs, 90);
  assert.ok(effect.daidainPointCount >= 24);
});

test("BattleSystem exposes an immutable renderer trace without changing Demas combat results", () => {
  const demas = DEV_BATTLE_MONSTERS.demas;
  const battle = new BattleSystem(demas.devPlayer, demas, () => 1);
  const playerAttack = battle.confirm("fight");
  assert.deepEqual(playerAttack.lastAction, {
    casterId: "dev_battle_player", targetId: "demas", actionId: "attack", kind: "attack", reflected: false,
  });
  const enemyAttack = battle.confirm();
  assert.deepEqual(enemyAttack.lastAction, {
    casterId: "demas", targetId: "dev_battle_player", actionId: "attack", kind: "attack", reflected: false,
  });

  // Advance through the enemy acknowledgement and a second player turn; Demas's second action is Mirror.
  battle.confirm();
  battle.confirm("fight");
  const enemyMirror = battle.confirm();
  assert.deepEqual(enemyMirror.lastAction, {
    casterId: "demas", targetId: "dev_battle_player", actionId: "magic_mirror", kind: "mirror", reflected: false,
  });

  // The third enemy action is the existing reflectable Daidain. This only verifies trace data;
  // damage/reflection assertions remain in demasBattle.test.mjs.
  battle.confirm();
  battle.confirm("fight");
  const daidain = battle.confirm();
  assert.equal(daidain.lastAction?.actionId, DEV_DAIDAIN.id);
  assert.equal(daidain.lastAction?.casterId, "demas");
  assert.equal(daidain.lastAction?.reflected, false);

  const reflectedBattle = new BattleSystem(demas.devPlayer, demas, () => 1);
  reflectedBattle.confirm("fight"); reflectedBattle.confirm(); reflectedBattle.confirm();
  reflectedBattle.confirm("fight"); reflectedBattle.confirm(); reflectedBattle.confirm();
  reflectedBattle.confirm("magic", "magic_mirror");
  const reflectedDaidain = reflectedBattle.confirm();
  assert.deepEqual(reflectedDaidain.lastAction, {
    casterId: "demas", targetId: "dev_battle_player", actionId: DEV_DAIDAIN.id, kind: "magic_damage", reflected: true,
  });
});
