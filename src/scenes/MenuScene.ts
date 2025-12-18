/**
 * Menu Scene
 * Difficulty selection before starting the game
 */

import Phaser from 'phaser';
import {
  type Difficulty,
  type DifficultyConfig,
  DIFFICULTIES,
  DIFFICULTY_LIST,
  COLORS,
  FONTS,
  SIZES,
} from '@/config';
import { resetGameProgression } from '@/systems/game-progression';

export class MenuScene extends Phaser.Scene {
  private menuMusic: Phaser.Sound.BaseSound | null = null;

  constructor() {
    super({ key: 'MenuScene' });
  }

  preload(): void {
    console.log('[MenuScene] Preloading menu music...');
    this.load.audio('menu-music', 'sounds/menu.mp3');

    this.load.on('filecomplete-audio-menu-music', () => {
      console.log('[MenuScene] Menu music loaded successfully');
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error('[MenuScene] Failed to load:', file.key, file.url);
    });
  }

  create(): void {
    console.log('[MenuScene] create() called');

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

    // Animated gradient background
    this.createAnimatedBackground(width, height);

    // Floating particles
    this.createFloatingParticles(width, height);

    // Title with glow effect
    const titleGlow = this.add.text(width / 2, 80, 'CURSED YAHTZEE', {
      fontSize: FONTS.SIZE_TITLE,
      fontFamily: FONTS.FAMILY,
      color: '#6633aa',
      fontStyle: 'bold',
    });
    titleGlow.setOrigin(0.5, 0.5);
    titleGlow.setResolution(window.devicePixelRatio * 2);
    titleGlow.setAlpha(0.5);
    titleGlow.setBlendMode(Phaser.BlendModes.ADD);

    const title = this.add.text(width / 2, 80, 'CURSED YAHTZEE', {
      fontSize: FONTS.SIZE_TITLE,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    title.setResolution(window.devicePixelRatio * 2);

    // Pulse the glow
    this.tweens.add({
      targets: titleGlow,
      alpha: 0.8,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    const subtitle = this.add.text(width / 2, 130, 'Beat the clock. Break the curse.', {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_MUTED,
    });
    subtitle.setOrigin(0.5, 0.5);
    subtitle.setResolution(window.devicePixelRatio * 2);

    // Animated dice icons
    this.createAnimatedDice(width);

    // Difficulty selection header
    const selectText = this.add.text(width / 2, 220, 'SELECT DIFFICULTY', {
      fontSize: FONTS.SIZE_SUBHEADING,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
      fontStyle: 'bold',
    });
    selectText.setOrigin(0.5, 0.5);
    selectText.setResolution(window.devicePixelRatio * 2);

    // Create difficulty buttons
    const buttonStartY = 290;
    const buttonSpacing = 100;

    DIFFICULTY_LIST.forEach((diffKey, index) => {
      const config = DIFFICULTIES[diffKey];
      this.createDifficultyButton(width / 2, buttonStartY + index * buttonSpacing, config);
    });

    // Mode info at bottom
    const modeInfo = this.add.text(
      width / 2,
      height - 70,
      '4 Modes • Score 250+ each to advance • Fail = Start Over',
      {
        fontSize: FONTS.SIZE_SMALL,
        fontFamily: FONTS.FAMILY,
        color: '#aa88cc',
      }
    );
    modeInfo.setOrigin(0.5, 0.5);
    modeInfo.setResolution(window.devicePixelRatio * 2);

    // Version
    const credit = this.add.text(width / 2, height - 30, 'v1.0 - Cursed Yahtzee', {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: '#444455',
    });
    credit.setOrigin(0.5, 0.5);
    credit.setResolution(window.devicePixelRatio * 2);

    // Fade in
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private createAnimatedBackground(width: number, height: number): void {
    // Dark gradient base
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a0a2a, 0x1a0a2a, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle moving gradient overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x2a1a4a, 0.1);
    overlay.fillCircle(width * 0.3, height * 0.3, 300);
    overlay.fillStyle(0x1a2a4a, 0.1);
    overlay.fillCircle(width * 0.7, height * 0.7, 250);

    this.tweens.add({
      targets: overlay,
      alpha: 0.3,
      duration: 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createFloatingParticles(width: number, height: number): void {
    // Create floating dice-like particles
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(50, width - 50);
      const y = Phaser.Math.Between(50, height - 50);
      const size = Phaser.Math.Between(8, 20);

      const particle = this.add.rectangle(x, y, size, size, 0x4a3a6a, 0.15);
      particle.setStrokeStyle(1, 0x6a4a8a, 0.2);
      particle.setAngle(Phaser.Math.Between(0, 45));

      // Float animation
      this.tweens.add({
        targets: particle,
        y: y + Phaser.Math.Between(-30, 30),
        x: x + Phaser.Math.Between(-20, 20),
        angle: particle.angle + Phaser.Math.Between(-15, 15),
        alpha: Phaser.Math.FloatBetween(0.1, 0.25),
        duration: Phaser.Math.Between(3000, 6000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  private createAnimatedDice(width: number): void {
    const dicePositions = [
      { x: width * 0.15, y: 160 },
      { x: width * 0.85, y: 160 },
    ];

    dicePositions.forEach((pos, i) => {
      const dice = this.add.container(pos.x, pos.y);

      const bg = this.add.rectangle(0, 0, 40, 40, 0x2a2a4a, 0.6);
      bg.setStrokeStyle(2, 0x4a4a6a);
      dice.add(bg);

      // Add pip
      const pip = this.add.circle(0, 0, 5, 0xaaaaaa, 0.8);
      dice.add(pip);

      // Gentle rotation
      this.tweens.add({
        targets: dice,
        angle: i === 0 ? 10 : -10,
        duration: 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Subtle pulse
      this.tweens.add({
        targets: bg,
        alpha: 0.8,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 500,
      });
    });
  }

  private createDifficultyButton(x: number, y: number, config: DifficultyConfig): void {
    const buttonWidth = 280;
    const buttonHeight = 70;

    // Button background
    const bg = this.add.rectangle(x, y, buttonWidth, buttonHeight, config.bgColor);
    bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(config.color).color);
    bg.setInteractive({ useHandCursor: true });

    // Difficulty label
    const label = this.add.text(x, y - 10, config.label, {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: config.color,
      fontStyle: 'bold',
    });
    label.setOrigin(0.5, 0.5);
    label.setResolution(window.devicePixelRatio * 2);

    // Time indicator
    const timeText = this.add.text(x, y + 18, config.timeDisplay, {
      fontSize: '16px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_MUTED,
    });
    timeText.setOrigin(0.5, 0.5);
    timeText.setResolution(window.devicePixelRatio * 2);

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(config.hoverColor, 0.3);
      bg.setStrokeStyle(4, Phaser.Display.Color.HexStringToColor(config.color).color);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(config.bgColor);
      bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(config.color).color);
    });

    // Click to start game
    bg.on('pointerdown', () => {
      this.startGame(config.key);
    });
  }

  private startGame(difficulty: Difficulty): void {
    // Reset game progression for a fresh run
    resetGameProgression();

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

    // Transition effect
    this.cameras.main.fadeOut(SIZES.FADE_DURATION_MS, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('SprintScene', { difficulty });
    });
  }

  private onShutdown(): void {
    console.log('[MenuScene] shutdown - cleaning up');
    if (this.menuMusic) {
      this.menuMusic.stop();
      this.menuMusic.destroy();
      this.menuMusic = null;
    }
  }
}
