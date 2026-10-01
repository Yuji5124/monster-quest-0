import Phaser from "phaser";
import { DEFAULT_JUMP_CARD_BATTLE_ID, getJumpCardBattle } from "../config/jumpCardBattles.ts";
import type { JumpCardBattleDefinition } from "../config/jumpCardBattles.ts";
import { DISPLAY, SCALE_FACTOR } from "../config/display.ts";
import {
  JUMP_CARD_BATTLE_PRESENTATION,
  formatJumpCardBattleClock,
  formatJumpCardBattleDistance,
} from "../config/jumpCardBattlePresentation.ts";
import { getJumpCardDefinition, getJumpCardDisplayName } from "../data/jumpCards.ts";
import type { JumpCardDefinition } from "../data/jumpCards.ts";
import { GameStateRepository } from "../systems/GameStateRepository.ts";
import { JANKEN_POSES, resolveJanken } from "../systems/JumpCardBattle.ts";
import type { JankenPose } from "../systems/JumpCardBattle.ts";
import { InputSystem } from "../systems/InputSystem.ts";

const WINDOW_COLOR = 0x0a1021;
const WINDOW_BORDER = 0xdde7ff;
const ACCENT_COLOR = 0xf6d565;
const SELECTED_COLOR = 0x3d6bb7;
const MUTED_COLOR = 0x26344e;
const TEXT_COLOR = "#f5f7ff";
const DIM_TEXT_COLOR = "#bdc8df";
const PLAYER_DASH_COLOR = 0x76d7ff;
const OPPONENT_DASH_COLOR = 0xff8aa7;
const TRACK_COLOR = 0x52657f;

const CARD_PANEL_Y = 112;
const CARD_PANEL_WIDTH = 412;
const CARD_PANEL_HEIGHT = 300;
const CARD_PANEL_MARGIN = 28;
const POSE_Y = 520;
const POSE_WIDTH = 204;
const POSE_HEIGHT = 104;
const ACTION_Y = 650;

type BattleMode = "choose" | "resolving" | "result" | "unavailable";

export interface JumpCardBattleSceneData {
  readonly battleId?: string;
  /** The paused field scene to resume after a normal NPC challenge. */
  readonly returnSceneKey?: string;
  /** Browser-only visual QA can display this battle without changing a save. */
  readonly demoCard?: boolean;
}

interface PoseButton {
  readonly pose: JankenPose;
  readonly background: Phaser.GameObjects.Rectangle;
  readonly outline: Phaser.GameObjects.Rectangle;
}

/**
 * A compact, one-round Jump Card battle. It is an overlay scene rather than an
 * RPG BattleScene, so it cannot accidentally award EXP, spend coins, or alter
 * party vitals. The owning field scene is paused until this scene closes.
 */
export class JumpCardBattleScene extends Phaser.Scene {
  private readonly repository = new GameStateRepository();
  private actions!: InputSystem;
  private battle!: JumpCardBattleDefinition;
  private playerCard!: JumpCardDefinition;
  private opponentCard!: JumpCardDefinition;
  private returnSceneKey?: string;
  private demoCard = false;
  private mode: BattleMode = "choose";
  private selectedPoseIndex = 0;
  private readonly poseButtons: PoseButton[] = [];
  private promptText!: Phaser.GameObjects.Text;
  private playerPoseText!: Phaser.GameObjects.Text;
  private opponentPoseText!: Phaser.GameObjects.Text;
  private actionButton!: Phaser.GameObjects.Rectangle;
  private actionLabel!: Phaser.GameObjects.Text;
  private versusText!: Phaser.GameObjects.Text;
  private dashMetricText!: Phaser.GameObjects.Text;
  private dashClockText!: Phaser.GameObjects.Text;
  private playerDashMarker!: Phaser.GameObjects.Arc;
  private opponentDashMarker!: Phaser.GameObjects.Arc;
  private playerCardGlow!: Phaser.GameObjects.Rectangle;
  private opponentCardGlow!: Phaser.GameObjects.Rectangle;
  private resolveTimer?: Phaser.Time.TimerEvent;
  private battleStartedAt = 0;
  private finalElapsedMs?: number;
  private playerDashDistanceKm = 0;
  private opponentDashDistanceKm = 0;
  private lastDashRenderAt = -Infinity;

