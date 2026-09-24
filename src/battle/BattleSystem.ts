import type { BattleCommandId } from "../config/battle.ts";
import { NORMAL_ATTACK } from "../data/battleActions.ts";
import type { BattleAction } from "../data/battleActions.ts";
import { ITEM_DEFINITIONS } from "../data/items.ts";
import type { ItemDefinition, ItemId } from "../data/items.ts";
import { calculatePoisonDamage } from "../data/statusEffects.ts";
import type { WeaponActionDefinition } from "../data/weapons.ts";

export type BattleState = "COMMAND" | "PLAYER_ACTION" | "ENEMY_ACTION" | "VICTORY" | "DEFEAT" | "ESCAPED";

/**
 * だいヒット(BATTLE_SPEC.md §5)。「クリティカル」「会心」の表記は使わない
 * (BATTLE_SPEC.md §13実装禁止)。発生率・倍率は未確定のためTEMP_TEST_VALUE。
 */
export const DAI_HIT_RATE = 1 / 16; // TEMP_TEST_VALUE: BATTLE_SPEC.md §5 発生率TBD
export const DAI_HIT_MULTIPLIER = 1.5; // TEMP_TEST_VALUE: BATTLE_SPEC.md §5 倍率TBD

/**
 * とくだいヒット(BATTLE_SPEC.md §6)。ワタベ専用の固有攻撃で、だいヒットの名称変更ではない。
 * `canUseTokudaiHit`を持つ戦闘者だけが発動できる。ワタベ自体はまだプレイアブルキャラクターとして
 * 実装されていない(PartySystem.PARTY_MEMBER_IDSはhero/tarosa/mirei のみ)ため、現状はどの
 * 正式パーティメンバーにもこのフラグを設定しない。発生率・倍率は未確定のためTEMP_TEST_VALUE。
 */
export const TOKUDAI_HIT_RATE = 1 / 8; // TEMP_TEST_VALUE: BATTLE_SPEC.md §6 発生率TBD
export const TOKUDAI_HIT_MULTIPLIER = 2.5; // TEMP_TEST_VALUE: BATTLE_SPEC.md §6 倍率TBD (だいヒットより強い)

export interface BattleCombatantDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
  readonly maxMp?: number;
  readonly speed?: number;
  readonly isBoss?: boolean;
  readonly learnedMagic?: readonly BattleAction[];
  readonly enemyActions?: readonly BattleAction[];
  /** 通常攻撃(fight)に乗る武器アクション。タロサの毒矢等はこれで表現する。 */
  readonly weaponAction?: WeaponActionDefinition;
  /** 状態異常耐性。trueなら完全無効。 */
  readonly statusResistance?: { readonly poison?: boolean };
  /** ワタベ専用の固有攻撃「とくだいヒット」(BATTLE_SPEC.md §6)を使えるか。現状どの正式パーティメンバーにも設定しない。 */
  readonly canUseTokudaiHit?: boolean;
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

export interface BattleStatus {
  mirror: number;
  poisoned: boolean;
}

export interface BattleCombatant extends BattleCombatantDefinition {
  hp: number;
  mp: number;
  attack: number;
  defense: number;
  speed?: number;
  status: BattleStatus;
}

