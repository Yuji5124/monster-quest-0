import Phaser from "phaser";
import { DISPLAY } from "../config/display.ts";
import { MAPS } from "../config/maps.ts";
import type { MapId } from "../config/maps.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { beginMapTransition } from "../systems/MapTransition.ts";
import {
  readInterimUnlockedFlags,
  readWorldMapDestinations,
  readWorldMapManifest,
  resolveWorldMapDestinations,
  resolveWorldMapEntryDestination,
} from "../systems/WorldMapData.ts";
import type { WorldMapDestination, WorldMapManifest } from "../systems/WorldMapData.ts";

const MANIFEST_KEY = "world-map.manifest";
const BACKGROUND_KEY = "world-map.background";
const DESTINATIONS_KEY = "world-map.destinations";
const MANIFEST_PATH = new URL("../../assets/maps/world_map/map.json", import.meta.url).toString();
const BACKGROUND_PATH = new URL("../../assets/maps/world_map/background.png", import.meta.url).toString();
const DESTINATIONS_PATH = new URL("../../assets/maps/world_map/destinations.json", import.meta.url).toString();
const TRANSITION_MS = 260;

export interface WorldMapSceneData {
  /** maps.tsのworldMapEntryId。world_map/map.jsonを介して現在地ポイントへ解決する。 */
  readonly worldMapEntryId?: string;
}

interface DestinationMarker {
  readonly destination: WorldMapDestination;
  readonly x: number;
  readonly y: number;
  readonly ring: Phaser.GameObjects.Arc;
  readonly core: Phaser.GameObjects.Arc;
  readonly label: Phaser.GameObjects.Text;
}

/**
 * 地域間の正式移動用Scene。背景上を歩かず、目的地を選んでローカルマップへ遷移する。
 * unlockFlagの解決元だけを将来のSaveSystemへ差し替えられるよう、描画・入力とは分離する。
 */
export class WorldMapScene extends Phaser.Scene {
  private actions!: InputSystem;
  private destinations: readonly WorldMapDestination[] = [];
  private markers: DestinationMarker[] = [];
  private selectedDestinationId: string | null = null;
  private notice!: Phaser.GameObjects.Text;
  private defaultNotice = "";
  private transitioning = false;

  constructor(sceneKey = "WorldMapScene") {
    super({ key: sceneKey });
  }

  preload(): void {
    this.load.json(MANIFEST_KEY, MANIFEST_PATH);
    this.load.image(BACKGROUND_KEY, BACKGROUND_PATH);
    this.load.json(DESTINATIONS_KEY, DESTINATIONS_PATH);
  }