  constructor() {
    super("JumpCardBattleScene");
  }

  init(data: JumpCardBattleSceneData = {}): void {
    this.battle = getJumpCardBattle(data.battleId ?? DEFAULT_JUMP_CARD_BATTLE_ID) ?? (() => {
      throw new Error(`Unknown Jump Card battle: ${data.battleId}`);
    })();
    this.returnSceneKey = data.returnSceneKey;
    const directBrowserTest = typeof import.meta.env !== "undefined" && import.meta.env.DEV
      && new URLSearchParams(window.location.search).has("cardBattleTest");
    this.demoCard = data.demoCard ?? directBrowserTest;
  }

  preload(): void {
    const playerCard = getJumpCardDefinition(this.battle.requiredPlayerCardId);
    const opponentCard = getJumpCardDefinition(this.battle.opponentCardId);
    for (const card of [playerCard, opponentCard]) {
      if (card?.imageKey && card.imagePath && !this.textures.exists(card.imageKey)) {
        this.load.image(card.imageKey, card.imagePath);
      }
    }
  }

  create(): void {
    this.playerCard = this.requireCard(this.battle.requiredPlayerCardId);
    this.opponentCard = this.requireCard(this.battle.opponentCardId);
    this.mode = this.hasRequiredCard() ? "choose" : "unavailable";
    this.selectedPoseIndex = 0;
    this.poseButtons.length = 0;
    this.battleStartedAt = this.time.now;
    this.finalElapsedMs = undefined;
    this.playerDashDistanceKm = 0;
    this.opponentDashDistanceKm = 0;
    this.lastDashRenderAt = -Infinity;
    this.cameras.main.setBackgroundColor(0x060b16);
    this.actions = new InputSystem(window, document);

    this.add.rectangle(DISPLAY.width / 2, DISPLAY.height / 2, DISPLAY.width, DISPLAY.height, 0x060b16);
    this.createStageBackdrop();
    this.add.text(DISPLAY.width / 2, 26, "ジャンカードバトル", {
      fontFamily: "monospace", fontSize: `${18 * SCALE_FACTOR}px`, color: TEXT_COLOR,
    }).setOrigin(0.5);
    this.add.text(DISPLAY.width / 2, 56, "プリンのカードで　1かいしょうぶ！", {
      fontFamily: "monospace", fontSize: `${10 * SCALE_FACTOR}px`, color: DIM_TEXT_COLOR,
    }).setOrigin(0.5);
    this.createDashDashboard();

    this.createCardPanel(CARD_PANEL_MARGIN, "あなた", this.playerCard, false);
    this.createCardPanel(DISPLAY.width - CARD_PANEL_MARGIN - CARD_PANEL_WIDTH, this.battle.opponentName, this.opponentCard, true);
    this.createCardGlows();
    this.versusText = this.add.text(DISPLAY.width / 2, CARD_PANEL_Y + 150, "VS", {
      fontFamily: "monospace", fontSize: `${16 * SCALE_FACTOR}px`, color: "#f6d565", fontStyle: "bold",
      stroke: "#11192b", strokeThickness: 7,
    }).setOrigin(0.5);
    this.playerPoseText = this.add.text(CARD_PANEL_MARGIN + CARD_PANEL_WIDTH / 2, CARD_PANEL_Y + CARD_PANEL_HEIGHT + 18, "あなたの手：　？", this.smallTextStyle())
      .setOrigin(0.5);
    this.opponentPoseText = this.add.text(DISPLAY.width - CARD_PANEL_MARGIN - CARD_PANEL_WIDTH / 2, CARD_PANEL_Y + CARD_PANEL_HEIGHT + 18, "あいての手：　？", this.smallTextStyle())
      .setOrigin(0.5);

    this.promptText = this.add.text(DISPLAY.width / 2, 452, "だす手を　えらぼう", {
      fontFamily: "monospace", fontSize: `${12 * SCALE_FACTOR}px`, color: TEXT_COLOR,
      align: "center",
    }).setOrigin(0.5);
    this.createPoseButtons();
    this.actionButton = this.add.rectangle(DISPLAY.width / 2, ACTION_Y, 340, 58, ACCENT_COLOR)
      .setStrokeStyle(3, WINDOW_BORDER)
      .setInteractive({ useHandCursor: true });
    this.actionLabel = this.add.text(DISPLAY.width / 2, ACTION_Y, "じゃんけん、しょっ！", {
      fontFamily: "monospace", fontSize: `${13 * SCALE_FACTOR}px`, color: "#11192b", fontStyle: "bold",
    }).setOrigin(0.5);
    this.actionButton.on("pointerdown", () => this.beginJanken());

    const cleanup = (): void => {
      this.resolveTimer?.remove(false);
      this.actions.destroy();
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup);
      this.events.off(Phaser.Scenes.Events.DESTROY, cleanup);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
    this.render();
  }

