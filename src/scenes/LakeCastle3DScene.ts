import Phaser from "phaser";
import type * as ThreeTypes from "three";
import { DISPLAY } from "../config/display.ts";
import { LAKE_CASTLE_RANDOM_ENCOUNTER } from "../config/encounter.ts";
import {
  LAKE_CASTLE_3D_SCENE_KEY,
  LAKE_CASTLE_3D_SETTINGS,
  LAKE_CASTLE_CELL,
  LAKE_CASTLE_FLOORS,
  lakeCastleCellAt,
  lakeCastleFloorFromQuery,
  lakeCastleIsWalkable,
  lakeCastleZoneContains,
} from "../config/lakeCastle3D.ts";
import type { LakeCastleFeature, LakeCastleFloorId, LakeCastleFloorPlan, LakeCastleZone } from "../config/lakeCastle3D.ts";
import { beginBattleEntrance } from "../events/BattleEntrance.ts";
import type { BattleDialogueEvent } from "../events/BattleEventData.ts";
import { GameStateRepository } from "../systems/GameStateRepository.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { moveWithSlide } from "../systems/Castle3DLayout.ts";
import type { BlockedCellGrid } from "../systems/Castle3DLayout.ts";
import { advanceRandomEncounter, createRandomEncounterState } from "../systems/RandomEncounter.ts";
import type { RandomEncounterState } from "../systems/RandomEncounter.ts";
import { partySystem } from "../systems/PartySystem.ts";
import { DialogueBox } from "../ui/DialogueBox.ts";
import { FieldMenu } from "../ui/FieldMenu.ts";

type Three = typeof ThreeTypes;

const HUD_DEPTH = 1800;
const FLOOR_FADE_MS = 380;
const PLAYER_HALF_SIZE = 0.23;
const INTERACTION_RADIUS = 1.6;
const WATER_Y = -0.22;
const CEILING_HEIGHT = 5.15;
const CEILING_PANEL_SPAN = 4;
const isDevMode = typeof import.meta.env !== "undefined" && import.meta.env.DEV;

interface LakeCastleStartData {
  readonly floor?: LakeCastleFloorId;
  readonly spawnId?: string;
  readonly spawnX?: number;
  readonly spawnY?: number;
  readonly spawnYaw?: number;
  readonly battleEventReturn?: boolean;
}

interface LakeView {
  readonly three: Three;
  readonly renderer: ThreeTypes.WebGLRenderer;
  readonly world: ThreeTypes.Scene;
  readonly camera: ThreeTypes.PerspectiveCamera;
  readonly waterTextures: readonly ThreeTypes.Texture[];
  readonly waterfallTextures: readonly ThreeTypes.Texture[];
  readonly disposables: readonly { dispose(): void }[];
}

interface PendingDialogue {
  readonly kind: "inscription" | "sanctuary";
}

/**
 * No.11専用の一人称Three.jsダンジョン。
 *
 * レインランド城の2D/3D切替とは違い、ここは最初から3Dを正本にする。各階をScene再構築
 * するため、水面・壁・装飾を3階ぶん常駐させず、iPhone SafariのWebGLコンテキストも
 * Scene終了時に確実に解放する。
 */
export class LakeCastle3DScene extends Phaser.Scene {
  private floorId: LakeCastleFloorId = 1;
  private plan!: LakeCastleFloorPlan;
  private grid!: BlockedCellGrid;
  private position = { x: 0, z: 0 };
  private yaw = 0;
  private actions!: InputSystem;
  private dialogueBox!: DialogueBox;
  private fieldMenu!: FieldMenu;
  private notice!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private minimap!: Phaser.GameObjects.Graphics;
  private minimapMarker!: Phaser.GameObjects.Graphics;
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private debugText?: Phaser.GameObjects.Text;
  private debugVisible = false;
  private readonly held = new Set<string>();
  private view?: LakeView;
  private transitioning = false;
  private encounterState: RandomEncounterState = createRandomEncounterState();
  private pendingDialogue?: PendingDialogue;
  private pointerLocked = false;
  private readonly gameState = new GameStateRepository();
  private readonly viewTextureKey = "LakeCastle3DScene.view";

  constructor() {
    super({ key: LAKE_CASTLE_3D_SCENE_KEY });
  }

