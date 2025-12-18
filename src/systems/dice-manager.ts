/**
 * Dice Manager
 * Handles dice state, rolling logic, and UI rendering
 * Extracted from SprintScene for better separation of concerns
 */

import Phaser from 'phaser';
import { COLORS, SIZES, FONTS, GAME_RULES } from '@/config';
import { GameEventEmitter } from './game-events';

// =============================================================================
// TYPES
// =============================================================================

export interface DiceState {
  values: number[];
  locked: boolean[];
  rerollsLeft: number;
  cursedIndex: number; // Mode 2: which die is permanently locked this turn (-1 = none)
}

interface DiceSprite {
  container: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;
  bg: Phaser.GameObjects.Rectangle;
  innerBg: Phaser.GameObjects.Rectangle;
  shine: Phaser.GameObjects.Graphics;
  pipsGraphics: Phaser.GameObjects.Graphics;
  floatingNum: Phaser.GameObjects.Text;
  lockIndicator: Phaser.GameObjects.Text;
  glowGraphics: Phaser.GameObjects.Graphics;
  originalY: number;
}

// Pip positions for each die value
const PIP_POSITIONS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 0, y: 0 }],
  2: [
    { x: -SIZES.DICE_PIP_OFFSET, y: -SIZES.DICE_PIP_OFFSET },
    { x: SIZES.DICE_PIP_OFFSET, y: SIZES.DICE_PIP_OFFSET },
  ],
  3: [
    { x: -SIZES.DICE_PIP_OFFSET, y: -SIZES.DICE_PIP_OFFSET },
    { x: 0, y: 0 },
    { x: SIZES.DICE_PIP_OFFSET, y: SIZES.DICE_PIP_OFFSET },
  ],
  4: [
    { x: -SIZES.DICE_PIP_OFFSET, y: -SIZES.DICE_PIP_OFFSET },
    { x: SIZES.DICE_PIP_OFFSET, y: -SIZES.DICE_PIP_OFFSET },
    { x: -SIZES.DICE_PIP_OFFSET, y: SIZES.DICE_PIP_OFFSET },
    { x: SIZES.DICE_PIP_OFFSET, y: SIZES.DICE_PIP_OFFSET },
  ],
  5: [
    { x: -SIZES.DICE_PIP_OFFSET, y: -SIZES.DICE_PIP_OFFSET },
    { x: SIZES.DICE_PIP_OFFSET, y: -SIZES.DICE_PIP_OFFSET },
    { x: 0, y: 0 },
    { x: -SIZES.DICE_PIP_OFFSET, y: SIZES.DICE_PIP_OFFSET },
    { x: SIZES.DICE_PIP_OFFSET, y: SIZES.DICE_PIP_OFFSET },
  ],
  6: [
    { x: -SIZES.DICE_PIP_OFFSET, y: -SIZES.DICE_PIP_OFFSET },
    { x: -SIZES.DICE_PIP_OFFSET, y: 0 },
    { x: -SIZES.DICE_PIP_OFFSET, y: SIZES.DICE_PIP_OFFSET },
    { x: SIZES.DICE_PIP_OFFSET, y: -SIZES.DICE_PIP_OFFSET },
    { x: SIZES.DICE_PIP_OFFSET, y: 0 },
    { x: SIZES.DICE_PIP_OFFSET, y: SIZES.DICE_PIP_OFFSET },
  ],
};

// =============================================================================
// DICE MANAGER
// =============================================================================

export class DiceManager {
  private scene: Phaser.Scene;
  private events: GameEventEmitter;
  private state: DiceState;
  private sprites: DiceSprite[] = [];
  private rollButton: Phaser.GameObjects.Container | null = null;
  private rerollText: Phaser.GameObjects.Text | null = null;
  private enabled: boolean = true;

  constructor(scene: Phaser.Scene, events: GameEventEmitter) {
    this.scene = scene;
    this.events = events;
    this.state = this.createInitialState();
  }

  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================