  update(): void {
    this.renderDashDashboard();
    const confirm = this.actions.consumePressed("confirm");
    const cancel = this.actions.consumePressed("cancel");
    if (this.mode === "resolving") return;
    if (this.mode === "result" || this.mode === "unavailable") {
      if (confirm || cancel) this.returnToField();
      return;
    }
    if (cancel) {
      this.returnToField();
      return;
    }
    if (this.actions.consumePressed("moveLeft") || this.actions.consumePressed("moveUp")) this.changeSelectedPose(-1);
    if (this.actions.consumePressed("moveRight") || this.actions.consumePressed("moveDown")) this.changeSelectedPose(1);
    if (confirm) this.beginJanken();
  }

  private requireCard(id: string): JumpCardDefinition {
    const card = getJumpCardDefinition(id);
    if (!card) throw new Error(`Jump Card battle references an unknown card: ${id}`);
    return card;
  }

  private hasRequiredCard(): boolean {
    return this.demoCard || this.repository.load().cards.obtainedJumpCards.includes(this.battle.requiredPlayerCardId);
  }

  private createCardPanel(x: number, heading: string, card: JumpCardDefinition, opponent: boolean): void {
    this.createWindow(x, CARD_PANEL_Y, CARD_PANEL_WIDTH, CARD_PANEL_HEIGHT);
    this.add.text(x + CARD_PANEL_WIDTH / 2, CARD_PANEL_Y + 20, heading, {
      fontFamily: "monospace", fontSize: `${12 * SCALE_FACTOR}px`, color: opponent ? "#ffdfdf" : "#dce8ff",
    }).setOrigin(0.5);
    this.add.text(x + CARD_PANEL_WIDTH / 2, CARD_PANEL_Y + 54, `ジャンカード No.${String(card.number).padStart(2, "0")}`, this.smallTextStyle()).setOrigin(0.5);
    this.add.text(x + CARD_PANEL_WIDTH / 2, CARD_PANEL_Y + 82, getJumpCardDisplayName(card), {
      fontFamily: "monospace", fontSize: `${14 * SCALE_FACTOR}px`, color: TEXT_COLOR,
    }).setOrigin(0.5);
    if (card.imageKey && this.textures.exists(card.imageKey)) {
      const image = this.add.image(x + CARD_PANEL_WIDTH / 2, CARD_PANEL_Y + 195, card.imageKey);
      image.setScale(Math.min(286 / image.width, 184 / image.height, 1));
      return;
    }
    // Missing source artwork must not trap the match. The verified card name remains visible.
    this.add.rectangle(x + CARD_PANEL_WIDTH / 2, CARD_PANEL_Y + 195, 220, 150, 0x1c2942).setStrokeStyle(2, WINDOW_BORDER);
    this.add.text(x + CARD_PANEL_WIDTH / 2, CARD_PANEL_Y + 195, "カード", this.smallTextStyle()).setOrigin(0.5);
  }

