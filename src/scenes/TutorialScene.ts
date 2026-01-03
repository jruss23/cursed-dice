/**
 * Tutorial Scene
 * Simplified coordinator - delegates all tutorial logic to TutorialController
 */

import Phaser from 'phaser';
import {
  FONTS,
  PALETTE,
  COLORS,
  FLASH,
  DEV,
  getViewportMetrics,
  getGameplayLayout,
} from '@/config';
import { toDPR } from '@/systems/responsive';
import { createScorecard, type Scorecard } from '@/systems/scorecard';
import type { CategoryId } from '@/data/categories';
import { createGameEvents, type GameEventEmitter } from '@/systems/game-events';
import { DiceManager } from '@/systems/dice-manager';
import { ScorecardPanel } from '@/ui/scorecard-panel';
import { HeaderPanel } from '@/ui/gameplay';
import { createLogger } from '@/systems/logger';
import { createText } from '@/ui/ui-utils';
import { TutorialOverlay } from '@/ui/tutorial/tutorial-overlay';
import { TutorialController } from '@/systems/tutorial';
import { TutorialDebugPanel } from '@/ui/tutorial/tutorial-debug-panel';
import { TutorialDebugController } from '@/systems/tutorial-debug-controller';
import { TutorialCompleteOverlay } from '@/ui/tutorial/tutorial-complete-overlay';
import { isMusicEnabled } from '@/systems/music-manager';
import { getSaveManager } from '@/systems/save-manager';

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

  // Debug
  private debugPanel: TutorialDebugPanel | null = null;
  private debugController: TutorialDebugController | null = null;

  // Completion overlay
  private completeOverlay: TutorialCompleteOverlay | null = null;

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
      this.load.audio('tutorial-music', ['sounds/chill.mp3', 'sounds/chill.ogg']);
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
    const layout = getGameplayLayout(this);

    this.createBackground(width, height);
    this.createHeader(width, layout.header.height);

    // Dice area (using layout values)
    this.diceManager = new DiceManager(this, this.gameEvents);
    this.diceManager.createUI(layout);

    // Scorecard (using layout values)
    this.scorecardPanel = new ScorecardPanel(this, this.scorecard, this.gameEvents, {
      x: layout.scorecard.x,
      y: layout.scorecard.y,
      width: layout.scorecard.width,
      compact: true,
      maxHeight: layout.scorecard.height,
      heightScale: layout.viewport.heightScale,
    });

    // Hint text with background (shown briefly for guidance)
    const hintGap = toDPR(60);
    this.hintContainer = this.add.container(width / 2, layout.dice.centerY - hintGap);
    this.hintContainer.setDepth(1100); // Above highlight graphics (depth 1000)
    this.hintContainer.setAlpha(0);

    // Dark background for readability (scaled for DPR)
    this.hintBg = this.add.rectangle(0, 0, toDPR(200), toDPR(28), PALETTE.purple[900], 0.9);
    this.hintBg.setStrokeStyle(toDPR(1), PALETTE.gold[500], 0.5);
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

    // Debug panel (development only)
    this.createDebugPanel(height);
  }

  private createDebugPanel(height: number): void {
    if (!DEV.IS_DEVELOPMENT) return;

    // Create debug controller with tutorial-specific dependencies
    this.debugController = new TutorialDebugController({
      scene: this,
      isInFreePlay: () => this.skipTutorial,
      skipToFreePlay: () => this.scene.restart({ skipTutorial: true }),
      hideTutorialOverlay: () => this.tutorialOverlay?.hide(),
      showCompletion: (overrideScore?: number) => this.showTutorialComplete(overrideScore),
    });

    // Create debug panel wired to controller
    this.debugPanel = new TutorialDebugPanel(this, height, {
      onSkipToPractice: () => this.debugController?.skipToPractice(),
      onPassTutorial: () => this.debugController?.passTutorial(),
      onFailTutorial: () => this.debugController?.failTutorial(),
    });
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(PALETTE.gameplay.bgTopLeft, PALETTE.gameplay.bgTopRight, PALETTE.gameplay.bgBottomLeft, PALETTE.gameplay.bgBottomRight, 1);
    bg.fillRect(0, 0, width, height);
  }

  private startMusic(): void {
    if (this.cache.audio.exists('tutorial-music')) {
      // Use volume 0 if music disabled, so it can be unmuted later
      const vol = isMusicEnabled() ? 0.4 : 0;
      this.music = this.sound.add('tutorial-music', { loop: true, volume: vol });
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

    // Button dimensions and positioning (scaled for DPR)
    const btnWidth = toDPR(80);
    const btnHeight = toDPR(32);
    const edgePadding = toDPR(8);

    const btnX = edgePadding + btnWidth / 2;
    const btnY = height - edgePadding - btnHeight / 2;

    this.backButton = this.add.container(btnX, btnY);
    this.backButton.setDepth(600);

    const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, PALETTE.purple[800], 0.95);
    bg.setStrokeStyle(toDPR(2), PALETTE.purple[400], 0.8);
    bg.setInteractive({ useHandCursor: true });
    this.backButton.add(bg);

    const text = createText(this, 0, 0, '← BACK', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
    });
    text.setOrigin(0.5, 0.5);
    this.backButton.add(text);

    bg.on('pointerdown', () => {
      this.cameras.main.flash(150, FLASH.PURPLE.r, FLASH.PURPLE.g, FLASH.PURPLE.b);
      this.onBackPressed();
    });
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

    // Resize background to fit text with padding (scaled for DPR)
    const padding = toDPR(16);
    const heightPadding = toDPR(10);
    this.hintBg.setSize(this.hintText.width + padding * 2, this.hintText.height + heightPadding);

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
    // Mark tutorial as completed in save data
    getSaveManager().setTutorialCompleted();

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

  /**
   * Show tutorial completion overlay
   * @param overrideScore Optional score to display (for debug testing pass/fail)
   */
  private showTutorialComplete(overrideScore?: number): void {
    const totalScore = overrideScore ?? this.scorecard.getTotal();
    const passThreshold = 250;

    this.completeOverlay = new TutorialCompleteOverlay(
      this,
      { totalScore, passThreshold },
      {
        onTryAgain: () => {
          this.completeOverlay?.destroy();
          this.completeOverlay = null;
          // Go to practice mode, skip the tutorial popups
          this.scene.restart({ skipTutorial: true });
        },
        onMenu: () => {
          this.completeOverlay?.destroy();
          this.completeOverlay = null;
          this.scene.start('MenuScene');
        },
      }
    );
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
    this.debugPanel?.destroy();
    this.completeOverlay?.destroy();
  };
}
