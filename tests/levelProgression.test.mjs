import assert from "node:assert/strict";
import test from "node:test";
import { CharacterProgression, formatLevelUpLines, formatStatGainEntries } from "../src/systems/CharacterProgression.ts";
import { GAME_STATE_STORAGE_KEY, GameStateRepository } from "../src/systems/GameStateRepository.ts";
import { PartySystem } from "../src/systems/PartySystem.ts";
import { DEV_MAJIN_CAVE_HERO, getMajinCaveEnemyDamage, getMajinCavePlayerDamage, DEV_MAJIN_CAVE_BALANCE } from "../src/config/majinCave.ts";
import { MAJIN_CAVE_ENEMIES } from "../src/data/majinCaveEnemies.ts";
import { MONSTER_ROSTER_BY_ID } from "../src/data/monsters.ts";
import { MajinCaveRunState } from "../src/systems/MajinCaveRunState.ts";
import { MajinCaveTurnSystem } from "../src/systems/MajinCaveTurnSystem.ts";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test("new game state starts with the hero alone at Lv1", () => {
  const repository = new GameStateRepository(memoryStorage());
  const party = new PartySystem(repository);
  assert.deepEqual(party.getPartyOrder(), ["hero"]);
  assert.equal(new CharacterProgression(repository).getStats("hero").level, 1);
});

test("startNewGame drops joined members, EXP and jump cards", () => {
  const storage = memoryStorage();
  const repository = new GameStateRepository(storage);
  repository.savePartyMemberIds(["hero", "tarosa", "mirei"]);
  new CharacterProgression(repository).awardExperience(["hero", "tarosa"], 500);
  repository.addJumpCoins(100);
  repository.drawNextJumpCard();
  const before = repository.load();
  assert.equal(before.cards.obtainedJumpCards.length, 1);

  const after = repository.startNewGame();
  assert.deepEqual(after.party.joinedMemberIds, ["hero"]);
  assert.equal(after.party.characterProgress.hero.totalExp, 0);
  assert.equal(after.party.characterProgress.tarosa.totalExp, 0);
  assert.deepEqual(after.cards.obtainedJumpCards, []);
  assert.equal(after.cards.jumpCardCount, 0);
  assert.equal(after.cards.jumpCoinCount, 0);
  assert.deepEqual(JSON.parse(storage.getItem(GAME_STATE_STORAGE_KEY)).party.joinedMemberIds, ["hero"]);

  const party = new PartySystem(repository);
  party.resetToLeaderOnly();
  assert.deepEqual(party.getPartyOrder(), ["hero"]);
});

test("awardExperience reports level-ups and newly learned magic", () => {
  const progression = new CharacterProgression(new GameStateRepository(memoryStorage()));
  // Lv3 = 35 EXP. 主人公はLv3でライフを覚える。
  const result = progression.awardExperience(["hero"], 35);
  assert.deepEqual(result.leveledUpMemberIds, ["hero"]);
  assert.equal(result.levelUps[0].fromLevel, 1);
  assert.equal(result.levelUps[0].toLevel, 3);
  assert.deepEqual(result.levelUps[0].learnedMagicNames, ["ライフ"]);
  assert.deepEqual(formatLevelUpLines(result.levelUps), ["主人公は　レベル3に　あがった！", "主人公は　ライフを　おぼえた！"]);
  assert.deepEqual(progression.awardExperience(["hero"], 1).levelUps, []);
});

test("level-up reports stat gains that match the growth curve, including weapon changes", () => {
  const progression = new CharacterProgression(new GameStateRepository(memoryStorage()));
  const lv1 = progression.getStats("hero");
  const { levelUps } = progression.awardExperience(["hero"], 35);
  const lv3 = progression.getStats("hero");
  assert.deepEqual(levelUps[0].statGains, {
    maxHp: lv3.maxHp - lv1.maxHp,
    maxMp: lv3.maxMp - lv1.maxMp,
    attack: lv3.attack - lv1.attack,
    defense: lv3.defense - lv1.defense,
    speed: lv3.speed - lv1.speed,
  });
  assert.ok(levelUps[0].statGains.maxHp > 0);
});

test("formatStatGainEntries lists only increased stats in menu order", () => {
  assert.deepEqual(
    formatStatGainEntries({ maxHp: 8, maxMp: 0, attack: 3, defense: 2, speed: 1 }),
    ["さいだいHP　+8", "こうげき　+3", "ぼうぎょ　+2", "すばやさ　+1"],
  );
});

test("majin cave enemies grant their formal roster EXP", () => {
  for (const definition of Object.values(MAJIN_CAVE_ENEMIES)) {
    assert.equal(definition.experience, MONSTER_ROSTER_BY_ID[definition.id].exp, definition.id);
  }
});

test("DEV cave hero keeps the previous fixed Lv9 balance", () => {
  assert.equal(getMajinCavePlayerDamage(DEV_MAJIN_CAVE_HERO), DEV_MAJIN_CAVE_BALANCE.playerAttack);
  assert.equal(getMajinCaveEnemyDamage(19, DEV_MAJIN_CAVE_HERO), 19);
});

test("majin cave run uses the inherited hero level and grows on level-up", () => {
  const progression = new CharacterProgression(new GameStateRepository(memoryStorage()));
  const lv1 = progression.getStats("hero");
  const hero = { level: lv1.level, maxHp: lv1.maxHp, maxMp: lv1.maxMp, attack: lv1.attack, defense: lv1.defense, hasHeat: false };
  const run = new MajinCaveRunState(8008, { hero });
  assert.equal(run.playerHp, lv1.maxHp);
  assert.equal(run.playerMp, lv1.maxMp);

  // Lv1はヒート未習得なので、隣に敵がいても使えない。
  const enemy = run.currentFloor.enemies[0];
  run.setPlayerPosition({ x: enemy.position.x - 1, y: enemy.position.y });
  assert.equal(new MajinCaveTurnSystem().castHeat(run, "right").kind, "not_learned");

  run.damagePlayer(10);
  progression.awardExperience(["hero"], 35);
  const lv3 = progression.getStats("hero");
  run.applyHeroStats({ level: lv3.level, maxHp: lv3.maxHp, maxMp: lv3.maxMp, attack: lv3.attack, defense: lv3.defense, hasHeat: false });
  assert.equal(run.hero.level, 3);
  assert.equal(run.playerHp, lv1.maxHp - 10 + (lv3.maxHp - lv1.maxHp));
  run.recoverAtCurrentEntrance();
  assert.equal(run.playerHp, lv3.maxHp);
});
