import Phaser from "phaser";
import type * as ThreeTypes from "three";
import { DISPLAY } from "../config/display.ts";
import type { InputAction } from "../config/input.ts";
import { MAPS, MAP_TRANSITION_FADE_MS } from "../config/maps.ts";
import type { NpcDefinition } from "../config/maps.ts";
import { NPC_VISUAL } from "../config/npc.ts";
import { chooseCastle3DQualityProfile, RAINLAND_CASTLE_3D, RAINLAND_THRONE_ROOM_3D } from "../config/rainlandCastle3D.ts";
import type { Castle3DConfig, Castle3DProp, Castle3DQuality, Castle3DRect, Castle3DWallDecor } from "../config/rainlandCastle3D.ts";
import { buildOccupancy, meshVoxelBoxes } from "../systems/Castle3DMesher.ts";
import type { VoxelBox } from "../systems/Castle3DMesher.ts";
import { getDialogue } from "../data/dialogues.ts";
import {
  buildBlockedCellGrid, buildVoxelLayout, findWallFace, floorHeightAt, moveWithSlide,
  VOXEL_FLOOR, VOXEL_VOID, VOXEL_WALL,
} from "../systems/Castle3DLayout.ts";
import type { BlockedCellGrid, VoxelLayout } from "../systems/Castle3DLayout.ts";
import { drawCarpetTexture, drawCastle3DTexture, drawGlowTexture, drawLightShaftTexture, drawStoneFloorTexture } from "../systems/Castle3DTextures.ts";
import { choosePilasterSpots, chooseVineSpots, faceNormal, findWallFaceSpots } from "../systems/Castle3DArchitecture.ts";
import { animateCharacter, buildCharacter } from "../systems/Castle3DCharacterModel.ts";
import type { CharacterRig } from "../systems/Castle3DCharacterModel.ts";
import type { Castle3DTextureId } from "../systems/Castle3DTextures.ts";
import {
  facingToYaw, feetHalfSize, feetToSprite, forwardVector, normalizeYaw, spriteToFeet, yawToFacing,
} from "../systems/CastleViewToggle.ts";
import type { ViewToggleData } from "../systems/CastleViewToggle.ts";
import { readCollisionMaskImageData } from "../systems/ImageMapCollision.ts";
import { readImageMapEvents, readImageMapManifest } from "../systems/ImageMapData.ts";
import type { ImageMapEvent } from "../systems/ImageMapData.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { beginMapTransition } from "../systems/MapTransition.ts";
import type { Facing } from "../systems/PlayerMovement.ts";
import { DialogueBox } from "../ui/DialogueBox.ts";
import { FieldMenu } from "../ui/FieldMenu.ts";
import { RAINLAND_CASTLE_PACKAGE } from "./RainlandCastleScene.ts";
import { RAINLAND_THRONE_ROOM_PACKAGE } from "./RainlandThroneRoomScene.ts";
import type { RainlandMapPackage } from "./RainlandForestScene.ts";

type Three = typeof ThreeTypes;

export const RAINLAND_CASTLE_3D_SCENE_KEY = "RainlandCastle3DScene";
export const RAINLAND_THRONE_ROOM_3D_SCENE_KEY = "RainlandThroneRoom3DScene";
const HUD_DEPTH = 1800;
const MINIMAP = { x: DISPLAY.width - 204, y: 104, width: 188 } as const;
const isDevMode = typeof import.meta.env !== "undefined" && import.meta.env.DEV;

interface ThreeView {
  readonly three: Three;
  readonly renderer: ThreeTypes.WebGLRenderer;
  readonly world: ThreeTypes.Scene;
  readonly camera: ThreeTypes.PerspectiveCamera;
  readonly npcRigs: Map<string, CharacterRig>;
  /** 漂うほこり(位置を毎フレーム少しずつ動かす)。 */
  readonly dust?: { readonly geometry: ThreeTypes.BufferGeometry; readonly base: Float32Array };
  /** ゆらぐ炎(ランタンの光源・光の輪)。 */
  readonly flickers: readonly Flicker[];
  readonly disposables: { dispose(): void }[];
}

interface Flicker {
  readonly light?: ThreeTypes.PointLight;
  readonly sprite?: ThreeTypes.Sprite;
  readonly baseIntensity: number;
  readonly baseScale: number;
  readonly phase: number;
}

interface NpcBlocker {
  readonly definition: NpcDefinition;
  readonly rect: Castle3DRect;
}

/**
 * ブロック城の3D表示(一人称で歩く)。城内(RainlandCastle3DScene)と王の間(RainlandThroneRoom3DScene)が共通で使う。
 * 2Dの同じマップ(RainlandMapPackage)と同じcollision.png・NPC・Event・台詞を使い、見た目だけをthree.jsのブロックで描く。
 * マップごとの違い(絨毯・壁飾り・置物・ランタン・人物・壇)は`config/rainlandCastle3D.ts`のCastle3DConfigだけに書く。
 * - 歩ける場所: 2Dと同じ8pxセルの判定(Castle3DLayout)。3Dの壁ブロックは判定に使わないので、2Dと完全に一致する。
 * - 切替: V/「2D」ボタンで、今いる場所・向きのまま2Dへ戻る(2D側はV/「3D」ボタン)。
 * - 描画: three.jsは画面の半分の解像度でオフスクリーンのCanvasへ描き、そのCanvasをPhaserのテクスチャとして毎フレーム更新して
 *   全画面に表示する。会話ウィンドウ・メニュー・ミニマップ・タッチボタンは通常どおりPhaserで重ねる。
 * - three.jsはこのSceneに入ったときだけ読み込む(dynamic import)。WebGLが使えない等で失敗したら同じ場所の2Dへ戻す。
 */
export class Castle3DScene extends Phaser.Scene {
  private readonly pkg: RainlandMapPackage;
  private readonly cfg: Castle3DConfig;
  private readonly viewTextureKey: string;
  private actions!: InputSystem;
  private fieldMenu!: FieldMenu;
  private dialogueBox!: DialogueBox;
  private notice!: Phaser.GameObjects.Text;
  private minimapMarker!: Phaser.GameObjects.Graphics;
  private grid!: BlockedCellGrid;
  private layout!: VoxelLayout;
  private worldScale = 1;
  private half = 8;
  private feet = { x: 0, y: 0 };
  private yaw = 0;
  private eyeFloor = 0;
  private bobPhase = 0;
  private npcs: NpcBlocker[] = [];
  private mapEvents: ImageMapEvent[] = [];
  private readonly consumedEventIds = new Set<string>();
  private readonly held = new Set<InputAction>();
  private transitioning = false;
  private view?: ThreeView;
  /** 3D組み立て中だけ使う、光の輪を置く関数(buildViewが用意する)。 */
  private glow?: (x: number, y: number, z: number, size: number) => void;
  /** 描画品質(端末に合わせてbuildViewで決める)。 */
  private quality!: Castle3DQuality;

  constructor(sceneKey: string, pkg: RainlandMapPackage, cfg: Castle3DConfig) {
    super({ key: sceneKey });
    this.pkg = pkg;
    this.cfg = cfg;
    this.viewTextureKey = `${sceneKey}.view`;
  }

