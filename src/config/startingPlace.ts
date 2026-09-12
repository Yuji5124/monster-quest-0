/** No.01 夜版の表示確認用。地形・色・位置・大きさはすべてPLACEHOLDERであり、正式マップ仕様ではない。 */
export const STARTING_PLACE_NIGHT = {
  mapNumber: "01",
  name: "はじまりのばしょ",
  timeOfDay: "night",
  assetStatus: "PLACEHOLDER",
  // 正式主人公素材・配置・台詞は未確定。下のdevPlayerSpawnは操作検証専用。
  protagonist: null,
  dialogue: null,
  // DEV_PLACEHOLDER: 焚き火の描画単位に対する相対位置。正式な初期配置ではない。
  devPlayerSpawn: { offsetX: -16, offsetY: 0, facing: "right" },
  skyColor: 0x080c18,
  groundColor: 0x101c20,
  groundTopRatio: 0.4,
  campfire: {
    xRatio: 0.5,
    yRatio: 0.65,
    // 既存内部解像度から算出する描画単位。正式タイルサイズではない。
    unitHeightRatio: 1 / 120,
    // PLACEHOLDER: 炎・薪を囲む矩形。周囲の明かりには当たり判定を付けない。
    collision: { x: -6, y: -8, width: 12, height: 14 },
    // 中心を原点に、後ろから描画する静止矩形。地面の明かり / 薪 / 炎。
    rectangles: [
      { x: -12, y: -3, width: 24, height: 10, color: 0x292922 },
      { x: -8, y: -5, width: 16, height: 14, color: 0x363025 },
      { x: -6, y: 3, width: 12, height: 2, color: 0x68402b },
      { x: -4, y: 5, width: 8, height: 1, color: 0x493027 },
      { x: -4, y: -2, width: 8, height: 5, color: 0xcb4c23 },
      { x: -2, y: -6, width: 4, height: 8, color: 0xe98a32 },
      { x: 0, y: -8, width: 1, height: 3, color: 0xe98a32 },
      { x: -1, y: -2, width: 3, height: 5, color: 0xffd477 },
    ],
  },
} as const;
