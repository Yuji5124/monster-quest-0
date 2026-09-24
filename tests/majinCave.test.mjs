import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { getMajinCaveEnemyTable, MAJIN_CAVE_ENEMIES } from "../src/data/majinCaveEnemies.ts";
import { DEV_MAJIN_CAVE_BALANCE, MAJIN_CAVE_MONSTER_HOUSE_CANDIDATE_FLOORS } from "../src/config/majinCave.ts";
import { MAJIN_CAVE_PRESENTATION, MAJIN_CAVE_SLASH_PRESENTATION, getMajinCaveFogAlpha, getMajinCaveSlashRotation, isMajinCavePointVisible } from "../src/config/majinCavePresentation.ts";
import {
  MAJIN_CAVE_MONSTER_ANIMATION_SPECS,
  MAJIN_CAVE_MONSTER_FRAME_COUNT,
  MAJIN_CAVE_MAJIN_ANIMATION_SPECS,
  MAJIN_CAVE_MAJIN_FRAME_HEIGHT,
  MAJIN_CAVE_MAJIN_FRAME_WIDTH,
  MAJIN_CAVE_MONSTER_SPRITE_PROFILES,
  getMajinCaveMonsterSpriteProfile,
  majinCaveMonsterAnimationDurationMs,
  majinCaveMonsterAnimationKey,
  missingMajinCaveMonsterAnimationKeys,
} from "../src/config/majinCaveMonsterSprites.ts";
import { MAP_ENTRY_SPLASHES } from "../src/config/mapSplash.ts";
import { MAPS } from "../src/config/maps.ts";
import { readDevMapTest } from "../src/config/devMapTest.ts";
import { generateMajinCaveFloor, getMajinCaveWalkableCells, isMajinCaveConnected, isMajinCaveWalkable, pointKey } from "../src/systems/MajinCaveGenerator.ts";
import { MajinCaveRunState } from "../src/systems/MajinCaveRunState.ts";
import { MajinCaveTurnSystem } from "../src/systems/MajinCaveTurnSystem.ts";
import { readWorldMapDestinations, readWorldMapManifest } from "../src/systems/WorldMapData.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORLD_MAP_DIR = path.join(REPO_ROOT, "assets/maps/world_map");
const TILES_DIR = path.join(REPO_ROOT, "assets/maps/majin_cave");
const MONSTER_SHEETS_DIR = path.join(REPO_ROOT, "assets/monsters/majin_cave");

test("No.08 uses the copied normalized 32px / 8×8 runtime tileset", () => {
  const metadata = JSON.parse(readFileSync(path.join(TILES_DIR, "tileset.json"), "utf8"));
  assert.equal(metadata.tileSize, 32);
  assert.equal(metadata.columns, 8);
  assert.equal(metadata.rows, 8);
  assert.equal(metadata.imageWidth, 256);
  assert.equal(metadata.imageHeight, 256);
  assert.equal(metadata.tiles.length, 64);
  assert.ok(existsSync(path.join(TILES_DIR, "tileset.png")));
  assert.ok(readFileSync(path.join(REPO_ROOT, "assets/maps/reference/reference/mq0_majin_cave_tileset.png")).equals(readFileSync(path.join(TILES_DIR, "tileset.png"))));
});

