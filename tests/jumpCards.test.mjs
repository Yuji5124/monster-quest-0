import assert from "node:assert/strict";
import test from "node:test";
import { getJumpCardDisplayName, JUMP_CARD_COIN_COST, JUMP_CARD_DEFINITIONS, JUMP_CARD_PAGE_SIZE, JUMP_CARD_TOTAL, getJumpCardPage, getJumpCardRecords, getNextJumpCard, preloadJumpCardImages } from "../src/data/jumpCards.ts";
import { GAME_STATE_STORAGE_KEY, GameStateRepository, createDefaultGameState, normalizeGameState } from "../src/systems/GameStateRepository.ts";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

test("jump card definitions provide exactly the fixed No.01 through No.45 order", () => {
  assert.equal(JUMP_CARD_DEFINITIONS.length, JUMP_CARD_TOTAL);
  assert.deepEqual(JUMP_CARD_DEFINITIONS.map((card) => card.number), Array.from({ length: 45 }, (_, index) => index + 1));
  assert.equal(getNextJumpCard([])?.id, "card_01");
  assert.equal(getNextJumpCard(["card_01"])?.id, "card_02");
  assert.equal(getJumpCardRecords(["card_01"])[0].obtained, true);
  assert.deepEqual(JUMP_CARD_DEFINITIONS.map((card) => card.id), Array.from({ length: 45 }, (_, index) => `card_${String(index + 1).padStart(2, "0")}`));
  assert.equal(new Set(JUMP_CARD_DEFINITIONS.map((card) => card.id)).size, JUMP_CARD_TOTAL);
  assert.deepEqual(JUMP_CARD_DEFINITIONS.map((card) => card.name), [
    "プリン", "たまゴースト", "ダイジャ", "おばけつむり", "エリマキヘビ", "カマイタチ", "デビルバルーン", "カブトマン",
    "スノーボム", "こあくま", "きりまねき", "ファンシーダック", "さわぎとりうお", "メタルプリン", "メタルプリンキング", "やきプリン",
    "プリンじいさん", "きのこじじい", "ダラボッチ", "バクラー", "まじん", "バトラス", "デーマス", "プリンキング",
    "ヒート", "アイスーン", "エレキテル", "ダイダイン", "アイシス", "リライフル", "ひやみず", "いのちのかがみ", "のろいのほのお", "いぬのふん", "だいヒット", "ぶっとばし",
    "へんしん", "じばく", "にらみ", "いけにえ", "ゆうしゃたち", "ヤマタノオロチ", "デスタロッサ", "オロチまおう", "オロチゾンビ",
  ]);
  assert.equal(JUMP_CARD_DEFINITIONS.every((card) => card.name !== "未設定"), true);
  for (const card of JUMP_CARD_DEFINITIONS.filter((candidate) => !candidate.isSpoiler)) {
    assert.equal(card.publicName, card.name);
  }
  for (const card of [JUMP_CARD_DEFINITIONS[44]]) {
    assert.equal(card.publicName, "？？？");
    assert.equal(card.isSpoiler, true);
  }
});

test("verified card images are handed to Phaser and spoiler public names stay hidden", () => {
  const requests = [];
  preloadJumpCardImages({ image: (key, url) => requests.push([key, url]) });
  assert.equal(requests.length, 44);
  assert.deepEqual(requests.map(([key]) => key), JUMP_CARD_DEFINITIONS.filter((card) => card.imageKey !== null).map((card) => card.imageKey));
  assert.equal(requests.every(([, url]) => /assets\/(monsters\/source\/cards|cards\/source\/items_skills_cards)\//.test(url)), true);
  assert.deepEqual(JUMP_CARD_DEFINITIONS.filter((card) => card.imageKey === null).map((card) => card.number), [41]);
  assert.equal(getJumpCardDisplayName({ publicName: "公開名", isSpoiler: false }), "公開名");
  assert.equal(getJumpCardDisplayName({ publicName: "公開名", isSpoiler: true }), "？？？");
});

test("encyclopedia records stay ordered in five pages and do not mutate collection state", () => {
  const ownedIds = ["card_01", "card_09", "card_45"];
  const records = getJumpCardRecords(ownedIds);
  assert.equal(records.length, JUMP_CARD_TOTAL);
  assert.equal(JUMP_CARD_PAGE_SIZE, 9);
  assert.deepEqual(Array.from({ length: 5 }, (_, pageIndex) => getJumpCardPage(records, pageIndex).map((card) => card.number)), [
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14, 15, 16, 17, 18],
    [19, 20, 21, 22, 23, 24, 25, 26, 27],
    [28, 29, 30, 31, 32, 33, 34, 35, 36],
    [37, 38, 39, 40, 41, 42, 43, 44, 45],
  ]);
  assert.deepEqual(records.filter((card) => card.obtained).map((card) => card.id), ownedIds);
  assert.equal(records.find((card) => card.id === "card_02")?.obtained, false);
  assert.deepEqual(ownedIds, ["card_01", "card_09", "card_45"]);
});

test("reading card book records leaves the persisted gacha collection unchanged", () => {
  const storage = new MemoryStorage();
  const savedState = createDefaultGameState({ money: 780, jumpCoinCount: 12 });
  savedState.cards.obtainedJumpCards = ["card_01", "card_02"];
  savedState.cards.jumpCardCount = 2;
  const serialized = JSON.stringify(savedState);
  storage.setItem(GAME_STATE_STORAGE_KEY, serialized);
  const repository = new GameStateRepository(storage);
  const records = getJumpCardRecords(repository.load().cards.obtainedJumpCards);
  assert.equal(records[0].obtained, true);
  assert.equal(records[2].obtained, false);
  assert.equal(storage.getItem(GAME_STATE_STORAGE_KEY), serialized);
});

test("a draw charges one ジャンコイン, preserves battle gold, persists, and never duplicates a card", () => {
  const storage = new MemoryStorage();
  storage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(createDefaultGameState({ money: 60, jumpCoinCount: 3 })));
  const repository = new GameStateRepository(storage);
  const first = repository.drawNextJumpCard();
  assert.equal(first.kind, "obtained");
  assert.equal(first.card.id, "card_01");
  assert.equal(first.state.cards.jumpCoinCount, 3 - JUMP_CARD_COIN_COST);
  assert.equal(first.state.player.money, 60);
  const second = repository.drawNextJumpCard();
  assert.equal(second.kind, "obtained");
  assert.equal(second.card.id, "card_02");
  assert.deepEqual(repository.load().cards.obtainedJumpCards, ["card_01", "card_02"]);
});

