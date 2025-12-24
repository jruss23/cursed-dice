/**
 * Sixth Blessing Activation Button
 * Shows near the dice controls when the Sixth Blessing is chosen
 * Allows player to activate the blessing for the next roll
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS } from '@/config';
import { createText } from '@/ui/ui-utils';
import { GameEventEmitter } from '@/systems/game-events';
import { createLogger } from '@/systems/logger';

const log = createLogger('SixthBlessingButton');

export interface SixthBlessingButtonConfig {
  x: number;
  y: number;
  height: number; // Should match roll button height
  onActivate: () => boolean; // Returns true if activation succeeded
  getCharges: () => number;
  isActive: () => boolean;
}

export class SixthBlessingButton {
  private scene: Phaser.Scene;
  private events: GameEventEmitter;
  private container: Phaser.GameObjects.Container;
  private config: SixthBlessingButtonConfig;

  private buttonBg: Phaser.GameObjects.Rectangle;
  private buttonGlow: Phaser.GameObjects.Rectangle;
  private labelText: Phaser.GameObjects.Text;
  private chargesText: Phaser.GameObjects.Text;
  private activeIndicator: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    events: GameEventEmitter,
    config: SixthBlessingButtonConfig
  ) {
    this.scene = scene;
    this.events = events;
    this.config = config;
    this.container = scene.add.container(config.x, config.y);

    this.buttonBg = null!;
    this.buttonGlow = null!;
    this.labelText = null!;
    this.chargesText = null!;
    this.activeIndicator = null!;

    this.create();
    this.setupEventListeners();
  }

  private create(): void {
    const width = 95; // Wide enough for "+1🎲 (3/3)" with padding
    const height = this.config.height; // Match roll button height

    // Glow
    this.buttonGlow = this.scene.add.rectangle(0, 0, width + 6, height + 6, PALETTE.gold[500], 0.12);
    this.container.add(this.buttonGlow);

    // Background
    this.buttonBg = this.scene.add.rectangle(0, 0, width, height, PALETTE.gold[800], 0.95);
    this.buttonBg.setStrokeStyle(2, PALETTE.gold[500], 0.7);
    this.buttonBg.setInteractive({ useHandCursor: true });
    this.container.add(this.buttonBg);

    // Label: +1 emoji (left side)
    this.labelText = createText(this.scene, -18, 0, '+1🎲', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
      fontStyle: 'bold',
    });
    this.labelText.setOrigin(0.5, 0.5);
    this.container.add(this.labelText);

    // Charges indicator: (3/3) - right side, inline
    this.chargesText = createText(this.scene, 24, 0, '', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    this.chargesText.setOrigin(0.5, 0.5);
    this.container.add(this.chargesText);

    // Active indicator (shows when blessing is in use)
    this.activeIndicator = createText(this.scene, 0, 0, '✓', {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    this.activeIndicator.setOrigin(0.5, 0.5);
    this.activeIndicator.setVisible(false);
    this.container.add(this.activeIndicator);

    // Button interactions
    this.buttonBg.on('pointerover', () => {
      if (!this.config.isActive() && this.config.getCharges() > 0) {
        this.buttonBg.setFillStyle(PALETTE.gold[700], 1);
        this.buttonGlow.setAlpha(0.3);
      }
    });

    this.buttonBg.on('pointerout', () => {
      this.buttonBg.setFillStyle(PALETTE.gold[800], 0.9);
      this.buttonGlow.setAlpha(0.15);
    });

    this.buttonBg.on('pointerdown', () => {
      if (this.config.isActive()) {
        // Already active - flash to indicate
        this.scene.cameras.main.flash(100, 255, 200, 50);
        return;
      }

      if (this.config.getCharges() <= 0) {
        // No charges - flash red
        this.scene.cameras.main.flash(100, 255, 50, 50);
        return;
      }

      const success = this.config.onActivate();
      if (success) {
        log.log('Sixth Blessing activated!');
        this.updateDisplay();

        // Visual feedback
        this.scene.cameras.main.flash(100, 255, 215, 50);
      }
    });

    this.updateDisplay();
  }

  private setupEventListeners(): void {
    // Update when blessing state changes (using context parameter for safe cleanup)
    this.events.on('blessing:sixth:deactivated', this.updateDisplay, this);
    this.events.on('blessing:sixth:activated', this.updateDisplay, this);
    this.events.on('blessing:sixth:reset', this.updateDisplay, this);
  }

  private updateDisplay = (): void => {
    const charges = this.config.getCharges();
    const isActive = this.config.isActive();

    this.chargesText.setText(`(${charges}/3)`);

    if (isActive) {
      // Show active state - transparent bg to show it's not clickable
      this.labelText.setVisible(false);
      this.chargesText.setVisible(false);
      this.activeIndicator.setVisible(true);
      this.buttonBg.setFillStyle(PALETTE.green[800], 0.15); // Nearly transparent
      this.buttonBg.setStrokeStyle(1, PALETTE.green[500], 0.4); // Subtle border
      this.buttonGlow.setAlpha(0); // No glow
      this.buttonBg.disableInteractive(); // Can't click while active
    } else {
      // Show normal state
      this.labelText.setVisible(true);
      this.chargesText.setVisible(true);
      this.activeIndicator.setVisible(false);
      this.scene.tweens.killTweensOf(this.buttonGlow);

      if (charges > 0) {
        this.buttonBg.setFillStyle(PALETTE.gold[800], 0.9);
        this.buttonBg.setStrokeStyle(2, PALETTE.gold[500], 0.8);
        this.buttonGlow.setFillStyle(PALETTE.gold[500], 0.15);
        this.buttonBg.setInteractive({ useHandCursor: true });
        this.labelText.setAlpha(1);
        this.chargesText.setAlpha(1);
      } else {
        // No charges - dim the button
        this.buttonBg.setFillStyle(PALETTE.purple[800], 0.7);
        this.buttonBg.setStrokeStyle(2, PALETTE.purple[600], 0.5);
        this.buttonGlow.setAlpha(0);
        this.buttonBg.disableInteractive();
        this.labelText.setAlpha(0.5);
        this.chargesText.setAlpha(0.5);
      }
    }
  };

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
    this.events.off('blessing:sixth:deactivated', this.updateDisplay, this);
    this.events.off('blessing:sixth:activated', this.updateDisplay, this);
    this.events.off('blessing:sixth:reset', this.updateDisplay, this);
    this.container.destroy();
  }
}