test("all cave IDs resolve to validated 4x4 RGBA sprite profiles, including the 10F boss", () => {
  const regularIds = ["purin", "tamago_ghost", "obake_tsumuri", "fancy_duck", "snow_bomb", "koakuma", "erimaki_hebi", "daija"];
  assert.deepEqual(Object.keys(MAJIN_CAVE_MONSTER_SPRITE_PROFILES), [...regularIds, "majin"]);
  for (const monsterId of regularIds) {
    const profile = getMajinCaveMonsterSpriteProfile(monsterId);
    assert.ok(profile, monsterId);
    assert.equal(profile.frameWidth, 64);
    assert.equal(profile.frameHeight, 64);
    assert.equal(profile.displayScale >= 0.5 && profile.displayScale <= 0.6, true);
    const sheet = readFileSync(path.join(MONSTER_SHEETS_DIR, `monster_${monsterId}.png`));
    assert.equal(sheet.readUInt32BE(16), 256, `${monsterId} width`);
    assert.equal(sheet.readUInt32BE(20), 256, `${monsterId} height`);
    assert.equal(sheet[25], 6, `${monsterId} must retain PNG RGBA colour type`);
  }
  const majin = getMajinCaveMonsterSpriteProfile("majin");
  assert.ok(majin);
  assert.equal(majin.frameWidth, MAJIN_CAVE_MAJIN_FRAME_WIDTH);
  assert.equal(majin.frameHeight, MAJIN_CAVE_MAJIN_FRAME_HEIGHT);
  assert.equal(majin.displayScale, 0.235);
  assert.equal(majin.originY, 0.93);
  assert.equal(majin.defeatHoldMs, 700);
  const bossSource = readFileSync(path.join(REPO_ROOT, "assets/monsters/source/majin_cave/monster_majin_dungeon_source.png"));
  assert.equal(bossSource.readUInt32BE(16), 1254, "majin source width");
  assert.equal(bossSource.readUInt32BE(20), 1254, "majin source height");
  assert.equal(bossSource[25], 6, "majin source must retain PNG RGBA colour type");
  const bossSheet = readFileSync(path.join(MONSTER_SHEETS_DIR, "monster_majin_dungeon.png"));
  assert.equal(bossSheet.readUInt32BE(16), 1280, "majin width");
  assert.equal(bossSheet.readUInt32BE(20), 1280, "majin height");
  assert.equal(bossSheet[25], 6, "majin must retain PNG RGBA colour type");
});

test("regular monster animation mapping, timing and duplicate guards are stable", () => {
  assert.deepEqual(MAJIN_CAVE_MONSTER_ANIMATION_SPECS.idle, { frames: [0, 1, 2, 3], frameRate: 5, repeat: -1 });
  assert.deepEqual(MAJIN_CAVE_MONSTER_ANIMATION_SPECS.attack, { frames: [4, 5, 6, 7], frameRate: 10, repeat: 0 });
  assert.deepEqual(MAJIN_CAVE_MONSTER_ANIMATION_SPECS.damage, { frames: [8, 9, 10, 11], frameRate: 10, repeat: 0 });
  assert.deepEqual(MAJIN_CAVE_MONSTER_ANIMATION_SPECS.defeat, { frames: [12, 13, 14, 15], frameRate: 7, repeat: 0 });
  assert.equal(MAJIN_CAVE_MONSTER_FRAME_COUNT, 16);
  assert.equal(majinCaveMonsterAnimationDurationMs("attack"), 400);
  assert.equal(majinCaveMonsterAnimationDurationMs("damage"), 400);
  assert.equal(majinCaveMonsterAnimationDurationMs("defeat"), 571);

  const profile = MAJIN_CAVE_MONSTER_SPRITE_PROFILES.purin;
  const allKeys = Object.keys(MAJIN_CAVE_MONSTER_ANIMATION_SPECS).map((name) => majinCaveMonsterAnimationKey(profile, name));
  assert.deepEqual(missingMajinCaveMonsterAnimationKeys(profile, () => false), allKeys);
  assert.deepEqual(missingMajinCaveMonsterAnimationKeys(profile, () => true), [], "a re-entered Scene never re-registers animations");
});

test("Majin uses the supplied 4x4 boss mapping with a quick attack and held defeat", () => {
  assert.deepEqual(MAJIN_CAVE_MAJIN_ANIMATION_SPECS.idle, { frames: [0, 1, 2, 3], frameRate: 8, repeat: -1 });
  assert.deepEqual(MAJIN_CAVE_MAJIN_ANIMATION_SPECS.attack, { frames: [4, 5, 6, 7], frameRate: 10, repeat: 0 });
  assert.deepEqual(MAJIN_CAVE_MAJIN_ANIMATION_SPECS.damage, { frames: [8, 9, 8], frameRate: 12, repeat: 0 });
  assert.deepEqual(MAJIN_CAVE_MAJIN_ANIMATION_SPECS.defeat, { frames: [12, 13, 14, 15], frameRate: 8, repeat: 0 });
  const majin = getMajinCaveMonsterSpriteProfile("majin");
  assert.ok(majin);
  assert.equal(majinCaveMonsterAnimationDurationMs("attack", majin), 400);
  assert.equal(majinCaveMonsterAnimationDurationMs("damage", majin), 250);
  assert.equal(majinCaveMonsterAnimationDurationMs("defeat", majin), 500);
});

