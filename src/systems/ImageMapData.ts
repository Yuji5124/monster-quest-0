export interface ImageMapManifest {
  readonly id: string;
  readonly name: string;
  readonly formatVersion: number;
  readonly coordinateSpace: "background-pixels";
  readonly width: number;
  readonly height: number;
  readonly background: string;
  readonly collision: string;
  readonly events: string;
  readonly objects: string;
  readonly collisionCellSize: number;
  readonly assetStatus: "DEV_PLACEHOLDER" | "CURRENT";
  /**
   * 実行時にBACKGROUND/COLLISION/EVENT/OBJECTをまとめて拡大する倍率。背景画像自体(background.png/
   * collision.png)はネイティブ解像度のまま変更せず、Sceneがこの倍率をPhaser表示・物理ワールド境界・
   * Collision矩形・Event/Object座標・spawn座標へ実行時に一律適用する(MAP_SYSTEM.md参照)。
   * 省略時は1(スケールなし、従来どおりネイティブ座標=ワールド座標)。
   */
  readonly worldScale: number;
}

export interface ImageMapEvent {
  readonly id: string;
  readonly trigger: "enter";
  readonly once: boolean;
  readonly bounds: ImageMapBounds;
  readonly commands: readonly [ImageMapEventCommand];
}

export type ImageMapEventCommand = ImageMapMessageCommand | ImageMapTransferCommand | ImageMapWorldMapCommand;

export interface ImageMapMessageCommand {
  readonly type: "message";
  readonly text: string;
}

export interface ImageMapTransferCommand {
  readonly type: "transfer";
  readonly targetMapId: string;
  readonly targetSpawnId: string;
}

/** Opens the point-selection world map from a local-map event. */
export interface ImageMapWorldMapCommand {
  readonly type: "world-map";
  readonly worldMapEntryId: string;
}

export interface ImageMapObject {
  readonly id: string;
  readonly type: "npc";
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly blocking: boolean;
  readonly message: string;
}

export interface ImageMapBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Any {x,y,width,height} shape (ImageMapBounds, CollisionRect, BuildingDefinition.door, ...). */
export interface RectLike {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Scales a rectangle by manifest.worldScale. Used to convert stored native background-pixel
 * rectangles into the runtime world coordinate space without rewriting the stored data (MAP_SYSTEM.md). */
export function scaleRect<T extends RectLike>(rect: T, scale: number): RectLike {
  return { x: rect.x * scale, y: rect.y * scale, width: rect.width * scale, height: rect.height * scale };
}

export function readImageMapManifest(value: unknown): ImageMapManifest {
  const record = requireRecord(value, "map manifest");
  const coordinateSpace = requireString(record, "coordinateSpace", "map manifest");
  if (coordinateSpace !== "background-pixels") throw new Error("map manifest coordinateSpace must be background-pixels");
  const assetStatus = requireString(record, "assetStatus", "map manifest");
  if (assetStatus !== "DEV_PLACEHOLDER" && assetStatus !== "CURRENT") throw new Error("map manifest has an unsupported assetStatus");
  return {
    id: requireString(record, "id", "map manifest"),
    name: requireString(record, "name", "map manifest"),
    formatVersion: requirePositiveInteger(record, "formatVersion", "map manifest"),
    coordinateSpace,
    width: requirePositiveInteger(record, "width", "map manifest"),
    height: requirePositiveInteger(record, "height", "map manifest"),
    background: requireString(record, "background", "map manifest"),
    collision: requireString(record, "collision", "map manifest"),
    events: requireString(record, "events", "map manifest"),
    objects: requireString(record, "objects", "map manifest"),
    collisionCellSize: requirePositiveInteger(record, "collisionCellSize", "map manifest"),
    assetStatus,
    worldScale: readOptionalPositiveNumber(record, "worldScale", "map manifest") ?? 1,
  };
}

export function readImageMapEvents(value: unknown): ImageMapEvent[] {
  const record = requireRecord(value, "events data");
  const events = record.events;
  if (!Array.isArray(events)) throw new Error("events data events must be an array");
  return events.map((value, index) => {
    const event = requireRecord(value, `events data events[${index}]`);
    const trigger = requireString(event, "trigger", `events data events[${index}]`);
    if (trigger !== "enter") throw new Error("image-map event trigger must be enter");
    const commands = event.commands;
    if (!Array.isArray(commands) || commands.length !== 1) throw new Error("image-map event needs exactly one command");
    const command = requireRecord(commands[0], `events data events[${index}] command`);
    const commandType = requireString(command, "type", `events data events[${index}] command`);
    const parsedCommand: ImageMapEventCommand = commandType === "message"
      ? { type: "message", text: requireString(command, "text", `events data events[${index}] command`) }
      : commandType === "transfer"
        ? {
            type: "transfer",
            targetMapId: requireString(command, "targetMapId", `events data events[${index}] command`),
            targetSpawnId: requireString(command, "targetSpawnId", `events data events[${index}] command`),
          }
        : commandType === "world-map"
          ? {
              type: "world-map",
              worldMapEntryId: requireString(command, "worldMapEntryId", `events data events[${index}] command`),
            }
        : (() => {
            throw new Error("image-map event command must be message, transfer, or world-map");
          })();
    return {
      id: requireString(event, "id", `events data events[${index}]`),
      trigger,
      once: requireBoolean(event, "once", `events data events[${index}]`),
      bounds: readBounds(event.bounds, `events data events[${index}] bounds`),
      commands: [parsedCommand],
    };
  });
}

export function readImageMapObjects(value: unknown): ImageMapObject[] {
  const record = requireRecord(value, "objects data");
  const objects = record.objects;
  if (!Array.isArray(objects)) throw new Error("objects data objects must be an array");
  return objects.map((value, index) => {
    const object = requireRecord(value, `objects data objects[${index}]`);
    if (requireString(object, "type", `objects data objects[${index}]`) !== "npc") {
      throw new Error("image-map object type must be npc");
    }
    return {
      id: requireString(object, "id", `objects data objects[${index}]`),
      type: "npc",
      label: requireString(object, "label", `objects data objects[${index}]`),
      x: requireNonNegativeNumber(object, "x", `objects data objects[${index}]`),
      y: requireNonNegativeNumber(object, "y", `objects data objects[${index}]`),
      width: requirePositiveInteger(object, "width", `objects data objects[${index}]`),
      height: requirePositiveInteger(object, "height", `objects data objects[${index}]`),
      blocking: requireBoolean(object, "blocking", `objects data objects[${index}]`),
      message: requireString(object, "message", `objects data objects[${index}]`),
    };
  });
}

function readBounds(value: unknown, label: string): ImageMapBounds {
  const record = requireRecord(value, label);
  return {
    x: requireNonNegativeNumber(record, "x", label),
    y: requireNonNegativeNumber(record, "y", label),
    width: requirePositiveInteger(record, "width", label),
    height: requirePositiveInteger(record, "height", label),
  };
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function requireString(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label}.${key} must be a non-empty string`);
  return value;
}

function requirePositiveInteger(record: Record<string, unknown>, key: string, label: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) throw new Error(`${label}.${key} must be a positive integer`);
  return value;
}

function requireNonNegativeNumber(record: Record<string, unknown>, key: string, label: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`${label}.${key} must be a non-negative number`);
  return value;
}

function readOptionalPositiveNumber(record: Record<string, unknown>, key: string, label: string): number | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw new Error(`${label}.${key} must be a positive number`);
  return value;
}

function requireBoolean(record: Record<string, unknown>, key: string, label: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") throw new Error(`${label}.${key} must be a boolean`);
  return value;
}
