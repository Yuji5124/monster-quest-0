import { MAPS } from "./maps.ts";
import type { MapId } from "./maps.ts";

/**
 * 町の入場演出。1枚絵を暗転の中でフェードイン→保持→フェードアウトし、その後ろのマップへ入る。
 * 総尺 = fadeInMs + holdMs + fadeOutMs(マップごとの指定値)。演出用の画像はマップパッケージへ無加工コピーした
 * ユーザー提供のSOURCE画像で、背景(background.png)とは別物である。
 */
export interface MapEntrySplash {
  readonly imageUrl: string;
  readonly fadeInMs: number;
  readonly holdMs: number;
  readonly fadeOutMs: number;
  /** 演出を挟むspawnId。世界地図からの入場だけにし、建物内部からの戻りなどでは再生しない。 */
  readonly spawnIds: readonly string[];
  /** 画像下部に表示する場所名。 */
  readonly caption: string;
  /** 指定がある場所だけ、地名を右下に寄せる。既存の入場演出は中央下を維持する。 */
  readonly captionPosition?: "bottom-center" | "bottom-right";
}

export const MAP_ENTRY_SPLASHES: Readonly<Partial<Record<MapId, MapEntrySplash>>> = {
  // No.02はじまりのまち。画像ははじまりのまち_イメージ.pngの無加工コピー。世界地図からの到着時だけ5秒表示する。
  map_02_starting_town: {
    imageUrl: new URL("../../assets/maps/starting_town/entry_splash.png", import.meta.url).toString(),
    fadeInMs: 1000,
    holdMs: 3000,
    fadeOutMs: 1000,
    spawnIds: ["fromWorldMap"],
    caption: "はじまりのまち",
  },
  map_rainland_castle_town: {
    imageUrl: new URL("../../assets/maps/rainland_castle_town/entry_splash.png", import.meta.url).toString(),
    fadeInMs: 1000,
    holdMs: 3000,
    fadeOutMs: 1000,
    spawnIds: ["fromWorldMap"],
    caption: "レインランドじょうかまち",
  },
  // No.04ビーエのむら(内部map_03_bie_village)。画像はビーエのむら_イメージ.pngの無加工コピー。尺はじょうかまちと同じ5秒。
  map_03_bie_village: {
    imageUrl: new URL("../../assets/maps/bie_village/entry_splash.png", import.meta.url).toString(),
    fadeInMs: 1000,
    holdMs: 3000,
    fadeOutMs: 1000,
    spawnIds: ["fromWorldMap"],
    caption: "ビーエのむら",
  },
  // No.08ザボンのむら。画像はザボンのむら_イメージ.pngの無加工コピー。尺はじょうかまちと同じ5秒。
  map_zabon_village: {
    imageUrl: new URL("../../assets/maps/zabon_village/entry_splash.png", import.meta.url).toString(),
    fadeInMs: 1000,
    holdMs: 3000,
    fadeOutMs: 1000,
    spawnIds: ["fromWorldMap"],
    caption: "ザボンのむら",
  },
  // No.12港町ダコハ。画像は港町ダコハ_イメージ.pngの無加工コピー。尺はじょうかまちと同じ5秒。
  map_dakoha_port: {
    imageUrl: new URL("../../assets/maps/dakoha_port/entry_splash.png", import.meta.url).toString(),
    fadeInMs: 1000,
    holdMs: 3000,
    fadeOutMs: 1000,
    spawnIds: ["fromWorldMap"],
    caption: "港町ダコハ",
  },
  // No.14ポサロ城。外観イラストを世界地図からの入場時だけ5秒投影し、歩行は見下ろしのボス間背景で行う。
  map_posaro_castle: {
    imageUrl: new URL("../../assets/maps/posaro_castle/entry_splash.png", import.meta.url).toString(),
    fadeInMs: 1000,
    holdMs: 3000,
    fadeOutMs: 1000,
    spawnIds: ["fromWorldMap"],
    caption: "ポサロ城",
  },
  // No.15ふっかつのほこら。画像は絵画調の外観「ふっかつのほこら.png」の無加工コピー(見下ろし図の方は歩行背景)。尺は5秒。
  map_revival_shrine: {
    imageUrl: new URL("../../assets/maps/revival_shrine/entry_splash.png", import.meta.url).toString(),
    fadeInMs: 1000,
    holdMs: 3000,
    fadeOutMs: 1000,
    spawnIds: ["fromWorldMap"],
    caption: "ふっかつのほこら",
  },
  // No.09いわやまのどうくつ(1F)。画像はいわやまのどうくつ_イメージ.pngの無加工コピー。尺はじょうかまちと同じ5秒。
  map_iwayama_cave_1: {
    imageUrl: new URL("../../assets/maps/iwayama_cave_1/entry_splash.png", import.meta.url).toString(),
    fadeInMs: 1000,
    holdMs: 3000,
    fadeOutMs: 1000,
    spawnIds: ["fromWorldMap"],
    caption: "いわやまのどうくつ",
  },
  // No.13コタンカイムの洞窟。画像はコタンカイムのどうくつ_イメージ.pngの無加工コピー。世界地図から(1)へ入るときだけ5秒表示する。
  map_kotankaim_cave_1: {
    imageUrl: new URL("../../assets/maps/kotankaim_cave_1/entry_splash.png", import.meta.url).toString(),
    fadeInMs: 1000,
    holdMs: 3000,
    fadeOutMs: 1000,
    spawnIds: ["fromWorldMap"],
    caption: "コタンカイムの洞窟",
  },
  // No.16デーマスのとう。世界地図から1Fへ入るときだけ外観を見せる。
  map_demas_tower_1: {
    imageUrl: new URL("../../assets/maps/demas_tower_1/entry_splash.png", import.meta.url).toString(),
    fadeInMs: 1000,
    holdMs: 3000,
    fadeOutMs: 1000,
    spawnIds: ["fromWorldMap"],
    caption: "デーマスのとう",
  },
  // No.18いしのまち。画像はいしのまち_イメージ.pngの無加工コピー(歩行背景は別のDEV_PLACEHOLDER)。尺はじょうかまちと同じ5秒。
  map_stone_town: {
    imageUrl: new URL("../../assets/maps/stone_town/entry_splash.png", import.meta.url).toString(),
    fadeInMs: 1000,
    holdMs: 3000,
    fadeOutMs: 1000,
    spawnIds: ["fromWorldMap"],
    caption: "いしのまち",
  },
  // No.11は画像を歩行背景にはせず、世界地図からの到着時だけ外観リファレンスを5秒表示して3Dへ入る。
  map_lake_castle_1: {
    imageUrl: new URL("../../assets/maps/reference/reference/みずうみの古城_イメージ.png", import.meta.url).toString(),
    fadeInMs: 1000,
    holdMs: 3000,
    fadeOutMs: 1000,
    spawnIds: ["fromWorldMap"],
    caption: "みずうみの古城",
  },
};

export function getEntrySplashDurationMs(splash: MapEntrySplash): number {
  return splash.fadeInMs + splash.holdMs + splash.fadeOutMs;
}

export interface ResolvedEntrySplash {
  readonly mapId: MapId;
  readonly splash: MapEntrySplash;
}

/** 遷移先のSceneとspawnIdから、挟むべき入場演出を解決する。無ければundefined。 */
export function findEntrySplash(targetSceneKey: string, spawnId: string | undefined): ResolvedEntrySplash | undefined {
  if (spawnId === undefined) return undefined;
  const entry = Object.values(MAPS).find((map) => map.sceneKey === targetSceneKey);
  if (!entry) return undefined;
  const splash = MAP_ENTRY_SPLASHES[entry.id];
  if (!splash || !splash.spawnIds.includes(spawnId)) return undefined;
  return { mapId: entry.id, splash };
}