test("No.08 presentation keeps the grid rules intact while using a readable exploration view", () => {
  assert.equal(MAJIN_CAVE_PRESENTATION.cameraZoom >= 2 && MAJIN_CAVE_PRESENTATION.cameraZoom <= 2.5, true);
  assert.equal(MAJIN_CAVE_PRESENTATION.minimap.cellSize >= 5, true, "the permanent map is large enough to read");
  assert.equal(getMajinCaveFogAlpha(false, false), MAJIN_CAVE_PRESENTATION.fog.unseenAlpha);
  assert.equal(getMajinCaveFogAlpha(true, false), MAJIN_CAVE_PRESENTATION.fog.exploredAlpha);
  assert.equal(getMajinCaveFogAlpha(true, true), 0);
  assert.equal(isMajinCavePointVisible({ x: 5, y: 5 }, { x: 8, y: 6 }, 4), true);
  assert.equal(isMajinCavePointVisible({ x: 5, y: 5 }, { x: 9, y: 6 }, 4), false);

  const run = new MajinCaveRunState(1);
  assert.ok(run.currentFloor.exploredCells.size > 0, "the entry area is visible");
  assert.ok(run.currentFloor.exploredCells.size < getMajinCaveWalkableCells(run.currentFloor.grid).length, "a new floor never reveals the whole map");
});

test("No.08-only slash presentation has four visual directions and remains brief", () => {
  assert.equal(MAJIN_CAVE_SLASH_PRESENTATION.durationMs >= 80 && MAJIN_CAVE_SLASH_PRESENTATION.durationMs <= 150, true);
  assert.equal(MAJIN_CAVE_SLASH_PRESENTATION.bossDurationMs >= MAJIN_CAVE_SLASH_PRESENTATION.durationMs, true);
  assert.equal(getMajinCaveSlashRotation("right"), 0);
  assert.equal(getMajinCaveSlashRotation("left"), Math.PI);
  assert.equal(getMajinCaveSlashRotation("up"), -Math.PI / 2);
  assert.equal(getMajinCaveSlashRotation("down"), Math.PI / 2);
});

test("the same run seed produces byte-for-byte equivalent logical floors", () => {
  for (let floor = 1; floor <= 10; floor += 1) assert.deepEqual(generateMajinCaveFloor(981273, floor), generateMajinCaveFloor(981273, floor));
});

test("each run has exactly one seed-stable Monster House and it is only on 4F–9F", () => {
  for (let seed = 1; seed <= 96; seed += 1) {
    const firstRun = new MajinCaveRunState(seed);
    const secondRun = new MajinCaveRunState(seed);
    assert.equal(firstRun.monsterHouseFloor, secondRun.monsterHouseFloor);
    assert.equal(MAJIN_CAVE_MONSTER_HOUSE_CANDIDATE_FLOORS.includes(firstRun.monsterHouseFloor), true);
    const floors = Array.from({ length: 10 }, (_, index) => firstRun.getFloor(index + 1));
    assert.equal(floors.filter((floor) => floor.isMonsterHouse).length, 1);
    assert.equal(floors.slice(0, 3).some((floor) => floor.isMonsterHouse), false);
    assert.equal(floors[9].isMonsterHouse, false);
  }
});

test("Monster House selection is distributed across every allowed candidate floor", () => {
  const selected = new Set();
  for (let seed = 1; seed <= 120; seed += 1) selected.add(new MajinCaveRunState(seed).monsterHouseFloor);
  assert.deepEqual([...selected].sort((left, right) => left - right), [...MAJIN_CAVE_MONSTER_HOUSE_CANDIDATE_FLOORS]);
});

