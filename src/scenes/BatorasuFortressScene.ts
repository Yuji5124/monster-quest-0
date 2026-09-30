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
import { getBattleFortressRoomPresentation } from "../systems/BattleFortressPresentation.ts";
import {
  BATTLE_FORTRESS_TILE_SIZE,
  buildBattleFortressWallRects,
  generateBattleFortress,
  getBattleFortressWorldBounds,
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

interface ReconfigureRuntime {
  readonly roomId: string;
  readonly x: number;
  readonly y: number;
  readonly switchVisual: Phaser.GameObjects.Container;
  readonly sealVisual: Phaser.GameObjects.Rectangle;
  activated: boolean;
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
  private reconfigureSwitches: ReconfigureRuntime[] = [];
  private fortressAmbientTweens: Phaser.Tweens.Tween[] = [];
  private bossVisual: Phaser.GameObjects.Image | undefined;
  private bossPulse: Phaser.Tweens.Tween | undefined;
  private notice: Phaser.GameObjects.Text | undefined;
  private locked = false;
  private nextDirectRumbleAt = 0;

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
    this.reconfigureSwitches = [];
    this.fortressAmbientTweens = [];
    this.bossPulse = undefined;
    this.nextDirectRumbleAt = 0;
    this.cameras.main.setBackgroundColor(0x050609);
    const worldBounds = getBattleFortressWorldBounds(this.plan);
    // Arcade Physics は既定でゲーム表示領域(960×720)だけを移動境界にする。
    // この砦は横長の生成マップなので、Camera bounds と同じ実寸へ広げないと
    // 主人公が最初の画面の右端で止まり、以後の部屋へ進めなくなる。
    this.physics.world.setBounds(
      worldBounds.x,
      worldBounds.y,
      worldBounds.width,
      worldBounds.height,
    );
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
    configureMapCamera(this, this.player.visual, worldBounds);
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
    if (!this.handleTreasureInteraction(confirm) && !this.handleReconfiguration(confirm)) this.handleFieldExit(confirm);
    this.handleDirectCorridorRumble();
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
        const room = this.getRoomAtTile(x, y);
        const presentation = getBattleFortressRoomPresentation(room);
        const detail = Math.abs(Math.imul(x + 31, 97) ^ Math.imul(y + 17, 57) ^ this.plan.seed);
        if (tile === "floor") {
          graphics.fillStyle(detail % 3 === 0 ? presentation.floor + 0x020202 : presentation.floor, 1);
          graphics.fillRect(px, py, tileSize, tileSize);
          graphics.fillStyle(presentation.floorInset, 0.72);
          graphics.fillRect(px + 3, py + 3, tileSize - 6, tileSize - 6);
          graphics.lineStyle(1, 0x101116, 0.84);
          graphics.strokeRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
          if (detail % 7 === 0) {
            graphics.lineStyle(1, presentation.accent, 0.33);
            graphics.lineBetween(px + 7, py + 8, px + 16, py + 17);
            graphics.lineBetween(px + 16, py + 17, px + 12, py + 25);
          }
          if (presentation.poison && detail % 13 === 0) {
            graphics.fillStyle(0x65d876, 0.22);
            graphics.fillEllipse(px + 16, py + 19, 14, 6);
          }
          if (presentation.bossTerritory && detail % 17 === 0) {
            graphics.fillStyle(0x9b3139, 0.34);
            graphics.fillRect(px + 4, py + 4, tileSize - 8, 3);
          }
        } else if (tile === "wall") {
          graphics.fillStyle(presentation.wall, 1);
          graphics.fillRect(px, py, tileSize, tileSize);
          graphics.fillStyle(presentation.wallInset, 1);
          graphics.fillRect(px + 3, py + 4, tileSize - 6, tileSize - 8);
          graphics.lineStyle(2, presentation.accent, 0.38);
          graphics.lineBetween(px + 2, py + 3, px + tileSize - 3, py + 3);
          if (detail % 2 === 0) graphics.lineBetween(px + 5, py + 5, px + 5, py + tileSize - 5);
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
    const presentation = getBattleFortressRoomPresentation(room);
    const torch = (x: number, y: number, color = presentation.torch): void => {
      const mount = this.add.rectangle(x, y, 6, 16, 0x17151a).setStrokeStyle(1, 0xa5a0a0);
      const flame = this.add.circle(x, y - 10, 5, color, 0.88).setBlendMode(Phaser.BlendModes.ADD);
      this.fortressAmbientTweens.push(this.tweens.add({
        targets: flame, scaleY: { from: 0.72, to: 1.25 }, alpha: { from: 0.45, to: 1 },
        duration: 420 + (x % 3) * 90, yoyo: true, repeat: -1,
      }));
      layer.add([mount, flame]);
    };
    const banner = (x: number, y: number, color = presentation.banner): void => {
      const pole = this.add.rectangle(x, y - 20, 36, 4, 0x82776a).setStrokeStyle(1, 0x1a171b);
      const cloth = this.add.rectangle(x, y, 24, 36, color).setStrokeStyle(2, 0x39161c);
      const emblem = this.add.circle(x, y - 2, 6, 0x190e12, 0.9).setStrokeStyle(1, presentation.accent, 0.7);
      layer.add([pole, cloth, emblem]);
    };
    const pillar = (x: number, y: number): void => {
      const base = this.add.rectangle(x, y + 28, 30, 10, 0x29282d).setStrokeStyle(2, 0x77747b);
      const shaft = this.add.rectangle(x, y - 5, 18, 58, 0x4f4e57).setStrokeStyle(2, 0x8b878e);
      const cap = this.add.rectangle(x, y - 36, 26, 10, 0x5c5a62).setStrokeStyle(2, 0x918d93);
      layer.add([base, shaft, cap]);
    };
    const crate = (x: number, y: number): void => {
      const box = this.add.rectangle(x, y, 21, 20, 0x6a4529).setStrokeStyle(2, 0x271a16);
      const crossA = this.add.rectangle(x, y, 25, 3, 0xb17a3c).setAngle(42);
      const crossB = this.add.rectangle(x, y, 25, 3, 0xb17a3c).setAngle(-42);
      layer.add([box, crossA, crossB]);
    };
    const barrel = (x: number, y: number): void => {
      const body = this.add.ellipse(x, y, 18, 24, 0x6f4528).setStrokeStyle(2, 0x201513);
      const hoopA = this.add.rectangle(x, y - 6, 17, 2, 0xa19b8a);
      const hoopB = this.add.rectangle(x, y + 6, 17, 2, 0xa19b8a);
      layer.add([body, hoopA, hoopB]);
    };
    torch((room.x + 1) * tileSize + 8, (room.y + 2) * tileSize + 17);
    torch((room.x + room.width - 1) * tileSize - 8, (room.y + room.height - 2) * tileSize - 17);
    if (!room.optional && room.kind !== "entrance") banner(centre.x, (room.y + 2) * tileSize + 18);
    if (room.kind === "combat" || room.kind === "branch" || room.kind === "misprint") {
      crate((room.x + 2) * tileSize + 16, (room.y + room.height - 3) * tileSize + 16);
      barrel((room.x + room.width - 2) * tileSize + 6, (room.y + 3) * tileSize + 14);
    }
    if (room.kind === "entrance") {
      const exit = this.toWorld(this.plan.entrance);
      layer.add(this.add.rectangle(exit.x, exit.y, 34, 34, 0x1b2835, 0.9).setStrokeStyle(2, 0x87a7b3));
      for (const offset of [-10, 0, 10]) layer.add(this.add.rectangle(exit.x + offset, exit.y - 1, 2, 25, 0x9ca6a8));
      layer.add(this.add.text(exit.x, exit.y + 31, "もどる", {
        fontFamily: "monospace", fontSize: "10px", color: "#c7dde1", stroke: "#050609", strokeThickness: 3,
      }).setOrigin(0.5, 0));
    }
    if (room.kind === "prison") {
      for (let index = 0; index < 5; index += 1) {
        layer.add(this.add.rectangle(centre.x - 48 + index * 24, centre.y, 4, 64, 0x6a6972).setStrokeStyle(1, 0x171419));
        layer.add(this.add.rectangle(centre.x - 48 + index * 24, centre.y - 40, 7, 11, 0x3c3a42));
      }
      layer.add(this.add.rectangle(centre.x, centre.y - 28, 112, 4, 0x77717a));
    }
    if (room.kind === "misprint") {
      for (let index = 0; index < 10; index += 1) {
        const duplicate = this.add.rectangle(centre.x - 72 + (index % 5) * 36, centre.y - 30 + Math.floor(index / 5) * 60, 18, 20, 0x6c5141)
          .setStrokeStyle(2, index % 3 === 0 ? 0x5fdca5 : 0x2b2020);
        layer.add(duplicate);
      }
      layer.add(this.add.rectangle(centre.x, centre.y, 180, 4, 0x5fdca5, 0.36).setBlendMode(Phaser.BlendModes.ADD));
    }
    if (room.kind === "reconfigure") {
      const switchVisual = this.add.container(centre.x, centre.y);
      const base = this.add.rectangle(0, 2, 28, 24, 0x30313a).setStrokeStyle(3, 0x9c8a65);
      const rune = this.add.circle(0, -5, 6, 0x5fdca5, 0.9).setBlendMode(Phaser.BlendModes.ADD);
      const prompt = this.add.text(0, 22, "しらべる", { fontFamily: "monospace", fontSize: "10px", color: "#b9edcf", stroke: "#07120c", strokeThickness: 3 }).setOrigin(0.5, 0);
      switchVisual.add([base, rune, prompt]);
      const sealVisual = this.add.rectangle(centre.x + 86, centre.y, 16, 76, 0x29272d).setStrokeStyle(3, 0x5fdca5, 0.8);
      layer.add([switchVisual, sealVisual]);
      this.fortressAmbientTweens.push(this.tweens.add({ targets: rune, alpha: { from: 0.35, to: 1 }, duration: 700, yoyo: true, repeat: -1 }));
      this.reconfigureSwitches.push({ roomId: room.id, x: centre.x, y: centre.y, switchVisual, sealVisual, activated: false });
    }
    if (room.kind === "checkpoint") {
      const poison = this.toWorld(this.plan.poisonHint);
      layer.add(this.add.ellipse(poison.x, poison.y, 54, 24, 0x48cf73, 0.52).setBlendMode(Phaser.BlendModes.ADD));
      layer.add(this.add.rectangle(poison.x - 24, poison.y - 13, 14, 28, 0x5b625c).setAngle(-24));
      layer.add(this.add.rectangle(poison.x + 25, poison.y - 11, 14, 29, 0x5b625c).setAngle(26));
      layer.add(this.add.rectangle(poison.x, poison.y - 17, 58, 4, 0x6de487, 0.38));
    }
    if (room.kind === "boss-gate") {
      layer.add(this.add.rectangle(centre.x + 86, centre.y, 22, 96, 0x151519).setStrokeStyle(3, 0x8c3132));
      for (const offset of [-7, 0, 7]) layer.add(this.add.rectangle(centre.x + 86 + offset, centre.y, 3, 76, 0x9d9297));
      layer.add(this.add.rectangle(centre.x + 86, centre.y - 52, 42, 9, 0x5d1d27).setStrokeStyle(2, 0xb8403f));
    }
    if (room.kind === "boss") {
      layer.add(this.add.ellipse(centre.x, centre.y + 32, 248, 110, 0x55bd68, 0.22).setBlendMode(Phaser.BlendModes.ADD));
      for (const side of [-1, 1] as const) {
        pillar(centre.x + side * 155, centre.y);
        banner(centre.x + side * 112, centre.y - 58, 0xa52b36);
        layer.add(this.add.rectangle(centre.x + side * 120, centre.y + 86, 38, 18, 0x5d4840).setAngle(side * 14));
        layer.add(this.add.rectangle(centre.x + side * 92, centre.y + 68, 42, 5, 0x8e8a82).setAngle(side * 22));
      }
      layer.add(this.add.rectangle(centre.x, centre.y + 110, 218, 13, 0x581e25, 0.8));
      layer.add(this.add.rectangle(centre.x, centre.y + 110, 124, 4, 0x8c2e34, 0.72));
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
    const poisonMist = this.add.ellipse(point.x, point.y + 26, 174, 58, 0x65d876, 0.18)
      .setDepth(PROP_DEPTH + 3).setBlendMode(Phaser.BlendModes.ADD);
    this.fortressAmbientTweens.push(this.tweens.add({
      targets: poisonMist, scaleX: { from: 0.85, to: 1.18 }, alpha: { from: 0.08, to: 0.3 },
      duration: 1500, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    }));
    this.bossVisual = this.add.image(point.x, point.y - 18, "fortress.batorasu").setDepth(PROP_DEPTH + 4);
    this.bossVisual.setScale(Math.min(128 / this.bossVisual.width, 132 / this.bossVisual.height));
    this.bossPulse = this.tweens.add({ targets: this.bossVisual, y: point.y - 23, duration: 1300, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.fortressAmbientTweens.push(this.bossPulse);
  }

  private handleRoomArrival(): void {
    const current = this.plan.rooms.find((room) => this.isPlayerIn(room));
    if (!current || this.activatedRooms.has(current.id)) return;
    this.activatedRooms.add(current.id);
    if (current.kind === "assembly") this.playAssembly(current);
    else if (current.kind === "reconfigure") this.setNotice("石の台座が　かすかに　脈打っている。", 2600);
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

  /** A deliberate confirm makes the reconfiguration readable and prevents automatic input locks. */
  private handleReconfiguration(confirm: boolean): boolean {
    if (!confirm) return false;
    const mechanism = this.reconfigureSwitches.find((entry) => !entry.activated
      && Phaser.Math.Distance.Between(this.player.body.center.x, this.player.body.center.y, entry.x, entry.y) < 52);
    if (!mechanism) return false;
    mechanism.activated = true;
    const room = this.plan.rooms.find((entry) => entry.id === mechanism.roomId);
    if (room) this.playReconstruction(room, mechanism);
    return true;
  }

  /** The fixed final corridor receives a restrained rumble without running a permanent timer. */
  private handleDirectCorridorRumble(): void {
    const current = this.plan.rooms.find((room) => this.isPlayerIn(room));
    if (current?.kind !== "direct" || this.time.now < this.nextDirectRumbleAt) return;
    this.nextDirectRumbleAt = this.time.now + 2400;
    this.cameras.main.shake(90, 0.0018);
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

  private playReconstruction(room: FortressRoom, mechanism: ReconfigureRuntime): void {
    this.locked = true;
    this.actions.setLocked(true);
    const layer = this.roomLayers.get(room.id);
    if (layer) {
      const startX = layer.x;
      this.tweens.add({ targets: layer, x: startX + 38, duration: 200, yoyo: true, repeat: 1, ease: "Stepped" });
    }
    this.tweens.add({ targets: mechanism.sealVisual, x: mechanism.sealVisual.x + 42, alpha: 0, duration: 380, ease: "Quad.easeIn" });
    this.tweens.add({ targets: mechanism.switchVisual, scale: 1.22, duration: 140, yoyo: true, repeat: 1, ease: "Sine.easeOut" });
    this.cameras.main.shake(180, 0.004);
    this.setNotice("石壁が　ずれて　道を　つなぎなおした。", 1700);
    this.time.delayedCall(620, () => { this.locked = false; this.actions.setLocked(false); });
  }

  private stopFortress(): void {
    for (const tween of this.fortressAmbientTweens) tween.pause();
    this.bossPulse?.stop();
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
      `special: ${this.plan.specialRoomIds.join(", ")}`,
      `poison route: tarosa_bow_poison (Lv19 auto-equip); ${this.plan.poisonGuideRoomId} hint ${this.plan.poisonHint.x},${this.plan.poisonHint.y}`,
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

  private getRoomAtTile(x: number, y: number): FortressRoom | undefined {
    return this.plan.rooms.find((room) => x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height);
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