  private createPoseButtons(): void {
    const xPositions = [132, 378, 624];
    for (const [index, pose] of JANKEN_POSES.entries()) {
      const x = xPositions[index];
      const background = this.add.rectangle(x + POSE_WIDTH / 2, POSE_Y, POSE_WIDTH, POSE_HEIGHT, MUTED_COLOR)
        .setInteractive({ useHandCursor: true });
      const outline = this.add.rectangle(x + POSE_WIDTH / 2, POSE_Y, POSE_WIDTH, POSE_HEIGHT)
        .setStrokeStyle(3, WINDOW_BORDER, 0.8);
      this.drawHandPose(x + 56, POSE_Y, pose, 0xfff2c8);
      this.add.text(x + 136, POSE_Y, poseLabel(pose), {
        fontFamily: "monospace", fontSize: `${11 * SCALE_FACTOR}px`, color: TEXT_COLOR,
      }).setOrigin(0.5);
      background.on("pointerdown", () => {
        if (this.mode !== "choose") return;
        this.selectedPoseIndex = index;
        this.render();
      });
      this.poseButtons.push({ pose, background, outline });
    }
  }

  /** A low-cost stadium backdrop keeps the mini-game lively without needing a new art asset. */
  private createStageBackdrop(): void {
    const stage = this.add.graphics();
    stage.fillStyle(0x0d1830, 0.7);
    for (let index = 0; index < 7; index += 1) {
      stage.fillRect(0, 118 + index * 72, DISPLAY.width, 2);
    }
    stage.lineStyle(2, 0x315075, 0.22);
    for (let index = -4; index <= 4; index += 1) {
      stage.lineBetween(DISPLAY.width / 2, 92, DISPLAY.width / 2 + index * 210, DISPLAY.height);
    }
  }

  /**
   * A tiny live distance/time readout borrows the delight of a scroll marathon
   * counter. It only visualizes the janken reveal and is not game state.
   */
  private createDashDashboard(): void {
    const x = 250;
    const width = 460;
    const y = 98;
    const track = this.add.graphics();
    track.lineStyle(3, TRACK_COLOR, 0.9);
    track.lineBetween(x, y - 5, x + width, y - 5);
    track.lineBetween(x, y + 5, x + width, y + 5);
    track.lineStyle(2, ACCENT_COLOR, 0.9);
    track.lineBetween(x, y - 12, x, y + 12);
    track.lineBetween(x + width, y - 12, x + width, y + 12);
    this.add.text(x - 10, y + 18, "START", this.tinyTextStyle()).setOrigin(0.5);
    this.add.text(x + width + 12, y + 18, "GOAL", this.tinyTextStyle()).setOrigin(0.5);
    this.dashMetricText = this.add.text(DISPLAY.width / 2 - 34, 76, "", this.tinyTextStyle()).setOrigin(0.5);
    this.dashClockText = this.add.text(834, 76, "", this.tinyTextStyle()).setOrigin(0.5);
    this.playerDashMarker = this.add.circle(x, y - 5, 6, PLAYER_DASH_COLOR).setStrokeStyle(2, WINDOW_BORDER);
    this.opponentDashMarker = this.add.circle(x, y + 5, 6, OPPONENT_DASH_COLOR).setStrokeStyle(2, WINDOW_BORDER);
    this.renderDashDashboard(true);
  }

