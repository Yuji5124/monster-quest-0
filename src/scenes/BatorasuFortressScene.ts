import Phaser from "phaser";
import { DISPLAY } from "../config/display.ts";
import { PROTAGONIST_SPRITE } from "../config/protagonistSprite.ts";
import { TAROSA_SPRITE } from "../config/tarosaSprite.ts";
import { MIREI_SPRITE } from "../config/mireiSprite.ts";
import { Player } from "../entities/Player.ts";
import { beginBattleEntrance } from "../events/BattleEntrance.ts";
import { ensureWalkAnimations, preloadWalkSprite } from "../systems/CharacterWalkSprite.ts";
import { configureMapCamera } from "../systems/MapCamera.ts";
import { MAP_TRANSITION_FADE_MS } from "../config/maps.ts";
import { beginMapTransition } from "../systems/MapTransition.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { PartyFollowers } from "../systems/PartyFollowers.ts";
import { GameStateRepository } from "../systems/GameStateRepository.ts";
import { inventory } from "../systems/Inventory.ts";
import {
  BATTLE_FORTRESS_TILE_SIZE,
  buildBattleFortressWallRects,
  generateBattleFortress,
} from "../systems/BattleFortressGenerator.ts";
import type { BattleFortressPlan, FortressRoom } from "../systems/BattleFortressGenerator.ts";
import type { Facing } from "../systems/PlayerMovement.ts";

const SCENE_KEY = "BatorasuFortressScene";
const BOSS_FLAG = "boss.batorasu_defeated";
const FORTRESS_STOPPED_FLAG = "story.batorasu_fortress_stopped";
const PLAYER_DEPTH = 1000;
const PROP_DEPTH = 10;

export interface BatorasuFortressSceneData {
  /** WorldMap uses this stable spawn key; this generated map resolves its actual entrance from the seed. */
  readonly spawnId?: "fromWorldMap";
  readonly seed?: string | number;
  readonly spawnX?: number;
  readonly spawnY?: number;
  readonly spawnFacing?: Facing;
  readonly battleEventReturn?: boolean;
}

interface TreasureRuntime {
  readonly itemId: "dokukeshi" | "kaifukuyaku";
  readonly x: number;
  readonly y: number;
  readonly flag: string;
  readonly visual: Phaser.GameObjects.Container;
}

/**
 * No.19: a generated room-module fortress. Generation/state lives in
 * BattleFortressGenerator; this Scene only renders it and adapts field input/events.
 */
export class BatorasuFortressScene extends Phaser.Scene {
  private actions!: InputSystem;
  private player!: Player;
  private plan!: BattleFortressPlan;
  private readonly gameState = new GameStateRepository();
  private roomLayers = new Map<string, Phaser.GameObjects.Container>();
  private activatedRooms = new Set<string>();
  private treasures: TreasureRuntime[] = [];
  private bossVisual: Phaser.GameObjects.Image | undefined;
  private notice: Phaser.GameObjects.Text | undefined;
  private locked = false;

  constructor() {
    super(SCENE_KEY);
  }

  preload(): void {
    preloadWalkSprite(this, PROTAGONIST_SPRITE);
    preloadWalkSprite(this, TAROSA_SPRITE);
    preloadWalkSprite(this, MIREI_SPRITE);
    if (!this.textures.exists("fortress.batorasu")) {
      this.load.image("fortress.batorasu", new URL("../../assets/monsters/source/portraits/mq0_monster_039_09ac6a99aa.png", import.meta.url).toString());
    }
  }

  create(data?: BatorasuFortressSceneData): void {
    const querySeed = new URLSearchParams(window.location.search).get("seed") ?? undefined;
    this.plan = generateBattleFortress(data?.seed ?? querySeed);
    this.locked = false;
    this.roomLayers.clear();
    this.activatedRooms.clear();
    this.treasures = [];
    this.cameras.main.setBackgroundColor(0x050609);
    this.actions = new InputSystem(window, document);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.actions.destroy());

