// Deterministic, reusable turn-by-turn driver for BattleSystem-based balance tests.
// Not a "smart" AI: it heals when someone is low and otherwise attacks. This is intentionally
// simple so boss balance outcomes (win/lose) reflect the underlying numbers, not clever play.

export function makeDeterministicRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function simulateBattle(battle, { maxConfirms = 4000, healThreshold = 0.45 } = {}) {
  let confirms = 0;
  for (;;) {
    const snapshot = battle.getSnapshot();
    if (snapshot.state === "VICTORY" || snapshot.state === "DEFEAT" || snapshot.state === "ESCAPED") {
      return { outcome: snapshot.state, snapshot, confirms };
    }
    if (confirms >= maxConfirms) return { outcome: "TIMEOUT", snapshot, confirms };
    if (snapshot.state !== "COMMAND") {
      battle.confirm();
      confirms += 1;
      continue;
    }
    const actor = snapshot.party[snapshot.actingIndex];
    const living = snapshot.party.filter((member) => member.hp > 0);
    const lowestAlly = living.reduce((lowest, member) => (member.hp / member.maxHp < lowest.hp / lowest.maxHp ? member : lowest), living[0]);
    const healMagic = actor.learnedMagic?.find((magic) => magic.kind === "heal");
    if (healMagic && actor.mp >= healMagic.mpCost && lowestAlly.hp / lowestAlly.maxHp < healThreshold) {
      battle.confirm("magic", healMagic.id);
    } else {
      battle.confirm("fight");
    }
    confirms += 1;
  }
}
