import { SCALE_FACTOR } from "./display.ts";
import type { Facing } from "../systems/PlayerMovement.ts";

// Phase 8-B: 建物内部のDEV_PLACEHOLDER_INTERIOR。
// idはすべて assets/maps/data/no02_start_town_interiors.json の interiors[].id と同じ文字列にしており、
// このキー自体がDESIGN_DATAとの対応関係になる(JSONを実行用Tilemapとしては読み込まない)。
// 家具の種類・大まかな配置のみJSONのobjects配列を参考にし、座標は簡易矩形として独自に定める。

export interface InteriorObstacle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: number;
}

export interface InteriorDefinition {
  readonly id: string;
  readonly name: string;
  // 内部から出た際に戻るScene。現状はNo.02のみのため固定だが、将来別の町の内部が増えた時のために残す。
  readonly parentSceneKey: string;
  readonly room: { readonly width: number; readonly height: number };
  readonly floorColor: number;
  readonly wallColor: number;
  readonly furniture: readonly InteriorObstacle[];
  // 入室時の主人公の出現位置・向き(部屋のローカル座標、左上原点)。
  readonly playerSpawn: { readonly x: number; readonly y: number; readonly facing: Facing };
  // 町へ戻る出口(部屋のローカル座標、左上原点)。
  readonly exitZone: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

const COUNTER = 0x6a5a3a;
const SHELF = 0x4a3a2a;
const RACK = 0x5a5a6a;
const ALTAR = 0xc9b98a;
const PEW = 0x5a4a3a;
const BED = 0x8a4a5a;
const TABLE = 0x7a6a4a;

export const INTERIORS: Record<string, InteriorDefinition> = {
  map_02_item_shop: {
    id: "map_02_item_shop",
    name: "どうぐや",
    parentSceneKey: "StartingTownScene",
    room: { width: 100 * SCALE_FACTOR, height: 76 * SCALE_FACTOR },
    floorColor: 0x2a3a34,
    wallColor: 0x14201c,
    furniture: [
      { x: 20 * SCALE_FACTOR, y: 12 * SCALE_FACTOR, width: 60 * SCALE_FACTOR, height: 10 * SCALE_FACTOR, color: COUNTER },
      { x: 10 * SCALE_FACTOR, y: 26 * SCALE_FACTOR, width: 14 * SCALE_FACTOR, height: 20 * SCALE_FACTOR, color: SHELF },
      { x: 76 * SCALE_FACTOR, y: 26 * SCALE_FACTOR, width: 14 * SCALE_FACTOR, height: 20 * SCALE_FACTOR, color: SHELF },
    ],
    playerSpawn: { x: 50 * SCALE_FACTOR, y: 60 * SCALE_FACTOR, facing: "up" },
    exitZone: { x: 42 * SCALE_FACTOR, y: 68 * SCALE_FACTOR, width: 16 * SCALE_FACTOR, height: 8 * SCALE_FACTOR },
  },
  map_02_weapon_shop: {
    id: "map_02_weapon_shop",
    name: "ぶきや",
    parentSceneKey: "StartingTownScene",
    room: { width: 100 * SCALE_FACTOR, height: 76 * SCALE_FACTOR },
    floorColor: 0x2a2f3a,
    wallColor: 0x141820,
    furniture: [
      { x: 20 * SCALE_FACTOR, y: 12 * SCALE_FACTOR, width: 60 * SCALE_FACTOR, height: 10 * SCALE_FACTOR, color: COUNTER },
      { x: 10 * SCALE_FACTOR, y: 26 * SCALE_FACTOR, width: 14 * SCALE_FACTOR, height: 20 * SCALE_FACTOR, color: RACK },
      { x: 76 * SCALE_FACTOR, y: 26 * SCALE_FACTOR, width: 14 * SCALE_FACTOR, height: 20 * SCALE_FACTOR, color: RACK },
    ],
    playerSpawn: { x: 50 * SCALE_FACTOR, y: 60 * SCALE_FACTOR, facing: "up" },
    exitZone: { x: 42 * SCALE_FACTOR, y: 68 * SCALE_FACTOR, width: 16 * SCALE_FACTOR, height: 8 * SCALE_FACTOR },
  },
  map_02_church: {
    id: "map_02_church",
    name: "きょうかい",
    parentSceneKey: "StartingTownScene",
    room: { width: 112 * SCALE_FACTOR, height: 84 * SCALE_FACTOR },
    floorColor: 0x3a362a,
    wallColor: 0x201e16,
    furniture: [
      { x: 46 * SCALE_FACTOR, y: 10 * SCALE_FACTOR, width: 20 * SCALE_FACTOR, height: 14 * SCALE_FACTOR, color: ALTAR },
      { x: 20 * SCALE_FACTOR, y: 34 * SCALE_FACTOR, width: 24 * SCALE_FACTOR, height: 8 * SCALE_FACTOR, color: PEW },
      { x: 68 * SCALE_FACTOR, y: 34 * SCALE_FACTOR, width: 24 * SCALE_FACTOR, height: 8 * SCALE_FACTOR, color: PEW },
    ],
    playerSpawn: { x: 56 * SCALE_FACTOR, y: 66 * SCALE_FACTOR, facing: "up" },
    exitZone: { x: 48 * SCALE_FACTOR, y: 76 * SCALE_FACTOR, width: 16 * SCALE_FACTOR, height: 8 * SCALE_FACTOR },
  },
  map_02_inn: {
    id: "map_02_inn",
    name: "やどや",
    parentSceneKey: "StartingTownScene",
    room: { width: 112 * SCALE_FACTOR, height: 84 * SCALE_FACTOR },
    floorColor: 0x3a2e22,
    wallColor: 0x201810,
    furniture: [
      { x: 14 * SCALE_FACTOR, y: 10 * SCALE_FACTOR, width: 40 * SCALE_FACTOR, height: 10 * SCALE_FACTOR, color: COUNTER },
      { x: 70 * SCALE_FACTOR, y: 10 * SCALE_FACTOR, width: 14 * SCALE_FACTOR, height: 18 * SCALE_FACTOR, color: BED },
      { x: 88 * SCALE_FACTOR, y: 10 * SCALE_FACTOR, width: 14 * SCALE_FACTOR, height: 18 * SCALE_FACTOR, color: BED },
    ],
    playerSpawn: { x: 56 * SCALE_FACTOR, y: 66 * SCALE_FACTOR, facing: "up" },
    exitZone: { x: 48 * SCALE_FACTOR, y: 76 * SCALE_FACTOR, width: 16 * SCALE_FACTOR, height: 8 * SCALE_FACTOR },
  },
  map_02_house_a: {
    id: "map_02_house_a",
    name: "民家A",
    parentSceneKey: "StartingTownScene",
    room: { width: 90 * SCALE_FACTOR, height: 70 * SCALE_FACTOR },
    floorColor: 0x33261e,
    wallColor: 0x1a130e,
    furniture: [
      { x: 36 * SCALE_FACTOR, y: 30 * SCALE_FACTOR, width: 18 * SCALE_FACTOR, height: 12 * SCALE_FACTOR, color: TABLE },
      { x: 64 * SCALE_FACTOR, y: 10 * SCALE_FACTOR, width: 14 * SCALE_FACTOR, height: 18 * SCALE_FACTOR, color: BED },
    ],
    playerSpawn: { x: 45 * SCALE_FACTOR, y: 54 * SCALE_FACTOR, facing: "up" },
    exitZone: { x: 37 * SCALE_FACTOR, y: 62 * SCALE_FACTOR, width: 16 * SCALE_FACTOR, height: 8 * SCALE_FACTOR },
  },
  // map_02_house_b(民家B)は2026-09-18に廃止した。CURRENT背景画像(はじまりのまち.png)には
  // 建物5棟しか描かれておらず、実在しない6棟目を維持しないと判断した(ユーザー確認済み)。
};
