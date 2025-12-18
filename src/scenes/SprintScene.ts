/**
 * Sprint Mode Scene
 * Supports all 4 game modes with cursed mechanics
 *
 * Mode 1: Classic Sprint - Standard Yahtzee
 * Mode 2: Cursed Dice - 1 die locked per hand
 * Mode 3: Cursed Categories (3 Locked) - 3 random categories locked
 * Mode 4: Cursed Categories (1 Unlocked) - Only 1 category available
 *
 * Architecture:
 * - Uses dependency injection (scorecard, events passed to components)
 * - Event-driven communication between components
 * - Proper Phaser lifecycle (init → create → shutdown)
 */

import Phaser from 'phaser';
import {
  type Difficulty,
  DIFFICULTIES,
  COLORS,
  FONTS,
  SIZES,
  GAME_RULES,
} from '@/config';
import { createScorecard, type Scorecard, type CategoryId } from '@/systems/scorecard';
import { createGameEvents, type GameEventEmitter } from '@/systems/game-events';
import { DiceManager } from '@/systems/dice-manager';
import { AudioManager } from '@/systems/audio-manager';
import { ScorecardPanel } from '@/ui/scorecard-panel';
import {
  getGameProgression,
  resetGameProgression,
  PASS_THRESHOLD,
  type GameMode,
  type ModeConfig,
} from '@/systems/game-progression';

export class SprintScene extends Phaser.Scene {
  // Core systems (created fresh each game)
  private scorecard!: Scorecard;
  private gameEvents!: GameEventEmitter;
  private diceManager!: DiceManager;
  private audioManager: AudioManager | null = null;

  // UI components
  private scorecardPanel: ScorecardPanel | null = null;
  private timerText: Phaser.GameObjects.Text | null = null;
  private selectPrompt: Phaser.GameObjects.Text | null = null;

  // Game state
  private difficulty: Difficulty = 'normal';
  private timeRemaining: number = 0;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private warningsPlayed: Set<string> = new Set();

  // Mode-specific state
  private currentMode: GameMode = 1;
  private modeConfig!: ModeConfig;
  private cursedDieIndex: number = -1; // Mode 2: which die is cursed
  private lockedCategories: Set<CategoryId> = new Set(); // Modes 3-4: locked categories

  constructor() {
    super({ key: 'SprintScene' });
  }

  // ===========================================================================
  // PHASER LIFECYCLE
  // ===========================================================================

  init(data: { difficulty?: Difficulty }): void {
    // Get current mode from progression system
    const progression = getGameProgression();
    this.currentMode = progression.getCurrentMode();
    this.modeConfig = progression.getCurrentModeConfig();

    console.log('[SprintScene] init() - Mode:', this.currentMode, this.modeConfig.name);

    // Set difficulty and time from config
    this.difficulty = data.difficulty || 'normal';
    this.timeRemaining = DIFFICULTIES[this.difficulty].timeMs;
    this.warningsPlayed = new Set();

    // Reset mode-specific state
    this.cursedDieIndex = -1;
    this.lockedCategories = new Set();

    // Create fresh instances for this game session
    this.scorecard = createScorecard();
    this.gameEvents = createGameEvents();
  }

  preload(): void {
    AudioManager.preload(this, this.difficulty);

    // Checkpoint warning sounds
    this.load.audio('warning-1min', 'sounds/Gate close.wav');
    this.load.audio('warning-30s', 'sounds/Thunderbolt.wav');
    this.load.audio('warning-10s', 'sounds/Police_signal.wav');
  }

  create(): void {
    console.log('[SprintScene] create()');

    // Register shutdown handler
    this.events.once('shutdown', this.onShutdown, this);

    // Setup event listeners
    this.setupEventListeners();

    // Setup audio
    this.setupAudio();

    // Build UI
    this.buildUI();

    // Start the game
    this.startGame();
  }

  update(): void {
    // Game loop updates if needed
  }

  // ===========================================================================
  // SETUP
  // ===========================================================================

