import type { DevBattleMonsterId } from "../config/battle.ts";
import { DEV_BOSS_TEST_PLAYER } from "../config/battle.ts";
import type { BattleCombatantDefinition } from "../battle/BattleSystem.ts";
import { DEV_DAIDAIN, DEV_MIRROR, NORMAL_ATTACK } from "./battleActions.ts";
import type { BattleAction } from "./battleActions.ts";

export interface DevBattleMonsterDefinition {
  readonly id: DevBattleMonsterId;
  /** The source files do not establish a CURRENT formal name. */
  readonly displayName: string;
  readonly portraitUrl: string;
  readonly portraitFormat: "png" | "jpeg";
  /** DEV_BATTLE_BALANCE only; never a final MQ0 value. */
  readonly maxHp: number;
  readonly attack: number;
  readonly defense: number;
  readonly maxMp?: number;
  readonly isBoss?: boolean;
  readonly enemyActions?: readonly BattleAction[];
  readonly display?: { readonly scale: number; readonly offsetY: number };
  readonly background?: { readonly key: string; readonly url: string };
  readonly devPlayer?: BattleCombatantDefinition;
}

// Direct Vite URLs retain the source files and avoid an unnecessary runtime copy.
export const DEV_BATTLE_MONSTERS: Record<DevBattleMonsterId, DevBattleMonsterDefinition> = {
  "003": {
    id: "003",
    displayName: "MONSTER 003",
    portraitUrl: new URL("../../assets/monsters/source/portraits/mq0_monster_003_1e2e150bba.png", import.meta.url).href,
    portraitFormat: "png",
    maxHp: 15,
    attack: 5,
    defense: 2,
  },
  "006": {
    id: "006",
    displayName: "MONSTER 006",
    portraitUrl: new URL("../../assets/monsters/source/portraits/mq0_monster_006_7c8f45a8e1.jpeg", import.meta.url).href,
    portraitFormat: "jpeg",
    maxHp: 24,
    attack: 6,
    defense: 3,
  },
  demas: {
    id: "demas",
    displayName: "デーマス",
    // Verified against named card_125 / promo_019; use the standalone transparent portrait.
    portraitUrl: new URL("../../assets/monsters/source/portraits/mq0_monster_030_54c4041dec.png", import.meta.url).href,
    portraitFormat: "png",
    isBoss: true,
    // TEMP_TEST_VALUE / DEV_BATTLE_BALANCE, not the source card's 1000/500/300.
    maxHp: 360, maxMp: 60, attack: 42, defense: 12,
    enemyActions: [NORMAL_ATTACK, DEV_MIRROR, DEV_DAIDAIN],
    display: { scale: 1.7, offsetY: 0 },
    background: {
      key: "battle.bg.demas_test",
      url: new URL("../../assets/battle/backgrounds/reference/mq0_battle_bg_008_c44a414baf.png", import.meta.url).href,
    },
    devPlayer: { ...DEV_BOSS_TEST_PLAYER, learnedMagic: [DEV_MIRROR] },
  },
};

export function getDevBattleMonster(id: string | null): DevBattleMonsterDefinition | undefined {
  return id && Object.hasOwn(DEV_BATTLE_MONSTERS, id)
    ? DEV_BATTLE_MONSTERS[id as DevBattleMonsterId]
    : undefined;
}