  create(data?: WorldMapSceneData): void {
    this.transitioning = false;
    this.selectedDestinationId = null;
    this.markers = [];
    const manifest = readWorldMapManifest(this.cache.json.get(MANIFEST_KEY));
    const definitions = readWorldMapDestinations(this.cache.json.get(DESTINATIONS_KEY), manifest);
    this.destinations = resolveWorldMapDestinations(definitions, this.readUnlockedFlags(manifest));
    const currentDestination = this.resolveCurrentDestination(data?.worldMapEntryId, manifest, definitions);
    this.defaultNotice = currentDestination
      ? `現在地：${currentDestination.displayName}　行き先を選んでください　Esc: 選択解除`
      : "行き先を選んでください　Esc: 選択解除";

    this.textures.get(BACKGROUND_KEY).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const background = this.add.image(0, 0, BACKGROUND_KEY).setOrigin(0, 0).setDisplaySize(DISPLAY.width, DISPLAY.height);
    if (background.displayWidth !== DISPLAY.width || background.displayHeight !== DISPLAY.height) {
      throw new Error("world map background must fit the display exactly");
    }

    const scaleX = DISPLAY.width / manifest.width;
    const scaleY = DISPLAY.height / manifest.height;
    for (const destination of this.destinations) this.createMarker(destination, scaleX, scaleY);

    this.cameras.main.setBackgroundColor("#081422");
    this.cameras.main.setBounds(0, 0, DISPLAY.width, DISPLAY.height);
    this.notice = this.add.text(24, DISPLAY.height - 80, this.defaultNotice, {
      color: "#ffffff",
      fontFamily: "sans-serif",
      fontSize: "22px",
      stroke: "#07111e",
      strokeThickness: 6,
    }).setScrollFactor(0).setDepth(100);
    const title = this.add.text(24, 22, "世界地図", {
      color: "#ffffff",
      fontFamily: "sans-serif",
      fontSize: "30px",
      fontStyle: "bold",
      stroke: "#07111e",
      strokeThickness: 7,
    }).setScrollFactor(0).setDepth(100);
    const controls = this.add.text(24, 58, "クリック / タップ: 選択　もう一度: 移動　方向キー + Z / Enter　Esc: 選択解除", {
      color: "#d6e8ff",
      fontFamily: "sans-serif",
      fontSize: "15px",
      stroke: "#07111e",
      strokeThickness: 4,
    }).setScrollFactor(0).setDepth(100);

    // メインCameraは背景・地点だけを拡大する。HUDは等倍の専用Cameraで常に読める状態を保つ。
    const hudObjects = [title, controls, this.notice];
    const worldObjects = [background, ...this.markers.flatMap((marker) => [marker.ring, marker.core, marker.label])];
    this.cameras.main.ignore(hudObjects);
    const hudCamera = this.cameras.add(0, 0, DISPLAY.width, DISPLAY.height);
    hudCamera.setScroll(0, 0).setZoom(1);
    hudCamera.ignore(worldObjects);
    this.cameras.main.fadeIn(TRANSITION_MS, 0, 0, 0);
    hudCamera.fadeIn(TRANSITION_MS, 0, 0, 0);

    this.actions = new InputSystem(window, document);
    const updateInput = (): void => this.updateInput();
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, updateInput);
    const cleanup = (): void => {
      this.actions.destroy();
      this.events.off(Phaser.Scenes.Events.PRE_UPDATE, updateInput);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[WORLD_MAP] ${manifest.id} loaded: ${manifest.width}x${manifest.height}, destinations=${this.destinations.length}`);
    }
  }

  /** Interim: map.json's developmentUnlockedFlags. Wire the SaveSystem's flags here (via WorldMapData.ts) once they exist. */
  protected readUnlockedFlags(manifest: WorldMapManifest): ReadonlySet<string> {
    return readInterimUnlockedFlags(manifest);
  }

  private resolveCurrentDestination(
    entryId: string | undefined,
    manifest: WorldMapManifest,
    definitions: Parameters<typeof resolveWorldMapDestinations>[0],
  ): WorldMapDestination | undefined {
    if (!entryId) return undefined;
    const entryDestination = resolveWorldMapEntryDestination(manifest, definitions, entryId);
    const currentDestination = this.destinations.find((destination) => destination.id === entryDestination.id);
    if (!currentDestination) throw new Error(`world map entry ${entryId} points to a hidden destination`);
    return currentDestination;
  }

  private createMarker(destination: WorldMapDestination, scaleX: number, scaleY: number): void {
    const x = destination.x * scaleX;
    const y = destination.y * scaleY;
    const ring = this.add.circle(x, y, 24, 0x0b2236, 0.78).setStrokeStyle(3, 0xe8f4ff, 0.85).setDepth(20);
    const core = this.add.circle(x, y, 11, destination.unlocked ? 0x44d8ff : 0x687382, 1).setDepth(21);
    const label = this.add.text(x, y + 31, destination.displayName, {
      color: destination.unlocked ? "#ffffff" : "#aeb7c0",
      fontFamily: "sans-serif",
      fontSize: "17px",
      stroke: "#07111e",
      strokeThickness: 5,
    }).setOrigin(0.5, 0).setDepth(22);
    ring.setInteractive({ useHandCursor: destination.unlocked });
    ring.on("pointerdown", () => {
      if (!destination.unlocked || this.transitioning) return;
      if (this.selectedDestinationId === destination.id) this.travelToSelectedDestination();
      else this.selectDestination(destination.id);
    });
    this.tweens.add({ targets: ring, scale: { from: 1, to: 1.13 }, alpha: { from: 0.78, to: 0.38 }, yoyo: true, repeat: -1, duration: 850, delay: this.markers.length * 140 });
    this.markers.push({ destination, x, y, ring, core, label });
  }

  private updateInput(): void {
    if (this.transitioning) return;
    if (this.actions.consumePressed("moveRight") || this.actions.consumePressed("moveDown")) this.moveSelection(1);
    else if (this.actions.consumePressed("moveLeft") || this.actions.consumePressed("moveUp")) this.moveSelection(-1);
    else if (this.actions.consumePressed("confirm")) {
      if (this.selectedDestinationId) this.travelToSelectedDestination();
      else this.moveSelection(1);
    } else if (this.actions.consumePressed("cancel")) {
      this.clearSelection();
    }
  }

  private moveSelection(direction: 1 | -1): void {
    const selectable = this.markers.filter((marker) => marker.destination.unlocked);
    if (selectable.length === 0) return;
    const index = selectable.findIndex((marker) => marker.destination.id === this.selectedDestinationId);
    const nextIndex = (index + direction + selectable.length) % selectable.length;
    this.selectDestination(selectable[nextIndex].destination.id);
  }

  private selectDestination(id: string): void {
    const marker = this.markers.find((candidate) => candidate.destination.id === id);
    if (!marker || !marker.destination.unlocked) return;
    this.selectedDestinationId = id;
    for (const candidate of this.markers) {
      const selected = candidate.destination.id === id;
      candidate.ring.setStrokeStyle(selected ? 4 : 3, selected ? 0xffd86a : 0xe8f4ff, 0.95);
      candidate.core.setFillStyle(selected ? 0xffc34d : 0x44d8ff, 1);
      candidate.label.setColor(selected ? "#fff1bd" : "#ffffff");
    }
    this.notice.setText(`${marker.destination.name}　Z / Enter、またはもう一度クリックで移動`);
    this.cameras.main.pan(marker.x, marker.y, 260, "Sine.easeOut");
    this.cameras.main.zoomTo(1.35, 260, "Sine.easeOut");
  }

  private clearSelection(): void {
    if (!this.selectedDestinationId) return;
    this.selectedDestinationId = null;
    for (const marker of this.markers) {
      marker.ring.setStrokeStyle(3, 0xe8f4ff, 0.85);
      marker.core.setFillStyle(marker.destination.unlocked ? 0x44d8ff : 0x687382, 1);
      marker.label.setColor(marker.destination.unlocked ? "#ffffff" : "#aeb7c0");
    }
    this.notice.setText(this.defaultNotice);
    this.cameras.main.pan(DISPLAY.width / 2, DISPLAY.height / 2, 220, "Sine.easeOut");
    this.cameras.main.zoomTo(1, 220, "Sine.easeOut");
  }

  private travelToSelectedDestination(): void {
    if (!this.selectedDestinationId) return;
    const destination = this.destinations.find((candidate) => candidate.id === this.selectedDestinationId);
    if (!destination || !destination.unlocked) return;
    const target = MAPS[destination.targetMapId as MapId];
    if (!target || !target.spawns[destination.targetSpawnId]) {
      throw new Error(`world-map destination ${destination.id} has an unknown target`);
    }
    this.transitioning = true;
    this.notice.setText(`${destination.name}へ移動します…`);
    const data: Record<string, string> = { spawnId: destination.targetSpawnId };
    if (target.sceneKey === "MajinCaveScene") data.returnSceneKey = this.scene.key;
    beginMapTransition(this, this.actions, target.sceneKey, data, TRANSITION_MS);
  }
}
