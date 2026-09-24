export interface WorldMapManifest {
  readonly id: string;
  readonly name: string;
  readonly type: "point-selection-world-map";
  readonly formatVersion: number;
  readonly coordinateSpace: "background-pixels";
  readonly width: number;
  readonly height: number;
  readonly background: string;
  readonly destinations: string;
  /** Stable local-map exit IDs mapped to their current point on this background. */
  readonly entryDestinationIds: Readonly<Record<string, string>>;
  /**
   * Interim stand-in for the saved flag set (DATA_CONTRACTS.md §8.1) while the SaveSystem exposes no flags.
   * Read through readInterimUnlockedFlags(); once real flags exist this value stops being progress state.
   */
  readonly developmentUnlockedFlags: readonly string[];
  readonly assetStatus: "NEEDS_REVIEW" | "CURRENT";
}

export type WorldMapImplementationStatus = "implemented" | "planned";

export interface WorldMapLabelOffset {
  /** Offset in the same source-pixel coordinate space as x/y. */
  readonly x: number;
  readonly y: number;
}

/** Fields shared by every on-disk destination definition. */
interface WorldMapDestinationBase {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  /** false omits the point entirely; true + a locked flag shows a non-interactive unknown point. */
  readonly visible: boolean;
  /** null means the location is always available; otherwise this must be a SAVE_FLAG_SPEC-compliant key. */
  readonly unlockFlag: string | null;
  /** Final source-pixel placement on the current world-map background. */
  readonly positionStatus: "FINAL_POSITION";
  /** Per-point label placement, kept in data so crowded names do not overlap. */
  readonly labelOffset: WorldMapLabelOffset;
}

/** A destination is only allowed to name a target after its local-map route is actually shipped. */
export interface ImplementedWorldMapDestinationDefinition extends WorldMapDestinationBase {
  readonly implementationStatus: "implemented";
  readonly targetMapId: string;
  readonly targetSpawnId: string;
}

/** Planned destinations are visible map geography, but deliberately have no route to a Scene. */
export interface PlannedWorldMapDestinationDefinition extends WorldMapDestinationBase {
  readonly implementationStatus: "planned";
  readonly targetMapId: null;
  readonly targetSpawnId: null;
}

export type WorldMapDestinationDefinition =
  | ImplementedWorldMapDestinationDefinition
  | PlannedWorldMapDestinationDefinition;

/** Runtime view of a visible destination after its data-defined unlock condition was evaluated. */
export type WorldMapDestination = WorldMapDestinationDefinition & {
  readonly unlocked: boolean;
  /** Locked points must not reveal their destination name before their flag is set. */
  readonly displayName: string;
};

/** Parses the world-map manifest without Phaser, so the on-disk contract stays testable. */
export function readWorldMapManifest(value: unknown): WorldMapManifest {
  const record = requireRecord(value, "world map manifest");
  const type = requireString(record, "type", "world map manifest");
  if (type !== "point-selection-world-map") throw new Error("world map manifest type must be point-selection-world-map");
  const coordinateSpace = requireString(record, "coordinateSpace", "world map manifest");
  if (coordinateSpace !== "background-pixels") throw new Error("world map manifest coordinateSpace must be background-pixels");
  const assetStatus = requireString(record, "assetStatus", "world map manifest");
  if (assetStatus !== "NEEDS_REVIEW" && assetStatus !== "CURRENT") {
    throw new Error("world map manifest assetStatus must be NEEDS_REVIEW or CURRENT");
  }
  return {
    id: requireString(record, "id", "world map manifest"),
    name: requireString(record, "name", "world map manifest"),
    type,
    formatVersion: requirePositiveInteger(record, "formatVersion", "world map manifest"),
    coordinateSpace,
    width: requirePositiveInteger(record, "width", "world map manifest"),
    height: requirePositiveInteger(record, "height", "world map manifest"),
    background: requireString(record, "background", "world map manifest"),
    destinations: requireString(record, "destinations", "world map manifest"),
    entryDestinationIds: requireEntryDestinationIds(record, "entryDestinationIds", "world map manifest"),
    developmentUnlockedFlags: requireFlagArray(record, "developmentUnlockedFlags", "world map manifest"),
    assetStatus,
  };
}

