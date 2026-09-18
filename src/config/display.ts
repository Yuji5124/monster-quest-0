// TEMP_TEST_VALUE: 起動確認用。正式な最終解像度・拡大方式はUI_INPUT_SPECのTBD。
// 320×240を旧暫定基準(logical reference)とし、SCALE_FACTOR倍した960×720を現在の内部解像度とする。
// 4:3のアスペクト比はBASE/RENDERとも共通のため、既存の座標・サイズはSCALE_FACTOR倍で移行できる。
export const BASE_WIDTH = 320;
export const BASE_HEIGHT = 240;
export const SCALE_FACTOR = 3;

export const DISPLAY = {
  width: BASE_WIDTH * SCALE_FACTOR, // 960
  height: BASE_HEIGHT * SCALE_FACTOR, // 720
  backgroundColor: "#101018",
} as const;