  private createInitialState(): DiceState {
    return {
      values: Array(GAME_RULES.DICE_COUNT).fill(1),
      locked: Array(GAME_RULES.DICE_COUNT).fill(false),
      rerollsLeft: GAME_RULES.REROLLS_PER_TURN,
      cursedIndex: -1,
    };
  }

  /**
   * Reset dice state for a new turn
   * Preserves cursed die if set
   */
  reset(): void {
    const cursedIndex = this.state.cursedIndex; // Preserve cursed die
    this.state = this.createInitialState();
    this.state.cursedIndex = cursedIndex;
    this.updateDisplay();
    this.events.emit('dice:unlockAll');
  }

  /**
   * Set which die is "cursed" (permanently locked) - Mode 2
   * @param index Die index (0-4), or -1 to clear
   */
  setCursedDie(index: number): void {
    // Clear old cursed die visual
    if (this.state.cursedIndex >= 0) {
      this.state.locked[this.state.cursedIndex] = false;
      this.updateDieDisplay(this.state.cursedIndex);
    }

    this.state.cursedIndex = index;

    if (index >= 0 && index < GAME_RULES.DICE_COUNT) {
      // Lock the cursed die
      this.state.locked[index] = true;
      this.updateDieDisplay(index);

      // Visual feedback - shake the cursed die
      const sprite = this.sprites[index];
      if (sprite) {
        this.scene.tweens.add({
          targets: sprite.container,
          x: sprite.container.x + 5,
          duration: 50,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
        });
      }
    }

    console.log(`[DiceManager] Cursed die set to index: ${index}`);
  }

  /**
   * Clear cursed die
   */
  clearCursedDie(): void {
    this.setCursedDie(-1);
  }

  /**
   * Get current dice values
   */
  getValues(): number[] {
    return [...this.state.values];
  }

  /**
   * Get current state
   */
  getState(): DiceState {
    return { ...this.state };
  }

  /**
   * Enable/disable dice interaction
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  // ===========================================================================
  // UI CREATION
  // ===========================================================================

  /**
   * Create the dice UI at the specified position
   */
  createUI(centerX: number, centerY: number): void {
    const diceAreaWidth = (GAME_RULES.DICE_COUNT - 1) * SIZES.DICE_SPACING;
    const startX = centerX - diceAreaWidth / 2;

    // Helper text above dice
    const helperText = this.scene.add.text(centerX, centerY - 85, 'Click dice to lock/unlock', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_MUTED,
    });
    helperText.setOrigin(0.5, 0.5);
    helperText.setResolution(window.devicePixelRatio * 2);

