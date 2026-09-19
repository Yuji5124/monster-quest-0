import type { BattleCommandId } from "../config/battle.ts";
import { NORMAL_ATTACK } from "../data/battleActions.ts";
import type { BattleAction } from "../data/battleActions.ts";
import { ITEM_DEFINITIONS } from "../data/items.ts";

export type BattleState = "COMMAND" | "PLAYER_ACTION" | "ENEMY_ACTION" | "VICTORY" | "DEFEAT" | "ESCAPED";

export interface BattleCombatantDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
  readonly maxMp?: number;
  readonly isBoss?: boolean;
  readonly learnedMagic?: readonly BattleAction[];
  readonly enemyActions?: readonly BattleAction[];
  /** TEMP_TEST_VALUE: battle reward balance pending the formal monster-data pass. */
  readonly reward?: BattleRewardDefinition;
}

export interface BattleItemDropDefinition {
  readonly itemId: string;
  /** Inclusive lower / exclusive upper probability (0 to 1). */
  readonly chance: number;
}

export interface BattleRewardDefinition {
  readonly experience: number;
  readonly money: number;
  readonly drops?: readonly BattleItemDropDefinition[];
}

export interface BattleReward {
  readonly experience: number;
  readonly money: number;
  readonly itemId?: string;
}

export interface BattleStatus { mirror: number }

export interface BattleCombatant extends BattleCombatantDefinition {
  hp: number;
  mp: number;
  status: BattleStatus;
}

export interface BattleSnapshot {
  readonly state: BattleState;
  readonly player: Readonly<BattleCombatant>;
  readonly enemy: Readonly<BattleCombatant>;
  readonly party: readonly Readonly<BattleCombatant>[];
  readonly message: string;
  /** Set exactly once when the battle enters VICTORY. */
  readonly reward?: BattleReward;
}

/** Rolls a single first-match item drop. Invalid values safely produce no reward. */
export function rollBattleReward(definition: BattleRewardDefinition | undefined, random: () => number = Math.random): BattleReward {
  const experience = Math.max(0, Math.floor(definition?.experience ?? 0));
  const money = Math.max(0, Math.floor(definition?.money ?? 0));
  const itemId = definition?.drops?.find((drop) =>
    typeof drop.itemId === "string" && drop.itemId.length > 0
    && Number.isFinite(drop.chance) && drop.chance > 0
    && random() < Math.min(1, drop.chance),
  )?.itemId;
  return itemId ? { experience, money, itemId } : { experience, money };
}

/** Reflect once; never recursively bounce between two mirrored combatants. */
export function resolveMagicDamage(caster: BattleCombatant, target: BattleCombatant, power: number, reflectable: boolean): { reflected: boolean; damage: number } {
  const reflected = reflectable && target.status.mirror > 0;
  if (reflected) target.status.mirror -= 1;
  const recipient = reflected ? caster : target;
  const damage = Math.max(1, power);
  recipient.hp = Math.max(0, recipient.hp - damage);
  return { reflected, damage };
}

export function calculateDamage(attacker: Pick<BattleCombatantDefinition, "attack">, defender: Pick<BattleCombatantDefinition, "defense">): number {
  return Math.max(1, attacker.attack - defender.defense);
}

/** A minimal deterministic battle turn model for DEV_BATTLE_TEST. */
export class BattleSystem {
  private player: BattleCombatant;
  private enemy: BattleCombatant;
  private state: BattleState = "COMMAND";
  private message: string;
  private enemyActionIndex = 0;
  private reward: BattleReward | undefined;
  private readonly random: () => number;

  constructor(player: BattleCombatantDefinition, enemy: BattleCombatantDefinition, random: () => number = Math.random) {
    this.random = random;
    this.player = { ...player, hp: player.maxHp, mp: player.maxMp ?? 0, status: { mirror: 0 } };
    this.enemy = { ...enemy, hp: enemy.maxHp, mp: enemy.maxMp ?? 0, status: { mirror: 0 } };
    this.message = `${this.enemy.displayName}が　あらわれた！`;
  }

