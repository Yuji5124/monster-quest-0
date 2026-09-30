import assert from "node:assert/strict";
import test from "node:test";
import { BattleSystem } from "../src/battle/BattleSystem.ts";
import { buildPartyCombatant } from "../src/battle/PartyCombatants.ts";
import { MAPS } from "../src/config/maps.ts";
import { SHOPS, getShop } from "../src/config/shops.ts";
import { ITEM_DEFINITIONS } from "../src/data/items.ts";
import { getWeaponById } from "../src/data/weapons.ts";
import { CharacterProgression } from "../src/systems/CharacterProgression.ts";
import { GameStateRepository, createDefaultGameState, normalizeGameState, GAME_STATE_STORAGE_KEY } from "../src/systems/GameStateRepository.ts";
import { buyItem, buyWeapon, getCurrentWeapon, stayAtInn } from "../src/systems/ShopSystem.ts";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

function repositoryWithMoney(money) {
  const storage = new MemoryStorage();
  storage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(createDefaultGameState({ money, jumpCoinCount: 0 })));
  return new GameStateRepository(storage);
}

class ItemBag {
  items = {};
  add(itemId, quantity = 1) { this.items[itemId] = (this.items[itemId] ?? 0) + quantity; return true; }
}

test("No.02 inn, weapon shop and item shop belong to the fixed villagers in front of those buildings", () => {
  assert.equal(getShop("npc_start_town_inn_shopkeeper")?.kind, "inn");
  assert.equal(getShop("npc_start_town_weapon_shopkeeper")?.kind, "weapon");
  assert.equal(getShop("npc_start_town_item_shopkeeper")?.kind, "item");
  assert.equal(getShop("npc_start_town_house_a_shopkeeper"), undefined, "民家A is a house, not a shop");
});

test("No.04 Bie Village's miller, farmer and herb drier double as its weapon shop, inn and item shop", () => {
  // 2026-09-27ユーザー指示「村人を再度見直し、宿屋・武器屋・道具屋等の役割を追加」。専用の店番は増やさず、
  // 既存の固定村人3人が生業と兼業する(NPC_SPEC.md「ビーエのむら」)。となりの人は木こり失踪の手掛かりを
  // 持つため、ショップUIを挟まない通常会話のままにした。
  assert.equal(getShop("npc_bie_village_miller")?.kind, "weapon");
  assert.equal(getShop("npc_bie_village_farmer")?.kind, "inn");
  assert.equal(getShop("npc_bie_village_herb_drier")?.kind, "item");
  assert.equal(getShop("npc_bie_village_neighbor"), undefined, "the worried neighbour keeps a plain conversation, not a shop");
});

test("No.10 Hidden Village's watermill keeper, central householder and west householder double as its weapon shop, inn and item shop", () => {
  // 2026-09-27ユーザー指示「かくれざとのむらびとを更新、宿屋・道具屋・武器屋を強化」。ビーエのむらと同じく
  // 専用の店番は増やさず、既存の固定村人3人が生業と兼業する(NPC_SPEC.md「かくれざと」)。
  assert.equal(getShop("npc_hidden_village_watermill_keeper")?.kind, "weapon");
  assert.equal(getShop("npc_hidden_village_central_householder")?.kind, "inn");
  assert.equal(getShop("npc_hidden_village_west_householder")?.kind, "item");
  assert.equal(getShop("npc_hidden_village_shrine_keeper"), undefined, "the shrine keeper keeps a plain conversation, not a shop");
});

test("No.12 Dakoha Port's innkeeper and armory keeper are dedicated shop-front villagers (inn + weapon only, per user request)", () => {
  // 2026-09-29ユーザー指示「港町ダコハの村人を追加、他の村と同じように宿屋・武器屋を追加」。道具屋は
  // 依頼されていないため今回は追加しない(NPC_SPEC.md「港町ダコハ」)。
  assert.equal(getShop("npc_dakoha_port_innkeeper")?.kind, "inn");
  assert.equal(getShop("npc_dakoha_port_armory_keeper")?.kind, "weapon");
  assert.equal(getShop("npc_dakoha_port_lighthouse_widow"), undefined, "the lighthouse widow keeps a plain conversation, not a shop");
});

test("every shop belongs to an NPC actually placed on some map, and every stock entry is priced and real", () => {
  const allNpcIds = new Set(Object.values(MAPS).flatMap((map) => map.npcs.map((npc) => npc.id)));
  for (const [npcId, shop] of Object.entries(SHOPS)) {
    assert.ok(allNpcIds.has(npcId), `${npcId} must be a placed NPC`);
    if (shop.kind === "inn") assert.ok(shop.price > 0);
    if (shop.kind === "item") for (const entry of shop.stock) assert.ok(ITEM_DEFINITIONS[entry.itemId] && entry.price > 0);
    if (shop.kind === "weapon") {
      for (const entry of shop.stock) {
        const weapon = getWeaponById(entry.memberId, entry.weaponId);
        assert.ok(weapon?.officialName, `${entry.weaponId} must be an officially named weapon`);
        assert.ok(entry.price > 0);
      }
    }
  }
});