  preload(): void {
    // 2Dの同じマップと同じキーで読む。先に2Dを通っていればキャッシュ済みなので読み直さない。
    const key = this.pkg.keyPrefix;
    if (!this.cache.json.exists(`${key}.manifest`)) this.load.json(`${key}.manifest`, this.pkg.manifestPath);
    if (!this.cache.json.exists(`${key}.events`)) this.load.json(`${key}.events`, this.pkg.eventsPath);
    if (!this.textures.exists(`${key}.collision`)) this.load.image(`${key}.collision`, this.pkg.collisionPath);
    if (!this.textures.exists(`${key}.background`)) this.load.image(`${key}.background`, this.pkg.backgroundPath);
  }

  create(data?: Partial<ViewToggleData> & { readonly spawnId?: string }): void {
    this.transitioning = false;
    this.consumedEventIds.clear();
    this.held.clear();
    this.view = undefined;

    const key = this.pkg.keyPrefix;
    const manifest = readImageMapManifest(this.cache.json.get(`${key}.manifest`));
    if (manifest.id !== this.pkg.mapId) throw new Error(`${this.scene.key} requires the ${this.pkg.mapId} image-map package`);
    this.worldScale = manifest.worldScale;
    this.half = feetHalfSize(this.worldScale);
    this.grid = buildBlockedCellGrid(readCollisionMaskImageData(this, `${key}.collision`), manifest.collisionCellSize);
    this.layout = buildCastle3DLayout(this.grid, this.cfg);
    this.mapEvents = readImageMapEvents(this.cache.json.get(`${key}.events`));

    const mapConfig = MAPS[this.pkg.mapId];
    // NPCの当たり判定は2DのNpc(NPC_VISUALの矩形、ランタイムpx)と同じ大きさをネイティブpxへ直したもの。
    this.npcs = mapConfig.npcs.map((definition) => {
      const width = NPC_VISUAL.width / this.worldScale;
      const height = NPC_VISUAL.height / this.worldScale;
      return { definition, rect: { x: definition.position.x - width / 2, y: definition.position.y - height / 2, width, height } };
    });

    if (typeof data?.spawnX === "number" && typeof data?.spawnY === "number") {
      this.feet = spriteToFeet(data.spawnX, data.spawnY, this.worldScale);
      this.yaw = data.spawnYaw ?? facingToYaw(data.spawnFacing ?? "up");
    } else {
      const spawn = mapConfig.spawns[data?.spawnId ?? this.pkg.defaultSpawnId] ?? mapConfig.spawns[this.pkg.defaultSpawnId];
      this.feet = spriteToFeet(spawn.x * this.worldScale, spawn.y * this.worldScale, this.worldScale);
      this.yaw = facingToYaw(spawn.facing);
    }
    this.eyeFloor = floorHeightAt(this.layout, this.feet.x, this.feet.y);

    this.cameras.main.setBackgroundColor("#101018");
    const loading = this.add.text(DISPLAY.width / 2, DISPLAY.height / 2, "ブロックのしろを　くみたて中…", {
      color: "#ffffff", fontFamily: "monospace", fontSize: "22px",
    }).setOrigin(0.5).setDepth(HUD_DEPTH);
    this.createHud();
    this.fieldMenu = new FieldMenu(this);
    this.dialogueBox = new DialogueBox(this);
    this.actions = new InputSystem(window, document);
    this.actions.setLocked(true);

    const cleanup = (): void => {
      this.actions.destroy();
      this.disposeView();
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    void this.buildView().then((view) => {
      loading.destroy();
      if (!this.sys.isActive()) {
        disposeThreeView(view);
        return;
      }
      this.view = view;
      // CanvasTextureは2Dコンテキストを要求するため使えない(three.jsのCanvasはWebGL)。汎用Textureにして__BASEフレームを足す。
      const canvasElement = view.renderer.domElement;
      const texture = this.textures.create(this.viewTextureKey, canvasElement as unknown as HTMLImageElement, canvasElement.width, canvasElement.height);
      if (!texture) throw new Error(`texture ${this.viewTextureKey} already exists`);
      texture.add("__BASE", 0, 0, 0, canvasElement.width, canvasElement.height);
      // 等倍なら画素がそのまま一致するのでNEAREST、縮小/拡大表示するときだけLINEARでなめらかにする。
      texture.setFilter(this.cfg.renderScale === 1 ? Phaser.Textures.FilterMode.NEAREST : Phaser.Textures.FilterMode.LINEAR);
      this.add.image(0, 0, this.viewTextureKey).setOrigin(0, 0).setDisplaySize(DISPLAY.width, DISPLAY.height).setDepth(-10);
      this.addVignette();
      this.renderView();
      this.actions.setLocked(false);
      this.cameras.main.fadeIn(MAP_TRANSITION_FADE_MS, 0, 0, 0);
      if (isDevMode) {
        (window as unknown as { __rainlandCastle3D?: unknown }).__rainlandCastle3D = {
          scene: this,
          state: (): { feet: { x: number; y: number }; yaw: number; transitioning: boolean } => ({ feet: { ...this.feet }, yaw: this.yaw, transitioning: this.transitioning }),
          walk: (seconds: number, forward = 1): void => this.simulateWalk(seconds, forward),
          turn: (radians: number): void => { this.yaw = normalizeYaw(this.yaw + radians); },
        };
        // eslint-disable-next-line no-console
        console.log(`[CASTLE_3D] built: ${this.layout.columns}x${this.layout.rows} blocks, spawn feet=(${this.feet.x.toFixed(1)}, ${this.feet.y.toFixed(1)})`);
      }
    }).catch((error: unknown) => {
      // WebGLが使えない端末などでは、同じ場所の2Dへ戻して遊び続けられるようにする(本当のエラー画面は出さない)。
      console.error("[CASTLE_3D] 3D view could not be created; returning to 2D.", error);
      if (this.sys.isActive()) this.switchTo2D();
    });
  }

  update(_time: number, delta: number): void {
    if (!this.view) return;
    const seconds = Math.min(delta, 50) / 1000;
    if (this.dialogueBox.isOpen) {
      // 会話・メニュー中に押された2D/3D切替は捨てる(閉じた瞬間に勝手に切り替わらないように)。
      this.actions.consumePressed("view");
      if (this.actions.consumePressed("confirm")) this.dialogueBox.advance();
    } else if (this.fieldMenu.isOpen) {
      this.actions.consumePressed("view");
      this.fieldMenu.handleInput(this.actions);
    } else if (!this.transitioning) {
      if (this.actions.consumePressed("menu")) {
        this.fieldMenu.open();
      } else if (this.actions.consumePressed("view")) {
        this.switchTo2D();
      } else {
        this.stepMovement(seconds);
        if (this.actions.consumePressed("confirm")) this.tryTalk();
      }
    }
    this.renderView(seconds);
  }

  /** 上下 = 前進/後退、左右 = 旋回。タッチボタンは押している間だけ動く。 */
  private stepMovement(seconds: number): void {
    const down = (action: InputAction): boolean => this.actions.isDown(action) || this.held.has(action);
    const turn = (down("moveLeft") ? 1 : 0) - (down("moveRight") ? 1 : 0);
    this.yaw = normalizeYaw(this.yaw + turn * this.cfg.turnSpeed * seconds);
    const drive = (down("moveUp") ? 1 : 0) - (down("moveDown") ? 1 : 0);
    if (drive === 0) return;
    this.walk(drive * this.cfg.moveSpeed * seconds);
    this.bobPhase += seconds * 9;
  }

  private walk(distance: number): void {
    const direction = forwardVector(this.yaw);
    this.feet = moveWithSlide(this.grid, this.feet, direction.x * distance, direction.y * distance, this.half, this.npcs.map((npc) => npc.rect));
    this.checkEvents();
  }

  /** DEV確認用: 入力なしで指定秒数ぶん歩かせる(ブラウザペインが非表示でゲームループが止まる環境の検証用)。 */
  private simulateWalk(seconds: number, forward: number): void {
    const step = 1 / 30;
    for (let t = 0; t < seconds && !this.transitioning; t += step) this.walk(forward * this.cfg.moveSpeed * step);
    this.renderView();
  }

  private checkEvents(): void {
    const box = { x: this.feet.x - this.half, y: this.feet.y - this.half, width: this.half * 2, height: this.half * 2 };
    for (const event of this.mapEvents) {
      const b = event.bounds;
      const overlaps = box.x < b.x + b.width && box.x + box.width > b.x && box.y < b.y + b.height && box.y + box.height > b.y;
      if (overlaps) this.handleEvent(event);
    }
  }

  /** 2Dの城(RainlandImageMapScene.handleEvent)と同じ扱い。城の出口は2Dのじょうかまちへ戻る。 */
  private handleEvent(event: ImageMapEvent): void {
    if (event.once && this.consumedEventIds.has(event.id)) return;
    this.consumedEventIds.add(event.id);
    const command = event.commands[0];
    if (command.type === "message") {
      if (isDevMode) this.notice.setText(command.text);
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

  /** 正面(±talkAngleDeg)で、足元の箱からtalkReach以内にいるNPCへ話しかける。NPCはこちらを向く。 */
  private tryTalk(): void {
    const forward = forwardVector(this.yaw);
    const maxAngle = (this.cfg.talkAngleDeg * Math.PI) / 180;
    const candidate = this.npcs
      .map((npc) => {
        const cx = npc.rect.x + npc.rect.width / 2;
        const cy = npc.rect.y + npc.rect.height / 2;
        const gapX = Math.max(0, Math.abs(cx - this.feet.x) - npc.rect.width / 2 - this.half);
        const gapY = Math.max(0, Math.abs(cy - this.feet.y) - npc.rect.height / 2 - this.half);
        const angle = Math.acos(Math.max(-1, Math.min(1, ((cx - this.feet.x) * forward.x + (cy - this.feet.y) * forward.y) / (Math.hypot(cx - this.feet.x, cy - this.feet.y) || 1))));
        return { npc, gap: Math.hypot(gapX, gapY), angle, cx, cy };
      })
      .filter((entry) => entry.gap <= this.cfg.talkReach && entry.angle <= maxAngle)
      .sort((a, b) => a.gap - b.gap)[0];
    if (!candidate) return;
    const dialogue = getDialogue(candidate.npc.definition.dialogueId);
    if (!dialogue) return;
    const rig = this.view?.npcRigs.get(candidate.npc.definition.id);
    if (rig) {
      // 話しかけられた人はこちらへ向き直る(体ごと、なめらかに)。
      rig.targetYaw = Math.atan2(this.feet.x - candidate.cx, this.feet.y - candidate.cy);
      rig.talking = true;
    }
    this.dialogueBox.open(dialogue.pages);
  }

  private switchTo2D(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.actions.setLocked(true);
    const sprite = feetToSprite(this.feet.x, this.feet.y, this.worldScale);
    const facing: Facing = yawToFacing(this.yaw);
    const data: ViewToggleData = { spawnX: sprite.x, spawnY: sprite.y, spawnFacing: facing };
    this.cameras.main.fadeOut(this.cfg.toggleFadeMs, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(MAPS[this.pkg.mapId].sceneKey, data));
  }

  /**
   * 画面の四隅をわずかに暗くする(視線が奥へ向き、奥行きが出る)。3Dの上・HUDの下に置く1枚の絵なので、描画負荷はほぼ無い。
   * three.jsの後処理にしないのは、霧の混ざり方が変わって従来の見た目(奥の扉まで見える)が崩れるため。
   */
  private addVignette(): void {
    const strength = this.quality.vignette;
    if (strength <= 0) return;
    const key = `castle3d.vignette.${strength}`;
    if (!this.textures.exists(key)) {
      const texture = this.textures.createCanvas(key, 240, 180);
      if (!texture) return;
      const context = texture.getContext();
      const gradient = context.createRadialGradient(120, 90, 50, 120, 90, 150);
      gradient.addColorStop(0, "rgba(8,6,12,0)");
      gradient.addColorStop(0.55, `rgba(8,6,12,${(strength * 0.35).toFixed(3)})`);
      gradient.addColorStop(1, `rgba(8,6,12,${strength.toFixed(3)})`);
      context.fillStyle = gradient;
      context.fillRect(0, 0, 240, 180);
      texture.refresh();
    }
    this.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(DISPLAY.width, DISPLAY.height).setDepth(-9);
  }

  private createHud(): void {
    this.notice = this.add.text(20, 20, `${this.cfg.title}  3D`, {
      color: "#ffffff", fontFamily: "monospace", fontSize: "20px", stroke: "#121620", strokeThickness: 5,
    }).setDepth(HUD_DEPTH);
    this.add.text(20, 48, "↑↓: まえ／うしろ  ←→: むきをかえる  Z: はなす  V: 2Dへ", {
      color: "#e8f0ff", fontFamily: "monospace", fontSize: "14px", stroke: "#121620", strokeThickness: 4,
    }).setDepth(HUD_DEPTH);

    // ミニマップ: 2Dの城の絵をそのまま縮小し、今いる場所と向きを示す(2Dと3Dが同じ城だと分かる)。
    const scale = MINIMAP.width / this.grid.width;
    const height = this.grid.height * scale;
    this.add.rectangle(MINIMAP.x - 4, MINIMAP.y - 4, MINIMAP.width + 8, height + 8, 0x0a0a14, 0.75).setOrigin(0, 0).setDepth(HUD_DEPTH);
    this.add.image(MINIMAP.x, MINIMAP.y, `${this.pkg.keyPrefix}.background`).setOrigin(0, 0).setScale(scale).setAlpha(0.92).setDepth(HUD_DEPTH + 1);
    this.minimapMarker = this.add.graphics().setDepth(HUD_DEPTH + 2);

    // タッチ操作(iPhone): 移動は押している間だけ、決定・メニュー・2D切替は1回押し。
    this.createTouchButton(DISPLAY.width - 52, 52, "2D", "view", 34, false);
    this.createTouchButton(86, DISPLAY.height - 150, "↑", "moveUp", 30, true);
    this.createTouchButton(86, DISPLAY.height - 54, "↓", "moveDown", 30, true);
    this.createTouchButton(30, DISPLAY.height - 102, "←", "moveLeft", 28, true);
    this.createTouchButton(142, DISPLAY.height - 102, "→", "moveRight", 28, true);
    this.createTouchButton(DISPLAY.width - 60, DISPLAY.height - 90, "Z", "confirm", 36, false);
    this.createTouchButton(DISPLAY.width - 150, DISPLAY.height - 60, "C", "menu", 26, false);
  }

  private createTouchButton(x: number, y: number, label: string, action: InputAction, radius: number, hold: boolean): void {
    const button = this.add.circle(x, y, radius, 0x172a4b, 0.72).setStrokeStyle(3, 0xd5e5ff, 0.85)
      .setDepth(HUD_DEPTH + 3).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { color: "#ffffff", fontFamily: "monospace", fontSize: `${Math.round(radius * 0.75)}px`, fontStyle: "bold" })
      .setOrigin(0.5).setDepth(HUD_DEPTH + 4);
    if (hold) {
      button.on("pointerdown", () => this.held.add(action));
      const release = (): void => { this.held.delete(action); };
      button.on("pointerup", release);
      button.on("pointerout", release);
    } else {
      button.on("pointerdown", () => this.actions.queuePressed(action));
    }
  }

  private renderView(seconds = 0): void {
    const view = this.view;
    if (!view) return;
    const blockSize = this.cfg.blockSize;
    // 階段では目の高さを段差に合わせてなめらかに上げ下げする。
    const targetFloor = floorHeightAt(this.layout, this.feet.x, this.feet.y);
    this.eyeFloor += (targetFloor - this.eyeFloor) * Math.min(1, seconds * 10 || 1);
    const bob = Math.sin(this.bobPhase) * 0.05;
    view.camera.position.set(this.feet.x / blockSize, this.cfg.eyeHeight + this.eyeFloor + bob, this.feet.y / blockSize);
    view.camera.rotation.set(0, this.yaw, 0);
    const now = this.time.now / 1000;
    const talking = this.dialogueBox.isOpen;
    for (const rig of view.npcRigs.values()) {
      if (!talking) rig.talking = false;
      animateCharacter(rig, now, seconds);
    }
    if (view.dust) {
      const positions = view.dust.geometry.getAttribute("position");
      const array = positions.array as Float32Array;
      for (let i = 0; i < array.length; i += 3) {
        const phase = view.dust.base[i] * 1.7 + view.dust.base[i + 2];
        array[i] = view.dust.base[i] + Math.sin(now * 0.3 + phase) * 0.35;
        array[i + 1] = view.dust.base[i + 1] + Math.sin(now * 0.22 + phase * 1.3) * 0.5;
        array[i + 2] = view.dust.base[i + 2] + Math.cos(now * 0.27 + phase) * 0.35;
      }
      positions.needsUpdate = true;
    }
    const flicker = this.quality.flicker;
    if (flicker > 0) {
      for (const item of view.flickers) {
        // 重ねた2つの揺れで、規則的に見えない炎のゆらぎにする。
        const wave = Math.sin(now * 7.3 + item.phase) * 0.6 + Math.sin(now * 13.1 + item.phase * 2.7) * 0.4;
        if (item.light) item.light.intensity = item.baseIntensity * (1 + wave * flicker);
        if (item.sprite) item.sprite.scale.setScalar(item.baseScale * (1 + wave * flicker * 0.5));
      }
    }
    view.renderer.render(view.world, view.camera);
    this.textures.get(this.viewTextureKey).source[0]?.update();
    this.drawMinimapMarker();
  }

  private drawMinimapMarker(): void {
    const scale = MINIMAP.width / this.grid.width;
    const x = MINIMAP.x + this.feet.x * scale;
    const y = MINIMAP.y + this.feet.y * scale;
    const forward = forwardVector(this.yaw);
    const side = { x: -forward.y, y: forward.x };
    const g = this.minimapMarker.clear();
    g.fillStyle(0xff4a3a, 1).lineStyle(2, 0xffffff, 1);
    g.fillTriangle(
      x + forward.x * 9, y + forward.y * 9,
      x - forward.x * 5 + side.x * 5, y - forward.y * 5 + side.y * 5,
      x - forward.x * 5 - side.x * 5, y - forward.y * 5 - side.y * 5,
    );
  }

  private disposeView(): void {
    if (this.view) disposeThreeView(this.view);
    this.view = undefined;
    if (this.textures.exists(this.viewTextureKey)) this.textures.remove(this.viewTextureKey);
  }

  private async buildView(): Promise<ThreeView> {
    const three: Three = await import("three");
    const cfg = this.cfg;
    const touchDevice = this.sys.game.device.input.touch;
    const quality = cfg.quality[chooseCastle3DQualityProfile(window.location.search, touchDevice, isDevMode)];
    this.quality = quality;
    const width = Math.round(DISPLAY.width * cfg.renderScale);
    const height = Math.round(DISPLAY.height * cfg.renderScale);
    const renderer = new three.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "default" });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.toneMapping = three.ACESFilmicToneMapping;
    renderer.toneMappingExposure = cfg.exposure * quality.exposureBoost;
    if (quality.shadows) {
      // 城は動かないので、影は読み込み時に一度だけ計算する(毎フレームの負担はほぼ0)。
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = three.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
    }
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const world = new three.Scene();
    world.background = new three.Color(cfg.fogColor);
    world.fog = new three.Fog(cfg.fogColor, cfg.fogNear, cfg.fogFar);
    const camera = new three.PerspectiveCamera(cfg.fov, width / height, 0.05, 160);
    camera.rotation.order = "YXZ";
    world.add(new three.HemisphereLight(cfg.light.skyColor, cfg.light.groundColor, cfg.light.hemisphere));
    // 天井があっても影は計算しないので、上からの暖かい日差しとして床と壁を明るく照らす(参考画像の日差し)。
    const sun = new three.DirectionalLight(cfg.light.sunColor, cfg.light.sun);
    // 光の向きは従来と同じ(-0.6, 1, 0.4)。影を落とすため、城の中心を狙う位置に置く。
    const centerX = this.layout.columns / 2;
    const centerZ = this.layout.rows / 2;
    const reach = Math.hypot(this.layout.columns, this.layout.rows) / 2 + 4;
    sun.position.set(centerX - 0.6 * reach, reach, centerZ + 0.4 * reach);
    sun.target.position.set(centerX, 0, centerZ);
    world.add(sun, sun.target);
    if (quality.shadows) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(quality.shadows.mapSize, quality.shadows.mapSize);
      sun.shadow.radius = quality.shadows.radius;
      sun.shadow.bias = quality.shadows.bias;
      sun.shadow.normalBias = quality.shadows.normalBias;
      const shadowCamera = sun.shadow.camera;
      shadowCamera.left = -reach;
      shadowCamera.right = reach;
      shadowCamera.top = reach;
      shadowCamera.bottom = -reach;
      shadowCamera.near = 0.5;
      shadowCamera.far = reach * 3;
      shadowCamera.updateProjectionMatrix();
    }

