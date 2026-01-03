/**
 * Shared UI Utilities
 * Common helpers for UI components to reduce code duplication
 */

import Phaser from 'phaser';
import { PALETTE, FONTS, COLORS, SIZES } from '@/config';
import { toDPR } from '@/systems/responsive';

// =============================================================================
// TEXT CREATION
// =============================================================================

/**
 * Create crisp text on retina displays
 * Always use this instead of scene.add.text() directly
 *
 * Uses Scale.NONE + zoom approach:
 * - Game canvas is at device pixel resolution (viewport × DPR)
 * - Font sizes are scaled by DPR to maintain visual size after zoom
 * - Text resolution matches DPR for crisp rendering
 */
export function createText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  style: Phaser.Types.GameObjects.Text.TextStyle
): Phaser.GameObjects.Text {
  const dpr = window.devicePixelRatio || 1;

  // Scale fontSize by DPR for proper sizing with Scale.NONE + zoom
  let scaledStyle = { ...style };
  if (style.fontSize) {
    const sizeStr = String(style.fontSize);
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)(px)?$/);
    if (match) {
      const size = parseFloat(match[1]);
      scaledStyle.fontSize = `${size * dpr}px`;
    }
  }

  const text = scene.add.text(x, y, content, {
    fontFamily: FONTS.FAMILY, // Default to system font stack
    ...scaledStyle,           // Caller styles with scaled fontSize
    resolution: dpr,          // Match game resolution
    padding: { x: 4, y: 4 },
  });
  return text;
}

// =============================================================================
// PANEL FRAME
// =============================================================================

/**
 * Panel style presets - spread these into createPanelFrame config
 * Usage: createPanelFrame(scene, { x, y, width, height, ...PANEL_PRESETS.modal })
 */
export const PANEL_PRESETS = {
  /** Default game panel (header, dice controls) - slightly transparent */
  default: {},

  /** Modal overlay (pause menu, settings) - nearly opaque with explicit purple theme */
  modal: {
    glowColor: PALETTE.purple[500],
    bgColor: PALETTE.purple[900],
    borderColor: PALETTE.purple[500],
    cornerColor: PALETTE.purple[400],
    bgAlpha: 0.98,
  },

  /** Subtle panel - reduced opacity for less prominence */
  subtle: {
    glowAlpha: 0.06,
    bgAlpha: 0.88,
    borderAlpha: 0.5,
  },

  /** Overlay panel - full-screen overlays with high opacity */
  overlay: {
    glowAlpha: 0.06,
    bgAlpha: 0.98,
    borderAlpha: 0.8,
    cornerAlpha: 0.6,
  },
} as const;

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
    cornerSize = SIZES.PANEL_CORNER_SIZE,
    cornerInset = SIZES.PANEL_CORNER_INSET,
  } = config;

  // Scale CSS pixel values to device pixels
  const scaledGlowSize = toDPR(glowSize);
  const scaledBorderWidth = toDPR(borderWidth);
  const scaledCornerSize = toDPR(cornerSize);
  const scaledCornerInset = toDPR(cornerInset);

  // Outer glow
  const outerGlow = scene.add.rectangle(
    x + width / 2,
    y + height / 2,
    width + scaledGlowSize,
    height + scaledGlowSize,
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
  background.setStrokeStyle(scaledBorderWidth, borderColor, borderAlpha);

  // Corner accents
  const corners = [
    { cx: x + scaledCornerInset, cy: y + scaledCornerInset, ax: 1, ay: 1 },
    { cx: x + width - scaledCornerInset, cy: y + scaledCornerInset, ax: -1, ay: 1 },
    { cx: x + width - scaledCornerInset, cy: y + height - scaledCornerInset, ax: -1, ay: -1 },
    { cx: x + scaledCornerInset, cy: y + height - scaledCornerInset, ax: 1, ay: -1 },
  ];

  const cornerGraphics: Phaser.GameObjects.Graphics[] = [];

  corners.forEach(corner => {
    const g = scene.add.graphics();
    g.lineStyle(toDPR(2), cornerColor, cornerAlpha);
    g.beginPath();
    g.moveTo(corner.cx, corner.cy + scaledCornerSize * corner.ay);
    g.lineTo(corner.cx, corner.cy);
    g.lineTo(corner.cx + scaledCornerSize * corner.ax, corner.cy);
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
  /** Clean up event listeners and destroy the button */
  destroy: () => void;
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
  const glow = scene.add.rectangle(0, 0, width + toDPR(8), height + toDPR(8), colors.glow, 0.1);
  container.add(glow);

  // Button background
  const background = scene.add.rectangle(0, 0, width, height, colors.bg, 0.95);
  background.setStrokeStyle(toDPR(2), colors.border);
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

  // Hover effects - store handlers for cleanup
  const onPointerOver = () => {
    background.setFillStyle(colors.bgHover, 1);
    background.setStrokeStyle(toDPR(2), colors.borderHover);
    glow.setAlpha(0.25);
  };

  const onPointerOut = () => {
    background.setFillStyle(colors.bg, 0.95);
    background.setStrokeStyle(toDPR(2), colors.border);
    glow.setAlpha(0.1);
  };

  background.on('pointerover', onPointerOver);
  background.on('pointerout', onPointerOut);
  background.on('pointerdown', onClick);

  // Cleanup function
  const destroy = () => {
    background.off('pointerover', onPointerOver);
    background.off('pointerout', onPointerOut);
    background.off('pointerdown', onClick);
    container.destroy();
  };

  return { container, glow, background, text, destroy };
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

/**
 * Extract RGB components from a hex color
 */
export function hexToRgb(hex: number): { r: number; g: number; b: number } {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff,
  };
}

/**
 * RGB object type for color tweening
 */
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Create a color tween that animates between two colors
 * Returns the tween for cleanup tracking
 */
export function createColorTween(
  scene: Phaser.Scene,
  fromColor: number | RgbColor,
  toColor: number | RgbColor,
  options: {
    delay?: number;
    duration?: number;
    ease?: string;
    onUpdate: (color: number, rgbString: string) => void;
    onComplete?: () => void;
  }
): Phaser.Tweens.Tween {
  const from = typeof fromColor === 'number' ? hexToRgb(fromColor) : fromColor;
  const to = typeof toColor === 'number' ? hexToRgb(toColor) : toColor;

  const proxy = { r: from.r, g: from.g, b: from.b };

  return scene.tweens.add({
    targets: proxy,
    r: to.r,
    g: to.g,
    b: to.b,
    delay: options.delay ?? 0,
    duration: options.duration ?? 500,
    ease: options.ease ?? 'Sine.easeInOut',
    onUpdate: () => {
      const r = Math.floor(proxy.r);
      const g = Math.floor(proxy.g);
      const b = Math.floor(proxy.b);
      const color = Phaser.Display.Color.GetColor(r, g, b);
      const rgbString = Phaser.Display.Color.RGBToString(r, g, b);
      options.onUpdate(color, rgbString);
    },
    onComplete: options.onComplete,
  });
}
