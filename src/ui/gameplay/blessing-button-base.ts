/**
 * Base class for Blessing Buttons
 * Provides shared structure for all blessing activation buttons
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, ALPHA } from '@/config';
import { createText } from '@/ui/ui-utils';
import { GameEventEmitter } from '@/systems/game-events';

/** Base config shared by all blessing buttons */
export interface BlessingButtonBaseConfig {
  x: number;
  y: number;
  height: number;
}

/** Standard button dimensions */
export const BLESSING_BUTTON = {
  WIDTH: 95,
  GLOW_PADDING: 6,
} as const;

/**
 * Abstract base class for blessing buttons
 * Subclasses implement create(), setupEventListeners(), updateDisplay(), and cleanupEvents()
 */
export abstract class BlessingButtonBase<TConfig extends BlessingButtonBaseConfig> {
  protected scene: Phaser.Scene;
  protected events: GameEventEmitter;
  protected container: Phaser.GameObjects.Container;
  protected config: TConfig;

  protected buttonBg!: Phaser.GameObjects.Rectangle;
  protected buttonGlow!: Phaser.GameObjects.Rectangle;
  protected labelText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, events: GameEventEmitter, config: TConfig) {
    this.scene = scene;
    this.events = events;
    this.config = config;
    this.container = scene.add.container(config.x, config.y);

    this.create();
    this.setupEventListeners();
  }

  /**
   * Create button visuals and interactions
   * Subclasses should call createButtonBase() then add custom elements
   */
  protected abstract create(): void;

  /**
   * Subscribe to game events
   */
  protected abstract setupEventListeners(): void;

  /**
   * Update visual state based on blessing state
   */
  protected abstract updateDisplay(): void;

  /**
   * Unsubscribe from game events (called by destroy)
   */
  protected abstract cleanupEvents(): void;

  /**
   * Creates the standard glow + background + label elements
   * Call this from create() before adding custom elements
   */
  protected createButtonBase(
    glowColor: number = PALETTE.gold[400],
    bgColor: number = PALETTE.gold[700],
    borderColor: number = PALETTE.gold[400],
    labelY: number = 0
  ): void {
    const width = BLESSING_BUTTON.WIDTH;
    const height = this.config.height;
    const glowPadding = BLESSING_BUTTON.GLOW_PADDING;

    // Glow
    this.buttonGlow = this.scene.add.rectangle(
      0, 0,
      width + glowPadding,
      height + glowPadding,
      glowColor,
      ALPHA.GLOW_MEDIUM
    );
    this.container.add(this.buttonGlow);

    // Background
    this.buttonBg = this.scene.add.rectangle(0, 0, width, height, bgColor, ALPHA.PANEL_OPAQUE);
    this.buttonBg.setStrokeStyle(2, borderColor, ALPHA.BORDER_SOLID);
    this.buttonBg.setInteractive({ useHandCursor: true });
    this.container.add(this.buttonBg);

    // Label
    this.labelText = createText(this.scene, 0, labelY, '', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    this.labelText.setOrigin(0.5, 0.5);
    this.container.add(this.labelText);
  }

  /**
   * Set button to available state (gold theme, interactive)
   */
  protected setAvailableState(label: string): void {
    this.labelText.setText(label);
    this.labelText.setColor(COLORS.TEXT_PRIMARY);
    this.buttonBg.setFillStyle(PALETTE.gold[700], ALPHA.PANEL_OPAQUE);
    this.buttonBg.setStrokeStyle(2, PALETTE.gold[400], ALPHA.BORDER_SOLID);
    this.buttonGlow.setFillStyle(PALETTE.gold[400], ALPHA.GLOW_MEDIUM);
    this.buttonBg.setInteractive({ useHandCursor: true });
  }

  /**
   * Set button to spent/disabled state (purple dimmed theme)
   */
  protected setSpentState(label: string = 'SPENT'): void {
    this.labelText.setText(label);
    this.labelText.setColor(COLORS.TEXT_MUTED);
    this.buttonBg.setFillStyle(PALETTE.purple[800], ALPHA.OVERLAY_MEDIUM);
    this.buttonBg.setStrokeStyle(2, PALETTE.purple[600], ALPHA.BORDER_LIGHT);
    this.buttonGlow.setAlpha(0);
    this.buttonBg.disableInteractive();
  }

  show(): void {
    this.container.setVisible(true);
    this.updateDisplay();
  }

  hide(): void {
    this.container.setVisible(false);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  destroy(): void {
    this.cleanupEvents();
    this.scene.tweens.killTweensOf(this.buttonGlow);
    this.container.destroy();
  }
}
