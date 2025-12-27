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
  FLASH,
} from '@/config';
import { version } from '../../package.json';
import { resetGameProgression, debugSetMode, type GameMode } from '@/systems/game-progression';
import { resetBlessingManager, debugSetBlessing } from '@/systems/blessings';
import { isMusicEnabled } from '@/systems/music-manager';
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
    const metrics = this.getMetrics();
    const isMobile = metrics.isMobile;

    // Font scaling for mobile - keep readable
    const subtitleSize = isMobile ? FONTS.SIZE_BUTTON : FONTS.SIZE_BODY;
    const headerSize = isMobile ? FONTS.SIZE_BODY : FONTS.SIZE_SUBHEADING;

    // All background effects (fog, skulls, dice, eyes, candles, wisps)
    new SpookyBackground(this);

    // Flickering title - position adjusted for mobile
    const titleY = isMobile ? 65 : undefined; // FlickeringTitle uses default 85 on desktop
    new FlickeringTitle(this, width / 2, titleY);

    // Subtitle with creepy effect
    const subtitleY = isMobile ? 125 : 145;
    const subtitle = createText(this,width / 2, subtitleY, 'Beat the clock. Break the curse.', {
      fontSize: subtitleSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.MENU_SUBTITLE,
      fontStyle: 'bold',
    });
    subtitle.setOrigin(0.5, 0.5);

    // Subtle flicker on subtitle
    this.tweens.add({
      targets: subtitle,
      alpha: 0.7,
      duration: 100,
      yoyo: true,
      repeat: -1,
      repeatDelay: Phaser.Math.Between(3000, 6000),
    });

    // "Learn to Play" button - above the difficulty section
    const learnBtnY = isMobile ? 168 : 200;
    this.createLearnToPlayButton(width, learnBtnY, isMobile);

    // Difficulty selection header with spooky styling
    const selectY = isMobile ? 215 : 255;
    const selectGlow = createText(this,width / 2, selectY, 'CHOOSE YOUR FATE', {
      fontSize: headerSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.MENU_HEADER_GLOW,
      fontStyle: 'bold',
    });
    selectGlow.setOrigin(0.5, 0.5);
    selectGlow.setAlpha(0.5);
    selectGlow.setBlendMode(Phaser.BlendModes.ADD);

    const selectText = createText(this,width / 2, selectY, 'CHOOSE YOUR FATE', {
      fontSize: headerSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.MENU_HEADER,
      fontStyle: 'bold',
    });
    selectText.setOrigin(0.5, 0.5);

    // Pulse the header
    this.tweens.add({
      targets: [selectText, selectGlow],
      alpha: { from: 1, to: 0.7 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Create spooky difficulty buttons
    const buttonStartY = isMobile ? 265 : 310;
    const buttonSpacing = isMobile ? 68 : 100;

    this.difficultyButtons = [];
    DIFFICULTY_LIST.forEach((diffKey, index) => {
      const config = DIFFICULTIES[diffKey];
      const button = new DifficultyButton(
        this,
        width / 2,
        buttonStartY + index * buttonSpacing,
        config,
        index,
        { onClick: (cfg) => this.startGame(cfg.key) },
        { metrics }
      );
      this.difficultyButtons.push(button);
    });

    // High Scores Panel - centered on mobile, left-aligned on desktop
    if (isMobile) {
      const lastButtonY = buttonStartY + buttonSpacing * 2;
      new HighScoresPanel(this, { x: (width - 170) / 2, y: lastButtonY + 65 });
    } else {
      new HighScoresPanel(this, { x: 20, y: height - 210 });
    }

    // Settings cog button - bottom right corner
    this.settingsPanel = new MenuSettingsPanel(this, {
      x: width - 32,
      y: height - 32,
      onMusicToggle: (enabled) => this.onMusicToggle(enabled),
    });

    // Mode info - positioned just below last button
    const lastButtonY = buttonStartY + buttonSpacing * 2;
    const modeInfoY = isMobile
      ? lastButtonY + 50  // Below last button, above high scores
      : lastButtonY + 60; // Right under buttons on desktop
    const modeInfoSize = isMobile ? FONTS.SIZE_LABEL : FONTS.SIZE_BODY;
    const modeInfoText = isMobile ? 'Score 250+ per seal' : '4 Seals guard the curse. Break them all.';

    const modeInfoGlow = createText(this,
      width / 2,
      modeInfoY,
      modeInfoText,
      {
        fontSize: modeInfoSize,
        fontFamily: FONTS.FAMILY,
        color: COLORS.MENU_INFO_GLOW,
        fontStyle: 'bold',
      }
    );
    modeInfoGlow.setOrigin(0.5, 0.5);
    modeInfoGlow.setAlpha(0.4);
    modeInfoGlow.setBlendMode(Phaser.BlendModes.ADD);

    const modeInfo = createText(this,
      width / 2,
      modeInfoY,
      modeInfoText,
      {
        fontSize: modeInfoSize,
        fontFamily: FONTS.FAMILY,
        color: COLORS.MENU_INFO,
        fontStyle: 'bold',
      }
    );
    modeInfo.setOrigin(0.5, 0.5);

    // Gentle pulse instead of fading out too much
    this.tweens.add({
      targets: [modeInfo, modeInfoGlow],
      alpha: { from: 1, to: 0.75 },
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });


    // Version - centered, below title
    const versionY = isMobile ? 95 : 115;
    const credit = createText(this, width / 2, versionY, `v${version}`, {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.MENU_VERSION,
    });
    credit.setOrigin(0.5, 0.5);

    // Pulsing vignette effect (disabled on mobile)
    this.createPulsingVignette(width, height, isMobile);
  }

  private createLearnToPlayButton(width: number, y: number, isMobile: boolean): void {
    const btnWidth = isMobile ? 160 : 180;
    const btnHeight = isMobile ? 36 : 40;

    const container = this.add.container(width / 2, y);
    container.setDepth(50);

    // Outer glow for emphasis
    const glow = this.add.rectangle(0, 0, btnWidth + 8, btnHeight + 8, 0x4a9a4a, 0.15);
    container.add(glow);

    // Background with green accent (stands out from purple theme)
    const bg = this.add.rectangle(0, 0, btnWidth, btnHeight, 0x2a4a2a, 0.9);
    bg.setStrokeStyle(2, 0x4a9a4a, 0.8);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    // Text (centered)
    const text = createText(this, 0, 0, 'LEARN TO PLAY', {
      fontSize: isMobile ? FONTS.SIZE_SMALL : FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);
    container.add(text);

    // Subtle pulse animation to draw attention
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.15, to: 0.3 },
      scaleX: { from: 1, to: 1.05 },
      scaleY: { from: 1, to: 1.05 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(0x3a5a3a, 0.95);
      bg.setStrokeStyle(2, 0x6aba6a, 1);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x2a4a2a, 0.9);
      bg.setStrokeStyle(2, 0x4a9a4a, 0.8);
    });

    bg.on('pointerdown', () => {
      this.cameras.main.flash(150, FLASH.GREEN.r, FLASH.GREEN.g, FLASH.GREEN.b);
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

  private createPulsingVignette(width: number, height: number, isMobile: boolean): void {
    // Skip heavy vignette on mobile - too dark and covers content
    if (isMobile) {
      return;
    }

    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 1);

    // Create vignette around edges - scale with viewport
    const thickness = Math.min(100, height * 0.12);

    // Top
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.8, 0.8, 0, 0);
    vignette.fillRect(0, 0, width, thickness);

    // Bottom
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.8, 0.8);
    vignette.fillRect(0, height - thickness, width, thickness);

    // Corners with radial darkness - scale with viewport
    const cornerRadius = Math.min(250, Math.min(width, height) * 0.3);
    const cornerGraphics = this.add.graphics();
    cornerGraphics.fillStyle(0x000000, 0.5);
    cornerGraphics.fillCircle(0, 0, cornerRadius);
    cornerGraphics.fillCircle(width, 0, cornerRadius);
    cornerGraphics.fillCircle(0, height, cornerRadius);
    cornerGraphics.fillCircle(width, height, cornerRadius);

    // Pulse the vignette
    this.tweens.add({
      targets: [vignette, cornerGraphics],
      alpha: 0.7,
      duration: 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
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
    this.cameras.main.flash(200, 100, 0, 100);
    this.cameras.main.fadeOut(SIZES.FADE_DURATION_MS + 200, 0, 0, 0);

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
