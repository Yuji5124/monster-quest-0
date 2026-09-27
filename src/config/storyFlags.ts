/**
 * コードから直接読み書きする進行フラグ名の正本(SAVE_FLAG_SPEC.md)。同義のキーを別名で増やさない。
 * マップ側(destinations.json / objects.json)が参照するキーは、それぞれのJSONとこの定数を一致させる。
 */
export const STORY_FLAGS = {
  /** No.02ぶきやの店主からビーエのもりの場所を聞いた。世界地図でビーエのもりが選べるようになる。 */
  bieForestUnlocked: "story.bie_forest_unlocked",
  /** No.04ビーエのむらで、レインランドじょうへ行くにはレインランドのもりを通ると聞いた。世界地図でレインランドのもりが選べるようになる。 */
  rainlandForestUnlocked: "story.rainland_forest_unlocked",
  /** No.05レインランドのもりの奥の木こりから、レインランドじょうへの道を聞いた。世界地図でレインランドじょうかまちが選べるようになる(ビーエのもりのボス撃破でも同じフラグが立つ)。 */
  rainlandCastleTownUnlocked: "story.rainland_castle_town_unlocked",
  /** 不思議なとうの存在が世界地図に現れた(？？？として移動可能)。初回到達で story.mysterious_tower_discovered へ進む。 */
  mysteriousTowerRevealed: "story.mysterious_tower_revealed",
  /** No.02で不思議なとうのおじいさんと話した。一度きりで、以後おじいさんは町にいない。 */
  towerElderTalked: "event.starting_town_tower_elder_talked",
  /** No.18いしのまちの入口で、石になった町の第一印象の語りを見た。一度きり。 */
  stoneTownEntered: "event.stone_town_entered",
} as const;