  private createCardGlows(): void {
    this.playerCardGlow = this.add.rectangle(CARD_PANEL_MARGIN + CARD_PANEL_WIDTH / 2, CARD_PANEL_Y + CARD_PANEL_HEIGHT / 2, CARD_PANEL_WIDTH + 10, CARD_PANEL_HEIGHT + 10, 0x000000, 0)
      .setStrokeStyle(4, PLAYER_DASH_COLOR)
      .setAlpha(0);
    this.opponentCardGlow = this.add.rectangle(DISPLAY.width - CARD_PANEL_MARGIN - CARD_PANEL_WIDTH / 2, CARD_PANEL_Y + CARD_PANEL_HEIGHT / 2, CARD_PANEL_WIDTH + 10, CARD_PANEL_HEIGHT + 10, 0x000000, 0)
      .setStrokeStyle(4, OPPONENT_DASH_COLOR)
      .setAlpha(0);
  }

  private beginJanken(): void {
    if (this.mode !== "choose") return;
    this.mode = "resolving";
    this.finalElapsedMs = undefined;
    this.setDashProgress(0, 0);
    const playerPose = JANKEN_POSES[this.selectedPoseIndex];
    const opponentPose = JANKEN_POSES[Phaser.Math.Between(0, JANKEN_POSES.length - 1)];
    this.playerPoseText.setText("あなたの手：　…");
    this.opponentPoseText.setText("あいての手：　…");
    this.actionButton.disableInteractive().setFillStyle(MUTED_COLOR);
    this.actionLabel.setText("しょうぶ中…").setColor(TEXT_COLOR);
    this.playJankenBeat(0, playerPose, opponentPose);
    this.render();
  }

  /** Three short beats make the one-round reveal readable without changing its rules. */
  private playJankenBeat(beatIndex: number, playerPose: JankenPose, opponentPose: JankenPose): void {
    const labels = ["じゃん…", "けん…", "しょっ！"] as const;
    const progress = JUMP_CARD_BATTLE_PRESENTATION.beatProgressKm[beatIndex];
    this.promptText.setText(labels[beatIndex]);
    this.versusText.setText(String(beatIndex + 1));
    this.setDashProgress(progress, progress);
    this.pulseStage(beatIndex === 2 ? ACCENT_COLOR : PLAYER_DASH_COLOR);
    if (beatIndex === 2) {
      this.playerPoseText.setText(`あなたの手：　${poseLabel(playerPose)}`);
      this.opponentPoseText.setText(`あいての手：　${poseLabel(opponentPose)}`);
      this.cameras.main.flash(70, 255, 239, 185, false);
    }
    if (beatIndex < labels.length - 1) {
      this.resolveTimer = this.time.delayedCall(JUMP_CARD_BATTLE_PRESENTATION.beatDurationMs, () => {
        this.playJankenBeat(beatIndex + 1, playerPose, opponentPose);
      });
      return;
    }
    this.resolveTimer = this.time.delayedCall(JUMP_CARD_BATTLE_PRESENTATION.revealHoldMs, () => {
      this.finishJanken(playerPose, opponentPose);
    });
  }

  private finishJanken(playerPose: JankenPose, opponentPose: JankenPose): void {
    const result = resolveJanken(playerPose, opponentPose);
    this.finalElapsedMs = this.time.now - this.battleStartedAt;
    if (result === "tie") {
      this.setDashProgress(JUMP_CARD_BATTLE_PRESENTATION.beatProgressKm[2], JUMP_CARD_BATTLE_PRESENTATION.beatProgressKm[2]);
      this.versusText.setText("=");
      this.pulseStage(ACCENT_COLOR);
      this.mode = "choose";
      this.promptText.setText("あいこ！　もういちど　えらぼう");
      this.actionButton.setInteractive({ useHandCursor: true }).setFillStyle(ACCENT_COLOR);
      this.actionLabel.setText("じゃんけん、しょっ！").setColor("#11192b");
      this.finalElapsedMs = undefined;
      this.render();
      return;
    }
    const playerWon = result === "player";
    this.setDashProgress(
      playerWon ? JUMP_CARD_BATTLE_PRESENTATION.dashDistanceKm : JUMP_CARD_BATTLE_PRESENTATION.beatProgressKm[2],
      playerWon ? JUMP_CARD_BATTLE_PRESENTATION.beatProgressKm[2] : JUMP_CARD_BATTLE_PRESENTATION.dashDistanceKm,
    );
    this.versusText.setText("!");
    this.pulseStage(playerWon ? PLAYER_DASH_COLOR : OPPONENT_DASH_COLOR, playerWon ? "player" : "opponent");
    this.cameras.main.shake(110, 0.0035);
    this.mode = "result";
    const attacker = playerWon ? "あなた" : this.battle.opponentName;
    this.promptText.setText(`${attacker}が　せんこうゴール！\nプリンの　こうげき！　しょうぶあり！`);
    this.actionButton.setInteractive({ useHandCursor: true }).setFillStyle(ACCENT_COLOR);
    this.actionLabel.setText(playerWon ? "あなたの　かち！　決定で　もどる" : "あいての　かち！　決定で　もどる").setColor("#11192b");
  }