    const disposables: { dispose(): void }[] = [];
    const track = <T extends { dispose(): void }>(item: T): T => {
      disposables.push(item);
      return item;
    };
    type CanvasMaterialOptions = { transparent?: boolean; emissive?: number; side?: ThreeTypes.Side; gloss?: boolean; vertexColors?: boolean; bump?: boolean };
    const canvasMaterial = (source: HTMLCanvasElement, options: CanvasMaterialOptions = {}): ThreeTypes.Material => {
      const map = track(new three.CanvasTexture(source));
      // 近くはドット絵のままくっきり(Nearest)、遠く・斜めはミップマップと異方性フィルタでちらつきを抑える。
      map.magFilter = three.NearestFilter;
      map.minFilter = three.LinearMipmapLinearFilter;
      map.generateMipmaps = true;
      map.anisotropy = anisotropy;
      map.colorSpace = three.SRGBColorSpace;
      // 石の凹凸: 同じ絵の明暗をそのまま高さとして使う(目地が沈み、石の面が浮いて見える)。
      let bumpMap: ThreeTypes.Texture | null = null;
      if (options.bump && quality.bumpScale > 0) {
        bumpMap = track(new three.CanvasTexture(source));
        bumpMap.magFilter = three.NearestFilter;
        bumpMap.minFilter = three.LinearMipmapLinearFilter;
        bumpMap.anisotropy = anisotropy;
      }
      const bumpScale = quality.bumpScale;
      const vertexColors = options.vertexColors ?? false;
      if (options.gloss) {
        // 磨いた石の床: ランタンや日差しがうっすら映る。
        return track(new three.MeshPhongMaterial({ map, shininess: 46, specular: 0x3a3428, vertexColors, bumpMap, bumpScale }));
      }
      return track(new three.MeshLambertMaterial({
        map, transparent: options.transparent ?? false, alphaTest: options.transparent ? 0.5 : 0, side: options.side ?? three.FrontSide,
        emissive: options.emissive ?? 0x000000, vertexColors, bumpMap, bumpScale,
      }));
    };
    const textures = new Map<string, ThreeTypes.Material>();
    const material = (id: Castle3DTextureId, options: { transparent?: boolean; emissive?: number; side?: ThreeTypes.Side } = {}): ThreeTypes.Material => {
      const cacheKey = `${id}:${options.transparent ? 1 : 0}:${options.emissive ?? 0}`;
      const cached = textures.get(cacheKey);
      if (cached) return cached;
      const made = canvasMaterial(drawCastle3DTexture(id), options);
      textures.set(cacheKey, made);
      return made;
    };
    const colorMaterial = (color: number, emissive = 0x000000): ThreeTypes.Material =>
      track(new three.MeshLambertMaterial({ color, emissive }));
    const box = track(new three.BoxGeometry(1, 1, 1));

