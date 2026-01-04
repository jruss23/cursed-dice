/**
 * Dice Renderer
 * Handles visual creation and animation of dice
 * Extracted from DiceManager for better separation of concerns
 */

import Phaser from 'phaser';
import { COLORS, SIZES, FONTS, PALETTE, ALPHA, TIMING } from '@/config';
import { toDPR } from '@/systems/responsive';
import { createText } from '@/ui/ui-utils';

// =============================================================================
// TYPES
// =============================================================================

export interface DiceSprite {
  index: number; // Die index for O(1) lookup in event handlers
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

    // Scale factor for visual elements (designed for 70px dice)
    const scale = size / 70;
    const shadowOffset = Math.round(6 * scale);
    const borderInset = Math.round(6 * scale);
    const shineInset = Math.round(5 * scale);
    const shineHeight = Math.round(10 * scale);
    const shineRadius = Math.round(3 * scale);
    const strokeWidth = Math.max(1, Math.round(2 * scale));

    // Shadow beneath die (centered)
    const shadow = this.scene.add.ellipse(0, size / 2 + shadowOffset, size * 0.85, size * 0.25, PALETTE.black, ALPHA.SHADOW_MEDIUM);
    container.add(shadow);

    // Glow effect (behind die)
    const glowGraphics = this.scene.add.graphics();
    container.add(glowGraphics);

    // Die outer background (border effect)
    const bg = this.scene.add.rectangle(0, 0, size, size, PALETTE.neutral[700], 1);
    bg.setStrokeStyle(strokeWidth, PALETTE.neutral[500]);
    container.add(bg);

    // Die inner background (face)
    const innerBg = this.scene.add.rectangle(0, 0, size - borderInset, size - borderInset, PALETTE.neutral[700], 1);
    container.add(innerBg);

    // Shine/highlight effect
    const shine = this.scene.add.graphics();
    shine.fillStyle(PALETTE.white, ALPHA.GLOW_SUBTLE);
    shine.fillRoundedRect(-size / 2 + shineInset, -size / 2 + shineInset, size - shineInset * 3, shineHeight, shineRadius);
    container.add(shine);

    // Pips graphics
    const pipsGraphics = this.scene.add.graphics();
    container.add(pipsGraphics);

    // Scale factor for icons (designed for 70px dice)
    const iconScale = size / 70;
    const iconGap = Math.round(12 * iconScale); // Gap below dice to icon center
    const iconY = size / 2 + iconGap;

    // Lock indicator text (legacy, kept for compatibility)
    const lockIndicator = createText(this.scene, 0, iconY, '', {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_MUTED,
      fontStyle: 'bold',
    });
    lockIndicator.setOrigin(0.5, 0.5);
    container.add(lockIndicator);

    // Hold icon graphic (green checkmark) - scaled to dice size
    const lockIcon = this.scene.add.graphics();
    const checkColor = PALETTE.green[400];
    const checkStroke = Math.max(3, Math.round(4 * iconScale));
    const checkSize = Math.round(9 * iconScale);
    const checkY = iconY + 2; // Offset down by 2px
    lockIcon.lineStyle(checkStroke, checkColor, 1);
    lockIcon.beginPath();
    // Checkmark points - all coordinates relative to checkSize for proper proportions
    lockIcon.moveTo(-checkSize, checkY);
    lockIcon.lineTo(-checkSize / 3, checkY + checkSize * 0.7);
    lockIcon.lineTo(checkSize * 1.2, checkY - checkSize * 0.8);
    lockIcon.strokePath();
    lockIcon.setVisible(false);
    container.add(lockIcon);

    // Cursed icon graphic (purple skull) - scaled to dice size, matching checkmark size
    const cursedIcon = this.scene.add.graphics();
    const cursedColor = PALETTE.purple[400];
    const skullSize = Math.round(9 * iconScale); // Match checkSize
    const skullY = iconY + 2; // Same offset as checkmark
    const skullRadius = skullSize * 0.9;
    const eyeRadius = skullSize * 0.22;
    const eyeSpacing = skullSize * 0.35;
    cursedIcon.fillStyle(cursedColor, 1);
    // Head
    cursedIcon.fillCircle(0, skullY - skullSize * 0.15, skullRadius);
    // Jaw
    cursedIcon.fillRoundedRect(
      -skullRadius * 0.7, skullY + skullSize * 0.3,
      skullRadius * 1.4, skullRadius * 0.5, 2
    );
    // Eyes
    cursedIcon.fillStyle(PALETTE.black, 1);
    cursedIcon.fillCircle(-eyeSpacing, skullY - skullSize * 0.25, eyeRadius);
    cursedIcon.fillCircle(eyeSpacing, skullY - skullSize * 0.25, eyeRadius);
    cursedIcon.setVisible(false);
    container.add(cursedIcon);

