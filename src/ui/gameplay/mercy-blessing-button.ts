/**
 * Mercy Blessing Button
 * Simple one-click button to reset the current hand
 */

import Phaser from 'phaser';
import { PALETTE, ALPHA, TIMING } from '@/config';
import { GameEventEmitter } from '@/systems/game-events';
import { createLogger } from '@/systems/logger';
import { BlessingButtonBase, BlessingButtonBaseConfig } from './blessing-button-base';

const log = createLogger('MercyButton');

export interface MercyBlessingButtonConfig extends BlessingButtonBaseConfig {
  onUse: () => boolean;
  canUse: () => boolean;
}

export class MercyBlessingButton extends BlessingButtonBase<MercyBlessingButtonConfig> {
  constructor(
    scene: Phaser.Scene,
    events: GameEventEmitter,
    config: MercyBlessingButtonConfig
  ) {
    super(scene, events, config);
  }

  protected create(): void {
    this.createButtonBase();
    this.labelText.setText('MERCY');

    // Button interactions
    this.buttonBg.on('pointerover', () => {
      if (this.config.canUse()) {
        this.buttonBg.setFillStyle(PALETTE.gold[600], 1);
        this.buttonGlow.setAlpha(ALPHA.GLOW_HOVER);
      }
    });

    this.buttonBg.on('pointerout', () => {
      this.updateDisplay();
    });

    this.buttonBg.on('pointerdown', () => {
      if (!this.config.canUse()) {
        // Already used - flash to indicate
        this.scene.cameras.main.flash(TIMING.CAMERA_FLASH_SHORT, 100, 100, 100);
        return;
      }

      const success = this.config.onUse();
      if (success) {
        log.log('Mercy used!');
        // Divine flash
        this.scene.cameras.main.flash(TIMING.CAMERA_FLASH_NORMAL, 200, 220, 255);
        this.updateDisplay();
      }
    });

    this.updateDisplay();
  }

  protected setupEventListeners(): void {
    this.events.on('blessing:mercy:reset', this.updateDisplay, this);
    this.events.on('blessing:mercy:used', this.updateDisplay, this);
  }

  protected updateDisplay(): void {
    if (this.config.canUse()) {
      this.setAvailableState('MERCY');
    } else {
      this.setSpentState('SPENT');
    }
  }

  protected cleanupEvents(): void {
    this.events.off('blessing:mercy:reset', this.updateDisplay, this);
    this.events.off('blessing:mercy:used', this.updateDisplay, this);
  }
}
