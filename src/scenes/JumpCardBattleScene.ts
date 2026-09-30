import Phaser from "phaser";
import { DEFAULT_JUMP_CARD_BATTLE_ID, getJumpCardBattle } from "../config/jumpCardBattles.ts";
import type { JumpCardBattleDefinition } from "../config/jumpCardBattles.ts";
import { DISPLAY, SCALE_FACTOR } from "../config/display.ts";
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
  private resolveTimer?: Phaser.Time.TimerEvent;

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
    this.cameras.main.setBackgroundColor(0x060b16);
    this.actions = new InputSystem(window, document);

    this.add.rectangle(DISPLAY.width / 2, DISPLAY.height / 2, DISPLAY.width, DISPLAY.height, 0x060b16);
    this.add.text(DISPLAY.width / 2, 30, "ジャンカードバトル", {
      fontFamily: "monospace", fontSize: `${18 * SCALE_FACTOR}px`, color: TEXT_COLOR,
    }).setOrigin(0.5);
    this.add.text(DISPLAY.width / 2, 76, "プリンのカードで　1かいしょうぶ！", {
      fontFamily: "monospace", fontSize: `${10 * SCALE_FACTOR}px`, color: DIM_TEXT_COLOR,
    }).setOrigin(0.5);

    this.createCardPanel(CARD_PANEL_MARGIN, "あなた", this.playerCard, false);
    this.createCardPanel(DISPLAY.width - CARD_PANEL_MARGIN - CARD_PANEL_WIDTH, this.battle.opponentName, this.opponentCard, true);
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

  private beginJanken(): void {
    if (this.mode !== "choose") return;
    this.mode = "resolving";
    const playerPose = JANKEN_POSES[this.selectedPoseIndex];
    const opponentPose = JANKEN_POSES[Phaser.Math.Between(0, JANKEN_POSES.length - 1)];
    this.playerPoseText.setText(`あなたの手：　${poseLabel(playerPose)}`);
    this.opponentPoseText.setText(`あいての手：　${poseLabel(opponentPose)}`);
    this.promptText.setText("じゃんけん、しょっ！");
    this.actionButton.disableInteractive().setFillStyle(MUTED_COLOR);
    this.actionLabel.setText("しょうぶ中…").setColor(TEXT_COLOR);
    this.resolveTimer = this.time.delayedCall(520, () => {
      const result = resolveJanken(playerPose, opponentPose);
      if (result === "tie") {
        this.mode = "choose";
        this.promptText.setText("あいこ！　もういちど　えらぼう");
        this.actionButton.setInteractive({ useHandCursor: true }).setFillStyle(ACCENT_COLOR);
        this.actionLabel.setText("じゃんけん、しょっ！").setColor("#11192b");
        return;
      }
      this.mode = "result";
      const attacker = result === "player" ? "あなた" : this.battle.opponentName;
      this.promptText.setText(`${attacker}が　さきに　こうげき！\nプリンの　こうげき！　しょうぶあり！`);
      this.actionButton.setInteractive({ useHandCursor: true }).setFillStyle(ACCENT_COLOR);
      this.actionLabel.setText(result === "player" ? "あなたの　かち！　決定で　もどる" : "あいての　かち！　決定で　もどる").setColor("#11192b");
    });
    this.render();
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
    if (this.mode === "choose" && this.promptText.text === "だす手を　えらぼう") {
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