  create(data?: LakeCastleStartData): void {
    this.floorId = data?.floor ?? lakeCastleFloorFromQuery(window.location.search);
    this.plan = LAKE_CASTLE_FLOORS[this.floorId];
    this.grid = makeCollisionGrid(this.plan);
    this.transitioning = false;
    this.pendingDialogue = undefined;
    this.held.clear();
    this.view = undefined;
    this.encounterState = createRandomEncounterState(data?.battleEventReturn ? LAKE_CASTLE_RANDOM_ENCOUNTER.postBattleCooldownDistance : 0);

    const spawn = this.resolveSpawn(data);
    this.position = { x: spawn.x, z: spawn.z };
    this.yaw = spawn.yaw;

    this.cameras.main.setBackgroundColor("#07182d");
    const loading = this.add.text(DISPLAY.width / 2, DISPLAY.height / 2, "みずうみの　こじょうを　くみたて中…", {
      color: "#e8f7ff", fontFamily: "monospace", fontSize: "22px",
    }).setOrigin(0.5).setDepth(HUD_DEPTH);
    this.createHud();
    this.dialogueBox = new DialogueBox(this);
    this.fieldMenu = new FieldMenu(this);
    this.actions = new InputSystem(window, document);
    this.actions.setLocked(true);
    this.installPointerLock();

    const cleanup = (): void => {
      this.actions.destroy();
      this.disposeView();
      this.removePointerLock();
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    void this.buildView().then((view) => {
      loading.destroy();
      if (!this.sys.isActive()) {
        disposeLakeView(view);
        return;
      }
      this.view = view;
      const canvas = view.renderer.domElement;
      const texture = this.textures.create(this.viewTextureKey, canvas as unknown as HTMLImageElement, canvas.width, canvas.height);
      if (!texture) throw new Error("Lake Castle 3D texture could not be created");
      texture.add("__BASE", 0, 0, 0, canvas.width, canvas.height);
      texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      this.add.image(0, 0, this.viewTextureKey).setOrigin(0, 0).setDisplaySize(DISPLAY.width, DISPLAY.height).setDepth(-10);
      this.drawMinimap();
      this.actions.setLocked(false);
      this.cameras.main.fadeIn(FLOOR_FADE_MS, 0, 0, 0);
      this.renderView();
      if (isDevMode) this.exposeDevTools();
    }).catch((error: unknown) => {
      // There is no compatible 2D fallback for this map. Keep the failure explicit rather than sending a player to an unrelated Scene.
      console.error("[LAKE_CASTLE_3D] WebGL view could not be created", error);
      loading.setText("3Dひょうじを　はじめられませんでした。");
      this.notice.setText("このたんまつでは　3Dを　ひょうじできません。");
    });
  }

  update(_time: number, delta: number): void {
    if (!this.view) return;
    const seconds = Math.min(delta, 50) / 1000;
    if (this.dialogueBox.isOpen) {
      if (this.actions.consumePressed("confirm") && this.dialogueBox.advance()) this.completePendingDialogue();
    } else if (this.fieldMenu.isOpen) {
      this.fieldMenu.handleInput(this.actions);
    } else if (!this.transitioning) {
      if (this.actions.consumePressed("cancel") && document.pointerLockElement === this.game.canvas) document.exitPointerLock();
      if (this.actions.consumePressed("menu")) this.fieldMenu.open();
      else {
        this.stepMovement(seconds);
        if (this.actions.consumePressed("confirm")) this.tryInteract();
      }
    }
    this.updatePrompt();
    this.renderView();
    this.updateDebug(delta);
  }

  private resolveSpawn(data?: LakeCastleStartData): { x: number; z: number; yaw: number } {
    if (typeof data?.spawnX === "number" && typeof data.spawnY === "number") {
      return { x: data.spawnX, z: data.spawnY, yaw: data.spawnYaw ?? 0 };
    }
    const spawn = this.plan.spawns[data?.spawnId ?? Object.keys(this.plan.spawns)[0]] ?? Object.values(this.plan.spawns)[0];
    return { ...spawn };
  }

  private stepMovement(seconds: number): void {
    const isDown = (action: "moveUp" | "moveDown" | "moveLeft" | "moveRight"): boolean => this.actions.isDown(action) || this.held.has(action);
    const turn = (isDown("moveLeft") ? 1 : 0) - (isDown("moveRight") ? 1 : 0);
    this.yaw = normalizeYaw(this.yaw + turn * LAKE_CASTLE_3D_SETTINGS.turnSpeed * seconds);
    const drive = (isDown("moveUp") ? 1 : 0) - (isDown("moveDown") ? 1 : 0);
    if (drive === 0) return;

    const before = { ...this.position };
    const forward = forwardVector(this.yaw);
    const moved = moveWithSlide(this.grid, { x: this.position.x, y: this.position.z }, forward.x * drive * LAKE_CASTLE_3D_SETTINGS.moveSpeed * seconds, forward.z * drive * LAKE_CASTLE_3D_SETTINGS.moveSpeed * seconds, PLAYER_HALF_SIZE);
    this.position = { x: moved.x, z: moved.y };
    const distance = Math.hypot(this.position.x - before.x, this.position.z - before.z);
    if (distance > 0.001) {
      this.checkFloorTransitions();
      if (!this.transitioning && advanceRandomEncounter(this.encounterState, distance, LAKE_CASTLE_RANDOM_ENCOUNTER)) this.beginRandomEncounter();
    }
  }

  private checkFloorTransitions(): void {
    for (const transition of this.plan.transitions) {
      if (!lakeCastleZoneContains(transition, this.position.x, this.position.z)) continue;
      if (transition.requiresAncientInscription && !this.gameState.hasFlag("event.lake_castle_ancient_inscription")) {
        this.notice.setText("古い文字を　しらべよう。");
        return;
      }
      this.changeFloor(transition.targetFloor, transition.targetSpawnId);
      return;
    }
    if (this.plan.worldMapExit && lakeCastleZoneContains(this.plan.worldMapExit, this.position.x, this.position.z)) this.returnToWorldMap();
  }

  private tryInteract(): void {
    if (this.plan.ancientInscription && isNearZone(this.plan.ancientInscription, this.position.x, this.position.z)) {
      if (!this.gameState.hasFlag("event.lake_castle_ancient_inscription")) {
        this.pendingDialogue = { kind: "inscription" };
        this.dialogueBox.open(["古い文字が　刻まれている。", "ミレイは、この文字を　知っているようだ。"]);
      }
      return;
    }
    if (this.plan.sanctuary && isNearZone(this.plan.sanctuary, this.position.x, this.position.z)) {
      this.pendingDialogue = { kind: "sanctuary" };
      this.dialogueBox.open(this.gameState.hasFlag("event.lake_castle_sanctuary")
        ? ["祭壇の　青い光が　静かに　ゆれている。"]
        : ["祭壇に　青い光が　満ちている。", "古城の　いちばん奥に　たどりついた。"]);
    }
  }

  private completePendingDialogue(): void {
    const pending = this.pendingDialogue;
    this.pendingDialogue = undefined;
    if (!pending) return;
    if (pending.kind === "inscription") {
      this.gameState.setFlag("event.lake_castle_ancient_inscription");
      this.notice.setText("北の大階段へ　進めそうだ。");
      return;
    }
    if (!this.gameState.hasFlag("event.lake_castle_sanctuary")) {
      this.gameState.setFlag("event.lake_castle_sanctuary");
      // No.11での正式同行。タロサ未加入の不正セーブを壊さず、PartySystemの順序制約に委ねる。
      const joined = partySystem.addMember("mirei");
      if (joined) this.time.delayedCall(80, () => this.dialogueBox.open(["ミレイが　なかまに　なった！"]));
      // No.12への導線用フック。解放条件・本文はSTORY_FLOW/TBDに従いここでは確定しない。
      this.gameState.setFlag("story.lake_castle_sanctuary_cleared");
      this.notice.setText(this.plan.title);
    }
  }

  private changeFloor(floor: LakeCastleFloorId, spawnId: string): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.actions.setLocked(true);
    this.cameras.main.fadeOut(FLOOR_FADE_MS, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(LAKE_CASTLE_3D_SCENE_KEY, { floor, spawnId } satisfies LakeCastleStartData));
  }

