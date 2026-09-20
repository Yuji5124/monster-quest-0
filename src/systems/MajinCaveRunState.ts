import { DEV_MAJIN_CAVE_BALANCE, MAJIN_CAVE_FLOOR_COUNT, MAJIN_CAVE_MONSTER_HOUSE_CANDIDATE_FLOORS } from "../config/majinCave.ts";
import type { MajinCavePhase, MajinCavePoint } from "../config/majinCave.ts";
import { MAJIN_CAVE_ENEMIES, chooseMajinCaveEnemy } from "../data/majinCaveEnemies.ts";
import type { MajinCaveEnemyDefinition, MajinCaveEnemyId } from "../data/majinCaveEnemies.ts";
import { createMajinCaveRandom, floorSeed, generateMajinCaveFloor, getMajinCaveWalkableCells, pointKey } from "./MajinCaveGenerator.ts";
import type { MajinCaveFloorLayout } from "./MajinCaveGenerator.ts";

export interface MajinCaveEnemyState {
  readonly id: string;
  readonly definitionId: MajinCaveEnemyId;
  position: MajinCavePoint;
  hp: number;
  defeated: boolean;
}

/** Pure per-floor data only; Phaser GameObjects are deliberately never stored here. */
export interface MajinCaveFloorState extends MajinCaveFloorLayout {
  /** Exactly one 4F–9F state in a run is the special high-density floor. */
  readonly isMonsterHouse: boolean;
  /** Set only after the short entrance presentation has been shown once. */
  monsterHouseRevealed: boolean;
  readonly enemies: MajinCaveEnemyState[];
  readonly defeatedEnemyIds: string[];
  readonly exploredCells: Set<string>;
}

export type MajinCaveStairResult = "descended" | "ascended" | "escaped" | "none";
export type MajinCaveRunDirection = "descent" | "ascent";

export interface MajinCaveFloorVisitMetrics {
  readonly floorNumber: number;
  readonly direction: MajinCaveRunDirection;
  readonly enteredAtMs: number;
  exitedAtMs: number | null;
  steps: number;
  combatActions: number;
  defeatedEnemies: number;
  damageTaken: number;
  recoveryReceived: number;
  hpAtEntry: number;
  hpAtExit: number | null;
  deaths: number;
  readonly isMonsterHouse: boolean;
  readonly initialEnemyCount: number;
}

export interface MajinCaveRunOptions {
  /** Injectable only for deterministic DEV/automated timing checks. */
  readonly now?: () => number;
}

export class MajinCaveRunState {
  readonly seed: number;
  /** Deterministically selected at run start and never reassigned. */
  readonly monsterHouseFloor: number;
  readonly floors = new Map<number, MajinCaveFloorState>();
  phase: MajinCavePhase = "descent";
  currentFloorNumber = 1;
  playerPosition: MajinCavePoint;
  playerHp: number = DEV_MAJIN_CAVE_BALANCE.maxHp;
  playerMp: number = DEV_MAJIN_CAVE_BALANCE.maxMp;
  turnCount = 0;
  enemyPhaseCount = 0;
  private readonly now: () => number;
  private readonly runStartedAtMs: number;
  private readonly floorVisits: MajinCaveFloorVisitMetrics[] = [];
  private activeVisit: MajinCaveFloorVisitMetrics | null = null;
  private majinCombatStartedAtMs: number | null = null;
  private majinDefeatedAtMs: number | null = null;

  constructor(seed: number, options: MajinCaveRunOptions = {}) {
    this.seed = seed >>> 0;
    this.monsterHouseFloor = selectMonsterHouseFloor(this.seed);
    this.now = options.now ?? Date.now;
    this.runStartedAtMs = this.now();
    this.playerPosition = this.currentFloor.playerEntry;
    this.startFloorVisit();
    this.revealAroundPlayer();
  }

  get currentFloor(): MajinCaveFloorState {
    return this.getFloor(this.currentFloorNumber);
  }

