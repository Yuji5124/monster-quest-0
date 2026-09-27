import Phaser from "phaser";
import { DISPLAY } from "../config/display.ts";
import { DEMAS_BATTLE_PRESENTATION, type DemasAnimationState } from "../data/demasBattlePresentation.ts";

/** Callbacks keep BattleScene's HUD state separate from Demas's canvas-only effects. */
export interface DaidainSequenceCallbacks {
  readonly reflected: boolean;
  readonly weak: boolean;
  readonly onPartyImpact: () => void;
  readonly onComplete: () => void;
}

/**
 * Disposable renderer controller for the No.16 boss. It owns no combat state:
 * BattleSystem still decides the action, damage, and mirror reflection first.
 */
export class DemasBossController {
  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  /** The only layer copied/warped by Demas. HUD objects are deliberately excluded. */
  private readonly background: Phaser.GameObjects.Image | undefined;
  private readonly baseX: number;
  private readonly baseY: number;
  private readonly baseScaleX: number;
  private readonly baseScaleY: number;
  private readonly baseShadowAlpha: number;
  private readonly baseCameraZoom: number;
  private readonly aura: Phaser.GameObjects.Ellipse;
  private readonly sigil: Phaser.GameObjects.Graphics;
  private readonly animationKeys: Record<DemasAnimationState, string>;
  private transientObjects: Phaser.GameObjects.GameObject[] = [];
  private delayedCalls: Phaser.Time.TimerEvent[] = [];
  private disposed = false;

  constructor(
    scene: Phaser.Scene,
    sprite: Phaser.GameObjects.Sprite,
    shadow: Phaser.GameObjects.Ellipse,
    textureKey: string,
    background?: Phaser.GameObjects.Image,
  ) {
    this.scene = scene;
    this.sprite = sprite;
    this.shadow = shadow;
    this.background = background;
    this.baseX = sprite.x;
    this.baseY = sprite.y;
    this.baseScaleX = sprite.scaleX;
    this.baseScaleY = sprite.scaleY;
    this.baseShadowAlpha = shadow.alpha;
    this.baseCameraZoom = scene.cameras.main.zoom;
    this.animationKeys = Object.fromEntries(
      Object.keys(DEMAS_BATTLE_PRESENTATION.animations).map((state) => [state, `${textureKey}.${state}`]),
    ) as Record<DemasAnimationState, string>;
    this.createAnimations(textureKey);

    this.aura = scene.add.ellipse(
      this.baseX,
      this.baseY + sprite.displayHeight * 0.12,
      sprite.displayWidth * 1.28,
      sprite.displayHeight * 0.78,
      DEMAS_BATTLE_PRESENTATION.daidain.colours.violet,
      0.08,
    ).setDepth(0.72).setBlendMode(Phaser.BlendModes.ADD);
    this.sigil = scene.add.graphics().setDepth(0.78).setAlpha(0.24).setBlendMode(Phaser.BlendModes.ADD);
    this.drawPersistentSigil();
    this.startAmbient(false);
  }

  /** Small magical pressure for Demas's ordinary physical strike. */
  playNormalAttack(weak: boolean): void {
    this.stopAmbient();
    this.playAnimation("cast");
    this.createBattlefieldWarp(DEMAS_BATTLE_PRESENTATION.screenEffects.normalDurationMs, false);
    this.pulseFromDemas(0x91b8ff, 0.48, 220);
    this.pushCamera(DEMAS_BATTLE_PRESENTATION.normalCast.pressureZoom, 250);
    this.scene.cameras.main.shake(140, DEMAS_BATTLE_PRESENTATION.normalCast.shakeIntensity);
    this.defer(230, () => this.playAnimation("chant"));
    this.defer(DEMAS_BATTLE_PRESENTATION.normalCast.durationMs, () => this.startAmbient(weak));
  }

