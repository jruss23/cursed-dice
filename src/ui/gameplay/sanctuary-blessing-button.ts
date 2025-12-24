/**
 * Sanctuary Blessing Button
 * Shows near the dice controls when the Sanctuary Blessing is chosen
 * Allows player to bank current dice or restore banked dice
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS } from '@/config';
import { createText } from '@/ui/ui-utils';
import { GameEventEmitter } from '@/systems/game-events';
import { createLogger } from '@/systems/logger';

const log = createLogger('SanctuaryBlessingButton');

export interface SanctuaryBlessingButtonConfig {
  x: number;
  y: number;
  height: number;
  onBank: () => boolean; // Returns true if bank succeeded
  onRestore: () => boolean; // Returns true if restore succeeded
  canBank: () => boolean;
  canRestore: () => boolean;
  getBankedValues: () => number[] | null;
}

export class SanctuaryBlessingButton {
  private scene: Phaser.Scene;
  private events: GameEventEmitter;
  private container: Phaser.GameObjects.Container;
  private config: SanctuaryBlessingButtonConfig;

  private buttonBg: Phaser.GameObjects.Rectangle;
  private buttonGlow: Phaser.GameObjects.Rectangle;
  private labelText: Phaser.GameObjects.Text;
  private bankedPreview: Phaser.GameObjects.Text;
  private usedIndicator: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    events: GameEventEmitter,
    config: SanctuaryBlessingButtonConfig
  ) {
    this.scene = scene;
    this.events = events;
    this.config = config;
    this.container = scene.add.container(config.x, config.y);

    this.buttonBg = null!;
    this.buttonGlow = null!;
    this.labelText = null!;
    this.bankedPreview = null!;
    this.usedIndicator = null!;

    this.create();
    this.setupEventListeners();
  }

  private create(): void {
    const width = 95;
    const height = this.config.height;

    // Glow - gold theme for sanctuary (storing treasure)
    this.buttonGlow = this.scene.add.rectangle(0, 0, width + 6, height + 6, PALETTE.gold[500], 0.12);
    this.container.add(this.buttonGlow);

    // Background
    this.buttonBg = this.scene.add.rectangle(0, 0, width, height, PALETTE.gold[800], 0.95);
    this.buttonBg.setStrokeStyle(2, PALETTE.gold[500], 0.7);
    this.buttonBg.setInteractive({ useHandCursor: true });
    this.container.add(this.buttonBg);

    // Label
    this.labelText = createText(this.scene, 0, -4, '', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    this.labelText.setOrigin(0.5, 0.5);
    this.container.add(this.labelText);

    // Banked preview (shows small dice values when banking)
    this.bankedPreview = createText(this.scene, 0, 10, '', {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    this.bankedPreview.setOrigin(0.5, 0.5);
    this.container.add(this.bankedPreview);

    // Used indicator (shows when blessing is spent)
    this.usedIndicator = createText(this.scene, 0, 0, 'USED', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_MUTED,
      fontStyle: 'bold',
    });
    this.usedIndicator.setOrigin(0.5, 0.5);
    this.usedIndicator.setVisible(false);
    this.container.add(this.usedIndicator);

    // Button interactions
    this.buttonBg.on('pointerover', () => {
      if (this.config.canBank() || this.config.canRestore()) {
        const hoverColor = this.config.canRestore() ? PALETTE.green[700] : PALETTE.gold[700];
        this.buttonBg.setFillStyle(hoverColor, 1);
        this.buttonGlow.setAlpha(0.3);
      }
    });

    this.buttonBg.on('pointerout', () => {
      this.updateDisplay();
    });

    this.buttonBg.on('pointerdown', () => {
      if (this.config.canRestore()) {
        const success = this.config.onRestore();
        if (success) {
          log.log('Sanctuary restored!');
          this.updateDisplay();
          // Green flash for restore
          this.scene.cameras.main.flash(100, 50, 255, 100);
        }
      } else if (this.config.canBank()) {
        const success = this.config.onBank();
        if (success) {
          log.log('Dice banked!');
          this.updateDisplay();
          // Cyan flash for bank
          this.scene.cameras.main.flash(100, 50, 200, 255);
        }
      } else {
        // Already used - flash to indicate
        this.scene.cameras.main.flash(100, 100, 100, 100);
      }
    });

    this.updateDisplay();
  }

  private setupEventListeners(): void {
    this.events.on('blessing:sanctuary:banked', this.updateDisplay, this);
    this.events.on('blessing:sanctuary:restored', this.updateDisplay, this);
    this.events.on('blessing:sanctuary:reset', this.updateDisplay, this);
  }

  private updateDisplay = (): void => {
    const canBank = this.config.canBank();
    const canRestore = this.config.canRestore();
    const bankedValues = this.config.getBankedValues();

    // Clear previous state
    this.labelText.setVisible(true);
    this.bankedPreview.setVisible(false);
    this.usedIndicator.setVisible(false);
    this.scene.tweens.killTweensOf(this.buttonGlow);

    if (canRestore && bankedValues) {
      // RESTORE mode - green theme, show banked values
      this.labelText.setText('RESTORE');
      this.labelText.setColor(COLORS.TEXT_SUCCESS);
      this.labelText.setY(-4);

      // Show banked values preview
      this.bankedPreview.setText(bankedValues.join(' '));
      this.bankedPreview.setVisible(true);

      this.buttonBg.setFillStyle(PALETTE.green[800], 0.9);
      this.buttonBg.setStrokeStyle(2, PALETTE.green[500], 0.8);
      this.buttonGlow.setFillStyle(PALETTE.green[500], 0.15);
      this.buttonBg.setInteractive({ useHandCursor: true });

      // Subtle pulse to draw attention
      this.scene.tweens.add({
        targets: this.buttonGlow,
        alpha: { from: 0.1, to: 0.3 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
      });
    } else if (canBank) {
      // BANK mode - gold theme (storing treasure)
      this.labelText.setText('BANK');
      this.labelText.setColor(COLORS.TEXT_WARNING);
      this.labelText.setY(0);

      this.buttonBg.setFillStyle(PALETTE.gold[800], 0.9);
      this.buttonBg.setStrokeStyle(2, PALETTE.gold[500], 0.8);
      this.buttonGlow.setFillStyle(PALETTE.gold[500], 0.15);
      this.buttonBg.setInteractive({ useHandCursor: true });
    } else {
      // Used up - dimmed
      this.labelText.setVisible(false);
      this.usedIndicator.setVisible(true);

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
    this.events.off('blessing:sanctuary:banked', this.updateDisplay, this);
    this.events.off('blessing:sanctuary:restored', this.updateDisplay, this);
    this.events.off('blessing:sanctuary:reset', this.updateDisplay, this);
    this.scene.tweens.killTweensOf(this.buttonGlow);
    this.container.destroy();
  }
}
