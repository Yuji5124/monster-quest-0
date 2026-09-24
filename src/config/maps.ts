import { WORLD_LOCATIONS } from "./field.ts";
import type { Facing } from "../systems/PlayerMovement.ts";
import type { VillagerSpriteId } from "./villagerSprites.ts";

// ローカルマップとlegacy徒歩Fieldの定義。地域間の正式導線はWorldMapSceneであり、
// field_starting_region は削除しないlegacy / prototypeの仮IDとして保持する。
// map_starting_forest / map_03_bie_village / map_rainland_forest_1・2 / map_rainland_castle_town /
// map_05_rainland_castle / map_08_majin_cave は旧名称・旧番号由来の内部互換ID。正式表示名・No.はPLAY_ORDER_SPEC.mdを参照する。
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
  | "map_08_majin_cave"
  | "map_zabon_village"
  | "map_hidden_village"
  | "map_rainland_throne_room"
  | "map_iwayama_cave_1"
  | "map_iwayama_cave_2";

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
  /** Optional user-supplied villager appearance. Omit only for legacy placeholder NPCs. */
  readonly spriteId?: VillagerSpriteId;
  /** Shopkeepers stay at their assigned storefront; residents can wander locally. */
  readonly role?: "shopkeeper" | "resident";
  /** Native-background-pixel wander radius and speed. The scene applies worldScale. */
  readonly movement?: {
    readonly kind: "wander";
    readonly radius: number;
    readonly speed: number;
    readonly minPauseMs: number;
    readonly maxPauseMs: number;
  };
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
      // ユーザー指定の緑ポイント: フィールド側から入る南端の道。legacy FieldSceneからも同じ位置へ戻す。
      fromField: { x: 690, y: 1030, facing: "up" },
      // ワールドマップは現在の地域間フィールド表現。No.02へ入るときは南端の到着点を共用する。
      fromWorldMap: { x: 690, y: 1030, facing: "up" },
      // 建物前のspawn。名称はno02_start_town_interiors.jsonの各interior.exit.spawnIdと合わせてある。
      // 全建物の入口が下辺(南向き)にあるため、道側(南)へ出て下向きに立つ。
      // y座標は各建物のdoor zoneの下端+Player半分の高さ(21px)+余裕を確保し、再トリガーを防ぐ。
      spawn_church_front: { x: 725, y: 215, facing: "down" },
      spawn_item_shop_front: { x: 415, y: 425, facing: "down" },
      // 判定を24×24・8pxセルへ細かくした際、旧(1025,445)は壁に1〜2px足りず体が入らなかったため、少し南西へずらした。
      spawn_weapon_shop_front: { x: 1015, y: 455, facing: "down" },
      spawn_house_a_front: { x: 435, y: 755, facing: "down" },
      spawn_inn_front: { x: 1085, y: 755, facing: "down" },
    },
    // 正式出口は assets/maps/starting_town/events.json の西端Eventで管理する。
    exits: [],
    // ユーザー指定の赤ポイント。4軒の前にいる店主は固定、それ以外は各ポイント周辺を歩く。
    // spriteIdはsrc/config/villagerSprites.tsで一元管理し、参照素材から生成したCURRENTシートを使う。
    npcs: [
      {
        id: "npc_start_town_item_shopkeeper",
        mapId: "map_02_starting_town",
        position: { x: 352, y: 402 },
        facing: "down",
        dialogueId: "npc_start_town_item_shopkeeper",
        spriteId: "villager_01",
        role: "shopkeeper",
      },
      {
        id: "npc_start_town_weapon_shopkeeper",
        mapId: "map_02_starting_town",
        position: { x: 996, y: 402 },
        facing: "down",
        dialogueId: "npc_start_town_weapon_shopkeeper",
        spriteId: "villager_03",
        role: "shopkeeper",
      },
      {
        id: "npc_start_town_house_a_shopkeeper",
        mapId: "map_02_starting_town",
        position: { x: 400, y: 762 },
        facing: "down",
        dialogueId: "npc_start_town_house_a_shopkeeper",
        spriteId: "villager_02",
        role: "shopkeeper",
      },
      {
        id: "npc_start_town_inn_shopkeeper",
        mapId: "map_02_starting_town",
        position: { x: 1030, y: 762 },
        facing: "down",
        dialogueId: "npc_start_town_inn_shopkeeper",
        spriteId: "villager_04",
        role: "shopkeeper",
      },
      {
        id: "npc_start_town_church_walker",
        mapId: "map_02_starting_town",
        // Church stairs, just below the doorway so the full feet collider is on the path.
        position: { x: 718, y: 215 },
        facing: "down",
        dialogueId: "npc_start_town_church_walker",
        spriteId: "villager_05",
        role: "resident",
        movement: { kind: "wander", radius: 16, speed: 34, minPauseMs: 700, maxPauseMs: 1800 },
      },
      {
        id: "npc_start_town_plaza_walker",
        mapId: "map_02_starting_town",
        // The red point's plaza-side path, inset from the flowerbed for a full feet collider.
        position: { x: 592, y: 506 },
        facing: "right",
        dialogueId: "npc_start_town_plaza_walker",
        spriteId: "villager_06",
        role: "resident",
        movement: { kind: "wander", radius: 16, speed: 38, minPauseMs: 600, maxPauseMs: 1600 },
      },
      {
        id: "npc_start_town_south_walker",
        mapId: "map_02_starting_town",
        position: { x: 733, y: 823 },
        facing: "up",
        dialogueId: "npc_start_town_south_walker",
        spriteId: "villager_07",
        role: "resident",
        movement: { kind: "wander", radius: 24, speed: 40, minPauseMs: 500, maxPauseMs: 1500 },
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
  // 正式No.03ビーエのもり。map_starting_forestは旧「はじまりのもり」由来の内部互換ID。
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
  // 正式No.04「ビーエのむら」。map_03_bie_villageは旧No.03由来の内部互換ID。
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
  // 正式No.06レインランドじょうかまち。座標は background.png(レインランドじょうかまち.png、1447×1087)のネイティブ背景ピクセル。
  // 世界地図から入る際は入場演出(config/mapSplash.ts)を挟む。北の城門の先は同じ正式No.06の城内(map_05_rainland_castle)。
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
      // 王の間から戻る位置。王の間の扉の前の絨毯の上、下向き。扉のEvent zone(y:136-176)と重ならない。
      fromThroneRoom: { x: 725, y: 215, facing: "down" },
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
  // 正式No.07。map_08_majin_caveは旧No.08由来の互換ID。これは唯一の明示的な32pxグリッドDungeon例外。
  // Its Scene owns a run's floor data and is entered from the point-selection WorldMapScene.
  map_08_majin_cave: {
    id: "map_08_majin_cave",
    sceneKey: "MajinCaveScene",
    spawns: {
      fromWorldMap: { x: 0, y: 0, facing: "down" },
    },
    exits: [],
    npcs: [],
    buildings: [],
  },
  // 正式No.08「ザボンのむら」。旧番号由来のmap_08_majin_cave(正式No.07)と紛らわしいためIDに番号を付けない。
  // 座標は background.png(ザボンのむら　新.png、1448×1086)のネイティブ背景ピクセル。NPCは docs/NPC_SPEC.md で構成再検討中のため未配置。
  map_zabon_village: {
    id: "map_zabon_village",
    sceneKey: "ZabonVillageScene",
    spawns: {
      // WorldMapSceneから入る正式spawn。北東の山道(北のレインランド方面から来る道)の内側、下向き。北口Event zone(y:0-24)と重ならない。
      fromWorldMap: { x: 1125, y: 72, facing: "down" },
    },
    // 正式出口は assets/maps/zabon_village/events.json の北口Event(世界地図へ)で管理する。
    // 西の吊り橋・南東の道・桟橋の先と北東のどうくつは接続先未定(TBD_REGISTRY.md)。
    exits: [],
    npcs: [],
    buildings: [],
  },
  // 正式No.10「かくれざと」。ユーザー提供背景の北西門から世界地図へ出入りする山あいの村。
  // ミレイの初登場・正式同行は本編イベントとして別途実装し、ここでは住民の生活会話だけを置く。
  map_hidden_village: {
    id: "map_hidden_village",
    sceneKey: "HiddenVillageScene",
    spawns: {
      // 北西の木門の内側。出口Event zone(y:0-48)と足元Bodyが重ならない位置。
      fromWorldMap: { x: 160, y: 80, facing: "down" },
    },
    exits: [],
    // No.02と同じ正式村人シート。家や施設の前の人は固定、広場と花畑の人だけ近傍を歩く。
    npcs: [
      { id: "npc_hidden_village_shrine_keeper", mapId: "map_hidden_village", position: { x: 724, y: 184 }, facing: "down", dialogueId: "npc_hidden_village_shrine_keeper", spriteId: "villager_08", role: "resident" },
      { id: "npc_hidden_village_west_householder", mapId: "map_hidden_village", position: { x: 176, y: 416 }, facing: "down", dialogueId: "npc_hidden_village_west_householder", spriteId: "villager_09", role: "resident" },
      { id: "npc_hidden_village_central_householder", mapId: "map_hidden_village", position: { x: 520, y: 376 }, facing: "down", dialogueId: "npc_hidden_village_central_householder", spriteId: "villager_10", role: "resident" },
      { id: "npc_hidden_village_east_householder", mapId: "map_hidden_village", position: { x: 1092, y: 376 }, facing: "down", dialogueId: "npc_hidden_village_east_householder", spriteId: "villager_01", role: "resident" },
      { id: "npc_hidden_village_lower_householder", mapId: "map_hidden_village", position: { x: 364, y: 784 }, facing: "down", dialogueId: "npc_hidden_village_lower_householder", spriteId: "villager_02", role: "resident" },
      { id: "npc_hidden_village_watermill_keeper", mapId: "map_hidden_village", position: { x: 1112, y: 784 }, facing: "down", dialogueId: "npc_hidden_village_watermill_keeper", spriteId: "villager_03", role: "resident" },
      { id: "npc_hidden_village_plaza_walker", mapId: "map_hidden_village", position: { x: 790, y: 424 }, facing: "left", dialogueId: "npc_hidden_village_plaza_walker", spriteId: "villager_05", role: "resident", movement: { kind: "wander", radius: 28, speed: 34, minPauseMs: 700, maxPauseMs: 1800 } },
      { id: "npc_hidden_village_garden_walker", mapId: "map_hidden_village", position: { x: 208, y: 456 }, facing: "left", dialogueId: "npc_hidden_village_garden_walker", spriteId: "villager_06", role: "resident", movement: { kind: "wander", radius: 24, speed: 36, minPauseMs: 600, maxPauseMs: 1600 } },
    ],
    buildings: [],
  },
  // 王の間(2026-09-23、正式No.06レインランドじょうの一部)。座標は background.png(レインランドじょう_城内2.png、1448×1086)の
  // ネイティブ背景ピクセル。王・近衛兵はDEV_PLACEHOLDER_NPC(台詞はdata/dialogues.tsの仮台詞)。正式な人数・台詞はTBD。
  map_rainland_throne_room: {
    id: "map_rainland_throne_room",
    sceneKey: "RainlandThroneRoomScene",
    spawns: {
      // 城の王の間の扉から入る位置。南の入口の内側、上向き。出口Event zone(y:1032-1056)と重ならない。
      fromCastle: { x: 725, y: 985, facing: "up" },
    },
    // 正式出口は assets/maps/rainland_throne_room/events.json の南の出口Event(城の王の間の扉の前へ)で管理する。
    exits: [],
    npcs: [
      // 王は玉座の前(玉座は通れない)。壇の上、下向き。玉座の正面(y 256前後)から話しかけられる。
      { id: "rainland_throne_king", mapId: "map_rainland_throne_room", position: { x: 728, y: 232 }, facing: "down", dialogueId: "rainland_throne_king" },
      { id: "rainland_throne_guard_west", mapId: "map_rainland_throne_room", position: { x: 616, y: 392 }, facing: "down", dialogueId: "rainland_throne_guard_west" },
      { id: "rainland_throne_guard_east", mapId: "map_rainland_throne_room", position: { x: 832, y: 392 }, facing: "down", dialogueId: "rainland_throne_guard_east" },
    ],
    buildings: [],
  },
  // 正式No.09「いわやまのどうくつ」(1F・2F)。座標は background.png(1F=いわやまのどうくつ_1.png、2F=いわやまのどうくつ_3.png、
  // どちらも1024×1536の縦長)のネイティブ背景ピクセル。_2.pngは_1.pngとバイト一致のため2フロア構成(2026-09-23ユーザー確定)。
  // 入口は世界地図からのみ(ザボンのむら北東のどうくつとは接続しない。同日ユーザー確定)。
  map_iwayama_cave_1: {
    id: "map_iwayama_cave_1",
    sceneKey: "IwayamaCave1Scene",
    spawns: {
      // WorldMapSceneから入る正式spawn。南西の暗がりから上がってくる階段の途中、上向き。入口Event zone(y:1224-1248)と重ならない。
      fromWorldMap: { x: 256, y: 1168, facing: "up" },
      // 2Fから戻る位置。北東の階段の途中、下向き。2Fへの階段Event zone(y:216-240)と重ならない。
      fromCaveFloor2: { x: 904, y: 296, facing: "down" },
      // 崩落シューティング(IwayamaShootingScene)をクリアして戻る位置。北東の階段手前、赤い丸があった場所。上向き。
      afterShooting: { x: 904, y: 470, facing: "up" },
    },
    // 正式出口は assets/maps/iwayama_cave_1/events.json の入口Event(世界地図へ)・北東の階段Event(2Fへ)で管理する。
    exits: [],
    npcs: [],
    buildings: [],
  },
  map_iwayama_cave_2: {
    id: "map_iwayama_cave_2",
    sceneKey: "IwayamaCave2Scene",
    spawns: {
      // 1Fから入る位置。背景の青い三角(到着の目印)の上、南の階段の途中、上向き。1Fへの階段Event zone(y:1224-1248)と重ならない。
      fromCaveFloor1: { x: 512, y: 1160, facing: "up" },
    },
    // 正式出口は assets/maps/iwayama_cave_2/events.json の南の階段Event(1Fへ)で管理する。
    // 北の階段の上(おく)はイベント予約地点のDEVメッセージのみ。タロサ一時参加はTBD(SPECIAL_GAMEPLAY_SPEC.md §2)。
    // 崩落シューティングは1Fの赤い丸から(IwayamaShootingScene)。
    exits: [],
    npcs: [],
    buildings: [],
  },
};

export const MAP_TRANSITION_FADE_MS = 220;

