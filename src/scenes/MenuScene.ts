/**
 * Menu Scene
 * Spooky cursed theme with difficulty selection
 */

import Phaser from 'phaser';
import {
  type Difficulty,
  type DifficultyConfig,
  DIFFICULTIES,
  DIFFICULTY_LIST,
  FONTS,
  SIZES,
} from '@/config';
import { resetGameProgression } from '@/systems/game-progression';

export class MenuScene extends Phaser.Scene {
  private menuMusic: Phaser.Sound.BaseSound | null = null;
  private titleText: Phaser.GameObjects.Text | null = null;
  private titleGlow: Phaser.GameObjects.Text | null = null;

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

    // Dark spooky background with fog
    this.createSpookyBackground(width, height);

    // Floating cursed elements
    this.createFloatingCursedElements(width, height);

    // Drifting fog layers
    this.createFogLayers(width, height);

    // Eerie glowing eyes in background
    this.createGlowingEyes(width, height);

    // Flickering title
    this.createFlickeringTitle(width);

    // Subtitle with creepy effect
    const subtitle = this.createText(width / 2, 145, 'Beat the clock. Break the curse.', {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: '#886699',
    });
    subtitle.setOrigin(0.5, 0.5);

    // Subtle flicker on subtitle
    this.tweens.add({
      targets: subtitle,
      alpha: 0.6,
      duration: 100,
      yoyo: true,
      repeat: -1,
      repeatDelay: Phaser.Math.Between(2000, 5000),
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

    DIFFICULTY_LIST.forEach((diffKey, index) => {
      const config = DIFFICULTIES[diffKey];
      this.createSpookyDifficultyButton(width / 2, buttonStartY + index * buttonSpacing, config, index);
    });

    // Mode info at bottom with ghostly effect
    const modeInfo = this.createText(
      width / 2,
      height - 70,
      '4 Cursed Modes await... Score 250+ to survive each',
      {
        fontSize: FONTS.SIZE_SMALL,
        fontFamily: FONTS.FAMILY,
        color: '#664488',
      }
    );
    modeInfo.setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: modeInfo,
      alpha: 0.5,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Version with skull
    const credit = this.createText(width / 2, height - 35, 'v1.0', {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: '#333344',
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

  private createSpookyBackground(width: number, height: number): void {
    // Deep dark gradient with purple/green tints
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x050510, 0x050510, 0x100520, 0x051510, 1);
    bg.fillRect(0, 0, width, height);

    // Eerie ambient glow spots
    const glowSpots = [
      { x: width * 0.2, y: height * 0.3, color: 0x2a0a3a, size: 350 },
      { x: width * 0.8, y: height * 0.6, color: 0x0a2a1a, size: 300 },
      { x: width * 0.5, y: height * 0.8, color: 0x1a0a2a, size: 400 },
    ];

    for (const spot of glowSpots) {
      const glow = this.add.graphics();
      glow.fillStyle(spot.color, 0.15);
      glow.fillCircle(spot.x, spot.y, spot.size);

      this.tweens.add({
        targets: glow,
        alpha: 0.25,
        duration: Phaser.Math.Between(3000, 5000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 2000),
      });
    }
  }

  private createFloatingCursedElements(width: number, height: number): void {
    // Floating skulls
    const skullPositions = [
      { x: 80, y: 150 },
      { x: width - 80, y: 180 },
      { x: 120, y: height - 150 },
      { x: width - 100, y: height - 180 },
      { x: width / 2 - 200, y: 120 },
      { x: width / 2 + 200, y: 130 },
    ];

    skullPositions.forEach((pos, i) => {
      const skull = this.createText(pos.x, pos.y, '', {
        fontSize: `${Phaser.Math.Between(24, 40)}px`,
      });
      skull.setOrigin(0.5, 0.5);
      skull.setAlpha(Phaser.Math.FloatBetween(0.15, 0.35));

      // Float and rotate
      this.tweens.add({
        targets: skull,
        y: pos.y + Phaser.Math.Between(-25, 25),
        x: pos.x + Phaser.Math.Between(-15, 15),
        angle: Phaser.Math.Between(-15, 15),
        duration: Phaser.Math.Between(4000, 7000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 300,
      });

      // Occasional fade pulse
      this.tweens.add({
        targets: skull,
        alpha: skull.alpha + 0.15,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 3000),
      });
    });

    // Floating cursed dice
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(50, width - 50);
      const y = Phaser.Math.Between(80, height - 80);
      const size = Phaser.Math.Between(15, 35);

      const dice = this.add.container(x, y);

      // Dice body with eerie glow
      const diceGlow = this.add.rectangle(0, 0, size + 8, size + 8, 0x6600aa, 0.2);
      dice.add(diceGlow);

      const diceBg = this.add.rectangle(0, 0, size, size, 0x1a0a2a, 0.4);
      diceBg.setStrokeStyle(1, 0x4a2a6a, 0.5);
      dice.add(diceBg);

      // Random pip pattern
      const pipCount = Phaser.Math.Between(1, 6);
      const pipSize = size * 0.12;
      const pipOffset = size * 0.25;

      const pipPositions: { x: number; y: number }[][] = [
        [{ x: 0, y: 0 }],
        [{ x: -pipOffset, y: -pipOffset }, { x: pipOffset, y: pipOffset }],
        [{ x: -pipOffset, y: -pipOffset }, { x: 0, y: 0 }, { x: pipOffset, y: pipOffset }],
        [{ x: -pipOffset, y: -pipOffset }, { x: pipOffset, y: -pipOffset }, { x: -pipOffset, y: pipOffset }, { x: pipOffset, y: pipOffset }],
        [{ x: -pipOffset, y: -pipOffset }, { x: pipOffset, y: -pipOffset }, { x: 0, y: 0 }, { x: -pipOffset, y: pipOffset }, { x: pipOffset, y: pipOffset }],
        [{ x: -pipOffset, y: -pipOffset }, { x: -pipOffset, y: 0 }, { x: -pipOffset, y: pipOffset }, { x: pipOffset, y: -pipOffset }, { x: pipOffset, y: 0 }, { x: pipOffset, y: pipOffset }],
      ];

      pipPositions[pipCount - 1].forEach(pip => {
        const pipCircle = this.add.circle(pip.x, pip.y, pipSize, 0x8844aa, 0.6);
        dice.add(pipCircle);
      });

      dice.setAlpha(Phaser.Math.FloatBetween(0.2, 0.4));
      dice.setAngle(Phaser.Math.Between(-30, 30));

      // Floating animation
      this.tweens.add({
        targets: dice,
        y: y + Phaser.Math.Between(-40, 40),
        x: x + Phaser.Math.Between(-30, 30),
        angle: dice.angle + Phaser.Math.Between(-20, 20),
        duration: Phaser.Math.Between(5000, 9000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 3000),
      });

      // Glow pulse
      this.tweens.add({
        targets: diceGlow,
        alpha: 0.4,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: Phaser.Math.Between(2000, 4000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createFogLayers(width: number, height: number): void {
    // Create multiple fog layers that drift across
    for (let layer = 0; layer < 3; layer++) {
      const fogY = height * 0.3 + layer * height * 0.25;
      const fogHeight = 150 + layer * 50;

      for (let i = 0; i < 4; i++) {
        const fog = this.add.graphics();
        const startX = (i - 1) * width * 0.5;

        fog.fillStyle(0x2a1a3a, 0.03 + layer * 0.01);
        fog.fillEllipse(startX, fogY, width * 0.6, fogHeight);

        // Drift animation
        this.tweens.add({
          targets: fog,
          x: fog.x + width * 0.3,
          duration: 15000 + layer * 5000,
          repeat: -1,
          ease: 'Linear',
          delay: i * 4000,
          onRepeat: () => {
            fog.x = -width * 0.3;
          },
        });

        // Fade in/out
        this.tweens.add({
          targets: fog,
          alpha: 0.6,
          duration: 5000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Phaser.Math.Between(0, 3000),
        });
      }
    }
  }

  private createGlowingEyes(width: number, _height: number): void {
    // Pairs of eerie glowing eyes in the background
    const eyePositions = [
      { x: 60, y: 400, size: 4 },
      { x: width - 50, y: 350, size: 5 },
      { x: 150, y: 550, size: 3 },
      { x: width - 120, y: 500, size: 4 },
    ];

    eyePositions.forEach((pos, i) => {
      const spacing = pos.size * 4;

      // Left eye
      const leftEye = this.add.circle(pos.x - spacing, pos.y, pos.size, 0xff0000, 0);
      const leftGlow = this.add.circle(pos.x - spacing, pos.y, pos.size * 2, 0xff0000, 0);

      // Right eye
      const rightEye = this.add.circle(pos.x + spacing, pos.y, pos.size, 0xff0000, 0);
      const rightGlow = this.add.circle(pos.x + spacing, pos.y, pos.size * 2, 0xff0000, 0);

      // Blink animation - eyes appear and disappear
      const blinkIn = () => {
        const delay = Phaser.Math.Between(5000, 15000);

        this.time.delayedCall(delay, () => {
          // Fade in
          this.tweens.add({
            targets: [leftEye, rightEye],
            alpha: 0.8,
            duration: 200,
          });
          this.tweens.add({
            targets: [leftGlow, rightGlow],
            alpha: 0.2,
            duration: 200,
          });

          // Hold then blink
          this.time.delayedCall(Phaser.Math.Between(2000, 5000), () => {
            // Blink
            this.tweens.add({
              targets: [leftEye, rightEye, leftGlow, rightGlow],
              alpha: 0,
              duration: 100,
              yoyo: true,
              repeat: Phaser.Math.Between(1, 3),
              onComplete: () => {
                // Fade out
                this.tweens.add({
                  targets: [leftEye, rightEye, leftGlow, rightGlow],
                  alpha: 0,
                  duration: 500,
                  onComplete: blinkIn,
                });
              },
            });
          });
        });
      };

      // Start with delay
      this.time.delayedCall(i * 3000, blinkIn);
    });
  }

  private createFlickeringTitle(width: number): void {
    // Multiple glow layers for depth
    const glowColors = ['#220044', '#440066', '#660088'];

    glowColors.forEach((color, i) => {
      const glow = this.createText(width / 2, 85, 'CURSED YAHTZEE', {
        fontSize: '52px',
        fontFamily: FONTS.FAMILY,
        color: color,
        fontStyle: 'bold',
      });
      glow.setOrigin(0.5, 0.5);
      glow.setAlpha(0.3 - i * 0.08);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setScale(1.02 + i * 0.02);

      this.tweens.add({
        targets: glow,
        alpha: glow.alpha + 0.15,
        scaleX: glow.scaleX + 0.02,
        scaleY: glow.scaleY + 0.02,
        duration: 2000 + i * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Main title glow
    this.titleGlow = this.createText(width / 2, 85, 'CURSED YAHTZEE', {
      fontSize: '52px',
      fontFamily: FONTS.FAMILY,
      color: '#8844aa',
      fontStyle: 'bold',
    });
    this.titleGlow.setOrigin(0.5, 0.5);
    this.titleGlow.setAlpha(0.5);
    this.titleGlow.setBlendMode(Phaser.BlendModes.ADD);

    // Main title
    this.titleText = this.createText(width / 2, 85, 'CURSED YAHTZEE', {
      fontSize: '52px',
      fontFamily: FONTS.FAMILY,
      color: '#ddaaff',
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5, 0.5);

    // Glitch/flicker effect
    this.time.addEvent({
      delay: Phaser.Math.Between(3000, 8000),
      callback: () => {
        if (!this.titleText || !this.titleGlow) return;

        // Quick glitch
        const originalX = this.titleText.x;
        const glitchAmount = Phaser.Math.Between(2, 6);

        this.tweens.add({
          targets: [this.titleText, this.titleGlow],
          x: originalX + glitchAmount,
          alpha: 0.7,
          duration: 50,
          yoyo: true,
          repeat: Phaser.Math.Between(2, 5),
          onComplete: () => {
            if (this.titleText) this.titleText.x = originalX;
            if (this.titleGlow) this.titleGlow.x = originalX;
          },
        });
      },
      loop: true,
    });

    // Continuous glow pulse
    this.tweens.add({
      targets: this.titleGlow,
      alpha: 0.8,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createSpookyDifficultyButton(x: number, y: number, config: DifficultyConfig, index: number): void {
    const buttonWidth = 320;
    const buttonHeight = 75;

    const container = this.add.container(x, y);

    // Outer glow
    const outerGlow = this.add.rectangle(0, 0, buttonWidth + 20, buttonHeight + 20, 0x000000, 0);
    outerGlow.setStrokeStyle(8, Phaser.Display.Color.HexStringToColor(config.color).color, 0.1);
    container.add(outerGlow);

    // Button background with gradient effect
    const bgShadow = this.add.rectangle(4, 4, buttonWidth, buttonHeight, 0x000000, 0.5);
    container.add(bgShadow);

    const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x0a0a15, 0.9);
    bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(config.color).color, 0.8);
    container.add(bg);

    // Inner highlight
    const innerHighlight = this.add.rectangle(0, -buttonHeight / 4, buttonWidth - 20, buttonHeight / 3, 0xffffff, 0.03);
    container.add(innerHighlight);

    // Decorative corner accents
    const cornerSize = 12;
    const corners = [
      { x: -buttonWidth / 2 + 5, y: -buttonHeight / 2 + 5, angle: 0 },
      { x: buttonWidth / 2 - 5, y: -buttonHeight / 2 + 5, angle: 90 },
      { x: buttonWidth / 2 - 5, y: buttonHeight / 2 - 5, angle: 180 },
      { x: -buttonWidth / 2 + 5, y: buttonHeight / 2 - 5, angle: 270 },
    ];

    corners.forEach(corner => {
      const accent = this.add.graphics();
      accent.lineStyle(2, Phaser.Display.Color.HexStringToColor(config.color).color, 0.6);
      accent.beginPath();
      accent.moveTo(corner.x, corner.y + (corner.angle === 0 || corner.angle === 90 ? cornerSize : -cornerSize));
      accent.lineTo(corner.x, corner.y);
      accent.lineTo(corner.x + (corner.angle === 0 || corner.angle === 270 ? cornerSize : -cornerSize), corner.y);
      accent.strokePath();
      container.add(accent);
    });

    // Difficulty icon/symbol
    const icons = ['', '', ''];
    const iconText = this.createText(-buttonWidth / 2 + 35, 0, icons[index], {
      fontSize: '28px',
    });
    iconText.setOrigin(0.5, 0.5);
    container.add(iconText);

    // Difficulty label
    const label = this.createText(10, -12, config.label, {
      fontSize: '26px',
      fontFamily: FONTS.FAMILY,
      color: config.color,
      fontStyle: 'bold',
    });
    label.setOrigin(0.5, 0.5);
    container.add(label);

    // Time and description
    const timeText = this.createText(10, 14, `${config.timeDisplay} per mode`, {
      fontSize: '14px',
      fontFamily: FONTS.FAMILY,
      color: '#888899',
    });
    timeText.setOrigin(0.5, 0.5);
    container.add(timeText);

    // Decorative skulls on sides
    const leftSkull = this.createText(-buttonWidth / 2 - 25, 0, '', {
      fontSize: '20px',
    });
    leftSkull.setOrigin(0.5, 0.5);
    leftSkull.setAlpha(0.3);
    container.add(leftSkull);

    const rightSkull = this.createText(buttonWidth / 2 + 25, 0, '', {
      fontSize: '20px',
    });
    rightSkull.setOrigin(0.5, 0.5);
    rightSkull.setAlpha(0.3);
    container.add(rightSkull);

    // Make interactive
    bg.setInteractive({ useHandCursor: true });

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(0x1a1a25, 0.95);
      bg.setStrokeStyle(4, Phaser.Display.Color.HexStringToColor(config.color).color, 1);
      outerGlow.setStrokeStyle(12, Phaser.Display.Color.HexStringToColor(config.color).color, 0.2);

      this.tweens.add({
        targets: container,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 150,
        ease: 'Quad.easeOut',
      });

      this.tweens.add({
        targets: [leftSkull, rightSkull],
        alpha: 0.7,
        duration: 150,
      });

      label.setColor('#ffffff');
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x0a0a15, 0.9);
      bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(config.color).color, 0.8);
      outerGlow.setStrokeStyle(8, Phaser.Display.Color.HexStringToColor(config.color).color, 0.1);

      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Quad.easeOut',
      });

      this.tweens.add({
        targets: [leftSkull, rightSkull],
        alpha: 0.3,
        duration: 150,
      });

      label.setColor(config.color);
    });

    // Click effect
    bg.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.98,
        scaleY: 0.98,
        duration: 50,
        yoyo: true,
        onComplete: () => {
          this.startGame(config.key);
        },
      });
    });

    // Subtle idle animation
    this.tweens.add({
      targets: outerGlow,
      alpha: 0.15,
      duration: 2000 + index * 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Entrance animation
    container.setAlpha(0);
    container.y = y + 30;
    this.tweens.add({
      targets: container,
      alpha: 1,
      y: y,
      duration: 400,
      delay: 200 + index * 150,
      ease: 'Back.easeOut',
    });
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

    // Spooky transition effect
    this.cameras.main.flash(200, 100, 0, 100);
    this.cameras.main.fadeOut(SIZES.FADE_DURATION_MS + 200, 0, 0, 0);

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