/** Reads destination points and verifies that every point stays inside the background source coordinates. */
export function readWorldMapDestinations(value: unknown, manifest: WorldMapManifest): WorldMapDestinationDefinition[] {
  const record = requireRecord(value, "world map destinations");
  const values = record.destinations;
  if (!Array.isArray(values) || values.length === 0) throw new Error("world map destinations must be a non-empty array");
  const ids = new Set<string>();
  return values.map((value, index) => {
    const item = requireRecord(value, `world map destinations[${index}]`);
    const id = requireString(item, "id", `world map destinations[${index}]`);
    if (ids.has(id)) throw new Error(`world map destination id is duplicated: ${id}`);
    ids.add(id);
    const x = requireNonNegativeNumber(item, "x", `world map destinations[${index}]`);
    const y = requireNonNegativeNumber(item, "y", `world map destinations[${index}]`);
    if (x > manifest.width || y > manifest.height) throw new Error(`world map destination ${id} is outside the background`);
    const positionStatus = requireString(item, "positionStatus", `world map destinations[${index}]`);
    if (positionStatus !== "FINAL_POSITION") {
      throw new Error("world map destination positionStatus must be FINAL_POSITION");
    }
    const finalPositionStatus: "FINAL_POSITION" = "FINAL_POSITION";
    const unlockFlag = requireOptionalFlag(item, "unlockFlag", `world map destinations[${index}]`);
    const common = {
      id,
      name: requireString(item, "name", `world map destinations[${index}]`),
      x,
      y,
      visible: requireBoolean(item, "visible", `world map destinations[${index}]`),
      unlockFlag,
      positionStatus: finalPositionStatus,
      labelOffset: requireLabelOffset(item, "labelOffset", `world map destinations[${index}]`),
    };
    const implementationStatus = requireString(item, "implementationStatus", `world map destinations[${index}]`);
    if (implementationStatus === "implemented") {
      return {
        ...common,
        implementationStatus,
        targetMapId: requireString(item, "targetMapId", `world map destinations[${index}]`),
        targetSpawnId: requireString(item, "targetSpawnId", `world map destinations[${index}]`),
      };
    }
    if (implementationStatus === "planned") {
      if (item.targetMapId !== null || item.targetSpawnId !== null) {
        throw new Error("planned world map destinations must set targetMapId and targetSpawnId to null");
      }
      return { ...common, implementationStatus, targetMapId: null, targetSpawnId: null };
    }
    throw new Error("world map destination implementationStatus must be implemented or planned");
  });
}

/**
 * Derives selectable state from saved progress. Hidden points do not enter the UI at all;
 * visible but locked points remain as `？？？` so future routes are not spoiled.
 */
export function resolveWorldMapDestinations(
  definitions: readonly WorldMapDestinationDefinition[],
  unlockedFlags: ReadonlySet<string>,
): WorldMapDestination[] {
  return definitions
    .filter((definition) => definition.visible)
    .map((definition): WorldMapDestination => {
      const unlocked = definition.unlockFlag === null || unlockedFlags.has(definition.unlockFlag);
      return {
        ...definition,
        unlocked,
        displayName: unlocked ? definition.name : "？？？",
      };
  });
}

/** The only destinations that can be selected for a Scene transition. */
export function isWorldMapDestinationTravelReady(
  destination: WorldMapDestination,
): destination is WorldMapDestination & ImplementedWorldMapDestinationDefinition {
  return destination.implementationStatus === "implemented" && destination.unlocked;
}

/**
 * The single place that stands in for "flags from the save data" until the SaveSystem provides them.
 * Replace only this function's body (and its callers' arguments) when real flags are wired in.
 */
export function readInterimUnlockedFlags(manifest: WorldMapManifest): ReadonlySet<string> {
  return new Set(manifest.developmentUnlockedFlags);
}

/** Resolves a local-map exit entry ID to the corresponding destination definition. */
export function resolveWorldMapEntryDestination(
  manifest: WorldMapManifest,
  definitions: readonly WorldMapDestinationDefinition[],
  entryId: string,
): WorldMapDestinationDefinition {
  const destinationId = manifest.entryDestinationIds[entryId];
  if (!destinationId) throw new Error(`world map entry ID is unknown: ${entryId}`);
  const destination = definitions.find((candidate) => candidate.id === destinationId);
  if (!destination) throw new Error(`world map entry ${entryId} refers to an unknown destination: ${destinationId}`);
  return destination;
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

function requireBoolean(record: Record<string, unknown>, key: string, label: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") throw new Error(`${label}.${key} must be a boolean`);
  return value;
}

function requireLabelOffset(record: Record<string, unknown>, key: string, label: string): WorldMapLabelOffset {
  const value = requireRecord(record[key], `${label}.${key}`);
  const x = requireFiniteNumber(value, "x", `${label}.${key}`);
  const y = requireFiniteNumber(value, "y", `${label}.${key}`);
  return { x, y };
}

function requireFiniteNumber(record: Record<string, unknown>, key: string, label: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label}.${key} must be a finite number`);
  return value;
}

function requireFlagArray(record: Record<string, unknown>, key: string, label: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) throw new Error(`${label}.${key} must be an array`);
  const flags = value.map((item, index) => requireFlagValue(item, `${label}.${key}[${index}]`));
  if (new Set(flags).size !== flags.length) throw new Error(`${label}.${key} must not contain duplicates`);
  return flags;
}

function requireEntryDestinationIds(record: Record<string, unknown>, key: string, label: string): Record<string, string> {
  const value = record[key];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}.${key} must be an object`);
  }
  const entries = Object.entries(value);
  if (entries.length === 0) throw new Error(`${label}.${key} must not be empty`);
  const result: Record<string, string> = {};
  for (const [entryId, destinationId] of entries) {
    if (!/^[a-z][a-z0-9_]*$/.test(entryId)) throw new Error(`${label}.${key} has an invalid entry ID: ${entryId}`);
    if (typeof destinationId !== "string" || destinationId.length === 0) {
      throw new Error(`${label}.${key}.${entryId} must be a non-empty destination ID`);
    }
    result[entryId] = destinationId;
  }
  return result;
}

function requireOptionalFlag(record: Record<string, unknown>, key: string, label: string): string | null {
  const value = record[key];
  if (value === null) return null;
  return requireFlagValue(value, `${label}.${key}`);
}

function requireFlagValue(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(value)) {
    throw new Error(`${label} must be a dot-separated lower-case save flag`);
  }
  return value;
}