export interface BattleSnapshot {
  readonly state: BattleState;
  /** 先頭パーティメンバー(通常は主人公)。単独戦闘だった頃との後方互換のため維持する。 */
  readonly player: Readonly<BattleCombatant>;
  readonly enemy: Readonly<BattleCombatant>;
  readonly party: readonly Readonly<BattleCombatant>[];
  /** COMMANDのとき、コマンド入力待ちのパーティメンバーのindex。 */
  readonly actingIndex: number;
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

function toCombatant(definition: BattleCombatantDefinition): BattleCombatant {
  return { ...definition, hp: definition.maxHp, mp: definition.maxMp ?? 0, status: { mirror: 0, poisoned: false } };
}

function cloneCombatant(combatant: BattleCombatant): BattleCombatant {
  return { ...combatant, status: { ...combatant.status } };
}

/**
 * A deterministic battle turn model. Supports a single ally (legacy DEV_BATTLE_TEST shape)
 * and a party of up to three allies against one enemy (2026-09-22 party-battle extension).
 * With more than one living, un-acted ally, resolving a command advances to the next
 * ally's COMMAND instead of the enemy's turn; the enemy acts once every living ally has acted.
 */
export class BattleSystem {
  private readonly party: BattleCombatant[];
  private enemy: BattleCombatant;
  private state: BattleState = "COMMAND";
  private message: string;
  private actingIndex = 0;
  private readonly actedThisRound = new Set<string>();
  private enemyActionIndex = 0;
  private reward: BattleReward | undefined;
  private readonly random: () => number;

  constructor(
    playerOrParty: BattleCombatantDefinition | readonly BattleCombatantDefinition[],
    enemy: BattleCombatantDefinition,
    random: () => number = Math.random,
  ) {
    this.random = random;
    const members = Array.isArray(playerOrParty) ? playerOrParty : [playerOrParty];
    this.party = members.map(toCombatant);
    this.enemy = toCombatant(enemy);
    this.message = `${this.enemy.displayName}が　あらわれた！`;
  }

  getSnapshot(): BattleSnapshot {
    const party = this.party.map(cloneCombatant);
    return {
      state: this.state,
      player: party[0],
      enemy: cloneCombatant(this.enemy),
      party,
      actingIndex: this.actingIndex,
      message: this.message,
      reward: this.reward ? { ...this.reward } : undefined,
    };
  }

  confirm(command: BattleCommandId = "fight", magicId?: string, itemId?: string): BattleSnapshot {
    if (this.state === "COMMAND") {
      const actor = this.party[this.actingIndex];
      let acted = false;
      if (command === "fight") {
        this.performAction(actor, this.enemy, NORMAL_ATTACK);
        this.state = "PLAYER_ACTION";
        acted = true;
      } else if (command === "magic") {
        const magic = actor.learnedMagic?.find((action) => action.id === magicId);
        if (!magic) {
          this.message = "つかえる　まほうがない。";
        } else {
          const target = this.resolveMagicTarget(actor, magic);
          if (!target) {
            this.message = "たいしょうが　いない。";
          } else if (this.performAction(actor, target, magic)) {
            this.state = this.isPartyWiped() ? "DEFEAT" : "PLAYER_ACTION";
            acted = true;
          }
        }
      } else if (command === "item") {
        const definition = itemId && Object.hasOwn(ITEM_DEFINITIONS, itemId) ? ITEM_DEFINITIONS[itemId as ItemId] : undefined;
        if (!definition || !definition.usableInBattle) {
          this.message = "つかえる　どうぐがない。";
        } else {
          this.useItem(actor, definition);
          this.state = "PLAYER_ACTION";
          acted = true;
        }
      } else if (command === "flee") {
        this.state = this.enemy.isBoss ? "PLAYER_ACTION" : "ESCAPED";
        this.message = this.enemy.isBoss ? `${this.enemy.displayName}からは　にげられない！` : "うまく　にげだした！";
        acted = true;
      }
      if (acted) this.actedThisRound.add(actor.id);
      return this.getSnapshot();
    }
    if (this.state === "PLAYER_ACTION") {
      if (this.enemy.hp <= 0) {
        this.victory();
        return this.getSnapshot();
      }
      const nextIndex = this.findNextLivingUnactedIndex();
      if (nextIndex !== -1) {
        this.actingIndex = nextIndex;
        this.state = "COMMAND";
        return this.getSnapshot();
      }
      this.enemyAttack();
      return this.getSnapshot();
    }
    if (this.state === "ENEMY_ACTION") {
      if (this.enemy.hp <= 0) {
        this.victory();
      } else {
        this.applyEndOfRoundPoison();
        if (this.isPartyWiped()) {
          this.state = "DEFEAT";
        } else {
          this.startNewRound();
        }
      }
    }
    return this.getSnapshot();
  }

