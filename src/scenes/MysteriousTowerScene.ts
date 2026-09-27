import { RainlandImageMapScene } from "./RainlandForestScene.ts";
import type { RainlandMapPackage } from "./RainlandForestScene.ts";

const MYSTERIOUS_TOWER_EXTERIOR: RainlandMapPackage = {
  mapId: "map_mysterious_tower_exterior",
  keyPrefix: "image-map.mysterious-tower-exterior",
  label: "不思議なとう（塔の外）",
  defaultSpawnId: "fromWorldMap",
  manifestPath: new URL("../../assets/maps/mysterious_tower_exterior/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/mysterious_tower_exterior/background_tower_level_1.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/mysterious_tower_exterior/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/mysterious_tower_exterior/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/mysterious_tower_exterior/objects.json", import.meta.url).toString(),
  firstEntryGlitch: {
    entryFlag: "event.mysterious_tower_first_entry_seen",
    discoveryFlag: "story.mysterious_tower_discovered",
  },
};

const MYSTERIOUS_TOWER_1F: RainlandMapPackage = {
  mapId: "map_mysterious_tower_1f",
  keyPrefix: "image-map.mysterious-tower-1f",
  label: "不思議なとう（1F）",
  defaultSpawnId: "fromExterior",
  manifestPath: new URL("../../assets/maps/mysterious_tower_1f/map.json", import.meta.url).toString(),
  backgroundPath: new URL("../../assets/maps/mysterious_tower_1f/background.png", import.meta.url).toString(),
  collisionPath: new URL("../../assets/maps/mysterious_tower_1f/collision.png", import.meta.url).toString(),
  eventsPath: new URL("../../assets/maps/mysterious_tower_1f/events.json", import.meta.url).toString(),
  objectsPath: new URL("../../assets/maps/mysterious_tower_1f/objects.json", import.meta.url).toString(),
};

/**
 * Optional special field. The exterior starts with one ancient stone tower and
 * retains open plots for later construction. It has no formal No.01–20 route
 * number or encounter table; its sole fixed NPC explains the lot's intended use.
 */
export class MysteriousTowerExteriorScene extends RainlandImageMapScene {
  constructor() {
    super("MysteriousTowerExteriorScene", MYSTERIOUS_TOWER_EXTERIOR);
  }
}

/** The initial small, empty interior. The OBJECT layer owns the future tower core. */
export class MysteriousTower1FScene extends RainlandImageMapScene {
  constructor() {
    super("MysteriousTower1FScene", MYSTERIOUS_TOWER_1F);
  }
}
