import Phaser from "phaser";
import { BUILDING_COLORS, BUILDING_DOOR_COLOR } from "../config/building.ts";
import type { BuildingDefinition } from "../config/maps.ts";

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * footprintから door の帯を切り抜いた壁セグメントを返す(ドアは現状すべて上辺/下辺にある前提)。
 * 上下辺以外にドアがある場合は安全側としてfootprint全体を1枚の壁として扱う。
 */
function computeWallSegments(footprint: Rect, door: Rect): Rect[] {
  const doorOnTop = door.y <= footprint.y;
  const doorOnBottom = door.y + door.height >= footprint.y + footprint.height;
  if (!doorOnTop && !doorOnBottom) return [footprint];

  const bandHeight = door.height;
  const bandY = doorOnTop ? footprint.y : footprint.y + footprint.height - bandHeight;
  const bodyY = doorOnTop ? footprint.y + bandHeight : footprint.y;
  const bodyHeight = footprint.height - bandHeight;

  const segments: Rect[] = [{ x: footprint.x, y: bodyY, width: footprint.width, height: bodyHeight }];
  if (door.x > footprint.x) {
    segments.push({ x: footprint.x, y: bandY, width: door.x - footprint.x, height: bandHeight });
  }
  const doorRight = door.x + door.width;
  const footprintRight = footprint.x + footprint.width;
  if (doorRight < footprintRight) {
    segments.push({ x: doorRight, y: bandY, width: footprintRight - doorRight, height: bandHeight });
  }
  return segments;
}

/**
 * 町の建物の外観・当たり判定。DEV_PLACEHOLDER_COLLISIONの単色矩形+入口マーカーのみで、
 * 正式マップ画像ではない。壁は入口(door)の帯だけ切り抜いてあり、そこだけ通行できる
 * (実際に内部へ入れるかどうかはSceneが入口へ重ねる遷移トリガー次第)。
 */
export class Building {
  readonly definition: BuildingDefinition;
  readonly wallGroup: Phaser.Physics.Arcade.StaticGroup;

  constructor(scene: Phaser.Scene, definition: BuildingDefinition) {
    this.definition = definition;
    const { footprint, door } = definition;

    scene.add.rectangle(
      footprint.x + footprint.width / 2,
      footprint.y + footprint.height / 2,
      footprint.width,
      footprint.height,
      BUILDING_COLORS[definition.kind],
    );
    // 入口位置の視覚マーカー。実際の通行判定は壁セグメントの切り抜きで表現する。
    scene.add.rectangle(
      door.x + door.width / 2,
      door.y + door.height / 2,
      door.width,
      door.height,
      BUILDING_DOOR_COLOR,
    );

    this.wallGroup = scene.physics.add.staticGroup();
    for (const segment of computeWallSegments(footprint, door)) {
      const wall = scene.add
        .rectangle(segment.x + segment.width / 2, segment.y + segment.height / 2, segment.width, segment.height)
        .setVisible(false);
      this.wallGroup.add(wall);
    }
  }
}
