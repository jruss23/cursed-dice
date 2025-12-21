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
  PALETTE,
  COLORS,
} from '@/config';
import { resetGameProgression } from '@/systems/game-progression';
import { resetBlessingManager } from '@/systems/blessings';
import { createLogger } from '@/systems/logger';
import { getSaveManager } from '@/systems/save-manager';
import { DifficultyButton, FlickeringTitle, SpookyBackground } from '@/ui/menu';

const log = createLogger('MenuScene');

export class MenuScene extends Phaser.Scene {
  private menuMusic: Phaser.Sound.BaseSound | null = null;
  private difficultyButtons: DifficultyButton[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  preload(): void {
    log.log('Preloading menu music...');
    this.load.audio('menu-music', 'sounds/menu.mp3');

    this.load.on('filecomplete-audio-menu-music', () => {
      log.log('Menu music loaded successfully');
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      log.error('Failed to load:', file.key, file.url);
    });
  }

  create(): void {
    log.log('create() called');

    // Register shutdown handler
    this.events.once('shutdown', this.onShutdown, this);

    // Load and play menu music
    const playMenuMusic = () => {
      if (this.cache.audio.exists('menu-music')) {
        this.menuMusic = this.sound.add('menu-music', { loop: true, volume: 0.4 });
        this.menuMusic.play();
      }
    };

    if (!this.cache.audio.exists('menu-music')) {
      this.load.audio('menu-music', 'sounds/menu.mp3');
      this.load.once('complete', playMenuMusic);
      this.load.start();
    } else {
      playMenuMusic();
    }

    // Handle locked audio context
    if (this.sound.locked) {
      this.sound.once('unlocked', () => {
        if (this.menuMusic && !this.menuMusic.isPlaying) {
          this.menuMusic.play();
        }
      });
    }

    const { width, height } = this.cameras.main;

    // All background effects (fog, skulls, dice, eyes, candles, wisps)
    new SpookyBackground(this);

    // "MAIN MENU" header at the very top
    const mainMenuLabel = this.createText(width / 2, 25, 'MAIN MENU', {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: '#666677',
      fontStyle: 'bold',
    });
    mainMenuLabel.setOrigin(0.5, 0.5);
    mainMenuLabel.setAlpha(0.6);

    // Flickering title
    new FlickeringTitle(this, width / 2);

    // Subtitle with creepy effect
    const subtitle = this.createText(width / 2, 145, 'Beat the clock. Break the curse.', {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: '#aa88bb',
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
    const selectGlow = this.createText(width / 2, 200, 'CHOOSE YOUR FATE', {
      fontSize: FONTS.SIZE_SUBHEADING,
      fontFamily: FONTS.FAMILY,
      color: '#440066',
      fontStyle: 'bold',
    });
    selectGlow.setOrigin(0.5, 0.5);
    selectGlow.setAlpha(0.5);
    selectGlow.setBlendMode(Phaser.BlendModes.ADD);

    const selectText = this.createText(width / 2, 200, 'CHOOSE YOUR FATE', {
      fontSize: FONTS.SIZE_SUBHEADING,
      fontFamily: FONTS.FAMILY,
      color: '#aa66cc',
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
    const buttonStartY = 270;
    const buttonSpacing = 95;

    this.difficultyButtons = [];
    DIFFICULTY_LIST.forEach((diffKey, index) => {
      const config = DIFFICULTIES[diffKey];
      const button = new DifficultyButton(
        this,
        width / 2,
        buttonStartY + index * buttonSpacing,
        config,
        index,
        { onClick: (cfg) => this.startGame(cfg.key) }
      );
      this.difficultyButtons.push(button);
    });

    // High Scores Panel (bottom-left)
    this.createHighScoresPanel(20, height - 180);

    // Mode info at bottom - more visible with glow
    const modeInfoGlow = this.createText(
      width / 2,
      height - 70,
      '4 Curses await... Score 250+ to survive each',
      {
        fontSize: FONTS.SIZE_BODY,
        fontFamily: FONTS.FAMILY,
        color: '#6622aa',
      }
    );
    modeInfoGlow.setOrigin(0.5, 0.5);
    modeInfoGlow.setAlpha(0.4);
    modeInfoGlow.setBlendMode(Phaser.BlendModes.ADD);

    const modeInfo = this.createText(
      width / 2,
      height - 70,
      '4 Curses await... Score 250+ to survive each',
      {
        fontSize: FONTS.SIZE_BODY,
        fontFamily: FONTS.FAMILY,
        color: '#bb88dd',
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

    // Version
    const credit = this.createText(width / 2, height - 35, 'v1.0', {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: '#555566',
    });
    credit.setOrigin(0.5, 0.5);

    // Pulsing vignette effect
    this.createPulsingVignette(width, height);

    // Fade in
    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

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

  private createPulsingVignette(width: number, height: number): void {
    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 1);

    // Create vignette around edges
    const thickness = 100;

    // Top
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.8, 0.8, 0, 0);
    vignette.fillRect(0, 0, width, thickness);

    // Bottom
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.8, 0.8);
    vignette.fillRect(0, height - thickness, width, thickness);

    // Corners with radial darkness
    const cornerGraphics = this.add.graphics();
    cornerGraphics.fillStyle(0x000000, 0.5);
    cornerGraphics.fillCircle(0, 0, 250);
    cornerGraphics.fillCircle(width, 0, 250);
    cornerGraphics.fillCircle(0, height, 250);
    cornerGraphics.fillCircle(width, height, 250);

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

  private createHighScoresPanel(x: number, y: number): void {
    const saveManager = getSaveManager();
    const highScores = saveManager.getHighScores();

    const hasData = highScores.bestRunTotal > 0 ||
      highScores.byDifficulty.chill > 0 ||
      highScores.byDifficulty.normal > 0 ||
      highScores.byDifficulty.intense > 0;

    const panelWidth = 170;
    const panelHeight = hasData ? 155 : 70;
    const panelDepth = 100; // Ensure panel renders above vignette and background elements
    const centerX = x + panelWidth / 2;
    const centerY = y + panelHeight / 2;

    // Outer glow (matches difficulty button style)
    const outerGlow = this.add.rectangle(centerX, centerY, panelWidth + 16, panelHeight + 16, 0x000000, 0);
    outerGlow.setStrokeStyle(6, PALETTE.purple[500], 0.15);
    outerGlow.setDepth(panelDepth);

    // Background shadow
    const bgShadow = this.add.rectangle(centerX + 3, centerY + 3, panelWidth, panelHeight, PALETTE.neutral[900], 0.5);
    bgShadow.setDepth(panelDepth);

    // Main background
    const bg = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, PALETTE.purple[900], 0.95);
    bg.setStrokeStyle(2, PALETTE.purple[500], 0.7);
    bg.setDepth(panelDepth);

    // Corner accents (matching difficulty button style)
    const cornerSize = 10;
    const corners = [
      { cx: x + 5, cy: y + 5, ax: 1, ay: 1 },           // top-left
      { cx: x + panelWidth - 5, cy: y + 5, ax: -1, ay: 1 },  // top-right
      { cx: x + panelWidth - 5, cy: y + panelHeight - 5, ax: -1, ay: -1 }, // bottom-right
      { cx: x + 5, cy: y + panelHeight - 5, ax: 1, ay: -1 }, // bottom-left
    ];

    corners.forEach(corner => {
      const accent = this.add.graphics();
      accent.lineStyle(2, PALETTE.purple[400], 0.6);
      accent.beginPath();
      accent.moveTo(corner.cx, corner.cy + corner.ay * cornerSize);
      accent.lineTo(corner.cx, corner.cy);
      accent.lineTo(corner.cx + corner.ax * cornerSize, corner.cy);
      accent.strokePath();
      accent.setDepth(panelDepth + 1);
    });

    // Header
    const header = this.createText(centerX, y + 18, 'HIGH SCORES', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_ACCENT,
      fontStyle: 'bold',
    });
    header.setOrigin(0.5, 0.5);
    header.setDepth(panelDepth + 1);

    // Show "No scores yet" if empty
    if (!hasData) {
      const emptyText = this.createText(centerX, y + 45, 'No scores yet', {
        fontSize: FONTS.SIZE_TINY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_MUTED,
      });
      emptyText.setOrigin(0.5, 0.5);
      emptyText.setDepth(panelDepth + 1);
      return;
    }

    let currentY = y + 42;

    // Best Run section (if any completed runs)
    if (highScores.bestRunTotal > 0) {
      // Section header
      const fullRunHeader = this.createText(x + 10, currentY, '4-Curse Run', {
        fontSize: FONTS.SIZE_TINY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_MUTED,
      });
      fullRunHeader.setOrigin(0, 0.5);
      fullRunHeader.setDepth(panelDepth + 1);

      currentY += 16;

      const bestRunLabel = this.createText(x + 14, currentY, 'Best Total:', {
        fontSize: FONTS.SIZE_TINY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SECONDARY,
      });
      bestRunLabel.setOrigin(0, 0.5);
      bestRunLabel.setDepth(panelDepth + 1);

      const bestRunValue = this.createText(x + panelWidth - 10, currentY, highScores.bestRunTotal.toString(), {
        fontSize: FONTS.SIZE_TINY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_WARNING,
        fontStyle: 'bold',
      });
      bestRunValue.setOrigin(1, 0.5);
      bestRunValue.setDepth(panelDepth + 1);

      currentY += 15;

      // Runs completed
      const runsLabel = this.createText(x + 14, currentY, 'Completed:', {
        fontSize: FONTS.SIZE_TINY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SECONDARY,
      });
      runsLabel.setOrigin(0, 0.5);
      runsLabel.setDepth(panelDepth + 1);

      const runsValue = this.createText(x + panelWidth - 10, currentY, `${highScores.runsCompleted}x`, {
        fontSize: FONTS.SIZE_TINY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SECONDARY,
      });
      runsValue.setOrigin(1, 0.5);
      runsValue.setDepth(panelDepth + 1);

      currentY += 20;
    }

    // Per-difficulty high scores (single curse best)
    const hasDiffScores = highScores.byDifficulty.chill > 0 ||
      highScores.byDifficulty.normal > 0 ||
      highScores.byDifficulty.intense > 0;

    if (hasDiffScores) {
      // Section header
      const curseHeader = this.createText(x + 10, currentY, 'Best Single Curse', {
        fontSize: FONTS.SIZE_TINY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_MUTED,
      });
      curseHeader.setOrigin(0, 0.5);
      curseHeader.setDepth(panelDepth + 1);

      currentY += 16;

      const difficulties: { key: Difficulty; label: string; color: string }[] = [
        { key: 'chill', label: 'Chill', color: DIFFICULTIES.chill.color },
        { key: 'normal', label: 'Normal', color: DIFFICULTIES.normal.color },
        { key: 'intense', label: 'Intense', color: DIFFICULTIES.intense.color },
      ];

      for (const diff of difficulties) {
        const score = highScores.byDifficulty[diff.key];
        if (score > 0) {
          const diffLabel = this.createText(x + 14, currentY, diff.label + ':', {
            fontSize: FONTS.SIZE_TINY,
            fontFamily: FONTS.FAMILY,
            color: diff.color,
          });
          diffLabel.setOrigin(0, 0.5);
          diffLabel.setDepth(panelDepth + 1);

          const diffValue = this.createText(x + panelWidth - 10, currentY, score.toString(), {
            fontSize: FONTS.SIZE_TINY,
            fontFamily: FONTS.FAMILY,
            color: COLORS.TEXT_PRIMARY,
          });
          diffValue.setOrigin(1, 0.5);
          diffValue.setDepth(panelDepth + 1);

          currentY += 15;
        }
      }
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

  private onShutdown(): void {
    log.log('shutdown - cleaning up');
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