  private setupEventListeners(): void {
    // Handle category scoring
    this.gameEvents.on('score:category', ({ categoryId, dice }) => {
      this.onCategoryScored(categoryId, dice);
    });

    // Handle menu request
    this.gameEvents.on('ui:menuRequested', () => {
      this.returnToMenu();
    });
  }

  private setupAudio(): void {
    const trackKey = `music-${this.difficulty}`;
    const trackPath = `sounds/${this.difficulty}.mp3`;

    if (!this.cache.audio.exists(trackKey)) {
      this.load.audio(trackKey, trackPath);
      this.load.once('complete', () => {
        this.audioManager = new AudioManager(this);
        this.audioManager.play(this.difficulty);
      });
      this.load.start();
    } else {
      this.audioManager = new AudioManager(this);
      this.audioManager.play(this.difficulty);
    }
  }

  private buildUI(): void {
    const { width, height } = this.cameras.main;
    const progression = getGameProgression();

    // Fade in
    this.cameras.main.fadeIn(SIZES.FADE_DURATION_MS, 0, 0, 0);

    // Animated background
    this.createAnimatedBackground(width, height);

    // Mode badge (top left) with glow
    const modeBadge = this.add.container(75, 25);
    const modeBg = this.add.rectangle(0, 0, 130, 40, 0x2a1a4a, 0.8);
    modeBg.setStrokeStyle(2, 0x6a4a8a);
    modeBadge.add(modeBg);

    const modeText = this.createText(0, -5, `MODE ${this.currentMode}/4`, {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: '#aa88ff',
      fontStyle: 'bold',
    });
    modeText.setOrigin(0.5, 0.5);
    modeBadge.add(modeText);

    const totalSoFar = progression.getTotalScore();
    const totalText = this.createText(0, 10, `Total: ${totalSoFar}`, {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_MUTED,
    });
    totalText.setOrigin(0.5, 0.5);
    modeBadge.add(totalText);

    // Pulse the mode badge
    this.tweens.add({
      targets: modeBg,
      alpha: 0.6,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Title (mode name) with glow
    const titleGlow = this.createText(width / 2, 20, this.modeConfig.name, {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: '#4444aa',
      fontStyle: 'bold',
    });
    titleGlow.setOrigin(0.5, 0);
    titleGlow.setAlpha(0.4);
    titleGlow.setBlendMode(Phaser.BlendModes.ADD);

    const title = this.createText(width / 2, 20, this.modeConfig.name, {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0);

    // Subtitle
    const subtitle = this.createText(width / 2, 55, `${this.modeConfig.description}`, {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_MUTED,
    });
    subtitle.setOrigin(0.5, 0);

    // Threshold reminder with pulsing
    const thresholdText = this.createText(width / 2, 145, `Need ${PASS_THRESHOLD}+ to advance`, {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: '#ffaa44',
    });
    thresholdText.setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: thresholdText,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Timer with glow effect
    const timerGlow = this.createText(width / 2, 90, this.formatTime(this.timeRemaining), {
      fontSize: FONTS.SIZE_TITLE,
      fontFamily: FONTS.FAMILY,
      color: '#44aa44',
      fontStyle: 'bold',
    });
    timerGlow.setOrigin(0.5, 0);
    timerGlow.setAlpha(0.3);
    timerGlow.setBlendMode(Phaser.BlendModes.ADD);
    timerGlow.setName('timerGlow');

    this.timerText = this.createText(width / 2, 90, this.formatTime(this.timeRemaining), {
      fontSize: FONTS.SIZE_TITLE,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    this.timerText.setOrigin(0.5, 0);

    // Scorecard panel (right side)
    const scorecardX = width - 300;
    this.scorecardPanel = new ScorecardPanel(this, this.scorecard, this.gameEvents, {
      x: scorecardX,
      y: 80,
    });

    // Dice area (centered under title)
    this.diceManager = new DiceManager(this, this.gameEvents);
    this.diceManager.createUI(width / 2, 280);

    // Select category prompt
    this.selectPrompt = this.createText(scorecardX + 135, 55, '↓ CLICK TO SCORE ↓', {
      fontSize: '16px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    this.selectPrompt.setOrigin(0.5, 0.5);

    // Animate prompt
    this.tweens.add({
      targets: this.selectPrompt,
      alpha: 0.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Menu button
    this.createMenuButton();

    // Debug controls (skip time)
    this.createDebugControls();
  }

  private createDebugControls(): void {
    const { height } = this.cameras.main;

    // Debug panel container - left side, vertically centered
    const panelX = 90;
    const panelY = height / 2;

    // Debug panel background
    const panelBg = this.add.rectangle(panelX, panelY, 160, 100, 0x1a1a2a, 0.85);
    panelBg.setStrokeStyle(2, 0x4a3a6a);

    // Debug label
    const debugLabel = this.createText(panelX, panelY - 38, 'DEBUG', {
      fontSize: '10px',
      fontFamily: FONTS.FAMILY,
      color: '#8866aa',
      fontStyle: 'bold',
    });
    debugLabel.setOrigin(0.5, 0.5);

    // Skip 10 seconds button
    const skipTimeBtn = this.add.rectangle(panelX, panelY - 12, 140, 28, 0x3a3a2a);
    skipTimeBtn.setStrokeStyle(2, 0x8a7a4a);
    skipTimeBtn.setInteractive({ useHandCursor: true });

    const skipTimeText = this.createText(panelX, panelY - 12, '-10 sec [D]', {
      fontSize: '11px',
      fontFamily: FONTS.FAMILY,
      color: '#ffcc66',
      fontStyle: 'bold',
    });
    skipTimeText.setOrigin(0.5, 0.5);

    skipTimeBtn.on('pointerover', () => skipTimeBtn.setFillStyle(0x5a5a3a));
    skipTimeBtn.on('pointerout', () => skipTimeBtn.setFillStyle(0x3a3a2a));
    skipTimeBtn.on('pointerdown', () => this.debugSkipTime());

    // Skip to next stage button
    const skipStageBtn = this.add.rectangle(panelX, panelY + 20, 140, 28, 0x2a3a4a);
    skipStageBtn.setStrokeStyle(2, 0x4a8aaa);
    skipStageBtn.setInteractive({ useHandCursor: true });

    const skipStageText = this.createText(panelX, panelY + 20, 'Skip Stage [S]', {
      fontSize: '11px',
      fontFamily: FONTS.FAMILY,
      color: '#66ccff',
      fontStyle: 'bold',
    });
    skipStageText.setOrigin(0.5, 0.5);

    skipStageBtn.on('pointerover', () => skipStageBtn.setFillStyle(0x3a5a6a));
    skipStageBtn.on('pointerout', () => skipStageBtn.setFillStyle(0x2a3a4a));
    skipStageBtn.on('pointerdown', () => this.debugSkipStage());

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-D', () => this.debugSkipTime());
    this.input.keyboard?.on('keydown-S', () => this.debugSkipStage());
  }

  /**
   * DEBUG: Skip 10 seconds of time
   */
  private debugSkipTime(): void {
    this.timeRemaining = Math.max(0, this.timeRemaining - 10000);
    if (this.timerText) {
      this.timerText.setText(this.formatTime(this.timeRemaining));
    }
    this.updateMusicSpeed();
    console.log(`[DEBUG] Skipped 10s, time remaining: ${this.formatTime(this.timeRemaining)}`);

    // Visual feedback
    this.cameras.main.flash(100, 255, 200, 100);
  }

  /**
   * DEBUG: Skip to next stage with perfect score
   */
  private debugSkipStage(): void {
    console.log('[DEBUG] Skipping stage with perfect score');

    // Fill all unfilled categories with high scores to guarantee pass
    const available = this.scorecard.getAvailableCategories();

    for (const cat of available) {
      // Score each category with perfect dice for that category
      const perfectDice = this.getPerfectDiceForCategory(cat.id);
      this.scorecard.score(cat.id, perfectDice);
    }

    // Update display
    this.scorecardPanel?.updateDisplay();

    // Show feedback
    const { width } = this.cameras.main;
    const skipText = this.createText(width / 2, 200, '⚡ DEBUG: Stage Skipped!', {
      fontSize: '24px',
      fontFamily: FONTS.FAMILY,
      color: '#66ffcc',
      fontStyle: 'bold',
    });
    skipText.setOrigin(0.5, 0.5);
    skipText.setAlpha(0);

    this.tweens.add({
      targets: skipText,
      alpha: 1,
      y: 160,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: skipText,
          alpha: 0,
          duration: 500,
          delay: 500,
          onComplete: () => skipText.destroy(),
        });
      },
    });

    this.cameras.main.flash(200, 100, 255, 200);

    // End game successfully
    this.time.delayedCall(300, () => {
      this.endGame(true);
    });
  }

  /**
   * Get perfect dice values for a given category
   */
  private getPerfectDiceForCategory(categoryId: CategoryId): number[] {
    switch (categoryId) {
      case 'ones':
        return [1, 1, 1, 1, 1];
      case 'twos':
        return [2, 2, 2, 2, 2];
      case 'threes':
        return [3, 3, 3, 3, 3];
      case 'fours':
        return [4, 4, 4, 4, 4];
      case 'fives':
        return [5, 5, 5, 5, 5];
      case 'sixes':
        return [6, 6, 6, 6, 6];
      case 'threeOfAKind':
        return [6, 6, 6, 5, 5]; // 29 points
      case 'fourOfAKind':
        return [6, 6, 6, 6, 5]; // 29 points
      case 'fullHouse':
        return [6, 6, 6, 5, 5]; // 25 points
      case 'smallStraight':
        return [1, 2, 3, 4, 6]; // 30 points
      case 'largeStraight':
        return [1, 2, 3, 4, 5]; // 40 points
      case 'yahtzee':
        return [6, 6, 6, 6, 6]; // 50 points
      case 'chance':
        return [6, 6, 6, 6, 6]; // 30 points
      default:
        return [6, 6, 6, 6, 6];
    }
  }

  private createMenuButton(): void {
    const { height } = this.cameras.main;

    const bg = this.add.rectangle(70, height - 30, SIZES.BTN_MENU_WIDTH, SIZES.BTN_MENU_HEIGHT, COLORS.BTN_SECONDARY_BG);
    bg.setStrokeStyle(2, COLORS.BTN_SECONDARY_BORDER);
    bg.setInteractive({ useHandCursor: true });

    const text = this.createText(70, height - 30, '← MENU', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(COLORS.BTN_SECONDARY_HOVER);
      text.setColor(COLORS.TEXT_PRIMARY);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(COLORS.BTN_SECONDARY_BG);
      text.setColor(COLORS.TEXT_SECONDARY);
    });

    bg.on('pointerdown', () => this.returnToMenu());
  }

  /** Helper for crisp retina text */
  private createText(
    x: number,
    y: number,
    content: string,
    style: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Text {
    const text = this.add.text(x, y, content, style);
    text.setResolution(window.devicePixelRatio * 2);
    return text;
  }

  private createAnimatedBackground(width: number, height: number): void {
    // Dark gradient base
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x0a1a2a, 0x1a0a2a, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle ambient particles
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(2, 6);

      const particle = this.add.circle(x, y, size, 0x4a4a8a, 0.1);

      this.tweens.add({
        targets: particle,
        y: y + Phaser.Math.Between(-50, 50),
        alpha: Phaser.Math.FloatBetween(0.05, 0.15),
        duration: Phaser.Math.Between(4000, 8000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 3000),
      });
    }

    // Corner vignettes
    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0.3);
    vignette.fillCircle(0, 0, 200);
    vignette.fillCircle(width, 0, 200);
    vignette.fillCircle(0, height, 200);
    vignette.fillCircle(width, height, 200);
    vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  // ===========================================================================
  // GAME LOGIC
  // ===========================================================================

  private startGame(): void {
    // Initialize mode-specific mechanics
    this.initializeModeMechanics();

    // Initial roll
    this.diceManager.roll(true);

    // Apply cursed dice after initial roll
    if (this.modeConfig.cursedDice) {
      this.time.delayedCall(SIZES.ROLL_DURATION_MS + 100, () => {
        this.applyCursedDie();
      });
    }

    // Start timer
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });
  }

  /**
   * Initialize mode-specific mechanics
   */
  private initializeModeMechanics(): void {
    // Mode 3 & 4: Lock categories
    if (this.modeConfig.lockedCategories > 0) {
      this.refreshLockedCategories();
    }
  }

  /**
   * Mode 2: Apply cursed die - lock one random die
   */
  private applyCursedDie(): void {
    // Pick a new random die to curse (different from current)
    let newIndex: number;
    do {
      newIndex = Phaser.Math.Between(0, GAME_RULES.DICE_COUNT - 1);
    } while (newIndex === this.cursedDieIndex && GAME_RULES.DICE_COUNT > 1);

    this.cursedDieIndex = newIndex;
    this.diceManager.setCursedDie(this.cursedDieIndex);
    console.log(`[SprintScene] Cursed die: index ${this.cursedDieIndex}`);
  }

  /**
   * Mode 3 & 4: Refresh which categories are locked
   */
  private refreshLockedCategories(): void {
    const available = this.scorecard.getAvailableCategories();
    if (available.length === 0) return;

    // Clear old locks
    this.lockedCategories.clear();

    // Determine how many to lock (Mode 3: 3, Mode 4: all but 1)
    const numToLock = Math.min(this.modeConfig.lockedCategories, available.length - 1);

    // Shuffle available and lock the first N
    const shuffled = Phaser.Utils.Array.Shuffle([...available]);
    for (let i = 0; i < numToLock; i++) {
      this.lockedCategories.add(shuffled[i].id);
    }

    // Update scorecard panel with locked categories
    this.scorecardPanel?.setLockedCategories(this.lockedCategories);

    console.log(`[SprintScene] Locked ${numToLock} categories:`, Array.from(this.lockedCategories));
  }

  private updateTimer(): void {
    this.timeRemaining -= 1000;

    const timerGlow = this.children.getByName('timerGlow') as Phaser.GameObjects.Text | null;

    if (this.timerText) {
      this.timerText.setText(this.formatTime(this.timeRemaining));
      timerGlow?.setText(this.formatTime(this.timeRemaining));

      // Visual effects based on time remaining
      if (this.timeRemaining <= 10000) {
        // Critical - red pulsing, screen shake
        this.timerText.setColor('#ff2222');
        timerGlow?.setColor('#ff0000');
        timerGlow?.setAlpha(0.5);

        // Pulse effect
        this.tweens.add({
          targets: [this.timerText, timerGlow],
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 150,
          yoyo: true,
          ease: 'Quad.easeOut',
        });

        // Screen shake
        this.cameras.main.shake(200, 0.003);
      } else if (this.timeRemaining <= 30000) {
        // Danger - orange
        this.timerText.setColor('#ff6622');
        timerGlow?.setColor('#ff4400');
        timerGlow?.setAlpha(0.4);

        // Subtle pulse
        if (this.timeRemaining % 2000 === 0) {
          this.tweens.add({
            targets: [this.timerText, timerGlow],
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 200,
            yoyo: true,
            ease: 'Quad.easeOut',
          });
        }
      } else if (this.timeRemaining <= 60000) {
        // Warning - yellow
        this.timerText.setColor(COLORS.TEXT_WARNING);
        timerGlow?.setColor('#ffaa00');
        timerGlow?.setAlpha(0.35);
      } else {
        // Normal - green
        this.timerText.setColor(COLORS.TEXT_SUCCESS);
        timerGlow?.setColor('#44aa44');
        timerGlow?.setAlpha(0.3);
      }
    }

    // Speed up music as time runs out
    this.updateMusicSpeed();

    // Emit timer events
    this.gameEvents.emit('timer:tick', {
      remaining: this.timeRemaining,
      formatted: this.formatTime(this.timeRemaining),
    });

    if (this.timeRemaining <= 0) {
      this.endGame(false);
    }
  }

  private updateMusicSpeed(): void {
    if (!this.audioManager) return;

    // Speed thresholds
    // > 1 min: 1.0x (normal)
    // ≤ 1 min: 1.3x
    // ≤ 30s:   1.6x
    // ≤ 10s:   2.0x

    let targetRate = 1.0;
    let warning: string | null = null;

    if (this.timeRemaining <= 10000) {
      targetRate = 2.0;
      warning = '10s';
    } else if (this.timeRemaining <= 30000) {
      targetRate = 1.6;
      warning = '30s';
    } else if (this.timeRemaining <= 60000) {
      targetRate = 1.3;
      warning = '1min';
    }

    // Only update if rate changed (avoid spam)
    if (Math.abs(this.audioManager.getRate() - targetRate) > 0.01) {
      this.audioManager.setRate(targetRate);

      // Play warning sound at checkpoint (once per threshold)
      if (warning && !this.warningsPlayed.has(warning)) {
        this.warningsPlayed.add(warning);
        this.playWarningSound(warning);
      }
    }
  }

  private playWarningSound(checkpoint: string): void {
    const soundKey = `warning-${checkpoint}`;
    if (this.cache.audio.exists(soundKey)) {
      const sound = this.sound.add(soundKey, { volume: 0.7 });
      sound.play();
      console.log(`[SprintScene] Playing warning: ${checkpoint}`);
    }
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private onCategoryScored(categoryId: CategoryId, dice: number[]): void {
    // Check if category is locked (Mode 3 & 4)
    if (this.lockedCategories.has(categoryId)) {
      console.log(`[SprintScene] Cannot score locked category: ${categoryId}`);
      return;
    }

    const points = this.scorecard.score(categoryId, dice);
    if (points < 0) return; // Category already filled

    console.log(`[SprintScene] Scored ${points} in ${categoryId}`);

    // Celebration effect!
    this.showScoreEffect(points);

    // Update display
    this.scorecardPanel?.updateDisplay();

    // Emit score event
    this.gameEvents.emit('score:updated', {
      categoryId,
      score: points,
      total: this.scorecard.getTotal(),
    });

    // Check for completion
    if (this.scorecard.isComplete()) {
      this.endGame(true);
      return;
    }

    // Reset dice for next turn
    this.diceManager.reset();
    this.diceManager.roll(true);

    // Apply mode-specific effects after scoring
    this.time.delayedCall(SIZES.ROLL_DURATION_MS + 100, () => {
      // Mode 2: Apply new cursed die after each score
      if (this.modeConfig.cursedDice) {
        this.applyCursedDie();
      }

      // Mode 3 & 4: Refresh locked categories after each score
      if (this.modeConfig.lockedCategories > 0) {
        this.refreshLockedCategories();
      }
    });
  }

  private showScoreEffect(points: number): void {
    const { width } = this.cameras.main;
    const centerX = width / 2;
    const centerY = 280;

    // Determine color based on score quality
    let color = '#44ff44';
    let size = '32px';
    if (points >= 50) {
      color = '#ffdd00'; // Yahtzee!
      size = '48px';
    } else if (points >= 30) {
      color = '#44ddff'; // Great
      size = '40px';
    } else if (points >= 15) {
      color = '#88ff88'; // Good
    } else if (points === 0) {
      color = '#888888';
      size = '24px';
    }

    // Floating score text
    const scoreText = this.createText(centerX, centerY, `+${points}`, {
      fontSize: size,
      fontFamily: FONTS.FAMILY,
      color: color,
      fontStyle: 'bold',
    });
    scoreText.setOrigin(0.5, 0.5);
    scoreText.setAlpha(0);

    // Animate in and float up
    this.tweens.add({
      targets: scoreText,
      y: centerY - 80,
      alpha: 1,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: scoreText,
          y: centerY - 150,
          alpha: 0,
          duration: 600,
          ease: 'Quad.easeIn',
          onComplete: () => scoreText.destroy(),
        });
      },
    });

    // Particle burst for good scores
    if (points >= 15) {
      this.createScoreParticles(centerX, centerY, points >= 50 ? 20 : points >= 30 ? 12 : 6, color);
    }

    // Screen flash for Yahtzee
    if (points >= 50) {
      this.cameras.main.flash(300, 255, 220, 100);
    }
  }

  private createScoreParticles(x: number, y: number, count: number, color: string): void {
    const colorNum = Phaser.Display.Color.HexStringToColor(color).color;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const distance = Phaser.Math.Between(60, 120);
      const size = Phaser.Math.Between(4, 10);

      const particle = this.add.circle(x, y, size, colorNum, 0.8);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: Phaser.Math.Between(400, 800),
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  // ===========================================================================
  // END GAME
  // ===========================================================================

  private endGame(completed: boolean): void {
    this.diceManager.setEnabled(false);

    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }

    if (this.audioManager) {
      this.audioManager.fadeOut(500);
    }

    this.gameEvents.emit('game:end', {
      completed,
      score: this.scorecard.getTotal(),
    });

    this.showEndScreen(completed);
  }

  private showEndScreen(completed: boolean): void {
    const { width, height } = this.cameras.main;
    const progression = getGameProgression();
    const modeScore = this.scorecard.getTotal();

    // Complete the mode in the progression system
    const { passed, nextMode } = progression.completeMode(modeScore);
    const isRunComplete = progression.isRunComplete();
    const totalScore = progression.getTotalScore();

    // Overlay
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85);
    overlay.setOrigin(0, 0);
    overlay.setDepth(100);

    // Determine title based on pass/fail
    let titleText: string;
    let titleColor: string;

    if (isRunComplete) {
      titleText = '🎉 VICTORY! 🎉';
      titleColor = '#ffdd44';
    } else if (passed) {
      titleText = 'MODE COMPLETE!';
      titleColor = COLORS.TEXT_SUCCESS;
    } else if (!completed) {
      titleText = "TIME'S UP!";
      titleColor = COLORS.TEXT_DANGER;
    } else {
      titleText = 'SCORE TOO LOW';
      titleColor = COLORS.TEXT_DANGER;
    }

    const endTitle = this.createText(width / 2, height / 2 - 100, titleText, {
      fontSize: FONTS.SIZE_TITLE,
      fontFamily: FONTS.FAMILY,
      color: titleColor,
      fontStyle: 'bold',
    });
    endTitle.setOrigin(0.5, 0.5);
    endTitle.setDepth(101);

    // Mode score with pass/fail indicator
    const passText = passed ? '✓ PASSED' : '✗ FAILED';
    const passColor = passed ? COLORS.TEXT_SUCCESS : COLORS.TEXT_DANGER;

    const scoreLabel = this.createText(width / 2, height / 2 - 50, `Mode ${this.currentMode} Score: ${modeScore}`, {
      fontSize: '28px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
    });
    scoreLabel.setOrigin(0.5, 0.5);
    scoreLabel.setDepth(101);

    const passIndicator = this.createText(width / 2, height / 2 - 20, `${passText} (need ${PASS_THRESHOLD}+)`, {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: passColor,
      fontStyle: 'bold',
    });
    passIndicator.setOrigin(0.5, 0.5);
    passIndicator.setDepth(101);

    // Categories filled
    const categories = this.createText(
      width / 2,
      height / 2 + 10,
      `Categories: ${this.scorecard.getFilledCount()}/${GAME_RULES.CATEGORIES_COUNT}`,
      {
        fontSize: FONTS.SIZE_SMALL,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_MUTED,
      }
    );
    categories.setOrigin(0.5, 0.5);
    categories.setDepth(101);

    // Total score (cumulative across all modes)
    const totalLabel = this.createText(width / 2, height / 2 + 45, `TOTAL SCORE: ${totalScore}`, {
      fontSize: '24px',
      fontFamily: FONTS.FAMILY,
      color: '#aaaaff',
      fontStyle: 'bold',
    });
    totalLabel.setOrigin(0.5, 0.5);
    totalLabel.setDepth(101);

    // Buttons based on result
    if (isRunComplete) {
      // Victory - show final score and menu button
      this.createEndButton(width / 2, height / 2 + 110, 'NEW GAME', () => {
        resetGameProgression();
        this.returnToMenu();
      });
    } else if (passed && nextMode) {
      // Passed - continue to next mode
      const nextConfig = progression.getModeConfig(nextMode);
      this.createEndButton(width / 2, height / 2 + 100, `CONTINUE → MODE ${nextMode}`, () => {
        this.startNextMode();
      }, COLORS.BTN_PRIMARY_BG, COLORS.BTN_PRIMARY_BORDER);

      // Show what's next
      const nextModeInfo = this.createText(width / 2, height / 2 + 145, nextConfig.name, {
        fontSize: FONTS.SIZE_SMALL,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_MUTED,
      });
      nextModeInfo.setOrigin(0.5, 0.5);
      nextModeInfo.setDepth(101);

      // Also show menu option
      this.createEndButton(width / 2, height / 2 + 190, 'QUIT TO MENU', () => {
        resetGameProgression();
        this.returnToMenu();
      }, COLORS.BTN_SECONDARY_BG, COLORS.BTN_SECONDARY_BORDER);
    } else {
      // Failed - restart from Mode 1
      this.createEndButton(width / 2, height / 2 + 100, 'TRY AGAIN (Mode 1)', () => {
        resetGameProgression();
        this.startNextMode();
      }, 0x4a2a2a, 0xff6666);

      this.createEndButton(width / 2, height / 2 + 160, 'MAIN MENU', () => {
        resetGameProgression();
        this.returnToMenu();
      }, COLORS.BTN_SECONDARY_BG, COLORS.BTN_SECONDARY_BORDER);
    }
  }