test("all generated floors connect their entry to each required stair and room", () => {
  for (let seed = 1; seed <= 32; seed += 1) {
    for (let floorNumber = 1; floorNumber <= 10; floorNumber += 1) {
      const floor = generateMajinCaveFloor(seed, floorNumber);
      assert.ok(isMajinCaveWalkable(floor.grid, floor.playerEntry));
      assert.ok(isMajinCaveWalkable(floor.grid, floor.upStair));
      if (floor.downStair) assert.equal(isMajinCaveConnected(floor.grid, floor.playerEntry, floor.downStair), true);
      if (floor.bossPosition) assert.equal(isMajinCaveConnected(floor.grid, floor.playerEntry, floor.bossPosition), true);
      for (const room of floor.rooms) assert.equal(isMajinCaveConnected(floor.grid, floor.playerEntry, room.center), true);
    }
  }
});

test("player, stairs and enemies use distinct valid cells across generated floors", () => {
  for (let seed = 1; seed <= 64; seed += 1) {
    const run = new MajinCaveRunState(seed);
    for (let floorNumber = 1; floorNumber <= 10; floorNumber += 1) {
      const floor = run.getFloor(floorNumber);
      for (const point of [floor.playerEntry, floor.upStair, floor.downStair, floor.bossPosition]) if (point) assert.equal(isMajinCaveWalkable(floor.grid, point), true);
      const reserved = new Set([pointKey(floor.playerEntry), pointKey(floor.upStair), floor.downStair ? pointKey(floor.downStair) : ""]);
      const enemyCells = new Set();
      for (const enemy of floor.enemies) {
        assert.equal(isMajinCaveWalkable(floor.grid, enemy.position), true, enemy.id);
        assert.equal(enemyCells.has(pointKey(enemy.position)), false, `${enemy.id} overlaps another enemy`);
        enemyCells.add(pointKey(enemy.position));
        assert.equal(reserved.has(pointKey(enemy.position)), false, `${enemy.id} occupies a player or stair cell`);
      }
      const availableFirstMoves = [
        { x: floor.playerEntry.x, y: floor.playerEntry.y - 1 },
        { x: floor.playerEntry.x, y: floor.playerEntry.y + 1 },
        { x: floor.playerEntry.x - 1, y: floor.playerEntry.y },
        { x: floor.playerEntry.x + 1, y: floor.playerEntry.y },
      ].filter((point) => isMajinCaveWalkable(floor.grid, point) && !enemyCells.has(pointKey(point)));
      assert.ok(availableFirstMoves.length >= 1, `${floorNumber}F start must not be completely surrounded`);
    }
  }
});

test("Monster House enemy density is doubled without mixing its floor-band table", () => {
  for (let seed = 1; seed <= 96; seed += 1) {
    const run = new MajinCaveRunState(seed);
    const house = run.getFloor(run.monsterHouseFloor);
    assert.equal(house.isMonsterHouse, true);
    assert.ok(house.enemies.length >= DEV_MAJIN_CAVE_BALANCE.normalEnemyCount.min * DEV_MAJIN_CAVE_BALANCE.monsterHouseEnemyMultiplier);
    assert.ok(house.enemies.length <= DEV_MAJIN_CAVE_BALANCE.normalEnemyCount.max * DEV_MAJIN_CAVE_BALANCE.monsterHouseEnemyMultiplier);
    const permitted = new Set(getMajinCaveEnemyTable(house.floorNumber));
    for (const enemy of house.enemies) assert.equal(permitted.has(enemy.definitionId), true, `${enemy.definitionId} must belong to ${house.floorNumber}F table`);
  }
});