  private setDashProgress(playerDistanceKm: number, opponentDistanceKm: number): void {
    const goal = JUMP_CARD_BATTLE_PRESENTATION.dashDistanceKm;
    this.playerDashDistanceKm = Phaser.Math.Clamp(playerDistanceKm, 0, goal);
    this.opponentDashDistanceKm = Phaser.Math.Clamp(opponentDistanceKm, 0, goal);
    this.renderDashDashboard(true);
  }

  private renderDashDashboard(force = false): void {
    if (!this.dashMetricText || !this.dashClockText || !this.playerDashMarker || !this.opponentDashMarker) return;
    if (!force && this.time.now - this.lastDashRenderAt < 50) return;
    this.lastDashRenderAt = this.time.now;
    const elapsedMs = this.finalElapsedMs ?? this.time.now - this.battleStartedAt;
    const leaderDistance = Math.max(this.playerDashDistanceKm, this.opponentDashDistanceKm);
    const x = 250;
    const width = 460;
    const goal = JUMP_CARD_BATTLE_PRESENTATION.dashDistanceKm;
    this.dashMetricText.setText(`JANKEN DASH  ${formatJumpCardBattleDistance(leaderDistance)}`);
    this.dashClockText.setText(formatJumpCardBattleClock(elapsedMs));
    this.playerDashMarker.setX(x + width * (this.playerDashDistanceKm / goal));
    this.opponentDashMarker.setX(x + width * (this.opponentDashDistanceKm / goal));
  }

  private pulseStage(color: number, winner?: "player" | "opponent"): void {
    const targets = winner === "player"
      ? [this.playerCardGlow]
      : winner === "opponent"
        ? [this.opponentCardGlow]
        : [this.playerCardGlow, this.opponentCardGlow];
    targets.forEach((target) => target.setStrokeStyle(4, color).setAlpha(0.95));
    this.tweens.add({ targets, alpha: 0, duration: winner ? 620 : 260, ease: "Sine.easeOut" });
    this.tweens.add({
      targets: this.versusText,
      scale: 1.32,
      duration: 90,
      yoyo: true,
      ease: "Back.easeOut",
    });
    const centerX = winner === "player"
      ? this.playerCardGlow.x
      : winner === "opponent"
        ? this.opponentCardGlow.x
        : DISPLAY.width / 2;
    this.spawnStageBurst(centerX, CARD_PANEL_Y + CARD_PANEL_HEIGHT / 2, color, winner ? 16 : 8);
  }