  /** Demas's own Mirror is a contained defensive spell, not a destructive glitch. */
  playMirrorCast(weak: boolean): void {
    this.stopAmbient();
    this.playAnimation("chant");
    this.createBackgroundEchoes(0.7, DEMAS_BATTLE_PRESENTATION.screenEffects.normalDurationMs);
    this.pulseFromDemas(0x9fefff, 0.58, 310);
    const ring = this.track(this.scene.add.graphics().setDepth(3).setBlendMode(Phaser.BlendModes.ADD));
    const radius = Math.max(this.sprite.displayWidth, this.sprite.displayHeight) * 0.52;
    ring.lineStyle(5, 0xdafcff, 0.8).strokeCircle(this.baseX, this.baseY, radius);
    this.scene.tweens.add({ targets: ring, alpha: 0, scale: 1.28, duration: 540, ease: "Sine.easeOut", onComplete: () => ring.destroy() });
    this.defer(300, () => this.playAnimation("cast"));
    this.defer(700, () => this.startAmbient(weak));
  }

  /** Full Demas-only Daidain timeline. Gameplay damage was resolved before this visual starts. */
  playDaidain(callbacks: DaidainSequenceCallbacks): void {
    this.stopAmbient();
    this.clearTransient();
    const spec = DEMAS_BATTLE_PRESENTATION.daidain;
    const { warningMs, gatherMs, stillnessMs, beamMs, mirrorHoldMs, returnMs, reflectedImpactMs, recoverMs } = spec;
    const fireAt = warningMs + gatherMs + stillnessMs;
    const target = { x: DISPLAY.width * 0.24, y: DISPLAY.height * 0.55 };
    this.playAnimation("chant");
    this.createPressureFrame();
    this.createBattlefieldWarp(DEMAS_BATTLE_PRESENTATION.screenEffects.daidainDurationMs, true);
    this.pushCamera(spec.pressureZoom, warningMs + gatherMs);
    this.sprite.setTint(0xc9d9ff);
    this.aura.setFillStyle(spec.colours.violet, 0.22).setAlpha(0.45).setScale(1.1);
    this.sigil.setAlpha(0.7).setScale(1.05);
    this.scene.tweens.add({ targets: [this.aura, this.sigil], scale: 1.42, alpha: 0.92, duration: warningMs + gatherMs, ease: "Sine.easeIn" });

    this.defer(warningMs, () => {
      this.createGatherParticles(spec.particleCount);
      this.pulseFromDemas(spec.colours.blue, 0.72, gatherMs);
    });
    // Brief visual stillness: input is locked by BattleScene while this sequence owns the camera.
    this.defer(warningMs + gatherMs, () => {
      this.sprite.setTintFill(spec.colours.white);
      this.createFrameHold();
      this.scene.cameras.main.shake(stillnessMs, 0.0015);
    });
    this.defer(fireAt, () => {
      this.sprite.clearTint();
      this.playAnimation("cast");
      this.createDaidainBeam(this.baseX, this.baseY - this.sprite.displayHeight * 0.07, target.x, target.y, false, beamMs);
      this.scene.cameras.main.shake(beamMs, 0.008);
    });

    if (!callbacks.reflected) {
      this.defer(fireAt + beamMs, () => {
        callbacks.onPartyImpact();
        this.scene.cameras.main.flash(150, 216, 239, 255);
        this.scene.cameras.main.shake(260, 0.012);
      });
      this.defer(fireAt + beamMs + recoverMs, () => this.finishDaidain(callbacks.weak, callbacks.onComplete));
      return;
    }

    this.defer(fireAt + beamMs - 60, () => this.createMirrorBarrier(target.x, target.y));
    this.defer(fireAt + beamMs, () => {
      this.scene.cameras.main.flash(100, 230, 250, 255);
      this.scene.cameras.main.shake(mirrorHoldMs, 0.005);
    });
    this.defer(fireAt + beamMs + mirrorHoldMs, () => {
      this.createDaidainBeam(target.x, target.y, this.baseX, this.baseY - this.sprite.displayHeight * 0.07, true, returnMs);
    });
    this.defer(fireAt + beamMs + mirrorHoldMs + returnMs, () => this.playReflectedImpact(callbacks.weak));
    this.defer(fireAt + beamMs + mirrorHoldMs + returnMs + reflectedImpactMs + recoverMs, () => this.finishDaidain(callbacks.weak, callbacks.onComplete));
  }