  getFloor(floorNumber: number): MajinCaveFloorState {
    let floor = this.floors.get(floorNumber);
    if (!floor) {
      const layout = generateMajinCaveFloor(this.seed, floorNumber);
      const isMonsterHouse = floorNumber === this.monsterHouseFloor;
      floor = {
        ...layout,
        isMonsterHouse,
        monsterHouseRevealed: false,
        enemies: createEnemies(this.seed, layout, isMonsterHouse),
        defeatedEnemyIds: [],
        exploredCells: new Set<string>(),
      };
      this.floors.set(floorNumber, floor);
    }
    return floor;
  }

  setPlayerPosition(position: MajinCavePoint): void {
    this.playerPosition = { ...position };
    this.revealAroundPlayer();
  }

  enemyAt(position: MajinCavePoint): MajinCaveEnemyState | undefined {
    return this.currentFloor.enemies.find((enemy) => !enemy.defeated && enemy.position.x === position.x && enemy.position.y === position.y);
  }

  getAliveEnemies(): readonly MajinCaveEnemyState[] {
    return this.currentFloor.enemies.filter((enemy) => !enemy.defeated);
  }

  enemyDefinition(enemy: MajinCaveEnemyState): MajinCaveEnemyDefinition {
    return MAJIN_CAVE_ENEMIES[enemy.definitionId];
  }

  damageEnemy(enemy: MajinCaveEnemyState, amount: number): boolean {
    if (enemy.definitionId === "majin" && !enemy.defeated && amount > 0 && this.majinCombatStartedAtMs === null) this.majinCombatStartedAtMs = this.now();
    enemy.hp = Math.max(0, enemy.hp - Math.max(0, amount));
    if (enemy.hp > 0 || enemy.defeated) return false;
    enemy.defeated = true;
    this.currentFloor.defeatedEnemyIds.push(enemy.id);
    if (this.activeVisit) this.activeVisit.defeatedEnemies += 1;
    if (enemy.definitionId === "majin") {
      this.majinDefeatedAtMs = this.now();
      this.phase = "ascent";
    }
    return true;
  }

  damagePlayer(amount: number): boolean {
    const damage = Math.min(this.playerHp, Math.max(0, amount));
    this.playerHp -= damage;
    if (this.activeVisit) this.activeVisit.damageTaken += damage;
    const defeated = this.playerHp === 0;
    if (defeated && this.activeVisit) this.activeVisit.deaths += 1;
    return defeated;
  }

  recoverAtCurrentEntrance(): void {
    const recovered = DEV_MAJIN_CAVE_BALANCE.maxHp - this.playerHp;
    this.playerHp = DEV_MAJIN_CAVE_BALANCE.maxHp;
    this.playerMp = DEV_MAJIN_CAVE_BALANCE.maxMp;
    this.recordRecovery(recovered);
    this.setPlayerPosition(this.currentFloor.upStair);
  }

  completePlayerAction(kind: "move" | "attack" | "wait"): void {
    this.turnCount += 1;
    if (kind === "move" && this.activeVisit) this.activeVisit.steps += 1;
    if (kind === "attack" && this.activeVisit) this.activeVisit.combatActions += 1;
  }

  completeEnemyPhase(): void {
    this.enemyPhaseCount += 1;
  }

  useCurrentStair(): MajinCaveStairResult {
    const floor = this.currentFloor;
    if (samePoint(this.playerPosition, floor.downStair) && this.phase === "descent" && this.currentFloorNumber < MAJIN_CAVE_FLOOR_COUNT) {
      this.closeActiveVisit();
      this.currentFloorNumber += 1;
      this.setPlayerPosition(this.currentFloor.upStair);
      this.startFloorVisit();
      this.recoverOnStair();
      return "descended";
    }
    if (samePoint(this.playerPosition, floor.upStair) && this.phase === "ascent") {
      if (this.currentFloorNumber === 1) {
        this.closeActiveVisit();
        return "escaped";
      }
      this.closeActiveVisit();
      this.currentFloorNumber -= 1;
      this.setPlayerPosition(this.currentFloor.downStair!);
      this.startFloorVisit();
      this.recoverOnStair();
      return "ascended";
    }
    return "none";
  }

