/**
 * Dice Manager
 * Handles dice state, rolling logic, and UI rendering
 * Extracted from GameplayScene for better separation of concerns
 */

import Phaser from 'phaser';
import { COLORS, SIZES, FONTS, GAME_RULES, PALETTE, type ScaledSizes, getViewportMetrics } from '@/config';
import { createText } from '@/ui/ui-utils';
import { GameEventEmitter } from './game-events';
import { createLogger } from './logger';
import { DiceControls } from '@/ui/dice';
import type {
  DiceAllowedActions,
  DiceForcedState,
  TutorialControllableDice,
} from './tutorial/interfaces';

const log = createLogger('DiceManager');

// =============================================================================
// TYPES
// =============================================================================

export interface DiceState {
  values: number[];
  locked: boolean[];
  rerollsLeft: number;
  cursedIndex: number; // Mode 2: which die is permanently locked this turn (-1 = none)
  sixthDieActive: boolean; // Sixth Blessing: 6th die is in play
}

interface DiceSprite {
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

/** Current dice size configuration */
interface DiceSizeConfig {
  size: number;
  spacing: number;
  pipRadius: number;
  pipOffset: number;
}

// =============================================================================
// DICE MANAGER
// =============================================================================

export class DiceManager implements TutorialControllableDice {
  private scene: Phaser.Scene;
  private events: GameEventEmitter;
  private state: DiceState;
  private sprites: DiceSprite[] = [];
  private controls: DiceControls | null = null;
  private enabled: boolean = true;

  // Layout info for repositioning dice and getting bounds
  private layoutCenterX: number = 0;
  private layoutCenterY: number = 0;
  private layoutControlsY: number = 0;

  // Current size configuration (responsive)
  private sizeConfig: DiceSizeConfig = {
    size: SIZES.DICE_SIZE,
    spacing: SIZES.DICE_SPACING,
    pipRadius: SIZES.DICE_PIP_RADIUS,
    pipOffset: SIZES.DICE_PIP_OFFSET,
  };