    // --- 床・絨毯・階段・壁・天井(同じ形のブロックはInstancedMeshでまとめて描く) ---
    const { columns, rows, kinds, carpet, floorHeight, wallDistance, carpetEdges, floorShade, stairMask, wallTop } = this.layout;
    const top = cfg.wallHeight;
    const emblemIndices = new Set(cfg.carpetEmblems.map((point) =>
      Math.floor(point.y / cfg.blockSize) * columns + Math.floor(point.x / cfg.blockSize)));
    // 置く箱は従来のInstancedMeshと同じ(位置・大きさ・材質)。まとめ方だけをCastle3DMesherに任せる。
    const boxes: VoxelBox[] = [];
    const push = (key: string, item: Omit<VoxelBox, "key">): void => {
      boxes.push({ key, ...item });
    };
    const cell = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): Omit<VoxelBox, "key"> => ({ x, y, z, sx, sy, sz });
    const matrix = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): ThreeTypes.Matrix4 =>
      new three.Matrix4().compose(new three.Vector3(x, y, z), new three.Quaternion(), new three.Vector3(sx, sy, sz));
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column;
        const x = column + 0.5;
        const z = row + 0.5;
        if (kinds[index] === VOXEL_FLOOR) {
          const rise = floorHeight[index];
          // 高さのある床は、床下まで埋まった柱として描く(上面が床)。階段は段の石、絨毯の上の段は絨毯のまま。
          const floorMatrix = rise > 0 ? cell(x, (rise - 1) / 2, z, 1, 1 + rise, 1) : cell(x, -0.5, z);
          const carpetKey = `carpet:${carpetEdges[index]}:${emblemIndices.has(index) ? 1 : 0}:${floorShade[index]}`;
          if (stairMask[index] && !carpet[index]) push("stairs", floorMatrix);
          else if (carpet[index]) push(carpetKey, floorMatrix);
          else push(`floor:${floorShade[index]}`, floorMatrix);
          // 天井: 壁から離れた所は青い格天井(市松)、壁ぎわは2段の張り出しで段々にする(参考画像の段々のアーチ)。
          const distance = wallDistance[index];
          const coffer = distance >= 3 && row % 4 >= 1 && row % 4 <= 2 && column % 4 >= 1 && column % 4 <= 2;
          push(coffer ? "ceiling_panel" : "ceiling", cell(x, top + 0.5, z));
          if (distance === 1) push("wall_trim", cell(x, top - 0.5, z));
          if (distance === 2) push("ceiling", cell(x, top - 0.25, z, 1, 0.5, 1));
        } else if (kinds[index] === VOXEL_WALL && wallTop[index] > 0) {
          // 低い壁(壇の前面など): 腰壁の石をその高さまで。上は天井まで空ける。
          push("wall_base", cell(x, wallTop[index] / 2, z, 1, wallTop[index], 1));
          push("ceiling", cell(x, top + 0.5, z));
        } else if (kinds[index] === VOXEL_WALL) {
          push("wall_base", cell(x, 0.5, z));
          for (let level = 1; level < top - 1; level += 1) push("wall_brick", cell(x, level + 0.5, z));
          push("wall_trim", cell(x, top - 0.5, z));
          push("ceiling", cell(x, top + 0.5, z));
        }
      }
    }
    // 置物(台座・植木など)の下と上: レイアウトでは「何もない」ブロックなので、従来は床に穴・天井に穴が見えていた。
    // 見た目だけ床と天井でふさぐ(歩ける範囲・置物の配置は変えない)。壇の上の置物は壇の高さの床にする。
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if (kinds[row * columns + column] !== VOXEL_VOID) continue;
        const cx = (column + 0.5) * cfg.blockSize;
        const cy = (row + 0.5) * cfg.blockSize;
        const prop = cfg.props.find(({ rect }) => cx >= rect.x && cx < rect.x + rect.width && cy >= rect.y && cy < rect.y + rect.height);
        if (!prop) continue;
        const rise = prop.elevation ?? 0;
        push("floor:0", rise > 0 ? cell(column + 0.5, (rise - 1) / 2, row + 0.5, 1, 1 + rise, 1) : cell(column + 0.5, -0.5, row + 0.5));
        push("ceiling", cell(column + 0.5, top + 0.5, row + 0.5));
      }
    }

    // 床・壁・天井: 見えない面を省き、角・壁ぎわに頂点AOを付けて、材質ごとに1つのメッシュへまとめる。
    const occupancy = buildOccupancy(boxes, columns, rows, -1, top + 1);
    const ceilingMeshes: ThreeTypes.Mesh[] = [];
    for (const group of meshVoxelBoxes(boxes, occupancy, quality.ambientOcclusion).values()) {
      const key = group.key;
      const parts = key.split(":");
      const voxelOptions = { vertexColors: true, bump: parts[0] !== "carpet" };
      const mat = parts[0] === "carpet"
        ? canvasMaterial(drawCarpetTexture(Number(parts[1]), parts[2] === "1", Number(parts[3])), voxelOptions)
        : parts[0] === "floor"
          ? canvasMaterial(drawStoneFloorTexture(Number(parts[1])), { ...voxelOptions, gloss: true })
          : canvasMaterial(drawCastle3DTexture(key as Castle3DTextureId), { ...voxelOptions, emissive: key.startsWith("ceiling") ? 0x16120c : 0x000000 });
      const geometry = track(new three.BufferGeometry());
      geometry.setAttribute("position", new three.BufferAttribute(group.positions, 3));
      geometry.setAttribute("normal", new three.BufferAttribute(group.normals, 3));
      geometry.setAttribute("uv", new three.BufferAttribute(group.uvs, 2));
      geometry.setAttribute("color", new three.BufferAttribute(group.colors, 3));
      geometry.setIndex(new three.BufferAttribute(group.indices, 1));
      geometry.computeBoundingSphere();
      const mesh = new three.Mesh(geometry, mat);
      if (key.startsWith("ceiling")) ceilingMeshes.push(mesh);
      world.add(mesh);
    }

    // 光の輪: 燭台・ランタン・街灯の火のまわりに、加算合成の板を常にこちら向きで置く(光っている感じを出す)。
    const glowMap = track(new three.CanvasTexture(drawGlowTexture()));
    glowMap.colorSpace = three.SRGBColorSpace;
    const glowMaterial = track(new three.SpriteMaterial({
      map: glowMap, blending: three.AdditiveBlending, depthWrite: false, transparent: true, fog: false,
    }));
    const flickers: Flicker[] = [];
    const addGlow = (x: number, y: number, z: number, size: number): void => {
      const sprite = new three.Sprite(glowMaterial);
      sprite.position.set(x, y, z);
      sprite.scale.set(size, size, 1);
      world.add(sprite);
      flickers.push({ sprite, baseIntensity: 0, baseScale: size, phase: x * 1.91 + z * 0.73 });
    };
    this.glow = addGlow;

    // --- 天井から下がるランタン(先頭lightCount個は実際の光源) ---
    cfg.lanterns.points.forEach((point, i) => {
      const x = point.x / cfg.blockSize;
      const z = point.y / cfg.blockSize;
      const hang = cfg.lanterns.hangHeight;
      const chain = new three.Mesh(box, material("iron"));
      chain.scale.set(0.06, top - hang - 0.3, 0.06);
      chain.position.set(x, (top + hang + 0.3) / 2, z);
      world.add(chain);
      const lantern = new three.Mesh(box, material("lantern", { emissive: 0xc88a2a }));
      lantern.scale.set(0.45, 0.6, 0.45);
      lantern.position.set(x, hang, z);
      world.add(lantern);
      addGlow(x, hang, z, cfg.glow.lantern);
      const cap = new three.Mesh(box, material("iron"));
      cap.scale.set(0.55, 0.1, 0.55);
      cap.position.set(x, hang + 0.35, z);
      world.add(cap);
      if (i < cfg.lanterns.lightCount) {
        const light = new three.PointLight(cfg.lanterns.color, cfg.lanterns.intensity, cfg.lanterns.distance, 1.2);
        light.position.set(x, hang - 0.2, z);
        world.add(light);
        flickers.push({ light, baseIntensity: cfg.lanterns.intensity, baseScale: 1, phase: x * 1.91 + z * 0.73 });
      }
    });

    // --- 壁飾り(旗・燭台・王の間の扉・絵) ---
    const plane = track(new three.PlaneGeometry(1, 1));
    for (const decor of cfg.wallDecor) this.addWallDecor(three, world, decor, plane, box, material, colorMaterial);

    // --- 床の置物(台座・植木・街灯・長椅子・机) ---
    for (const prop of cfg.props) addProp(three, world, prop, cfg.blockSize, box, plane, material, colorMaterial, addGlow, cfg.glow.candle);

    // --- 建築の飾り: 壁の付け柱・つた・窓からの光の筋・漂うほこり ---
    const arch = cfg.architecture;
    const decorPoints = cfg.wallDecor.map((decor) => ({ x: decor.x / cfg.blockSize, z: decor.y / cfg.blockSize }));
    const faceSpots = findWallFaceSpots(this.layout).filter((spot) => wallTop[spot.row * columns + spot.column] === 0);
    const pilasters = choosePilasterSpots(faceSpots, arch.pilasterSpacing, decorPoints, arch.pilasterAvoidRadius);
    const pilasterLists = { base: [] as ThreeTypes.Matrix4[], shaft: [] as ThreeTypes.Matrix4[], capital: [] as ThreeTypes.Matrix4[] };
    const alongWall = (face: string): boolean => face === "south" || face === "north";
    for (const spot of pilasters) {
      const normal = faceNormal(spot.face);
      const put = (list: ThreeTypes.Matrix4[], width: number, height: number, depth: number, y: number): void => {
        const x = spot.x + normal.x * depth / 2;
        const z = spot.z + normal.z * depth / 2;
        list.push(alongWall(spot.face) ? matrix(x, y, z, width, height, depth) : matrix(x, y, z, depth, height, width));
      };
      put(pilasterLists.base, 0.95, 0.45, 0.4, 0.225);
      put(pilasterLists.shaft, 0.72, top - 1.75, 0.26, 0.45 + (top - 1.75) / 2);
      put(pilasterLists.capital, 1, 0.3, 0.42, top - 1.15);
    }
    const addList = (list: ThreeTypes.Matrix4[], mat: ThreeTypes.Material): void => {
      if (list.length === 0) return;
      const mesh = new three.InstancedMesh(box, mat, list.length);
      list.forEach((item, i) => mesh.setMatrixAt(i, item));
      mesh.instanceMatrix.needsUpdate = true;
      world.add(mesh);
    };
    addList(pilasterLists.base, material("pot"));
    addList(pilasterLists.shaft, material("column"));
    addList(pilasterLists.capital, material("capital"));

    const vineCubes: ThreeTypes.Matrix4[] = [];
    const vines = chooseVineSpots(faceSpots, arch.vineRate, arch.vineMaxLength, [...decorPoints, ...pilasters]);
    vines.forEach(({ spot, length }, v) => {
      const normal = faceNormal(spot.face);
      for (let i = 0; i < length * 2; i += 1) {
        const jitter = Math.sin(v * 12.9 + i * 3.1) * 0.12;
        const size = 0.3 + ((v + i) % 3) * 0.06;
        const x = spot.x + normal.x * 0.12 + (alongWall(spot.face) ? jitter : 0);
        const z = spot.z + normal.z * 0.12 + (alongWall(spot.face) ? 0 : jitter);
        vineCubes.push(matrix(x, top - 1.2 - i * 0.42, z, size, 0.42, size));
      }
    });
    addList(vineCubes, material("leaves"));

    const shaftMaterial = track(new three.MeshBasicMaterial({
      map: track(new three.CanvasTexture(drawLightShaftTexture())), transparent: true, opacity: arch.lightShaftOpacity,
      blending: three.AdditiveBlending, depthWrite: false, side: three.DoubleSide, fog: false,
    }));
    const tilt = 0.9;
    const shaftLength = 4.6;
    for (const decor of cfg.wallDecor.filter((candidate) => candidate.kind === "window")) {
      const face = findWallFace(this.layout, decor.x, decor.y, decor.face);
      if (!face) continue;
      const holder = new three.Group();
      const along = decor.face === "south" || decor.face === "north" ? decor.x / cfg.blockSize : decor.y / cfg.blockSize;
      if (decor.face === "south" || decor.face === "north") holder.position.set(along, 3, face.plane);
      else holder.position.set(face.plane, 3, along);
      holder.rotation.y = { south: 0, north: Math.PI, east: Math.PI / 2, west: -Math.PI / 2 }[decor.face];
      const beam = new three.Mesh(plane, shaftMaterial);
      beam.scale.set(1.9, shaftLength, 1);
      beam.rotation.x = -tilt;
      beam.position.set(0, -Math.cos(tilt) * shaftLength / 2, Math.sin(tilt) * shaftLength / 2);
      holder.add(beam);
      world.add(holder);
    }

    // 漂うほこり: 床のある場所の空中に、加算合成の小さな点を散らす。
    const floorCells: number[] = [];
    for (let index = 0; index < kinds.length; index += 1) if (kinds[index] === VOXEL_FLOOR) floorCells.push(index);
    let seed = 99;
    const random = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    const dustBase = new Float32Array(arch.dustCount * 3);
    for (let i = 0; i < arch.dustCount; i += 1) {
      const cell = floorCells[Math.floor(random() * floorCells.length)];
      dustBase[i * 3] = (cell % columns) + random();
      dustBase[i * 3 + 1] = 0.6 + random() * (top - 1.6);
      dustBase[i * 3 + 2] = Math.floor(cell / columns) + random();
    }
    const dustGeometry = track(new three.BufferGeometry());
    dustGeometry.setAttribute("position", new three.BufferAttribute(dustBase.slice(), 3));
    const dust = new three.Points(dustGeometry, track(new three.PointsMaterial({
      color: 0xffe6b0, size: 0.05, transparent: true, opacity: 0.75, blending: three.AdditiveBlending, depthWrite: false,
    })));
    world.add(dust);

    // --- 影: 壁・柱・置物・ランタンが日差しの影を落とす。天井は落とさない(落とすと城じゅうが影になる)。
    // 光の筋・ほこり・光の輪は影に関わらない。人物は足元の影を持ち、向き直るので静的な影には入れない。
    if (quality.shadows) {
      world.traverse((object) => {
        const mesh = object as ThreeTypes.Mesh;
        if (!mesh.isMesh) return;
        const basic = (mesh.material as ThreeTypes.Material).type === "MeshBasicMaterial";
        mesh.castShadow = !basic;
        mesh.receiveShadow = !basic;
      });
      for (const mesh of ceilingMeshes) {
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    }

    // --- 人物(顔・髪・服・持ち物を描いたブロック人形。息づかい・まばたき・見回し・向き直り) ---
    const npcRigs = new Map<string, CharacterRig>();
    const skinMaterial = (source: HTMLCanvasElement): ThreeTypes.Material => canvasMaterial(source);
    this.npcs.forEach((npc, i) => {
      const model = cfg.npcModels[npc.definition.id] ?? cfg.npcModels.default;
      const rig = buildCharacter(three, model.look, model.gear, skinMaterial, colorMaterial, box, cfg.npcScale, i * 1.37 + 0.4);
      const px = npc.definition.position.x + (model.offset?.x ?? 0);
      const py = npc.definition.position.y + (model.offset?.y ?? 0);
      rig.root.position.set(px / cfg.blockSize, model.elevation ?? floorHeightAt(this.layout, px, py), py / cfg.blockSize);
      rig.root.rotation.y = facingToYaw(npc.definition.facing) + Math.PI;
      rig.targetYaw = rig.root.rotation.y;
      world.add(rig.root);
      npcRigs.set(npc.definition.id, rig);
    });

    return { three, renderer, world, camera, npcRigs, dust: { geometry: dustGeometry, base: dustBase }, flickers, disposables };
  }

  private addWallDecor(
    three: Three,
    world: ThreeTypes.Scene,
    decor: Castle3DWallDecor,
    plane: ThreeTypes.PlaneGeometry,
    box: ThreeTypes.BoxGeometry,
    material: (id: Castle3DTextureId, options?: { transparent?: boolean; emissive?: number; side?: ThreeTypes.Side }) => ThreeTypes.Material,
    colorMaterial: (color: number, emissive?: number) => ThreeTypes.Material,
  ): void {
    const face = findWallFace(this.layout, decor.x, decor.y, decor.face);
    if (!face) return;
    const along = decor.face === "south" || decor.face === "north" ? decor.x / this.layout.blockSize : decor.y / this.layout.blockSize;
    const out = decor.face === "south" || decor.face === "east" ? 1 : -1;
    const place = (object: ThreeTypes.Object3D, offset: number, y: number): void => {
      if (decor.face === "south" || decor.face === "north") object.position.set(along, y, face.plane + out * offset);
      else object.position.set(face.plane + out * offset, y, along);
      object.rotation.y = { south: 0, north: Math.PI, east: Math.PI / 2, west: -Math.PI / 2 }[decor.face];
      world.add(object);
    };
    const sheet = (id: Castle3DTextureId, width: number, height: number, y: number): void => {
      const mesh = new three.Mesh(plane, material(id, { transparent: true, side: three.DoubleSide }));
      mesh.scale.set(width, height, 1);
      place(mesh, 0.03, y);
    };
    switch (decor.kind) {
      case "banner":
        sheet("banner", 1.1, 2.2, 2.6);
        break;
      case "door": {
        sheet("door", 5.2, 3.8, 1.9);
        // 扉を囲む石のアーチ枠(左右の柱と、段々の楣)
        const stone = material("capital");
        for (const side of [-1, 1]) {
          const jamb = new three.Mesh(box, stone);
          jamb.scale.set(0.6, 4.3, 0.3);
          place(jamb, 0.15, 2.15);
          jamb.translateX(side * 2.9);
        }
        for (const [width, height, y] of [[6.4, 0.5, 4.05], [4.6, 0.45, 4.5], [2.6, 0.4, 4.92]] as const) {
          const lintel = new three.Mesh(box, stone);
          lintel.scale.set(width, height, 0.34);
          place(lintel, 0.17, y);
        }
        break;
      }
      case "painting":
        sheet("painting", 2.4, 1.6, 2.4);
        break;
      case "window":
        sheet("window", 2, 3, 2.7);
        break;
      case "tapestry":
        sheet("tapestry", 6.6, 4.8, 3.55);
        break;
      case "sconce": {
        const bracket = new three.Mesh(box, colorMaterial(0x9a7a3a));
        bracket.scale.set(0.16, 0.5, 0.2);
        place(bracket, 0.1, 2.3);
        const flame = new three.Mesh(box, colorMaterial(0xffd26a, 0xffb43a));
        flame.scale.set(0.22, 0.26, 0.22);
        place(flame, 0.16, 2.68);
        this.glow?.(flame.position.x, flame.position.y, flame.position.z, this.cfg.glow.sconce);
        break;
      }
    }
  }
}