  stairPrompt(): string | null {
    const floor = this.currentFloor;
    if (samePoint(this.playerPosition, floor.downStair) && this.phase === "descent") return "かいだんがある。\nZ / Enterで すすむ";
    if (samePoint(this.playerPosition, floor.upStair) && this.phase === "ascent") {
      return this.currentFloorNumber === 1 ? "どうくつの でぐちだ。\nZ / Enterで そとへ" : "のぼりかいだんがある。\nZ / Enterで すすむ";
    }
    return null;
  }

  /** Returns true once per special FloorState, when its entrance presentation should play. */
  revealMonsterHouse(): boolean {
    const floor = this.currentFloor;
    if (!floor.isMonsterHouse || floor.monsterHouseRevealed) return false;
    floor.monsterHouseRevealed = true;
    return true;
  }

  /** DEV-only console rows; all times are relative to this run's start. */
  getTempoRows(): readonly Record<string, number | string | boolean | null>[] {
    const currentTime = this.now();
    return this.floorVisits.map((visit) => {
      const exitedAtMs = visit.exitedAtMs ?? currentTime;
      return {
        floor: `${visit.floorNumber}F`,
        direction: visit.direction === "descent" ? "下り" : "帰り",
        monsterHouse: visit.isMonsterHouse,
        entryMs: visit.enteredAtMs - this.runStartedAtMs,
        exitMs: exitedAtMs - this.runStartedAtMs,
        durationMs: exitedAtMs - visit.enteredAtMs,
        steps: visit.steps,
        combatActions: visit.combatActions,
        defeatedEnemies: visit.defeatedEnemies,
        damageTaken: visit.damageTaken,
        recoveryReceived: visit.recoveryReceived,
        hpAtEntry: visit.hpAtEntry,
        hpAtExit: visit.hpAtExit ?? this.playerHp,
        deaths: visit.deaths,
      };
    });
  }

  getMonsterHouseTempoRow(): Record<string, number | boolean> {
    const floor = this.getFloor(this.monsterHouseFloor);
    const visits = this.floorVisits.filter((visit) => visit.isMonsterHouse);
    const currentTime = this.now();
    return {
      seed: this.seed,
      monsterHouseFloor: this.monsterHouseFloor,
      entryEnemyCount: visits[0]?.initialEnemyCount ?? floor.enemies.length,
      defeatedEnemies: floor.defeatedEnemyIds.length,
      remainingEnemies: floor.enemies.filter((enemy) => !enemy.defeated).length,
      durationMs: visits.reduce((total, visit) => total + ((visit.exitedAtMs ?? currentTime) - visit.enteredAtMs), 0),
      damageTaken: visits.reduce((total, visit) => total + visit.damageTaken, 0),
      deaths: visits.reduce((total, visit) => total + visit.deaths, 0),
      revealed: floor.monsterHouseRevealed,
    };
  }

  getRunTempoSummary(): Record<string, number> {
    const currentTime = this.now();
    return {
      seed: this.seed,
      monsterHouseFloor: this.monsterHouseFloor,
      totalPlayTimeMs: currentTime - this.runStartedAtMs,
      totalActions: this.turnCount,
      totalEnemyPhases: this.enemyPhaseCount,
      totalDamageTaken: this.floorVisits.reduce((total, visit) => total + visit.damageTaken, 0),
      totalRecovery: this.floorVisits.reduce((total, visit) => total + visit.recoveryReceived, 0),
      totalDeaths: this.floorVisits.reduce((total, visit) => total + visit.deaths, 0),
      hpRemaining: this.playerHp,
      majinBattleTimeMs: this.majinCombatStartedAtMs === null ? 0 : (this.majinDefeatedAtMs ?? currentTime) - this.majinCombatStartedAtMs,
    };
  }

  private revealAroundPlayer(): void {
    const floor = this.currentFloor;
    for (const point of getMajinCaveWalkableCells(floor.grid)) {
      if (Math.abs(point.x - this.playerPosition.x) + Math.abs(point.y - this.playerPosition.y) <= DEV_MAJIN_CAVE_BALANCE.visionRadius) floor.exploredCells.add(pointKey(point));
    }
  }

