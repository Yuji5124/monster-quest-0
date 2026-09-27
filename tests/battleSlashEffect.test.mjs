import assert from "node:assert/strict";
import test from "node:test";
import { BATTLE_SLASH_EFFECT_STYLES, getBattleSlashAngles } from "../src/config/battle.ts";

test("each party member has a slash style for the attack effect", () => {
  for (const id of ["hero", "tarosa", "mirei"]) assert.ok(BATTLE_SLASH_EFFECT_STYLES[id]);
});

test("slash count follows weapon hitCount and alternates direction", () => {
  assert.equal(getBattleSlashAngles("hero").anglesDeg.length, 1);
  const { style, anglesDeg } = getBattleSlashAngles("tarosa", 2);
  assert.deepEqual(anglesDeg, [style.angleDeg, -style.angleDeg]);
  assert.equal(getBattleSlashAngles("unknown", 0).anglesDeg.length, 1);
});
