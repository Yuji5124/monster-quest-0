import { WORLD_LOCATIONS } from "./field.ts";
import type { Facing } from "../systems/PlayerMovement.ts";

// ローカルマップとlegacy徒歩Fieldの定義。地域間の正式導線はWorldMapSceneであり、
// field_starting_region は削除しないlegacy / prototypeの仮IDとして保持する。
// map_starting_forest / map_rainland_forest_1・2 / map_rainland_castle_town は正式No.01〜No.20の番号を持たない追加フィールド(MAP_FLOW_SPEC.md参照)。
export type MapId =
  | "map_01_starting_place"
  | "field_starting_region"
  | "map_02_starting_town"
  | "map_starting_forest"
  | "map_03_bie_village"
  | "map_rainland_forest_1"
  | "map_rainland_forest_2"
  | "map_rainland_castle_town"
  | "map_05_rainland_castle"
  | "map_08_majin_cave_1"
  | "map_08_majin_cave_2"
  | "map_08_majin_cave_3";

export interface SpawnPoint {
  readonly x: number;
  readonly y: number;
  readonly facing: Facing;
}

interface MapExitBase {
  readonly id: string;
  readonly bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

export interface LocalMapExitTrigger extends MapExitBase {
  readonly kind: "local-map";
  readonly targetMapId: MapId;
  readonly targetSpawnId: string;
}

/** A local-map edge opens the point-selection world map; its entry point is resolved from world_map/map.json. */
export interface WorldMapExitTrigger extends MapExitBase {
  readonly kind: "world-map";
  readonly worldMapEntryId: string;
}

export type MapExitTrigger = LocalMapExitTrigger | WorldMapExitTrigger;

// Phase 7: 最低限の会話可能NPC定義。DATA_CONTRACTS.md §6 npcのid/position/dialogueIdに合わせる。
export interface NpcDefinition {
  readonly id: string;
  readonly mapId: MapId;
  readonly position: { readonly x: number; readonly y: number };
  readonly facing: Facing;
  readonly dialogueId: string;
}

// Phase 8-A: 建物は外観+Collisionのみ。内部Sceneはまだ存在しない(DEV_PLACEHOLDER_INTERIOR_PENDING)。
// interiorId は assets/maps/data/no02_start_town_interiors.json の各interiorsエントリのidと対応させ、
// Phase 8-Bで内部Sceneを接続する際の突き合わせ用に残す(今回は接続処理を実装しない)。
export type BuildingKind = "inn" | "item_shop" | "weapon_shop" | "church" | "house";

export interface BuildingDefinition {
  readonly id: string;
  readonly mapId: MapId;
  readonly name: string;
  readonly kind: BuildingKind;
  readonly interiorId: string | null;
  readonly footprint: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly door: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  // Phase 8-B: 内部から出た際に戻ってくる、このmapId上のspawnId(建物前)。
  readonly frontSpawnId: string;
}

export interface MapDefinition {
  readonly id: MapId;
  readonly sceneKey: string;
  readonly spawns: Record<string, SpawnPoint>;
  readonly exits: readonly MapExitTrigger[];
  readonly npcs: readonly NpcDefinition[];
  readonly buildings: readonly BuildingDefinition[];
}

/**
 * 2026-09-18以前のNo.01 Tiled runtime用出口定義。
 * 通常のNo.01はevents.jsonを正本とする画像マップへ移行済みのため、ここはlegacy Sceneだけが読む。
 */
export const LEGACY_TILED_NO01_EXITS: readonly MapExitTrigger[] = [
  {
    id: "toWorldMap",
    kind: "world-map",
    bounds: {
      x: 1440, y: 448,
      width: 8, height: 128,
    },
    worldMapEntryId: "from_starting_place",
  },
];

export const MAPS: Record<MapId, MapDefinition> = {
  map_01_starting_place: {
    id: "map_01_starting_place",
    sceneKey: "StartingPlaceScene",
    // 座標はassets/maps/starting_place/background.png(はじまりのばしょ_夜.png、1448×1086)のネイティブ背景ピクセル。
    spawns: {
      // 通常のオープニング後に使う開始位置。焚き火の南側の土の上で、焚き火(石の輪)を向いて目覚める。
      opening: { x: 725, y: 620, facing: "up" },
      // legacy徒歩Fieldから戻る既存spawn。FieldSceneを残すため維持する。北の石段の上端。
      fromField: { x: 700, y: 92, facing: "down" },
      // WorldMapSceneから戻る正式spawn。北の出口Event zone(y:0-55)とPlayer body(高さ28)が重ならない位置。
      fromWorldMap: { x: 700, y: 92, facing: "down" },
    },
    // 正式出口は assets/maps/starting_place/events.json の北の小道Eventで管理する。
    exits: [],
    npcs: [],
    buildings: [],
  },
  // Phase 8.5: No.01⇄No.02間を徒歩でつなぐDEV_PLACEHOLDER_FIELD。
  // 正式名称・世界地理・地形・エンカウントは未確定のため、mapIdは仮ID(field_starting_region)。
  // サイズ・地形色・障害物は src/config/field.ts に分離し、Sceneへ数値を直書きしない。
  field_starting_region: {
    id: "field_starting_region",
    sceneKey: "FieldScene",
    spawns: {
      // DEV_PLACEHOLDER_WORLD_POSITION: No.01ランドマークから離した復帰位置。
      fromStartingPlace: { ...WORLD_LOCATIONS.startingPlace.fieldSpawn, facing: WORLD_LOCATIONS.startingPlace.facing },
      // DEV_PLACEHOLDER_WORLD_POSITION: No.02ランドマークから離した復帰位置。
      fromStartingTown: { ...WORLD_LOCATIONS.startingTown.fieldSpawn, facing: WORLD_LOCATIONS.startingTown.facing },
    },
    exits: [
      {
        id: "toStartingPlace",
        kind: "local-map",
        bounds: WORLD_LOCATIONS.startingPlace.triggerBounds,
        targetMapId: WORLD_LOCATIONS.startingPlace.mapId,
        targetSpawnId: WORLD_LOCATIONS.startingPlace.targetSpawnId,
      },
      {
        id: "toStartingTown",
        kind: "local-map",
        bounds: WORLD_LOCATIONS.startingTown.triggerBounds,
        targetMapId: WORLD_LOCATIONS.startingTown.mapId,
        targetSpawnId: WORLD_LOCATIONS.startingTown.targetSpawnId,
      },
    ],
    npcs: [],
    buildings: [],
  },
  // No.02「はじまりのまち」。No.01と同じBACKGROUND/COLLISION/EVENT/OBJECT画像マップ方式へ移行。
  // assets/maps/starting_town/はじまりのまち.png(1448×1086)を実座標の正本とする。
  // reference画像には建物5棟(教会/どうぐや風の日よけ店/井戸+薪の家/普通の家/干し草の家)しか
  // 描かれていないため、正式建物数を6→5へ縮小した(民家Bを統合終了、ユーザー確認済み)。
  map_02_starting_town: {
    id: "map_02_starting_town",
    sceneKey: "StartingTownScene",
    spawns: {
      // legacy徒歩Fieldから戻る既存spawn。FieldSceneを残すため維持する(西端、fromWorldMapと同座標)。
      fromField: { x: 90, y: 575, facing: "right" },
      // WorldMapSceneから戻る正式spawn。西端の出口Event zone(x:0-35,y:535-620)から十分離す。
      fromWorldMap: { x: 90, y: 575, facing: "right" },
      // 建物前のspawn。名称はno02_start_town_interiors.jsonの各interior.exit.spawnIdと合わせてある。
      // 全建物の入口が下辺(南向き)にあるため、道側(南)へ出て下向きに立つ。
      // y座標は各建物のdoor zoneの下端+Player半分の高さ(21px)+余裕を確保し、再トリガーを防ぐ。
      spawn_church_front: { x: 725, y: 215, facing: "down" },
      spawn_item_shop_front: { x: 415, y: 425, facing: "down" },
      // 判定を24×24・8pxセルへ細かくした際、旧(1025,445)は壁に1〜2px足りず体が入らなかったため、少し南西へずらした。
      spawn_weapon_shop_front: { x: 1015, y: 455, facing: "down" },
      spawn_house_a_front: { x: 435, y: 755, facing: "down" },
      spawn_inn_front: { x: 1085, y: 755, facing: "down" },
      // DEV_BATTLE_EVENT_NPCからの復帰専用。NPCのBody・建物入口とPlayer全体が重ならない。
      spawn_battle_event_return: { x: 680, y: 750, facing: "up" },
      // DEV placement only; does not establish a No.16 tower coordinate.
      spawn_demas_battle_return: { x: 760, y: 750, facing: "up" },
    },
    // 正式出口は assets/maps/starting_town/events.json の西端Eventで管理する。
    exits: [],
    // 正式なNo.02 NPC人数・役割・台詞はNPC_SPEC.mdで再検討中のため未確定。
    // 既存DEV_PLACEHOLDER_NPCを、新しい広場(噴水中心の十字型)に合わせて再配置しただけで、
    // 正式NPCとしての新規追加・台詞創作は行っていない。
    npcs: [
      {
        id: "dev_npc_test",
        mapId: "map_02_starting_town",
        position: { x: 600, y: 800 },
        facing: "down",
        dialogueId: "dev_npc_test",
      },
      {
        id: "dev_battle_event_npc",
        mapId: "map_02_starting_town",
        position: { x: 900, y: 800 },
        facing: "down",
        dialogueId: "dev_battle_event_npc",
      },
      {
        id: "dev_demas_battle_npc", mapId: "map_02_starting_town",
        position: { x: 620, y: 480 },
        facing: "down", dialogueId: "dev_demas_battle_npc",
      },
      // DEV_PARTY_JOIN_TAROSA / DEV_PARTY_JOIN_MIREI: 正式加入イベント実装前の安全なNo.02検証用。
      {
        id: "dev_party_join_tarosa_npc", mapId: "map_02_starting_town",
        position: { x: 830, y: 480 },
        facing: "down", dialogueId: "dev_party_join_tarosa",
      },
      {
        id: "dev_party_join_mirei_npc", mapId: "map_02_starting_town",
        position: { x: 720, y: 650 },
        facing: "down", dialogueId: "dev_party_join_mirei",
      },
    ],
    // 建物5棟はreference画像(はじまりのまち.png)に実在が確認できるもののみ配置。
    // footprint/doorは背景画像を解析した実座標(DEV_PLACEHOLDER_COLLISIONではない)。
    // 壁Collisionはbackground.png由来のcollision.pngが担うため、Building entityは使用しない。
    buildings: [
      {
        id: "bld_02_church",
        mapId: "map_02_starting_town",
        name: "きょうかい",
        kind: "church",
        interiorId: "map_02_church",
        footprint: { x: 585, y: 0, width: 280, height: 185 },
        door: { x: 695, y: 155, width: 60, height: 30 },
        frontSpawnId: "spawn_church_front",
      },
      {
        id: "bld_02_item_shop",
        mapId: "map_02_starting_town",
        name: "どうぐや",
        kind: "item_shop",
        interiorId: "map_02_item_shop",
        footprint: { x: 295, y: 165, width: 260, height: 230 },
        door: { x: 365, y: 365, width: 100, height: 30 },
        frontSpawnId: "spawn_item_shop_front",
      },
      {
        id: "bld_02_weapon_shop",
        mapId: "map_02_starting_town",
        name: "ぶきや",
        kind: "weapon_shop",
        interiorId: "map_02_weapon_shop",
        footprint: { x: 875, y: 185, width: 260, height: 230 },
        door: { x: 985, y: 375, width: 80, height: 20 },
        frontSpawnId: "spawn_weapon_shop_front",
      },
      {
        id: "bld_02_house_a",
        mapId: "map_02_starting_town",
        name: "民家A",
        kind: "house",
        interiorId: "map_02_house_a",
        footprint: { x: 315, y: 505, width: 230, height: 220 },
        door: { x: 395, y: 695, width: 80, height: 30 },
        frontSpawnId: "spawn_house_a_front",
      },
      {
        id: "bld_02_inn",
        mapId: "map_02_starting_town",
        name: "やどや",
        kind: "inn",
        interiorId: "map_02_inn",
        footprint: { x: 925, y: 505, width: 240, height: 220 },
        door: { x: 1045, y: 695, width: 80, height: 30 },
        frontSpawnId: "spawn_inn_front",
      },
    ],
  },
  // はじまりのもり: No.01と同じBACKGROUND/COLLISION/EVENT/OBJECT方式の追加フィールド。
  // 正式No.01〜No.20の番号は持たず、世界地図から選べる追加ポイントとして統合する(MAP_FLOW_SPEC.md参照)。
  map_starting_forest: {
    id: "map_starting_forest",
    sceneKey: "StartingForestScene",
    spawns: {
      // WorldMapSceneから戻る正式spawn。南側の木戸(はじまりのもり.png下部の柵)の内側。
      fromWorldMap: { x: 770, y: 970, facing: "up" },
    },
    // 正式出口は assets/maps/starting_forest/events.json の北門Eventで管理する。
    exits: [],
    npcs: [],
    buildings: [],
  },
  // No.03「ビーエのむら」。No.01と同じBACKGROUND/COLLISION/EVENT/OBJECT方式を再利用する。
  // NPC・会話・木こり救出イベントはdocs/NPC/02_bie_no_mura.mdがSOURCE_DRAFT_EXISTS/REDUCINGのため未実装(follow-up)。
  map_03_bie_village: {
    id: "map_03_bie_village",
    sceneKey: "BieVillageScene",
    spawns: {
      // WorldMapSceneから戻る正式spawn。北門(唯一の出入口)を入ってすぐの位置、下向き。
      // y=150: 北門Event zone(y:0-110)とPlayer body(高さ42)が重ならないよう十分離す。
      fromWorldMap: { x: 710, y: 150, facing: "down" },
    },
    // 正式出口は assets/maps/bie_village/events.json の北門Eventで管理する。
    exits: [],
    npcs: [],
    buildings: [],
  },
  // レインランドのもり(その1・その2)。No.01と同じBACKGROUND/COLLISION/EVENT/OBJECT方式の追加フィールド。
  // 座標はそれぞれ background.png(レインランドのもり　その１/その2.png、1448×1086)のネイティブ背景ピクセル。
  // 正式名称・出現モンスター・NPC・レインランド方面との正式な接続はTBD(TBD_REGISTRY.md)。
  map_rainland_forest_1: {
    id: "map_rainland_forest_1",
    sceneKey: "RainlandForest1Scene",
    spawns: {
      // WorldMapSceneから戻る正式spawn。南の石門(トレイルの入口)の内側、上向き。出口Event zone(y:1050-1086)と重ならない。
      fromWorldMap: { x: 395, y: 960, facing: "up" },
      // その2の南口から戻る位置。北の木の階段の下、下向き。北出口Event zone(y:0-30)と重ならない。
      fromForest2: { x: 1122, y: 135, facing: "down" },
    },
    // 正式出口は assets/maps/rainland_forest_1/events.json の南口(世界地図)・北口(その2)Eventで管理する。
    exits: [],
    npcs: [],
    buildings: [],
  },
  map_rainland_forest_2: {
    id: "map_rainland_forest_2",
    sceneKey: "RainlandForest2Scene",
    spawns: {
      // その1の北口から入る位置。南の木の階段の上、上向き。出口Event zone(y:1050-1086)と重ならない。
      fromForest1: { x: 378, y: 960, facing: "up" },
    },
    // 正式出口は assets/maps/rainland_forest_2/events.json の南口(その1)Eventで管理する。
    // 北・西・東の3方向へ描かれた道は接続先未定の行き止まりとして残している。
    exits: [],
    npcs: [],
    buildings: [],
  },
  // レインランドじょうかまち。座標は background.png(レインランドじょうかまち.png、1447×1087)のネイティブ背景ピクセル。
  // 世界地図から入る際は入場演出(config/mapSplash.ts)を挟む。北の城門の先はNo.05レインランドじょう(map_05_rainland_castle)。
  // No.04レインランドのまちとの対応・正式名称・NPC・店・建物内部はTBD(TBD_REGISTRY.md)。
  map_rainland_castle_town: {
    id: "map_rainland_castle_town",
    sceneKey: "RainlandCastleTownScene",
    spawns: {
      // WorldMapSceneから入る正式spawn。南門の道の内側、上向き。南口Event zone(y:1052-1087)と重ならない。
      fromWorldMap: { x: 728, y: 985, facing: "up" },
      // レインランドじょう(No.05)から戻る位置。北の城門前の石段の上、下向き。城門Event zone(y:128-158)と重ならない。
      fromCastle: { x: 727, y: 200, facing: "down" },
    },
    // 正式出口は assets/maps/rainland_castle_town/events.json の南門Event(世界地図へ)と北の城門Event(レインランドじょうへ)で管理する。
    // 西/東の橋の先は接続先未定の行き止まりとして残している。
    exits: [],
    npcs: [],
    buildings: [],
  },
  // No.05「レインランドじょう」。通常RPG方式(画像マップ)の城内。座標は background.png(ユーザー提供の城内背景、
  // 1448×1086)のネイティブ背景ピクセル。背景を差し替えたら spawn / NPC / events.json / collision.png を測り直す。
  // 入口は「レインランドじょうかまちの北の城門 → MapId + spawnId(fromCastleTown)」だけで固定してある(世界地図には直接載せない)。
  // 将来ここだけブロック城(Voxel)Sceneへ差し替える場合は、sceneKey を差し替え先へ変え、main.tsへそのSceneを登録すればよい
  // (町の北門Event・出口Eventは変更不要)。
  map_05_rainland_castle: {
    id: "map_05_rainland_castle",
    sceneKey: "RainlandCastleScene",
    spawns: {
      // レインランドじょうかまちの北の城門から入る正式spawn。城門を入った入口ホール、上向き。城外への出口Event zone(y:1050-1086)と重ならない。
      fromCastleTown: { x: 725, y: 960, facing: "up" },
    },
    // 正式出口は assets/maps/rainland_castle/events.json の城門Event(レインランドじょうかまちの北の城門前へ)で管理する。
    exits: [],
    // DEV_PLACEHOLDER_NPC: 会話は data/dialogues.ts のDEV_PLACEHOLDER_DIALOGUE。正式な人数・役割・台詞は
    // docs/NPC/04_rainland_castle.md(NEXT_TO_DESIGN)の確定待ち。ミレイの正体に触れる台詞は置いていない。
    npcs: [
      { id: "rainland_castle_gate_soldier", mapId: "map_05_rainland_castle", position: { x: 565, y: 925 }, facing: "right", dialogueId: "rainland_castle_gate_soldier" },
      { id: "rainland_castle_hall_soldier", mapId: "map_05_rainland_castle", position: { x: 632, y: 400 }, facing: "right", dialogueId: "rainland_castle_hall_soldier" },
      { id: "rainland_castle_throne_guard", mapId: "map_05_rainland_castle", position: { x: 676, y: 190 }, facing: "right", dialogueId: "rainland_castle_throne_guard" },
      { id: "rainland_castle_servant", mapId: "map_05_rainland_castle", position: { x: 160, y: 500 }, facing: "right", dialogueId: "rainland_castle_servant" },
      { id: "rainland_castle_resident", mapId: "map_05_rainland_castle", position: { x: 1000, y: 640 }, facing: "left", dialogueId: "rainland_castle_resident" },
    ],
    buildings: [],
  },
  // No.08「まじんのどうくつ」。3枚の内部背景を順に使うコンパクトな連結ダンジョン。
  // ボス・出現モンスター・BGM・解放条件は未確定のため、今回の接続は画像マップと出入口のみ。
  map_08_majin_cave_1: {
    id: "map_08_majin_cave_1",
    sceneKey: "MajinCave1Scene",
    spawns: {
      fromWorldMap: { x: 1120, y: 900, facing: "up" },
      fromCave2: { x: 190, y: 125, facing: "down" },
    },
    exits: [],
    npcs: [],
    buildings: [],
  },
  map_08_majin_cave_2: {
    id: "map_08_majin_cave_2",
    sceneKey: "MajinCave2Scene",
    spawns: {
      fromCave1: { x: 1240, y: 880, facing: "up" },
      fromCave3: { x: 190, y: 125, facing: "down" },
    },
    exits: [],
    npcs: [],
    buildings: [],
  },
  map_08_majin_cave_3: {
    id: "map_08_majin_cave_3",
    sceneKey: "MajinCave3Scene",
    spawns: {
      fromCave2: { x: 330, y: 900, facing: "up" },
    },
    exits: [],
    npcs: [],
    buildings: [],
  },
};

export const MAP_TRANSITION_FADE_MS = 220;