    // Create dice sprites
    for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
      const x = startX + i * SIZES.DICE_SPACING;
      this.sprites.push(this.createDieSprite(x, centerY, i));
    }

    // Rerolls remaining text
    this.rerollText = this.scene.add.text(
      centerX,
      centerY + 80,
      `Rerolls: ${this.state.rerollsLeft}`,
      {
        fontSize: FONTS.SIZE_BODY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_PRIMARY,
      }
    );
    this.rerollText.setOrigin(0.5, 0);
    this.rerollText.setResolution(window.devicePixelRatio * 2);

    // Roll button
    this.rollButton = this.createRollButton(centerX, centerY + 140);
  }

  private createDieSprite(x: number, y: number, index: number): DiceSprite {
    const container = this.scene.add.container(x, y);
    const size = SIZES.DICE_SIZE;

    // Shadow beneath die
    const shadow = this.scene.add.ellipse(4, size / 2 + 8, size * 0.9, size * 0.3, 0x000000, 0.3);
    container.add(shadow);

    // Glow effect (behind die)
    const glowGraphics = this.scene.add.graphics();
    container.add(glowGraphics);

    // Die outer background (border effect)
    const bg = this.scene.add.rectangle(0, 0, size, size, 0x3a3a5a, 1);
    bg.setStrokeStyle(3, 0x5a5a7a);
    container.add(bg);

    // Die inner background (face)
    const innerBg = this.scene.add.rectangle(0, 0, size - 8, size - 8, 0x1a1a2e, 1);
    container.add(innerBg);

    // Shine/highlight effect
    const shine = this.scene.add.graphics();
    shine.fillStyle(0xffffff, 0.1);
    shine.fillRoundedRect(-size / 2 + 6, -size / 2 + 6, size - 20, 12, 4);
    container.add(shine);

    // Pips graphics
    const pipsGraphics = this.scene.add.graphics();
    container.add(pipsGraphics);

    // Floating number above die
    const floatingNum = this.scene.add.text(0, -size / 2 - 25, '1', {
      fontSize: '28px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    floatingNum.setOrigin(0.5, 0.5);
    floatingNum.setResolution(window.devicePixelRatio * 2);
    floatingNum.setShadow(2, 2, '#000000', 4, true, true);
    container.add(floatingNum);

    // Lock indicator
    const lockIndicator = this.scene.add.text(0, size / 2 + 15, '', {
      fontSize: '12px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_LOCKED,
      fontStyle: 'bold',
    });
    lockIndicator.setOrigin(0.5, 0);
    lockIndicator.setResolution(window.devicePixelRatio * 2);
    container.add(lockIndicator);

    // Make interactive
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => this.toggleLock(index));
    bg.on('pointerover', () => {
      if (!this.state.locked[index] && this.enabled) {
        // Hover lift effect
        this.scene.tweens.add({
          targets: container,
          y: y - 5,
          duration: 100,
          ease: 'Quad.easeOut',
        });
        this.scene.tweens.add({
          targets: shadow,
          scaleX: 1.1,
          scaleY: 1.2,
          alpha: 0.2,
          duration: 100,
        });
        bg.setStrokeStyle(3, 0x8888ff);
        innerBg.setFillStyle(0x2a2a4e);
      }
    });
    bg.on('pointerout', () => {
      // Return to original position
      this.scene.tweens.add({
        targets: container,
        y: y,
        duration: 100,
        ease: 'Quad.easeOut',
      });
      this.scene.tweens.add({
        targets: shadow,
        scaleX: 1,
        scaleY: 1,
        alpha: 0.3,
        duration: 100,
      });
      const isCursed = index === this.state.cursedIndex;
      const locked = this.state.locked[index];
      if (isCursed) {
        bg.setStrokeStyle(3, 0xff4444);
        innerBg.setFillStyle(0x3a1a1a);
      } else if (locked) {
        bg.setStrokeStyle(3, COLORS.DICE_LOCKED_BORDER);
        innerBg.setFillStyle(0x2a1a1a);
      } else {
        bg.setStrokeStyle(3, 0x5a5a7a);
        innerBg.setFillStyle(0x1a1a2e);
      }
    });

    return { container, shadow, bg, innerBg, shine, pipsGraphics, floatingNum, lockIndicator, glowGraphics, originalY: y };
  }

  private createRollButton(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const bg = this.scene.add.rectangle(
      0,
      0,
      SIZES.BTN_ROLL_WIDTH,
      SIZES.BTN_ROLL_HEIGHT,
      COLORS.BTN_PRIMARY_BG
    );
    bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, COLORS.BTN_PRIMARY_BORDER);
    container.add(bg);

    const text = this.scene.add.text(0, 0, 'ROLL', {
      fontSize: '24px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);
    text.setResolution(window.devicePixelRatio * 2);
    container.add(text);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => this.roll(false));
    bg.on('pointerover', () => bg.setFillStyle(COLORS.BTN_PRIMARY_HOVER));
    bg.on('pointerout', () => bg.setFillStyle(COLORS.BTN_PRIMARY_BG));

    container.setData('bg', bg);
    return container;
  }

  // ===========================================================================
  // DICE LOGIC
  // ===========================================================================

  /**
   * Toggle lock state for a die
   */
  private toggleLock(index: number): void {
    if (!this.enabled) return;

    // Can't unlock a cursed die
    if (index === this.state.cursedIndex) {
      // Visual feedback - flash red
      const sprite = this.sprites[index];
      if (sprite) {
        this.scene.tweens.add({
          targets: sprite.bg,
          alpha: 0.5,
          duration: 100,
          yoyo: true,
          repeat: 1,
        });
      }
      return;
    }

    this.state.locked[index] = !this.state.locked[index];
    this.updateDieDisplay(index);
    this.events.emit('dice:locked', { index, locked: this.state.locked[index] });
  }

  /**
   * Roll the dice
   */
  roll(initial: boolean): void {
    if (!this.enabled) return;

    if (!initial && this.state.rerollsLeft <= 0) {
      this.flashRerollText();
      return;
    }

    if (!initial) {
      this.state.rerollsLeft--;
    }

    // Update rerolls text immediately
    this.updateRerollText();

    // Generate final values
    const finalValues: number[] = [];
    for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
      if (!this.state.locked[i] || initial) {
        finalValues[i] = Phaser.Math.Between(1, 6);
      } else {
        finalValues[i] = this.state.values[i];
      }
    }

    // Animate and set values
    this.animateRoll(initial, finalValues);
  }

  private animateRoll(initial: boolean, finalValues: number[]): void {
    const rollDuration = SIZES.ROLL_DURATION_MS;

    for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
      if (!this.state.locked[i] || initial) {
        const sprite = this.sprites[i];
        const delay = i * 50; // Stagger the dice

        // Hide pips during animation
        sprite.pipsGraphics.setVisible(false);
        sprite.floatingNum.setText('?');
        sprite.floatingNum.setColor('#ffff00');

        // Add glow during roll
        sprite.glowGraphics.clear();
        sprite.glowGraphics.fillStyle(0x6666ff, 0.3);
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
          x: sprite.container.x + horizontalOffset,
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

        // Rapid number changes during tumble
        let changeCount = 0;
        this.scene.time.addEvent({
          delay: 60,
          callback: () => {
            if (changeCount < 8) {
              sprite.floatingNum.setText(Phaser.Math.Between(1, 6).toString());
              changeCount++;
            }
          },
          repeat: 7,
        });

        // Phase 2: Fall down and land with bounce
        this.scene.time.delayedCall(rollDuration * 0.4 + delay, () => {
          // Fall
          this.scene.tweens.add({
            targets: sprite.container,
            y: sprite.originalY,
            x: sprite.container.x - horizontalOffset, // Return to center
            duration: rollDuration * 0.35,
            ease: 'Bounce.easeOut',
          });

          // Shadow returns
          this.scene.tweens.add({
            targets: sprite.shadow,
            scaleX: 1.2,
            scaleY: 1.3,
            alpha: 0.4,
            duration: rollDuration * 0.2,
            ease: 'Quad.easeIn',
            onComplete: () => {
              // Normalize shadow after landing
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

        // Create trail particles during roll
        this.createRollParticles(sprite.container.x, sprite.originalY, i, delay);
      }
    }

    // Set final values after animation
    this.scene.time.delayedCall(rollDuration + 100, () => {
      for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
        if (!this.state.locked[i] || initial) {
          const sprite = this.sprites[i];
          this.state.values[i] = finalValues[i];
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

      if (initial) {
        this.state.locked = Array(GAME_RULES.DICE_COUNT).fill(false);
      }

      this.updateDisplay();
      this.events.emit('dice:rolled', { values: this.getValues(), isInitial: initial });
    });
  }

  private createRollParticles(x: number, y: number, _index: number, delay: number): void {
    this.scene.time.delayedCall(delay, () => {
      for (let p = 0; p < 5; p++) {
        this.scene.time.delayedCall(p * 40, () => {
          const particle = this.scene.add.circle(
            x + Phaser.Math.Between(-15, 15),
            y + Phaser.Math.Between(-30, -60),
            Phaser.Math.Between(3, 6),
            0x6666ff,
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

    // Flash the number
    sprite.floatingNum.setColor('#ffffff');
    this.scene.tweens.add({
      targets: sprite.floatingNum,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        sprite.floatingNum.setScale(1);
        sprite.floatingNum.setColor(COLORS.TEXT_PRIMARY);
      },
    });

    // Impact ring
    const ring = this.scene.add.circle(sprite.container.x, sprite.originalY, 20, 0xffffff, 0);
    ring.setStrokeStyle(2, 0x8888ff, 0.8);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });

    // Extra effects for high values
    if (value === 6) {
      // Golden sparkle for 6
      for (let s = 0; s < 6; s++) {
        const angle = (s / 6) * Math.PI * 2;
        const sparkle = this.scene.add.circle(
          sprite.container.x + Math.cos(angle) * 30,
          sprite.originalY + Math.sin(angle) * 30,
          4,
          0xffdd00,
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

  // ===========================================================================
  // UI UPDATES
  // ===========================================================================

  private updateDisplay(): void {
    for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
      this.updateDieDisplay(i);
    }
    this.updateRerollText();
    this.updateRollButton();
  }

  private updateDieDisplay(index: number): void {
    const sprite = this.sprites[index];
    if (!sprite) return;

    const value = this.state.values[index];
    const locked = this.state.locked[index];
    const isCursed = index === this.state.cursedIndex;

    // Update floating number
    sprite.floatingNum.setText(value.toString());
    sprite.floatingNum.setColor(isCursed ? '#ff4444' : locked ? COLORS.TEXT_LOCKED : COLORS.TEXT_PRIMARY);

    // Update background - cursed dice have distinct appearance
    if (isCursed) {
      sprite.bg.setFillStyle(0x3a1a1a); // Darker red
      sprite.bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, 0xff4444);
    } else if (locked) {
      sprite.bg.setFillStyle(COLORS.DICE_LOCKED_BG);
      sprite.bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, COLORS.DICE_LOCKED_BORDER);
    } else {
      sprite.bg.setFillStyle(COLORS.DICE_BG);
      sprite.bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, COLORS.DICE_BORDER);
    }

    // Update pips
    const pipColor = isCursed ? 0xff6666 : locked ? COLORS.DICE_PIP_LOCKED : COLORS.DICE_PIP;
    this.drawPips(sprite.pipsGraphics, value, pipColor);

    // Update lock indicator - show CURSED for cursed dice
    if (isCursed) {
      sprite.lockIndicator.setText('☠ CURSED');
      sprite.lockIndicator.setColor('#ff4444');
    } else if (locked) {
      sprite.lockIndicator.setText('LOCKED');
      sprite.lockIndicator.setColor(COLORS.TEXT_LOCKED);
    } else {
      sprite.lockIndicator.setText('');
    }
  }

  private drawPips(graphics: Phaser.GameObjects.Graphics, value: number, color: number): void {
    graphics.clear();
    graphics.fillStyle(color, 1);
    const positions = PIP_POSITIONS[value] || [];
    for (const pos of positions) {
      graphics.fillCircle(pos.x, pos.y, SIZES.DICE_PIP_RADIUS);
    }
  }

  private updateRerollText(): void {
    if (!this.rerollText) return;
    this.rerollText.setText(`Rerolls: ${this.state.rerollsLeft}`);
    this.rerollText.setColor(this.state.rerollsLeft > 0 ? COLORS.TEXT_PRIMARY : COLORS.TEXT_DISABLED);
  }

  private updateRollButton(): void {
    if (!this.rollButton) return;
    const bg = this.rollButton.getData('bg') as Phaser.GameObjects.Rectangle;
    if (this.state.rerollsLeft > 0) {
      bg.setFillStyle(COLORS.BTN_PRIMARY_BG);
      bg.setInteractive({ useHandCursor: true });
    } else {
      bg.setFillStyle(COLORS.BTN_DISABLED_BG);
    }
  }

  private flashRerollText(): void {
    if (!this.rerollText) return;
    this.scene.tweens.add({
      targets: this.rerollText,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 2,
    });
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Destroy all UI elements
   */
  destroy(): void {
    for (const sprite of this.sprites) {
      sprite.container.destroy();
    }
    this.sprites = [];

    if (this.rollButton) {
      this.rollButton.destroy();
      this.rollButton = null;
    }

    if (this.rerollText) {
      this.rerollText.destroy();
      this.rerollText = null;
    }
  }
}