test("enemy turns keep stairs clear and never overlap another enemy", () => {
  const run = new MajinCaveRunState(8008);
  const turns = new MajinCaveTurnSystem();
  for (let step = 0; step < 40; step += 1) {
    turns.wait(run);
    turns.resolveEnemyPhase(run);
    const enemyCells = new Set();
    for (const enemy of run.getAliveEnemies()) {
      assert.equal(enemyCells.has(pointKey(enemy.position)), false, `${enemy.id} overlaps another enemy after a turn`);
      enemyCells.add(pointKey(enemy.position));
      assert.notEqual(pointKey(enemy.position), pointKey(run.currentFloor.upStair));
      if (run.currentFloor.downStair) assert.notEqual(pointKey(enemy.position), pointKey(run.currentFloor.downStair));
    }
  }
});

test("No.08 has the specified floor-band enemy tables", () => {
  assert.deepEqual(getMajinCaveEnemyTable(1).map((id) => MAJIN_CAVE_ENEMIES[id].name), ["プリン", "たまゴースト"]);
  assert.deepEqual(getMajinCaveEnemyTable(3).map((id) => MAJIN_CAVE_ENEMIES[id].name), ["プリン", "たまゴースト"]);
  assert.deepEqual(getMajinCaveEnemyTable(4).map((id) => MAJIN_CAVE_ENEMIES[id].name), ["おばけつむり", "ファンシーダック", "スノーボム"]);
  assert.deepEqual(getMajinCaveEnemyTable(6).map((id) => MAJIN_CAVE_ENEMIES[id].name), ["おばけつむり", "ファンシーダック", "スノーボム"]);
  assert.deepEqual(getMajinCaveEnemyTable(7).map((id) => MAJIN_CAVE_ENEMIES[id].name), ["こあくま", "エリマキヘビ", "ダイジャ"]);
  assert.deepEqual(getMajinCaveEnemyTable(10).map((id) => MAJIN_CAVE_ENEMIES[id].name), ["こあくま", "エリマキヘビ", "ダイジャ"]);
});

test("only valid player actions produce exactly one enemy phase; a wall never consumes a turn", () => {
  const turns = new MajinCaveTurnSystem();
  const directions = [["up", 0, -1], ["down", 0, 1], ["left", -1, 0], ["right", 1, 0]];
  const blockedRun = new MajinCaveRunState(42);
  const wallEdge = getMajinCaveWalkableCells(blockedRun.currentFloor.grid).find((point) => directions.some(([, x, y]) => !isMajinCaveWalkable(blockedRun.currentFloor.grid, { x: point.x + x, y: point.y + y })));
  assert.ok(wallEdge);
  blockedRun.setPlayerPosition(wallEdge);
  const blockedDirection = directions.find(([, x, y]) => !isMajinCaveWalkable(blockedRun.currentFloor.grid, { x: blockedRun.playerPosition.x + x, y: blockedRun.playerPosition.y + y }));
  assert.ok(blockedDirection);
  const blocked = turns.movePlayer(blockedRun, blockedDirection[0]);
  assert.equal(blocked.valid, false);
  assert.equal(blockedRun.turnCount, 0);
  assert.equal(blockedRun.enemyPhaseCount, 0);

  const validRun = new MajinCaveRunState(42);
  const validDirection = directions
    .find(([, x, y]) => isMajinCaveWalkable(validRun.currentFloor.grid, { x: validRun.playerPosition.x + x, y: validRun.playerPosition.y + y }));
  assert.ok(validDirection);
  assert.equal(turns.movePlayer(validRun, validDirection[0]).valid, true);
  turns.resolveEnemyPhase(validRun);
  assert.equal(validRun.turnCount, 1);
  assert.equal(validRun.enemyPhaseCount, 1);
});

test("defeated enemies persist in the same generated floor during the return trip", () => {
  const run = new MajinCaveRunState(551);
  const enemy = run.currentFloor.enemies[0];
  assert.equal(run.damageEnemy(enemy, enemy.hp), true);
  assert.equal(run.currentFloor.defeatedEnemyIds.includes(enemy.id), true);
  assert.equal(run.getFloor(1).enemies.find((candidate) => candidate.id === enemy.id)?.defeated, true);
});

