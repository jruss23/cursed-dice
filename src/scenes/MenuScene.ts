/**
 * Menu Scene
 * Spooky cursed theme with difficulty selection
 * Extends BaseScene for common lifecycle helpers
 */

import {
  type Difficulty,
  DIFFICULTIES,
  DIFFICULTY_LIST,
  FONTS,
  SIZES,
  COLORS,
  PALETTE,
  FLASH,
  ALPHA,
  TIMING,
} from '@/config';
import { version } from '../../package.json';
import { resetGameProgression, debugSetMode, type GameMode } from '@/systems/game-progression';
import { resetBlessingManager, debugSetBlessing } from '@/systems/blessings';
import { isMusicEnabled } from '@/systems/music-manager';
import { getMenuSizing, type ViewportSizing } from '@/systems/responsive';
import { DifficultyButton, FlickeringTitle, HighScoresPanel, MenuSettingsPanel, SpookyBackground } from '@/ui/menu';
import { createText } from '@/ui/ui-utils';
import { BaseScene } from './BaseScene';

interface DebugSkipData {
  debugSkipToMode?: number;
  debugEnableExpansion?: boolean;
}

export class MenuScene extends BaseScene {
  private menuMusic: Phaser.Sound.BaseSound | null = null;
  private difficultyButtons: DifficultyButton[] = [];
  private settingsPanel: MenuSettingsPanel | null = null;
  private debugSkipData: DebugSkipData | null = null;
  private boundOnAudioUnlocked: (() => void) | null = null;

  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data?: DebugSkipData): void {
    // Store debug skip data if provided
    if (data?.debugSkipToMode) {
      this.debugSkipData = data;
      this.log.debug('Received debug skip data:', data);
    } else {
      this.debugSkipData = null;
    }
  }

  preload(): void {
    this.log.log('Preloading menu music...');
    this.load.audio('menu-music', ['sounds/menu.mp3', 'sounds/menu.ogg']);

    this.load.on('filecomplete-audio-menu-music', () => {
      this.log.log('Menu music loaded successfully');
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.log.error('Failed to load:', file.key, file.url);
    });
  }

  create(): void {
    this.log.log('create() called');

    // Handle debug skip to mode (skip fadeIn for debug)
    if (this.debugSkipData?.debugSkipToMode) {
      this.debugStartGame(this.debugSkipData);
      return;
    }

    // CRITICAL: Create transition overlay FIRST before anything else renders
    // This prevents flash during scene transitions
    this.fadeIn(800);

    // Reset canvas border to purple (in case returning from victory gold)
    const canvas = document.querySelector('canvas');
    if (canvas) (canvas as HTMLCanvasElement).style.borderColor = COLORS.CANVAS_BORDER;

    // Register shutdown handler (from BaseScene)
    this.registerShutdown();

    // Load and play menu music
    const playMenuMusic = () => {
      if (this.cache.audio.exists('menu-music') && !this.menuMusic) {
        // Use volume 0 if music disabled, so it can be unmuted later
        const vol = isMusicEnabled() ? 0.4 : 0;
        this.menuMusic = this.sound.add('menu-music', { loop: true, volume: vol });

        // Only play if not locked, otherwise wait for unlock
        if (!this.sound.locked) {
          this.menuMusic.play();
          this.log.log(`Menu music started (vol=${vol})`);
          // Start background preloading gameplay tracks
          this.preloadGameplayTracks();
        }
      }
    };

    // Handle locked audio context - set up listener FIRST
    if (this.sound.locked) {
      this.log.log('Audio context locked, waiting for user interaction...');
      this.boundOnAudioUnlocked = () => {
        this.log.log('Audio context unlocked');
        if (this.menuMusic && !this.menuMusic.isPlaying) {
          this.menuMusic.play();
          this.log.log('Menu music started after unlock');
          // Start background preloading gameplay tracks
          this.preloadGameplayTracks();
        }
      };
      this.sound.once('unlocked', this.boundOnAudioUnlocked);
    }

    if (!this.cache.audio.exists('menu-music')) {
      this.load.audio('menu-music', ['sounds/menu.mp3', 'sounds/menu.ogg']);
      this.load.once('complete', playMenuMusic);
      this.load.start();
    } else {
      playMenuMusic();
    }

    const { width, height } = this.cameras.main;

    // ==========================================================================
    // VIEWPORT-RELATIVE SIZING (EXPAND Mode)
    // All positions and sizes calculated from actual viewport dimensions
    // ==========================================================================
    const sizing = getMenuSizing(this);

    // All background effects (fog, skulls, dice, eyes, candles, wisps)
    new SpookyBackground(this);

    // Flickering title with viewport-relative sizing
    new FlickeringTitle(this, width / 2, sizing.titleY, sizing);

    // Subtitle with creepy effect
    const subtitle = createText(this, width / 2, sizing.subtitleY, 'Beat the clock. Break the curse.', {
      fontSize: sizing.subtitleFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.MENU_SUBTITLE,
      fontStyle: 'bold',
    });
    subtitle.setOrigin(0.5, 0.5);

    // Subtle flicker on subtitle
    this.tweens.add({
      targets: subtitle,
      alpha: ALPHA.OVERLAY_MEDIUM,
      duration: TIMING.QUICK,
      yoyo: true,
      repeat: -1,
      repeatDelay: Phaser.Math.Between(TIMING.PULSE_LONG, TIMING.PULSE_LONG * 2),
    });

    // "Learn to Play" button with viewport-relative sizing
    this.createLearnToPlayButton(width, sizing);

    // Difficulty selection header with spooky styling
    const selectGlow = createText(this, width / 2, sizing.headerY, 'CHOOSE YOUR FATE', {
      fontSize: sizing.headerFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.MENU_HEADER_GLOW,
      fontStyle: 'bold',
    });
    selectGlow.setOrigin(0.5, 0.5);
    selectGlow.setAlpha(ALPHA.DISABLED);
    selectGlow.setBlendMode(Phaser.BlendModes.ADD);

    const selectText = createText(this, width / 2, sizing.headerY, 'CHOOSE YOUR FATE', {
      fontSize: sizing.headerFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.MENU_HEADER,
      fontStyle: 'bold',
    });
    selectText.setOrigin(0.5, 0.5);

    // Pulse the header
    this.tweens.add({
      targets: [selectText, selectGlow],
      alpha: { from: 1, to: ALPHA.OVERLAY_MEDIUM },
      duration: TIMING.PULSE,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Create spooky difficulty buttons with viewport-relative sizing
    this.difficultyButtons = [];
    DIFFICULTY_LIST.forEach((diffKey, index) => {
      const config = DIFFICULTIES[diffKey];
      const button = new DifficultyButton(
        this,
        width / 2,
        sizing.buttonStartY + index * sizing.buttonSpacing,
        config,
        index,
        { onClick: (cfg) => this.startGame(cfg.key) },
        { sizing }
      );
      this.difficultyButtons.push(button);
    });

    // High Scores Panel - centered, using viewport-relative sizing
    new HighScoresPanel(this, {
      x: (width - sizing.highScoresPanelWidth) / 2,
      y: sizing.highScoresY,
      sizing,
    });

    // Settings cog button - bottom right corner with viewport-relative padding
    this.settingsPanel = new MenuSettingsPanel(this, {
      x: width - sizing.padding - 16,
      y: height - sizing.padding - 16,
      onMusicToggle: (enabled) => this.onMusicToggle(enabled),
      sizing,
    });

    // Version - centered, below title
    const credit = createText(this, width / 2, sizing.versionY, `v${version}`, {
      fontSize: sizing.versionFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.MENU_VERSION,
    });
    credit.setOrigin(0.5, 0.5);

    // Skip vignette on mobile (too heavy)
  }

  private createLearnToPlayButton(width: number, sizing: ViewportSizing): void {
    const btnWidth = sizing.smallButtonWidth;
    const btnHeight = sizing.smallButtonHeight;

    const container = this.add.container(width / 2, sizing.learnBtnY);
    container.setDepth(50);

    // Outer glow for emphasis
    const glow = this.add.rectangle(0, 0, btnWidth + 8, btnHeight + 8, PALETTE.menu.playGlow, ALPHA.GLOW_MEDIUM);
    container.add(glow);

    // Background with green accent (stands out from purple theme)
    const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, PALETTE.menu.playBg, ALPHA.PANEL_SOLID);
    bg.setStrokeStyle(2, PALETTE.menu.playBorder, ALPHA.BORDER_SOLID);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    // Text (centered) with viewport-relative font size
    const text = createText(this, 0, 0, 'LEARN TO PLAY', {
      fontSize: sizing.smallFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);
    container.add(text);

    // Subtle pulse animation to draw attention
    this.tweens.add({
      targets: glow,
      alpha: { from: ALPHA.GLOW_MEDIUM, to: ALPHA.GLOW_HOVER },
      scaleX: { from: 1, to: 1.05 },
      scaleY: { from: 1, to: 1.05 },
      duration: TIMING.EXTENDED,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(PALETTE.menu.playBgHover, ALPHA.PANEL_OPAQUE);
      bg.setStrokeStyle(2, PALETTE.menu.playBorderHover, 1);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(PALETTE.menu.playBg, ALPHA.PANEL_SOLID);
      bg.setStrokeStyle(2, PALETTE.menu.playBorder, ALPHA.BORDER_SOLID);
    });

    bg.on('pointerdown', () => {
      this.cameras.main.flash(TIMING.FAST, FLASH.GREEN.r, FLASH.GREEN.g, FLASH.GREEN.b);
      this.log.log('Starting tutorial');
      this.startTutorial();
    });
  }

  private startTutorial(): void {
    // Fade out menu music
    if (this.menuMusic) {
      this.tweens.add({
        targets: this.menuMusic,
        volume: 0,
        duration: SIZES.FADE_DURATION_MS,
        onComplete: () => {
          this.menuMusic?.stop();
        },
      });
    }

    // Transition to tutorial (using BaseScene helper)
    this.transitionTo('TutorialScene');
  }

  /**
   * Handle music toggle from settings panel
   */
  private onMusicToggle(enabled: boolean): void {
    if (this.menuMusic && 'setVolume' in this.menuMusic) {
      (this.menuMusic as Phaser.Sound.WebAudioSound).setVolume(enabled ? 0.4 : 0);
      this.log.log(`Menu music ${enabled ? 'unmuted' : 'muted'}`);
    }
  }

  private startGame(difficulty: Difficulty): void {
    // Reset game progression and blessings for a fresh run
    resetGameProgression();
    resetBlessingManager();

    // Fade out menu music
    if (this.menuMusic) {
      this.tweens.add({
        targets: this.menuMusic,
        volume: 0,
        duration: SIZES.FADE_DURATION_MS,
        onComplete: () => {
          this.menuMusic?.stop();
        },
      });
    }

    // Spooky transition effect
    this.cameras.main.flash(TIMING.NORMAL, 100, 0, 100);
    this.cameras.main.fadeOut(SIZES.FADE_DURATION_MS + TIMING.NORMAL, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameplayScene', { difficulty });
    });
  }

  /**
   * DEBUG: Start game directly at a specific mode
   * Used by debug skip-to-mode feature
   */
  private debugStartGame(data: DebugSkipData): void {
    const mode = data.debugSkipToMode as GameMode;

    this.log.debug(`DEBUG: Starting game at mode ${mode}, expansion=${data.debugEnableExpansion}`);

    // Reset and set up progression
    resetGameProgression();
    resetBlessingManager();

    // Set the target mode
    debugSetMode(mode);

    // Enable expansion blessing for modes 2-4
    if (data.debugEnableExpansion) {
      debugSetBlessing('abundance');
    }

    // Start game immediately without fanfare
    this.scene.start('GameplayScene', { difficulty: 'normal' });
  }

  /**
   * Background preload gameplay tracks while user is on menu
   * By the time they click a difficulty, tracks are likely cached
   */
  private preloadGameplayTracks(): void {
    // Provide both OGG and MP3 for browser compatibility
    const tracks = [
      // MP3 first for web compatibility, OGG as fallback for Capacitor
      { key: 'music-chill', files: ['sounds/chill.mp3', 'sounds/chill.ogg'] },
      { key: 'music-normal', files: ['sounds/normal.mp3', 'sounds/normal.ogg'] },
      { key: 'music-intense', files: ['sounds/intense.mp3', 'sounds/intense.ogg'] },
    ];

    this.log.log('Background preloading gameplay tracks...');

    tracks.forEach((track, index) => {
      // Skip if already cached
      if (this.cache.audio.exists(track.key)) {
        this.log.log(`Already cached: ${track.key}`);
        return;
      }

      // Stagger loads to not compete with menu music
      this.time.delayedCall(500 + index * 1000, () => {
        if (this.scene.isActive()) {
          this.load.audio(track.key, track.files);
          this.load.start();
          this.log.log(`Preloading: ${track.key}`);
        }
      });
    });
  }

  protected onShutdown(): void {
    this.log.log('shutdown - cleaning up');

    // Remove global sound manager listener (if audio never unlocked)
    if (this.boundOnAudioUnlocked) {
      this.sound.off('unlocked', this.boundOnAudioUnlocked);
      this.boundOnAudioUnlocked = null;
    }

    if (this.menuMusic) {
      this.menuMusic.stop();
      this.menuMusic.destroy();
      this.menuMusic = null;
    }

    // Cleanup difficulty buttons
    this.difficultyButtons.forEach(btn => btn.destroy());
    this.difficultyButtons = [];

    // Cleanup settings panel
    this.settingsPanel?.destroy();
    this.settingsPanel = null;

    // Call base cleanup
    this.cleanup();
  }
}
