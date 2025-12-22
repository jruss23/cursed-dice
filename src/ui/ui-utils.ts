/**
 * Shared UI Utilities
 * Common helpers for UI components to reduce code duplication
 */

import Phaser from 'phaser';
import { PALETTE, FONTS, COLORS } from '@/config';

// =============================================================================
// TEXT CREATION
// =============================================================================

/**
 * Create crisp text on retina displays
 * Always use this instead of scene.add.text() directly
 */
export function createText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  style: Phaser.Types.GameObjects.Text.TextStyle
): Phaser.GameObjects.Text {
  const text = scene.add.text(x, y, content, style);
  text.setResolution(window.devicePixelRatio * 2);
  return text;
}

// =============================================================================
// PANEL FRAME
// =============================================================================

export interface PanelFrameConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  glowColor?: number;
  glowAlpha?: number;
  glowSize?: number;
  bgColor?: number;
  bgAlpha?: number;
  borderColor?: number;
  borderAlpha?: number;
  borderWidth?: number;
  cornerColor?: number;
  cornerAlpha?: number;
  cornerSize?: number;
  cornerInset?: number;
}

export interface PanelFrameResult {
  outerGlow: Phaser.GameObjects.Rectangle;
  background: Phaser.GameObjects.Rectangle;
  cornerGraphics: Phaser.GameObjects.Graphics[];
}

/**
 * Create a consistent panel frame with glow, background, border, and corner accents
 * Returns the created elements for adding to a container
 */
export function createPanelFrame(
  scene: Phaser.Scene,
  config: PanelFrameConfig
): PanelFrameResult {
  const {
    x,
    y,
    width,
    height,
    glowColor = PALETTE.purple[500],
    glowAlpha = 0.08,
    glowSize = 12,
    bgColor = PALETTE.purple[900],
    bgAlpha = 0.92,
    borderColor = PALETTE.purple[500],
    borderAlpha = 0.7,
    borderWidth = 2,
    cornerColor = PALETTE.purple[400],
    cornerAlpha = 0.6,
    cornerSize = 10,
    cornerInset = 6,
  } = config;

  // Outer glow
  const outerGlow = scene.add.rectangle(
    x + width / 2,
    y + height / 2,
    width + glowSize,
    height + glowSize,
    glowColor,
    glowAlpha
  );

  // Background with border
  const background = scene.add.rectangle(
    x + width / 2,
    y + height / 2,
    width,
    height,
    bgColor,
    bgAlpha
  );
  background.setStrokeStyle(borderWidth, borderColor, borderAlpha);

  // Corner accents
  const corners = [
    { cx: x + cornerInset, cy: y + cornerInset, ax: 1, ay: 1 },
    { cx: x + width - cornerInset, cy: y + cornerInset, ax: -1, ay: 1 },
    { cx: x + width - cornerInset, cy: y + height - cornerInset, ax: -1, ay: -1 },
    { cx: x + cornerInset, cy: y + height - cornerInset, ax: 1, ay: -1 },
  ];

  const cornerGraphics: Phaser.GameObjects.Graphics[] = [];

  corners.forEach(corner => {
    const g = scene.add.graphics();
    g.lineStyle(2, cornerColor, cornerAlpha);
    g.beginPath();
    g.moveTo(corner.cx, corner.cy + cornerSize * corner.ay);
    g.lineTo(corner.cx, corner.cy);
    g.lineTo(corner.cx + cornerSize * corner.ax, corner.cy);
    g.strokePath();
    cornerGraphics.push(g);
  });

  return { outerGlow, background, cornerGraphics };
}

/**
 * Add all panel frame elements to a container
 */
export function addPanelFrameToContainer(
  container: Phaser.GameObjects.Container,
  frame: PanelFrameResult
): void {
  container.add(frame.outerGlow);
  container.add(frame.background);
  frame.cornerGraphics.forEach(g => container.add(g));
}

// =============================================================================
// BUTTON CREATION
// =============================================================================

export type ButtonStyle = 'primary' | 'secondary' | 'warning' | 'danger';

export interface ButtonConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  style?: ButtonStyle;
  onClick: () => void;
}

interface ButtonColors {
  bg: number;
  bgHover: number;
  border: number;
  borderHover: number;
  glow: number;
  text: string;
}

const BUTTON_STYLES: Record<ButtonStyle, ButtonColors> = {
  primary: {
    bg: PALETTE.green[700],
    bgHover: PALETTE.green[600],
    border: PALETTE.green[500],
    borderHover: PALETTE.green[400],
    glow: PALETTE.green[500],
    text: COLORS.TEXT_SUCCESS,
  },
  secondary: {
    bg: PALETTE.purple[700],
    bgHover: PALETTE.purple[600],
    border: PALETTE.purple[500],
    borderHover: PALETTE.purple[400],
    glow: PALETTE.purple[500],
    text: COLORS.TEXT_SECONDARY,
  },
  warning: {
    bg: PALETTE.gold[700],
    bgHover: PALETTE.gold[600],
    border: PALETTE.gold[500],
    borderHover: PALETTE.gold[400],
    glow: PALETTE.gold[500],
    text: COLORS.TEXT_WARNING,
  },
  danger: {
    bg: PALETTE.red[800],
    bgHover: PALETTE.red[700],
    border: PALETTE.red[500],
    borderHover: PALETTE.red[400],
    glow: PALETTE.red[500],
    text: COLORS.TEXT_DANGER,
  },
};

export interface ButtonResult {
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Rectangle;
  background: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
}

/**
 * Create a styled button with hover effects
 */
export function createButton(
  scene: Phaser.Scene,
  config: ButtonConfig
): ButtonResult {
  const {
    x,
    y,
    width = 150,
    height = 44,
    label,
    style = 'primary',
    onClick,
  } = config;

  const colors = BUTTON_STYLES[style];
  const container = scene.add.container(x, y);

  // Button glow
  const glow = scene.add.rectangle(0, 0, width + 8, height + 8, colors.glow, 0.1);
  container.add(glow);

  // Button background
  const background = scene.add.rectangle(0, 0, width, height, colors.bg, 0.95);
  background.setStrokeStyle(2, colors.border);
  background.setInteractive({ useHandCursor: true });
  container.add(background);

  // Button text
  const text = createText(scene, 0, 0, label, {
    fontSize: FONTS.SIZE_BUTTON,
    fontFamily: FONTS.FAMILY,
    color: colors.text,
    fontStyle: 'bold',
  });
  text.setOrigin(0.5, 0.5);
  container.add(text);

  // Hover effects
  background.on('pointerover', () => {
    background.setFillStyle(colors.bgHover, 1);
    background.setStrokeStyle(2, colors.borderHover);
    glow.setAlpha(0.25);
  });

  background.on('pointerout', () => {
    background.setFillStyle(colors.bg, 0.95);
    background.setStrokeStyle(2, colors.border);
    glow.setAlpha(0.1);
  });

  background.on('pointerdown', onClick);

  return { container, glow, background, text };
}

// =============================================================================
// COLOR UTILITIES
// =============================================================================

/**
 * Convert a hex number to a CSS color string
 */
export function hexToColorString(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

/**
 * Create a darker version of a color (for glows behind text)
 */
export function darkenColor(hex: number, factor: number = 0.5): number {
  const r = Math.floor(((hex >> 16) & 0xff) * factor);
  const g = Math.floor(((hex >> 8) & 0xff) * factor);
  const b = Math.floor((hex & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}