function addProp(
  three: Three,
  world: ThreeTypes.Scene,
  prop: Castle3DProp,
  blockSize: number,
  box: ThreeTypes.BoxGeometry,
  plane: ThreeTypes.PlaneGeometry,
  material: (id: Castle3DTextureId, options?: { transparent?: boolean; emissive?: number; side?: ThreeTypes.Side }) => ThreeTypes.Material,
  colorMaterial: (color: number, emissive?: number) => ThreeTypes.Material,
  addGlow: (x: number, y: number, z: number, size: number) => void,
  candleGlow: number,
): void {
  const base = prop.elevation ?? 0;
  const cx = (prop.rect.x + prop.rect.width / 2) / blockSize;
  const cz = (prop.rect.y + prop.rect.height / 2) / blockSize;
  const w = prop.rect.width / blockSize;
  const d = prop.rect.height / blockSize;
  const block = (mat: ThreeTypes.Material, sx: number, sy: number, sz: number, y: number, dz = 0, dx = 0): void => {
    const mesh = new three.Mesh(box, mat);
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(cx + dx, base + y + sy / 2, cz + dz);
    world.add(mesh);
  };
  const gold = colorMaterial(0xe2b84a, 0x2a1e06);
  /** 金の燭台の腕とろうそく3本(炎と光の輪つき)。yは腕の高さ。 */
  const candles = (y: number, spread: number): void => {
    block(gold, spread * 2 + 0.1, 0.08, 0.08, y);
    for (const dx of [-spread, 0, spread]) {
      block(gold, 0.16, 0.08, 0.16, y + 0.08, 0, dx);
      block(colorMaterial(0xf6f0e0), 0.1, 0.3, 0.1, y + 0.16, 0, dx);
      block(colorMaterial(0xffd26a, 0xffb43a), 0.08, 0.12, 0.08, y + 0.46, 0, dx);
      addGlow(cx + dx, base + y + 0.55, cz, candleGlow);
    }
  };
  switch (prop.kind) {
    case "pedestal":
      // 参考画像の手すりの柱: 青い紋章の板つきの白い石の柱に、白い花のプランター。
      block(material("pedestal"), w * 0.9, 1.3, Math.min(d, 2) * 0.8, 0);
      block(material("pot"), w * 0.95, 0.3, Math.min(d, 2) * 0.85, 1.3);
      block(material("flowers"), w * 0.8, 0.45, Math.min(d, 2) * 0.7, 1.6);
      break;
    case "topiary": {
      const size = Math.min(w, d);
      block(material("pot"), size * 0.7, 0.55, size * 0.7, 0);
      block(material("flowers"), size * 0.95, size * 0.95, size * 0.95, 0.55);
      break;
    }
    case "lamp_post":
      block(colorMaterial(0x3a3a44), 0.22, 2.4, 0.22, 0);
      block(colorMaterial(0xffe08a, 0xffb43a), 0.45, 0.45, 0.45, 2.4);
      break;
    case "bench": {
      block(material("wood"), w * 0.9, 0.3, 0.55, 0, d * 0.25);
      block(material("cushion"), w * 0.9, 0.12, 0.55, 0.3, d * 0.25);
      // 長椅子の後ろに立てた絵(2Dの絵と長椅子の組)。
      const picture = new three.Mesh(plane, material("painting", { transparent: true, side: three.DoubleSide }));
      picture.scale.set(w * 0.9, 1.2, 1);
      picture.position.set(cx, 1.6, cz - d * 0.2);
      world.add(picture);
      block(material("wood"), 0.12, 1.1, 0.12, 0, -d * 0.2);
      break;
    }
    case "console_table":
      block(material("wood"), w * 0.9, 0.8, Math.max(d, 1) * 0.6, 0);
      block(material("leaves"), 0.4, 0.4, 0.4, 0.8);
      break;
    case "throne": {
      // 玉座: 金の台・青い座面・ひじ掛け・背の高い背もたれ(青い布の内張り)・金の飾り玉
      const depth = Math.min(d, 4);
      block(material("capital"), w * 0.92, 0.2, depth * 0.95, 0);
      block(gold, 2.2, 0.32, 1.8, 0.2, 0.15);
      block(material("cushion"), 1.9, 0.12, 1.6, 0.52, 0.2);
      for (const side of [-1, 1]) {
        block(gold, 0.3, 0.55, 1.7, 0.52, 0.15, side * 1.1);
        block(material("cushion"), 0.24, 0.1, 1.5, 1.07, 0.15, side * 1.1);
        block(gold, 0.36, 0.36, 0.36, 1.07, 0.95, side * 1.1);
        block(gold, 0.34, 0.34, 0.34, 3.45, -0.65, side * 1.05);
      }
      block(gold, 2.5, 3.1, 0.34, 0.52, -0.7);
      block(material("cushion"), 1.9, 2.5, 0.06, 0.8, -0.5);
      block(gold, 0.5, 0.5, 0.34, 3.62, -0.7);
      block(colorMaterial(0x3a6ad8, 0x10204a), 0.3, 0.3, 0.06, 3.12, -0.5);
      break;
    }
    case "candelabra":
      // 床に立つ背の高い金の燭台
      block(gold, 0.5, 0.12, 0.5, 0);
      block(gold, 0.12, 1.9, 0.12, 0.12);
      candles(2.02, 0.28);
      break;
    case "candle_pedestal": {
      // 青い紋章の台座の上に、金の燭台
      const depth = Math.min(d, 2.5);
      block(material("pedestal"), w * 0.8, 1.2, depth * 0.8, 0);
      block(material("pot"), w * 0.9, 0.2, depth * 0.9, 1.2);
      block(gold, 0.1, 0.55, 0.1, 1.4);
      candles(1.95, 0.24);
      break;
    }
    case "balustrade": {
      // 壇のふちの手すり: 壇の高さまでの石の土台、その上に手すり子と笠木
      block(material("wall_base"), w, base, d * 0.9, -base);
      const rail = material("capital");
      block(rail, w, 0.12, 0.42, 0);
      const count = Math.max(2, Math.round(w / 0.4));
      for (let i = 0; i < count; i += 1) block(material("column"), 0.14, 0.62, 0.14, 0.12, 0, -w / 2 + (i + 0.5) * (w / count));
      block(rail, w + 0.1, 0.16, 0.5, 0.74);
      break;
    }
  }
}

