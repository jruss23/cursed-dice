/**
 * Sanctuary Blessing Button
 * Shows near the dice controls when the Sanctuary Blessing is chosen
 * Allows player to bank current dice or restore banked dice
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, ALPHA } from '@/config';
import { toDPR } from '@/systems/responsive';
import { createText } from '@/ui/ui-utils';
import { GameEventEmitter } from '@/systems/game-events';
import { createLogger } from '@/systems/logger';
import { BlessingButtonBase, BlessingButtonBaseConfig } from './blessing-button-base';

const log = createLogger('SanctuaryBlessingButton');

export interface SanctuaryBlessingButtonConfig extends BlessingButtonBaseConfig {
  onBank: () => boolean; // Returns true if bank succeeded
  onRestore: () => boolean; // Returns true if restore succeeded
  canBank: () => boolean;
  canRestore: () => boolean;
  getBankedValues: () => number[] | null;
}

export class SanctuaryBlessingButton extends BlessingButtonBase<SanctuaryBlessingButtonConfig> {
  private bankedPreview!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    events: GameEventEmitter,
    config: SanctuaryBlessingButtonConfig
  ) {
    super(scene, events, config);
  }

  protected create(): void {
    this.createButtonBase(PALETTE.gold[500], PALETTE.gold[800], PALETTE.gold[500], toDPR(-4));

    // Banked preview (shows small dice values when banking)
    this.bankedPreview = createText(this.scene, 0, toDPR(10), '', {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    this.bankedPreview.setOrigin(0.5, ALPHA.BORDER_LIGHT);
    this.container.add(this.bankedPreview);

    // Button interactions
    this.buttonBg.on('pointerover', () => {
      if (this.config.canBank() || this.config.canRestore()) {
        const hoverColor = this.config.canRestore() ? PALETTE.green[700] : PALETTE.gold[700];
        this.buttonBg.setFillStyle(hoverColor, 1);
        this.buttonGlow.setAlpha(ALPHA.GLOW_HOVER);
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

  protected setupEventListeners(): void {
    this.events.on('blessing:sanctuary:banked', this.updateDisplay, this);
    this.events.on('blessing:sanctuary:restored', this.updateDisplay, this);
    this.events.on('blessing:sanctuary:reset', this.updateDisplay, this);
  }

  protected updateDisplay(): void {
    const canBank = this.config.canBank();
    const canRestore = this.config.canRestore();
    const bankedValues = this.config.getBankedValues();

    // Clear previous state
    this.labelText.setVisible(true);
    this.bankedPreview.setVisible(false);
    this.scene.tweens.killTweensOf(this.buttonGlow);

    if (canBank) {
      // BANK mode - gold theme (storing treasure)
      this.labelText.setText('BANK');
      this.labelText.setColor(COLORS.TEXT_WARNING);
      this.labelText.setY(0); // Centered

      this.buttonBg.setFillStyle(PALETTE.gold[800], ALPHA.PANEL_SOLID);
      this.buttonBg.setStrokeStyle(toDPR(2), PALETTE.gold[500], ALPHA.BORDER_SOLID);
      this.buttonGlow.setFillStyle(PALETTE.gold[500], ALPHA.GLOW_MEDIUM);
      this.buttonBg.setInteractive({ useHandCursor: true });
    } else if (canRestore && bankedValues) {
      // Ready to use - green theme, clickable
      this.labelText.setText('BANKED');
      this.labelText.setColor(COLORS.TEXT_SUCCESS);
      this.labelText.setY(toDPR(-4));

      // Show banked values preview
      this.bankedPreview.setText(bankedValues.join(' '));
      this.bankedPreview.setVisible(true);

      this.buttonBg.setFillStyle(PALETTE.green[800], ALPHA.PANEL_SOLID);
      this.buttonBg.setStrokeStyle(toDPR(2), PALETTE.green[500], ALPHA.BORDER_SOLID);
      this.buttonGlow.setFillStyle(PALETTE.green[500], ALPHA.GLOW_MEDIUM);
      this.buttonBg.setInteractive({ useHandCursor: true });

      // Subtle pulse to draw attention
      this.scene.tweens.add({
        targets: this.buttonGlow,
        alpha: { from: 0.1, to: 0.3 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
      });
    } else if (bankedValues) {
      // Waiting state - banked but need to roll/score first
      this.labelText.setText('BANKED');
      this.labelText.setColor(COLORS.TEXT_MUTED);
      this.labelText.setY(toDPR(-4));

      // Show banked values preview
      this.bankedPreview.setText(bankedValues.join(' '));
      this.bankedPreview.setVisible(true);

      this.buttonBg.setFillStyle(PALETTE.purple[800], ALPHA.BORDER_SOLID);
      this.buttonBg.setStrokeStyle(toDPR(2), PALETTE.purple[500], ALPHA.BORDER_MEDIUM);
      this.buttonGlow.setAlpha(ALPHA.GLOW_SUBTLE);
      this.buttonBg.disableInteractive();
    } else {
      // Spent - dimmed
      this.setSpentState('SPENT');
      this.labelText.setY(0); // Centered
    }
  }

  protected cleanupEvents(): void {
    this.events.off('blessing:sanctuary:banked', this.updateDisplay, this);
    this.events.off('blessing:sanctuary:restored', this.updateDisplay, this);
    this.events.off('blessing:sanctuary:reset', this.updateDisplay, this);
  }
}
