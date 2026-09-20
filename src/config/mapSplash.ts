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
  map_rainland_castle_town: {
    imageUrl: new URL("../../assets/maps/rainland_castle_town/entry_splash.png", import.meta.url).toString(),
    fadeInMs: 1000,
    holdMs: 3000,
    fadeOutMs: 1000,
    spawnIds: ["fromWorldMap"],
    caption: "レインランドじょうかまち",
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
