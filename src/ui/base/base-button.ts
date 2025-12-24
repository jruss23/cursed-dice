/**
 * BaseButton Class
 * Reusable button component with consistent styling
 *
 * Usage:
 *   const btn = new BaseButton(scene, {
 *     x: 100,
 *     y: 200,
 *     label: 'CLICK ME',
 *     style: 'primary',
 *     onClick: () => console.log('Clicked!'),
 *   });
 */

import Phaser from 'phaser';
import { PALETTE, FONTS, COLORS, TIMING } from '@/config';
import { createText } from '@/ui/ui-utils';

// =============================================================================
// TYPES
// =============================================================================

export type ButtonStyle = 'primary' | 'secondary' | 'warning' | 'danger' | 'ghost';

export interface BaseButtonConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  style?: ButtonStyle;
  fontSize?: string;
  disabled?: boolean;
  onClick?: () => void;
}

interface ButtonColors {
  bg: number;
  bgHover: number;
  bgDisabled: number;
  border: number;
  borderHover: number;
  glow: number;
  text: string;
  textDisabled: string;
}

// =============================================================================
// STYLE PRESETS
// =============================================================================

const BUTTON_COLORS: Record<ButtonStyle, ButtonColors> = {
  primary: {
    bg: PALETTE.green[700],
    bgHover: PALETTE.green[600],
    bgDisabled: PALETTE.neutral[800],
    border: PALETTE.green[500],
    borderHover: PALETTE.green[400],
    glow: PALETTE.green[500],
    text: COLORS.TEXT_SUCCESS,
    textDisabled: COLORS.TEXT_MUTED,
  },
  secondary: {
    bg: PALETTE.purple[700],
    bgHover: PALETTE.purple[600],
    bgDisabled: PALETTE.neutral[800],
    border: PALETTE.purple[500],
    borderHover: PALETTE.purple[400],
    glow: PALETTE.purple[500],
    text: COLORS.TEXT_PRIMARY,
    textDisabled: COLORS.TEXT_MUTED,
  },
  warning: {
    bg: PALETTE.gold[700],
    bgHover: PALETTE.gold[600],
    bgDisabled: PALETTE.neutral[800],
    border: PALETTE.gold[500],
    borderHover: PALETTE.gold[400],
    glow: PALETTE.gold[500],
    text: COLORS.TEXT_WARNING,
    textDisabled: COLORS.TEXT_MUTED,
  },
  danger: {
    bg: PALETTE.red[800],
    bgHover: PALETTE.red[700],
    bgDisabled: PALETTE.neutral[800],
    border: PALETTE.red[500],
    borderHover: PALETTE.red[400],
    glow: PALETTE.red[500],
    text: COLORS.TEXT_DANGER,
    textDisabled: COLORS.TEXT_MUTED,
  },
  ghost: {
    bg: 0x000000,
    bgHover: PALETTE.purple[800],
    bgDisabled: 0x000000,
    border: PALETTE.purple[600],
    borderHover: PALETTE.purple[500],
    glow: PALETTE.purple[600],
    text: COLORS.TEXT_SECONDARY,
    textDisabled: COLORS.TEXT_MUTED,
  },
};

// =============================================================================
// BASE BUTTON
// =============================================================================

export class BaseButton {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private glow: Phaser.GameObjects.Rectangle;
  private background: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private colors: ButtonColors;
  private config: BaseButtonConfig;
  private _disabled: boolean = false;

  constructor(scene: Phaser.Scene, config: BaseButtonConfig) {
    this.scene = scene;
    this.config = config;
    this.colors = BUTTON_COLORS[config.style ?? 'primary'];
    this._disabled = config.disabled ?? false;

    const width = config.width ?? 150;
    const height = config.height ?? 44;

    this.container = scene.add.container(config.x, config.y);

    // Glow
    this.glow = scene.add.rectangle(0, 0, width + 8, height + 8, this.colors.glow, 0.1);
    this.container.add(this.glow);

    // Background
    this.background = scene.add.rectangle(0, 0, width, height, this.colors.bg, 0.95);
    this.background.setStrokeStyle(2, this.colors.border);
    this.background.setInteractive({ useHandCursor: true });
    this.container.add(this.background);

    // Text
    this.text = createText(scene, 0, 0, config.label, {
      fontSize: config.fontSize ?? FONTS.SIZE_BUTTON,
      fontFamily: FONTS.FAMILY,
      color: this.colors.text,
      fontStyle: 'bold',
    });
    this.text.setOrigin(0.5, 0.5);
    this.container.add(this.text);

    // Events
    this.background.on('pointerover', this.onPointerOver, this);
    this.background.on('pointerout', this.onPointerOut, this);
    this.background.on('pointerdown', this.onPointerDown, this);

    // Apply initial disabled state
    if (this._disabled) {
      this.applyDisabledStyle();
    }
  }

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  private onPointerOver(): void {
    if (this._disabled) return;

    this.background.setFillStyle(this.colors.bgHover, 1);
    this.background.setStrokeStyle(2, this.colors.borderHover);
    this.glow.setAlpha(0.25);
  }

  private onPointerOut(): void {
    if (this._disabled) return;

    this.background.setFillStyle(this.colors.bg, 0.95);
    this.background.setStrokeStyle(2, this.colors.border);
    this.glow.setAlpha(0.1);
  }

  private onPointerDown(): void {
    if (this._disabled) return;
    this.config.onClick?.();
  }

  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================

  private applyDisabledStyle(): void {
    this.background.setFillStyle(this.colors.bgDisabled, 0.7);
    this.background.setStrokeStyle(2, PALETTE.neutral[600]);
    this.glow.setAlpha(0);
    this.text.setColor(this.colors.textDisabled);
    this.background.disableInteractive();
  }

  private applyEnabledStyle(): void {
    this.background.setFillStyle(this.colors.bg, 0.95);
    this.background.setStrokeStyle(2, this.colors.border);
    this.glow.setAlpha(0.1);
    this.text.setColor(this.colors.text);
    this.background.setInteractive({ useHandCursor: true });
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Enable or disable the button
   */
  setDisabled(disabled: boolean): void {
    if (this._disabled === disabled) return;
    this._disabled = disabled;

    if (disabled) {
      this.applyDisabledStyle();
    } else {
      this.applyEnabledStyle();
    }
  }

  /**
   * Check if button is disabled
   */
  isDisabled(): boolean {
    return this._disabled;
  }

  /**
   * Update button label
   */
  setLabel(label: string): void {
    this.text.setText(label);
  }

  /**
   * Get button label
   */
  getLabel(): string {
    return this.text.text;
  }

  /**
   * Set visibility
   */
  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  /**
   * Pulse animation (for emphasis)
   */
  pulse(): void {
    this.scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.1, to: 0.4 },
      duration: TIMING.PULSE / 2,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Get container for positioning
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Destroy the button
   */
  destroy(): void {
    this.background.off('pointerover', this.onPointerOver, this);
    this.background.off('pointerout', this.onPointerOut, this);
    this.background.off('pointerdown', this.onPointerDown, this);
    this.scene.tweens.killTweensOf(this.glow);
    this.container.destroy();
  }
}
