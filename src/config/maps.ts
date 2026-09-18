import { SCALE_FACTOR } from "./display.ts";
import { WORLD_LOCATIONS } from "./field.ts";
import type { Facing } from "../systems/PlayerMovement.ts";

// ローカルマップとlegacy徒歩Fieldの定義。地域間の正式導線はWorldMapSceneであり、
// field_starting_region は削除しないlegacy / prototypeの仮IDとして保持する。
export type MapId = "map_01_starting_place" | "field_starting_region" | "map_02_starting_town";

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
    spawns: {
      // 通常のオープニング後に使う画像マップ上の開始位置。
      opening: { x: 610, y: 820, facing: "up" },
      // legacy徒歩Fieldから戻る既存spawn。FieldSceneを残すため維持する。
      fromField: { x: 290 * SCALE_FACTOR, y: 165 * SCALE_FACTOR, facing: "left" },
      // WorldMapSceneから戻る正式spawn。既存の安全な位置を再利用し、入口zoneと重ならない。
      fromWorldMap: { x: 290 * SCALE_FACTOR, y: 165 * SCALE_FACTOR, facing: "left" },
    },
    // 正式出口は assets/maps/starting_place/events.json の北門Eventで管理する。
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
  map_02_starting_town: {
    id: "map_02_starting_town",
    sceneKey: "StartingTownScene",
    spawns: {
      // legacy徒歩Fieldから戻る既存spawn。FieldSceneを残すため維持する。
      fromField: { x: 40 * SCALE_FACTOR, y: 140 * SCALE_FACTOR, facing: "right" },
      // WorldMapSceneから戻る正式spawn。
      fromWorldMap: { x: 40 * SCALE_FACTOR, y: 140 * SCALE_FACTOR, facing: "right" },
      // Phase 8.6: 30×42のPlayer全体がドアに重ならない帰還位置。
      // 建物前のspawn。名称はno02_start_town_interiors.jsonの各interior.exit.spawnIdと合わせてある。
      // 上段(どうぐや/ぶきや/きょうかい)は出口が建物の下辺にあるため、道側(下)へ出て下向きに立つ。
      spawn_item_shop_front: { x: 66 * SCALE_FACTOR, y: 78 * SCALE_FACTOR, facing: "down" },
      spawn_weapon_shop_front: { x: 160 * SCALE_FACTOR, y: 78 * SCALE_FACTOR, facing: "down" },
      spawn_church_front: { x: 254 * SCALE_FACTOR, y: 78 * SCALE_FACTOR, facing: "down" },
      // 下段(やどや/民家A/民家B)は出口が建物の上辺にあるため、道側(上)へ出て上向きに立つ。
      spawn_inn_front: { x: 66 * SCALE_FACTOR, y: 162 * SCALE_FACTOR, facing: "up" },
      spawn_house_a_front: { x: 160 * SCALE_FACTOR, y: 162 * SCALE_FACTOR, facing: "up" },
      spawn_house_b_front: { x: 254 * SCALE_FACTOR, y: 162 * SCALE_FACTOR, facing: "up" },
      // DEV_BATTLE_EVENT_NPCからの復帰専用。NPCのBody・建物入口とPlayer全体が重ならない。
      spawn_battle_event_return: { x: 240 * SCALE_FACTOR, y: 140 * SCALE_FACTOR, facing: "up" },
      // DEV placement only; does not establish a No.16 tower coordinate.
      spawn_demas_battle_return: { x: 290 * SCALE_FACTOR, y: 140 * SCALE_FACTOR, facing: "up" },
    },
    exits: [
      {
        id: "toWorldMap",
        kind: "world-map",
        bounds: {
          x: 0 * SCALE_FACTOR, y: 104 * SCALE_FACTOR,
          width: 16 * SCALE_FACTOR, height: 120 * SCALE_FACTOR,
        },
        worldMapEntryId: "from_starting_town",
      },
    ],
    // 正式なNo.02 NPC人数・役割・台詞はNPC_SPEC.mdで再検討中のため未確定。
    // Phase 7のDEV_PLACEHOLDER_NPCを、Phase 8-Aの町割りに合わせて広場中央付近へ再配置しただけで、
    // 正式NPCとしての新規追加・台詞創作は行っていない。
    npcs: [
      {
        id: "dev_npc_test",
        mapId: "map_02_starting_town",
        position: { x: 190 * SCALE_FACTOR, y: 120 * SCALE_FACTOR },
        facing: "down",
        dialogueId: "dev_npc_test",
      },
      {
        id: "dev_battle_event_npc",
        mapId: "map_02_starting_town",
        position: { x: 240 * SCALE_FACTOR, y: 120 * SCALE_FACTOR },
        facing: "down",
        dialogueId: "dev_battle_event_npc",
      },
      {
        id: "dev_demas_battle_npc", mapId: "map_02_starting_town",
        position: { x: 290 * SCALE_FACTOR, y: 120 * SCALE_FACTOR },
        facing: "down", dialogueId: "dev_demas_battle_npc",
      },
    ],
    // 建物6棟は no02_start_town_interiors.json のDESIGN_DATAに存在が確認できるもののみ配置。
    // 外観の並び順・座標自体は正式仕様未確定のためDEV_PLACEHOLDER_COLLISION。
    buildings: [
      {
        id: "bld_02_item_shop",
        mapId: "map_02_starting_town",
        name: "どうぐや",
        kind: "item_shop",
        interiorId: "map_02_item_shop",
        footprint: { x: 38 * SCALE_FACTOR, y: 30 * SCALE_FACTOR, width: 56 * SCALE_FACTOR, height: 36 * SCALE_FACTOR },
        door: { x: 59 * SCALE_FACTOR, y: 60 * SCALE_FACTOR, width: 12 * SCALE_FACTOR, height: 6 * SCALE_FACTOR },
        frontSpawnId: "spawn_item_shop_front",
      },
      {
        id: "bld_02_weapon_shop",
        mapId: "map_02_starting_town",
        name: "ぶきや",
        kind: "weapon_shop",
        interiorId: "map_02_weapon_shop",
        footprint: { x: 132 * SCALE_FACTOR, y: 30 * SCALE_FACTOR, width: 56 * SCALE_FACTOR, height: 36 * SCALE_FACTOR },
        door: { x: 153 * SCALE_FACTOR, y: 60 * SCALE_FACTOR, width: 12 * SCALE_FACTOR, height: 6 * SCALE_FACTOR },
        frontSpawnId: "spawn_weapon_shop_front",
      },
      {
        id: "bld_02_church",
        mapId: "map_02_starting_town",
        name: "きょうかい",
        kind: "church",
        interiorId: "map_02_church",
        footprint: { x: 226 * SCALE_FACTOR, y: 30 * SCALE_FACTOR, width: 56 * SCALE_FACTOR, height: 36 * SCALE_FACTOR },
        door: { x: 247 * SCALE_FACTOR, y: 60 * SCALE_FACTOR, width: 12 * SCALE_FACTOR, height: 6 * SCALE_FACTOR },
        frontSpawnId: "spawn_church_front",
      },
      {
        id: "bld_02_inn",
        mapId: "map_02_starting_town",
        name: "やどや",
        kind: "inn",
        interiorId: "map_02_inn",
        footprint: { x: 38 * SCALE_FACTOR, y: 174 * SCALE_FACTOR, width: 56 * SCALE_FACTOR, height: 36 * SCALE_FACTOR },
        door: { x: 59 * SCALE_FACTOR, y: 174 * SCALE_FACTOR, width: 12 * SCALE_FACTOR, height: 6 * SCALE_FACTOR },
        frontSpawnId: "spawn_inn_front",
      },
      {
        id: "bld_02_house_a",
        mapId: "map_02_starting_town",
        name: "民家A",
        kind: "house",
        interiorId: "map_02_house_a",
        footprint: { x: 132 * SCALE_FACTOR, y: 174 * SCALE_FACTOR, width: 56 * SCALE_FACTOR, height: 36 * SCALE_FACTOR },
        door: { x: 153 * SCALE_FACTOR, y: 174 * SCALE_FACTOR, width: 12 * SCALE_FACTOR, height: 6 * SCALE_FACTOR },
        frontSpawnId: "spawn_house_a_front",
      },
      {
        id: "bld_02_house_b",
        mapId: "map_02_starting_town",
        name: "民家B",
        kind: "house",
        interiorId: "map_02_house_b",
        footprint: { x: 226 * SCALE_FACTOR, y: 174 * SCALE_FACTOR, width: 56 * SCALE_FACTOR, height: 36 * SCALE_FACTOR },
        door: { x: 247 * SCALE_FACTOR, y: 174 * SCALE_FACTOR, width: 12 * SCALE_FACTOR, height: 6 * SCALE_FACTOR },
        frontSpawnId: "spawn_house_b_front",
      },
    ],
  },
};

export const MAP_TRANSITION_FADE_MS = 220;