  private isPartyWiped(): boolean {
    return this.party.every((member) => member.hp <= 0);
  }

  private findNextLivingUnactedIndex(): number {
    for (let offset = 1; offset <= this.party.length; offset += 1) {
      const index = (this.actingIndex + offset) % this.party.length;
      const member = this.party[index];
      if (member.hp > 0 && !this.actedThisRound.has(member.id)) return index;
    }
    return -1;
  }

  private startNewRound(): void {
    this.actedThisRound.clear();
    const firstLiving = this.party.findIndex((member) => member.hp > 0);
    this.actingIndex = firstLiving === -1 ? 0 : firstLiving;
    this.state = "COMMAND";
    this.message = "どうする？";
  }

  private resolveMagicTarget(actor: BattleCombatant, action: BattleAction): BattleCombatant | undefined {
    if (action.kind === "heal") return this.lowestHpLivingAlly();
    if (action.kind === "revive") return this.party.find((member) => member.hp <= 0);
    if (action.kind === "buff") return actor;
    return this.enemy;
  }

  private lowestHpLivingAlly(): BattleCombatant | undefined {
    const living = this.party.filter((member) => member.hp > 0);
    if (living.length === 0) return undefined;
    return living.reduce((lowest, member) => (member.hp / member.maxHp < lowest.hp / lowest.maxHp ? member : lowest), living[0]);
  }

  private pickEnemyTarget(): BattleCombatant {
    const living = this.party.filter((member) => member.hp > 0);
    const index = Math.min(living.length - 1, Math.floor(this.random() * living.length));
    return living[Math.max(0, index)];
  }

  private useItem(actor: BattleCombatant, item: ItemDefinition): void {
    if (item.effect === "heal") {
      const target = this.lowestHpLivingAlly() ?? actor;
      const healed = Math.min(item.power ?? 0, target.maxHp - target.hp);
      target.hp += healed;
      this.message = `${actor.displayName}は　${item.name}をつかった！\n${target.displayName}の　HPが　${healed}かいふくした！`;
      return;
    }
    if (item.effect === "cure_poison") {
      const target = this.party.find((member) => member.hp > 0 && member.status.poisoned);
      if (target) {
        target.status.poisoned = false;
        this.message = `${actor.displayName}は　${item.name}をつかった！\n${target.displayName}の　どくが　なおった！`;
      } else {
        this.message = `${actor.displayName}は　${item.name}をつかった！\nしかし　なにも　おこらなかった。`;
      }
      return;
    }
    this.message = `${actor.displayName}は　${item.name}をつかった！`;
  }

  private enemyAttack(): void {
    const actions = this.enemy.enemyActions ?? [NORMAL_ATTACK];
    let action = actions[this.enemyActionIndex % actions.length] ?? NORMAL_ATTACK;
    this.enemyActionIndex += 1;
    if (action.kind !== "attack" && this.enemy.mp < action.mpCost) action = NORMAL_ATTACK;
    const target = this.pickEnemyTarget();
    this.performAction(this.enemy, target, action);
    this.state = this.isPartyWiped() ? "DEFEAT" : "ENEMY_ACTION";
    if (target.hp <= 0) this.message += `\n${target.displayName}は　たおれた…`;
  }

