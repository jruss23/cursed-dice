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
  bg: Phaser.GameObjects.Rectangle;
  pipsGraphics: Phaser.GameObjects.Graphics;
  floatingNum: Phaser.GameObjects.Text;
  lockIndicator: Phaser.GameObjects.Text;
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

    // Floating number above die
    const floatingNum = this.scene.add.text(0, -SIZES.DICE_SIZE / 2 - 20, '1', {
      fontSize: FONTS.SIZE_SUBHEADING,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    floatingNum.setOrigin(0.5, 0.5);
    floatingNum.setResolution(window.devicePixelRatio * 2);
    container.add(floatingNum);

    // Die background
    const bg = this.scene.add.rectangle(0, 0, SIZES.DICE_SIZE, SIZES.DICE_SIZE, COLORS.DICE_BG, 1);
    bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, COLORS.DICE_BORDER);
    container.add(bg);

    // Pips graphics
    const pipsGraphics = this.scene.add.graphics();
    container.add(pipsGraphics);

    // Lock indicator
    const lockIndicator = this.scene.add.text(0, SIZES.DICE_SIZE / 2 + 12, '', {
      fontSize: '11px',
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
      if (!this.state.locked[index]) {
        bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, COLORS.DICE_BORDER_HOVER);
      }
    });
    bg.on('pointerout', () => {
      const borderColor = this.state.locked[index] ? COLORS.DICE_LOCKED_BORDER : COLORS.DICE_BORDER;
      bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, borderColor);
    });

    return { container, bg, pipsGraphics, floatingNum, lockIndicator };
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
    for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
      if (!this.state.locked[i] || initial) {
        const sprite = this.sprites[i];

        // Hide pips and show "?" during animation
        sprite.pipsGraphics.setVisible(false);
        sprite.floatingNum.setText('?');

        // Spin animation
        this.scene.tweens.add({
          targets: sprite.bg,
          angle: 720,
          duration: SIZES.ROLL_DURATION_MS,
          ease: 'Cubic.easeOut',
          onComplete: () => sprite.bg.setAngle(0),
        });

        // Scale bounce
        this.scene.tweens.add({
          targets: sprite.bg,
          scaleX: 0.8,
          scaleY: 0.8,
          duration: SIZES.ROLL_DURATION_MS / 4,
          yoyo: true,
          repeat: 1,
          ease: 'Sine.easeInOut',
          onComplete: () => sprite.bg.setScale(1),
        });
      }
    }

    // Set final values after animation
    this.scene.time.delayedCall(SIZES.ROLL_DURATION_MS, () => {
      for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
        if (!this.state.locked[i] || initial) {
          this.state.values[i] = finalValues[i];
          this.sprites[i].pipsGraphics.setVisible(true);
        }
      }

      if (initial) {
        // Unlock all dice on initial roll
        this.state.locked = Array(GAME_RULES.DICE_COUNT).fill(false);
      }

      this.updateDisplay();
      this.events.emit('dice:rolled', { values: this.getValues(), isInitial: initial });
    });
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
