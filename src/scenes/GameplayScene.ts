/**
 * Gameplay Scene
 * Supports all 4 game modes with cursed mechanics
 *
 * Mode 1: Classic Sprint - Standard dice game
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
  FONTS,
  SIZES,
  PALETTE,
  COLORS,
  DEV,
  RESPONSIVE,
  getViewportMetrics,
  getScaledSizes,
  type ViewportMetrics,
  type ScaledSizes,
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
  GAUNTLET_LOCKED_THRESHOLD,
  type GameMode,
  type ModeConfig,
} from '@/systems/game-progression';
import {
  getBlessingManager,
  resetBlessingManager,
  type BlessingManager,
} from '@/systems/blessings';
import { createLogger } from '@/systems/logger';
import { getSaveManager } from '@/systems/save-manager';
import { InputManager } from '@/systems/input-manager';
import { getModeMechanics, type ModeMechanicsManager } from '@/systems/mode-mechanics';
import { BlessingChoicePanel } from '@/ui/blessing-choice-panel';

const log = createLogger('GameplayScene');
import { PauseMenu } from '@/ui/pause-menu';
import { HeaderPanel, DebugPanel, EndScreenOverlay } from '@/ui/gameplay';
import { ParticlePool } from '@/systems/particle-pool';
import { createText } from '@/ui/ui-utils';
import { DebugController } from '@/systems/debug-controller';

export class GameplayScene extends Phaser.Scene {
  // Core systems (created fresh each game)
  private scorecard!: Scorecard;
  private gameEvents!: GameEventEmitter;
  private diceManager!: DiceManager;
  private audioManager: AudioManager | null = null;
  private blessingManager!: BlessingManager;

  // UI components
  private scorecardPanel: ScorecardPanel | null = null;
  private headerPanel: HeaderPanel | null = null;
  private debugPanel: DebugPanel | null = null;
  private selectPrompt: Phaser.GameObjects.Text | null = null;

  // Game state
  private difficulty: Difficulty = 'normal';
  private timeRemaining: number = 0;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private warningsPlayed: Set<string> = new Set();

  // Mode-specific state
  private currentMode: GameMode = 1;
  private modeConfig!: ModeConfig;
  private modeMechanics!: ModeMechanicsManager;

  // Timer pulse tween (to prevent overlapping tweens causing zoom drift)
  private timerPulseTween: Phaser.Tweens.Tween | null = null;

  // Pause state
  private pauseMenu: PauseMenu | null = null;
  private isPaused: boolean = false;
  private isTransitioning: boolean = false; // Prevent actions during scene transitions

  // Input handling
  private inputManager: InputManager | null = null;

  // Object pooling
  private particlePool: ParticlePool | null = null;

  // Debug controller
  private debugController: DebugController | null = null;

  // Layout positions (set during buildUI, used by effects)
  private diceCenterX: number = 0;

  // Bound handlers for cleanup
  private boundOnResize: (() => void) | null = null;

  constructor() {
    super({ key: 'GameplayScene' });
  }

  // ===========================================================================
  // PHASER LIFECYCLE
  // ===========================================================================

  init(data: { difficulty?: Difficulty }): void {
    // Get current mode from progression system
    const progression = getGameProgression();
    this.currentMode = progression.getCurrentMode();
    this.modeConfig = progression.getCurrentModeConfig();

    log.log('init() - Mode:', this.currentMode, this.modeConfig.name);

    // Set difficulty and time from config
    this.difficulty = data.difficulty || 'normal';
    this.timeRemaining = DIFFICULTIES[this.difficulty].timeMs;
    this.warningsPlayed = new Set();

    // Reset pause/transition state
    this.isPaused = false;
    this.isTransitioning = false;
    this.timerPulseTween = null;

    // Create fresh instances for this game session
    this.scorecard = createScorecard();
    this.gameEvents = createGameEvents();

    // Initialize mode mechanics manager (needs gameEvents)
    this.modeMechanics = getModeMechanics();
    this.modeMechanics.init(this.modeConfig, this.gameEvents);

    // Initialize blessing manager (singleton, persists across scenes)
    this.blessingManager = getBlessingManager();

    // Listen for blessing events
    this.gameEvents.on('blessing:expansion:enable', () => {
      this.scorecard.enableSpecialSection();
      log.log('Special section (Blessing of Expansion) enabled via event');
    });

    // Trigger blessing mode start (emits events for active blessing)
    // Pass fresh events emitter since it's recreated each scene
    if (this.blessingManager.hasChosenBlessing()) {
      this.blessingManager.onModeStart(this.gameEvents);
    }
  }

  preload(): void {
    // Warning sound - pre-processed: 2 octaves down, 1.6x speed
    this.load.audio('warning-sound', 'sounds/siren_warning.wav');
  }

  create(): void {
    log.log('create()');

    // Register shutdown handler
    this.events.once('shutdown', this.onShutdown, this);

    // Initialize object pools
    this.particlePool = new ParticlePool(this);

    // Setup event listeners
    this.setupEventListeners();

    // Setup audio
    this.setupAudio();

    // Build UI
    this.buildUI();

    // Listen for resize events to adapt layout
    this.setupResizeHandler();

    // Start the game
    this.startGame();
  }

  private initialAspectRatio: number = 1;
  private setupResizeHandler(): void {
    const { width, height } = this.cameras.main;
    const isPortrait = height > width * 0.9;
    this.initialAspectRatio = isPortrait ? 1 : 0; // Track initial layout mode

    // Store bound handler for cleanup
    this.boundOnResize = () => {
      const newW = this.scale.gameSize.width;
      const newH = this.scale.gameSize.height;
      const newIsPortrait = newH > newW * 0.9;
      const newMode = newIsPortrait ? 1 : 0;

      // If layout mode changed, restart the scene
      if (newMode !== this.initialAspectRatio) {
        log.log('Aspect ratio changed, rebuilding layout');
        this.initialAspectRatio = newMode;
        // Restart scene preserving game state (don't reset progression)
        this.scene.restart({ difficulty: this.difficulty });
      }
    };

    // Listen for resize from Phaser's scale manager
    this.scale.on('resize', this.boundOnResize);
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

  private async setupAudio(): Promise<void> {
    // Create AudioManager (it handles its own preloading)
    this.audioManager = new AudioManager();

    // Initialize and play for current difficulty
    // init() preloads all songs, play() starts the correct one
    await this.audioManager.init(this);
    await this.audioManager.play(this.difficulty);
  }

  private buildUI(): void {
    const { width, height } = this.cameras.main;
    const progression = getGameProgression();

    // Fade in
    this.cameras.main.fadeIn(SIZES.FADE_DURATION_MS, 0, 0, 0);

    // Animated background
    this.createAnimatedBackground(width, height);

    // Create debug controller (used by DebugPanel)
    if (DEV.IS_DEVELOPMENT) {
      this.debugController = new DebugController({
        scene: this,
        getScorecard: () => this.scorecard,
        getTimeRemaining: () => this.timeRemaining,
        setTimeRemaining: (time: number) => { this.timeRemaining = time; },
        getDifficulty: () => this.difficulty,
        updateTimerDisplay: (formattedTime: string) => {
          const timerElements = this.headerPanel?.getTimerElements();
          if (timerElements?.text) {
            timerElements.text.setText(formattedTime);
            timerElements.glow?.setText(formattedTime);
          }
        },
        updateScorecardDisplay: () => this.scorecardPanel?.updateDisplay(),
        syncAudioToTime: (time: number) => this.audioManager?.syncToGameTime(time),
        endGame: (completed: boolean) => this.endGame(completed),
        restartScene: (data) => this.scene.restart(data),
      });
    }

    // Get responsive metrics and scaled sizes
    const metrics = getViewportMetrics(this);
    const scaledSizes = getScaledSizes(metrics);

    log.debug(`Layout: ${metrics.isPortrait ? 'portrait' : 'landscape'}, width: ${width}`);

    if (metrics.isPortrait) {
      this.buildPortraitLayout(width, height, progression.getTotalScore(), metrics, scaledSizes);
    } else {
      this.buildLandscapeLayout(width, height, progression.getTotalScore(), metrics, scaledSizes);
    }
  }

  /**
   * Landscape layout: Header+Dice on left, Scorecard on right (2 columns)
   */
  private buildLandscapeLayout(
    width: number,
    height: number,
    totalScore: number,
    metrics: ViewportMetrics,
    scaledSizes: ScaledSizes
  ): void {
    // Width for scorecard - panel determines its own layout
    const scorecardWidth = width < 900 ? RESPONSIVE.SCORECARD_WIDTH_TWO_COL : scaledSizes.scorecardWidth;
    const scorecardX = width - scorecardWidth - 15;
    const leftMargin = DEV.IS_DEVELOPMENT ? 160 : 30;
    const playAreaCenterX = leftMargin + (scorecardX - leftMargin) / 2;

    // Debug panel (only in debug mode)
    if (DEV.IS_DEVELOPMENT && this.debugController) {
      this.debugPanel = new DebugPanel(this, height, {
        onSkipTime: () => this.debugController!.skipTime(),
        onSkipStage: () => this.debugController!.skipStage(),
        onClearData: () => this.debugController!.clearData(),
        onPerfectUpper: () => this.debugController!.perfectUpper(),
        onSkipToMode: (mode: number) => this.debugController!.skipToMode(mode),
        currentMode: this.currentMode,
      });
    }

    // Header panel
    this.headerPanel = new HeaderPanel(this, playAreaCenterX, {
      currentMode: this.currentMode,
      modeName: this.modeConfig.name,
      totalScore,
      timeRemaining: this.timeRemaining,
      passThreshold: PASS_THRESHOLD,
      compact: metrics.isMobile,
      metrics,
    });

    // Dice area with scaled sizes
    this.diceCenterX = playAreaCenterX;
    this.createDicePanel(playAreaCenterX, height * 0.48, scaledSizes);

    // Select prompt - positioned above scorecard panel
    const promptPadding = 12;
    this.selectPrompt = createText(this, scorecardX + scorecardWidth / 2, promptPadding, 'Click a category to score', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
    });
    this.selectPrompt.setOrigin(0.5, 0);
    this.addPulseAnimation(this.selectPrompt);

    // Scorecard panel - below the prompt
    const promptHeight = 14;
    const scorecardY = promptPadding + promptHeight + promptPadding;
    this.scorecardPanel = new ScorecardPanel(this, this.scorecard, this.gameEvents, {
      x: scorecardX,
      y: scorecardY,
    });

    // QUIT button - bottom left corner
    this.createQuitButton(height);
  }

  /**
   * Portrait layout: Header+Dice stacked on top, Scorecard below
   */
  private buildPortraitLayout(
    width: number,
    height: number,
    totalScore: number,
    metrics: ViewportMetrics,
    scaledSizes: ScaledSizes
  ): void {
    const centerX = width / 2;

    // Debug panel (only in debug mode) - positioned differently
    if (DEV.IS_DEVELOPMENT && this.debugController) {
      this.debugPanel = new DebugPanel(this, height, {
        onSkipTime: () => this.debugController!.skipTime(),
        onSkipStage: () => this.debugController!.skipStage(),
        onClearData: () => this.debugController!.clearData(),
        onPerfectUpper: () => this.debugController!.perfectUpper(),
        onSkipToMode: (mode: number) => this.debugController!.skipToMode(mode),
        currentMode: this.currentMode,
      });
    }

    // Header panel (compact for portrait)
    this.headerPanel = new HeaderPanel(this, centerX, {
      currentMode: this.currentMode,
      modeName: this.modeConfig.name,
      totalScore,
      timeRemaining: this.timeRemaining,
      passThreshold: PASS_THRESHOLD,
      compact: true,
      metrics,
    });

    // Calculate dynamic positions based on available height
    // Short screens (iPhone X Safari ~640px): compress layout to fit
    // Normal mobile: standard compact layout
    // Tablet/desktop: more spacious layout
    let diceY: number;
    let scorecardY: number;

    if (metrics.isShortScreen) {
      // Very compact for short screens (iPhone X Safari)
      diceY = metrics.safeArea.top + 130;
      scorecardY = diceY + 145;
    } else if (metrics.isMobile) {
      // Standard mobile compact
      diceY = 164;
      scorecardY = 325;
    } else {
      // Tablet/desktop - more spacious
      diceY = 250;
      scorecardY = 380;
    }

    // Dice area with scaled sizes
    this.diceCenterX = centerX;
    this.createDicePanel(centerX, diceY, scaledSizes);

    // Scorecard (centered below dice) - use two-column width on small screens
    const scorecardWidth = width < 900 ? RESPONSIVE.SCORECARD_WIDTH_TWO_COL : scaledSizes.scorecardWidth;
    const scorecardX = (width - scorecardWidth) / 2;
    this.scorecardPanel = new ScorecardPanel(this, this.scorecard, this.gameEvents, {
      x: scorecardX,
      y: scorecardY,
      compact: true,
    });

    // Select prompt - only show on tablet/desktop, not needed on mobile (self-evident)
    if (!metrics.isMobile) {
      const promptY = scorecardY - 22;
      this.selectPrompt = createText(this, centerX, promptY, 'Tap a category to score', {
        fontSize: FONTS.SIZE_SMALL,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SUCCESS,
      });
      this.selectPrompt.setOrigin(0.5, 0.5);
      this.addPulseAnimation(this.selectPrompt);
    }

    // QUIT button - bottom left corner
    this.createQuitButton(height);
  }

  /**
   * Create PAUSE and QUIT buttons in bottom left corner
   */
  private createQuitButton(height: number): void {
    const btnWidth = 70;
    const btnHeight = 32; // Match 32px touch targets
    const btnY = height - 6; // Closer to corner

    // PAUSE button (left)
    const pauseX = 6; // Closer to corner
    const pauseBg = this.add.rectangle(pauseX, btnY, btnWidth, btnHeight, PALETTE.purple[700], 0.9);
    pauseBg.setOrigin(0, 1);
    pauseBg.setStrokeStyle(2, PALETTE.purple[500], 0.8);
    pauseBg.setInteractive({ useHandCursor: true });

    const pauseText = createText(this, pauseX + btnWidth / 2, btnY - btnHeight / 2, 'PAUSE', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_ACCENT,
      fontStyle: 'bold',
    });
    pauseText.setOrigin(0.5, 0.5);

    pauseBg.on('pointerover', () => {
      pauseBg.setFillStyle(PALETTE.purple[600], 1);
      pauseBg.setStrokeStyle(2, PALETTE.purple[400], 1);
    });
    pauseBg.on('pointerout', () => {
      pauseBg.setFillStyle(PALETTE.purple[700], 0.9);
      pauseBg.setStrokeStyle(2, PALETTE.purple[500], 0.8);
    });
    pauseBg.on('pointerdown', () => this.pauseGame());

    // QUIT button (right of pause)
    const quitX = pauseX + btnWidth + 4; // Reduced gap from 10 to 4
    const quitBg = this.add.rectangle(quitX, btnY, btnWidth, btnHeight, PALETTE.red[800], 0.9);
    quitBg.setOrigin(0, 1);
    quitBg.setStrokeStyle(2, PALETTE.red[500], 0.8);
    quitBg.setInteractive({ useHandCursor: true });

    const quitText = createText(this, quitX + btnWidth / 2, btnY - btnHeight / 2, 'QUIT', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_DANGER,
      fontStyle: 'bold',
    });
    quitText.setOrigin(0.5, 0.5);

    quitBg.on('pointerover', () => {
      quitBg.setFillStyle(PALETTE.red[700], 1);
      quitBg.setStrokeStyle(2, PALETTE.red[400], 1);
      quitText.setColor('#ffffff');
    });
    quitBg.on('pointerout', () => {
      quitBg.setFillStyle(PALETTE.red[800], 0.9);
      quitBg.setStrokeStyle(2, PALETTE.red[500], 0.8);
      quitText.setColor(COLORS.TEXT_DANGER);
    });
    quitBg.on('pointerdown', () => this.returnToMenu());

    // Create pause menu
    this.pauseMenu = new PauseMenu(this, {
      onResume: () => this.resumeGame(),
      onQuit: () => this.returnToMenu(),
    });

    // Setup centralized input handling
    this.inputManager = new InputManager(this);

    // Bind game actions
    this.inputManager.bind('roll', () => {
      if (!this.isPaused && !this.isTransitioning) {
        this.diceManager?.roll(false);
      }
    });

    this.inputManager.bind('pause', () => {
      if (this.isPaused) {
        this.resumeGame();
      } else {
        this.pauseGame();
      }
    });

    // Debug keys (only in development)
    if (DEV.IS_DEVELOPMENT && this.debugController) {
      this.inputManager.bind('debugTime', () => this.debugController!.skipTime());
      this.inputManager.bind('debugStage', () => this.debugController!.skipStage());
    }
  }

  /**
   * Helper to add pulse animation
   */
  private addPulseAnimation(target: Phaser.GameObjects.GameObject): void {
    this.tweens.add({
      targets: target,
      alpha: 0.3,
      duration: SIZES.ANIM_PULSE,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Create the dice area with DiceManager
   * DiceManager handles: dice sprites, helper text, rerolls display, roll button
   */
  private createDicePanel(centerX: number, centerY?: number, scaledSizes?: ScaledSizes): void {
    const diceY = centerY ?? SIZES.LAYOUT_DICE_Y;

    // Create DiceManager and render its UI
    // DiceManager.createUI creates: dice, helper text, rerolls text, roll button
    this.diceManager = new DiceManager(this, this.gameEvents);
    this.diceManager.createUI(centerX, diceY, scaledSizes);
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

    // Apply mode mechanics after initial roll (e.g., curse die for Mode 2)
    this.time.delayedCall(SIZES.ROLL_DURATION_MS + 100, () => {
      this.modeMechanics.onAfterInitialRoll(this.diceManager);
    });

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
    // Mode 4 (Gauntlet): Enable pulsing green indicator for available categories
    if (this.modeConfig.lockedCategories >= GAUNTLET_LOCKED_THRESHOLD) {
      this.scorecardPanel?.setGauntletMode(true);
    }

    // Apply mode mechanics at start (locks categories for Mode 3 & 4)
    const availableCategories = this.scorecard.getAvailableCategories();
    this.modeMechanics.onModeStart(availableCategories);
  }

  private updateTimer(): void {
    this.timeRemaining -= 1000;

    // Sync audio to game time (may trigger song transitions)
    this.audioManager?.syncToGameTime(this.timeRemaining);

    // Get timer elements from header panel
    const timerElements = this.headerPanel?.getTimerElements();
    const timerText = timerElements?.text;
    const timerGlow = timerElements?.glow;

    if (timerText) {
      timerText.setText(this.formatTime(this.timeRemaining));
      timerGlow?.setText(this.formatTime(this.timeRemaining));

      // Visual effects based on time remaining
      if (this.timeRemaining <= 10000) {
        // Critical - red pulsing, screen shake
        timerText.setColor(COLORS.TIMER_CRITICAL);
        timerGlow?.setColor(COLORS.TEXT_DANGER);
        timerGlow?.setAlpha(0.4);

        // Pulse effect - only if no tween is running (prevents scale drift)
        if (!this.timerPulseTween || !this.timerPulseTween.isPlaying()) {
          // Reset scale to 1.0 before starting new pulse
          timerText.setScale(1);
          timerGlow?.setScale(1);
          this.timerPulseTween = this.tweens.add({
            targets: [timerText, timerGlow],
            scaleX: 1.08,
            scaleY: 1.08,
            duration: 150,
            yoyo: true,
            ease: 'Quad.easeOut',
          });
        }

        // Screen shake
        this.cameras.main.shake(200, 0.003);
      } else if (this.timeRemaining <= 30000) {
        // Danger - orange/red
        timerText.setColor(COLORS.TIMER_DANGER);
        timerGlow?.setColor(COLORS.TEXT_DANGER);
        timerGlow?.setAlpha(0.3);

        // Subtle pulse - only every 2 seconds and if no tween running
        if (this.timeRemaining % 2000 === 0 && (!this.timerPulseTween || !this.timerPulseTween.isPlaying())) {
          timerText.setScale(1);
          timerGlow?.setScale(1);
          this.timerPulseTween = this.tweens.add({
            targets: [timerText, timerGlow],
            scaleX: 1.04,
            scaleY: 1.04,
            duration: 200,
            yoyo: true,
            ease: 'Quad.easeOut',
          });
        }
      } else if (this.timeRemaining <= 60000) {
        // Warning - gold/yellow
        timerText.setColor(COLORS.TIMER_WARNING);
        timerGlow?.setColor(COLORS.TEXT_WARNING);
        timerGlow?.setAlpha(0.25);
      } else {
        // Normal - green
        timerText.setColor(COLORS.TIMER_SAFE);
        timerGlow?.setColor(COLORS.TEXT_SUCCESS);
        timerGlow?.setAlpha(0.25);
      }
    }

    // Check for warning sound triggers
    this.checkWarnings();

    // Emit timer events
    this.gameEvents.emit('timer:tick', {
      remaining: this.timeRemaining,
      formatted: this.formatTime(this.timeRemaining),
    });

    if (this.timeRemaining <= 0) {
      this.endGame(false);
    }
  }

  private checkWarnings(): void {
    let warning: string | null = null;

    if (this.timeRemaining <= 10000) {
      warning = '10s';
    } else if (this.timeRemaining <= 30000) {
      warning = '30s';
    } else if (this.timeRemaining <= 60000) {
      warning = '1min';
    }

    // Play warning sound at checkpoint (once per threshold)
    if (warning && !this.warningsPlayed.has(warning)) {
      this.warningsPlayed.add(warning);
      this.playWarningSound(warning);
    }
  }

  private playWarningSound(checkpoint: string): void {
    if (this.cache.audio.exists('warning-sound')) {
      // Pre-processed siren (3 octaves down, 3.2x speed)
      const sound = this.sound.add('warning-sound', { volume: 0.5 });
      sound.play();
      log.log(`Playing warning: ${checkpoint}`);
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
    if (!this.modeMechanics.canScore(categoryId)) {
      log.warn(`Cannot score locked category: ${categoryId}`);
      return;
    }

    const points = this.scorecard.score(categoryId, dice);
    if (points < 0) return; // Category already filled

    log.log(`Scored ${points} in ${categoryId}`);

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
      const availableCategories = this.scorecard.getAvailableCategories();
      this.modeMechanics.onAfterScore(this.diceManager, availableCategories);
    });
  }

  private showScoreEffect(points: number): void {
    const centerX = this.diceCenterX;
    const centerY = 290;

    // Determine color and size based on score quality
    let color: string = COLORS.TEXT_SUCCESS;
    let glowColor: string = '#22aa44';
    let size: string = '48px';
    if (points >= 50) {
      color = COLORS.TEXT_WARNING; // Five Dice! - gold
      glowColor = '#ffaa00';
      size = '72px';
    } else if (points >= 30) {
      color = COLORS.TEXT_ACCENT; // Great - purple accent
      glowColor = '#aa66ff';
      size = '56px';
    } else if (points >= 15) {
      color = COLORS.TEXT_SUCCESS; // Good - green
      glowColor = '#22aa44';
      size = '48px';
    } else if (points === 0) {
      color = COLORS.TEXT_MUTED; // Zero - muted
      glowColor = '#666666';
      size = '36px';
    }

    // Glow layer behind text
    const scoreGlow = createText(this, centerX, centerY, `+${points}`, {
      fontSize: size,
      fontFamily: FONTS.FAMILY,
      color: glowColor,
      fontStyle: 'bold',
    });
    scoreGlow.setOrigin(0.5, 0.5);
    scoreGlow.setAlpha(0);
    scoreGlow.setBlendMode(Phaser.BlendModes.ADD);
    scoreGlow.setScale(1.1);

    // Main score text
    const scoreText = createText(this, centerX, centerY, `+${points}`, {
      fontSize: size,
      fontFamily: FONTS.FAMILY,
      color: color,
      fontStyle: 'bold',
    });
    scoreText.setOrigin(0.5, 0.5);
    scoreText.setAlpha(0);

    const targets = [scoreText, scoreGlow];

    // Animate in with punch effect
    this.tweens.add({
      targets,
      y: centerY - 60,
      alpha: 1,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Settle to normal scale
        this.tweens.add({
          targets,
          scaleX: 1,
          scaleY: 1,
          duration: 150,
          ease: 'Quad.easeOut',
          onComplete: () => {
            // Hold for a moment, then fade out
            this.tweens.add({
              targets,
              y: centerY - 120,
              alpha: 0,
              duration: 500,
              delay: 600, // Linger for 600ms before fading
              ease: 'Quad.easeIn',
              onComplete: () => {
                scoreText.destroy();
                scoreGlow.destroy();
              },
            });
          },
        });
      },
    });

    // Particle burst for good scores
    if (points >= 15) {
      this.createScoreParticles(centerX, centerY - 40, points >= 50 ? 20 : points >= 30 ? 12 : 6, color);
    }

    // Screen flash for Five Dice (5 of a kind)
    if (points >= 50) {
      this.cameras.main.flash(300, 255, 220, 100);
    }
  }

  private createScoreParticles(x: number, y: number, count: number, color: string): void {
    const colorNum = Phaser.Display.Color.HexStringToColor(color).color;
    this.particlePool?.emit(x, y, count, colorNum);
  }

  // ===========================================================================
  // END GAME
  // ===========================================================================

  private endGame(completed: boolean): void {
    // Disable all game interactions
    this.diceManager.setEnabled(false);
    this.scorecardPanel?.disableInteractivity();

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
    const progression = getGameProgression();
    const modeScore = this.scorecard.getTotal();

    // Complete the mode in the progression system
    const { passed, showBlessingChoice } = progression.completeMode(modeScore);
    const isRunComplete = progression.isRunComplete();
    const totalScore = progression.getTotalScore();

    // Save high scores
    const saveManager = getSaveManager();
    const isNewHighScore = saveManager.recordModeScore(this.difficulty, modeScore);
    let isNewBestRun = false;
    if (isRunComplete) {
      isNewBestRun = saveManager.recordCompletedRun(totalScore);
    }
    if (isNewHighScore) {
      log.log(`New high score for ${this.difficulty}: ${modeScore}`);
    }
    if (isNewBestRun) {
      log.log(`New best run: ${totalScore}`);
    }

    new EndScreenOverlay(
      this,
      {
        passed,
        isRunComplete,
        showBlessingChoice,
        modeScore,
        totalScore,
        currentMode: this.currentMode,
        completed,
        passThreshold: PASS_THRESHOLD,
      },
      {
        onNewGame: () => {
          resetGameProgression();
          resetBlessingManager();
          this.returnToMenu();
        },
        onQuit: () => {
          resetGameProgression();
          resetBlessingManager();
          this.returnToMenu();
        },
        onContinue: () => {
          if (showBlessingChoice) {
            this.showBlessingChoicePanel();
          } else {
            this.startNextMode();
          }
        },
        onTryAgain: () => {
          resetGameProgression();
          resetBlessingManager();
          this.startNextMode();
        },
      }
    );
  }

  /**
   * Start the next mode (or restart from Mode 1)
   * @param skipFade - If true, skip camera fade (already faded from blessing choice)
   */
  private startNextMode(skipFade = false): void {
    // Prevent double-transitions
    if (this.isTransitioning) {
      log.debug('startNextMode blocked: already transitioning');
      return;
    }
    this.isTransitioning = true;
    log.log('Starting transition to next mode');

    if (this.audioManager) {
      this.audioManager.stop();
    }

    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }

    if (skipFade) {
      // Camera already faded, just restart
      this.scene.restart({ difficulty: this.difficulty });
    } else {
      this.cameras.main.fadeOut(SIZES.FADE_DURATION_MS, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.restart({ difficulty: this.difficulty });
      });
    }
  }

  /**
   * Show blessing choice panel after Mode 1 completion
   */
  private showBlessingChoicePanel(): void {
    log.log('Showing blessing choice panel');

    new BlessingChoicePanel(this, {
      onSelect: (blessingId) => {
        log.log(`Player chose blessing: ${blessingId}`);
        this.blessingManager.chooseBlessing(blessingId, this.gameEvents);
        // Skip fade since BlessingChoicePanel already faded to black
        this.startNextMode(true);
      },
    });
  }

  // ===========================================================================
  // NAVIGATION
  // ===========================================================================

  // ===========================================================================
  // PAUSE / RESUME
  // ===========================================================================

  private pauseGame(): void {
    if (this.isPaused) {
      log.debug('pauseGame blocked: already paused');
      return;
    }
    if (this.isTransitioning) {
      log.debug('pauseGame blocked: scene transitioning');
      return;
    }
    this.isPaused = true;
    log.log('Game paused');

    // Pause timer
    if (this.timerEvent) {
      this.timerEvent.paused = true;
    }

    // Pause audio
    if (this.audioManager) {
      this.audioManager.pause();
    }

    // Disable dice interaction
    this.diceManager.setEnabled(false);

    // Show pause menu
    this.pauseMenu?.show();
  }

  private resumeGame(): void {
    if (!this.isPaused) {
      log.debug('resumeGame blocked: not paused');
      return;
    }
    this.isPaused = false;
    log.log('Game resumed');

    // Resume timer
    if (this.timerEvent) {
      this.timerEvent.paused = false;
    }

    // Resume audio
    if (this.audioManager) {
      this.audioManager.resume();
    }

    // Re-enable dice interaction
    this.diceManager.setEnabled(true);

    // Hide pause menu
    this.pauseMenu?.hide();
  }

  private returnToMenu(): void {
    // Prevent double-transitions
    if (this.isTransitioning) {
      log.debug('returnToMenu blocked: already transitioning');
      return;
    }
    this.isTransitioning = true;
    log.log('Returning to menu');

    // Hide pause menu if visible
    if (this.pauseMenu?.isVisible()) {
      this.pauseMenu.hide();
    }

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
    log.log('shutdown - cleaning up');

    // Remove resize listener
    if (this.boundOnResize) {
      this.scale.off('resize', this.boundOnResize);
      this.boundOnResize = null;
    }

    // Stop timer
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }

    // Stop and dispose audio
    if (this.audioManager) {
      this.audioManager.dispose();
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

    if (this.headerPanel) {
      this.headerPanel.destroy();
      this.headerPanel = null;
    }

    if (this.debugPanel) {
      this.debugPanel.destroy();
      this.debugPanel = null;
    }

    if (this.pauseMenu) {
      this.pauseMenu.destroy();
      this.pauseMenu = null;
    }

    // Cleanup input manager (removes all keyboard listeners)
    if (this.inputManager) {
      this.inputManager.destroy();
      this.inputManager = null;
    }

    // Cleanup particle pool
    if (this.particlePool) {
      this.particlePool.destroy();
      this.particlePool = null;
    }
  }
}