  /** One disposable Graphics object per beat avoids an emitter allocation on iPhone Safari. */
  private spawnStageBurst(x: number, y: number, color: number, rayCount: number): void {
    const burst = this.add.graphics().setPosition(x, y).setDepth(8);
    for (let index = 0; index < rayCount; index += 1) {
      const angle = (Math.PI * 2 * index) / rayCount + (index % 2) * 0.11;
      const inner = 24 + (index % 3) * 7;
      const outer = 66 + (index % 4) * 11;
      burst.lineStyle(index % 3 === 0 ? 4 : 2, color, 0.92);
      burst.lineBetween(Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    this.tweens.add({
      targets: burst,
      alpha: 0,
      scale: 1.18,
      duration: 340,
      ease: "Quad.easeOut",
      onComplete: () => burst.destroy(),
    });
  }

  private changeSelectedPose(delta: number): void {
    this.selectedPoseIndex = (this.selectedPoseIndex + delta + this.poseButtons.length) % this.poseButtons.length;
    this.render();
  }

  private render(): void {
    const selectable = this.mode === "choose";
    this.poseButtons.forEach((button, index) => {
      const selected = selectable && index === this.selectedPoseIndex;
      button.background.setFillStyle(selected ? SELECTED_COLOR : MUTED_COLOR);
      button.outline.setStrokeStyle(selected ? 5 : 3, selected ? ACCENT_COLOR : WINDOW_BORDER, selected ? 1 : 0.8);
      if (selectable) button.background.setInteractive({ useHandCursor: true });
      else button.background.disableInteractive();
    });
    if (this.mode === "unavailable") {
      this.promptText.setText("プリンのカードを　もっていないので\nしょうぶ　できない。\n決定で　もどる");
      this.actionButton.disableInteractive().setVisible(false);
      this.actionLabel.setVisible(false);
      this.poseButtons.forEach((button) => button.background.disableInteractive());
      return;
    }
    this.actionButton.setVisible(true);
    this.actionLabel.setVisible(true);
    if (this.mode === "choose") {
      this.playerPoseText.setText(`あなたの手：　${poseLabel(this.poseButtons[this.selectedPoseIndex].pose)}`);
    }
  }

  private returnToField(): void {
    if (this.returnSceneKey && this.scene.isPaused(this.returnSceneKey)) {
      this.scene.resume(this.returnSceneKey);
      this.scene.stop();
      return;
    }
    // Isolated visual QA keeps looping without writing a demo card into localStorage.
    this.scene.restart({ battleId: this.battle.id, demoCard: this.demoCard });
  }

  private createWindow(x: number, y: number, width: number, height: number): Phaser.GameObjects.Rectangle {
    return this.add.rectangle(x + width / 2, y + height / 2, width, height, WINDOW_COLOR)
      .setStrokeStyle(3, WINDOW_BORDER);
  }

  private smallTextStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: "monospace", fontSize: `${9 * SCALE_FACTOR}px`, color: DIM_TEXT_COLOR };
  }

  private tinyTextStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: "monospace", fontSize: `${6 * SCALE_FACTOR}px`, color: DIM_TEXT_COLOR };
  }

  /** Simple vector hands keep all three poses legible without introducing an unverified art asset. */
  private drawHandPose(x: number, y: number, pose: JankenPose, color: number): void {
    const hand = this.add.graphics().fillStyle(color, 1).lineStyle(3, 0x18223a, 1);
    if (pose === "rock") {
      hand.fillRoundedRect(x - 31, y - 26, 62, 52, 12).strokeRoundedRect(x - 31, y - 26, 62, 52, 12);
      hand.lineBetween(x - 16, y - 8, x + 16, y - 8).lineBetween(x - 16, y + 8, x + 16, y + 8);
      return;
    }
    if (pose === "scissors") {
      hand.fillRoundedRect(x - 28, y + 2, 56, 28, 8).strokeRoundedRect(x - 28, y + 2, 56, 28, 8);
      hand.lineBetween(x - 10, y + 4, x - 28, y - 30).lineBetween(x + 4, y + 4, x + 25, y - 27);
      return;
    }
    hand.fillRoundedRect(x - 28, y - 8, 56, 42, 7).strokeRoundedRect(x - 28, y - 8, 56, 42, 7);
    for (const offset of [-21, -7, 7, 21]) hand.fillRect(x + offset - 5, y - 38, 10, 34).strokeRect(x + offset - 5, y - 38, 10, 34);
  }
}

function poseLabel(pose: JankenPose): string {
  return pose === "rock" ? "グー" : pose === "scissors" ? "チョキ" : "パー";
}
