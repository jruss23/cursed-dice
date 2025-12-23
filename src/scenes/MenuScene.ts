/**
 * Menu Scene
 * Spooky cursed theme with difficulty selection
 */

import Phaser from 'phaser';
import {
  type Difficulty,
  DIFFICULTIES,
  DIFFICULTY_LIST,
  FONTS,
  SIZES,
  COLORS,
  getViewportMetrics,
} from '@/config';
import { resetGameProgression, debugSetMode, type GameMode } from '@/systems/game-progression';
import { resetBlessingManager, debugSetBlessing } from '@/systems/blessings';
import { createLogger } from '@/systems/logger';
import { DifficultyButton, FlickeringTitle, HighScoresPanel, SpookyBackground } from '@/ui/menu';
import { createText } from '@/ui/ui-utils';

const log = createLogger('MenuScene');

interface DebugSkipData {
  debugSkipToMode?: number;
  debugEnableExpansion?: boolean;
}

export class MenuScene extends Phaser.Scene {
  private menuMusic: Phaser.Sound.BaseSound | null = null;
  private difficultyButtons: DifficultyButton[] = [];
  private debugSkipData: DebugSkipData | null = null;
  private boundOnAudioUnlocked: (() => void) | null = null;

  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data?: DebugSkipData): void {
    // Store debug skip data if provided
    if (data?.debugSkipToMode) {
      this.debugSkipData = data;
      log.debug('Received debug skip data:', data);
    } else {
      this.debugSkipData = null;
    }
  }

  preload(): void {
    log.log('Preloading menu music...');
    this.load.audio('menu-music', 'sounds/menu.ogg');

    this.load.on('filecomplete-audio-menu-music', () => {
      log.log('Menu music loaded successfully');
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      log.error('Failed to load:', file.key, file.url);
    });
  }

  create(): void {
    log.log('create() called');

    // Handle debug skip to mode
    if (this.debugSkipData?.debugSkipToMode) {
      this.debugStartGame(this.debugSkipData);
      return;
    }

    // Register shutdown handler
    this.events.once('shutdown', this.onShutdown, this);

    // Load and play menu music
    const playMenuMusic = () => {
      if (this.cache.audio.exists('menu-music') && !this.menuMusic) {
        this.menuMusic = this.sound.add('menu-music', { loop: true, volume: 0.4 });

        // Only play if not locked, otherwise wait for unlock
        if (!this.sound.locked) {
          this.menuMusic.play();
          log.log('Menu music started');
          // Start background preloading gameplay tracks
          this.preloadGameplayTracks();
        }
      }
    };

    // Handle locked audio context - set up listener FIRST
    if (this.sound.locked) {
      log.log('Audio context locked, waiting for user interaction...');
      this.boundOnAudioUnlocked = () => {
        log.log('Audio context unlocked');
        if (this.menuMusic && !this.menuMusic.isPlaying) {
          this.menuMusic.play();
          log.log('Menu music started after unlock');
          // Start background preloading gameplay tracks
          this.preloadGameplayTracks();
        }
      };
      this.sound.once('unlocked', this.boundOnAudioUnlocked);
    }

    if (!this.cache.audio.exists('menu-music')) {
      this.load.audio('menu-music', 'sounds/menu.ogg');
      this.load.once('complete', playMenuMusic);
      this.load.start();
    } else {
      playMenuMusic();
    }

    const { width, height } = this.cameras.main;
    const metrics = getViewportMetrics(this);
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

    // Difficulty selection header with spooky styling
    const selectY = isMobile ? 170 : 200;
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

    // Create spooky difficulty buttons - more spacing on desktop
    const buttonStartY = isMobile ? 235 : 270;
    const buttonSpacing = isMobile ? 82 : 110;

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
      new HighScoresPanel(this, { x: (width - 170) / 2, y: lastButtonY + 70 });
    } else {
      new HighScoresPanel(this, { x: 20, y: height - 210 });
    }

    // Mode info - positioned just below last button
    const lastButtonY = buttonStartY + buttonSpacing * 2;
    const modeInfoY = isMobile
      ? lastButtonY + 53  // Below last button, above high scores
      : lastButtonY + 68; // Right under buttons on desktop
    const modeInfoSize = isMobile ? FONTS.SIZE_LABEL : FONTS.SIZE_BODY;
    const modeInfoText = isMobile ? 'Score 250+ each curse' : '4 Curses await... Score 250+ to survive each';

    const modeInfoGlow = createText(this,
      width / 2,
      modeInfoY,
      modeInfoText,
      {
        fontSize: modeInfoSize,
        fontFamily: FONTS.FAMILY,
        color: COLORS.MENU_INFO_GLOW,
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
    const credit = createText(this, width / 2, versionY, 'v1.0.0', {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.MENU_VERSION,
    });
    credit.setOrigin(0.5, 0.5);

    // Pulsing vignette effect (disabled on mobile)
    this.createPulsingVignette(width, height, isMobile);

    // Fade in
    this.cameras.main.fadeIn(800, 0, 0, 0);
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

    log.debug(`DEBUG: Starting game at mode ${mode}, expansion=${data.debugEnableExpansion}`);

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
    const tracks = ['sounds/chill.ogg', 'sounds/normal.ogg', 'sounds/intense.ogg'];

    log.log('Background preloading gameplay tracks...');

    tracks.forEach((track, index) => {
      const key = `music-${track.split('/')[1].replace('.ogg', '')}`;

      // Skip if already cached
      if (this.cache.audio.exists(key)) {
        log.log(`Already cached: ${key}`);
        return;
      }

      // Stagger loads to not compete with menu music
      this.time.delayedCall(500 + index * 1000, () => {
        if (this.scene.isActive()) {
          this.load.audio(key, track);
          this.load.start();
          log.log(`Preloading: ${key}`);
        }
      });
    });
  }

  private onShutdown(): void {
    log.log('shutdown - cleaning up');

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
  }
}
