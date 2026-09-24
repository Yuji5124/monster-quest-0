import Phaser from "phaser";
import { DISPLAY } from "../config/display.ts";
import { MAPS } from "../config/maps.ts";
import type { MapId } from "../config/maps.ts";
import { getWorldMapMarkerStyle, WORLD_MAP_MARKER_LAYOUT } from "../config/worldMapPresentation.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { GameStateRepository } from "../systems/GameStateRepository.ts";
import { beginMapTransition } from "../systems/MapTransition.ts";
import {
  isWorldMapDestinationTravelReady,
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
  /** One transparent map-wide Zone resolves to the nearest point, including overlapping mobile targets. */
  private mapHitArea!: Phaser.GameObjects.Zone;
  private selectedDestinationId: string | null = null;
  private notice!: Phaser.GameObjects.Text;
  private defaultNotice = "";
  private transitioning = false;
  private readonly gameState = new GameStateRepository();

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
    this.createMapHitArea();

    this.cameras.main.setBackgroundColor("#081422");
    this.cameras.main.setBounds(0, 0, DISPLAY.width, DISPLAY.height);
    this.notice = this.add.text(18, DISPLAY.height - 18, this.defaultNotice, {
      color: "#ffffff",
      fontFamily: "sans-serif",
      fontSize: "16px",
      stroke: "#07111e",
      strokeThickness: 3,
    }).setOrigin(0, 1).setScrollFactor(0).setDepth(100);
    const title = this.add.text(18, 12, "世界地図", {
      color: "#ffffff",
      fontFamily: "sans-serif",
      fontSize: "22px",
      fontStyle: "bold",
      stroke: "#07111e",
      strokeThickness: 4,
    }).setScrollFactor(0).setDepth(100);
    const controls = this.add.text(18, 42, "タップ/方向キー: 選択　Z/Enter: 移動　Esc: 戻る", {
      color: "#d6e8ff",
      fontFamily: "sans-serif",
      fontSize: "13px",
      stroke: "#07111e",
      strokeThickness: 3,
    }).setScrollFactor(0).setDepth(100);

    // メインCameraは背景・地点だけを拡大する。HUDは等倍の専用Cameraで常に読める状態を保つ。
    const hudObjects = [title, controls, this.notice];
    const worldObjects = [background, this.mapHitArea, ...this.markers.flatMap((marker) => [marker.ring, marker.core, marker.label])];
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

  /** Keeps legacy DEV defaults while adding persistent progress flags from the shared GameState boundary. */
  protected readUnlockedFlags(manifest: WorldMapManifest): ReadonlySet<string> {
    return new Set([...readInterimUnlockedFlags(manifest), ...this.gameState.getFlags()]);
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
    const style = getWorldMapMarkerStyle(destination.implementationStatus, destination.unlocked, false);
    const ring = this.add.circle(x, y, WORLD_MAP_MARKER_LAYOUT.ringRadius, style.ringFill, style.ringAlpha)
      .setStrokeStyle(WORLD_MAP_MARKER_LAYOUT.ringStrokeThickness, style.ringStroke, 0.9)
      .setDepth(20);
    const core = this.add.circle(x, y, WORLD_MAP_MARKER_LAYOUT.coreRadius, style.coreFill, 1).setDepth(21);
    const label = this.add.text(
      x + destination.labelOffset.x * scaleX,
      y + destination.labelOffset.y * scaleY,
      destination.displayName,
      {
      color: style.labelColor,
      fontFamily: "sans-serif",
      fontSize: WORLD_MAP_MARKER_LAYOUT.labelFontSize,
      stroke: "#07111e",
      strokeThickness: WORLD_MAP_MARKER_LAYOUT.labelStrokeThickness,
    }).setOrigin(0.5, 0.5).setDepth(22);
    this.tweens.add({ targets: ring, scale: { from: 1, to: 1.13 }, alpha: { from: style.ringAlpha, to: 0.38 }, yoyo: true, repeat: -1, duration: 850, delay: this.markers.length * 90 });
    this.markers.push({ destination, x, y, ring, core, label });
  }

  private createMapHitArea(): void {
    this.mapHitArea = this.add.zone(DISPLAY.width / 2, DISPLAY.height / 2, DISPLAY.width, DISPLAY.height)
      .setOrigin(0.5, 0.5)
      .setDepth(19)
      .setInteractive();
    this.mapHitArea.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.transitioning) return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const destination = this.findDestinationAt(point.x, point.y);
      if (!destination) return;
      if (!isWorldMapDestinationTravelReady(destination)) {
        this.showUnavailableDestinationNotice(destination);
        return;
      }
      if (this.selectedDestinationId === destination.id) this.travelToSelectedDestination();
      else this.selectDestination(destination.id);
    });
  }

  private findDestinationAt(x: number, y: number): WorldMapDestination | undefined {
    const hitRadius = this.getLogicalTapTargetSize() / 2;
    let nearest: DestinationMarker | undefined;
    let nearestDistanceSquared = hitRadius * hitRadius;
    for (const marker of this.markers) {
      const distanceSquared = Phaser.Math.Distance.Squared(x, y, marker.x, marker.y);
      if (distanceSquared <= nearestDistanceSquared) {
        nearest = marker;
        nearestDistanceSquared = distanceSquared;
      }
    }
    return nearest?.destination;
  }

  /**
   * 960x720 keeps the specified 44px Zone. When Phaser scales down for iPhone Safari,
   * enlarge only the invisible logical radius so the physical tap target remains 44px.
   */
  private getLogicalTapTargetSize(): number {
    const canvasBounds = this.game.canvas.getBoundingClientRect();
    const cssScale = Math.min(canvasBounds.width / DISPLAY.width, canvasBounds.height / DISPLAY.height);
    return Math.max(WORLD_MAP_MARKER_LAYOUT.hitSize, WORLD_MAP_MARKER_LAYOUT.hitSize / Math.max(cssScale, 0.01));
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
    const selectable = this.markers.filter((marker) => isWorldMapDestinationTravelReady(marker.destination));
    if (selectable.length === 0) return;
    const index = selectable.findIndex((marker) => marker.destination.id === this.selectedDestinationId);
    const nextIndex = (index + direction + selectable.length) % selectable.length;
    this.selectDestination(selectable[nextIndex].destination.id);
  }

  private selectDestination(id: string): void {
    const marker = this.markers.find((candidate) => candidate.destination.id === id);
    if (!marker || !isWorldMapDestinationTravelReady(marker.destination)) return;
    this.selectedDestinationId = id;
    for (const candidate of this.markers) {
      this.applyMarkerStyle(candidate, candidate.destination.id === id);
    }
    this.notice.setText(`${marker.destination.name}　Z / Enter、またはもう一度クリックで移動`);
    this.cameras.main.pan(marker.x, marker.y, 260, "Sine.easeOut");
    this.cameras.main.zoomTo(1.35, 260, "Sine.easeOut");
  }

  private clearSelection(resetNotice = true): void {
    if (!this.selectedDestinationId) {
      if (resetNotice) this.notice.setText(this.defaultNotice);
      return;
    }
    this.selectedDestinationId = null;
    for (const marker of this.markers) {
      this.applyMarkerStyle(marker, false);
    }
    if (resetNotice) this.notice.setText(this.defaultNotice);
    this.cameras.main.pan(DISPLAY.width / 2, DISPLAY.height / 2, 220, "Sine.easeOut");
    this.cameras.main.zoomTo(1, 220, "Sine.easeOut");
  }

  private applyMarkerStyle(marker: DestinationMarker, selected: boolean): void {
    const style = getWorldMapMarkerStyle(marker.destination.implementationStatus, marker.destination.unlocked, selected);
    marker.ring.setFillStyle(style.ringFill, style.ringAlpha);
    marker.ring.setStrokeStyle(WORLD_MAP_MARKER_LAYOUT.ringStrokeThickness, style.ringStroke, 0.9);
    marker.core.setFillStyle(style.coreFill, 1);
    marker.label.setColor(style.labelColor);
  }

  private showUnavailableDestinationNotice(destination: WorldMapDestination): void {
    this.clearSelection(false);
    this.notice.setText(destination.implementationStatus === "planned" ? "まだ行くことができない" : "この場所はまだ移動できません");
  }

  private travelToSelectedDestination(): void {
    if (!this.selectedDestinationId) return;
    const destination = this.destinations.find((candidate) => candidate.id === this.selectedDestinationId);
    if (!destination || !isWorldMapDestinationTravelReady(destination)) return;
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
