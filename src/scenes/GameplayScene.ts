/**
 * Gameplay Scene
 * Supports all 4 game modes with cursed mechanics
 * Extends BaseScene for common lifecycle helpers
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

import {
  type Difficulty,
  DIFFICULTIES,
  SIZES,
  COLORS,
  DEV,
  RESPONSIVE,
  getScaledSizes,
  getPortraitLayout,
  type ViewportMetrics,
  type ScaledSizes,
} from '@/config';
import { createScorecard, type Scorecard } from '@/systems/scorecard';
import type { CategoryId } from '@/data/categories';
import { createGameEvents, type GameEventEmitter } from '@/systems/game-events';
import { DiceManager } from '@/systems/dice-manager';
import { AudioManager } from '@/systems/audio-manager';
import { ScorecardPanel } from '@/ui/scorecard-panel';
import {
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
import { InputManager } from '@/systems/input-manager';
import { getModeMechanics, type ModeMechanicsManager } from '@/systems/mode-mechanics';
import { BlessingChoicePanel } from '@/ui/blessing-choice-panel';
import { GameStateMachine } from '@/systems/state-machine';
import { Services, getProgression, getSave } from '@/systems/services';
import { PauseMenu } from '@/ui/pause-menu';
import { HeaderPanel, DebugPanel, EndScreenOverlay } from '@/ui/gameplay';
import { ParticlePool } from '@/systems/particle-pool';
import { DebugController } from '@/systems/debug-controller';
import { SixthBlessing } from '@/systems/blessings/blessing-sixth';
import { BaseScene } from './BaseScene';
import {
  BlessingIntegration,
  createAnimatedBackground,
  createDebugPanel,
  createHeaderPanel,
  createControlButtons,
  createSelectPrompt,
  showScoreEffect,
} from './gameplay';

export class GameplayScene extends BaseScene {
  // Core systems (created fresh each game)
  private scorecard!: Scorecard;
  private gameEvents!: GameEventEmitter;
  private diceManager!: DiceManager;
  private audioManager: AudioManager | null = null;
  private blessingManager!: BlessingManager;
  private stateMachine!: GameStateMachine;

  // UI components
  private scorecardPanel: ScorecardPanel | null = null;
  private headerPanel: HeaderPanel | null = null;
  private debugPanel: DebugPanel | null = null;
  private selectPrompt: Phaser.GameObjects.Text | null = null;
  private blessingIntegration: BlessingIntegration | null = null;

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

  // Input handling
  private inputManager: InputManager | null = null;

  // Object pooling
  private particlePool: ParticlePool | null = null;

  // Debug controller
  private debugController: DebugController | null = null;

  // Layout positions (set during buildUI, used by effects)
  private diceCenterX: number = 0;

  // Bound event handlers for cleanup (boundOnResize inherited from BaseScene)
  private boundOnExpansionEnable: (() => void) | null = null;
  private boundOnScoreCategory: ((payload: { categoryId: CategoryId; dice: number[] }) => void) | null = null;
  private boundOnMenuRequested: (() => void) | null = null;

  constructor() {
    super({ key: 'GameplayScene' });
  }

  // ===========================================================================
  // PHASER LIFECYCLE
  // ===========================================================================

  init(data: { difficulty?: Difficulty }): void {
    // Get current mode from progression system
    const progression = getProgression();
    this.currentMode = progression.getCurrentMode();
    this.modeConfig = progression.getCurrentModeConfig();

    this.log.log('init() - Mode:', this.currentMode, this.modeConfig.name);

    // Set difficulty and time from config
    this.difficulty = data.difficulty || 'normal';
    this.timeRemaining = DIFFICULTIES[this.difficulty].timeMs;
    this.warningsPlayed = new Set();

    // Reset timer pulse tween
    this.timerPulseTween = null;

    // Create state machine
    this.stateMachine = new GameStateMachine();

    // Create fresh instances for this game session
    this.scorecard = createScorecard();
    this.gameEvents = createGameEvents();

    // Initialize mode mechanics manager (needs gameEvents)
    this.modeMechanics = getModeMechanics();
    this.modeMechanics.init(this.modeConfig, this.gameEvents);

    // Initialize blessing manager (singleton, persists across scenes)
    this.blessingManager = getBlessingManager();

    // Listen for blessing events (store bound handler for cleanup)
    this.boundOnExpansionEnable = () => {
      this.scorecard.enableSpecialSection();
      this.log.log('Special section (Blessing of Expansion) enabled via event');
    };
    this.gameEvents.on('blessing:expansion:enable', this.boundOnExpansionEnable);

    // Trigger blessing mode start (emits events for active blessing)
    // Pass fresh events emitter since it's recreated each scene
    if (this.blessingManager.hasChosenBlessing()) {
      this.blessingManager.onModeStart(this.gameEvents);
    }
  }

  preload(): void {
    // Warning sound - pre-processed: 2 octaves down, 1.6x speed
    this.load.audio('warning-sound', 'sounds/siren_warning.ogg');
  }

  create(): void {
    this.log.log('create()');

    // Register shutdown handler (from BaseScene)
    this.registerShutdown();

    // Initialize object pools
    this.particlePool = new ParticlePool(this);

    // Setup event listeners
    this.setupEventListeners();

    // Setup state machine callbacks
    this.setupStateMachine();

    // Register services for dependency injection
    this.registerServices();

    // Setup audio
    this.setupAudio();

    // Build UI
    this.buildUI();

    // Listen for resize events to adapt layout
    this.setupResizeHandler();

    // Start the game
    this.startGame();
  }

  /**
   * Setup state machine callbacks
   */
  private setupStateMachine(): void {
    // Pause state
    this.stateMachine.onEnter('paused', () => {
      if (this.timerEvent) this.timerEvent.paused = true;
      this.audioManager?.pause();
      this.diceManager?.setEnabled(false);
      this.pauseMenu?.show();
    });

    this.stateMachine.onExit('paused', () => {
      if (this.timerEvent) this.timerEvent.paused = false;
      this.audioManager?.resume();
      this.diceManager?.setEnabled(true);
      this.pauseMenu?.hide();
    });

    // Rolling state
    this.stateMachine.onEnter('rolling', () => {
      this.diceManager?.setEnabled(false); // Can't click dice during roll
    });

    this.stateMachine.onExit('rolling', () => {
      this.diceManager?.setEnabled(true);
    });

    // Game over state
    this.stateMachine.onEnter('game-over', () => {
      this.diceManager?.setEnabled(false);
      this.scorecardPanel?.disableInteractivity();
      if (this.timerEvent) {
        this.timerEvent.destroy();
        this.timerEvent = null;
      }
    });

    // Mode transition state
    this.stateMachine.onEnter('mode-transition', () => {
      this.audioManager?.stop();
    });
  }

  /**
   * Register services for dependency injection
   * Note: diceManager is registered later in buildUI() because it creates UI in constructor
   */
  private registerServices(): void {
    Services.register('scorecard', this.scorecard);
    Services.register('events', this.gameEvents);
    Services.register('stateMachine', this.stateMachine);
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
        this.log.log('Aspect ratio changed, rebuilding layout');
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
    // Handle category scoring (store bound handler for cleanup)
    this.boundOnScoreCategory = ({ categoryId, dice }) => {
      this.onCategoryScored(categoryId, dice);
    };
    this.gameEvents.on('score:category', this.boundOnScoreCategory);

    // Handle menu request (store bound handler for cleanup)
    this.boundOnMenuRequested = () => {
      this.returnToMenu();
    };
    this.gameEvents.on('ui:menuRequested', this.boundOnMenuRequested);
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
    const progression = getProgression();

    // Fade in
    this.cameras.main.fadeIn(SIZES.FADE_DURATION_MS, 0, 0, 0);

    // Animated background
    createAnimatedBackground(this, width, height);

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
    const metrics = this.getMetrics();
    const scaledSizes = getScaledSizes(metrics);

    this.log.debug(`Layout: ${metrics.isPortrait ? 'portrait' : 'landscape'}, width: ${width}`);

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
    if (this.debugController) {
      this.debugPanel = createDebugPanel({
        scene: this,
        height,
        currentMode: this.currentMode,
        debugController: this.debugController,
      });
    }

    // Header panel
    this.headerPanel = createHeaderPanel({
      scene: this,
      centerX: playAreaCenterX,
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
    this.selectPrompt = createSelectPrompt(this, scorecardX + scorecardWidth / 2, promptPadding);
    this.selectPrompt.setOrigin(0.5, 0);

    // Scorecard panel - below the prompt
    const promptHeight = 14;
    const scorecardY = promptPadding + promptHeight + promptPadding;
    this.scorecardPanel = new ScorecardPanel(this, this.scorecard, this.gameEvents, {
      x: scorecardX,
      y: scorecardY,
      passThreshold: PASS_THRESHOLD,
    });

    // Control buttons (PAUSE/QUIT) - bottom left corner
    this.createControlButtonsUI(height);
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

    // Debug panel (only in debug mode)
    if (this.debugController) {
      this.debugPanel = createDebugPanel({
        scene: this,
        height,
        currentMode: this.currentMode,
        debugController: this.debugController,
      });
    }

    // Get viewport-relative layout using Phaser's scale API
    // Reference: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scalemanager/
    const layout = getPortraitLayout(this);

    // Header panel (compact for portrait)
    this.headerPanel = createHeaderPanel({
      scene: this,
      centerX,
      currentMode: this.currentMode,
      modeName: this.modeConfig.name,
      totalScore,
      timeRemaining: this.timeRemaining,
      passThreshold: PASS_THRESHOLD,
      compact: true,
      metrics,
      compactHeight: layout.headerHeight,
    });

    // Dice area with scaled sizes - use layout-calculated Y position
    this.diceCenterX = centerX;
    this.createDicePanel(centerX, layout.diceY, scaledSizes, layout.isUltraCompact);

    // Scorecard (centered below dice) - use two-column width on small screens
    const scorecardWidth = width < 900 ? RESPONSIVE.SCORECARD_WIDTH_TWO_COL : scaledSizes.scorecardWidth;
    const scorecardX = (width - scorecardWidth) / 2;
    this.scorecardPanel = new ScorecardPanel(this, this.scorecard, this.gameEvents, {
      x: scorecardX,
      y: layout.scorecardY,
      compact: true,
      maxHeight: layout.scorecardHeight,
      passThreshold: PASS_THRESHOLD,
    });

    // Select prompt - only show on tablet/desktop, not needed on mobile (self-evident)
    if (!metrics.isMobile) {
      const promptY = layout.scorecardY - 22;
      this.selectPrompt = createSelectPrompt(this, centerX, promptY, 'Tap a category to score');
      this.selectPrompt.setOrigin(0.5, 0.5);
    }

    // Control buttons (PAUSE/QUIT) - bottom left corner
    this.createControlButtonsUI(height);
  }

  /**
   * Create PAUSE and QUIT buttons in bottom left corner
   */
  private createControlButtonsUI(height: number): void {
    const result = createControlButtons({
      scene: this,
      height,
      stateMachine: this.stateMachine,
      diceManager: this.diceManager,
      debugController: this.debugController,
      onPause: () => this.pauseGame(),
      onResume: () => this.resumeGame(),
      onQuit: () => this.returnToMenu(),
    });

    this.pauseMenu = result.pauseMenu;
    this.inputManager = result.inputManager;
  }

  /**
   * Create the dice area with DiceManager
   * DiceManager handles: dice sprites, helper text, rerolls display, roll button
   */
  private createDicePanel(
    centerX: number,
    centerY?: number,
    scaledSizes?: ScaledSizes,
    isUltraCompact?: boolean
  ): void {
    const diceY = centerY ?? SIZES.LAYOUT_DICE_Y;

    // Create DiceManager and render its UI
    // DiceManager.createUI creates: dice, helper text, rerolls text, roll button
    this.diceManager = new DiceManager(this, this.gameEvents);
    Services.register('diceManager', this.diceManager);

    // If a blessing with a button is chosen, enable the blessing slot in controls panel
    const chosenBlessing = this.blessingManager.getChosenBlessingId();
    const blessingsWithButton: Array<typeof chosenBlessing> = ['sixth', 'mercy', 'sanctuary'];
    const hasBlessingButton = chosenBlessing && blessingsWithButton.includes(chosenBlessing);
    if (hasBlessingButton) {
      this.diceManager.enableBlessingSlot();
    }

    this.diceManager.createUI(centerX, diceY, scaledSizes, isUltraCompact);

    // Set up blessing integration (handles sixth, mercy, sanctuary)
    if (hasBlessingButton) {
      this.blessingIntegration = new BlessingIntegration({
        scene: this,
        events: this.gameEvents,
        blessingManager: this.blessingManager,
        diceManager: this.diceManager,
        gameWidth: this.scale.gameSize.width,
        diceY,
        diceSize: scaledSizes?.dice ?? SIZES.DICE_SIZE,
        diceSpacing: scaledSizes?.diceSpacing ?? SIZES.DICE_SPACING,
      });
    }
  }


  // ===========================================================================
  // GAME LOGIC
  // ===========================================================================

  private startGame(): void {
    // Initialize mode-specific mechanics
    this.initializeModeMechanics();

    // Transition to rolling state
    this.stateMachine.transition('rolling');

    // Initial roll
    this.diceManager.roll(true);

    // Apply mode mechanics after initial roll (e.g., curse die for Mode 2)
    this.time.delayedCall(SIZES.ROLL_DURATION_MS + 100, () => {
      this.modeMechanics.onAfterInitialRoll(this.diceManager);
      // Transition to selecting state after roll completes
      this.stateMachine.transition('selecting');
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
      this.log.log(`Playing warning: ${checkpoint}`);
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
      this.log.warn(`Cannot score locked category: ${categoryId}`);
      return;
    }

    // Score the category directly
    const points = this.scorecard.score(categoryId, dice);
    if (points < 0) return; // Category already filled or invalid

    this.log.log(`Scored ${points} in ${categoryId}`);

    // Deactivate Sixth Blessing if it was active (after scoring, not after rolling)
    if (this.diceManager.isSixthDieActive()) {
      const blessing = this.blessingManager.getActiveBlessing() as SixthBlessing | null;
      if (blessing) {
        blessing.deactivate();
      }
      this.diceManager.deactivateSixthDie();
    }

    // Celebration effect!
    this.showScoreEffectUI(points);

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

  private showScoreEffectUI(points: number): void {
    showScoreEffect({
      scene: this,
      centerX: this.diceCenterX,
      centerY: 290,
      points,
      onParticles: (x, y, count, color) => {
        this.particlePool?.emit(x, y, count, color);
      },
    });
  }

  // ===========================================================================
  // END GAME
  // ===========================================================================

  private endGame(completed: boolean): void {
    // Transition to game-over state (callbacks handle disabling interactions)
    this.stateMachine.transition('game-over');

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
    const progression = getProgression();
    const modeScore = this.scorecard.getTotal();

    // Complete the mode in the progression system
    const { passed, showBlessingChoice } = progression.completeMode(modeScore);
    const isRunComplete = progression.isRunComplete();
    const totalScore = progression.getTotalScore();

    // Save high scores
    const saveManager = getSave();
    const isNewHighScore = saveManager.recordModeScore(this.difficulty, modeScore);
    let isNewBestRun = false;
    if (isRunComplete) {
      isNewBestRun = saveManager.recordCompletedRun(totalScore);
    }
    if (isNewHighScore) {
      this.log.log(`New high score for ${this.difficulty}: ${modeScore}`);
    }
    if (isNewBestRun) {
      this.log.log(`New best run: ${totalScore}`);
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
    if (this.stateMachine.is('mode-transition')) {
      this.log.debug('startNextMode blocked: already transitioning');
      return;
    }
    this.stateMachine.transition('mode-transition');
    this.log.log('Starting transition to next mode');

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
    this.log.log('Showing blessing choice panel');

    new BlessingChoicePanel(this, {
      onSelect: (blessingId) => {
        this.log.log(`Player chose blessing: ${blessingId}`);
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
    // Use state machine - callbacks handle the actual pause logic
    const previousState = this.stateMachine.getState();
    if (this.stateMachine.transition('paused')) {
      this.log.log(`Game paused (was: ${previousState})`);
    }
  }

  private resumeGame(): void {
    if (!this.stateMachine.is('paused')) {
      this.log.debug('resumeGame blocked: not paused');
      return;
    }

    // Resume to previous state
    const previousState = this.stateMachine.getPreviousState();
    if (this.stateMachine.transition(previousState)) {
      this.log.log(`Game resumed to: ${previousState}`);
    }
  }

  private returnToMenu(): void {
    // Prevent double-transitions
    if (this.stateMachine.is('mode-transition')) {
      this.log.debug('returnToMenu blocked: already transitioning');
      return;
    }
    this.stateMachine.transition('mode-transition');
    this.log.log('Returning to menu');

    // Hide pause menu if visible
    if (this.pauseMenu?.isVisible()) {
      this.pauseMenu.hide();
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

  protected onShutdown(): void {
    this.log.log('shutdown - cleaning up');

    // Remove resize listener (via BaseScene helper)
    this.removeResizeListener();

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

    // Cleanup state machine
    if (this.stateMachine) {
      this.stateMachine.destroy();
    }

    // Unregister scene-scoped services (keep global services like save, progression)
    Services.unregister('scorecard');
    Services.unregister('events');
    Services.unregister('stateMachine');
    Services.unregister('diceManager');

    // Remove event listeners explicitly before destroying emitter
    if (this.gameEvents) {
      if (this.boundOnExpansionEnable) {
        this.gameEvents.off('blessing:expansion:enable', this.boundOnExpansionEnable);
        this.boundOnExpansionEnable = null;
      }
      if (this.boundOnScoreCategory) {
        this.gameEvents.off('score:category', this.boundOnScoreCategory);
        this.boundOnScoreCategory = null;
      }
      if (this.boundOnMenuRequested) {
        this.gameEvents.off('ui:menuRequested', this.boundOnMenuRequested);
        this.boundOnMenuRequested = null;
      }
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

    if (this.blessingIntegration) {
      this.blessingIntegration.destroy();
      this.blessingIntegration = null;
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