  private returnToWorldMap(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.actions.setLocked(true);
    this.cameras.main.fadeOut(FLOOR_FADE_MS, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start("WorldMapScene", { worldMapEntryId: "from_lake_old_castle" }));
  }

  private beginRandomEncounter(): void {
    this.transitioning = true;
    const monsters = ["koakuma", "erimaki_hebi", "daija"] as const; // TEMP_TEST_VALUE: No.11固有の出現表はMONSTER_SPECで未確定。
    const event: BattleDialogueEvent = {
      type: "battle",
      eventId: "event_lake_castle_random_encounter",
      monsterId: monsters[Math.floor(Math.random() * monsters.length)],
      returnSceneKey: LAKE_CASTLE_3D_SCENE_KEY,
      returnSpawnId: Object.keys(this.plan.spawns)[0],
      returnSpawnX: this.position.x,
      returnSpawnY: this.position.z,
      returnFacing: this.yaw < Math.PI / 4 || this.yaw >= Math.PI * 7 / 4 ? "up" : this.yaw < Math.PI * 3 / 4 ? "right" : this.yaw < Math.PI * 5 / 4 ? "down" : "left",
      returnFloor: this.floorId,
      returnYaw: this.yaw,
    };
    beginBattleEntrance(this, this.actions, event);
  }