  private createEndButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    bgColor: number = COLORS.BTN_PRIMARY_BG,
    borderColor: number = COLORS.BTN_PRIMARY_BORDER
  ): void {
    const btnBg = this.add.rectangle(x, y, 240, 45, bgColor);
    btnBg.setStrokeStyle(3, borderColor);
    btnBg.setDepth(101);
    btnBg.setInteractive({ useHandCursor: true });

    const btnText = this.createText(x, y, label, {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    btnText.setOrigin(0.5, 0.5);
    btnText.setDepth(102);

    btnBg.on('pointerover', () => btnBg.setFillStyle(Phaser.Display.Color.ValueToColor(bgColor).lighten(20).color));
    btnBg.on('pointerout', () => btnBg.setFillStyle(bgColor));
    btnBg.on('pointerdown', onClick);
  }

  /**
   * Start the next mode (or restart from Mode 1)
   */
  private startNextMode(): void {
    if (this.audioManager) {
      this.audioManager.stop();
    }

    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }

    this.cameras.main.fadeOut(SIZES.FADE_DURATION_MS, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ difficulty: this.difficulty });
    });
  }

  // ===========================================================================
  // NAVIGATION
  // ===========================================================================

  private returnToMenu(): void {
    if (this.audioManager) {
      this.audioManager.stop();
    }

    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }

    this.cameras.main.fadeOut(SIZES.FADE_DURATION_MS, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MenuScene');
    });
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  private onShutdown(): void {
    console.log('[SprintScene] shutdown - cleaning up');

    // Stop timer
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }

    // Stop audio
    if (this.audioManager) {
      this.audioManager.stop();
      this.audioManager = null;
    }

    // Destroy event emitter
    if (this.gameEvents) {
      this.gameEvents.destroy();
    }

    // Destroy components
    if (this.diceManager) {
      this.diceManager.destroy();
    }

    if (this.scorecardPanel) {
      this.scorecardPanel.destroy();
      this.scorecardPanel = null;
    }
  }
}
