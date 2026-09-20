import { WorldMapScene } from "./WorldMapScene.ts";
import { readInterimUnlockedFlags } from "../systems/WorldMapData.ts";
import type { WorldMapManifest } from "../systems/WorldMapData.ts";

/** DEV URL keeps optional query-flag simulation separate from the production WorldMapScene. */
export class WorldMapTestScene extends WorldMapScene {
  constructor() {
    super("WorldMapTestScene");
  }

  protected override readUnlockedFlags(manifest: WorldMapManifest): ReadonlySet<string> {
    const query = new URLSearchParams(window.location.search);
    if (!query.has("worldMapFlags")) return readInterimUnlockedFlags(manifest);
    return new Set((query.get("worldMapFlags") ?? "").split(",").filter((flag) => flag.length > 0));
  }
}
