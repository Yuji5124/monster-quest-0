import type Phaser from "phaser";
import type { TiledTilesetDef } from "../config/no01TiledMap.ts";

/**
 * legacy No.01 Tiledマップの読み込み・レイヤー生成・Collision・Events検出を共通化する薄いヘルパー。
 * MapTestNo01Scene(DEV)とLegacyTiledStartingPlaceSceneだけが使う。通常のStartingPlaceSceneは
 * 背景画像マップ方式であり、このRuntimeを使用しない。
 */

export interface TiledMapDef {
  readonly tilemapKey: string;
  readonly tilemapPath: string;
  readonly tilesets: readonly TiledTilesetDef[];
  readonly visibleLayerNames: readonly string[];
  readonly collisionLayerName: string;
  readonly eventsLayerName: string;
  readonly collisionMarkerLabel: string;
}

export function preloadTiledMap(scene: Phaser.Scene, def: TiledMapDef): void {
  scene.load.tilemapTiledJSON(def.tilemapKey, def.tilemapPath);
  for (const tileset of def.tilesets) {
    scene.load.image(tileset.key, tileset.url);
  }
}

export interface TiledMapRuntime {
  readonly map: Phaser.Tilemaps.Tilemap;
  readonly tilesets: Phaser.Tilemaps.Tileset[];
  readonly collisionLayer: Phaser.Tilemaps.TilemapLayer;
  readonly eventsLayer: Phaser.Tilemaps.ObjectLayer;
}

/**
 * tilemap構築 -> tileset結合 -> Ground/Terrain/Buildings描画 -> Collision Layer(判定専用、
 * collisionDebugの時だけ可視化) -> world bounds設定、までを行う。Reference Layerは
 * (imageが未設定のため)意図的に一切createしない。
 */
export function createTiledMap(scene: Phaser.Scene, def: TiledMapDef, options: { collisionDebug: boolean }): TiledMapRuntime {
  const map = scene.make.tilemap({ key: def.tilemapKey });

  const tilesets = def.tilesets.map((tilesetDef) => {
    const tileset = map.addTilesetImage(tilesetDef.name, tilesetDef.key);
    if (!tileset) throw new Error(`TiledMapRuntime: failed to bind tileset "${tilesetDef.name}" (key "${tilesetDef.key}")`);
    return tileset;
  });

  for (const name of def.visibleLayerNames) {
    const layer = map.createLayer(name, tilesets, 0, 0);
    if (!layer) throw new Error(`TiledMapRuntime: missing tile layer "${name}"`);
  }

  const collisionLayer = map.createLayer(def.collisionLayerName, tilesets, 0, 0);
  if (!collisionLayer) throw new Error(`TiledMapRuntime: missing tile layer "${def.collisionLayerName}"`);
  collisionLayer.setVisible(options.collisionDebug);

  // setCollisionByExclusion([0])は使わない: Phaserは空セルを内部でindex=-1として扱うため
  // (Tiledの空GID=0そのものではない)、0だけを除外すると空セルまで巻き込まれて
  // 全面Collision化してしまう(実際に検証中に発覚したバグ)。既存Collision Layerの意味を
  // 勝手に再解釈せず、mq0Labelからタイルset定義上のGIDを動的に求めて名指しする。
  const solidMarkerGid = findGidByLabel(tilesets, def.collisionMarkerLabel);
  if (solidMarkerGid === null) throw new Error(`TiledMapRuntime: "${def.collisionMarkerLabel}" tile not found in any tileset`);
  collisionLayer.setCollision(solidMarkerGid);

  scene.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

  const eventsLayer = map.getObjectLayer(def.eventsLayerName);
  if (!eventsLayer) throw new Error(`TiledMapRuntime: missing object layer "${def.eventsLayerName}"`);

  return { map, tilesets, collisionLayer, eventsLayer };
}

/** Events Object Layerからtype==="playerSpawn"を探し、矩形の中心座標を返す。 */
export function findPlayerSpawn(eventsLayer: Phaser.Tilemaps.ObjectLayer): { x: number; y: number; object: Phaser.Types.Tilemaps.TiledObject } {
  const spawnObject = eventsLayer.objects.find((obj) => obj.type === "playerSpawn");
  if (!spawnObject) throw new Error('TiledMapRuntime: no "playerSpawn" object found in Events layer');
  const x = (spawnObject.x ?? 0) + (spawnObject.width ?? 0) / 2;
  const y = (spawnObject.y ?? 0) + (spawnObject.height ?? 0) / 2;
  return { x, y, object: spawnObject };
}

/** TiledのObject Properties(name/type/value配列)を "key=value" のCSV文字列にする。 */
export function formatTiledProperties(obj: Phaser.Types.Tilemaps.TiledObject): string {
  const props = obj.properties as Array<{ name: string; value: unknown }> | undefined;
  if (!Array.isArray(props) || props.length === 0) return "";
  return props.map((p) => `${p.name}=${JSON.stringify(p.value)}`).join(", ");
}

/** 複数tileset中からmq0Label(properties)が一致する最初のタイルのGIDを探す。 */
export function findGidByLabel(tilesets: readonly Phaser.Tilemaps.Tileset[], label: string): number | null {
  for (const tileset of tilesets) {
    const tileProperties = tileset.tileProperties as Record<number, { mq0Label?: string }> | undefined;
    if (!tileProperties) continue;
    for (const [localIdStr, props] of Object.entries(tileProperties)) {
      if (props.mq0Label === label) return tileset.firstgid + Number(localIdStr);
    }
  }
  return null;
}

export interface TiledEventZone {
  readonly name: string;
  readonly label: string;
  readonly body: Phaser.Physics.Arcade.StaticBody;
  inside: boolean;
}

/** Events Layerの指定type群からexit/eventゾーンを作る(createExitZoneは既存MapTransition.tsのものを使う)。 */
export function createTiledEventZones(
  eventsLayer: Phaser.Tilemaps.ObjectLayer,
  types: readonly string[],
  createZoneBody: (bounds: { x: number; y: number; width: number; height: number }) => Phaser.Physics.Arcade.StaticBody,
): TiledEventZone[] {
  const zones: TiledEventZone[] = [];
  for (const obj of eventsLayer.objects) {
    if (!types.includes(obj.type)) continue;
    if (obj.x === undefined || obj.y === undefined || obj.width === undefined || obj.height === undefined) continue;
    const body = createZoneBody({ x: obj.x, y: obj.y, width: obj.width, height: obj.height });
    const propsText = formatTiledProperties(obj);
    zones.push({ name: obj.name, label: propsText ? `${obj.name} (${propsText})` : obj.name, body, inside: false });
  }
  return zones;
}

/** 毎フレーム呼ぶ。ゾーンへ進入した瞬間だけonEnterを呼ぶ(重複フレームでの連続発火を避ける)。 */
export function updateTiledEventZones(
  scene: Phaser.Scene,
  zones: readonly TiledEventZone[],
  playerBody: Phaser.Physics.Arcade.Body,
  onEnter: (zone: TiledEventZone) => void,
): void {
  for (const zone of zones) {
    const overlapping = scene.physics.world.overlap(playerBody, zone.body);
    if (overlapping && !zone.inside) {
      zone.inside = true;
      onEnter(zone);
    } else if (!overlapping && zone.inside) {
      zone.inside = false;
    }
  }
}
