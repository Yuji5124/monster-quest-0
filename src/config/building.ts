import type { BuildingKind } from "./maps.ts";

/** DEV_PLACEHOLDER_COLLISION: 建物外観の仮表示色(種別ごと)。正式マップ画像ではない。 */
export const BUILDING_COLORS: Record<BuildingKind, number> = {
  inn: 0x8a6a4a,
  item_shop: 0x4a7a6a,
  weapon_shop: 0x5a6a7a,
  church: 0xc9c2a8,
  house: 0x7a5a4a,
};

// 入口位置を示す仮マーカー色。まだ機能しない(Phase 8-Bで内部Sceneと接続する)。
export const BUILDING_DOOR_COLOR = 0x2a1c12;
