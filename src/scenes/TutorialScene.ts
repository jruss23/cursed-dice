/**
 * Tutorial Scene
 * Simplified coordinator - delegates all tutorial logic to TutorialController
 */

import Phaser from 'phaser';
import {
  FONTS,
  PALETTE,
  COLORS,
  RESPONSIVE,
  getViewportMetrics,
  getScaledSizes,
  getPortraitLayout,
} from '@/config';
import { createScorecard, type Scorecard, type CategoryId } from '@/systems/scorecard';
import { createGameEvents, type GameEventEmitter } from '@/systems/game-events';
import { DiceManager } from '@/systems/dice-manager';
import { ScorecardPanel } from '@/ui/scorecard-panel';
import { HeaderPanel } from '@/ui/gameplay/header-panel';
import { createLogger } from '@/systems/logger';
import { createText } from '@/ui/ui-utils';
import { TutorialOverlay } from '@/ui/tutorial/tutorial-overlay';
import { TutorialController } from '@/systems/tutorial';

const log = createLogger('TutorialScene');

// =============================================================================
// TUTORIAL SCENE
// =============================================================================

interface TutorialSceneData {
  skipTutorial?: boolean; // If true, go straight to free play
}

export class TutorialScene extends Phaser.Scene {
  // Core systems
  private scorecard!: Scorecard;
  private gameEvents!: GameEventEmitter;
  private diceManager!: DiceManager;

  // UI components
  private scorecardPanel: ScorecardPanel | null = null;
  private tutorialOverlay: TutorialOverlay | null = null;
  private headerPanel: HeaderPanel | null = null;
  private backButton: Phaser.GameObjects.Container | null = null;
  private hintContainer: Phaser.GameObjects.Container | null = null;
  private hintText: Phaser.GameObjects.Text | null = null;
  private hintBg: Phaser.GameObjects.Rectangle | null = null;

  // Tutorial controller (owns all tutorial logic)
  private controller: TutorialController | null = null;

  // Audio
  private music: Phaser.Sound.BaseSound | null = null;

  // State
  private skipTutorial: boolean = false;

  constructor() {
    super({ key: 'TutorialScene' });
  }

  init(data?: TutorialSceneData): void {
    this.skipTutorial = data?.skipTutorial ?? false;
  }

  preload(): void {
    if (!this.cache.audio.exists('tutorial-music')) {
      this.load.audio('tutorial-music', 'sounds/chill.ogg');
    }
  }

