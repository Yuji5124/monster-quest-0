import assert from "node:assert/strict";
import test from "node:test";
import { readDevMapTest } from "../src/config/devMapTest.ts";

test("DEV map test accepts only the registered map targets", () => {
  assert.equal(readDevMapTest("?mapTest=no01"), "no01");
  assert.equal(readDevMapTest("?mapTest=no02"), "no02");
  assert.equal(readDevMapTest("?mapTest=image-no01"), "image-no01");
  assert.equal(readDevMapTest("?mapTest=unknown"), null);
  assert.equal(readDevMapTest("?battleTest=demas"), null);
});