  // Tutorial mode controls
  private forcedRollValues: number[] | null = null; // If set, next roll uses these values
  private lockableIndices: number[] | null = null; // If set, only these dice can be locked
  private onLockAttempt: ((index: number, allowed: boolean) => void) | null = null;

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
      sixthDieActive: false,
    };
  }

  /**
   * Reset dice state for a new turn
   * Clears cursed die - will be set again by GameplayScene after roll
   */
  reset(): void {
    // Deactivate 6th die if it was active
    if (this.state.sixthDieActive) {
      this.deactivateSixthDie();
    }

    this.state = this.createInitialState();
    // Re-add 6th die state (createInitialState only creates 5)
    if (this.sprites.length > GAME_RULES.DICE_COUNT) {
      this.state.values.push(1);
      this.state.locked.push(false);
    }
    this.updateDisplay();
    this.events.emit('dice:unlockAll');
  }

  /**
   * Activate the 6th die (Sixth Blessing)
   * Shows the 6th die, repositions all dice, and rolls the 6th die immediately
   * This allows it to be used mid-hand as a "panic reroll" when out of rerolls
   */
  activateSixthDie(): void {
    if (this.state.sixthDieActive) return;
    if (this.sprites.length <= GAME_RULES.DICE_COUNT) return;

    log.log('Activating 6th die');
    this.state.sixthDieActive = true;

    // Reposition all 6 dice to be centered
    const diceCount = 6;
    const diceAreaWidth = (diceCount - 1) * this.sizeConfig.spacing;
    const startX = this.layoutCenterX - diceAreaWidth / 2;

    for (let i = 0; i < diceCount; i++) {
      const sprite = this.sprites[i];
      const newX = startX + i * this.sizeConfig.spacing;

      // Animate to new position
      this.scene.tweens.add({
        targets: sprite.container,
        x: newX,
        duration: 200,
        ease: 'Back.easeOut',
      });
      sprite.originalX = newX;
    }

    // Show and animate in the 6th die
    const sixthDie = this.sprites[GAME_RULES.DICE_COUNT];
    sixthDie.container.setVisible(true);
    this.scene.tweens.add({
      targets: sixthDie.container,
      alpha: 1,
      duration: 300,
      ease: 'Cubic.easeOut',
    });

    // Roll the 6th die immediately with a fresh random value
    const newValue = Phaser.Math.Between(1, 6);
    this.state.values[GAME_RULES.DICE_COUNT] = newValue;
    this.state.locked[GAME_RULES.DICE_COUNT] = false;

    log.log(`6th die rolled: ${newValue}`);

    // Animate the 6th die roll
    this.animateSingleDieRoll(GAME_RULES.DICE_COUNT);
  }

  /**
   * Animate a single die roll (used for 6th die activation)
   * Value should already be set in state before calling
   */
  private animateSingleDieRoll(index: number): void {
    const sprite = this.sprites[index];
    if (!sprite) return;

    const rollDuration = SIZES.ROLL_DURATION_MS * 0.7; // Slightly faster for single die

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

    // Set final value after animation
    this.scene.time.delayedCall(rollDuration, () => {
      sprite.pipsGraphics.setVisible(true);
      sprite.bg.setAngle(0);
      sprite.innerBg.setAngle(0);
      sprite.shine.setAngle(0);
      sprite.pipsGraphics.setAngle(0);

      this.updateDieDisplay(index);

      // Emit event so scorecard updates with new 6-dice values
      this.events.emit('dice:rolled', {
        values: this.getValues(),
        isInitial: false,
        sixthDieActive: true
      });
    });
  }

  /**
   * Deactivate the 6th die (after scoring)
   * Hides the 6th die and repositions back to 5 dice layout
   */
  deactivateSixthDie(): void {
    if (!this.state.sixthDieActive) return;
    if (this.sprites.length <= GAME_RULES.DICE_COUNT) return;

    log.log('Deactivating 6th die');
    this.state.sixthDieActive = false;

    // Hide the 6th die
    const sixthDie = this.sprites[GAME_RULES.DICE_COUNT];
    this.scene.tweens.add({
      targets: sixthDie.container,
      alpha: 0,
      duration: 200,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        sixthDie.container.setVisible(false);
      },
    });

    // Reposition back to 5 dice centered
    const diceCount = GAME_RULES.DICE_COUNT;
    const diceAreaWidth = (diceCount - 1) * this.sizeConfig.spacing;
    const startX = this.layoutCenterX - diceAreaWidth / 2;

    for (let i = 0; i < diceCount; i++) {
      const sprite = this.sprites[i];
      const newX = startX + i * this.sizeConfig.spacing;

      this.scene.tweens.add({
        targets: sprite.container,
        x: newX,
        duration: 200,
        ease: 'Back.easeOut',
      });
      sprite.originalX = newX;
    }
  }

  /**
   * Check if 6th die is currently active
   */
  isSixthDieActive(): boolean {
    return this.state.sixthDieActive;
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
          x: sprite.originalX + 5,
          duration: 50,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            sprite.container.x = sprite.originalX; // Ensure exact position
          },
        });
      }
    }

    log.log(`Cursed die set to index: ${index}`);
  }

  /**
   * Clear cursed die
   */
  clearCursedDie(): void {
    this.setCursedDie(-1);
  }

  /**
   * Get current dice values
   * Returns 5 values normally, 6 values when Sixth Blessing is active
   */
  getValues(): number[] {
    if (this.state.sixthDieActive) {
      // Return all 6 dice values
      return [...this.state.values].slice(0, 6);
    }
    // Return only the first 5 dice
    return [...this.state.values].slice(0, GAME_RULES.DICE_COUNT);
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

    // Actually disable/enable the interactive elements
    for (const sprite of this.sprites) {
      if (enabled) {
        sprite.bg.setInteractive({ useHandCursor: true });
      } else {
        sprite.bg.disableInteractive();
      }
    }

    // Also update the controls panel (roll button)
    if (enabled) {
      this.updateRollButton();
    } else {
      this.controls?.setEnabled(false);
    }
  }

  // ===========================================================================
  // TUTORIAL MODE CONTROLS
  // ===========================================================================

  /**
   * Set forced values for the next roll (tutorial mode)
   * Pass null to return to random rolling
   */
  setForcedRollValues(values: number[] | null): void {
    this.forcedRollValues = values;
    log.debug('Forced roll values set:', values);
  }

  /**
   * Restrict which dice can be locked (tutorial mode)
   * Pass null to allow locking any die
   */
  setLockableIndices(indices: number[] | null): void {
    this.lockableIndices = indices;
    log.debug('Lockable indices set:', indices);
  }

  /**
   * Set a callback for when user attempts to lock a die (tutorial mode)
   * Useful for showing guidance when they try to lock the "wrong" die
   */
  setOnLockAttempt(callback: ((index: number, allowed: boolean) => void) | null): void {
    this.onLockAttempt = callback;
  }

  /**
   * Force set rerolls remaining (tutorial mode)
   * Used to show scenarios with no rerolls left
   */
  forceRerollsRemaining(count: number): void {
    this.state.rerollsLeft = count;
    this.controls?.setRerolls(count);
    this.updateRollButton();
    log.debug('Forced rerolls remaining:', count);
  }

  /**
   * Force-lock specific dice (tutorial mode)
   * Locks the dice at the given indices without user interaction
   */
  lockDice(indices: number[]): void {
    for (const index of indices) {
      if (index >= 0 && index < this.state.values.length) {
        this.state.locked[index] = true;
        this.updateDieDisplay(index);
      }
    }
    this.updateRollButton();
  }

  /**
   * Get rerolls remaining
   */
  getRerollsLeft(): number {
    return this.state.rerollsLeft;
  }

  // ===========================================================================
  // TUTORIAL INTERFACE METHODS
  // ===========================================================================

  /**
   * Set tutorial mode restrictions (implements TutorialControllableDice)
   */
  setTutorialMode(actions: DiceAllowedActions): void {
    this.setLockableIndices(actions.lockableIndices);
    // canRoll is handled via setEnabled
  }

  /**
   * Force tutorial state (implements TutorialControllableDice)
   */
  forceTutorialState(state: DiceForcedState): void {
    if (state.rollValues !== undefined) {
      this.setForcedRollValues(state.rollValues);
    }
    if (state.rerollsRemaining !== null && state.rerollsRemaining !== undefined) {
      this.forceRerollsRemaining(state.rerollsRemaining);
    }
  }

  /**
   * Reset all tutorial mode restrictions (implements TutorialControllableDice)
   */
  resetTutorialMode(): void {
    this.setLockableIndices(null);
    this.setForcedRollValues(null);
    this.onLockAttempt = null;
  }

  // ===========================================================================
  // UI CREATION
  // ===========================================================================

  /**
   * Create the dice UI at the specified position
   * @param scaledSizes Optional scaled sizes for responsive layout
   * @param isUltraCompact Whether to use ultra-compact mode for very short screens
   */
  createUI(centerX: number, centerY: number, scaledSizes?: ScaledSizes, isUltraCompact?: boolean): void {
    // Store layout info for repositioning and bounds
    this.layoutCenterX = centerX;
    this.layoutCenterY = centerY;

    // Get viewport metrics for responsive adjustments
    const metrics = getViewportMetrics(this.scene);
    const isMobile = metrics.isMobile;
    const ultraCompact = isUltraCompact ?? false;

    // Apply scaled sizes if provided
    if (scaledSizes) {
      this.sizeConfig = {
        size: scaledSizes.dice,
        spacing: scaledSizes.diceSpacing,
        pipRadius: scaledSizes.pipRadius,
        pipOffset: scaledSizes.pipOffset,
      };
    }

    const diceAreaWidth = (GAME_RULES.DICE_COUNT - 1) * this.sizeConfig.spacing;
    const startX = centerX - diceAreaWidth / 2;

    // Pulsing tip text above dice - tighter on mobile, even tighter in ultra-compact
    const tipOffset = ultraCompact ? 32 : (isMobile ? 38 : 70);
    const tipText = createText(this.scene, centerX, centerY - tipOffset, 'Tap dice to lock', {
      fontSize: isMobile ? FONTS.SIZE_MICRO : FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
    });
    tipText.setOrigin(0.5, 0.5);

    // Create dice sprites (5 normal + 1 hidden 6th for blessing)
    for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
      const x = startX + i * this.sizeConfig.spacing;
      this.sprites.push(this.createDieSprite(x, centerY, i));
    }

    // Create 6th die sprite (hidden until Sixth Blessing activates)
    // Position it at the end, will be repositioned when activated
    const sixthX = startX + GAME_RULES.DICE_COUNT * this.sizeConfig.spacing;
    const sixthDie = this.createDieSprite(sixthX, centerY, GAME_RULES.DICE_COUNT);
    sixthDie.container.setVisible(false);
    sixthDie.container.setAlpha(0);
    this.sprites.push(sixthDie);

    // Extend state arrays for 6th die
    this.state.values.push(1);
    this.state.locked.push(false);

    // Create controls panel below dice - leave room for lock icons/checkmarks
    // Ultra-compact: 75px to minimize vertical space
    // Mobile: 85px gives space for icons while keeping scorecard visible
    const controlsOffset = ultraCompact ? 75 : (isMobile ? 85 : 140);
    this.layoutControlsY = centerY + controlsOffset;

    // Create controls panel using DiceControls component
    this.controls = new DiceControls({
      scene: this.scene,
      centerX: centerX,
      centerY: this.layoutControlsY,
      isMobile,
      ultraCompact,
      includeBlessingSlot: this.includeBlessingSlot,
      initialRerolls: this.state.rerollsLeft,
      onRoll: () => this.roll(false),
    });
  }

  // Flag to include blessing slot in controls panel
  private includeBlessingSlot: boolean = false;

  /**
   * Enable the blessing slot in the controls panel (must be called before createUI)
   */
  enableBlessingSlot(): void {
    this.includeBlessingSlot = true;
  }

  /**
   * Get the position and height for the blessing button within the controls panel
   * Returns null if blessing slot is not enabled
   */
  getBlessingButtonPosition(): { x: number; y: number; height: number } | null {
    if (!this.controls) return null;
    return this.controls.getBlessingButtonPosition();
  }

  private createDieSprite(x: number, y: number, index: number): DiceSprite {
    const container = this.scene.add.container(x, y);
    const size = this.sizeConfig.size;

    // Shadow beneath die (centered)
    const shadow = this.scene.add.ellipse(0, size / 2 + 6, size * 0.85, size * 0.25, 0x000000, 0.4);
    container.add(shadow);

    // Glow effect (behind die)
    const glowGraphics = this.scene.add.graphics();
    container.add(glowGraphics);

    // Die outer background (border effect) - darker, more refined
    const bg = this.scene.add.rectangle(0, 0, size, size, PALETTE.neutral[700], 1);
    bg.setStrokeStyle(2, PALETTE.neutral[500]);
    container.add(bg);

    // Die inner background (face) - slightly lighter for contrast
    const innerBg = this.scene.add.rectangle(0, 0, size - 6, size - 6, PALETTE.neutral[700], 1);
    container.add(innerBg);

    // Shine/highlight effect - more subtle
    const shine = this.scene.add.graphics();
    shine.fillStyle(0xffffff, 0.06);
    shine.fillRoundedRect(-size / 2 + 5, -size / 2 + 5, size - 16, 10, 3);
    container.add(shine);

    // Pips graphics
    const pipsGraphics = this.scene.add.graphics();
    container.add(pipsGraphics);

    // Lock indicator text (for cursed dice)
    const lockIndicator = createText(this.scene, 0, size / 2 + 16, '', {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_MUTED,
      fontStyle: 'bold',
    });
    lockIndicator.setOrigin(0.5, 0.5);
    container.add(lockIndicator);

    // Hold icon graphic (for user-held dice) - green checkmark
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

    // Cursed icon graphic (for cursed dice) - purple skull
    const cursedIcon = this.scene.add.graphics();
    const cursedColor = PALETTE.purple[400];
    // Skull head (circle)
    cursedIcon.fillStyle(cursedColor, 1);
    cursedIcon.fillCircle(0, iconY - 2, 6);
    // Jaw (smaller arc)
    cursedIcon.fillRoundedRect(-4, iconY + 2, 8, 4, 2);
    // Eyes (dark circles)
    cursedIcon.fillStyle(0x000000, 1);
    cursedIcon.fillCircle(-2, iconY - 3, 1.5);
    cursedIcon.fillCircle(2, iconY - 3, 1.5);
    cursedIcon.setVisible(false);
    container.add(cursedIcon);

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
        bg.setStrokeStyle(3, PALETTE.green[400]);
        innerBg.setFillStyle(PALETTE.green[700]);
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
        bg.setStrokeStyle(3, PALETTE.purple[400]);
        innerBg.setFillStyle(PALETTE.purple[600]);
      } else if (locked) {
        bg.setStrokeStyle(3, PALETTE.green[500]);
        innerBg.setFillStyle(PALETTE.green[700]);
      } else {
        bg.setStrokeStyle(3, PALETTE.neutral[500]);
        innerBg.setFillStyle(PALETTE.neutral[700]);
      }
    });

    return { container, shadow, bg, innerBg, shine, pipsGraphics, lockIndicator, lockIcon, cursedIcon, glowGraphics, originalX: x, originalY: y };
  }

  // ===========================================================================
  // DICE LOGIC
  // ===========================================================================

  /**
   * Toggle lock state for a die
   */
  private toggleLock(index: number): void {
    if (!this.enabled) {
      log.debug('toggleLock rejected: dice disabled');
      return;
    }

    // Can't unlock a cursed die
    if (index === this.state.cursedIndex) {
      log.debug(`toggleLock rejected: die ${index} is cursed`);
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

    // Tutorial mode: check if this die is allowed to be locked
    if (this.lockableIndices !== null) {
      const allowed = this.lockableIndices.includes(index);

      // Notify callback if set (for showing tutorial guidance)
      if (this.onLockAttempt) {
        this.onLockAttempt(index, allowed);
      }

      if (!allowed) {
        log.debug(`toggleLock rejected: die ${index} not in lockable indices`);
        // Visual feedback - subtle shake
        const sprite = this.sprites[index];
        if (sprite) {
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
        return;
      }
    }

    this.state.locked[index] = !this.state.locked[index];
    this.updateDieDisplay(index);
    this.updateRollButton(); // Update button state based on holdable dice
    this.events.emit('dice:locked', { index, locked: this.state.locked[index] });
  }

  /**
   * Roll the dice
   */
  roll(initial: boolean): void {
    // Initial roll should always work, even if dice are disabled
    // (dice get disabled during 'rolling' state for click prevention)
    if (!this.enabled && !initial) {
      log.debug('roll rejected: dice disabled');
      return;
    }

    if (!initial && this.state.rerollsLeft <= 0) {
      log.debug('roll rejected: no rerolls remaining');
      this.flashRerollText();
      return;
    }

    // Check if any dice can actually be rerolled (not locked by user, not cursed)
    if (!initial) {
      const canReroll = this.state.locked.some((locked, i) => !locked && i !== this.state.cursedIndex);
      if (!canReroll) {
        log.debug('roll rejected: all dice are held or cursed');
        // All dice are held or cursed - don't waste the reroll
        return;
      }
      this.state.rerollsLeft--;
    }

    log.log(`Rolling dice (initial: ${initial}, rerolls left: ${this.state.rerollsLeft}, sixthDieActive: ${this.state.sixthDieActive})`);

    // Update rerolls text immediately
    this.updateRerollText();

    // Generate final values - include 6th die if active
    const diceCount = this.state.sixthDieActive ? 6 : GAME_RULES.DICE_COUNT;
    const finalValues: number[] = [];

    // Tutorial mode: use forced values if set
    const useForcedValues = this.forcedRollValues !== null;
    if (useForcedValues) {
      log.debug('Using forced roll values:', this.forcedRollValues);
    }

    for (let i = 0; i < diceCount; i++) {
      if (!this.state.locked[i] || initial) {
        if (useForcedValues && this.forcedRollValues![i] !== undefined) {
          finalValues[i] = this.forcedRollValues![i];
        } else {
          finalValues[i] = Phaser.Math.Between(1, 6);
        }
      } else {
        finalValues[i] = this.state.values[i];
      }
    }

    // Clear forced values after use (one-time use)
    if (useForcedValues) {
      this.forcedRollValues = null;
    }

    // Animate and set values
    this.animateRoll(initial, finalValues);
  }

  private animateRoll(initial: boolean, finalValues: number[]): void {
    const rollDuration = SIZES.ROLL_DURATION_MS;
    const diceCount = this.state.sixthDieActive ? 6 : GAME_RULES.DICE_COUNT;

    for (let i = 0; i < diceCount; i++) {
      if (!this.state.locked[i] || initial) {
        const sprite = this.sprites[i];
        const delay = i * 50; // Stagger the dice

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
          // Fall
          this.scene.tweens.add({
            targets: sprite.container,
            y: sprite.originalY,
            x: sprite.originalX, // Return to exact original position
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
      for (let i = 0; i < diceCount; i++) {
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
        // Reset locked state - include 6th die if active
        this.state.locked = Array(diceCount).fill(false);
      }

      this.updateDisplay();
      this.events.emit('dice:rolled', { values: this.getValues(), isInitial: initial, sixthDieActive: this.state.sixthDieActive });
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

    // Extra effects for high values
    if (value === 6) {
      // Golden sparkle for 6
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

  // ===========================================================================
  // UI UPDATES
  // ===========================================================================

  private updateDisplay(): void {
    const diceCount = this.state.sixthDieActive ? 6 : GAME_RULES.DICE_COUNT;
    for (let i = 0; i < diceCount; i++) {
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

    // Update background - cursed = purple, held = green, normal = neutral
    if (isCursed) {
      sprite.bg.setFillStyle(COLORS.DICE_CURSED_BG);
      sprite.bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, COLORS.DICE_CURSED_BORDER);
      sprite.innerBg.setFillStyle(PALETTE.purple[600]);
    } else if (locked) {
      sprite.bg.setFillStyle(PALETTE.green[700]);
      sprite.bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, PALETTE.green[500]);
      sprite.innerBg.setFillStyle(PALETTE.green[700]);
    } else {
      sprite.bg.setFillStyle(COLORS.DICE_BG);
      sprite.bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, COLORS.DICE_BORDER);
      sprite.innerBg.setFillStyle(PALETTE.neutral[700]);
    }

    // Update pips - cursed = purple, held/normal = white
    const pipColor = isCursed ? COLORS.DICE_PIP_CURSED : COLORS.DICE_PIP;
    this.drawPips(sprite.pipsGraphics, value, pipColor);

    // Update icons - cursed shows purple X, held shows green checkmark
    if (isCursed) {
      sprite.lockIndicator.setText('');
      sprite.lockIcon.setVisible(false);
      sprite.cursedIcon.setVisible(true);
    } else if (locked) {
      sprite.lockIndicator.setText('');
      sprite.lockIcon.setVisible(true);
      sprite.cursedIcon.setVisible(false);
    } else {
      sprite.lockIndicator.setText('');
      sprite.lockIcon.setVisible(false);
      sprite.cursedIcon.setVisible(false);
    }
  }

  private drawPips(graphics: Phaser.GameObjects.Graphics, value: number, color: number): void {
    graphics.clear();
    graphics.fillStyle(color, 1);
    const positions = getPipPositions(value, this.sizeConfig.pipOffset);
    for (const pos of positions) {
      graphics.fillCircle(pos.x, pos.y, this.sizeConfig.pipRadius);
    }
  }

  private updateRerollText(): void {
    this.controls?.setRerolls(this.state.rerollsLeft);
  }

  private updateRollButton(): void {
    if (!this.controls) return;

    // If dice are disabled (tutorial mode), keep button visually disabled
    if (!this.enabled) {
      this.controls.setEnabled(false);
      return;
    }

    // Check if any dice can be rerolled (not held, not cursed)
    const canReroll = this.state.locked.some((locked, i) => !locked && i !== this.state.cursedIndex);
    const enabled = this.state.rerollsLeft > 0 && canReroll;

    this.controls.setEnabled(enabled);
  }

  private flashRerollText(): void {
    this.controls?.flashRerollText();
  }

  // ===========================================================================
  // BOUNDS (for tutorial highlighting)
  // ===========================================================================

  /**
   * Get the bounding box of the dice area (all 5 dice)
   */
  getDiceBounds(): { x: number; y: number; width: number; height: number } {
    const diceAreaWidth = (GAME_RULES.DICE_COUNT - 1) * this.sizeConfig.spacing + this.sizeConfig.size;
    const diceHeight = this.sizeConfig.size;
    return {
      x: this.layoutCenterX - diceAreaWidth / 2,
      y: this.layoutCenterY - diceHeight / 2,
      width: diceAreaWidth,
      height: diceHeight,
    };
  }

  /**
   * Get the bounding box of the controls panel (rerolls + roll button)
   */
  getControlsBounds(): { x: number; y: number; width: number; height: number } {
    if (!this.controls) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    return this.controls.getBounds();
  }

  /**
   * Get combined bounds of dice + controls (the whole dice panel)
   */
  getFullBounds(): { x: number; y: number; width: number; height: number } {
    const dice = this.getDiceBounds();
    const controls = this.getControlsBounds();

    const minX = Math.min(dice.x, controls.x);
    const minY = Math.min(dice.y, controls.y);
    const maxX = Math.max(dice.x + dice.width, controls.x + controls.width);
    const maxY = Math.max(dice.y + dice.height, controls.y + controls.height);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Destroy all UI elements
   */
  destroy(): void {
    log.log(`Destroying DiceManager (${this.sprites.length} sprites, controls: ${!!this.controls})`);

    // Note: Keyboard listener (SPACE) cleanup is handled by InputManager

    for (const sprite of this.sprites) {
      sprite.container.destroy();
    }
    this.sprites = [];

    if (this.controls) {
      this.controls.destroy();
      this.controls = null;
    }
  }
}
