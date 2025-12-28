/**
 * Sixth Blessing Activation Button
 * Shows near the dice controls when the Sixth Blessing is chosen
 * Allows player to activate the blessing for the next roll
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, ALPHA } from '@/config';
import { createText } from '@/ui/ui-utils';
import { GameEventEmitter } from '@/systems/game-events';
import { createLogger } from '@/systems/logger';
import { BlessingButtonBase, BlessingButtonBaseConfig } from './blessing-button-base';

const log = createLogger('SixthBlessingButton');

export interface SixthBlessingButtonConfig extends BlessingButtonBaseConfig {
  onActivate: () => boolean; // Returns true if activation succeeded
  getCharges: () => number;
  isActive: () => boolean;
}

export class SixthBlessingButton extends BlessingButtonBase<SixthBlessingButtonConfig> {
  private chargesText!: Phaser.GameObjects.Text;
  private activeIndicator!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    events: GameEventEmitter,
    config: SixthBlessingButtonConfig
  ) {
    super(scene, events, config);
  }

  protected create(): void {
    this.createButtonBase(PALETTE.gold[500], PALETTE.gold[800], PALETTE.gold[500]);

    // Label: +1 emoji (left side)
    this.labelText.setX(-18);
    this.labelText.setText('+1🎲');
    this.labelText.setColor(COLORS.TEXT_WARNING);
    this.labelText.setOrigin(0.5, ALPHA.BORDER_LIGHT);

    // Charges indicator: (3/3) - right side, inline
    this.chargesText = createText(this.scene, 24, 0, '', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    this.chargesText.setOrigin(0.5, ALPHA.BORDER_LIGHT);
    this.container.add(this.chargesText);

    // Active indicator (shows when blessing is in use)
    this.activeIndicator = createText(this.scene, 0, 0, '✓', {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    this.activeIndicator.setOrigin(0.5, ALPHA.BORDER_LIGHT);
    this.activeIndicator.setVisible(false);
    this.container.add(this.activeIndicator);

    // Button interactions
    this.buttonBg.on('pointerover', () => {
      if (!this.config.isActive() && this.config.getCharges() > 0) {
        this.buttonBg.setFillStyle(PALETTE.gold[700], 1);
        this.buttonGlow.setAlpha(ALPHA.GLOW_HOVER);
      }
    });

    this.buttonBg.on('pointerout', () => {
      this.buttonBg.setFillStyle(PALETTE.gold[800], ALPHA.PANEL_SOLID);
      this.buttonGlow.setAlpha(ALPHA.GLOW_MEDIUM);
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

  protected setupEventListeners(): void {
    this.events.on('blessing:sixth:deactivated', this.updateDisplay, this);
    this.events.on('blessing:sixth:activated', this.updateDisplay, this);
    this.events.on('blessing:sixth:reset', this.updateDisplay, this);
  }

  protected updateDisplay = (): void => {
    const charges = this.config.getCharges();
    const isActive = this.config.isActive();

    this.chargesText.setText(`(${charges}/3)`);

    if (isActive) {
      // Show active state - transparent bg to show it's not clickable
      this.labelText.setVisible(false);
      this.chargesText.setVisible(false);
      this.activeIndicator.setVisible(true);
      this.buttonBg.setFillStyle(PALETTE.green[800], ALPHA.DISABLED_STRONG);
      this.buttonBg.setStrokeStyle(1, PALETTE.green[500], ALPHA.BORDER_SUBTLE);
      this.buttonGlow.setAlpha(0);
      this.buttonBg.disableInteractive();
    } else {
      // Show normal state
      this.labelText.setVisible(true);
      this.chargesText.setVisible(true);
      this.activeIndicator.setVisible(false);
      this.scene.tweens.killTweensOf(this.buttonGlow);

      if (charges > 0) {
        this.buttonBg.setFillStyle(PALETTE.gold[800], ALPHA.PANEL_SOLID);
        this.buttonBg.setStrokeStyle(2, PALETTE.gold[500], ALPHA.BORDER_SOLID);
        this.buttonGlow.setFillStyle(PALETTE.gold[500], ALPHA.DISABLED_STRONG);
        this.buttonBg.setInteractive({ useHandCursor: true });
        this.labelText.setAlpha(1);
        this.chargesText.setAlpha(1);
      } else {
        // No charges - dim the button
        this.buttonBg.setFillStyle(PALETTE.purple[800], ALPHA.OVERLAY_MEDIUM);
        this.buttonBg.setStrokeStyle(2, PALETTE.purple[600], ALPHA.BORDER_LIGHT);
        this.buttonGlow.setAlpha(0);
        this.buttonBg.disableInteractive();
        this.labelText.setAlpha(ALPHA.DISABLED);
        this.chargesText.setAlpha(ALPHA.DISABLED);
      }
    }
  };

  protected cleanupEvents(): void {
    this.events.off('blessing:sixth:deactivated', this.updateDisplay, this);
    this.events.off('blessing:sixth:activated', this.updateDisplay, this);
    this.events.off('blessing:sixth:reset', this.updateDisplay, this);
  }
}
