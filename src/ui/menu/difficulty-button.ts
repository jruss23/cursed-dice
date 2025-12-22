/**
 * Difficulty Button
 * Spooky-styled button for difficulty selection
 */

import Phaser from 'phaser';
import { type DifficultyConfig, FONTS, PALETTE, COLORS, SIZES, type ViewportMetrics } from '@/config';
import { createText } from '@/ui/ui-utils';

// Button-specific colors
const BUTTON_COLORS = {
  bg: PALETTE.purple[900],
  bgHover: PALETTE.purple[800],
  shadow: PALETTE.neutral[900],
} as const;

export interface DifficultyButtonCallbacks {
  onClick: (config: DifficultyConfig) => void;
}

export interface DifficultyButtonOptions {
  /** Viewport metrics for responsive sizing */
  metrics?: ViewportMetrics;
}

export class DifficultyButton {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private config: DifficultyConfig;
  private options: DifficultyButtonOptions;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: DifficultyConfig,
    index: number,
    callbacks: DifficultyButtonCallbacks,
    options: DifficultyButtonOptions = {}
  ) {
    this.scene = scene;
    this.config = config;
    this.options = options;
    this.container = this.scene.add.container(x, y);

    this.build(index, callbacks);
  }

  private build(index: number, callbacks: DifficultyButtonCallbacks): void {
    const metrics = this.options.metrics;
    const viewportWidth = metrics?.width ?? 1200;
    const isMobile = metrics?.isMobile ?? false;

    // Responsive button sizing
    const maxWidth = Math.min(320, viewportWidth - 40); // 20px margin each side
    const buttonWidth = isMobile ? maxWidth : 320;
    const buttonHeight = isMobile ? 58 : 75; // Still 44px+ for touch

    // Font sizes - keep readable on mobile
    const labelSize = isMobile ? '22px' : '26px';
    const subSize = isMobile ? '14px' : '14px';
    const iconSize = isMobile ? '24px' : '28px';

    const config = this.config;

    // Outer glow (pulsing) - smaller on mobile
    const glowStroke = isMobile ? SIZES.GLOW_STROKE_SMALL : SIZES.GLOW_STROKE_LARGE;
    const outerGlow = this.scene.add.rectangle(0, 0, buttonWidth + 20, buttonHeight + 20, 0x000000, 0);
    outerGlow.setStrokeStyle(glowStroke, Phaser.Display.Color.HexStringToColor(config.color).color, 0.2);
    this.container.add(outerGlow);

    // Button background with gradient effect
    const bgShadow = this.scene.add.rectangle(4, 4, buttonWidth, buttonHeight, BUTTON_COLORS.shadow, 0.5);
    this.container.add(bgShadow);

    const bg = this.scene.add.rectangle(0, 0, buttonWidth, buttonHeight, BUTTON_COLORS.bg, 0.9);
    bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(config.color).color, 0.8);
    this.container.add(bg);

    // Inner highlight
    const innerHighlight = this.scene.add.rectangle(0, -buttonHeight / 4, buttonWidth - 20, buttonHeight / 3, 0xffffff, 0.03);
    this.container.add(innerHighlight);

    // Decorative corner accents
    const cornerSize = 12;
    const corners = [
      { x: -buttonWidth / 2 + 5, y: -buttonHeight / 2 + 5, angle: 0 },
      { x: buttonWidth / 2 - 5, y: -buttonHeight / 2 + 5, angle: 90 },
      { x: buttonWidth / 2 - 5, y: buttonHeight / 2 - 5, angle: 180 },
      { x: -buttonWidth / 2 + 5, y: buttonHeight / 2 - 5, angle: 270 },
    ];

    corners.forEach(corner => {
      const accent = this.scene.add.graphics();
      accent.lineStyle(2, Phaser.Display.Color.HexStringToColor(config.color).color, 0.6);
      accent.beginPath();
      accent.moveTo(corner.x, corner.y + (corner.angle === 0 || corner.angle === 90 ? cornerSize : -cornerSize));
      accent.lineTo(corner.x, corner.y);
      accent.lineTo(corner.x + (corner.angle === 0 || corner.angle === 270 ? cornerSize : -cornerSize), corner.y);
      accent.strokePath();
      this.container.add(accent);
    });

    // Difficulty icon/symbol - position scaled with button width
    const iconX = -buttonWidth / 2 + (isMobile ? 30 : 35);
    const icons = ['', '', ''];
    const iconText = createText(this.scene, iconX, 0, icons[index], {
      fontSize: iconSize,
    });
    iconText.setOrigin(0.5, 0.5);
    this.container.add(iconText);

    // Difficulty label
    const label = createText(this.scene, 10, -12, config.label, {
      fontSize: labelSize,
      fontFamily: FONTS.FAMILY,
      color: config.color,
      fontStyle: 'bold',
    });
    label.setOrigin(0.5, 0.5);
    this.container.add(label);

    // Time and description
    const timeText = createText(this.scene, 10, 14, `${config.timeDisplay} per curse`, {
      fontSize: subSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    timeText.setOrigin(0.5, 0.5);
    this.container.add(timeText);

    // Decorative skulls on sides (hidden on mobile to save space)
    let leftSkull: Phaser.GameObjects.Text | null = null;
    let rightSkull: Phaser.GameObjects.Text | null = null;

    if (!isMobile) {
      leftSkull = createText(this.scene, -buttonWidth / 2 - 25, 0, '', {
        fontSize: '20px',
      });
      leftSkull.setOrigin(0.5, 0.5);
      leftSkull.setAlpha(0.3);
      this.container.add(leftSkull);

      rightSkull = createText(this.scene, buttonWidth / 2 + 25, 0, '', {
        fontSize: '20px',
      });
      rightSkull.setOrigin(0.5, 0.5);
      rightSkull.setAlpha(0.3);
      this.container.add(rightSkull);
    }

    // Make interactive
    bg.setInteractive({ useHandCursor: true });

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(BUTTON_COLORS.bgHover, 0.95);
      bg.setStrokeStyle(4, Phaser.Display.Color.HexStringToColor(config.color).color, 1);
      outerGlow.setStrokeStyle(isMobile ? SIZES.GLOW_STROKE_MEDIUM : SIZES.GLOW_STROKE_HOVER, Phaser.Display.Color.HexStringToColor(config.color).color, 0.2);

      this.scene.tweens.add({
        targets: this.container,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 150,
        ease: 'Quad.easeOut',
      });

      // Animate skulls only on desktop
      if (leftSkull && rightSkull) {
        this.scene.tweens.add({
          targets: [leftSkull, rightSkull],
          alpha: 0.7,
          duration: 150,
        });
      }

      label.setColor('#ffffff');
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(BUTTON_COLORS.bg, 0.9);
      bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(config.color).color, 0.8);
      outerGlow.setStrokeStyle(glowStroke, Phaser.Display.Color.HexStringToColor(config.color).color, 0.2);

      this.scene.tweens.add({
        targets: this.container,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Quad.easeOut',
      });

      // Animate skulls only on desktop
      if (leftSkull && rightSkull) {
        this.scene.tweens.add({
          targets: [leftSkull, rightSkull],
          alpha: 0.3,
          duration: 150,
        });
      }

      label.setColor(config.color);
    });

    bg.on('pointerdown', () => {
      // Click flash effect
      this.scene.cameras.main.flash(200, 100, 50, 150);

      // Scale down briefly
      this.scene.tweens.add({
        targets: this.container,
        scaleX: 0.97,
        scaleY: 0.97,
        duration: 100,
        yoyo: true,
        ease: 'Quad.easeOut',
      });

      callbacks.onClick(config);
    });

    // Entry animation
    this.container.setAlpha(0);
    this.container.setScale(0.9);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      delay: index * 100 + 200,
      ease: 'Back.easeOut',
    });

    // Subtle idle animation - pulse glow
    this.scene.tweens.add({
      targets: outerGlow,
      alpha: 0.35,
      duration: 2000 + index * 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