  private applyEndOfRoundPoison(): void {
    for (const member of [...this.party, this.enemy]) {
      if (member.hp <= 0 || !member.status.poisoned || member.statusResistance?.poison) continue;
      const damage = calculatePoisonDamage(member.maxHp);
      member.hp = Math.max(0, member.hp - damage);
    }
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

  /** だいヒット/とくだいヒットの判定。とくだいヒットは`canUseTokudaiHit`を持つ戦闘者専用で、だいヒットの名称変更ではない。 */
  private rollHitTier(caster: BattleCombatant): "tokudai" | "dai" | "normal" {
    if (caster.canUseTokudaiHit && this.random() < TOKUDAI_HIT_RATE) return "tokudai";
    if (this.random() < DAI_HIT_RATE) return "dai";
    return "normal";
  }

  private performAction(caster: BattleCombatant, target: BattleCombatant, action: BattleAction): boolean {
    if (action.kind === "attack") {
      const weapon = caster.weaponAction;
      const hits = Math.max(1, weapon?.hitCount ?? 1);
      const pierce = Math.min(1, Math.max(0, weapon?.defensePierce ?? 0));
      const hitTier = this.rollHitTier(caster);
      const multiplier = hitTier === "tokudai" ? TOKUDAI_HIT_MULTIPLIER : hitTier === "dai" ? DAI_HIT_MULTIPLIER : 1;
      let totalDamage = 0;
      for (let hit = 0; hit < hits && target.hp > 0; hit += 1) {
        const effectiveDefense = Math.round(target.defense * (1 - pierce));
        const damage = Math.max(1, Math.round(calculateDamage(caster, { defense: effectiveDefense }) * multiplier));
        target.hp = Math.max(0, target.hp - damage);
        totalDamage += damage;
      }
      let statusNote = "";
      if (weapon?.statusEffect === "poison" && !target.statusResistance?.poison && this.random() < (weapon.applyChance ?? 0)) {
        target.status.poisoned = true;
        statusNote = `\n${target.displayName}は　どくを　あびた！`;
      }
      const hitNote = hits > 1 ? `(${hits}れんげき)` : "";
      const tierNote = hitTier === "tokudai" ? "\nとくだいヒット！！" : hitTier === "dai" ? "\nだいヒット！" : "";
      this.message = `${caster.displayName}の　こうげき${hitNote}！${tierNote}\n${target.displayName}に　${totalDamage}のダメージ！${statusNote}`;
      return true;
    }
    if (caster.mp < action.mpCost) { this.message = "MPが　たりない！"; return false; }
    caster.mp -= action.mpCost;
    if (action.kind === "mirror") {
      caster.status.mirror = action.charges;
      this.message = `${caster.displayName}は　${action.name}をつかった！\nひかりのかがみが　あらわれた。`;
      return true;
    }
    if (action.kind === "heal") {
      const healed = Math.min(action.power, target.maxHp - target.hp);
      target.hp += healed;
      this.message = `${caster.displayName}の　${action.name}！\n${target.displayName}の　HPが　${healed}かいふくした！`;
      return true;
    }
    if (action.kind === "revive") {
      const amount = Math.min(target.maxHp, Math.round(target.maxHp * action.reviveHpPercent));
      target.hp = amount;
      this.message = `${caster.displayName}の　${action.name}！\n${target.displayName}が　いきかえった！`;
      return true;
    }
    if (action.kind === "buff") {
      if (action.stat === "speed") target.speed = (target.speed ?? 0) + action.amount;
      if (action.stat === "defense") target.defense += action.amount;
      this.message = `${caster.displayName}の　${action.name}！\n${target.displayName}は　つよく　なった！`;
      return true;
    }
    if (action.kind === "debuff") {
      target.attack = Math.max(1, target.attack - action.amount);
      this.message = `${caster.displayName}の　${action.name}！\n${target.displayName}は　よわく　なった！`;
      return true;
    }
    const result = resolveMagicDamage(caster, target, action.power, action.reflectable);
    const recipient = result.reflected ? caster : target;
    this.message = `${caster.displayName}の　${action.name}！\n${result.reflected ? "ミラーが　まほうをはねかえした！\n" : ""}${recipient.displayName}に　${result.damage}のダメージ！`;
    return true;
  }
}
