import assert from "node:assert/strict";
import test from "node:test";
import { readDevMapTest } from "../src/config/devMapTest.ts";

test("DEV map test accepts only the registered map targets", () => {
  assert.equal(readDevMapTest("?mapTest=no01"), "no01");
  assert.equal(readDevMapTest("?mapTest=no02"), "no02");
  assert.equal(readDevMapTest("?mapTest=image-no01"), "image-no01");
  assert.equal(readDevMapTest("?mapTest=starting-forest"), "starting-forest");
  assert.equal(readDevMapTest("?mapTest=bie-village"), "bie-village");
  assert.equal(readDevMapTest("?mapTest=rainland-forest"), "rainland-forest");
  assert.equal(readDevMapTest("?mapTest=rainland-castle-town"), "rainland-castle-town");
  assert.equal(readDevMapTest("?mapTest=rainland-castle"), "rainland-castle");
  assert.equal(readDevMapTest("?mapTest=majin-cave"), "majin-cave");
  assert.equal(readDevMapTest("?mapTest=unknown"), null);
  assert.equal(readDevMapTest("?battleTest=demas"), null);
});
