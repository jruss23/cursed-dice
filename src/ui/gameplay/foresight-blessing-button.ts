/**
 * Foresight Blessing Activation Button
 * Shows near the dice controls when the Foresight Blessing is chosen
 * Allows player to preview the next roll before committing
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS } from '@/config';
import { createText } from '@/ui/ui-utils';
import { GameEventEmitter } from '@/systems/game-events';
import { createLogger } from '@/systems/logger';

const log = createLogger('ForesightButton');

export interface ForesightBlessingButtonConfig {
  x: number;
  y: number;
  height: number;
  onActivate: () => boolean; // Returns true if activation succeeded
  getCharges: () => number;
  isPreviewActive: () => boolean;
  canActivate: () => boolean; // Check if player has rerolls to spend
}

export class ForesightBlessingButton {
  private scene: Phaser.Scene;
  private events: GameEventEmitter;
  private container: Phaser.GameObjects.Container;
  private config: ForesightBlessingButtonConfig;

  private buttonBg: Phaser.GameObjects.Rectangle;
  private buttonGlow: Phaser.GameObjects.Rectangle;
  private labelText: Phaser.GameObjects.Text;
  private chargesText: Phaser.GameObjects.Text;
  private activeIndicator: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    events: GameEventEmitter,
    config: ForesightBlessingButtonConfig
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
    const width = 95;
    const height = this.config.height;

    // Glow
    this.buttonGlow = this.scene.add.rectangle(0, 0, width + 6, height + 6, PALETTE.purple[400], 0.12);
    this.container.add(this.buttonGlow);

    // Background - purple/mystical theme for foresight
    this.buttonBg = this.scene.add.rectangle(0, 0, width, height, PALETTE.purple[700], 0.95);
    this.buttonBg.setStrokeStyle(2, PALETTE.purple[400], 0.7);
    this.buttonBg.setInteractive({ useHandCursor: true });
    this.container.add(this.buttonBg);

    // Label: crystal ball emoji
    this.labelText = createText(this.scene, -18, 0, '🔮', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    this.labelText.setOrigin(0.5, 0.5);
    this.container.add(this.labelText);

    // Charges indicator
    this.chargesText = createText(this.scene, 24, 0, '', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    this.chargesText.setOrigin(0.5, 0.5);
    this.container.add(this.chargesText);

    // Active indicator (shows when preview is being shown)
    this.activeIndicator = createText(this.scene, 0, 0, '👁️', {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
    });
    this.activeIndicator.setOrigin(0.5, 0.5);
    this.activeIndicator.setVisible(false);
    this.container.add(this.activeIndicator);

    // Button interactions
    this.buttonBg.on('pointerover', () => {
      if (!this.config.isPreviewActive() && this.config.getCharges() > 0 && this.config.canActivate()) {
        this.buttonBg.setFillStyle(PALETTE.purple[600], 1);
        this.buttonGlow.setAlpha(0.3);
      }
    });

    this.buttonBg.on('pointerout', () => {
      this.buttonBg.setFillStyle(PALETTE.purple[700], 0.95);
      this.buttonGlow.setAlpha(0.12);
    });

    this.buttonBg.on('pointerdown', () => {
      if (this.config.isPreviewActive()) {
        // Already showing preview - flash to indicate
        this.scene.cameras.main.flash(100, 150, 100, 200);
        return;
      }

      if (this.config.getCharges() <= 0) {
        // No charges - flash red
        this.scene.cameras.main.flash(100, 255, 50, 50);
        return;
      }

      if (!this.config.canActivate()) {
        // Can't activate (no rerolls) - flash orange
        this.scene.cameras.main.flash(100, 255, 150, 50);
        return;
      }

      const success = this.config.onActivate();
      if (success) {
        log.log('Foresight Blessing activated!');
        this.updateDisplay();

        // Mystical visual feedback
        this.scene.cameras.main.flash(100, 150, 100, 255);
      }
    });

    this.updateDisplay();
  }

  private setupEventListeners(): void {
    this.events.on('blessing:foresight:cleared', this.updateDisplay, this);
    this.events.on('blessing:foresight:activated', this.updateDisplay, this);
    this.events.on('blessing:foresight:reset', this.updateDisplay, this);
    this.events.on('blessing:foresight:accepted', this.updateDisplay, this);
    this.events.on('blessing:foresight:rejected', this.updateDisplay, this);
  }

  private updateDisplay = (): void => {
    const charges = this.config.getCharges();
    const isActive = this.config.isPreviewActive();

    this.chargesText.setText(`(${charges}/3)`);

    if (isActive) {
      // Show active state - preview is being displayed
      this.labelText.setVisible(false);
      this.chargesText.setVisible(false);
      this.activeIndicator.setVisible(true);
      this.buttonBg.setFillStyle(PALETTE.purple[600], 0.3);
      this.buttonBg.setStrokeStyle(1, PALETTE.purple[400], 0.5);
      this.buttonGlow.setAlpha(0.05);
      this.buttonBg.disableInteractive();

      // Pulse the active indicator
      this.scene.tweens.add({
        targets: this.activeIndicator,
        alpha: 0.5,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      // Show normal state
      this.labelText.setVisible(true);
      this.chargesText.setVisible(true);
      this.activeIndicator.setVisible(false);
      this.scene.tweens.killTweensOf(this.activeIndicator);
      this.scene.tweens.killTweensOf(this.buttonGlow);

      if (charges > 0) {
        this.buttonBg.setFillStyle(PALETTE.purple[700], 0.95);
        this.buttonBg.setStrokeStyle(2, PALETTE.purple[400], 0.7);
        this.buttonGlow.setFillStyle(PALETTE.purple[400], 0.12);
        this.buttonBg.setInteractive({ useHandCursor: true });
        this.labelText.setAlpha(1);
        this.chargesText.setAlpha(1);
      } else {
        // No charges - dim the button
        this.buttonBg.setFillStyle(PALETTE.neutral[800], 0.7);
        this.buttonBg.setStrokeStyle(2, PALETTE.neutral[600], 0.5);
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
    this.events.off('blessing:foresight:cleared', this.updateDisplay, this);
    this.events.off('blessing:foresight:activated', this.updateDisplay, this);
    this.events.off('blessing:foresight:reset', this.updateDisplay, this);
    this.events.off('blessing:foresight:accepted', this.updateDisplay, this);
    this.events.off('blessing:foresight:rejected', this.updateDisplay, this);
    this.scene.tweens.killTweensOf(this.activeIndicator);
    this.container.destroy();
  }
}
