import assert from "node:assert/strict";
import test from "node:test";
import { TITLE_MENU_ITEMS } from "../src/config/menu.ts";

test("title menu has the 6 official items in spec order", () => {
  assert.deepEqual(
    TITLE_MENU_ITEMS.map((item) => item.label),
    ["はじめから", "つづきから", "ジャンカードガチャ", "ジャンカード図鑑", "たびのあいことば", "設定"]
  );
});

test("only continueGame is disabled (no SaveSystem yet)", () => {
  for (const item of TITLE_MENU_ITEMS) {
    assert.equal(item.enabled, item.id !== "continueGame");
  }
});

test("ids and actions are unique", () => {
  assert.equal(new Set(TITLE_MENU_ITEMS.map((item) => item.id)).size, TITLE_MENU_ITEMS.length);
  assert.equal(new Set(TITLE_MENU_ITEMS.map((item) => item.action)).size, TITLE_MENU_ITEMS.length);
});