  private recoverOnStair(): void {
    const recovered = Math.min(DEV_MAJIN_CAVE_BALANCE.maxHp - this.playerHp, DEV_MAJIN_CAVE_BALANCE.stairRecovery);
    this.playerHp += recovered;
    this.recordRecovery(recovered);
  }

  private startFloorVisit(): void {
    const floor = this.currentFloor;
    const visit: MajinCaveFloorVisitMetrics = {
      floorNumber: this.currentFloorNumber,
      direction: this.phase,
      enteredAtMs: this.now(),
      exitedAtMs: null,
      steps: 0,
      combatActions: 0,
      defeatedEnemies: 0,
      damageTaken: 0,
      recoveryReceived: 0,
      hpAtEntry: this.playerHp,
      hpAtExit: null,
      deaths: 0,
      isMonsterHouse: floor.isMonsterHouse,
      initialEnemyCount: floor.enemies.filter((enemy) => !enemy.defeated).length,
    };
    this.floorVisits.push(visit);
    this.activeVisit = visit;
  }

  private closeActiveVisit(): void {
    if (!this.activeVisit || this.activeVisit.exitedAtMs !== null) return;
    this.activeVisit.exitedAtMs = this.now();
    this.activeVisit.hpAtExit = this.playerHp;
    this.activeVisit = null;
  }

  private recordRecovery(amount: number): void {
    if (amount > 0 && this.activeVisit) this.activeVisit.recoveryReceived += amount;
  }
}

function createEnemies(runSeed: number, layout: MajinCaveFloorLayout, isMonsterHouse: boolean): MajinCaveEnemyState[] {
  const random = createMajinCaveRandom(floorSeed(runSeed, layout.floorNumber) ^ 0x36a8f9c1);
  const reserved = new Set([pointKey(layout.playerEntry), pointKey(layout.upStair), layout.downStair ? pointKey(layout.downStair) : "", layout.bossPosition ? pointKey(layout.bossPosition) : ""]);
  const candidates = getMajinCaveWalkableCells(layout.grid)
    .filter((point) => !reserved.has(pointKey(point)) && Math.abs(point.x - layout.playerEntry.x) + Math.abs(point.y - layout.playerEntry.y) >= 4);
  shuffle(candidates, random);
  const normalCount = randomInt(random, DEV_MAJIN_CAVE_BALANCE.normalEnemyCount.min, DEV_MAJIN_CAVE_BALANCE.normalEnemyCount.max);
  const count = layout.floorNumber === 10 ? 2 : isMonsterHouse ? normalCount * DEV_MAJIN_CAVE_BALANCE.monsterHouseEnemyMultiplier : normalCount;
  const enemies: MajinCaveEnemyState[] = [];
  for (let index = 0; index < Math.min(count, candidates.length); index += 1) {
    const definition = chooseMajinCaveEnemy(layout.floorNumber, random);
    enemies.push({ id: `f${layout.floorNumber}-e${index + 1}`, definitionId: definition.id, position: candidates[index], hp: definition.maxHp, defeated: false });
  }
  if (layout.bossPosition) {
    const boss = MAJIN_CAVE_ENEMIES.majin;
    enemies.push({ id: "f10-majin", definitionId: boss.id, position: layout.bossPosition, hp: boss.maxHp, defeated: false });
  }
  return enemies;
}

function selectMonsterHouseFloor(runSeed: number): number {
  const random = createMajinCaveRandom((runSeed ^ 0xc2b2ae35) >>> 0);
  return MAJIN_CAVE_MONSTER_HOUSE_CANDIDATE_FLOORS[Math.floor(random() * MAJIN_CAVE_MONSTER_HOUSE_CANDIDATE_FLOORS.length)];
}

function randomInt(random: () => number, minimum: number, maximum: number): number {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

function shuffle<T>(values: T[], random: () => number): void {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const next = Math.floor(random() * (index + 1));
    [values[index], values[next]] = [values[next], values[index]];
  }
}

function samePoint(first: MajinCavePoint, second: MajinCavePoint | null): boolean {
  return second !== null && first.x === second.x && first.y === second.y;
}