  private createHud(): void {
    this.notice = this.add.text(20, 20, this.plan.title, {
      color: "#e9f9ff", fontFamily: "monospace", fontSize: "20px", stroke: "#071522", strokeThickness: 5,
    }).setDepth(HUD_DEPTH);
    this.add.text(20, 48, "WASD / ↑↓: いどう　マウス / ←→: し点　Z: しらべる　C: メニュー", {
      color: "#c9e8f8", fontFamily: "monospace", fontSize: "13px", stroke: "#071522", strokeThickness: 4,
    }).setDepth(HUD_DEPTH);
    this.prompt = this.add.text(DISPLAY.width / 2, DISPLAY.height - 158, "", {
      color: "#fff4c7", fontFamily: "monospace", fontSize: "17px", stroke: "#071522", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(HUD_DEPTH).setVisible(false);
    this.minimap = this.add.graphics().setDepth(HUD_DEPTH);
    this.minimapMarker = this.add.graphics().setDepth(HUD_DEPTH + 1);

    if (this.sys.game.device.input.touch) {
      this.createTouchButton(86, DISPLAY.height - 150, "↑", "moveUp", 30, true);
      this.createTouchButton(86, DISPLAY.height - 54, "↓", "moveDown", 30, true);
      this.createTouchButton(30, DISPLAY.height - 102, "←", "moveLeft", 28, true);
      this.createTouchButton(142, DISPLAY.height - 102, "→", "moveRight", 28, true);
      this.createTouchButton(DISPLAY.width - 60, DISPLAY.height - 90, "Z", "confirm", 36, false);
      this.createTouchButton(DISPLAY.width - 150, DISPLAY.height - 60, "C", "menu", 26, false);
    }
    if (isDevMode && new URLSearchParams(window.location.search).has("lakeCastleDebug")) this.setDebugVisible(true);
  }

  private createTouchButton(x: number, y: number, label: string, action: "moveUp" | "moveDown" | "moveLeft" | "moveRight" | "confirm" | "menu", radius: number, hold: boolean): void {
    const button = this.add.circle(x, y, radius, 0x113755, 0.75).setStrokeStyle(3, 0xbedff1, 0.9).setDepth(HUD_DEPTH + 3).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { color: "#ffffff", fontFamily: "monospace", fontSize: `${Math.round(radius * 0.75)}px`, fontStyle: "bold" }).setOrigin(0.5).setDepth(HUD_DEPTH + 4);
    if (hold) {
      button.on("pointerdown", () => this.held.add(action));
      const release = (): void => { this.held.delete(action); };
      button.on("pointerup", release);
      button.on("pointerout", release);
    } else button.on("pointerdown", () => this.actions.queuePressed(action));
  }

  private drawMinimap(): void {
    const width = 150;
    const cell = width / this.plan.width;
    const x0 = DISPLAY.width - width - 22;
    const y0 = 25;
    const height = this.plan.height * cell;
    const map = this.minimap.clear();
    map.fillStyle(0x061321, 0.82).fillRoundedRect(x0 - 5, y0 - 22, width + 10, height + 28, 5);
    map.lineStyle(1, 0x91c9db, 0.75).strokeRoundedRect(x0 - 5, y0 - 22, width + 10, height + 28, 5);
    map.fillStyle(0xc8d8df, 0.8);
    for (let z = 0; z < this.plan.height; z += 1) for (let x = 0; x < this.plan.width; x += 1) {
      const kind = lakeCastleCellAt(this.plan, x, z);
      if (kind === LAKE_CASTLE_CELL.floor || kind === LAKE_CASTLE_CELL.bridge) map.fillRect(x0 + x * cell, y0 + z * cell, cell + 0.2, cell + 0.2);
    }
    map.fillStyle(0x75dfff, 0.9).fillRect(x0, y0, width, height);
    // Water is drawn first as a tint; redraw walkable cells over it to keep the map compact and readable.
    map.fillStyle(0xdfe5df, 0.95);
    for (let z = 0; z < this.plan.height; z += 1) for (let x = 0; x < this.plan.width; x += 1) {
      if (lakeCastleIsWalkable(this.plan, x, z)) map.fillRect(x0 + x * cell, y0 + z * cell, cell + 0.2, cell + 0.2);
    }
    map.fillStyle(0xf0c45b, 0.9).fillRect(x0, y0 - 17, 28, 12);
    this.add.text(x0 + 35, y0 - 22, `${this.floorId}F`, { color: "#eaf7ff", fontFamily: "monospace", fontSize: "15px" }).setDepth(HUD_DEPTH + 2);
  }

  private drawMinimapMarker(): void {
    const width = 150;
    const cell = width / this.plan.width;
    const x0 = DISPLAY.width - width - 22;
    const y0 = 25;
    const x = x0 + this.position.x * cell;
    const y = y0 + this.position.z * cell;
    const forward = forwardVector(this.yaw);
    const side = { x: -forward.z, z: forward.x };
    const marker = this.minimapMarker.clear();
    marker.fillStyle(0xff5e4d, 1).lineStyle(1, 0xffffff, 1);
    marker.fillTriangle(x + forward.x * 7, y + forward.z * 7, x - forward.x * 4 + side.x * 4, y - forward.z * 4 + side.z * 4, x - forward.x * 4 - side.x * 4, y - forward.z * 4 - side.z * 4);
  }

  private updatePrompt(): void {
    if (this.transitioning || this.dialogueBox?.isOpen || this.fieldMenu?.isOpen) {
      this.prompt.setVisible(false);
      return;
    }
    const canRead = this.plan.ancientInscription && isNearZone(this.plan.ancientInscription, this.position.x, this.position.z) && !this.gameState.hasFlag("event.lake_castle_ancient_inscription");
    const canSanctuary = this.plan.sanctuary && isNearZone(this.plan.sanctuary, this.position.x, this.position.z);
    if (canRead || canSanctuary) {
      this.prompt.setText("Z：しらべる").setVisible(true);
    } else this.prompt.setVisible(false);
  }

  private async buildView(): Promise<LakeView> {
    const three: Three = await import("three");
    const renderer = new three.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    const width = Math.round(DISPLAY.width * LAKE_CASTLE_3D_SETTINGS.renderScale);
    const height = Math.round(DISPLAY.height * LAKE_CASTLE_3D_SETTINGS.renderScale);
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.toneMapping = three.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const world = new three.Scene();
    // No.11は外気に開かない古城ダンジョン。空ではなく、天井の奥に沈む暗がりを置く。
    world.background = new three.Color(0x07101b);
    world.fog = new three.FogExp2(0x101c2a, 0.035);
    const camera = new three.PerspectiveCamera(LAKE_CASTLE_3D_SETTINGS.fov, width / height, 0.05, 130);
    camera.rotation.order = "YXZ";
    world.add(new three.HemisphereLight(0x91a8c5, 0x101925, 1.7));
    const vaultLight = new three.DirectionalLight(0xc8d6eb, 1.75);
    vaultLight.position.set(this.plan.width * 0.3, 12, this.plan.height * 0.2);
    world.add(vaultLight);
    const blueLight = new three.PointLight(0x43c8ff, 8, 18, 1.6);
    blueLight.position.set(this.plan.width / 2, 5, this.plan.height / 2);
    world.add(blueLight);

    const disposables: { dispose(): void }[] = [];
    const track = <T extends { dispose(): void }>(item: T): T => {
      disposables.push(item);
      return item;
    };
    const makeTexture = (source: HTMLCanvasElement, repeat = 1): ThreeTypes.CanvasTexture => {
      const texture = track(new three.CanvasTexture(source));
      texture.colorSpace = three.SRGBColorSpace;
      texture.wrapS = texture.wrapT = three.RepeatWrapping;
      texture.repeat.set(repeat, repeat);
      texture.magFilter = three.LinearFilter;
      texture.minFilter = three.LinearMipmapLinearFilter;
      return texture;
    };
    // 1マスに細かい目地を繰り返さず、大きな石板として見せる。水上遺跡を
    // ボクセルの集合ではなく、崩れた白石の建築に見せるための軽量な調整。
    const stone = makeTexture(drawStoneCanvas(), 1);
    // 壁は結合した横長のInstancedMeshなので、床とは別に繰り返し数を持たせる。
    // これで古城の石積みの縮尺を保ちつつ、1マスごとの立体継ぎ目を作らない。
    const wallStone = makeTexture(drawStoneCanvas(), 4);
    const bridgeStone = makeTexture(drawBridgeCanvas(), 1);
    const ceilingStone = makeTexture(drawCeilingCanvas(), 1);
    const water = makeTexture(drawWaterCanvas(), 10);
    const waterfall = makeTexture(drawWaterfallCanvas(), 1);
    const glass = makeTexture(drawGlassCanvas(), 1);
    const floorMaterial = track(new three.MeshStandardMaterial({ map: stone, roughness: 0.86, metalness: 0.02, color: 0xc8d0ce }));
    const bridgeMaterial = track(new three.MeshStandardMaterial({ map: bridgeStone, roughness: 0.82, color: 0xaeb9bc }));
    const wallMaterial = track(new three.MeshStandardMaterial({ map: wallStone, roughness: 0.94, color: 0x9ca9ac }));
    const ceilingMaterial = track(new three.MeshStandardMaterial({ map: ceilingStone, roughness: 0.96, color: 0x7d8b99, side: three.DoubleSide }));
    const railMaterial = track(new three.MeshStandardMaterial({ color: 0x6f7d85, roughness: 0.78, metalness: 0.12 }));
    const mossMaterial = track(new three.MeshStandardMaterial({ color: 0x537b60, roughness: 0.95 }));
    const goldMaterial = track(new three.MeshStandardMaterial({ color: 0xd6ac4b, emissive: 0x3a1e03, roughness: 0.3, metalness: 0.65 }));
    const glowMaterial = track(new three.MeshBasicMaterial({ color: 0x55cfff, transparent: true, opacity: 0.58, blending: three.AdditiveBlending, depthWrite: false, side: three.DoubleSide }));
    const waterMaterial = track(new three.MeshPhongMaterial({ map: water, color: 0x195969, transparent: true, opacity: 0.78, shininess: 18, specular: 0x254c58, side: three.DoubleSide }));
    const waterfallMaterial = track(new three.MeshBasicMaterial({ map: waterfall, transparent: true, opacity: 0.74, blending: three.AdditiveBlending, depthWrite: false, side: three.DoubleSide }));
    const glassMaterial = track(new three.MeshStandardMaterial({ map: glass, emissive: 0x1879ad, emissiveMap: glass, emissiveIntensity: 1.6, transparent: true, side: three.DoubleSide }));

    const box = track(new three.BoxGeometry(1, 1, 1));
    const cylinder = track(new three.CylinderGeometry(0.42, 0.55, 1, 8));
    const thinCylinder = track(new three.CylinderGeometry(0.12, 0.16, 1, 6));
    const plane = track(new three.PlaneGeometry(1, 1));
    const roseWindow = track(new three.CircleGeometry(1, 18));
    const roseWindowFrame = track(new three.TorusGeometry(1, 0.09, 5, 18));
    const matrices = {
      floor: [] as ThreeTypes.Matrix4[], bridge: [] as ThreeTypes.Matrix4[], wall: [] as ThreeTypes.Matrix4[], rail: [] as ThreeTypes.Matrix4[], support: [] as ThreeTypes.Matrix4[], ceiling: [] as ThreeTypes.Matrix4[], ceilingBeam: [] as ThreeTypes.Matrix4[],
    };
    const matrix = (x: number, y: number, z: number, sx: number, sy: number, sz: number): ThreeTypes.Matrix4 => new three.Matrix4().compose(new three.Vector3(x, y, z), new three.Quaternion(), new three.Vector3(sx, sy, sz));
    const directions = [{ x: 0, z: -1, sx: 1, sz: 0.12 }, { x: 1, z: 0, sx: 0.12, sz: 1 }, { x: 0, z: 1, sx: 1, sz: 0.12 }, { x: -1, z: 0, sx: 0.12, sz: 1 }];
    for (let z = 0; z < this.plan.height; z += 1) for (let x = 0; x < this.plan.width; x += 1) {
      const cell = lakeCastleCellAt(this.plan, x, z);
      if (cell === LAKE_CASTLE_CELL.floor || cell === LAKE_CASTLE_CELL.bridge) {
        (cell === LAKE_CASTLE_CELL.bridge ? matrices.bridge : matrices.floor).push(matrix(x + 0.5, -0.08, z + 0.5, 1, 0.16, 1));
        for (const direction of directions) {
          const neighbor = lakeCastleCellAt(this.plan, x + direction.x, z + direction.z);
          if (neighbor === LAKE_CASTLE_CELL.water) matrices.rail.push(matrix(x + 0.5 + direction.x * 0.44, 0.28, z + 0.5 + direction.z * 0.44, direction.sx, 0.55, direction.sz));
        }
        if (cell === LAKE_CASTLE_CELL.bridge && (x + z) % 4 === 0) matrices.support.push(matrix(x + 0.5, -1.1, z + 0.5, 0.34, 2.05, 0.34));
      }
    }
    // 同じ列の壁を横方向に結合する。形とCollisionは論理グリッドのまま、描画だけを
    // 大きな石壁にして、継ぎ目とドロー対象を減らす。
    for (let z = 0; z < this.plan.height; z += 1) {
      let x = 0;
      while (x < this.plan.width) {
        if (lakeCastleCellAt(this.plan, x, z) !== LAKE_CASTLE_CELL.wall) {
          x += 1;
          continue;
        }
        const start = x;
        while (x < this.plan.width && lakeCastleCellAt(this.plan, x, z) === LAKE_CASTLE_CELL.wall) x += 1;
        matrices.wall.push(matrix((start + x) / 2, 1.7, z + 0.5, x - start, 3.4, 1));
      }
    }
    // 全パネルと梁はInstancedMeshへまとめ、iPhone Safariでもドロー数を増やさない。
    for (let z = 0; z < this.plan.height; z += CEILING_PANEL_SPAN) for (let x = 0; x < this.plan.width; x += CEILING_PANEL_SPAN) {
      const panelWidth = Math.min(CEILING_PANEL_SPAN, this.plan.width - x);
      const panelDepth = Math.min(CEILING_PANEL_SPAN, this.plan.height - z);
      matrices.ceiling.push(matrix(x + panelWidth / 2, CEILING_HEIGHT, z + panelDepth / 2, panelWidth, 0.18, panelDepth));
    }
    for (let x = 0; x <= this.plan.width; x += CEILING_PANEL_SPAN) {
      matrices.ceilingBeam.push(matrix(x, CEILING_HEIGHT - 0.16, this.plan.height / 2, 0.22, 0.36, this.plan.height));
    }
    for (let z = 0; z <= this.plan.height; z += CEILING_PANEL_SPAN) {
      matrices.ceilingBeam.push(matrix(this.plan.width / 2, CEILING_HEIGHT - 0.16, z, this.plan.width, 0.36, 0.22));
    }
    addInstances(three, world, box, ceilingMaterial, matrices.ceiling);
    addInstances(three, world, box, wallMaterial, matrices.ceilingBeam);
    addInstances(three, world, box, floorMaterial, matrices.floor);
    addInstances(three, world, box, bridgeMaterial, matrices.bridge);
    addInstances(three, world, box, wallMaterial, matrices.wall);
    addInstances(three, world, box, railMaterial, matrices.rail);
    addInstances(three, world, cylinder, wallMaterial, matrices.support);

    const waterPlane = new three.Mesh(track(new three.PlaneGeometry(this.plan.width * 3, this.plan.height * 3)), waterMaterial);
    waterPlane.rotation.x = -Math.PI / 2;
    waterPlane.position.set(this.plan.width / 2, WATER_Y, this.plan.height / 2);
    world.add(waterPlane);
    this.plan.features.forEach((feature) => this.addFeature(three, world, feature, { box, cylinder, thinCylinder, plane, roseWindow, roseWindowFrame, wallMaterial, railMaterial, mossMaterial, goldMaterial, glassMaterial, glowMaterial, waterfallMaterial, matrix, disposables }));

    return { three, renderer, world, camera, waterTextures: [water], waterfallTextures: [waterfall], disposables };
  }

  private addFeature(
    three: Three,
    world: ThreeTypes.Scene,
    feature: LakeCastleFeature,
    assets: {
      box: ThreeTypes.BoxGeometry; cylinder: ThreeTypes.CylinderGeometry; thinCylinder: ThreeTypes.CylinderGeometry; plane: ThreeTypes.PlaneGeometry; roseWindow: ThreeTypes.CircleGeometry; roseWindowFrame: ThreeTypes.TorusGeometry;
      wallMaterial: ThreeTypes.Material; railMaterial: ThreeTypes.Material; mossMaterial: ThreeTypes.Material; goldMaterial: ThreeTypes.Material; glassMaterial: ThreeTypes.Material; glowMaterial: ThreeTypes.Material; waterfallMaterial: ThreeTypes.Material;
      matrix: (x: number, y: number, z: number, sx: number, sy: number, sz: number) => ThreeTypes.Matrix4; disposables: { dispose(): void }[];
    },
  ): void {
    const mesh = (geometry: ThreeTypes.BufferGeometry, material: ThreeTypes.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): ThreeTypes.Mesh => {
      const item = new three.Mesh(geometry, material);
      item.position.set(x, y, z);
      item.scale.set(sx, sy, sz);
      world.add(item);
      return item;
    };
    const candle = (x: number, z: number): void => {
      mesh(assets.thinCylinder, assets.goldMaterial, x, 1.2, z, 1, 1.8, 1);
      mesh(assets.box, assets.goldMaterial, x, 2.15, z, 0.8, 0.1, 0.8);
      const flame = mesh(assets.box, assets.glowMaterial, x, 2.35, z, 0.18, 0.35, 0.18);
      flame.rotation.y = Math.PI / 4;
      const light = new three.PointLight(0xffcb73, 2.3, 7, 1.5);
      light.position.set(x, 2.2, z);
      world.add(light);
    };
    switch (feature.kind) {
      case "statue":
        mesh(assets.cylinder, assets.railMaterial, feature.x, 0.3, feature.z, 1.45, 0.55, 1.45);
        mesh(assets.cylinder, assets.wallMaterial, feature.x, 1.35, feature.z, 0.55, 1.7, 0.55);
        mesh(assets.box, assets.glowMaterial, feature.x, 2.5, feature.z, 0.26, 0.75, 0.26);
        break;
      case "tower":
        mesh(assets.cylinder, assets.wallMaterial, feature.x, 2.25, feature.z, 1.2, 4.5, 1.2);
        mesh(assets.cylinder, assets.railMaterial, feature.x, 4.55, feature.z, 1.45, 0.3, 1.45);
        break;
      case "waterfall": {
        const fall = mesh(assets.plane, assets.waterfallMaterial, feature.x, 1.75, feature.z, 1.5, 3.6, 1);
        fall.rotation.y = feature.rotation ?? 0;
        break;
      }
      case "ruin":
        mesh(assets.cylinder, assets.wallMaterial, feature.x, 0.7, feature.z, 0.38, 1.4, 0.38);
        mesh(assets.box, assets.mossMaterial, feature.x + 0.12, 1.42, feature.z, 0.65, 0.12, 0.65);
        break;
      case "candelabra":
        candle(feature.x - 0.35, feature.z);
        candle(feature.x + 0.35, feature.z);
        break;
      case "chapel":
      case "sanctuary": {
        const width = feature.kind === "sanctuary" ? 6.4 : 3.4;
        const height = feature.kind === "sanctuary" ? 5.8 : 3.5;
        const pane = mesh(assets.plane, assets.glassMaterial, feature.x, height / 2, feature.z - 1.45, width, height, 1);
        pane.rotation.y = Math.PI;
        const rose = mesh(assets.roseWindow, assets.glassMaterial, feature.x, height * 0.69, feature.z - 1.5, width * 0.29, width * 0.29, 1);
        rose.rotation.y = Math.PI;
        const roseFrame = mesh(assets.roseWindowFrame, assets.goldMaterial, feature.x, height * 0.69, feature.z - 1.53, width * 0.29, width * 0.29, 1);
        roseFrame.rotation.y = Math.PI;
        mesh(assets.box, assets.railMaterial, feature.x, 0.5, feature.z, width * 0.55, 0.55, 1.1);
        mesh(assets.box, assets.goldMaterial, feature.x, 1.08, feature.z, width * 0.38, 0.12, 0.55);
        candle(feature.x - width * 0.34, feature.z + 0.2);
        candle(feature.x + width * 0.34, feature.z + 0.2);
        break;
      }
      case "library": {
        for (const side of [-1, 1]) {
          const shelfX = feature.x + side * 2.4;
          mesh(assets.box, assets.wallMaterial, shelfX, 1.5, feature.z, 0.45, 3, 3.5);
          for (let row = 0; row < 3; row += 1) {
            mesh(assets.box, assets.goldMaterial, shelfX + side * 0.27, 0.55 + row * 0.85, feature.z, 0.08, 0.55, 2.7);
          }
        }
        mesh(assets.box, assets.railMaterial, feature.x, 0.7, feature.z + 0.25, 2.8, 1.25, 0.8);
        break;
      }
      case "inscription": {
        mesh(assets.box, assets.wallMaterial, feature.x, 1.65, feature.z, 1.55, 3.3, 0.55);
        const glyph = mesh(assets.plane, assets.glowMaterial, feature.x, 1.7, feature.z - 0.29, 0.9, 1.8, 1);
        glyph.rotation.y = Math.PI;
        break;
      }
    }
  }

  private renderView(): void {
    const view = this.view;
    if (!view) return;
    const time = this.time.now / 1000;
    view.camera.position.set(this.position.x, LAKE_CASTLE_3D_SETTINGS.eyeHeight, this.position.z);
    view.camera.rotation.set(0, this.yaw, 0);
    for (const texture of view.waterfallTextures) texture.offset.y = -time * 0.4;
    view.renderer.render(view.world, view.camera);
    this.textures.get(this.viewTextureKey).source[0]?.update();
    this.drawMinimapMarker();
  }

  private installPointerLock(): void {
    if (this.sys.game.device.input.touch) return;
    const canvas = this.game.canvas;
    const lock = (): void => {
      this.pointerLocked = document.pointerLockElement === canvas;
    };
    const mouseMove = (event: MouseEvent): void => {
      if (!this.pointerLocked || this.transitioning || this.dialogueBox?.isOpen || this.fieldMenu?.isOpen) return;
      this.yaw = normalizeYaw(this.yaw - event.movementX * LAKE_CASTLE_3D_SETTINGS.mouseSensitivity);
    };
    const request = (): void => {
      if (!this.transitioning && document.pointerLockElement !== canvas) canvas.requestPointerLock();
    };
    document.addEventListener("pointerlockchange", lock);
    document.addEventListener("mousemove", mouseMove);
    this.input.on("pointerdown", request);
    (this as unknown as { lakePointerCleanup?: () => void }).lakePointerCleanup = () => {
      document.removeEventListener("pointerlockchange", lock);
      document.removeEventListener("mousemove", mouseMove);
      this.input.off("pointerdown", request);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    };
  }

  private removePointerLock(): void {
    (this as unknown as { lakePointerCleanup?: () => void }).lakePointerCleanup?.();
  }

  private setDebugVisible(visible: boolean): void {
    if (!isDevMode) return;
    this.debugVisible = visible;
    if (!this.debugGraphics) this.debugGraphics = this.add.graphics().setDepth(HUD_DEPTH - 1);
    if (!this.debugText) this.debugText = this.add.text(20, 76, "", { color: "#ffdd7a", fontFamily: "monospace", fontSize: "14px", stroke: "#071522", strokeThickness: 4 }).setDepth(HUD_DEPTH);
    this.debugGraphics.setVisible(visible);
    this.debugText.setVisible(visible);
    if (visible) {
      const scale = 6;
      const graphics = this.debugGraphics.clear().lineStyle(1, 0xffd25f, 0.28);
      for (let z = 0; z < this.plan.height; z += 1) for (let x = 0; x < this.plan.width; x += 1) {
        if (!lakeCastleIsWalkable(this.plan, x, z)) graphics.strokeRect(10 + x * scale, 180 + z * scale, scale, scale);
      }
    }
  }

  private updateDebug(delta: number): void {
    if (!this.debugVisible || !this.debugText) return;
    const fps = delta > 0 ? Math.round(1000 / delta) : 0;
    this.debugText.setText(`DEV  floor=${this.floorId}  x=${this.position.x.toFixed(2)} z=${this.position.z.toFixed(2)} yaw=${this.yaw.toFixed(2)}  ${fps}fps`);
  }

  private exposeDevTools(): void {
    (window as unknown as { __lakeCastle3D?: unknown }).__lakeCastle3D = {
      scene: this,
      state: (): { floor: LakeCastleFloorId; x: number; z: number; yaw: number } => ({ floor: this.floorId, x: this.position.x, z: this.position.z, yaw: this.yaw }),
      goToFloor: (floor: LakeCastleFloorId): void => this.changeFloor(floor, Object.keys(LAKE_CASTLE_FLOORS[floor].spawns)[0]),
      toggleDebug: (): void => this.setDebugVisible(!this.debugVisible),
    };
  }

  private disposeView(): void {
    if (this.view) disposeLakeView(this.view);
    this.view = undefined;
    if (this.textures.exists(this.viewTextureKey)) this.textures.remove(this.viewTextureKey);
  }
}

function makeCollisionGrid(plan: LakeCastleFloorPlan): BlockedCellGrid {
  const blocked = new Uint8Array(plan.width * plan.height);
  for (let z = 0; z < plan.height; z += 1) for (let x = 0; x < plan.width; x += 1) blocked[z * plan.width + x] = lakeCastleIsWalkable(plan, x, z) ? 0 : 1;
  return { columns: plan.width, rows: plan.height, cellSize: 1, width: plan.width, height: plan.height, blocked };
}

function forwardVector(yaw: number): { x: number; z: number } {
  return { x: Math.sin(yaw), z: -Math.cos(yaw) };
}

function normalizeYaw(yaw: number): number {
  const turn = Math.PI * 2;
  return ((yaw % turn) + turn) % turn;
}

function isNearZone(zone: LakeCastleZone, x: number, z: number): boolean {
  const closestX = Phaser.Math.Clamp(x, zone.x, zone.x + zone.width);
  const closestZ = Phaser.Math.Clamp(z, zone.z, zone.z + zone.height);
  return Math.hypot(x - closestX, z - closestZ) <= INTERACTION_RADIUS;
}

function addInstances(three: Three, world: ThreeTypes.Scene, geometry: ThreeTypes.BufferGeometry, material: ThreeTypes.Material, matrices: readonly ThreeTypes.Matrix4[]): void {
  if (matrices.length === 0) return;
  const items = new three.InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((matrix, index) => items.setMatrixAt(index, matrix));
  items.instanceMatrix.needsUpdate = true;
  world.add(items);
}

function disposeLakeView(view: LakeView): void {
  view.world.clear();
  for (const item of view.disposables) item.dispose();
  view.renderer.dispose();
  view.renderer.forceContextLoss();
}

function pixelCanvas(draw: (context: CanvasRenderingContext2D, size: number) => void, size = 64): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is required for Lake Castle materials");
  draw(context, size);
  return canvas;
}