test("awarding ジャンコイン leaves battle gold and the collection untouched", () => {
  const storage = new MemoryStorage();
  storage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(createDefaultGameState({ money: 7, jumpCoinCount: 0 })));
  const state = new GameStateRepository(storage).addJumpCoins(3.8);
  assert.equal(state.cards.jumpCoinCount, 3);
  assert.equal(state.player.money, 7);
  assert.deepEqual(state.cards.obtainedJumpCards, []);
});

test("all 45 paid draws are ordered, unique, and the 46th draw is blocked as complete", () => {
  const storage = new MemoryStorage();
  storage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(createDefaultGameState({ jumpCoinCount: JUMP_CARD_COIN_COST * JUMP_CARD_TOTAL })));
  const repository = new GameStateRepository(storage);
  for (const expected of JUMP_CARD_DEFINITIONS) {
    const result = repository.drawNextJumpCard();
    assert.equal(result.kind, "obtained");
    assert.equal(result.card.id, expected.id);
  }
  const complete = repository.drawNextJumpCard();
  assert.equal(complete.kind, "complete");
  assert.equal(complete.state.cards.jumpCardCount, JUMP_CARD_TOTAL);
  assert.equal(complete.state.cards.obtainedJumpCards.length, JUMP_CARD_TOTAL);
  assert.equal(complete.state.cards.jumpCoinCount, 0);
});

test("insufficient ジャンコイン and all 45 owned cards reject a draw without altering state", () => {
  const storage = new MemoryStorage();
  storage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(createDefaultGameState({ jumpCoinCount: 0 })));
  const repository = new GameStateRepository(storage);
  assert.equal(repository.drawNextJumpCard().kind, "insufficientCoins");
  assert.equal(repository.load().cards.jumpCardCount, 0);

  const completeState = createDefaultGameState({ money: 1000, jumpCoinCount: 9 });
  completeState.cards.obtainedJumpCards = JUMP_CARD_DEFINITIONS.map((card) => card.id);
  completeState.cards.jumpCardCount = JUMP_CARD_TOTAL;
  storage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(completeState));
  assert.equal(repository.drawNextJumpCard().kind, "complete");
  assert.equal(repository.load().cards.jumpCoinCount, 9);
});

test("loading normalizes duplicated or stale card state without writing over invalid JSON", () => {
  const normalized = normalizeGameState({
    version: 1,
    player: { money: 30.9 },
    cards: { jumpCoinCount: 30.9, jumpCardCount: 99, obtainedJumpCards: ["card_02", "card_01", "card_01", "unknown"] },
  });
  assert.deepEqual(normalized?.cards, { jumpCoinCount: 30, jumpCardCount: 2, obtainedJumpCards: ["card_01", "card_02"] });

  const legacy = normalizeGameState({ version: 1, player: { money: 44 }, cards: { obtainedJumpCards: [] } });
  assert.equal(legacy?.cards.jumpCoinCount, 44);

  const storage = new MemoryStorage();
  storage.setItem(GAME_STATE_STORAGE_KEY, "not-json");
  const repository = new GameStateRepository(storage);
  assert.equal(repository.load().cards.jumpCardCount, 0);
  assert.equal(storage.getItem(GAME_STATE_STORAGE_KEY), "not-json");
});
