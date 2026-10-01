/**
 * コードから直接読み書きする進行フラグ名の正本(SAVE_FLAG_SPEC.md)。同義のキーを別名で増やさない。
 * マップ側(destinations.json / objects.json)が参照するキーは、それぞれのJSONとこの定数を一致させる。
 */
export const STORY_FLAGS = {
  /** No.02ぶきやの店主からビーエのもりの場所を聞いた。世界地図でビーエのもりが選べるようになる。 */
  bieForestUnlocked: "story.bie_forest_unlocked",
  /** No.03ビーエのもりから世界地図へ出た。世界地図でビーエのむらが選べるようになる。 */
  bieVillageUnlocked: "story.bie_village_unlocked",
  /** No.04ビーエのむらで、レインランドじょうへ行くにはレインランドのもりを通ると聞いた。世界地図でレインランドのもりが選べるようになる。 */
  rainlandForestUnlocked: "story.rainland_forest_unlocked",
  /** No.05レインランドのもりで人を助け、レインランドじょうへの道を聞いた。世界地図でレインランドじょうかまちが選べるようになる。 */
  rainlandCastleTownUnlocked: "story.rainland_castle_town_unlocked",
  /** No.06レインランドじょうで王と初めて話した。世界地図でNo.07まじんのどうくつが選べるようになる。 */
  majinCaveUnlocked: "story.majin_cave_unlocked",
  /** 不思議なとうの存在が世界地図に現れた(？？？として移動可能)。初回到達で story.mysterious_tower_discovered へ進む。 */
  mysteriousTowerRevealed: "story.mysterious_tower_revealed",
  /** No.02で不思議なとうのおじいさんと話した。一度きりで、以後おじいさんは町にいない。 */
  towerElderTalked: "event.starting_town_tower_elder_talked",
  /** No.18いしのまちの入口で、石になった町の第一印象の語りを見た。一度きり。 */
  stoneTownEntered: "event.stone_town_entered",
  /** No.17ぬまちのどうくつ最奥の宝箱を開けた。世界地図でNo.18いしのまちが選べるようになる。 */
  stoneTownUnlocked: "story.stone_town_unlocked",
  /** No.07まじんのどうくつの最深部でまじんを倒し、どうくつを出た(通常の脱出でもリレロープでも)。王への再報告会話を切り替える。 */
  majinCaveBossDefeated: "boss.majin_cave_boss_defeated",
  /** まじん討伐後、レインランドじょうの王へ報告する会話を最後まで読んだ。一度きり。 */
  majinCaveReportedToKing: "event.rainland_throne_majin_reported",
  /** No.08ザボンのむらで、タロサは王からの頼みをいったん断った。No.09へ向かう導線。 */
  tarosaRefusedRequest: "event.zabon_tarosa_refused",
  /** No.09で一人では進めない主人公をタロサが助け、しばらく共に進むことになった。 */
  tarosaJoinedAtIwayama: "event.iwayama_cave_tarosa_rescued",
  /** No.09いわやまのどうくつの最奥に到達した。No.10かくれざとへの導線。 */
  iwayamaCaveCleared: "story.iwayama_cave_cleared",
  /** No.10かくれざとを初めて訪れた。No.11みずうみの古城への導線。 */
  hiddenVillageVisited: "event.hidden_village_visited",
  /** No.11みずうみの古城で、ミレイ不在のまま古い文字を調べ、まほうを使える仲間が必要だと分かった。一度分かれば以後も立つ(冪等)。 */
  lakeCastleInscriptionNeedsMage: "event.lake_castle_inscription_needs_mage",
  /** No.11の1F→2F。ミレイが魔法で水流を鎮め、石段を通れるようにした。一度きり。 */
  lakeCastleStairsUnsealed: "event.lake_castle_stairs_unsealed",
  /** No.11の2Fで、ミレイと古代文字を最後まで読んだ。北の3F階段の封印判定に使う。 */
  lakeCastleAncientInscriptionRead: "event.lake_castle_ancient_inscription",
  /** No.11の3F祭壇を初めて調べた。以後は再訪会話へ切り替える。 */
  lakeCastleSanctuaryVisited: "event.lake_castle_sanctuary",
  /** No.11の3F祭壇イベントを完了した。No.12への導線だけが参照する進行フック。 */
  lakeCastleSanctuaryCleared: "story.lake_castle_sanctuary_cleared",
  /** No.10かくれざとで、ミレイが仮についてくると答えた。一度きりで、以後かくれざとに立ちんぼのミレイはいない(departedFlag)。 */
  hiddenVillageMireiJoined: "event.hidden_village_mirei_joined",
  /** No.11最奥で、ミレイが一時協力ではなく旅を続けると決めた。 */
  mireiJoinedAtLakeCastle: "event.lake_castle_mirei_joined",
  /** No.11最奥で、デーマスの存在につながる手がかりを見つけた。 */
  lakeCastleDemasClueFound: "event.lake_castle_demas_clue_found",
} as const;
