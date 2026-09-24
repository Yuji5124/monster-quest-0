import Phaser from "phaser";
import type { MapAnomalyConfig } from "../config/bieVillageAnomaly.ts";
import { planBlock, planSparks, planTear, randomInt } from "./MapAnomalyPlan.ts";
import type { BlockPlan, MapSize, SparkPlan, TearPlan } from "./MapAnomalyPlan.ts";

/** 背景より上・キャラクター(Player depth 1000)より下。異変は「世界の絵」の側で起きているように見せる。 */
const ANOMALY_DEPTH = 5;
const SPARK_POOL_SIZE = 12;

export interface MapAnomalyAmbience {
  triggerSparks(): void;
  triggerTear(): void;
  triggerBlock(): void;
}

/**
 * 画像マップの背景へ小さな異変(チリチリ・横ずれ・マップチップ化け)を重ねる。
 * 背景テクスチャの一部を切り出した表示を一瞬だけ重ねるだけで、背景・Collision・入力・進行フラグには触れない。
 * 表示物は起動時に作った少数のプールを使い回す(iPhone Safariでの負荷を増やさない)。
 * タイマーはScene Clockに載せるため、Scene終了時に自動で止まり、表示物もSceneと一緒に破棄される。
 */
export function startMapAnomalyAmbience(
  scene: Phaser.Scene,
  backgroundKey: string,
  worldScale: number,
  map: MapSize,
  config: MapAnomalyConfig,
  random: () => number = Math.random,
): MapAnomalyAmbience {
  const makeSlice = (): Phaser.GameObjects.Image =>
    scene.add.image(0, 0, backgroundKey).setOrigin(0, 0).setScale(worldScale).setDepth(ANOMALY_DEPTH).setVisible(false);
  // 色ずれのゴーストを先に作り、ずれた本体の帯がその上に描かれるようにする。
  const tearGhost = makeSlice().setTint(config.tearGhostColor).setAlpha(config.tearGhostAlpha);
  const tear = makeSlice();
  const block = makeSlice();
  const sparks = Array.from({ length: SPARK_POOL_SIZE }, () =>
    scene.add.rectangle(0, 0, 1, 1, 0xffffff).setOrigin(0, 0).setDepth(ANOMALY_DEPTH + 1).setVisible(false));

  const hideLater = (objects: readonly Phaser.GameObjects.Components.Visible[], durationMs: number): void => {
    scene.time.delayedCall(durationMs, () => objects.forEach((object) => object.setVisible(false)));
  };

  const showSparks = (plans: readonly SparkPlan[]): void => {
    plans.slice(0, SPARK_POOL_SIZE).forEach((plan, index) => {
      const spark = sparks[index];
      spark.setPosition(plan.x * worldScale, plan.y * worldScale).setSize(plan.size * worldScale, plan.size * worldScale);
      spark.setFillStyle(plan.color, 1).setVisible(true);
      hideLater([spark], plan.durationMs);
    });
  };

  const showTear = (plan: TearPlan): void => {
    tear.setCrop(0, plan.y, map.width, plan.height).setPosition(plan.shift * worldScale, 0).setVisible(true);
    // 色ずれのゴーストは本体と逆側へ半分だけずらし、古いブラウン管の信号ずれのように見せる。
    tearGhost.setCrop(0, plan.y, map.width, plan.height).setPosition((-plan.shift / 2) * worldScale, 0).setVisible(true);
    hideLater([tear, tearGhost], plan.durationMs);
  };

  const showBlock = (plan: BlockPlan): void => {
    block.setCrop(plan.sourceX, plan.sourceY, plan.size, plan.size);
    block.setPosition((plan.targetX - plan.sourceX) * worldScale, (plan.targetY - plan.sourceY) * worldScale).setVisible(true);
    hideLater([block], plan.durationMs);
  };

  const ambience: MapAnomalyAmbience = {
    triggerSparks: () => showSparks(planSparks(random, config)),
    triggerTear: () => showTear(planTear(random, config, map)),
    triggerBlock: () => showBlock(planBlock(random, config, map)),
  };

  const loop = (interval: { readonly min: number; readonly max: number }, effect: () => void): void => {
    scene.time.delayedCall(randomInt(random, interval), () => {
      effect();
      loop(interval, effect);
    });
  };
  loop(config.sparkIntervalMs, ambience.triggerSparks);
  loop(config.tearIntervalMs, ambience.triggerTear);
  loop(config.blockIntervalMs, ambience.triggerBlock);
  return ambience;
}