    const sprite: DiceSprite = {
      index,
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
      sprite.bg.setStrokeStyle(toDPR(SIZES.DICE_BORDER_WIDTH), COLORS.DICE_CURSED_BORDER);
      sprite.innerBg.setFillStyle(PALETTE.purple[600]);
    } else if (isLocked) {
      sprite.bg.setFillStyle(PALETTE.green[700]);
      sprite.bg.setStrokeStyle(toDPR(SIZES.DICE_BORDER_WIDTH), PALETTE.green[500]);
      sprite.innerBg.setFillStyle(PALETTE.green[700]);
    } else {
      sprite.bg.setFillStyle(COLORS.DICE_BG);
      sprite.bg.setStrokeStyle(toDPR(SIZES.DICE_BORDER_WIDTH), COLORS.DICE_BORDER);
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
      sprite.bg.setFillStyle(PALETTE.neutral[700], ALPHA.BORDER_MEDIUM);
      sprite.bg.setStrokeStyle(toDPR(SIZES.DICE_BORDER_WIDTH), PALETTE.neutral[500], ALPHA.BORDER_MEDIUM);
      sprite.innerBg.setFillStyle(PALETTE.neutral[700], ALPHA.BORDER_MEDIUM);
      this.drawPips(sprite.pipsGraphics, value, COLORS.DICE_PIP);
      sprite.pipsGraphics.setAlpha(ALPHA.DISABLED);
      sprite.glowGraphics.clear();
    } else {
      // Preview dice show purple mystical theme
      const scale = size / 70;
      const strokeWidth = Math.max(2, Math.round(3 * scale));
      const glowPadding = Math.round(8 * scale);
      const glowRadius = Math.round(12 * scale);

      sprite.bg.setFillStyle(PALETTE.purple[600]);
      sprite.bg.setStrokeStyle(strokeWidth, PALETTE.purple[400]);
      sprite.innerBg.setFillStyle(PALETTE.purple[700]);
      this.drawPips(sprite.pipsGraphics, value, PALETTE.white);
      sprite.pipsGraphics.setAlpha(1);

      // Draw purple glow
      sprite.glowGraphics.clear();
      sprite.glowGraphics.fillStyle(PALETTE.purple[400], ALPHA.GLOW_HOVER);
      sprite.glowGraphics.fillRoundedRect(-size / 2 - glowPadding, -size / 2 - glowPadding, size + glowPadding * 2, size + glowPadding * 2, glowRadius);
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
    const scale = this.sizeConfig.size / 70;
    const hoverLift = Math.round(5 * scale);
    const strokeWidth = Math.max(2, Math.round(3 * scale));

    if (isHovered && !isLocked) {
      // Hover lift effect
      this.scene.tweens.add({
        targets: sprite.container,
        y: sprite.originalY - hoverLift,
        duration: TIMING.QUICK,
        ease: 'Quad.easeOut',
      });
      this.scene.tweens.add({
        targets: sprite.shadow,
        scaleX: 1.1,
        scaleY: 1.2,
        alpha: ALPHA.GLOW_MEDIUM,
        duration: TIMING.QUICK,
      });
      sprite.bg.setStrokeStyle(strokeWidth, PALETTE.green[400]);
      sprite.innerBg.setFillStyle(PALETTE.green[700]);
    } else {
      // Return to original position
      this.scene.tweens.add({
        targets: sprite.container,
        y: sprite.originalY,
        duration: TIMING.QUICK,
        ease: 'Quad.easeOut',
      });
      this.scene.tweens.add({
        targets: sprite.shadow,
        scaleX: 1,
        scaleY: 1,
        alpha: ALPHA.SHADOW_LIGHT,
        duration: TIMING.QUICK,
      });
      if (isCursed) {
        sprite.bg.setStrokeStyle(strokeWidth, PALETTE.purple[400]);
        sprite.innerBg.setFillStyle(PALETTE.purple[600]);
      } else if (isLocked) {
        sprite.bg.setStrokeStyle(strokeWidth, PALETTE.green[500]);
        sprite.innerBg.setFillStyle(PALETTE.green[700]);
      } else {
        sprite.bg.setStrokeStyle(strokeWidth, PALETTE.neutral[500]);
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
    const scale = this.sizeConfig.size / 70;
    const bounceHeight = Math.round(30 * scale);

    // Hide pips during animation
    sprite.pipsGraphics.setVisible(false);

    // Add glow during roll
    sprite.glowGraphics.clear();
    sprite.glowGraphics.fillStyle(PALETTE.gold[400], ALPHA.SHADOW_MEDIUM);
    sprite.glowGraphics.fillCircle(0, 0, this.sizeConfig.size * 0.8);

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
      y: sprite.originalY - bounceHeight,
      duration: rollDuration * 0.4,
      ease: 'Quad.easeOut',
      yoyo: true,
    });

    // Complete after animation
    this.scene.time.delayedCall(rollDuration, () => {
      // Reset angles
      sprite.bg.setAngle(0);
      sprite.innerBg.setAngle(0);
      sprite.shine.setAngle(0);
      sprite.pipsGraphics.setAngle(0);
      // NOTE: Don't show pips yet - onComplete() will redraw then show them
      onComplete();
    });
  }

