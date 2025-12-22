/**
 * Flickering Title
 * Animated game title with glow and glitch effects
 */

import Phaser from 'phaser';
import { FONTS, PALETTE } from '@/config';
import { createText, hexToColorString } from '@/ui/ui-utils';

export class FlickeringTitle {
  private scene: Phaser.Scene;
  private titleText: Phaser.GameObjects.Text;
  private titleGlow: Phaser.GameObjects.Text;
  private glowLayers: Phaser.GameObjects.Text[] = [];
  private tweens: Phaser.Tweens.Tween[] = [];
  private timerEvent: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, centerX: number, y: number = 85) {
    this.scene = scene;

    // Create multiple glow layers for depth using PALETTE colors
    const glowColors = [PALETTE.purple[900], PALETTE.purple[700], PALETTE.purple[600]];

    glowColors.forEach((color, i) => {
      const glow = createText(this.scene, centerX, y, 'CURSED DICE', {
        fontSize: FONTS.SIZE_MENU_TITLE,
        fontFamily: FONTS.FAMILY,
        color: hexToColorString(color),
        fontStyle: 'bold',
      });
      glow.setOrigin(0.5, 0.5);
      glow.setAlpha(0.3 - i * 0.08);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setScale(1.02 + i * 0.02);
      this.glowLayers.push(glow);

      const tween = this.scene.tweens.add({
        targets: glow,
        alpha: glow.alpha + 0.15,
        scaleX: glow.scaleX + 0.02,
        scaleY: glow.scaleY + 0.02,
        duration: 2000 + i * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.tweens.push(tween);
    });

    // Main title glow
    this.titleGlow = createText(this.scene, centerX, y, 'CURSED DICE', {
      fontSize: FONTS.SIZE_MENU_TITLE,
      fontFamily: FONTS.FAMILY,
      color: hexToColorString(PALETTE.purple[400]),
      fontStyle: 'bold',
    });
    this.titleGlow.setOrigin(0.5, 0.5);
    this.titleGlow.setAlpha(0.5);
    this.titleGlow.setBlendMode(Phaser.BlendModes.ADD);

    // Main title
    this.titleText = createText(this.scene, centerX, y, 'CURSED DICE', {
      fontSize: FONTS.SIZE_MENU_TITLE,
      fontFamily: FONTS.FAMILY,
      color: hexToColorString(PALETTE.purple[200]),
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5, 0.5);

    // Glitch/flicker effect
    this.timerEvent = this.scene.time.addEvent({
      delay: Phaser.Math.Between(3000, 8000),
      callback: () => {
        if (!this.titleText || !this.titleGlow) return;

        // Quick glitch
        const originalX = this.titleText.x;
        const glitchAmount = Phaser.Math.Between(2, 6);

        const glitchTween = this.scene.tweens.add({
          targets: [this.titleText, this.titleGlow],
          x: originalX + glitchAmount,
          alpha: 0.7,
          duration: 50,
          yoyo: true,
          repeat: Phaser.Math.Between(2, 5),
          onComplete: () => {
            if (this.titleText) this.titleText.x = originalX;
            if (this.titleGlow) this.titleGlow.x = originalX;
          },
        });
        this.tweens.push(glitchTween);
      },
      loop: true,
    });

    // Continuous glow pulse
    const glowPulseTween = this.scene.tweens.add({
      targets: this.titleGlow,
      alpha: 0.8,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.push(glowPulseTween);
  }

  /**
   * Get the main title text element (for external access if needed)
   */
  getTitleText(): Phaser.GameObjects.Text {
    return this.titleText;
  }

  /**
   * Get the glow text element (for external access if needed)
   */
  getTitleGlow(): Phaser.GameObjects.Text {
    return this.titleGlow;
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    // Stop all tweens
    this.tweens.forEach(tween => {
      if (tween.isPlaying()) {
        tween.stop();
      }
    });
    this.tweens = [];

    // Stop timer event
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }

    // Destroy text objects
    this.glowLayers.forEach(glow => glow.destroy());
    this.glowLayers = [];

    if (this.titleGlow) {
      this.titleGlow.destroy();
    }
    if (this.titleText) {
      this.titleText.destroy();
    }
  }
}
