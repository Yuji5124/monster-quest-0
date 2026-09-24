import { SCALE_FACTOR as S } from "./display.ts";

/**
 * DEV_BATTLE_BALANCE only.  These numbers are deliberately separate from the
 * final balance values, which remain TBD in BATTLE_SPEC.md.
 */
export const DEV_BATTLE_PLAYER = {
  id: "dev_battle_player",
  displayName: "主人公",
  maxHp: 30,
  maxMp: 0,
  attack: 8,
  defense: 3,
} as const;

// TEMP_TEST_VALUE: Lv15帯の単独確認用。正式成長・魔法習得へは書き戻さない。
export const DEV_BOSS_TEST_PLAYER = {
  ...DEV_BATTLE_PLAYER, maxHp: 180, maxMp: 32, attack: 42, defense: 18,
} as const;

export const DEV_BATTLE_COMMANDS = ["fight", "magic", "item", "flee"] as const;
export const BATTLE_COMMAND_LABELS = ["こうげき", "まほう", "どうぐ", "にげる"] as const;
export type BattleCommandId = (typeof DEV_BATTLE_COMMANDS)[number];

export const DEV_BATTLE_QUERY_PARAM = "battleTest";
export const DEV_BATTLE_EVENT_FADE_MS = 220;
/**
 * A brisk, controlled pixel-collapse from field to battle. DEV battle queries bypass it.
 * Kept short enough that routine encounters do not stall exploration.
 */
export const BATTLE_ENTRANCE_DURATION_MS = 1_300;
export const DEV_BATTLE_MONSTER_IDS = ["001", "003", "006", "demas", "obake_tsumuri", "fancy_duck", "snow_bomb", "koakuma", "erimaki_hebi", "daija"] as const;
export type DevBattleMonsterId = (typeof DEV_BATTLE_MONSTER_IDS)[number];

export function readDevBattleMonsterId(search: string): DevBattleMonsterId {
  const requested = new URLSearchParams(search).get(DEV_BATTLE_QUERY_PARAM);
  return DEV_BATTLE_MONSTER_IDS.includes(requested as DevBattleMonsterId)
    ? requested as DevBattleMonsterId
    : "003";
}

/** Layout-only DEV_BATTLE_UI values.  Enemy HP visibility is not a final UI decision. */
export const DEV_BATTLE_UI_LAYOUT = {
  enemy: { x: 160 * S, y: 105 * S, maxWidth: 84 * S, maxHeight: 66 * S },
  statusWindow: { x: 8 * S, y: 8 * S, width: 94 * S, height: 38 * S },
  commandWindow: { x: 8 * S, y: 164 * S, width: 76 * S, height: 68 * S },
  messageWindow: { x: 90 * S, y: 164 * S, width: 222 * S, height: 68 * S },
  padding: 6 * S,
  fontSize: 22 * S / 3,
  commandLineHeight: 16 * S,
} as const;

/** Current party is one member; the same row accommodates the planned three. */
export function getBattleStatusWindows(partySize: number) {
  const bounds = DEV_BATTLE_UI_LAYOUT.statusWindow;
  return Array.from({ length: partySize }, (_, index) => ({
    ...bounds, x: bounds.x + index * (bounds.width + 10 * S),
  }));
}
