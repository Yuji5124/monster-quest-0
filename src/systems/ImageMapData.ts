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
  /** Optional save-backed once guard. Scene-local `once` resets on re-entry; this one does not. */
  readonly consumedFlag?: string;
  readonly bounds: ImageMapBounds;
  readonly commands: readonly [ImageMapEventCommand];
}

export type ImageMapEventCommand = ImageMapMessageCommand | ImageMapTransferCommand | ImageMapWorldMapCommand;

export interface ImageMapMessageCommand {
  readonly type: "message";
  /** Brief HUD text for legacy events. */
  readonly text: string;
  /** Full dialogue pages for a story beat entered from the map. */
  readonly pages?: readonly string[];
  /** Saved only after `pages` have been read, or immediately for a HUD-only message. */
  readonly setFlags?: readonly string[];
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

interface ImageMapObjectBase {
  readonly id: string;
  readonly label: string;
  /** Native background-pixel rectangle, measured from its top-left. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly blocking: boolean;
}

/** Legacy/simple talk target. Its text remains data rather than a Scene literal. */
export interface ImageMapNpcObject extends ImageMapObjectBase {
  readonly type: "npc";
  readonly message: string;
}

/** A persistent, interactable normal chest. The opened flag is the authoritative state. */
export interface ImageMapChestObject extends ImageMapObjectBase {
  readonly type: "chest";
  /** Exactly one chest reward is present: an inventory item or Jump Coins. */
  readonly itemId?: string;
  readonly jumpCoinCount?: number;
  readonly openedFlag: string;
}

/** A field boss that starts one existing BattleScene encounter. */
export interface ImageMapBossObject extends ImageMapObjectBase {
  readonly type: "boss";
  readonly monsterId: string;
  readonly victoryFlag: string;
  /** Story/world flag set alongside victory, such as a newly available destination. */
  readonly unlockFlag: string;
}

/** A non-blocking scripted entrance point for a named existing character. */
export interface ImageMapArrivalObject extends ImageMapObjectBase {
  readonly type: "arrival";
  readonly characterId: string;
  readonly consumedFlag: string;
}

/**
 * 調べると特殊ゲームプレイSceneを始める地点(No.09いわやまのどうくつの赤い丸)。
 * `clearedFlag`が立った後は表示も判定もしない(初回のみの強制イベント)。
 */
export interface ImageMapShootingObject extends ImageMapObjectBase {
  readonly type: "shooting";
  readonly sceneKey: string;
  readonly clearedFlag: string;
}

/** A non-NPC object that opens its data-owned message when inspected. */
export interface ImageMapInteractableObject extends ImageMapObjectBase {
  readonly type: "interactable";
  readonly message: string;
  /** Temporary visual only; replacing it with a formal asset stays data-driven. */
  readonly presentation: "tower-core" | "none";
}

/**
 * A petrified person/animal painted into the BACKGROUND (No.18 いしのまち). Examining it opens `pages` (text stays data,
 * not a Scene literal). `examinedFlag` records that the statue was heard; other objects can require that flag.
 * After `changedFlag` is saved (the plaza awakening) `changedPages` replace `pages` and a faint glow marks the statue.
 * The statue's footprint is blocked by the collision mask itself, so `blocking` is normally false.
 */
export interface ImageMapStatueObject extends ImageMapObjectBase {
  readonly type: "statue";
  readonly pages: readonly string[];
  readonly examinedFlag?: string;
  readonly changedFlag?: string;
  readonly changedPages?: readonly string[];
}

/** A blocking obstacle that disappears once `openedFlag` is saved (the fallen wall across the north stairs). */
export interface ImageMapBarrierObject extends ImageMapObjectBase {
  readonly type: "barrier";
  /** Shown while the barrier still stands. */
  readonly pages: readonly string[];
  readonly openedFlag: string;
  /** Temporary code-drawn look; a formal asset replaces it without touching the data. */
  readonly presentation: "stone-rubble" | "none";
}

/**
 * The plaza's giant statue. It needs every `requiredFlags` memory echo; then it plays the awakening once
 * (glow, dust, crack, the barrier crumbles) and saves `awakenedFlag`.
 */
export interface ImageMapAwakeningObject extends ImageMapObjectBase {
  readonly type: "awakening";
  readonly requiredFlags: readonly string[];
  readonly lockedPages: readonly string[];
  readonly pages: readonly string[];
  readonly afterPages: readonly string[];
  readonly repeatPages: readonly string[];
  readonly awakenedFlag: string;
  /** Id of the `barrier` object that opens when the awakening finishes. */
  readonly opensBarrierId: string;
  /** Native background-pixel anchor of the statue's star; the glow is drawn here. */
  readonly glow: { readonly x: number; readonly y: number };
}

export type ImageMapObject =
  | ImageMapNpcObject
  | ImageMapChestObject
  | ImageMapBossObject
  | ImageMapArrivalObject
  | ImageMapShootingObject
  | ImageMapInteractableObject
  | ImageMapStatueObject
  | ImageMapBarrierObject
  | ImageMapAwakeningObject;

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
    const commandLabel = `events data events[${index}] command`;
    const parsedCommand: ImageMapEventCommand = commandType === "message"
      ? readMessageCommand(command, commandLabel)
      : commandType === "transfer"
        ? {
            type: "transfer",
            targetMapId: requireString(command, "targetMapId", commandLabel),
            targetSpawnId: requireString(command, "targetSpawnId", commandLabel),
          }
        : commandType === "world-map"
          ? {
              type: "world-map",
              worldMapEntryId: requireString(command, "worldMapEntryId", commandLabel),
            }
        : (() => {
            throw new Error("image-map event command must be message, transfer, or world-map");
          })();
    return {
      id: requireString(event, "id", `events data events[${index}]`),
      trigger,
      once: requireBoolean(event, "once", `events data events[${index}]`),
      consumedFlag: readOptionalSaveFlag(event, "consumedFlag", `events data events[${index}]`),
      bounds: readBounds(event.bounds, `events data events[${index}] bounds`),
      commands: [parsedCommand],
    };
  });
}

