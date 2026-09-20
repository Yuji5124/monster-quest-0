import Phaser from "phaser";
import { MAPS, MAP_TRANSITION_FADE_MS } from "../config/maps.ts";
import { Player } from "../entities/Player.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { PartyFollowers } from "../systems/PartyFollowers.ts";
import { buildCollisionRects, createImageMapCollision, readCollisionMaskImageData } from "../systems/ImageMapCollision.ts";
import type { ImageMapCollisionRuntime } from "../systems/ImageMapCollision.ts";
import { readImageMapEvents, readImageMapManifest, readImageMapObjects, scaleRect } from "../systems/ImageMapData.ts";
import type { ImageMapEvent } from "../systems/ImageMapData.ts";
import { configureMapCamera } from "../systems/MapCamera.ts";
import { beginMapTransition } from "../systems/MapTransition.ts";
import { PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { TAROSA_SPRITE } from "../config/tarosaSprite.ts";
import { MIREI_SPRITE } from "../config/mireiSprite.ts";
import { ensureWalkAnimations, preloadWalkSprite } from "../systems/CharacterWalkSprite.ts";
import { FieldMenu } from "../ui/FieldMenu.ts";
import { DISPLAY } from "../config/display.ts";
import { OPENING_CAMPFIRE, OPENING_CAMPFIRE_NARRATION } from "../config/openingCampfire.ts";
import { openingCampfireAudio } from "../systems/OpeningCampfireAudio.ts";

const MAP_ID = "map_01_starting_place";
const MANIFEST_KEY = "image-map.no01.manifest";
const BACKGROUND_KEY = "image-map.no01.background";
const COLLISION_KEY = "image-map.no01.collision";
const EVENTS_KEY = "image-map.no01.events";
const OBJECTS_KEY = "image-map.no01.objects";

const MANIFEST_PATH = new URL("../../assets/maps/starting_place/map.json", import.meta.url).toString();
const BACKGROUND_PATH = new URL("../../assets/maps/starting_place/background.png", import.meta.url).toString();
const COLLISION_PATH = new URL("../../assets/maps/starting_place/collision.png", import.meta.url).toString();
const EVENTS_PATH = new URL("../../assets/maps/starting_place/events.json", import.meta.url).toString();
const OBJECTS_PATH = new URL("../../assets/maps/starting_place/objects.json", import.meta.url).toString();

const isDevMode = typeof import.meta.env !== "undefined" && import.meta.env.DEV;

// assets/maps/starting_place/background.png上の焚き火の中心。主人公のopening spawnと同じ
// ピクセル座標系で、導入中は主人公が動かないため画面上の光源位置は固定できる。
const CAMPFIRE_WORLD_POSITION = { x: 725, y: 515 } as const;

export interface StartingPlaceSceneData {
  readonly spawnId?: string;
  /** タイトルの「はじめから」だけがNo.01の導入演出を再生する。通常の再入場では再生しない。 */
  readonly openingSequence?: boolean;
}

/**
 * No.01「はじまりのばしょ」の正式ランタイム。
 * BACKGROUND / COLLISION / EVENT / OBJECT は assets/maps/starting_place/ の背景ピクセル座標を
 * 共通の正本として読む。Tiled版は LegacyTiledStartingPlaceScene と MapTestNo01Scene に保持する。
 */
export class StartingPlaceScene extends Phaser.Scene {
  private actions!: InputSystem;
  private player!: Player;
  private collisionRuntime!: ImageMapCollisionRuntime;
  private fieldMenu!: FieldMenu;
  private notice?: Phaser.GameObjects.Text;
  private consumedEventIds = new Set<string>();
  private transitioning = false;
  private openingInputLocked = false;
  private openingAmbienceActive = false;

  constructor(sceneKey = "StartingPlaceScene") {
    super({ key: sceneKey, physics: { arcade: { gravity: { x: 0, y: 0 } } } });
  }

  preload(): void {
    this.load.json(MANIFEST_KEY, MANIFEST_PATH);
    this.load.image(BACKGROUND_KEY, BACKGROUND_PATH);
    this.load.image(COLLISION_KEY, COLLISION_PATH);
    this.load.json(EVENTS_KEY, EVENTS_PATH);
    this.load.json(OBJECTS_KEY, OBJECTS_PATH);
    preloadWalkSprite(this, PROTAGONIST_SPRITE);
    preloadWalkSprite(this, TAROSA_SPRITE);
    preloadWalkSprite(this, MIREI_SPRITE);
  }

  create(data?: StartingPlaceSceneData): void {
    this.transitioning = false;
    this.consumedEventIds.clear();
    this.openingInputLocked = data?.openingSequence === true;
    this.openingAmbienceActive = false;
    const manifest = readImageMapManifest(this.cache.json.get(MANIFEST_KEY));
    if (manifest.id !== MAP_ID || manifest.assetStatus !== "CURRENT") {
      throw new Error(`StartingPlaceScene requires the CURRENT ${MAP_ID} image-map package`);
    }
    const events = readImageMapEvents(this.cache.json.get(EVENTS_KEY));
    const objects = readImageMapObjects(this.cache.json.get(OBJECTS_KEY));
    const worldScale = manifest.worldScale;

    // 高解像度背景は縮小時も輪郭を保つため、pixelArt全体設定から独立してLINEARで表示する。
    this.textures.get(BACKGROUND_KEY).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const background = this.add.image(0, 0, BACKGROUND_KEY).setOrigin(0, 0);
    if (background.width !== manifest.width || background.height !== manifest.height) {
      throw new Error(`background dimensions ${background.width}x${background.height} do not match ${manifest.width}x${manifest.height}`);
    }
    // background.pngはネイティブ解像度のまま(参照画像とバイト一致)を変更せず、worldScaleぶんだけ拡大表示する。
    background.setScale(worldScale);

    const mask = readCollisionMaskImageData(this, COLLISION_KEY);
    if (mask.width !== manifest.width || mask.height !== manifest.height) {
      throw new Error(`collision dimensions ${mask.width}x${mask.height} do not match ${manifest.width}x${manifest.height}`);
    }
    // Collision矩形はネイティブ座標で生成し、worldScaleを掛けてから物理Bodyへ渡す(元マスクの形状は維持)。
    const collisionRects = buildCollisionRects(mask, manifest.collisionCellSize).map((rect) => scaleRect(rect, worldScale));
    this.collisionRuntime = createImageMapCollision(
      this,
      collisionRects,
      isDevMode && new URLSearchParams(window.location.search).get("collisionDebug") === "1",
    );
    this.physics.world.setBounds(0, 0, manifest.width * worldScale, manifest.height * worldScale);

    ensureWalkAnimations(this, PROTAGONIST_SPRITE);
    const mapConfig = MAPS[MAP_ID];
    const spawn = mapConfig.spawns[data?.spawnId ?? "opening"] ?? mapConfig.spawns.opening;
    this.player = new Player(this, spawn.x * worldScale, spawn.y * worldScale, spawn.facing);
    this.player.setDepth(1000);
    new PartyFollowers(this, this.player);
    for (const body of this.collisionRuntime.bodies) this.physics.add.collider(this.player.body, body);

    // Objectの判定は背景と別レイヤーに保つ。正式表示は各Object種別の実装時に追加し、
    // 開発中だけ矩形を可視化する。
    for (const object of objects) {
      const bounds = scaleRect(object, worldScale);
      const marker = this.add.rectangle(bounds.x, bounds.y, bounds.width, bounds.height, 0x35b7d4, 1);
      marker.setDepth(800).setVisible(isDevMode);
      addStaticBody(this, marker);
      if (object.blocking) this.physics.add.collider(this.player.body, marker.body as Phaser.Physics.Arcade.StaticBody);
    }

    for (const event of events) {
      const bounds = scaleRect(event.bounds, worldScale);
      const zone = this.add.rectangle(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
        bounds.width,
        bounds.height,
        0x000000,
        0,
      );
      addStaticBody(this, zone);
      this.physics.add.overlap(this.player.body, zone.body as Phaser.Physics.Arcade.StaticBody, () => this.handleEvent(event));
    }

    configureMapCamera(this, this.player.visual, { x: 0, y: 0, width: manifest.width * worldScale, height: manifest.height * worldScale });
    if (this.openingInputLocked) this.frameOpeningCamera();
    this.cameras.main.setBackgroundColor("#101018");
    if (!this.openingInputLocked) this.cameras.main.fadeIn(MAP_TRANSITION_FADE_MS, 0, 0, 0);

    if (isDevMode) {
      this.notice = this.add.text(20, 20, "画像マップ  D: Collision表示", {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "20px",
        stroke: "#121620",
        strokeThickness: 5,
      }).setScrollFactor(0).setDepth(2000);
    }

    this.fieldMenu = new FieldMenu(this);
    this.actions = new InputSystem(window, document);
    if (this.openingInputLocked) this.actions.setLocked(true);
    const movePlayer = (): void => {
      if (this.openingInputLocked) {
        this.player.body.setVelocity(0, 0);
        return;
      }
      if (this.fieldMenu.isOpen) {
        this.fieldMenu.handleInput(this.actions);
        return;
      }
      if (!this.transitioning && this.actions.consumePressed("menu")) {
        this.fieldMenu.open();
        return;
      }
      this.player.update(this.actions);
    };
    const toggleCollision = (keyboardEvent: KeyboardEvent): void => {
      if (!isDevMode || keyboardEvent.code !== "KeyD" || keyboardEvent.repeat || keyboardEvent.ctrlKey || keyboardEvent.metaKey || keyboardEvent.altKey) return;
      this.collisionRuntime.setDebugVisible(!this.collisionRuntime.isDebugVisible());
      this.setNotice(`Collision: ${this.collisionRuntime.isDebugVisible() ? "ON" : "OFF"}  D: 表示切替`);
    };
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, movePlayer);
    window.addEventListener("keydown", toggleCollision);

    const cleanup = (): void => {
      this.actions.destroy();
      window.removeEventListener("keydown", toggleCollision);
      this.events.off(Phaser.Scenes.Events.PRE_UPDATE, movePlayer);
      if (this.openingAmbienceActive) {
        openingCampfireAudio.stop();
        this.openingAmbienceActive = false;
      }
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    if (isDevMode) {
      (window as unknown as { __startingPlaceImageMap?: unknown }).__startingPlaceImageMap = {
        scene: this,
        player: this.player,
        collisionRectCount: collisionRects.length,
        setCollisionVisible: (visible: boolean): void => this.collisionRuntime.setDebugVisible(visible),
      };
      // eslint-disable-next-line no-console
      console.log(`[IMAGE_MAP] ${manifest.id} loaded: ${manifest.width}x${manifest.height}, collisionRects=${collisionRects.length}`);
    }

    if (this.openingInputLocked) this.startOpeningCampfireSequence();
  }

  /** タイトル後だけ再生する、No.01の焚き火から自由歩行へ入る導入。 */
  private startOpeningCampfireSequence(): void {
    this.openingAmbienceActive = true;
    // 初めは横を向かせ、ナレーション後に焚き火（北）へ小さく視線を戻す。
    this.player.setFacing("left");

    const nightVeil = this.add
      .rectangle(DISPLAY.width / 2, DISPLAY.height / 2, DISPLAY.width, DISPLAY.height, 0x000000, 1)
      .setScrollFactor(0)
      .setDepth(4000);
    const fireScreenPosition = {
      x: CAMPFIRE_WORLD_POSITION.x - this.cameras.main.scrollX,
      y: CAMPFIRE_WORLD_POSITION.y - this.cameras.main.scrollY,
    };
    const fireHaloOuter = this.add
      .circle(fireScreenPosition.x, fireScreenPosition.y, 150, 0xd3481b, 0)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4001);
    const fireHaloInner = this.add
      .circle(fireScreenPosition.x, fireScreenPosition.y, 68, 0xff9d26, 0)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4002);
    const narrationPanel = this.add
      .rectangle(DISPLAY.width / 2, DISPLAY.height - 108, DISPLAY.width - 104, 128, 0x07101b, 0)
      .setScrollFactor(0)
      .setDepth(4010);
    const narrationText = this.add
      .text(DISPLAY.width / 2, DISPLAY.height - 108, "", {
        align: "center",
        color: "#f5efe2",
        fontFamily: "serif",
        fontSize: "27px",
        lineSpacing: 9,
        stroke: "#07101b",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(4011)
      .setAlpha(0);

    // 0:00は完全な暗闇・無音。約0.7秒後から、火と遠い風だけを先に感じさせる。
    this.time.delayedCall(OPENING_CAMPFIRE.initialSilenceMs, () => {
      openingCampfireAudio.startFireAndWind();
      this.tweens.add({ targets: nightVeil, alpha: 0.84, duration: 1100, ease: "Sine.easeOut" });
      this.tweens.add({ targets: fireHaloOuter, alpha: 0.29, duration: 1100, ease: "Sine.easeOut" });
      this.tweens.add({ targets: fireHaloInner, alpha: 0.42, duration: 900, ease: "Sine.easeOut" });
    });
    // 0:02〜0:07で火→主人公→周囲の草木・水辺・山の順に見えてくる。最後まで夜の暗さを残す。
    this.time.delayedCall(OPENING_CAMPFIRE.revealStartMs, () => {
      this.tweens.add({
        targets: nightVeil,
        alpha: OPENING_CAMPFIRE.nightVeilAlpha,
        duration: OPENING_CAMPFIRE.revealDurationMs,
        ease: "Sine.easeInOut",
      });
      this.tweens.add({ targets: fireHaloOuter, alpha: 0.42, duration: OPENING_CAMPFIRE.revealDurationMs, ease: "Sine.easeInOut" });
      this.tweens.add({ targets: fireHaloInner, alpha: 0.58, duration: OPENING_CAMPFIRE.revealDurationMs, ease: "Sine.easeInOut" });
    });
    // 火の輪郭は最初から少しだけ揺らす。明るさの揺れは7秒の露出完了後に始め、
    // 明転用Tweenと競合させない。
    this.tweens.add({ targets: fireHaloOuter, scaleX: 1.08, scaleY: 0.92, duration: 920, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.time.delayedCall(OPENING_CAMPFIRE.narrationStartMs, () => {
      this.tweens.add({ targets: fireHaloInner, alpha: 0.46, duration: 680, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    });
    this.time.delayedCall(OPENING_CAMPFIRE.narrationStartMs, () => {
      this.playOpeningNarration(narrationText, narrationPanel, 0);
    });
  }

  private playOpeningNarration(
    narrationText: Phaser.GameObjects.Text,
    narrationPanel: Phaser.GameObjects.Rectangle,
    lineIndex: number,
  ): void {
    if (lineIndex >= OPENING_CAMPFIRE_NARRATION.length) {
      this.time.delayedCall(OPENING_CAMPFIRE.fireOnlyMs, () => this.showProtagonistOpeningLine(narrationText, narrationPanel));
      return;
    }
    const isLastLine = lineIndex === OPENING_CAMPFIRE_NARRATION.length - 1;
    const fadeOutMs = isLastLine ? OPENING_CAMPFIRE.narrationEndFadeMs : OPENING_CAMPFIRE.narrationFadeMs;
    const holdMs = OPENING_CAMPFIRE.narrationLineMs - OPENING_CAMPFIRE.narrationFadeMs - fadeOutMs;
    narrationText.setText(OPENING_CAMPFIRE_NARRATION[lineIndex]);
    this.tweens.add({
      targets: narrationPanel,
      alpha: 0.78,
      duration: OPENING_CAMPFIRE.narrationFadeMs,
      ease: "Sine.easeOut",
    });
    this.tweens.add({
      targets: narrationText,
      alpha: 1,
      duration: OPENING_CAMPFIRE.narrationFadeMs,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.time.delayedCall(holdMs, () => {
          this.tweens.add({
            targets: [narrationText, narrationPanel],
            alpha: 0,
            duration: fadeOutMs,
            ease: "Sine.easeIn",
            onComplete: () => this.playOpeningNarration(narrationText, narrationPanel, lineIndex + 1),
          });
        });
      },
    });
  }

  private showProtagonistOpeningLine(narrationText: Phaser.GameObjects.Text, narrationPanel: Phaser.GameObjects.Rectangle): void {
    // 焚き火が主人公の北にあるため、上向きの直立フレームで小さな視線の変化を示す。
    this.player.setFacing("up");
    this.time.delayedCall(OPENING_CAMPFIRE.lookPauseMs, () => {
      narrationText.setText("…………。");
      this.tweens.add({
        targets: narrationPanel,
        alpha: 0.78,
        duration: OPENING_CAMPFIRE.protagonistLineFadeInMs,
        ease: "Sine.easeOut",
      });
      this.tweens.add({
        targets: narrationText,
        alpha: 1,
        duration: OPENING_CAMPFIRE.protagonistLineFadeInMs,
        ease: "Sine.easeOut",
        onComplete: () => {
          this.time.delayedCall(OPENING_CAMPFIRE.protagonistLineMs, () => {
            this.tweens.add({
              targets: [narrationText, narrationPanel],
              alpha: 0,
              duration: OPENING_CAMPFIRE.protagonistLineFadeMs,
              ease: "Sine.easeIn",
              onComplete: () => this.releaseOpeningControl(),
            });
          });
        },
      });
    });
  }

  private releaseOpeningControl(): void {
    this.openingInputLocked = false;
    // 導入中だけ見せた遠景フレームから、通常の主人公追従へ戻す。
    const worldBounds = this.physics.world.bounds;
    configureMapCamera(this, this.player.visual, {
      x: worldBounds.x,
      y: worldBounds.y,
      width: worldBounds.width,
      height: worldBounds.height,
    });
    this.actions.setLocked(false);
    // 操作可能になってもBGMは入れず、火・風にだけ水辺の環境音を重ねる。
    openingCampfireAudio.enableFieldAmbience();
  }

  /** 主人公と焚き火を残しつつ、右奥の山と水辺を上側へ入れる導入専用の固定フレーム。 */
  private frameOpeningCamera(): void {
    const camera = this.cameras.main;
    camera.stopFollow();
    const bounds = this.physics.world.bounds;
    const scrollX = Phaser.Math.Clamp(this.player.visual.x - DISPLAY.width / 2, bounds.x, bounds.right - camera.width);
    const scrollY = Phaser.Math.Clamp(this.player.visual.y - DISPLAY.height / 2 - 110, bounds.y, bounds.bottom - camera.height);
    camera.setScroll(scrollX, scrollY);
  }

  private handleEvent(event: ImageMapEvent): void {
    if (event.once && this.consumedEventIds.has(event.id)) return;
    this.consumedEventIds.add(event.id);
    const command = event.commands[0];
    if (command.type === "message") {
      this.setNotice(command.text);
      return;
    }
    if (this.transitioning) return;
    this.transitioning = true;
    if (command.type === "world-map") {
      beginMapTransition(this, this.actions, "WorldMapScene", { worldMapEntryId: command.worldMapEntryId }, MAP_TRANSITION_FADE_MS);
      return;
    }
    const target = MAPS[command.targetMapId as keyof typeof MAPS];
    if (!target || !target.spawns[command.targetSpawnId]) {
      throw new Error(`image-map transfer ${event.id} has an unknown target ${command.targetMapId}/${command.targetSpawnId}`);
    }
    beginMapTransition(this, this.actions, target.sceneKey, { spawnId: command.targetSpawnId }, MAP_TRANSITION_FADE_MS);
  }

  private setNotice(message: string): void {
    this.notice?.setText(message);
  }
}

function addStaticBody(scene: Phaser.Scene, object: Phaser.GameObjects.Rectangle): void {
  scene.physics.add.existing(object, true);
}