    this.drawFortress();
    ensureWalkAnimations(this, PROTAGONIST_SPRITE);
    const spawn = typeof data?.spawnX === "number" && typeof data?.spawnY === "number"
      ? { x: data.spawnX, y: data.spawnY, facing: data.spawnFacing ?? "right" as Facing }
      : this.toWorld(this.plan.entrance, "right");
    this.player = new Player(this, spawn.x, spawn.y, spawn.facing);
    this.player.setDepth(PLAYER_DEPTH);
    new PartyFollowers(this, this.player);
    this.createWalls();
    configureMapCamera(this, this.player.visual, {
      x: 0,
      y: 0,
      width: this.plan.width * BATTLE_FORTRESS_TILE_SIZE,
      height: this.plan.height * BATTLE_FORTRESS_TILE_SIZE,
    });
    this.notice = this.add.text(10, 10, "", {
      fontFamily: "monospace", fontSize: "14px", color: "#d7d2c7", stroke: "#08080b", strokeThickness: 4,
    }).setScrollFactor(0).setDepth(3000);
    this.add.text(DISPLAY.width - 10, 10, `No.19　バトラスのとりで\nseed ${this.plan.seed}`, {
      fontFamily: "monospace", fontSize: "12px", color: "#acaaa3", align: "right", stroke: "#08080b", strokeThickness: 4,
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(3000);
    if (typeof import.meta.env !== "undefined" && import.meta.env.DEV) this.createDebugOverlay();

    if (this.gameState.hasFlag(BOSS_FLAG)) this.stopFortress();
    else this.setNotice("石壁の奥で　なにかが　組みかわる。", 2600);
    this.cameras.main.fadeIn(180, 0, 0, 0);
  }

  update(): void {
    if (!this.player || this.locked) return;
    const confirm = this.actions.consumePressed("confirm");
    this.player.update(this.actions);
    this.handleRoomArrival();
    if (!this.handleTreasureInteraction(confirm)) this.handleFieldExit(confirm);
    this.handleBossApproach();
  }

  private drawFortress(): void {
    const tileSize = BATTLE_FORTRESS_TILE_SIZE;
    const graphics = this.add.graphics().setDepth(0);
    graphics.fillStyle(0x050609, 1);
    graphics.fillRect(0, 0, this.plan.width * tileSize, this.plan.height * tileSize);
    for (let y = 0; y < this.plan.height; y += 1) {
      for (let x = 0; x < this.plan.width; x += 1) {
        const tile = this.plan.tiles[y][x];
        const px = x * tileSize;
        const py = y * tileSize;
        if (tile === "floor") {
          const shade = 0x202127 + ((x * 13 + y * 7 + this.plan.seed) % 3) * 0x030303;
          graphics.fillStyle(shade, 1);
          graphics.fillRect(px, py, tileSize, tileSize);
          graphics.lineStyle(1, 0x101116, 0.65);
          graphics.strokeRect(px, py, tileSize, tileSize);
          if ((x * 17 + y * 11 + this.plan.seed) % 11 === 0) {
            graphics.lineStyle(1, 0x555158, 0.45);
            graphics.lineBetween(px + 7, py + 8, px + 16, py + 17);
            graphics.lineBetween(px + 16, py + 17, px + 13, py + 24);
          }
        } else if (tile === "wall") {
          graphics.fillStyle(0x3a3a42, 1);
          graphics.fillRect(px, py, tileSize, tileSize);
          graphics.fillStyle(0x1a1a20, 1);
          graphics.fillRect(px + 3, py + 4, tileSize - 6, tileSize - 8);
          graphics.lineStyle(2, 0x64626b, 0.65);
          graphics.lineBetween(px + 2, py + 2, px + tileSize - 3, py + 2);
        }
      }
    }
    for (const room of this.plan.rooms) this.decorateRoom(room);
    for (const treasure of this.plan.treasures) this.createTreasure(treasure.id, treasure.tile.x, treasure.tile.y);
    this.createBossVisual();
  }

  private decorateRoom(room: FortressRoom): void {
    const tileSize = BATTLE_FORTRESS_TILE_SIZE;
    const layer = this.add.container(0, 0).setDepth(PROP_DEPTH);
    this.roomLayers.set(room.id, layer);
    const centre = this.toWorld({ x: room.x + Math.floor(room.width / 2), y: room.y + Math.floor(room.height / 2) });
    const torch = (x: number, y: number, color = 0xffa344): void => {
      const mount = this.add.rectangle(x, y, 5, 14, 0x16151a).setStrokeStyle(1, 0x81736a);
      const flame = this.add.circle(x, y - 9, 5, color, 0.88).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: flame, scaleY: { from: 0.72, to: 1.25 }, alpha: { from: 0.45, to: 1 }, duration: 420 + (x % 3) * 90, yoyo: true, repeat: -1 });
      layer.add([mount, flame]);
    };
    torch((room.x + 1) * tileSize + 8, (room.y + 2) * tileSize + 17, room.kind === "boss" || room.kind === "boss-gate" ? 0xde4a38 : 0xffa344);
    torch((room.x + room.width - 1) * tileSize - 8, (room.y + room.height - 2) * tileSize - 17, room.kind === "boss" ? 0xde4a38 : 0xffa344);
    if (room.kind === "entrance") {
      const exit = this.toWorld(this.plan.entrance);
      layer.add(this.add.rectangle(exit.x, exit.y, 30, 30, 0x1b2835, 0.86).setStrokeStyle(2, 0x87a7b3));
      layer.add(this.add.text(exit.x, exit.y + 31, "もどる", {
        fontFamily: "monospace", fontSize: "10px", color: "#c7dde1", stroke: "#050609", strokeThickness: 3,
      }).setOrigin(0.5, 0));
    }
    if (room.kind === "prison") {
      for (let index = 0; index < 5; index += 1) layer.add(this.add.rectangle(centre.x - 48 + index * 24, centre.y, 4, 64, 0x6a6972));
    }
    if (room.kind === "misprint") {
      for (let index = 0; index < 10; index += 1) layer.add(this.add.rectangle(centre.x - 72 + (index % 5) * 36, centre.y - 30 + Math.floor(index / 5) * 60, 17, 18, 0x6c5141).setStrokeStyle(2, 0x2b2020));
    }
    if (room.kind === "reconfigure") {
      layer.add(this.add.rectangle(centre.x, centre.y, 24, 24, 0x30313a).setStrokeStyle(3, 0x9c8a65));
      layer.add(this.add.circle(centre.x, centre.y, 5, 0x5fdca5, 0.8).setBlendMode(Phaser.BlendModes.ADD));
    }
    if (room.kind === "checkpoint") {
      const poison = this.toWorld(this.plan.poisonHint);
      layer.add(this.add.ellipse(poison.x, poison.y, 38, 18, 0x48cf73, 0.52).setBlendMode(Phaser.BlendModes.ADD));
      layer.add(this.add.rectangle(poison.x - 24, poison.y - 13, 14, 28, 0x5b625c).setAngle(-24));
      layer.add(this.add.rectangle(poison.x + 25, poison.y - 11, 14, 29, 0x5b625c).setAngle(26));
    }
    if (room.kind === "boss-gate") {
      layer.add(this.add.rectangle(centre.x + 86, centre.y, 18, 86, 0x151519).setStrokeStyle(3, 0x8c3132));
      layer.add(this.add.rectangle(centre.x + 96, centre.y, 8, 72, 0x77717a));
    }
    if (room.kind === "boss") {
      for (const side of [-1, 1] as const) {
        layer.add(this.add.rectangle(centre.x + side * 155, centre.y, 24, 126, 0x54535a).setStrokeStyle(3, 0x8e3135));
        layer.add(this.add.rectangle(centre.x + side * 120, centre.y + 86, 36, 18, 0x5d4840).setAngle(side * 14));
      }
      layer.add(this.add.rectangle(centre.x, centre.y + 110, 210, 13, 0x581e25, 0.7));
    }
    // The unfinished room begins as bare floor; its decoration is revealed once reached.
    if (room.kind === "assembly") layer.setVisible(false);
  }

  private createWalls(): void {
    const walls = this.physics.add.staticGroup();
    for (const rect of buildBattleFortressWallRects(this.plan)) {
      const block = this.add.rectangle(
        (rect.x + rect.width / 2) * BATTLE_FORTRESS_TILE_SIZE,
        (rect.y + rect.height / 2) * BATTLE_FORTRESS_TILE_SIZE,
        rect.width * BATTLE_FORTRESS_TILE_SIZE,
        rect.height * BATTLE_FORTRESS_TILE_SIZE,
      ).setVisible(false);
      walls.add(block, true);
    }
    this.physics.add.collider(this.player.body, walls);
  }

  private createTreasure(itemId: "dokukeshi" | "kaifukuyaku", tileX: number, tileY: number): void {
    const point = this.toWorld({ x: tileX, y: tileY });
    const visual = this.add.container(point.x, point.y).setDepth(PROP_DEPTH + 2);
    visual.add(this.add.rectangle(0, 4, 22, 15, 0x6d3f21).setStrokeStyle(2, 0xd6a44a));
    visual.add(this.add.rectangle(0, -4, 23, 8, 0x8c5729).setStrokeStyle(2, 0xe1bd62));
    visual.add(this.add.rectangle(0, 0, 3, 20, 0xf1ce66));
    const flag = `treasure.batorasu_fortress.${itemId}`;
    if (this.gameState.hasFlag(flag)) visual.setVisible(false);
    this.treasures.push({ itemId, x: point.x, y: point.y, flag, visual });
  }

  private createBossVisual(): void {
    if (this.gameState.hasFlag(BOSS_FLAG)) return;
    const point = this.toWorld(this.plan.boss);
    this.bossVisual = this.add.image(point.x, point.y - 18, "fortress.batorasu").setDepth(PROP_DEPTH + 4);
    this.bossVisual.setScale(Math.min(128 / this.bossVisual.width, 132 / this.bossVisual.height));
    this.tweens.add({ targets: this.bossVisual, y: point.y - 23, duration: 1300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  private handleRoomArrival(): void {
    const current = this.plan.rooms.find((room) => this.isPlayerIn(room));
    if (!current || this.activatedRooms.has(current.id)) return;
    this.activatedRooms.add(current.id);
    if (current.kind === "assembly") this.playAssembly(current);
    else if (current.kind === "reconfigure") this.playReconstruction(current);
    else if (current.kind === "checkpoint") this.setNotice("朽ちた武器と　どくに　やられた鎧が　転がっている。", 3200);
    else if (current.kind === "direct") this.setNotice("通路は　不自然なほど　まっすぐだ。", 2600);
  }

  private handleTreasureInteraction(confirm: boolean): boolean {
    if (!confirm) return false;
    const chest = this.treasures.find((treasure) => !this.gameState.hasFlag(treasure.flag)
      && Phaser.Math.Distance.Between(this.player.body.center.x, this.player.body.center.y, treasure.x, treasure.y) < 50);
    if (!chest) return false;
    this.gameState.setFlag(chest.flag);
    inventory.add(chest.itemId);
    chest.visual.setVisible(false);
    this.setNotice(`${chest.itemId === "dokukeshi" ? "どくけし" : "かいふくやく"}を　てにいれた。`, 2200);
    return true;
  }

  /** The entrance is an explicit return point so entering from WorldMap never immediately bounces back. */
  private handleFieldExit(confirm: boolean): void {
    if (!confirm) return;
    const entrance = this.toWorld(this.plan.entrance);
    if (Phaser.Math.Distance.Between(this.player.body.center.x, this.player.body.center.y, entrance.x, entrance.y) > 52) return;
    this.locked = true;
    this.player.body.setVelocity(0, 0);
    beginMapTransition(this, this.actions, "WorldMapScene", { worldMapEntryId: "from_batorasu_fortress" }, MAP_TRANSITION_FADE_MS);
  }

  private handleBossApproach(): void {
    if (!this.bossVisual || this.gameState.hasFlag(BOSS_FLAG)) return;
    if (Phaser.Math.Distance.Between(this.player.body.center.x, this.player.body.center.y, this.bossVisual.x, this.bossVisual.y) > 112) return;
    this.locked = true;
    this.actions.setLocked(true);
    this.player.setFacing("up");
    this.cameras.main.pan(this.bossVisual.x, this.bossVisual.y - 16, 480, "Sine.easeInOut");
    const veil = this.add.rectangle(0, 0, DISPLAY.width, DISPLAY.height, 0x000000, 0).setOrigin(0).setScrollFactor(0).setDepth(2900);
    this.tweens.add({ targets: veil, alpha: 0.42, duration: 320 });
    this.time.delayedCall(520, () => {
      this.cameras.main.shake(180, 0.006);
      this.bossVisual?.setScale((this.bossVisual?.scaleX ?? 1) * 1.08);
    });
    this.time.delayedCall(1180, () => beginBattleEntrance(this, this.actions, {
      type: "battle",
      eventId: "BATORASU_FORTRESS_BOSS",
      monsterId: "batorasu",
      returnSceneKey: SCENE_KEY,
      returnSpawnId: "boss-room",
      returnSpawnX: this.player.body.center.x,
      returnSpawnY: this.player.body.center.y,
      returnFacing: this.player.facing,
      victoryFlag: BOSS_FLAG,
      victoryFlags: [FORTRESS_STOPPED_FLAG],
    }));
  }

  private playAssembly(room: FortressRoom): void {
    this.locked = true;
    this.actions.setLocked(true);
    this.setNotice("壁が　あとから　組みあがっていく。", 1600);
    const layer = this.roomLayers.get(room.id);
    if (layer) {
      layer.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: layer, alpha: 1, duration: 650, delay: 180 });
    }
    this.time.delayedCall(900, () => { this.locked = false; this.actions.setLocked(false); });
  }

  private playReconstruction(room: FortressRoom): void {
    this.locked = true;
    this.actions.setLocked(true);
    const layer = this.roomLayers.get(room.id);
    if (layer) {
      const startX = layer.x;
      this.tweens.add({ targets: layer, x: startX + 38, duration: 200, yoyo: true, repeat: 1, ease: "Stepped" });
    }
    this.cameras.main.shake(180, 0.004);
    this.setNotice("石壁が　ずれて　道を　つなぎなおした。", 1700);
    this.time.delayedCall(620, () => { this.locked = false; this.actions.setLocked(false); });
  }

  private stopFortress(): void {
    this.bossVisual?.destroy();
    this.bossVisual = undefined;
    for (const layer of this.roomLayers.values()) {
      layer.setAlpha(0.75);
    }
    this.setNotice("砦の　うごきが　とまった。", 4200);
  }

  private createDebugOverlay(): void {
    const lines = [
      "[DEV] BattleFortressGenerator",
      `reachable: ${this.plan.reachable ? "yes" : "NO"}`,
      `entrance: ${this.plan.entrance.x},${this.plan.entrance.y}  boss: ${this.plan.boss.x},${this.plan.boss.y}`,
      `main path: ${this.plan.mainPathRoomIds.join(" → ")}`,
      `poison route: tarosa_bow_poison (Lv19 auto-equip); hint ${this.plan.poisonHint.x},${this.plan.poisonHint.y}`,
      `treasure: ${this.plan.treasures.map((treasure) => treasure.id).join(", ")}`,
    ];
    this.add.text(10, DISPLAY.height - 10, lines.join("\n"), {
      fontFamily: "monospace", fontSize: "11px", color: "#8fe6a5", stroke: "#070907", strokeThickness: 3,
    }).setOrigin(0, 1).setScrollFactor(0).setDepth(3000);
  }

  private isPlayerIn(room: FortressRoom): boolean {
    const x = this.player.body.center.x / BATTLE_FORTRESS_TILE_SIZE;
    const y = this.player.body.center.y / BATTLE_FORTRESS_TILE_SIZE;
    return x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height;
  }

  private toWorld(point: { readonly x: number; readonly y: number }, facing?: Facing): { x: number; y: number; facing: Facing } {
    return { x: (point.x + 0.5) * BATTLE_FORTRESS_TILE_SIZE, y: (point.y + 0.5) * BATTLE_FORTRESS_TILE_SIZE, facing: facing ?? "down" };
  }

  private setNotice(text: string, durationMs: number): void {
    this.notice?.setText(text);
    if (!this.notice) return;
    this.time.delayedCall(durationMs, () => {
      if (this.notice?.text === text) this.notice.setText("");
    });
  }
}