function readMessageCommand(command: Record<string, unknown>, label: string): ImageMapMessageCommand {
  const text = requireString(command, "text", label);
  const pages = readOptionalPages(command, "pages", label);
  return { type: "message", text, pages, setFlags: readOptionalSaveFlags(command, "setFlags", label) };
}

export function readImageMapObjects(value: unknown): ImageMapObject[] {
  const record = requireRecord(value, "objects data");
  const objects = record.objects;
  if (!Array.isArray(objects)) throw new Error("objects data objects must be an array");
  return objects.map((value, index) => {
    const object = requireRecord(value, `objects data objects[${index}]`);
    const label = `objects data objects[${index}]`;
    const type = requireString(object, "type", label);
    const common: ImageMapObjectBase = {
      id: requireString(object, "id", `objects data objects[${index}]`),
      label: requireString(object, "label", `objects data objects[${index}]`),
      x: requireNonNegativeNumber(object, "x", `objects data objects[${index}]`),
      y: requireNonNegativeNumber(object, "y", `objects data objects[${index}]`),
      width: requirePositiveInteger(object, "width", `objects data objects[${index}]`),
      height: requirePositiveInteger(object, "height", `objects data objects[${index}]`),
      blocking: requireBoolean(object, "blocking", `objects data objects[${index}]`),
    };
    if (type === "npc") return { ...common, type, message: requireString(object, "message", label) };
    if (type === "chest") {
      const itemId = object.itemId === undefined ? undefined : requireString(object, "itemId", label);
      const jumpCoinCount = object.jumpCoinCount === undefined ? undefined : requirePositiveInteger(object, "jumpCoinCount", label);
      if ((itemId === undefined) === (jumpCoinCount === undefined)) {
        throw new Error(`${label} chest must declare exactly one of itemId or jumpCoinCount`);
      }
      return {
        ...common,
        type,
        itemId,
        jumpCoinCount,
        openedFlag: requireSaveFlag(object, "openedFlag", label),
      };
    }
    if (type === "boss") {
      return {
        ...common,
        type,
        monsterId: requireString(object, "monsterId", label),
        victoryFlag: requireSaveFlag(object, "victoryFlag", label),
        unlockFlag: requireSaveFlag(object, "unlockFlag", label),
      };
    }
    if (type === "arrival") {
      return {
        ...common,
        type,
        characterId: requireString(object, "characterId", label),
        consumedFlag: requireSaveFlag(object, "consumedFlag", label),
      };
    }
    if (type === "shooting") {
      return {
        ...common,
        type,
        sceneKey: requireString(object, "sceneKey", label),
        clearedFlag: requireSaveFlag(object, "clearedFlag", label),
      };
    }
    if (type === "interactable") {
      const presentation = requireString(object, "presentation", label);
      if (presentation !== "tower-core" && presentation !== "none") {
        throw new Error("image-map interactable presentation must be tower-core or none");
      }
      return { ...common, type, message: requireString(object, "message", label), presentation };
    }
    if (type === "statue") {
      const changedFlag = readOptionalSaveFlag(object, "changedFlag", label);
      const changedPages = readOptionalPages(object, "changedPages", label);
      if ((changedFlag === undefined) !== (changedPages === undefined)) {
        throw new Error(`${label} needs changedFlag and changedPages together`);
      }
      return {
        ...common,
        type,
        pages: requirePages(object, "pages", label),
        examinedFlag: readOptionalSaveFlag(object, "examinedFlag", label),
        changedFlag,
        changedPages,
      };
    }
    if (type === "barrier") {
      const presentation = requireString(object, "presentation", label);
      if (presentation !== "stone-rubble" && presentation !== "none") {
        throw new Error("image-map barrier presentation must be stone-rubble or none");
      }
      return { ...common, type, pages: requirePages(object, "pages", label), openedFlag: requireSaveFlag(object, "openedFlag", label), presentation };
    }
    if (type === "awakening") {
      const requiredFlags = object.requiredFlags;
      if (!Array.isArray(requiredFlags) || requiredFlags.length === 0) throw new Error(`${label}.requiredFlags must be a non-empty array`);
      const glow = requireRecord(object.glow, `${label}.glow`);
      return {
        ...common,
        type,
        requiredFlags: requiredFlags.map((flag, flagIndex) => requireSaveFlagValue(flag, `${label}.requiredFlags[${flagIndex}]`)),
        lockedPages: requirePages(object, "lockedPages", label),
        pages: requirePages(object, "pages", label),
        afterPages: requirePages(object, "afterPages", label),
        repeatPages: requirePages(object, "repeatPages", label),
        awakenedFlag: requireSaveFlag(object, "awakenedFlag", label),
        opensBarrierId: requireString(object, "opensBarrierId", label),
        glow: { x: requireNonNegativeNumber(glow, "x", `${label}.glow`), y: requireNonNegativeNumber(glow, "y", `${label}.glow`) },
      };
    }
    throw new Error("image-map object type must be npc, chest, boss, arrival, shooting, interactable, statue, barrier, or awakening");
  });
}

