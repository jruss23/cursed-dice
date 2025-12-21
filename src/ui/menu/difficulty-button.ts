/**
 * Difficulty Button
 * Spooky-styled button for difficulty selection
 */

import Phaser from 'phaser';
import { type DifficultyConfig, FONTS, PALETTE, COLORS } from '@/config';
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

export class DifficultyButton {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private config: DifficultyConfig;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: DifficultyConfig,
    index: number,
    callbacks: DifficultyButtonCallbacks
  ) {
    this.scene = scene;
    this.config = config;
    this.container = this.scene.add.container(x, y);

    this.build(index, callbacks);
  }

  private build(index: number, callbacks: DifficultyButtonCallbacks): void {
    const buttonWidth = 320;
    const buttonHeight = 75;
    const config = this.config;

    // Outer glow
    const outerGlow = this.scene.add.rectangle(0, 0, buttonWidth + 20, buttonHeight + 20, 0x000000, 0);
    outerGlow.setStrokeStyle(8, Phaser.Display.Color.HexStringToColor(config.color).color, 0.1);
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

    // Difficulty icon/symbol
    const icons = ['', '', ''];
    const iconText = createText(this.scene, -buttonWidth / 2 + 35, 0, icons[index], {
      fontSize: '28px',
    });
    iconText.setOrigin(0.5, 0.5);
    this.container.add(iconText);

    // Difficulty label
    const label = createText(this.scene, 10, -12, config.label, {
      fontSize: '26px',
      fontFamily: FONTS.FAMILY,
      color: config.color,
      fontStyle: 'bold',
    });
    label.setOrigin(0.5, 0.5);
    this.container.add(label);

    // Time and description
    const timeText = createText(this.scene, 10, 14, `${config.timeDisplay} per curse`, {
      fontSize: '14px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    timeText.setOrigin(0.5, 0.5);
    this.container.add(timeText);

    // Decorative skulls on sides
    const leftSkull = createText(this.scene, -buttonWidth / 2 - 25, 0, '', {
      fontSize: '20px',
    });
    leftSkull.setOrigin(0.5, 0.5);
    leftSkull.setAlpha(0.3);
    this.container.add(leftSkull);

    const rightSkull = createText(this.scene, buttonWidth / 2 + 25, 0, '', {
      fontSize: '20px',
    });
    rightSkull.setOrigin(0.5, 0.5);
    rightSkull.setAlpha(0.3);
    this.container.add(rightSkull);

    // Make interactive
    bg.setInteractive({ useHandCursor: true });

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(BUTTON_COLORS.bgHover, 0.95);
      bg.setStrokeStyle(4, Phaser.Display.Color.HexStringToColor(config.color).color, 1);
      outerGlow.setStrokeStyle(12, Phaser.Display.Color.HexStringToColor(config.color).color, 0.2);

      this.scene.tweens.add({
        targets: this.container,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 150,
        ease: 'Quad.easeOut',
      });

      this.scene.tweens.add({
        targets: [leftSkull, rightSkull],
        alpha: 0.7,
        duration: 150,
      });

      label.setColor('#ffffff');
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(BUTTON_COLORS.bg, 0.9);
      bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(config.color).color, 0.8);
      outerGlow.setStrokeStyle(8, Phaser.Display.Color.HexStringToColor(config.color).color, 0.1);

      this.scene.tweens.add({
        targets: this.container,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Quad.easeOut',
      });

      this.scene.tweens.add({
        targets: [leftSkull, rightSkull],
        alpha: 0.3,
        duration: 150,
      });

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

    // Subtle idle animation
    this.scene.tweens.add({
      targets: outerGlow,
      alpha: 0.15,
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
