import Phaser from "phaser";
import { INTERACTION_REACH, INTERACTION_SPAN } from "../config/interaction.ts";
import { STONE_TOWN_AWAKENING } from "../config/stoneTown.ts";
import type { Player } from "../entities/Player.ts";
import type { DialogueBox } from "../ui/DialogueBox.ts";
import type { GameStateRepository } from "./GameStateRepository.ts";
import { configureMapCamera } from "./MapCamera.ts";
import { canInteract } from "./Interaction.ts";
import type { Facing } from "./PlayerMovement.ts";
import { scaleRect } from "./ImageMapData.ts";
import type { ImageMapAwakeningObject, ImageMapBarrierObject, ImageMapObject, ImageMapStatueObject } from "./ImageMapData.ts";
import { awakeningStage, awakeningStaticPages, distanceToRect, isBarrierOpen, isStatueChanged, statuePages } from "./ImageMapStoryState.ts";
import { PlazaCracks, StarGlow, createStoneRubble, spawnStoneDust, startLifeMotes } from "./StoneTownEffects.ts";
import type { StoneRubble, WorldRect } from "./StoneTownEffects.ts";

/** What the story layer needs from the Scene that owns it (RainlandImageMapScene). */
export interface StoryLayerHost {
  readonly scene: Phaser.Scene;
  readonly worldScale: number;
  readonly player: Player;
  readonly dialogueBox: DialogueBox;
  readonly gameState: GameStateRepository;
  /** While scripted the Scene ignores movement/confirm input (the awakening cutscene). */
  setScripted(scripted: boolean): void;
  /** Runs once the currently open dialogue closes. */
  setAfterDialogue(next: (() => void) | undefined): void;
}

export const STORY_OBJECT_TYPES = ["statue", "barrier", "awakening"] as const;

export function isStoryObject(object: ImageMapObject): object is ImageMapStatueObject | ImageMapBarrierObject | ImageMapAwakeningObject {
  return (STORY_OBJECT_TYPES as readonly string[]).includes(object.type);
}

interface StatueRuntime {
  readonly definition: ImageMapStatueObject;
  readonly bounds: WorldRect;
  lifeStarted: boolean;
}

interface BarrierRuntime {
  readonly definition: ImageMapBarrierObject;
  readonly bounds: WorldRect;
  readonly blocker: Phaser.GameObjects.Rectangle;
  readonly collider: Phaser.Physics.Arcade.Collider;
  readonly rubble?: StoneRubble;
  open: boolean;
}

interface AwakeningRuntime {
  readonly definition: ImageMapAwakeningObject;
  readonly bounds: WorldRect;
  readonly glow: StarGlow;
  readonly cracks: PlazaCracks;
}

interface Candidate {
  readonly bounds: WorldRect;
  readonly activate: () => void;
}

/**
 * The stateful, flag-driven objects of an image map (No.18 いしのまち): petrified statues that speak a memory echo,
 * the fallen wall that blocks the north stairs, and the plaza statue that awakens once the echoes are gathered.
 * Objects stay data (objects.json); the flag rules live in ImageMapStoryState.ts, the visuals in StoneTownEffects.ts.
 */
export class ImageMapStoryLayer {
  private readonly statues: StatueRuntime[] = [];
  private readonly barriers = new Map<string, BarrierRuntime>();
  private readonly awakenings: AwakeningRuntime[] = [];