  create(): void {
    log.log('Tutorial scene started', { skipTutorial: this.skipTutorial });

    this.events.once('shutdown', this.onShutdown, this);

    // Initialize systems
    this.gameEvents = createGameEvents();
    this.scorecard = createScorecard();

    this.startMusic();
    this.buildUI();

    if (this.skipTutorial) {
      // Free play mode - skip tutorial
      log.log('Skipping tutorial - free play mode');
      this.startFreePlay();
    } else {
      // Create and start tutorial controller
      this.initializeController();
      this.controller?.start();
    }
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  private initializeController(): void {
    if (!this.scorecardPanel || !this.diceManager || !this.headerPanel) {
      log.error('Cannot initialize controller - missing components');
      return;
    }

    this.controller = new TutorialController({
      scene: this,
      diceManager: this.diceManager,
      scorecardPanel: this.scorecardPanel,
      headerPanel: this.headerPanel,
      scorecard: this.scorecard,
      gameEvents: this.gameEvents,
      onShowStep: (step) => this.tutorialOverlay?.show(step),
      onHideOverlay: () => this.tutorialOverlay?.hide(),
      onShowHint: (message) => this.showHint(message),
      onComplete: () => this.onTutorialComplete(),
      onUpdateScore: (total) => this.headerPanel?.updateTotalScore(total),
    });

    // Connect lock attempt feedback
    this.diceManager.setOnLockAttempt((_index, allowed) => {
      if (!allowed) {
        this.controller?.onLockAttemptBlocked();
      }
    });
  }

  private buildUI(): void {
    const { width, height } = this.scale.gameSize;
    const metrics = getViewportMetrics(this);
    const scaledSizes = getScaledSizes(metrics);
    const layout = getPortraitLayout(this);

    this.createBackground(width, height);
    this.createHeader(width, layout.headerHeight);

    // Dice area
    this.diceManager = new DiceManager(this, this.gameEvents);
    this.diceManager.createUI(width / 2, layout.diceY, scaledSizes, layout.isUltraCompact);

    // Scorecard
    const scorecardWidth = width < 900 ? RESPONSIVE.SCORECARD_WIDTH_TWO_COL : scaledSizes.scorecardWidth;
    const scorecardX = (width - scorecardWidth) / 2;
    this.scorecardPanel = new ScorecardPanel(this, this.scorecard, this.gameEvents, {
      x: scorecardX,
      y: layout.scorecardY,
      compact: true,
      maxHeight: layout.scorecardHeight,
    });

    // Hint text with background (shown briefly for guidance)
    this.hintContainer = this.add.container(width / 2, layout.diceY - 60);
    this.hintContainer.setDepth(600);
    this.hintContainer.setAlpha(0);

    // Dark background for readability
    this.hintBg = this.add.rectangle(0, 0, 200, 28, PALETTE.purple[900], 0.9);
    this.hintBg.setStrokeStyle(1, PALETTE.gold[500], 0.5);
    this.hintContainer.add(this.hintBg);

    // Hint text
    this.hintText = createText(this, 0, 0, '', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
      fontStyle: 'bold',
    });
    this.hintText.setOrigin(0.5, 0.5);
    this.hintContainer.add(this.hintText);

    this.createBackButton();

    // Tutorial overlay
    this.tutorialOverlay = new TutorialOverlay(this, {
      onNext: () => this.controller?.advanceStep(),
    });

    // Start with everything disabled
    this.diceManager.setEnabled(false);
    this.scorecardPanel.lockInput();
    this.scorecardPanel.setHoverEnabled(false);
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x0a1a2a, 0x1a0a2a, 1);
    bg.fillRect(0, 0, width, height);
  }

  private startMusic(): void {
    if (this.cache.audio.exists('tutorial-music')) {
      this.music = this.sound.add('tutorial-music', { loop: true, volume: 0.4 });
      if (!this.sound.locked) {
        this.music.play();
      } else {
        this.sound.once('unlocked', () => {
          this.music?.play();
        });
      }
    }
  }

  private createHeader(width: number, headerHeight: number): void {
    const metrics = getViewportMetrics(this);

    this.headerPanel = new HeaderPanel(this, width / 2, {
      currentMode: 0,
      modeName: 'TUTORIAL',
      totalScore: 0,
      timeRemaining: -1,
      passThreshold: 250,
      compact: true,
      metrics,
      compactHeight: headerHeight,
    });

    // Override timer to show infinity
    const timerElements = this.headerPanel.getTimerElements();
    if (timerElements.text) {
      timerElements.text.setText('∞');
      timerElements.text.setColor(COLORS.TEXT_SUCCESS);
    }
    if (timerElements.glow) {
      timerElements.glow.setText('∞');
      timerElements.glow.setColor(COLORS.TEXT_SUCCESS);
      timerElements.glow.setAlpha(0.3);
    }
  }

  private createBackButton(): void {
    const { height } = this.scale.gameSize;
    const btnWidth = 80;
    const btnHeight = 32;
    const btnX = 6 + btnWidth / 2;
    const btnY = height - 6 - btnHeight / 2;

    this.backButton = this.add.container(btnX, btnY);
    this.backButton.setDepth(600);

    const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, PALETTE.purple[800], 0.95);
    bg.setStrokeStyle(2, PALETTE.purple[400], 0.8);
    bg.setInteractive({ useHandCursor: true });
    this.backButton.add(bg);

    const text = createText(this, 0, 0, '← BACK', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
    });
    text.setOrigin(0.5, 0.5);
    this.backButton.add(text);

    bg.on('pointerdown', () => this.onBackPressed());
    bg.on('pointerover', () => bg.setFillStyle(PALETTE.purple[700], 1));
    bg.on('pointerout', () => bg.setFillStyle(PALETTE.purple[800], 0.95));

    this.input.keyboard?.on('keydown-ESC', this.onBackPressed, this);
  }

  // ===========================================================================
  // HINT SYSTEM
  // ===========================================================================

  private showHint(message: string): void {
    if (!this.hintText || !this.hintContainer || !this.hintBg) return;

    this.hintText.setText(message);

    // Resize background to fit text with padding
    const padding = 16;
    this.hintBg.setSize(this.hintText.width + padding * 2, this.hintText.height + 10);

    this.tweens.killTweensOf(this.hintContainer);

    this.tweens.add({
      targets: this.hintContainer,
      alpha: 1,
      duration: 150,
      onComplete: () => {
        this.tweens.add({
          targets: this.hintContainer,
          alpha: 0,
          delay: 1500,
          duration: 300,
        });
      },
    });
  }

  // ===========================================================================
  // TUTORIAL COMPLETION
  // ===========================================================================

  private onTutorialComplete(): void {
    // Restart scene for practice mode
    log.log('Restarting scene for practice mode');
    this.scene.restart({ skipTutorial: true });
  }

  private startFreePlay(): void {
    log.log('Starting free play mode');
    this.tutorialOverlay?.hide();
    this.diceManager.resetTutorialMode();
    this.diceManager.setEnabled(true);
    this.scorecardPanel?.resetTutorialMode();
    this.scorecardPanel?.unlockInput();

    // Setup free play event listener
    this.gameEvents.on('score:category', this.onFreePlayScore, this);

    // Start a new turn
    this.diceManager.reset();
    this.diceManager.roll(true);
  }

  private onFreePlayScore = (data: { categoryId: CategoryId; dice: number[] }): void => {
    const score = this.scorecard.score(data.categoryId, data.dice);
    log.log(`Free play: Scored ${score} in ${data.categoryId}`);

    this.headerPanel?.updateTotalScore(this.scorecard.getTotal());
    this.scorecardPanel?.updateDisplay();

    // Check if all categories filled
    const availableCount = this.scorecard.getAvailableCategories().length;
    if (availableCount === 0) {
      this.showTutorialComplete();
    } else {
      this.diceManager.reset();
      this.diceManager.roll(true);
    }
  };

  // ===========================================================================
  // COMPLETION SCREEN
  // ===========================================================================

  private showTutorialComplete(): void {
    const { width, height } = this.scale.gameSize;
    const totalScore = this.scorecard.getTotal();
    const passed = totalScore >= 250;

    const overlay = this.add.container(0, 0);
    overlay.setDepth(1000);

    const dimBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    overlay.add(dimBg);

    const panelWidth = Math.min(width - 40, 340);
    const panelHeight = 280;
    const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, PALETTE.purple[800], 0.95);
    panel.setStrokeStyle(2, PALETTE.purple[500], 0.8);
    overlay.add(panel);

    const title = createText(this, width / 2, height / 2 - 90, 'Tutorial Complete!', {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    overlay.add(title);

    const scoreText = createText(this, width / 2, height / 2 - 40, `Final Score: ${totalScore}`, {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: passed ? COLORS.TEXT_SUCCESS : COLORS.TEXT_WARNING,
      fontStyle: 'bold',
    });
    scoreText.setOrigin(0.5, 0.5);
    overlay.add(scoreText);

    const resultMsg = passed
      ? 'You would have passed this curse!'
      : 'You need 250+ to pass a curse round.';
    const resultText = createText(this, width / 2, height / 2, resultMsg, {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    resultText.setOrigin(0.5, 0.5);
    overlay.add(resultText);

    const btnY = height / 2 + 60;
    const btnWidth = 120;
    const btnHeight = 40;
    const btnGap = 20;

    const tryAgainBg = this.add.rectangle(
      width / 2 - btnWidth / 2 - btnGap / 2,
      btnY,
      btnWidth,
      btnHeight,
      PALETTE.green[700],
      0.95
    );
    tryAgainBg.setStrokeStyle(2, PALETTE.green[500]);
    tryAgainBg.setInteractive({ useHandCursor: true });
    overlay.add(tryAgainBg);

    const tryAgainText = createText(this, width / 2 - btnWidth / 2 - btnGap / 2, btnY, 'TRY AGAIN', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    tryAgainText.setOrigin(0.5, 0.5);
    overlay.add(tryAgainText);

    tryAgainBg.on('pointerdown', () => this.scene.restart());

    const menuBg = this.add.rectangle(
      width / 2 + btnWidth / 2 + btnGap / 2,
      btnY,
      btnWidth,
      btnHeight,
      PALETTE.purple[700],
      0.95
    );
    menuBg.setStrokeStyle(2, PALETTE.purple[500]);
    menuBg.setInteractive({ useHandCursor: true });
    overlay.add(menuBg);

    const menuText = createText(this, width / 2 + btnWidth / 2 + btnGap / 2, btnY, 'MENU', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    menuText.setOrigin(0.5, 0.5);
    overlay.add(menuText);

    menuBg.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  private onBackPressed = (): void => {
    log.log('Back pressed, returning to menu');
    this.scene.start('MenuScene');
  };

  private onShutdown = (): void => {
    log.log('Tutorial scene shutting down');

    if (this.music) {
      this.music.stop();
      this.music.destroy();
      this.music = null;
    }

    // Cleanup free play listener if active
    this.gameEvents.off('score:category', this.onFreePlayScore);

    this.input.keyboard?.off('keydown-ESC', this.onBackPressed);

    this.controller?.destroy();
    this.diceManager?.destroy();
    this.scorecardPanel?.destroy();
    this.tutorialOverlay?.destroy();
    this.headerPanel?.destroy();
  };
}
