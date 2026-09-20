import type { DialogueAfterEvent } from "../events/BattleEventData.ts";
import { partySystem } from "../systems/PartySystem.ts";
import type { PartySystem } from "../systems/PartySystem.ts";

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
  // DEV_PLACEHOLDER_DIALOGUE: No.05レインランドじょうの通り抜け確認用の仮台詞。正式台詞ではない。
  // docs/NPC/04_rainland_castle.md §4・§6のとおり、ミレイの正体・王家の事情には触れず、世界観を壊さない一般的な内容だけにする。
  rainland_castle_gate_soldier: { id: "rainland_castle_gate_soldier", pages: ["ここは　レインランドじょうだ。"] },
  rainland_castle_hall_soldier: { id: "rainland_castle_hall_soldier", pages: ["しろのなかでは　しずかに　たのむぞ。"] },
  rainland_castle_throne_guard: { id: "rainland_castle_throne_guard", pages: ["この　さきは　おうの　まだ。", "いまは　はいれない。"] },
  rainland_castle_servant: { id: "rainland_castle_servant", pages: ["きょうも　しろは　いそがしいですね。"] },
  rainland_castle_resident: { id: "rainland_castle_resident", pages: ["このしろは　ずっと　むかしから\nレインランドを　みまもっているそうです。"] },
  // 動的な加入分岐は getDialogue で解決する。ここにはNPC定義の参照整合性用の既定形を置く。
  dev_party_join_tarosa: { id: "dev_party_join_tarosa", pages: ["たびを　するなら\nこのおとこも\nつれていくと　いい。"] },
  dev_party_join_mirei: { id: "dev_party_join_mirei", pages: ["まずは\nあっちの　おとこに\nはなしてみると　いい。"] },
};

/** DEV加入NPCだけは現在のPartySystemを見て、安全に会話と加入イベントを分岐する。 */
export function getDialogue(
  dialogueId: string,
  party: Pick<PartySystem, "hasMember"> = partySystem,
): Dialogue | undefined {
  if (dialogueId === "dev_party_join_tarosa") {
    if (party.hasMember("tarosa")) {
      return { id: dialogueId, pages: ["タロサと　いっしょなら\nこころづよいな。"] };
    }
    return {
      id: dialogueId,
      pages: ["たびを　するなら\nこのおとこも\nつれていくと　いい。", "タロサが\nなかまに　なった！"],
      afterDialogue: { type: "party-join", eventId: "DEV_PARTY_JOIN_TAROSA", memberId: "tarosa" },
    };
  }
  if (dialogueId === "dev_party_join_mirei") {
    if (!party.hasMember("tarosa")) {
      return { id: dialogueId, pages: ["まずは\nあっちの　おとこに\nはなしてみると　いい。"] };
    }
    if (party.hasMember("mirei")) {
      return { id: dialogueId, pages: ["これで　みんな\nいっしょに　たびが　できるな。"] };
    }
    return {
      id: dialogueId,
      pages: ["もうひとり\nたびの　なかまを\nよんでおいたぞ。", "ミレイが\nなかまに　なった！"],
      afterDialogue: { type: "party-join", eventId: "DEV_PARTY_JOIN_MIREI", memberId: "mirei" },
    };
  }
  return DIALOGUES[dialogueId];
}