function requirePages(record: Record<string, unknown>, key: string, label: string): readonly string[] {
  const value = readOptionalPages(record, key, label);
  if (value === undefined) throw new Error(`${label}.${key} must be a non-empty array of non-empty strings`);
  return value;
}

function readOptionalSaveFlags(record: Record<string, unknown>, key: string, label: string): readonly string[] | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label}.${key} must be a non-empty array of save flags`);
  return value.map((flag, index) => requireSaveFlagValue(flag, `${label}.${key}[${index}]`));
}

function readOptionalPages(record: Record<string, unknown>, key: string, label: string): readonly string[] | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0 || value.some((page) => typeof page !== "string" || page.length === 0)) {
    throw new Error(`${label}.${key} must be a non-empty array of non-empty strings`);
  }
  return value as readonly string[];
}

function readOptionalSaveFlag(record: Record<string, unknown>, key: string, label: string): string | undefined {
  return record[key] === undefined ? undefined : requireSaveFlag(record, key, label);
}

function requireSaveFlagValue(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(value)) {
    throw new Error(`${label} must be a dot-separated lower-case save flag`);
  }
  return value;
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

function requireSaveFlag(record: Record<string, unknown>, key: string, label: string): string {
  const value = requireString(record, key, label);
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(value)) {
    throw new Error(`${label}.${key} must be a dot-separated lower-case save flag`);
  }
  return value;
}
