import { getEquippedWeapon, getWeaponById } from "../data/weapons.ts";
import type { WeaponDefinition } from "../data/weapons.ts";
import type { ItemId } from "../data/items.ts";
import { getLevelForTotalExp } from "../data/expTable.ts";
import type { GameStateRepository } from "./GameStateRepository.ts";
import type { PartyMemberId } from "./PartySystem.ts";

/**
 * 店・やどやの売買ルール。UI(ShopWindow)から分離し、所持金・装備・所持品・HP/MPの変更を
 * GameStateRepositoryの1か所へ集める。所持金が足りない操作は何も変えない。
 */
export type InnResult = { readonly kind: "rested" } | { readonly kind: "insufficientMoney" };

export type ItemPurchaseResult = { readonly kind: "bought" } | { readonly kind: "insufficientMoney" };

export type WeaponPurchaseResult =
  | { readonly kind: "equipped"; readonly weapon: WeaponDefinition }
  | { readonly kind: "insufficientMoney" }
  | { readonly kind: "notStronger"; readonly current: WeaponDefinition }
  | { readonly kind: "unknownWeapon" };

export interface ItemReceiver {
  add(itemId: ItemId, quantity?: number): boolean;
}

export function getMoney(repository: GameStateRepository): number {
  return repository.load().player.money;
}

/** いま実際に使っている武器(買った武器とレベル基準の自動装備の強い方)。 */
export function getCurrentWeapon(repository: GameStateRepository, memberId: PartyMemberId): WeaponDefinition {
  const party = repository.load().party;
  const level = getLevelForTotalExp(party.characterProgress[memberId]?.totalExp ?? 0);
  return getEquippedWeapon(memberId, level, party.equippedWeaponIds[memberId]);
}

/** やどや: 代金を払えたら全員のHP/MP(戦闘不能も含む)を全快にする。 */
export function stayAtInn(repository: GameStateRepository, price: number): InnResult {
  if (!repository.spendMoney(price)) return { kind: "insufficientMoney" };
  repository.restorePartyVitals();
  return { kind: "rested" };
}

export function buyItem(repository: GameStateRepository, items: ItemReceiver, itemId: ItemId, price: number): ItemPurchaseResult {
  if (!repository.spendMoney(price)) return { kind: "insufficientMoney" };
  items.add(itemId, 1);
  return { kind: "bought" };
}

/**
 * ぶきや: 買った武器はその場で装備する(そうび画面は未実装)。今の武器以下の物は、
 * お金だけ減って何も変わらないため売らない。
 */
export function buyWeapon(repository: GameStateRepository, memberId: PartyMemberId, weaponId: string, price: number): WeaponPurchaseResult {
  const weapon = getWeaponById(memberId, weaponId);
  if (!weapon) return { kind: "unknownWeapon" };
  const current = getCurrentWeapon(repository, memberId);
  if (weapon.attackBonus <= current.attackBonus) return { kind: "notStronger", current };
  if (!repository.spendMoney(price)) return { kind: "insufficientMoney" };
  repository.setEquippedWeapon(memberId, weapon.id);
  return { kind: "equipped", weapon };
}