  constructor(private readonly host: StoryLayerHost, objects: readonly ImageMapObject[]) {
    const { scene, worldScale, gameState } = host;
    for (const object of objects) {
      const bounds = scaleRect(object, worldScale);
      if (object.type === "statue") {
        const runtime: StatueRuntime = { definition: object, bounds, lifeStarted: false };
        this.statues.push(runtime);
        if (isStatueChanged(object, gameState)) this.startLife(runtime);
      } else if (object.type === "barrier") {
        if (isBarrierOpen(object, gameState)) continue;
        const blocker = scene.add.rectangle(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, bounds.width, bounds.height, 0x000000, 0).setDepth(0);
        scene.physics.add.existing(blocker, true);
        const collider = scene.physics.add.collider(host.player.body, blocker.body as Phaser.Physics.Arcade.StaticBody);
        const rubble = object.presentation === "stone-rubble" ? createStoneRubble(scene, bounds) : undefined;
        this.barriers.set(object.id, { definition: object, bounds, blocker, collider, rubble, open: false });
      }
    }
    // awakenings last: they refer to barriers by id
    for (const object of objects) {
      if (object.type !== "awakening") continue;
      if (!objects.some((candidate) => candidate.type === "barrier" && candidate.id === object.opensBarrierId)) {
        throw new Error(`awakening ${object.id} opens an unknown barrier ${object.opensBarrierId}`);
      }
      const bounds = scaleRect(object, worldScale);
      const glow = new StarGlow(scene, object.glow.x * worldScale, object.glow.y * worldScale);
      const cracks = new PlazaCracks(scene, this.basinOf(bounds), this.crackClip(bounds));
      const runtime: AwakeningRuntime = { definition: object, bounds, glow, cracks };
      this.awakenings.push(runtime);
      if (awakeningStage(object, gameState) === "done") {
        cracks.draw(1);
        glow.settle();
      }
    }
  }

  /** Examines the nearest statue / barrier / awakening statue in front of the player. Returns true if one opened. */
  tryInteract(center: { readonly x: number; readonly y: number }, facing: Facing): boolean {
    const candidates: Candidate[] = [];
    for (const statue of this.statues) candidates.push({ bounds: statue.bounds, activate: () => this.openStatue(statue) });
    for (const barrier of this.barriers.values()) {
      if (!barrier.open) candidates.push({ bounds: barrier.bounds, activate: () => this.openPages(barrier.definition.pages) });
    }
    for (const awakening of this.awakenings) candidates.push({ bounds: awakening.bounds, activate: () => this.openAwakening(awakening) });

    const reachable = candidates.filter((candidate) => canInteract(center, facing, candidate.bounds, INTERACTION_REACH, INTERACTION_SPAN));
    if (reachable.length === 0) return false;
    reachable.sort((a, b) => distanceToRect(center, a.bounds) - distanceToRect(center, b.bounds) || a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height);
    this.host.player.body.setVelocity(0, 0);
    reachable[0].activate();
    return true;
  }

  isBarrierOpen(id: string): boolean {
    const barrier = this.barriers.get(id);
    return barrier === undefined || barrier.open;
  }

  private openPages(pages: readonly string[]): void {
    this.host.dialogueBox.open(pages);
  }

  private openStatue(statue: StatueRuntime): void {
    const { definition } = statue;
    this.host.dialogueBox.open(statuePages(definition, this.host.gameState));
    if (definition.examinedFlag && !this.host.gameState.hasFlag(definition.examinedFlag)) this.host.gameState.setFlag(definition.examinedFlag);
  }

  private openAwakening(awakening: AwakeningRuntime): void {
    const { definition } = awakening;
    const staticPages = awakeningStaticPages(definition, this.host.gameState);
    if (staticPages) {
      this.host.dialogueBox.open(staticPages);
      return;
    }
    this.host.dialogueBox.open(definition.pages);
    this.host.setAfterDialogue(() => this.playAwakening(awakening));
  }