test("a defeated enemy is removed from every following enemy phase before its defeat animation completes", () => {
  const run = new MajinCaveRunState(551);
  const turns = new MajinCaveTurnSystem();
  const enemy = run.currentFloor.enemies[0];
  assert.equal(run.damageEnemy(enemy, enemy.hp), true);
  const events = turns.resolveEnemyPhase(run);
  assert.equal(run.getAliveEnemies().some((candidate) => candidate.id === enemy.id), false);
  assert.equal(events.some((event) => event.enemy.id === enemy.id), false);
});

test("Monster House reveal, defeat state and the exact FloorState persist when returning", () => {
  const run = new MajinCaveRunState(8008);
  while (run.currentFloorNumber < run.monsterHouseFloor) {
    run.setPlayerPosition(run.currentFloor.downStair);
    assert.equal(run.useCurrentStair(), "descended");
  }
  const house = run.currentFloor;
  const initialEnemyCount = house.enemies.length;
  assert.equal(house.isMonsterHouse, true);
  assert.equal(run.revealMonsterHouse(), true);
  assert.equal(run.revealMonsterHouse(), false, "the entrance presentation is one-time only");
  const defeated = house.enemies[0];
  assert.equal(run.damageEnemy(defeated, defeated.hp), true);
  while (run.currentFloorNumber < 10) {
    run.setPlayerPosition(run.currentFloor.downStair);
    assert.equal(run.useCurrentStair(), "descended");
  }
  const boss = run.currentFloor.enemies.find((enemy) => enemy.definitionId === "majin");
  assert.ok(boss);
  assert.equal(run.damageEnemy(boss, boss.hp), true);
  while (run.currentFloorNumber > house.floorNumber) {
    run.setPlayerPosition(run.currentFloor.upStair);
    assert.equal(run.useCurrentStair(), "ascended");
  }
  assert.equal(run.currentFloor, house);
  assert.equal(run.currentFloor.monsterHouseRevealed, true);
  assert.equal(run.currentFloor.enemies.length, initialEnemyCount, "returning never regenerates Monster House enemies");
  assert.equal(run.currentFloor.enemies.find((enemy) => enemy.id === defeated.id)?.defeated, true);
});

test("Majin arrival presentation state is one-time-only and does not change combat state", () => {
  const run = new MajinCaveRunState(8008);
  while (run.currentFloorNumber < 10) {
    run.setPlayerPosition(run.currentFloor.downStair);
    assert.equal(run.useCurrentStair(), "descended");
  }
  const boss = run.currentFloor.enemies.find((enemy) => enemy.definitionId === "majin");
  assert.ok(boss);
  assert.equal(run.currentFloor.majinRevealed, false);
  assert.equal(run.revealMajin(), true);
  assert.equal(run.revealMajin(), false);
  assert.equal(run.currentFloor.majinRevealed, true);
  assert.equal(boss.hp, MAJIN_CAVE_ENEMIES.majin.maxHp);
  assert.equal(run.phase, "descent");
});

test("DEV tempo rows preserve visit direction, combat, damage, recovery and Monster House summary", () => {
  let time = 1000;
  const run = new MajinCaveRunState(8008, { now: () => time });
  const turns = new MajinCaveTurnSystem();
  const direction = [["up", 0, -1], ["down", 0, 1], ["left", -1, 0], ["right", 1, 0]]
    .find(([, x, y]) => isMajinCaveWalkable(run.currentFloor.grid, { x: run.playerPosition.x + x, y: run.playerPosition.y + y }));
  assert.ok(direction);
  time += 400;
  turns.movePlayer(run, direction[0]);
  turns.resolveEnemyPhase(run);
  time += 600;
  run.setPlayerPosition(run.currentFloor.downStair);
  assert.equal(run.useCurrentStair(), "descended");
  const rows = run.getTempoRows();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].direction, "下り");
  assert.equal(rows[0].steps, 1);
  assert.equal(rows[0].durationMs, 1000);
  assert.equal(typeof rows[0].damageTaken, "number");
  const house = run.getMonsterHouseTempoRow();
  assert.equal(house.monsterHouseFloor, run.monsterHouseFloor);
  assert.equal(typeof house.entryEnemyCount, "number");
  const summary = run.getRunTempoSummary();
  assert.equal(summary.majinBattleTimeMs, 0, "a run without the boss reports zero Majin combat time");
});

