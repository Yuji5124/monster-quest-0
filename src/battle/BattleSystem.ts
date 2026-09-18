import type { BattleCommandId } from "../config/battle.ts";
import { NORMAL_ATTACK } from "../data/battleActions.ts";
import type { BattleAction } from "../data/battleActions.ts";

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

  constructor(player: BattleCombatantDefinition, enemy: BattleCombatantDefinition) {
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
    this.message = `${this.enemy.displayName}を　たおした！`;
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