  /** Camera to the star → glow + flash → cracks + dust → camera to the fallen wall → it crumbles → camera back. */
  private playAwakening(awakening: AwakeningRuntime): void {
    const { scene, player } = this.host;
    const { definition } = awakening;
    const cfg = STONE_TOWN_AWAKENING;
    const camera = scene.cameras.main;
    const barrier = this.barriers.get(definition.opensBarrierId);
    const star = { x: definition.glow.x * this.host.worldScale, y: definition.glow.y * this.host.worldScale };
    const basin = this.basinOf(awakening.bounds);

    // Each stage starts the next one when it ends (no absolute clock), so the wall is always gone before control returns.
    const wait = (ms: number, next: () => void): void => { scene.time.delayedCall(ms, next); };
    const finish = (): void => {
      const bounds = camera.getBounds();
      configureMapCamera(scene, player.visual, { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
      this.host.gameState.setFlag(definition.awakenedFlag);
      for (const statue of this.statues) {
        if (isStatueChanged(statue.definition, this.host.gameState)) this.startLife(statue);
      }
      this.host.setScripted(false);
      this.host.dialogueBox.open(definition.afterPages);
    };
    const returnToPlayer = (): void => {
      camera.pan(player.visual.x, player.visual.y, cfg.returnMs, "Sine.easeInOut", true);
      camera.zoomTo(1, cfg.returnMs, "Sine.easeInOut", true);
      wait(cfg.returnMs, finish);
    };
    const crumbleWall = (): void => {
      if (!barrier) {
        returnToPlayer();
        return;
      }
      const removed = (): void => {
        this.removeBarrier(barrier);
        wait(300, returnToPlayer);
      };
      if (barrier.rubble) barrier.rubble.crumble(removed);
      else removed();
    };
    const focusWall = (): void => {
      if (!barrier) {
        returnToPlayer();
        return;
      }
      camera.pan(barrier.bounds.x + barrier.bounds.width / 2, barrier.bounds.y + barrier.bounds.height / 2, cfg.focusBarrierMs, "Sine.easeInOut", true);
      camera.zoomTo(cfg.barrierZoom, cfg.focusBarrierMs, "Sine.easeInOut", true);
      wait(cfg.focusBarrierMs + 200, crumbleWall);
    };
    const crack = (): void => {
      camera.shake(cfg.crackMs * 0.7, 0.006);
      spawnStoneDust(scene, basin.x, basin.y - basin.ry, cfg.dustCount, basin.rx);
      const progress = { value: 0 };
      scene.tweens.add({ targets: progress, value: 1, duration: cfg.crackMs, ease: "Sine.easeOut", onUpdate: () => awakening.cracks.draw(progress.value) });
      wait(cfg.crackMs, focusWall);
    };
    const glow = (): void => {
      awakening.glow.flare();
      camera.flash(cfg.flashMs, 255, 244, 214);
      spawnStoneDust(scene, star.x, star.y + 40, cfg.moteCount, 120);
      wait(cfg.glowMs, crack);
    };

    this.host.setScripted(true);
    player.body.setVelocity(0, 0);
    camera.stopFollow();
    camera.pan(star.x, star.y + 70, cfg.focusStarMs, "Sine.easeInOut", true);
    camera.zoomTo(cfg.starZoom, cfg.focusStarMs, "Sine.easeInOut", true);
    wait(cfg.focusStarMs, glow);
  }

  /** The wall is gone: drop its blocker and remember it. */
  private removeBarrier(barrier: BarrierRuntime): void {
    if (barrier.open) return;
    barrier.open = true;
    barrier.collider.destroy();
    barrier.blocker.destroy();
    barrier.rubble?.destroy();
    this.host.gameState.setFlag(barrier.definition.openedFlag);
  }

  private startLife(statue: StatueRuntime): void {
    if (statue.lifeStarted) return;
    statue.lifeStarted = true;
    startLifeMotes(this.host.scene, statue.bounds);
  }

  /** The fountain basin the cracks radiate from, derived from the awakening rectangle (statue + basin). */
  private basinOf(bounds: WorldRect): { x: number; y: number; rx: number; ry: number } {
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height * 0.68, rx: bounds.width / 2, ry: bounds.height * 0.32 };
  }

  private crackClip(bounds: WorldRect): WorldRect {
    const margin = STONE_TOWN_AWAKENING.crackClipMargin;
    const scale = this.host.worldScale;
    return {
      x: bounds.x - margin.left * scale,
      y: bounds.y - margin.top * scale,
      width: bounds.width + (margin.left + margin.right) * scale,
      height: bounds.height + (margin.top + margin.bottom) * scale,
    };
  }
}