function drawStoneCanvas(): HTMLCanvasElement {
  return pixelCanvas((context, size) => {
    context.fillStyle = "#4e5d67";
    context.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 32) for (let x = 0; x < size; x += 32) {
      context.fillStyle = (x / 32 + y / 32) % 2 === 0 ? "#74858d" : "#64757f";
      context.fillRect(x + 1, y + 1, 30, 30);
      context.strokeStyle = "#2d3a44";
      context.strokeRect(x + 0.5, y + 0.5, 31, 31);
      if ((x + y) % 32 === 0) {
        context.fillStyle = "#4c6e59";
        context.fillRect(x + 3, y + 25, 7, 3);
      }
    }
  });
}

function drawBridgeCanvas(): HTMLCanvasElement {
  return pixelCanvas((context, size) => {
    context.fillStyle = "#d5d8d0";
    context.fillRect(0, 0, size, size);
    context.strokeStyle = "#6d7777";
    context.lineWidth = 2;
    context.strokeRect(1, 1, size - 2, size - 2);
    context.strokeStyle = "rgba(90,111,111,0.5)";
    context.beginPath(); context.moveTo(14, 8); context.lineTo(27, 28); context.lineTo(23, 48); context.stroke();
  });
}

function drawCeilingCanvas(): HTMLCanvasElement {
  return pixelCanvas((context, size) => {
    context.fillStyle = "#3f4d5a";
    context.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 32) for (let x = 0; x < size; x += 32) {
      context.fillStyle = (x / 32 + y / 32) % 2 === 0 ? "#5f7080" : "#526373";
      context.fillRect(x + 2, y + 2, 28, 28);
      context.strokeStyle = "#24313d";
      context.lineWidth = 2;
      context.strokeRect(x + 1, y + 1, 30, 30);
      context.fillStyle = "rgba(25, 35, 48, 0.24)";
      context.fillRect(x + 4, y + 4, 24, 5);
    }
  });
}

