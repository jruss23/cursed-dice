/**
 * Difficulty Button
 * Spooky-styled button for difficulty selection
 */

import Phaser from 'phaser';
import { type DifficultyConfig, FONTS, PALETTE, COLORS, SIZES, ALPHA, TIMING, SCALE } from '@/config';
import { type ViewportSizing } from '@/systems/responsive';
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
  /** Viewport-relative sizing */
  sizing?: ViewportSizing;
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
    const sizing = this.options.sizing;

    // Use viewport-relative sizing
    const buttonWidth = sizing?.buttonWidth ?? 320;
    const buttonHeight = sizing?.buttonHeight ?? 60;

    // Fixed font sizes for buttons (they have fixed max width, so font shouldn't scale)
    const labelSize = FONTS.SIZE_BUTTON;
    const iconSize = FONTS.SIZE_BUTTON;

    const config = this.config;
    const smallPadding = sizing?.smallPadding ?? 5;

    // Outer glow (pulsing)
    const glowStroke = SIZES.GLOW_STROKE_SMALL;
    const glowPadding = smallPadding * 2;
    const outerGlow = this.scene.add.rectangle(0, 0, buttonWidth + glowPadding, buttonHeight + glowPadding, PALETTE.black, 0);
    outerGlow.setStrokeStyle(glowStroke, Phaser.Display.Color.HexStringToColor(config.color).color, ALPHA.GLOW_MEDIUM + 0.05);
    this.container.add(outerGlow);

    // Button background with gradient effect
    const bgShadow = this.scene.add.rectangle(4, 4, buttonWidth, buttonHeight, BUTTON_COLORS.shadow, ALPHA.DISABLED);
    this.container.add(bgShadow);

    const bg = this.scene.add.rectangle(0, 0, buttonWidth, buttonHeight, BUTTON_COLORS.bg, ALPHA.PANEL_SOLID);
    bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(config.color).color, ALPHA.BORDER_SOLID);
    this.container.add(bg);

    // Inner highlight
    const innerHighlight = this.scene.add.rectangle(0, -buttonHeight / 4, buttonWidth - 20, buttonHeight / 3, PALETTE.white, ALPHA.GLOW_SUBTLE / 2);
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
      accent.lineStyle(2, Phaser.Display.Color.HexStringToColor(config.color).color, ALPHA.BORDER_MEDIUM);
      accent.beginPath();
      accent.moveTo(corner.x, corner.y + (corner.angle === 0 || corner.angle === 90 ? cornerSize : -cornerSize));
      accent.lineTo(corner.x, corner.y);
      accent.lineTo(corner.x + (corner.angle === 0 || corner.angle === 270 ? cornerSize : -cornerSize), corner.y);
      accent.strokePath();
      this.container.add(accent);
    });

    // Difficulty icon/symbol - position scaled with button width
    const iconX = -buttonWidth / 2 + 30;
    const icons = ['', '', ''];
    const iconText = createText(this.scene, iconX, 0, icons[index], {
      fontSize: iconSize,
    });
    iconText.setOrigin(0.5, 0.5);
    this.container.add(iconText);

    // Difficulty label (centered, closer to subtitle)
    const label = createText(this.scene, 10, -6, config.label, {
      fontSize: labelSize,
      fontFamily: FONTS.FAMILY,
      color: config.color,
      fontStyle: 'bold',
    });
    label.setOrigin(0.5, 0.5);
    this.container.add(label);

    // Subtitle with time (two parts: flavor text + time in difficulty color)
    const subtitleSize = FONTS.SIZE_TINY; // Fixed size for button subtitle
    const flavorPart = `${config.subtitle} •`;
    const timePart = ` ${config.timeDisplay}/seal`;

    // Create both texts to measure
    const flavorText = createText(this.scene, 0, 8, flavorPart, {
      fontSize: subtitleSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
      fontStyle: 'italic',
    });
    const timeText = createText(this.scene, 0, 8, timePart, {
      fontSize: subtitleSize,
      fontFamily: FONTS.FAMILY,
      color: config.color,
      fontStyle: 'bold',
    });

    // Center the combined subtitle (offset by -8 to compensate for text padding)
    const totalSubWidth = flavorText.width + timeText.width - 8;
    const subStartX = 10 - totalSubWidth / 2;
    flavorText.setX(subStartX);
    flavorText.setOrigin(0, 0.5);
    timeText.setX(subStartX + flavorText.width - 8);
    timeText.setOrigin(0, 0.5);

    this.container.add(flavorText);
    this.container.add(timeText);

    // Make interactive
    bg.setInteractive({ useHandCursor: true });

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(BUTTON_COLORS.bgHover, ALPHA.PANEL_OPAQUE);
      bg.setStrokeStyle(4, Phaser.Display.Color.HexStringToColor(config.color).color, 1);
      outerGlow.setStrokeStyle(SIZES.GLOW_STROKE_MEDIUM, Phaser.Display.Color.HexStringToColor(config.color).color, ALPHA.GLOW_MEDIUM + 0.05);

      this.scene.tweens.add({
        targets: this.container,
        scaleX: SCALE.HOVER,
        scaleY: SCALE.HOVER,
        duration: SIZES.ANIM_QUICK,
        ease: 'Quad.easeOut',
      });

      label.setColor(COLORS.TEXT_PRIMARY);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(BUTTON_COLORS.bg, ALPHA.PANEL_SOLID);
      bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(config.color).color, ALPHA.BORDER_SOLID);
      outerGlow.setStrokeStyle(glowStroke, Phaser.Display.Color.HexStringToColor(config.color).color, ALPHA.GLOW_MEDIUM + 0.05);

      this.scene.tweens.add({
        targets: this.container,
        scaleX: 1,
        scaleY: 1,
        duration: SIZES.ANIM_QUICK,
        ease: 'Quad.easeOut',
      });

      label.setColor(config.color);
    });

    bg.on('pointerdown', () => {
      // Click flash effect - use difficulty's own color
      const flashColor = Phaser.Display.Color.HexStringToColor(config.color);
      this.scene.cameras.main.flash(TIMING.NORMAL, flashColor.red, flashColor.green, flashColor.blue);

      // Scale down briefly
      this.scene.tweens.add({
        targets: this.container,
        scaleX: SCALE.CLICK,
        scaleY: SCALE.CLICK,
        duration: SIZES.ANIM_FAST,
        yoyo: true,
        ease: 'Quad.easeOut',
      });

      callbacks.onClick(config);
    });

    // Entry animation
    this.container.setAlpha(0);
    this.container.setScale(SCALE.ENTRY);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: SIZES.ANIM_SLOW,
      delay: index * TIMING.QUICK + TIMING.NORMAL,
      ease: 'Back.easeOut',
    });

    // Subtle idle animation - pulse glow
    this.scene.tweens.add({
      targets: outerGlow,
      alpha: ALPHA.GLOW_INTENSE,
      duration: TIMING.PULSE + index * TIMING.ENTRANCE,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}
