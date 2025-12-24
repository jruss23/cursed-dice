/**
 * Mercy Blessing Button
 * Simple one-click button to reset the current hand
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS } from '@/config';
import { createText } from '@/ui/ui-utils';
import { GameEventEmitter } from '@/systems/game-events';
import { createLogger } from '@/systems/logger';

const log = createLogger('MercyButton');

export interface MercyBlessingButtonConfig {
  x: number;
  y: number;
  height: number;
  onUse: () => boolean;
  canUse: () => boolean;
}

export class MercyBlessingButton {
  private scene: Phaser.Scene;
  private events: GameEventEmitter;
  private container: Phaser.GameObjects.Container;
  private config: MercyBlessingButtonConfig;

  private buttonBg: Phaser.GameObjects.Rectangle;
  private buttonGlow: Phaser.GameObjects.Rectangle;
  private labelText: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    events: GameEventEmitter,
    config: MercyBlessingButtonConfig
  ) {
    this.scene = scene;
    this.events = events;
    this.config = config;
    this.container = scene.add.container(config.x, config.y);

    this.buttonBg = null!;
    this.buttonGlow = null!;
    this.labelText = null!;

    this.create();
    this.setupEventListeners();
  }

  private create(): void {
    const width = 95;
    const height = this.config.height;

    // Glow - soft gold/white for mercy/divine theme
    this.buttonGlow = this.scene.add.rectangle(0, 0, width + 6, height + 6, PALETTE.gold[400], 0.15);
    this.container.add(this.buttonGlow);

    // Background
    this.buttonBg = this.scene.add.rectangle(0, 0, width, height, PALETTE.gold[700], 0.95);
    this.buttonBg.setStrokeStyle(2, PALETTE.gold[400], 0.8);
    this.buttonBg.setInteractive({ useHandCursor: true });
    this.container.add(this.buttonBg);

    // Label
    this.labelText = createText(this.scene, 0, 0, 'MERCY', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    this.labelText.setOrigin(0.5, 0.5);
    this.container.add(this.labelText);

    // Button interactions
    this.buttonBg.on('pointerover', () => {
      if (this.config.canUse()) {
        this.buttonBg.setFillStyle(PALETTE.gold[600], 1);
        this.buttonGlow.setAlpha(0.3);
      }
    });

    this.buttonBg.on('pointerout', () => {
      this.updateDisplay();
    });

    this.buttonBg.on('pointerdown', () => {
      if (!this.config.canUse()) {
        // Already used - flash to indicate
        this.scene.cameras.main.flash(100, 100, 100, 100);
        return;
      }

      const success = this.config.onUse();
      if (success) {
        log.log('Mercy used!');
        // Divine flash
        this.scene.cameras.main.flash(150, 200, 220, 255);
        this.updateDisplay();
      }
    });

    this.updateDisplay();
  }

  private setupEventListeners(): void {
    this.events.on('blessing:mercy:reset', this.updateDisplay, this);
    this.events.on('blessing:mercy:used', this.updateDisplay, this);
  }

  private updateDisplay = (): void => {
    const canUse = this.config.canUse();

    if (canUse) {
      // Available - gold divine theme
      this.labelText.setText('MERCY');
      this.labelText.setColor(COLORS.TEXT_PRIMARY);
      this.buttonBg.setFillStyle(PALETTE.gold[700], 0.95);
      this.buttonBg.setStrokeStyle(2, PALETTE.gold[400], 0.8);
      this.buttonGlow.setFillStyle(PALETTE.gold[400], 0.15);
      this.buttonBg.setInteractive({ useHandCursor: true });
    } else {
      // Used - dimmed
      this.labelText.setText('SPENT');
      this.labelText.setColor(COLORS.TEXT_MUTED);
      this.buttonBg.setFillStyle(PALETTE.purple[800], 0.7);
      this.buttonBg.setStrokeStyle(2, PALETTE.purple[600], 0.5);
      this.buttonGlow.setAlpha(0);
      this.buttonBg.disableInteractive();
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
    this.events.off('blessing:mercy:reset', this.updateDisplay, this);
    this.events.off('blessing:mercy:used', this.updateDisplay, this);
    this.container.destroy();
  }
}