function drawWaterCanvas(): HTMLCanvasElement {
  return pixelCanvas((context, size) => {
    const gradient = context.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#123c4b");
    gradient.addColorStop(0.5, "#184d58");
    gradient.addColorStop(1, "#0d303f");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    context.strokeStyle = "rgba(147,204,210,0.14)";
    context.lineWidth = 1;
    for (let y = 8; y < size; y += 14) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y);
      context.stroke();
    }
  });
}

function drawWaterfallCanvas(): HTMLCanvasElement {
  return pixelCanvas((context, size) => {
    const gradient = context.createLinearGradient(0, 0, size, 0);
    gradient.addColorStop(0, "rgba(66,190,255,0)");
    gradient.addColorStop(0.28, "rgba(125,229,255,0.58)");
    gradient.addColorStop(0.55, "rgba(230,255,255,0.92)");
    gradient.addColorStop(0.8, "rgba(95,205,255,0.5)");
    gradient.addColorStop(1, "rgba(66,190,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    context.strokeStyle = "rgba(255,255,255,0.65)";
    for (let x = 10; x < size; x += 14) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x - 5, size); context.stroke();
    }
  });
}

function drawGlassCanvas(): HTMLCanvasElement {
  return pixelCanvas((context, size) => {
    context.fillStyle = "#167ab5";
    context.fillRect(0, 0, size, size);
    context.strokeStyle = "#d1b766";
    context.lineWidth = 3;
    context.strokeRect(3, 3, size - 6, size - 6);
    context.beginPath(); context.moveTo(size / 2, 4); context.lineTo(size / 2, size - 4); context.stroke();
    context.beginPath(); context.moveTo(4, size / 2); context.lineTo(size - 4, size / 2); context.stroke();
    context.fillStyle = "#9cf5ff";
    context.beginPath(); context.arc(size / 2, size / 2, size * 0.14, 0, Math.PI * 2); context.fill();
  });
}
