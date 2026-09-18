import type { DialogueAfterEvent } from "../events/BattleEventData.ts";

export interface Dialogue {
  readonly id: string;
  readonly pages: readonly string[];
  readonly afterDialogue?: DialogueAfterEvent;
}

// DEV_PLACEHOLDER_DIALOGUE: Phase 7の会話システム確認用。正式台詞ではなく、本編ストーリー・設定を含まない。
export const DIALOGUES: Record<string, Dialogue> = {
  dev_npc_test: {
    id: "dev_npc_test",
    pages: [
      "ここは　かいわテストです。",
      "つぎのページです。",
    ],
  },
  // DEV_PLACEHOLDER_DIALOGUE / DEV_BATTLE_EVENT: 正式台詞・シナリオではない。
  dev_battle_event_npc: {
    id: "dev_battle_event_npc",
    pages: ["しょうぶしてみるか？"],
    afterDialogue: {
      type: "battle",
      eventId: "dev_battle_event_003",
      monsterId: "003",
      returnSceneKey: "StartingTownScene",
      returnSpawnId: "spawn_battle_event_return",
    },
  },
  // DEV_PLACEHOLDER_DIALOGUE: No.16未実装のためNo.02で確認。正式台詞・配置ではない。
  dev_demas_battle_npc: {
    id: "dev_demas_battle_npc",
    pages: ["デーマスとの　しょうぶを　ためしてみるか？"],
    afterDialogue: {
      type: "battle", eventId: "demas_battle", monsterId: "demas",
      returnSceneKey: "StartingTownScene", returnSpawnId: "spawn_demas_battle_return",
      victoryFlag: "boss.demas_defeated",
    },
  },
};
