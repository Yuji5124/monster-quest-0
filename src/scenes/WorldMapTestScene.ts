import { WorldMapScene } from "./WorldMapScene.ts";
import type { WorldMapManifest } from "../systems/WorldMapData.ts";

/** DEV URL keeps optional query-flag simulation separate from the production WorldMapScene. */
export class WorldMapTestScene extends WorldMapScene {
  constructor() {
    super("WorldMapTestScene");
  }

  protected override readUnlockedFlags(manifest: WorldMapManifest): ReadonlySet<string> {
    const query = new URLSearchParams(window.location.search);
    if (!query.has("worldMapFlags")) return new Set(manifest.developmentUnlockedFlags);
    return new Set((query.get("worldMapFlags") ?? "").split(",").filter((flag) => flag.length > 0));
  }
}
