import Phaser from "phaser";
import type { VillagerGlitchConfig } from "../config/bieVillageAnomaly.ts";
import { idleFrame } from "../config/characterWalkSprite.ts";
import { planVillagerGlitch, randomInt } from "./MapAnomalyPlan.ts";
import type { Random } from "./MapAnomalyPlan.ts";

export interface VillagerGlitch {
  trigger(): void;
}

/**
 * 村人のバグり。本体の位置・当たり判定は動かさず、色ずれした残像2枚(左右に分かれた2色)を重ね、
 * 数回カクカクと位置を変えながら本体をちらつかせる。まれに残像だけ別の向きの絵になる。
 * 残像は2枚を使い回し、タイマーはScene Clockに載せる(Scene終了で止まる)。
 */
export function startVillagerGlitch(
  scene: Phaser.Scene,
  villagers: readonly Phaser.GameObjects.Sprite[],
  worldScale: number,
  config: VillagerGlitchConfig,
  random: Random = Math.random,
): VillagerGlitch {
  const ghosts = [0, 1].map(() => scene.add.sprite(0, 0, "__DEFAULT").setVisible(false));
  let restore: (() => void) | undefined;

  const trigger = (): void => {
    restore?.();
    const plan = planVillagerGlitch(random, config, villagers.length);
    if (!plan) return;
    const villager = villagers[plan.index];
    if (!villager.active || !villager.visible) return;
    const otherColor = config.ghostColors.find((color) => color !== plan.color) ?? plan.color;
    const frame = plan.wrongFacing ? idleFrame(plan.wrongFacing) : villager.frame.name;
    ghosts.forEach((ghost, index) => {
      ghost.setTexture(villager.texture.key, frame).setScale(villager.scaleX, villager.scaleY);
      ghost.setTint(index === 0 ? plan.color : otherColor).setAlpha(config.ghostAlpha);
      ghost.setDepth(villager.depth + 0.001 * (index + 1)).setVisible(true);
    });

    // カクカク: 残像の左右を入れ替えながら、ずれ幅を少しずつ変える。本体はちらつきと通常表示を交互に。
    const place = (step: number): void => {
      const direction = step % 2 === 0 ? 1 : -1;
      const shift = plan.shift * direction * (1 - step * 0.2) * worldScale;
      ghosts[0].setPosition(villager.x + shift, villager.y);
      ghosts[1].setPosition(villager.x - shift * 0.6, villager.y);
      villager.setAlpha(step % 2 === 0 ? config.flickerAlpha : 0.8);
    };
    place(0);
    const current = (): void => {
      ghosts.forEach((ghost) => ghost.setVisible(false));
      villager.setAlpha(1);
      restore = undefined;
    };
    restore = current;
    const stepMs = plan.durationMs / config.jitterSteps;
    for (let step = 1; step < config.jitterSteps; step += 1) {
      scene.time.delayedCall(stepMs * step, () => { if (restore === current) place(step); });
    }
    // 手動triggerで次のバグりが先に始まっていたら、古いタイマーは新しい方を消さない。
    scene.time.delayedCall(plan.durationMs, () => { if (restore === current) current(); });
  };

  const loop = (): void => {
    scene.time.delayedCall(randomInt(random, config.intervalMs), () => {
      trigger();
      loop();
    });
  };
  loop();
  return { trigger };
}