test("the inn takes the fee and fully restores saved HP/MP, including knocked-out members", () => {
  const repository = repositoryWithMoney(20);
  repository.savePartyVitals({ hero: { hp: 3, mp: 0 }, tarosa: { hp: 0, mp: 1 } });
  const progression = new CharacterProgression(repository);
  assert.equal(progression.getStats("hero").hp, 3);

  assert.equal(stayAtInn(repository, 8).kind, "rested");
  assert.equal(repository.load().player.money, 12);
  assert.deepEqual(repository.load().party.vitals, {});
  assert.equal(progression.getStats("hero").hp, progression.getStats("hero").maxHp);
});

test("the inn refuses without enough gold and changes nothing", () => {
  const repository = repositoryWithMoney(5);
  repository.savePartyVitals({ hero: { hp: 3, mp: 0 } });
  assert.equal(stayAtInn(repository, 8).kind, "insufficientMoney");
  assert.equal(repository.load().player.money, 5);
  assert.equal(repository.load().party.vitals.hero.hp, 3);
});

test("the item shop sells one item per purchase and never lets gold go negative", () => {
  const repository = repositoryWithMoney(10);
  const bag = new ItemBag();
  assert.equal(buyItem(repository, bag, "kaifukuyaku", 8).kind, "bought");
  assert.equal(buyItem(repository, bag, "kaifukuyaku", 8).kind, "insufficientMoney");
  assert.equal(repository.load().player.money, 2);
  assert.deepEqual(bag.items, { kaifukuyaku: 1 });
});

test("the weapon shop equips a stronger weapon and it is used in battle", () => {
  const repository = repositoryWithMoney(100);
  assert.equal(getCurrentWeapon(repository, "hero").id, "hero_bokuto");
  const result = buyWeapon(repository, "hero", "hero_konbo", 50);
  assert.equal(result.kind, "equipped");
  assert.equal(repository.load().player.money, 50);
  assert.equal(getCurrentWeapon(repository, "hero").id, "hero_konbo");

  const progression = new CharacterProgression(repository);
  const withKonbo = buildPartyCombatant("hero", 1, undefined, progression.getLiveState("hero"));
  const withBokuto = buildPartyCombatant("hero", 1);
  assert.equal(withKonbo.attack - withBokuto.attack, getWeaponById("hero", "hero_konbo").attackBonus - getWeaponById("hero", "hero_bokuto").attackBonus);
  assert.equal(progression.getStats("hero").attack, withKonbo.attack, "status screen shows the bought weapon too");
});

test("the weapon shop will not sell a weapon that is not stronger than the current one", () => {
  const repository = repositoryWithMoney(100);
  buyWeapon(repository, "hero", "hero_konbo", 50);
  const again = buyWeapon(repository, "hero", "hero_konbo", 50);
  assert.equal(again.kind, "notStronger");
  assert.equal(repository.load().player.money, 50, "no gold is taken for a refused purchase");
  assert.equal(buyWeapon(repository, "hero", "hero_tetsu_no_ken", 300).kind, "insufficientMoney");
  assert.equal(getCurrentWeapon(repository, "hero").id, "hero_konbo");
});

test("battles start from carried-over HP/MP, clamped to the current maximum", () => {
  const hero = buildPartyCombatant("hero", 1, undefined, { hp: 5, mp: 999 });
  const battle = new BattleSystem([hero], { id: "dummy", displayName: "dummy", maxHp: 10, attack: 1, defense: 0 }, () => 0.5);
  const [member] = battle.getSnapshot().party;
  assert.equal(member.hp, 5);
  assert.equal(member.mp, hero.maxMp ?? 0);
  const fresh = new BattleSystem([buildPartyCombatant("hero", 1)], { id: "dummy", displayName: "dummy", maxHp: 10, attack: 1, defense: 0 });
  assert.equal(fresh.getSnapshot().party[0].hp, hero.maxHp, "no saved vitals means full HP");
});

test("old saves without vitals or equipment load as full HP and level-based weapons", () => {
  const old = createDefaultGameState({ money: 0, jumpCoinCount: 0 });
  const { vitals, equippedWeaponIds, ...party } = old.party;
  const state = normalizeGameState({ ...old, party });
  assert.deepEqual(state.party.vitals, {});
  assert.deepEqual(state.party.equippedWeaponIds, {});
  const broken = normalizeGameState({ ...old, party: { ...party, vitals: { hero: { hp: -1, mp: 2 }, ghost: { hp: 1, mp: 1 } }, equippedWeaponIds: { hero: 3 } } });
  assert.deepEqual(broken.party.vitals, {});
  assert.deepEqual(broken.party.equippedWeaponIds, {});
});