test("DEV tempo summary measures Majin combat from first damage through defeat", () => {
  let time = 0;
  const run = new MajinCaveRunState(44, { now: () => time });
  while (run.currentFloorNumber < 10) {
    run.setPlayerPosition(run.currentFloor.downStair);
    assert.equal(run.useCurrentStair(), "descended");
  }
  const boss = run.currentFloor.enemies.find((enemy) => enemy.definitionId === "majin");
  assert.ok(boss);
  time = 1200;
  assert.equal(run.damageEnemy(boss, 1), false);
  time = 2450;
  assert.equal(run.damageEnemy(boss, boss.hp), true);
  assert.equal(run.getRunTempoSummary().majinBattleTimeMs, 1250);
});

test("a full descent and ascent retains floor, defeat and exploration state while switching phase once", () => {
  const run = new MajinCaveRunState(999);
  const firstFloor = run.currentFloor;
  const defeatedOnFirstFloor = firstFloor.enemies[0];
  const explorationBeforeDescent = new Set(firstFloor.exploredCells);
  assert.equal(run.damageEnemy(defeatedOnFirstFloor, defeatedOnFirstFloor.hp), true);
  for (let expectedFloor = 2; expectedFloor <= 10; expectedFloor += 1) {
    run.setPlayerPosition(run.currentFloor.downStair);
    assert.equal(run.useCurrentStair(), "descended");
    assert.equal(run.currentFloorNumber, expectedFloor);
  }
  const boss = run.currentFloor.enemies.find((enemy) => enemy.definitionId === "majin");
  assert.ok(boss);
  assert.equal(run.damageEnemy(boss, boss.hp), true);
  assert.equal(run.phase, "ascent");
  assert.equal(run.damageEnemy(boss, 1), false, "a defeated boss cannot trigger another phase change");
  for (let expectedFloor = 9; expectedFloor >= 1; expectedFloor -= 1) {
    run.setPlayerPosition(run.currentFloor.upStair);
    assert.equal(run.useCurrentStair(), "ascended");
    assert.equal(run.currentFloorNumber, expectedFloor);
  }
  assert.equal(run.getFloor(1), firstFloor, "the exact FloorState object is retained");
  assert.equal(run.getFloor(1).enemies.find((enemy) => enemy.id === defeatedOnFirstFloor.id)?.defeated, true);
  for (const cell of explorationBeforeDescent) assert.equal(run.getFloor(1).exploredCells.has(cell), true, `explored cell ${cell} is retained`);
  run.setPlayerPosition(run.currentFloor.upStair);
  assert.equal(run.useCurrentStair(), "escaped");
});

test("No.08 is a normal world-map destination without a key-art splash", () => {
  const manifest = readWorldMapManifest(JSON.parse(readFileSync(path.join(WORLD_MAP_DIR, "map.json"), "utf8")));
  const destinations = readWorldMapDestinations(JSON.parse(readFileSync(path.join(WORLD_MAP_DIR, "destinations.json"), "utf8")), manifest);
  assert.equal(MAPS.map_08_majin_cave.sceneKey, "MajinCaveScene");
  const cave = destinations.find((destination) => destination.id === "destination_majin_cave");
  assert.ok(cave);
  assert.equal(cave.targetMapId, "map_08_majin_cave");
  assert.equal(cave.targetSpawnId, "fromWorldMap");
  assert.equal(cave.unlockFlag, null);
  assert.equal(manifest.entryDestinationIds.from_majin_cave, "destination_majin_cave");
  assert.ok(MAPS.map_08_majin_cave.spawns.fromWorldMap);
  assert.equal(MAP_ENTRY_SPLASHES.map_08_majin_cave, undefined);
  assert.equal(existsSync(path.join(TILES_DIR, "entry_splash.png")), false);
});

test("?mapTest=majin-cave remains a registered isolated DEV launch target", () => {
  assert.equal(readDevMapTest("?mapTest=majin-cave"), "majin-cave");
  assert.equal(pointKey({ x: 2, y: 3 }), "2,3");
});