  getSnapshot(): BattleSnapshot {
    return {
      state: this.state,
      player: { ...this.player, status: { ...this.player.status } },
      enemy: { ...this.enemy, status: { ...this.enemy.status } },
      // Party recruitment / multiple actors are not implemented yet.
      party: [{ ...this.player, status: { ...this.player.status } }],
      message: this.message,
      reward: this.reward ? { ...this.reward } : undefined,
    };
  }

  confirm(command: BattleCommandId = "fight", magicId?: string): BattleSnapshot {
    if (this.state === "COMMAND") {
      if (command === "fight") this.playerAttack();
      if (command === "magic") {
        const magic = this.player.learnedMagic?.find((action) => action.id === magicId);
        if (!magic) this.message = "つかえる　まほうがない。";
        else if (this.performAction(this.player, this.enemy, magic)) this.state = this.player.hp <= 0 ? "DEFEAT" : "PLAYER_ACTION";
      }
      if (command === "item") this.message = "つかえる　どうぐがない。";
      if (command === "flee") {
        this.state = this.enemy.isBoss ? "PLAYER_ACTION" : "ESCAPED";
        this.message = this.enemy.isBoss ? `${this.enemy.displayName}からは　にげられない！` : "うまく　にげだした！";
      }
      return this.getSnapshot();
    }
    if (this.state === "PLAYER_ACTION") {
      if (this.enemy.hp <= 0) {
        this.victory();
      } else {
        this.enemyAttack();
      }
      return this.getSnapshot();
    }
    if (this.state === "ENEMY_ACTION") {
      if (this.enemy.hp <= 0) this.victory();
      else { this.state = "COMMAND"; this.message = "どうする？"; }
    }
    return this.getSnapshot();
  }

  private playerAttack(): void {
    const damage = calculateDamage(this.player, this.enemy);
    this.enemy.hp = Math.max(0, this.enemy.hp - damage);
    this.state = "PLAYER_ACTION";
    this.message = `${this.enemy.displayName}に　${damage}の　ダメージ！`;
  }

  private enemyAttack(): void {
    const actions = this.enemy.enemyActions ?? [NORMAL_ATTACK];
    let action = actions[this.enemyActionIndex % actions.length] ?? NORMAL_ATTACK;
    this.enemyActionIndex += 1;
    if (action.kind !== "attack" && this.enemy.mp < action.mpCost) action = NORMAL_ATTACK;
    this.performAction(this.enemy, this.player, action);
    this.state = this.player.hp <= 0 ? "DEFEAT" : "ENEMY_ACTION";
    if (this.player.hp <= 0) this.message += `\n${this.player.displayName}は　たおれた…`;
  }

  private victory(): void {
    this.state = "VICTORY";
    this.reward = rollBattleReward(this.enemy.reward, this.random);
    const lines = [
      `${this.enemy.displayName}を　たおした！`,
      `${this.reward.experience} EXPと　${this.reward.money}Gを　てにいれた！`,
    ];
    if (this.reward.itemId && Object.hasOwn(ITEM_DEFINITIONS, this.reward.itemId)) {
      lines.push(`${ITEM_DEFINITIONS[this.reward.itemId as keyof typeof ITEM_DEFINITIONS].name}を　みつけた！`);
    }
    this.message = lines.join("\n");
  }

  private performAction(caster: BattleCombatant, target: BattleCombatant, action: BattleAction): boolean {
    if (action.kind === "attack") {
      const damage = calculateDamage(caster, target);
      target.hp = Math.max(0, target.hp - damage);
      this.message = `${caster.displayName}の　こうげき！\n${target.displayName}に　${damage}のダメージ！`;
      return true;
    }
    if (caster.mp < action.mpCost) { this.message = "MPが　たりない！"; return false; }
    caster.mp -= action.mpCost;
    if (action.kind === "mirror") {
      caster.status.mirror = action.charges;
      this.message = `${caster.displayName}は　${action.name}をつかった！\nひかりのかがみが　あらわれた。`;
    } else {
      const result = resolveMagicDamage(caster, target, action.power, action.reflectable);
      const recipient = result.reflected ? caster : target;
      this.message = `${caster.displayName}の　${action.name}！\n${result.reflected ? "ミラーが　まほうをはねかえした！\n" : ""}${recipient.displayName}に　${result.damage}のダメージ！`;
    }
    return true;
  }
}
