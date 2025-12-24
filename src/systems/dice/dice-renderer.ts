/**
 * Dice Renderer
 * Handles visual creation and animation of dice
 * Extracted from DiceManager for better separation of concerns
 */

import Phaser from 'phaser';
import { COLORS, SIZES, FONTS, PALETTE } from '@/config';
import { createText } from '@/ui/ui-utils';

// =============================================================================
// TYPES
// =============================================================================

export interface DiceSprite {
  container: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;
  bg: Phaser.GameObjects.Rectangle;
  innerBg: Phaser.GameObjects.Rectangle;
  shine: Phaser.GameObjects.Graphics;
  pipsGraphics: Phaser.GameObjects.Graphics;
  lockIndicator: Phaser.GameObjects.Text;
  lockIcon: Phaser.GameObjects.Graphics;
  cursedIcon: Phaser.GameObjects.Graphics;
  glowGraphics: Phaser.GameObjects.Graphics;
  originalX: number;
  originalY: number;
}

export interface DiceSizeConfig {
  size: number;
  spacing: number;
  pipRadius: number;
  pipOffset: number;
}

/** Pip position multipliers (normalized to pip offset) */
const PIP_LAYOUT: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 0, y: 0 }],
  2: [{ x: -1, y: -1 }, { x: 1, y: 1 }],
  3: [{ x: -1, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 1 }],
  4: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }],
  5: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 0, y: 0 }, { x: -1, y: 1 }, { x: 1, y: 1 }],
  6: [{ x: -1, y: -1 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
};

/** Get pip positions for a value with scaled offset */
function getPipPositions(value: number, pipOffset: number): { x: number; y: number }[] {
  return PIP_LAYOUT[value].map(p => ({ x: p.x * pipOffset, y: p.y * pipOffset }));
}

// =============================================================================
// DICE RENDERER
// =============================================================================

export class DiceRenderer {
  private scene: Phaser.Scene;
  private sizeConfig: DiceSizeConfig;

  constructor(scene: Phaser.Scene, sizeConfig: DiceSizeConfig) {
    this.scene = scene;
    this.sizeConfig = sizeConfig;
  }

  /**
   * Update size configuration (for responsive layouts)
   */
  setSizeConfig(config: DiceSizeConfig): void {
    this.sizeConfig = config;
  }

  /**
   * Create a single die sprite with all visual elements
   */
  createDieSprite(
    x: number,
    y: number,
    index: number,
    onDieClicked: (index: number) => void,
    onHover: (sprite: DiceSprite, isHovered: boolean, isLocked: boolean, isCursed: boolean) => void
  ): DiceSprite {
    const container = this.scene.add.container(x, y);
    const size = this.sizeConfig.size;

    // Shadow beneath die (centered)
    const shadow = this.scene.add.ellipse(0, size / 2 + 6, size * 0.85, size * 0.25, 0x000000, 0.4);
    container.add(shadow);

    // Glow effect (behind die)
    const glowGraphics = this.scene.add.graphics();
    container.add(glowGraphics);

    // Die outer background (border effect)
    const bg = this.scene.add.rectangle(0, 0, size, size, PALETTE.neutral[700], 1);
    bg.setStrokeStyle(2, PALETTE.neutral[500]);
    container.add(bg);

    // Die inner background (face)
    const innerBg = this.scene.add.rectangle(0, 0, size - 6, size - 6, PALETTE.neutral[700], 1);
    container.add(innerBg);

    // Shine/highlight effect
    const shine = this.scene.add.graphics();
    shine.fillStyle(0xffffff, 0.06);
    shine.fillRoundedRect(-size / 2 + 5, -size / 2 + 5, size - 16, 10, 3);
    container.add(shine);

    // Pips graphics
    const pipsGraphics = this.scene.add.graphics();
    container.add(pipsGraphics);

    // Lock indicator text (legacy, kept for compatibility)
    const lockIndicator = createText(this.scene, 0, size / 2 + 16, '', {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_MUTED,
      fontStyle: 'bold',
    });
    lockIndicator.setOrigin(0.5, 0.5);
    container.add(lockIndicator);

    // Hold icon graphic (green checkmark)
    const lockIcon = this.scene.add.graphics();
    const iconY = size / 2 + 16;
    const checkColor = PALETTE.green[400];
    lockIcon.lineStyle(3, checkColor, 1);
    lockIcon.beginPath();
    lockIcon.moveTo(-6, iconY - 1);
    lockIcon.lineTo(-2, iconY + 4);
    lockIcon.lineTo(7, iconY - 5);
    lockIcon.strokePath();
    lockIcon.setVisible(false);
    container.add(lockIcon);

    // Cursed icon graphic (purple skull)
    const cursedIcon = this.scene.add.graphics();
    const cursedColor = PALETTE.purple[400];
    cursedIcon.fillStyle(cursedColor, 1);
    cursedIcon.fillCircle(0, iconY - 2, 6);
    cursedIcon.fillRoundedRect(-4, iconY + 2, 8, 4, 2);
    cursedIcon.fillStyle(0x000000, 1);
    cursedIcon.fillCircle(-2, iconY - 3, 1.5);
    cursedIcon.fillCircle(2, iconY - 3, 1.5);
    cursedIcon.setVisible(false);
    container.add(cursedIcon);

    const sprite: DiceSprite = {
      container,
      shadow,
      bg,
      innerBg,
      shine,
      pipsGraphics,
      lockIndicator,
      lockIcon,
      cursedIcon,
      glowGraphics,
      originalX: x,
      originalY: y,
    };

    // Make interactive
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => onDieClicked(index));
    bg.on('pointerover', () => onHover(sprite, true, false, false));
    bg.on('pointerout', () => onHover(sprite, false, false, false));

    return sprite;
  }

  /**
   * Update die visual state (colors, pips, icons)
   */
  updateDieVisual(
    sprite: DiceSprite,
    value: number,
    isLocked: boolean,
    isCursed: boolean
  ): void {
    // Update background colors
    if (isCursed) {
      sprite.bg.setFillStyle(COLORS.DICE_CURSED_BG);
      sprite.bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, COLORS.DICE_CURSED_BORDER);
      sprite.innerBg.setFillStyle(PALETTE.purple[600]);
    } else if (isLocked) {
      sprite.bg.setFillStyle(PALETTE.green[700]);
      sprite.bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, PALETTE.green[500]);
      sprite.innerBg.setFillStyle(PALETTE.green[700]);
    } else {
      sprite.bg.setFillStyle(COLORS.DICE_BG);
      sprite.bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, COLORS.DICE_BORDER);
      sprite.innerBg.setFillStyle(PALETTE.neutral[700]);
    }

    // Update pips
    const pipColor = isCursed ? COLORS.DICE_PIP_CURSED : COLORS.DICE_PIP;
    this.drawPips(sprite.pipsGraphics, value, pipColor);

    // Update icons
    sprite.lockIndicator.setText('');
    sprite.lockIcon.setVisible(!isCursed && isLocked);
    sprite.cursedIcon.setVisible(isCursed);

    // Clear any preview glow
    sprite.glowGraphics.clear();
  }

  /**
   * Update die visual for foresight preview mode (purple mystical glow)
   */
  updateDieVisualPreview(
    sprite: DiceSprite,
    value: number,
    isLocked: boolean
  ): void {
    const size = this.sizeConfig.size;

    if (isLocked) {
      // Locked dice show dimmed - they won't change
      sprite.bg.setFillStyle(PALETTE.neutral[700], 0.6);
      sprite.bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, PALETTE.neutral[500], 0.6);
      sprite.innerBg.setFillStyle(PALETTE.neutral[700], 0.6);
      this.drawPips(sprite.pipsGraphics, value, COLORS.DICE_PIP);
      sprite.pipsGraphics.setAlpha(0.5);
      sprite.glowGraphics.clear();
    } else {
      // Preview dice show purple mystical theme
      sprite.bg.setFillStyle(PALETTE.purple[600]);
      sprite.bg.setStrokeStyle(3, PALETTE.purple[400]);
      sprite.innerBg.setFillStyle(PALETTE.purple[700]);
      this.drawPips(sprite.pipsGraphics, value, 0xffffff);
      sprite.pipsGraphics.setAlpha(1);

      // Draw purple glow
      sprite.glowGraphics.clear();
      sprite.glowGraphics.fillStyle(PALETTE.purple[400], 0.3);
      sprite.glowGraphics.fillRoundedRect(-size / 2 - 8, -size / 2 - 8, size + 16, size + 16, 12);
    }

    // Hide icons in preview
    sprite.lockIndicator.setText('');
    sprite.lockIcon.setVisible(false);
    sprite.cursedIcon.setVisible(false);
  }

  /**
   * Draw pips on a die
   */
  drawPips(graphics: Phaser.GameObjects.Graphics, value: number, color: number): void {
    graphics.clear();
    graphics.fillStyle(color, 1);
    const positions = getPipPositions(value, this.sizeConfig.pipOffset);
    for (const pos of positions) {
      graphics.fillCircle(pos.x, pos.y, this.sizeConfig.pipRadius);
    }
  }

  /**
   * Animate hover effect on a die
   */
  animateHover(sprite: DiceSprite, isHovered: boolean, isLocked: boolean, isCursed: boolean): void {
    if (isHovered && !isLocked) {
      // Hover lift effect
      this.scene.tweens.add({
        targets: sprite.container,
        y: sprite.originalY - 5,
        duration: 100,
        ease: 'Quad.easeOut',
      });
      this.scene.tweens.add({
        targets: sprite.shadow,
        scaleX: 1.1,
        scaleY: 1.2,
        alpha: 0.2,
        duration: 100,
      });
      sprite.bg.setStrokeStyle(3, PALETTE.green[400]);
      sprite.innerBg.setFillStyle(PALETTE.green[700]);
    } else {
      // Return to original position
      this.scene.tweens.add({
        targets: sprite.container,
        y: sprite.originalY,
        duration: 100,
        ease: 'Quad.easeOut',
      });
      this.scene.tweens.add({
        targets: sprite.shadow,
        scaleX: 1,
        scaleY: 1,
        alpha: 0.3,
        duration: 100,
      });
      if (isCursed) {
        sprite.bg.setStrokeStyle(3, PALETTE.purple[400]);
        sprite.innerBg.setFillStyle(PALETTE.purple[600]);
      } else if (isLocked) {
        sprite.bg.setStrokeStyle(3, PALETTE.green[500]);
        sprite.innerBg.setFillStyle(PALETTE.green[700]);
      } else {
        sprite.bg.setStrokeStyle(3, PALETTE.neutral[500]);
        sprite.innerBg.setFillStyle(PALETTE.neutral[700]);
      }
    }
  }

  /**
   * Animate a single die roll (for 6th blessing activation)
   */
  animateSingleDieRoll(
    sprite: DiceSprite,
    _finalValue: number,
    onComplete: () => void
  ): void {
    const rollDuration = SIZES.ROLL_DURATION_MS * 0.7;

    // Hide pips during animation
    sprite.pipsGraphics.setVisible(false);

    // Add glow during roll
    sprite.glowGraphics.clear();
    sprite.glowGraphics.fillStyle(PALETTE.gold[400], 0.4);
    sprite.glowGraphics.fillCircle(0, 0, SIZES.DICE_SIZE * 0.8);

    // Animate glow pulse
    this.scene.tweens.add({
      targets: sprite.glowGraphics,
      alpha: 0,
      duration: rollDuration,
      ease: 'Quad.easeIn',
    });

    // Tumble rotation
    const rotations = Phaser.Math.Between(2, 3) * 360;
    this.scene.tweens.add({
      targets: [sprite.bg, sprite.innerBg, sprite.shine, sprite.pipsGraphics],
      angle: rotations,
      duration: rollDuration * 0.8,
      ease: 'Cubic.easeOut',
    });

    // Bounce effect
    this.scene.tweens.add({
      targets: sprite.container,
      y: sprite.originalY - 30,
      duration: rollDuration * 0.4,
      ease: 'Quad.easeOut',
      yoyo: true,
    });

    // Complete after animation
    this.scene.time.delayedCall(rollDuration, () => {
      sprite.pipsGraphics.setVisible(true);
      sprite.bg.setAngle(0);
      sprite.innerBg.setAngle(0);
      sprite.shine.setAngle(0);
      sprite.pipsGraphics.setAngle(0);
      onComplete();
    });
  }

  /**
   * Animate a full dice roll
   */
  animateRoll(
    sprites: DiceSprite[],
    locked: boolean[],
    initial: boolean,
    finalValues: number[],
    onComplete: () => void
  ): void {
    const rollDuration = SIZES.ROLL_DURATION_MS;

    for (let i = 0; i < sprites.length; i++) {
      if (!locked[i] || initial) {
        const sprite = sprites[i];
        const delay = i * 50;

        // Hide pips during animation
        sprite.pipsGraphics.setVisible(false);

        // Add glow during roll
        sprite.glowGraphics.clear();
        sprite.glowGraphics.fillStyle(PALETTE.purple[400], 0.3);
        sprite.glowGraphics.fillCircle(0, 0, SIZES.DICE_SIZE * 0.8);

        // Animate glow pulse
        this.scene.tweens.add({
          targets: sprite.glowGraphics,
          alpha: 0,
          duration: rollDuration,
          ease: 'Quad.easeIn',
        });

        // Launch dice upward with random trajectory
        const jumpHeight = Phaser.Math.Between(60, 100);
        const horizontalOffset = Phaser.Math.Between(-20, 20);

        // Phase 1: Launch up
        this.scene.tweens.add({
          targets: sprite.container,
          y: sprite.originalY - jumpHeight,
          x: sprite.originalX + horizontalOffset,
          duration: rollDuration * 0.4,
          ease: 'Quad.easeOut',
          delay,
        });

        // Shadow shrinks as die goes up
        this.scene.tweens.add({
          targets: sprite.shadow,
          scaleX: 0.5,
          scaleY: 0.3,
          alpha: 0.15,
          duration: rollDuration * 0.4,
          ease: 'Quad.easeOut',
          delay,
        });

        // Tumble rotation
        const rotations = Phaser.Math.Between(2, 4) * 360;
        this.scene.tweens.add({
          targets: [sprite.bg, sprite.innerBg, sprite.shine, sprite.pipsGraphics],
          angle: rotations,
          duration: rollDuration * 0.8,
          ease: 'Cubic.easeOut',
          delay,
        });

        // Phase 2: Fall down and land with bounce
        this.scene.time.delayedCall(rollDuration * 0.4 + delay, () => {
          this.scene.tweens.add({
            targets: sprite.container,
            y: sprite.originalY,
            x: sprite.originalX,
            duration: rollDuration * 0.35,
            ease: 'Bounce.easeOut',
          });

          this.scene.tweens.add({
            targets: sprite.shadow,
            scaleX: 1.2,
            scaleY: 1.3,
            alpha: 0.4,
            duration: rollDuration * 0.2,
            ease: 'Quad.easeIn',
            onComplete: () => {
              this.scene.tweens.add({
                targets: sprite.shadow,
                scaleX: 1,
                scaleY: 1,
                alpha: 0.3,
                duration: 150,
              });
            },
          });
        });

        // Create trail particles
        this.createRollParticles(sprite.container.x, sprite.originalY, delay);
      }
    }

    // Set final values after animation
    this.scene.time.delayedCall(rollDuration + 100, () => {
      for (let i = 0; i < sprites.length; i++) {
        if (!locked[i] || initial) {
          const sprite = sprites[i];
          sprite.pipsGraphics.setVisible(true);

          // Reset rotation
          sprite.bg.setAngle(0);
          sprite.innerBg.setAngle(0);
          sprite.shine.setAngle(0);
          sprite.pipsGraphics.setAngle(0);

          // Landing impact effect
          this.createLandingImpact(sprite, finalValues[i]);
        }
      }
      onComplete();
    });
  }

  /**
   * Create particle trail during roll
   */
  private createRollParticles(x: number, y: number, delay: number): void {
    this.scene.time.delayedCall(delay, () => {
      for (let p = 0; p < 5; p++) {
        this.scene.time.delayedCall(p * 40, () => {
          const particle = this.scene.add.circle(
            x + Phaser.Math.Between(-15, 15),
            y + Phaser.Math.Between(-30, -60),
            Phaser.Math.Between(3, 6),
            PALETTE.purple[400],
            0.6
          );

          this.scene.tweens.add({
            targets: particle,
            y: particle.y + 40,
            alpha: 0,
            scaleX: 0.2,
            scaleY: 0.2,
            duration: 300,
            ease: 'Quad.easeOut',
            onComplete: () => particle.destroy(),
          });
        });
      }
    });
  }

  /**
   * Create landing impact effect
   */
  private createLandingImpact(sprite: DiceSprite, value: number): void {
    // Scale pop
    this.scene.tweens.add({
      targets: [sprite.bg, sprite.innerBg],
      scaleX: 1.15,
      scaleY: 0.9,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    // Impact ring
    const ring = this.scene.add.circle(sprite.container.x, sprite.originalY, 20, 0xffffff, 0);
    ring.setStrokeStyle(2, PALETTE.purple[400], 0.8);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });

    // Extra effects for 6s
    if (value === 6) {
      for (let s = 0; s < 6; s++) {
        const angle = (s / 6) * Math.PI * 2;
        const sparkle = this.scene.add.circle(
          sprite.container.x + Math.cos(angle) * 30,
          sprite.originalY + Math.sin(angle) * 30,
          4,
          PALETTE.gold[400],
          1
        );

        this.scene.tweens.add({
          targets: sparkle,
          x: sparkle.x + Math.cos(angle) * 25,
          y: sparkle.y + Math.sin(angle) * 25,
          alpha: 0,
          duration: 400,
          ease: 'Quad.easeOut',
          onComplete: () => sparkle.destroy(),
        });
      }
    }
  }

  /**
   * Animate cursed die shake effect
   */
  animateCursedShake(sprite: DiceSprite): void {
    this.scene.tweens.add({
      targets: sprite.container,
      x: sprite.originalX + 5,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        sprite.container.x = sprite.originalX;
      },
    });
  }

  /**
   * Animate failed lock attempt (subtle shake)
   */
  animateFailedLock(sprite: DiceSprite): void {
    this.scene.tweens.add({
      targets: sprite.container,
      x: sprite.originalX + 3,
      duration: 50,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        sprite.container.x = sprite.originalX;
      },
    });
  }

  /**
   * Animate die reposition (for 6th die activation/deactivation)
   */
  animateReposition(sprite: DiceSprite, newX: number): void {
    this.scene.tweens.add({
      targets: sprite.container,
      x: newX,
      duration: 200,
      ease: 'Back.easeOut',
    });
    sprite.originalX = newX;
  }

  /**
   * Animate 6th die show
   */
  animateShow(sprite: DiceSprite): void {
    sprite.container.setVisible(true);
    this.scene.tweens.add({
      targets: sprite.container,
      alpha: 1,
      duration: 300,
      ease: 'Cubic.easeOut',
    });
  }

  /**
   * Animate 6th die hide
   */
  animateHide(sprite: DiceSprite, onComplete?: () => void): void {
    this.scene.tweens.add({
      targets: sprite.container,
      alpha: 0,
      duration: 200,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        sprite.container.setVisible(false);
        onComplete?.();
      },
    });
  }
}