/** マップの3D設定からブロックの配置を作る(Nodeテストからも同じ関数を使う)。 */
export function buildCastle3DLayout(grid: BlockedCellGrid, cfg: Castle3DConfig): VoxelLayout {
  return buildVoxelLayout(grid, cfg.blockSize, {
    carpets: cfg.carpets,
    stairs: cfg.stairs,
    platforms: cfg.platforms,
    lowWalls: cfg.lowWalls,
    propRects: cfg.props.map((prop) => prop.rect),
  });
}

export class RainlandCastle3DScene extends Castle3DScene {
  constructor() {
    super(RAINLAND_CASTLE_3D_SCENE_KEY, RAINLAND_CASTLE_PACKAGE, RAINLAND_CASTLE_3D);
  }
}

/** 王の間の3D表示(2Dは`RainlandThroneRoomScene`)。 */
export class RainlandThroneRoom3DScene extends Castle3DScene {
  constructor() {
    super(RAINLAND_THRONE_ROOM_3D_SCENE_KEY, RAINLAND_THRONE_ROOM_PACKAGE, RAINLAND_THRONE_ROOM_3D);
  }
}

function disposeThreeView(view: ThreeView): void {
  view.world.clear();
  for (const item of view.disposables) item.dispose();
  view.renderer.dispose();
  // iPhone SafariはWebGLコンテキスト数の上限が小さいので、切替のたびに確実に解放する。
  view.renderer.forceContextLoss();
}
