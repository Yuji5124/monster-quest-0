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
  // No.02: each resident is data-driven from MAPS.map_02_starting_town.  Keep
  // their first-pass lines short and local; prices and shop UI remain TBD.
  npc_start_town_item_shopkeeper: { id: "npc_start_town_item_shopkeeper", pages: ["どうぐが　ひつようなら\nこえを　かけてくれ。"] },
  npc_start_town_weapon_shopkeeper: { id: "npc_start_town_weapon_shopkeeper", pages: ["ぶきは　ていれが\nだいじだぞ。"] },
  npc_start_town_house_a_shopkeeper: { id: "npc_start_town_house_a_shopkeeper", pages: ["きょうも　みせを\nあけているよ。"] },
  npc_start_town_inn_shopkeeper: { id: "npc_start_town_inn_shopkeeper", pages: ["たびの　つかれは\nここで　やすめ。"] },
  npc_start_town_church_walker: { id: "npc_start_town_church_walker", pages: ["まちの　そとは\nきょうも　にぎやかだね。"] },
  npc_start_town_plaza_walker: { id: "npc_start_town_plaza_walker", pages: ["ふんすいの　みずは\nいつも　つめたいよ。"] },
  npc_start_town_south_walker: { id: "npc_start_town_south_walker", pages: ["みなみの　みちを\nまっすぐ　いくのが　すきなんだ。"] },
  // No.10かくれざと: source folder has no dialogue manuscript. These first-pass local lines follow NPC_SPEC.md:
  // the village's closed atmosphere is implied through daily life, and neither Mirei's identity nor later events are disclosed.
  npc_hidden_village_shrine_keeper: { id: "npc_hidden_village_shrine_keeper", pages: ["ここでは　あさに\nみずの　おとを　きくんだ。"] },
  npc_hidden_village_west_householder: { id: "npc_hidden_village_west_householder", pages: ["はなの　みずやりは\nたきの　そばが　いちばんさ。"] },
  npc_hidden_village_central_householder: { id: "npc_hidden_village_central_householder", pages: ["ほそい　みちでも\nみんなで　たすけあってる。"] },
  npc_hidden_village_east_householder: { id: "npc_hidden_village_east_householder", pages: ["あめのひの　はしは\nあしもとに　きをつけて。"] },
  npc_hidden_village_lower_householder: { id: "npc_hidden_village_lower_householder", pages: ["やまの　しずけさは\nよるに　いちばん　よくわかる。"] },
  npc_hidden_village_watermill_keeper: { id: "npc_hidden_village_watermill_keeper", pages: ["みずぐるまが　まわると\nこむぎの　かおりが　する。"] },
  npc_hidden_village_plaza_walker: { id: "npc_hidden_village_plaza_walker", pages: ["たきの　おとは\nよるでも　やまないんだ。"] },
  npc_hidden_village_garden_walker: { id: "npc_hidden_village_garden_walker", pages: ["はしの　むこうには\nはなが　たくさん　さいてるよ。"] },
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
      returnSpawnId: "fromWorldMap",
    },
  },
  // DEV_PLACEHOLDER_DIALOGUE: No.16未実装のためNo.02で確認。正式台詞・配置ではない。
  dev_demas_battle_npc: {
    id: "dev_demas_battle_npc",
    pages: ["デーマスとの　しょうぶを　ためしてみるか？"],
    afterDialogue: {
      type: "battle", eventId: "demas_battle", monsterId: "demas",
      returnSceneKey: "StartingTownScene", returnSpawnId: "fromWorldMap",
      victoryFlag: "boss.demas_defeated",
    },
  },
  // DEV_PLACEHOLDER_DIALOGUE: 正式No.06レインランドじょう（内部map_05_rainland_castle）の通り抜け確認用の仮台詞。正式台詞ではない。
  // docs/NPC/04_rainland_castle.md §4・§6のとおり、ミレイの正体・王家の事情には触れず、世界観を壊さない一般的な内容だけにする。
  rainland_castle_gate_soldier: { id: "rainland_castle_gate_soldier", pages: ["ここは　レインランドじょうだ。"] },
  rainland_castle_hall_soldier: { id: "rainland_castle_hall_soldier", pages: ["しろのなかでは　しずかに　たのむぞ。"] },
  rainland_castle_throne_guard: { id: "rainland_castle_throne_guard", pages: ["この　さきは　おうの　まだ。", "いまは　はいれない。"] },
  rainland_castle_servant: { id: "rainland_castle_servant", pages: ["きょうも　しろは　いそがしいですね。"] },
  rainland_castle_resident: { id: "rainland_castle_resident", pages: ["このしろは　ずっと　むかしから\nレインランドを　みまもっているそうです。"] },
  // DEV_PLACEHOLDER_DIALOGUE: 王の間(2026-09-23)の仮台詞。正式台詞・王への報告/依頼イベント(STORY_FLOW.md)はTBD。
  // ミレイの正体・王家の事情・まじんのどうくつの依頼内容には触れない。
  rainland_throne_king: { id: "rainland_throne_king", pages: ["[仮] よくぞ　まいった。", "[仮] わしが　レインランドの　おうじゃ。"] },
  rainland_throne_guard_west: { id: "rainland_throne_guard_west", pages: ["[仮] おうさまの　まえだ。\nれいぎを　わすれるなよ。"] },
  rainland_throne_guard_east: { id: "rainland_throne_guard_east", pages: ["[仮] おうのまを　まもるのが\nわれら　このえへいの　つとめだ。"] },
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