  /** A player hit (including a reflected Daidain) keeps the sheet visibly alive instead of using a static portrait flash. */
  playDamage(weak: boolean, reflected = false): void {
    this.stopAmbient();
    this.playAnimation("damaged");
    const push = reflected ? 22 : 10;
    this.sprite.setTintFill(reflected ? 0xf5fbff : 0xdde9ff);
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.baseX + push,
      duration: 58,
      yoyo: true,
      repeat: reflected ? 3 : 2,
      ease: "Quad.easeInOut",
      onComplete: () => {
        this.sprite.setX(this.baseX).clearTint();
        this.startAmbient(weak);
      },
    });
    if (reflected) {
      this.scene.cameras.main.flash(180, 235, 248, 255);
      this.scene.cameras.main.shake(300, 0.014);
      this.pulseFromDemas(0xe5fbff, 0.8, 360);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.tweens.killTweensOf([this.sprite, this.shadow, this.aura, this.sigil]);
    for (const delayed of this.delayedCalls) delayed.remove(false);
    this.delayedCalls = [];
    this.clearTransient();
    this.aura.destroy();
    this.sigil.destroy();
    this.scene.cameras.main.setZoom(this.baseCameraZoom);
  }

  private createAnimations(textureKey: string): void {
    for (const [state, definition] of Object.entries(DEMAS_BATTLE_PRESENTATION.animations) as [DemasAnimationState, typeof DEMAS_BATTLE_PRESENTATION.animations.idle][]) {
      const key = this.animationKeys[state];
      if (!this.scene.anims.exists(key)) {
        this.scene.anims.create({
          key,
          frames: this.scene.anims.generateFrameNumbers(textureKey, { frames: [...definition.frames] }),
          frameRate: definition.frameRate,
          repeat: definition.repeat,
        });
      }
    }
  }

  private playAnimation(state: DemasAnimationState): void {
    this.sprite.play(this.animationKeys[state], true);
  }

  private startAmbient(weak: boolean): void {
    if (this.disposed) return;
    this.scene.tweens.killTweensOf([this.sprite, this.shadow, this.aura, this.sigil]);
    this.sprite.setPosition(this.baseX, this.baseY).setScale(this.baseScaleX, this.baseScaleY).setAngle(0).setAlpha(1).clearTint();
    this.shadow.setAlpha(this.baseShadowAlpha).setScale(1);
    this.aura.setAlpha(weak ? 0.2 : 0.12).setScale(1);
    this.sigil.setAlpha(weak ? 0.38 : 0.24).setScale(1);
    this.playAnimation(weak ? "weak" : "idle");
    const idle = DEMAS_BATTLE_PRESENTATION.idle;
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.baseY - (weak ? idle.floatPx * 0.45 : idle.floatPx),
      scaleX: this.baseScaleX * (weak ? 1.01 : idle.scaleX),
      scaleY: this.baseScaleY * (weak ? 0.98 : idle.scaleY),
      angle: weak ? idle.swayDeg * 0.5 : idle.swayDeg,
      duration: weak ? idle.durationMs * 0.72 : idle.durationMs,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.scene.tweens.add({
      targets: this.shadow,
      scaleX: weak ? 0.88 : 0.93,
      alpha: weak ? this.baseShadowAlpha * 0.8 : this.baseShadowAlpha * 0.72,
      duration: idle.durationMs,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.scene.tweens.add({ targets: this.aura, alpha: weak ? 0.28 : 0.2, scale: 1.12, duration: 1_450, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.scene.tweens.add({ targets: this.sigil, angle: 360, duration: weak ? 8_000 : 12_000, repeat: -1, ease: "Linear" });
  }

  private stopAmbient(): void {
    this.scene.tweens.killTweensOf([this.sprite, this.shadow, this.aura, this.sigil]);
    this.sprite.setPosition(this.baseX, this.baseY).setScale(this.baseScaleX, this.baseScaleY).setAngle(0).setAlpha(1);
    this.shadow.setAlpha(this.baseShadowAlpha).setScale(1);
  }

  private finishDaidain(weak: boolean, onComplete: () => void): void {
    if (this.disposed) return;
    this.clearTransient();
    this.sprite.clearTint();
    this.scene.cameras.main.setZoom(this.baseCameraZoom);
    this.startAmbient(weak);
    onComplete();
  }

  private playReflectedImpact(weak: boolean): void {
    this.playDamage(weak, true);
  }

  private pushCamera(zoom: number, duration: number): void {
    this.scene.tweens.killTweensOf(this.scene.cameras.main);
    this.scene.tweens.add({ targets: this.scene.cameras.main, zoom, duration: duration * 0.5, yoyo: true, ease: "Sine.easeInOut" });
  }

  private drawPersistentSigil(): void {
    const radius = Math.max(this.sprite.displayWidth, this.sprite.displayHeight) * 0.37;
    this.sigil.clear();
    this.sigil.lineStyle(2, 0xa98cff, 0.68).strokeCircle(this.baseX, this.baseY + this.sprite.displayHeight * 0.12, radius);
    this.sigil.lineStyle(1, 0xd1c5ff, 0.6).strokeCircle(this.baseX, this.baseY + this.sprite.displayHeight * 0.12, radius * 0.72);
    for (let index = 0; index < 6; index += 1) {
      const angle = Phaser.Math.DegToRad(index * 60 - 90);
      this.sigil.lineBetween(
        this.baseX + Math.cos(angle) * radius * 0.72,
        this.baseY + this.sprite.displayHeight * 0.12 + Math.sin(angle) * radius * 0.72,
        this.baseX + Math.cos(angle) * radius,
        this.baseY + this.sprite.displayHeight * 0.12 + Math.sin(angle) * radius,
      );
    }
  }

  /**
   * A restrained take on the requested glitch vocabulary. The copies and bands
   * live below the combatants (depth < 0.5), so magical pressure bends the
   * arena without reading as UI corruption or a broken game frame.
   */
  private createBattlefieldWarp(duration: number, includeDither: boolean): void {
    this.createBackgroundEchoes(1, duration);
    this.createSliceDisplacement(duration);
    if (!includeDither) return;
    this.createDitherVeil(duration);
    this.createPointCloud(duration);
  }

  /** Frame echo / trail on the real battle background, coloured as gathered magic. */
  private createBackgroundEchoes(intensity: number, duration: number): void {
    const background = this.background;
    if (!background?.active) return;
    const effect = DEMAS_BATTLE_PRESENTATION.screenEffects;
    const shifts = [-effect.echoOffsetPx, effect.echoOffsetPx, effect.echoOffsetPx * 0.45];
    const echoes = shifts.map((offset, index) => this.track(this.scene.add.image(
      background.x + offset,
      background.y + (index === 2 ? 1 : 0),
      background.texture.key,
      background.frame.name,
    )
      .setOrigin(background.originX, background.originY)
      .setScale(background.scaleX, background.scaleY)
      .setDepth(0.11 + index * 0.01)
      .setTint(index === 1 ? 0x9a8dff : 0x78d8ff)
      .setAlpha(effect.echoAlpha * intensity)
      .setBlendMode(Phaser.BlendModes.ADD)));
    this.scene.tweens.add({
      targets: echoes,
      alpha: 0,
      duration,
      ease: "Sine.easeOut",
      onComplete: () => echoes.forEach((echo) => echo.destroy()),
    });
  }

  /** Horizontal magic bands suggest a sliced/displaced arena while leaving scene data untouched. */
  private createSliceDisplacement(duration: number): void {
    const effect = DEMAS_BATTLE_PRESENTATION.screenEffects;
    const height = Math.ceil(DISPLAY.height / effect.sliceCount);
    for (let index = 0; index < effect.sliceCount; index += 1) {
      const direction = index % 2 === 0 ? -1 : 1;
      const band = this.track(this.scene.add.rectangle(
        DISPLAY.width / 2 - direction * effect.sliceOffsetPx,
        height * (index + 0.5),
        DISPLAY.width + effect.sliceOffsetPx * 2,
        Math.max(10, height - 5),
        index % 3 === 0 ? 0x6b5ad0 : 0x25213f,
        index % 3 === 0 ? 0.075 : 0.11,
      ).setDepth(0.18));
      this.scene.tweens.add({
        targets: band,
        x: DISPLAY.width / 2 + direction * effect.sliceOffsetPx,
        alpha: 0,
        duration: duration * (0.55 + index * 0.06),
        delay: index * 18,
        ease: "Sine.easeInOut",
        onComplete: () => band.destroy(),
      });
    }
  }

  /** A temporary deep-blue palette veil plus ordered 12px dither cells. */
  private createDitherVeil(duration: number): void {
    const effect = DEMAS_BATTLE_PRESENTATION.screenEffects;
    const spec = DEMAS_BATTLE_PRESENTATION.daidain;
    const veil = this.track(this.scene.add.rectangle(
      DISPLAY.width / 2,
      DISPLAY.height / 2,
      DISPLAY.width,
      DISPLAY.height,
      spec.colours.deep,
      0.13,
    ).setDepth(0.13));
    const dither = this.track(this.scene.add.graphics().setDepth(0.19));
    for (let y = 0; y < DISPLAY.height; y += effect.ditherCellPx) {
      for (let x = 0; x < DISPLAY.width; x += effect.ditherCellPx) {
        const cell = (Math.floor(x / effect.ditherCellPx) * 3 + Math.floor(y / effect.ditherCellPx) * 5) % 7;
        if (cell > 2) continue;
        dither.fillStyle(cell === 0 ? spec.colours.violet : spec.colours.blue, cell === 0 ? 0.11 : 0.075);
        dither.fillRect(x, y, Math.max(2, effect.ditherCellPx / 3), Math.max(2, effect.ditherCellPx / 3));
      }
    }
    this.scene.tweens.add({ targets: [veil, dither], alpha: 0, duration, ease: "Quad.easeOut", onComplete: () => { veil.destroy(); dither.destroy(); } });
  }

  /** Background-only point cloud: part of the arena looks drawn toward Demas's spell. */
  private createPointCloud(duration: number): void {
    const effect = DEMAS_BATTLE_PRESENTATION.screenEffects;
    const spec = DEMAS_BATTLE_PRESENTATION.daidain;
    for (let index = 0; index < effect.daidainPointCount; index += 1) {
      const x = 16 + (index * 71) % (DISPLAY.width - 32);
      const y = 16 + (index * 43) % Math.round(DISPLAY.height * 0.7);
      const point = this.track(this.scene.add.circle(
        x,
        y,
        index % 5 === 0 ? 2.5 : 1.5,
        index % 4 === 0 ? spec.colours.white : spec.colours.blue,
        0.32,
      ).setDepth(0.22).setBlendMode(Phaser.BlendModes.ADD));
      this.scene.tweens.add({
        targets: point,
        x: Phaser.Math.Linear(x, this.baseX, 0.42),
        y: Phaser.Math.Linear(y, this.baseY, 0.42),
        alpha: 0,
        scale: 0.35,
        duration: duration * (0.45 + (index % 4) * 0.1),
        delay: (index % 9) * 16,
        ease: "Quad.easeIn",
        onComplete: () => point.destroy(),
      });
    }
  }

  /** 0.09s visual hold: repeat the battlefield frame without freezing gameplay or the HUD. */
  private createFrameHold(): void {
    const effect = DEMAS_BATTLE_PRESENTATION.screenEffects;
    this.createBackgroundEchoes(1.2, effect.frameHoldMs);
    this.createSliceDisplacement(effect.frameHoldMs);
  }

  private createPressureFrame(): void {
    const spec = DEMAS_BATTLE_PRESENTATION.daidain;
    const veil = this.track(this.scene.add.rectangle(DISPLAY.width / 2, DISPLAY.height / 2, DISPLAY.width, DISPLAY.height, spec.colours.deep, 0.08).setDepth(8));
    this.scene.tweens.add({ targets: veil, alpha: 0.3, duration: spec.warningMs + spec.gatherMs, yoyo: true, hold: 320, onComplete: () => veil.destroy() });
    const panels = [
      this.track(this.scene.add.rectangle(DISPLAY.width / 2, -42, DISPLAY.width, 84, spec.colours.deep, 0.6).setDepth(8)),
      this.track(this.scene.add.rectangle(DISPLAY.width / 2, DISPLAY.height + 42, DISPLAY.width, 84, spec.colours.deep, 0.6).setDepth(8)),
      this.track(this.scene.add.rectangle(-42, DISPLAY.height / 2, 84, DISPLAY.height, spec.colours.deep, 0.55).setDepth(8)),
      this.track(this.scene.add.rectangle(DISPLAY.width + 42, DISPLAY.height / 2, 84, DISPLAY.height, spec.colours.deep, 0.55).setDepth(8)),
    ];
    const inset = spec.edgeInset;
    this.scene.tweens.add({ targets: panels[0], y: inset, duration: spec.warningMs, ease: "Sine.easeOut" });
    this.scene.tweens.add({ targets: panels[1], y: DISPLAY.height - inset, duration: spec.warningMs, ease: "Sine.easeOut" });
    this.scene.tweens.add({ targets: panels[2], x: inset, duration: spec.warningMs, ease: "Sine.easeOut" });
    this.scene.tweens.add({ targets: panels[3], x: DISPLAY.width - inset, duration: spec.warningMs, ease: "Sine.easeOut" });
    this.defer(spec.warningMs + spec.gatherMs + spec.stillnessMs + spec.beamMs + spec.mirrorHoldMs + spec.returnMs + spec.reflectedImpactMs + spec.recoverMs, () => panels.forEach((panel) => panel.destroy()));
  }

  private createGatherParticles(count: number): void {
    const spec = DEMAS_BATTLE_PRESENTATION.daidain;
    for (let index = 0; index < count; index += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const radius = Phaser.Math.FloatBetween(120, 280);
      const particle = this.track(this.scene.add.circle(
        this.baseX + Math.cos(angle) * radius,
        this.baseY + Math.sin(angle) * radius,
        index % 4 === 0 ? 5 : 3,
        index % 3 === 0 ? spec.colours.white : spec.colours.blue,
        0.88,
      ).setDepth(6).setBlendMode(Phaser.BlendModes.ADD));
      this.scene.tweens.add({
        targets: particle,
        x: this.baseX + Phaser.Math.FloatBetween(-28, 28),
        y: this.baseY + Phaser.Math.FloatBetween(-52, 42),
        alpha: 0,
        scale: 0.15,
        duration: spec.gatherMs * Phaser.Math.FloatBetween(0.62, 1),
        delay: index * 10,
        ease: "Quad.easeIn",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private createDaidainBeam(fromX: number, fromY: number, toX: number, toY: number, reverse: boolean, duration: number): void {
    const spec = DEMAS_BATTLE_PRESENTATION.daidain;
    const beam = this.track(this.scene.add.graphics().setDepth(8).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0));
    beam.lineStyle(58, spec.colours.violet, 0.16).lineBetween(fromX, fromY, toX, toY);
    beam.lineStyle(32, spec.colours.blue, 0.42).lineBetween(fromX, fromY, toX, toY);
    beam.lineStyle(12, spec.colours.white, 0.96).lineBetween(fromX, fromY, toX, toY);
    beam.fillStyle(spec.colours.white, 0.92).fillCircle(fromX, fromY, 15);
    const head = this.track(this.scene.add.circle(fromX, fromY, 15, spec.colours.white, 0.95).setDepth(9).setBlendMode(Phaser.BlendModes.ADD));
    this.scene.tweens.add({ targets: beam, alpha: { from: 0, to: 1 }, duration: 35, yoyo: true, hold: duration - 70, onComplete: () => beam.destroy() });
    this.scene.tweens.add({ targets: head, x: toX, y: toY, scale: 2.2, duration, ease: "Expo.easeIn", onComplete: () => head.destroy() });
    const direction = reverse ? -1 : 1;
    for (let index = 0; index < 9; index += 1) {
      const stream = this.track(this.scene.add.circle(fromX, fromY, 2 + index % 3, index % 2 ? spec.colours.blue : spec.colours.white, 0.8).setDepth(9).setBlendMode(Phaser.BlendModes.ADD));
      this.scene.tweens.add({
        targets: stream,
        x: toX + direction * Phaser.Math.FloatBetween(-16, 16),
        y: toY + Phaser.Math.FloatBetween(-16, 16),
        alpha: 0,
        duration: duration * Phaser.Math.FloatBetween(0.55, 1),
        delay: index * 17,
        ease: "Quad.easeIn",
        onComplete: () => stream.destroy(),
      });
    }
  }

  private createMirrorBarrier(x: number, y: number): void {
    const spec = DEMAS_BATTLE_PRESENTATION.daidain;
    const barrier = this.track(this.scene.add.graphics().setDepth(9).setBlendMode(Phaser.BlendModes.ADD));
    const radius = 72;
    const points = Array.from({ length: 6 }, (_, index) => new Phaser.Math.Vector2(
      x + Math.cos(Phaser.Math.DegToRad(index * 60 - 90)) * radius,
      y + Math.sin(Phaser.Math.DegToRad(index * 60 - 90)) * radius,
    ));
    barrier.fillStyle(spec.colours.mirror, 0.2).fillPoints(points, true);
    barrier.lineStyle(5, spec.colours.white, 0.9).strokePoints(points, true);
    barrier.lineStyle(2, spec.colours.blue, 0.9).strokeCircle(x, y, radius * 0.72);
    const ripple = this.track(this.scene.add.circle(x, y, radius * 0.4, spec.colours.mirror, 0.18).setDepth(8).setBlendMode(Phaser.BlendModes.ADD));
    this.scene.tweens.add({ targets: [barrier, ripple], scale: 1.34, alpha: 0, duration: 480, delay: 80, ease: "Sine.easeOut", onComplete: () => barrier.destroy() });
    this.scene.tweens.add({ targets: ripple, scale: 1.5, alpha: 0, duration: 500, ease: "Sine.easeOut", onComplete: () => ripple.destroy() });
  }

  private pulseFromDemas(color: number, alpha: number, duration: number): void {
    const pulse = this.track(this.scene.add.circle(this.baseX, this.baseY, Math.max(this.sprite.displayWidth, this.sprite.displayHeight) * 0.26, color, alpha).setDepth(4).setBlendMode(Phaser.BlendModes.ADD));
    this.scene.tweens.add({ targets: pulse, scale: 2.8, alpha: 0, duration, ease: "Sine.easeOut", onComplete: () => pulse.destroy() });
  }

  private defer(delay: number, callback: () => void): void {
    const event = this.scene.time.delayedCall(delay, () => {
      if (!this.disposed) callback();
    });
    this.delayedCalls.push(event);
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.transientObjects.push(object);
    return object;
  }

  private clearTransient(): void {
    for (const object of this.transientObjects) {
      this.scene.tweens.killTweensOf(object);
      if (object.active) object.destroy();
    }
    this.transientObjects = [];
  }
}