  /**
   * Animate a full dice roll
   * OPTIMIZED: Reduced from ~70 tweens to ~15 for mobile performance
   * - Rotates container instead of 4 children
   * - Removed particles, glow, and shadow animations
   * - Simplified landing impact (squash only, no ring/sparkles)
   */
  animateRoll(
    sprites: DiceSprite[],
    locked: boolean[],
    initial: boolean,
    finalValues: number[],
    onComplete: () => void
  ): void {
    const rollDuration = SIZES.ROLL_DURATION_MS;
    const scale = this.sizeConfig.size / 70;
    const staggerDelay = Math.round(25 * scale);
    const jumpMin = Math.round(45 * scale);
    const jumpMax = Math.round(70 * scale);
    const horizontalRange = Math.round(12 * scale);

    const riseDuration = rollDuration * 0.35;
    const fallDuration = rollDuration * 0.4;

    const animatingDice = sprites.filter((_, i) => !locked[i] || initial);
    let completedCount = 0;

    if (animatingDice.length === 0) {
      onComplete();
      return;
    }

    for (let i = 0; i < sprites.length; i++) {
      if (!locked[i] || initial) {
        const sprite = sprites[i];
        const delay = i * staggerDelay;
        const finalValue = finalValues[i];

        // Hide pips immediately (no fade tween needed)
        sprite.pipsGraphics.setAlpha(0);

        // Random trajectory
        const jumpHeight = Phaser.Math.Between(jumpMin, jumpMax);
        const horizontalOffset = Phaser.Math.Between(-horizontalRange, horizontalRange);
        const rotations = Phaser.Math.Between(1, 2) * 360;

        // TWEEN 1: Container rotation (single target instead of 4)
        this.scene.tweens.add({
          targets: sprite.container,
          angle: { from: 0, to: rotations },
          duration: riseDuration + fallDuration,
          ease: 'Cubic.easeOut',
          delay,
        });

        // TWEEN 2: Rise phase
        this.scene.tweens.add({
          targets: sprite.container,
          y: sprite.originalY - jumpHeight,
          x: sprite.originalX + horizontalOffset,
          duration: riseDuration,
          ease: 'Sine.easeOut',
          delay,
          onComplete: () => {
            // TWEEN 3: Fall phase (chained)
            this.scene.tweens.add({
              targets: sprite.container,
              y: sprite.originalY,
              x: sprite.originalX,
              angle: 0,
              duration: fallDuration,
              ease: 'Bounce.easeOut',
              onComplete: () => {
                // Redraw pips with final value BEFORE showing them
                this.drawPips(sprite.pipsGraphics, finalValue, COLORS.DICE_PIP);
                sprite.pipsGraphics.setAlpha(1);
                this.createLandingImpact(sprite, finalValue);

                completedCount++;
                if (completedCount === animatingDice.length) {
                  onComplete();
                }
              },
            });
          },
        });
      }
    }
  }

  /**
   * Create landing impact effect
   * OPTIMIZED: Just squash/stretch, no particles or rings
   */
  private createLandingImpact(sprite: DiceSprite, _value: number): void {
    // TWEEN 4 (per die): Simple squash and stretch
    this.scene.tweens.add({
      targets: [sprite.bg, sprite.innerBg],
      scaleX: 1.12,
      scaleY: 0.92,
      duration: TIMING.INSTANT,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  /**
   * Animate cursed die shake effect
   */
  animateCursedShake(sprite: DiceSprite): void {
    const scale = this.sizeConfig.size / 70;
    const shakeAmount = Math.max(3, Math.round(5 * scale));

    this.scene.tweens.add({
      targets: sprite.container,
      x: sprite.originalX + shakeAmount,
      duration: TIMING.INSTANT,
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
    const scale = this.sizeConfig.size / 70;
    const shakeAmount = Math.max(2, Math.round(3 * scale));

    this.scene.tweens.add({
      targets: sprite.container,
      x: sprite.originalX + shakeAmount,
      duration: TIMING.INSTANT,
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
      duration: TIMING.NORMAL,
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
      duration: TIMING.ENTRANCE,
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
      duration: TIMING.NORMAL,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        sprite.container.setVisible(false);
        onComplete?.();
      },
    });
  }
}
