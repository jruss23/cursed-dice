/**
 * Dice Manager
 * Handles dice state and rolling logic
 * Rendering delegated to DiceRenderer for better separation of concerns
 */

import Phaser from 'phaser';
import { SIZES, FONTS, GAME_RULES, COLORS, type GameplayLayout } from '@/config';
import { createText } from '@/ui/ui-utils';
import { GameEventEmitter } from './game-events';
import { createLogger } from './logger';
import { playDiceRollSound } from './sfx-manager';
import { DiceControls } from '@/ui/dice';
import { DiceRenderer, type DiceSprite, type DiceSizeConfig } from './dice';
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
  private renderer: DiceRenderer | null = null;

  // Layout info for repositioning dice and getting bounds
  private layoutCenterX: number = 0;
  private layoutCenterY: number = 0;
  private layoutTipOffset: number = 0; // Distance from dice center to "Tap dice to lock" text

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
   */
  activateSixthDie(): void {
    if (this.state.sixthDieActive) return;
    if (this.sprites.length <= GAME_RULES.DICE_COUNT) return;
    if (!this.renderer) return;

    log.log('Activating 6th die');
    this.state.sixthDieActive = true;

    // Reposition all 6 dice to be centered
    const diceCount = 6;
    const diceAreaWidth = (diceCount - 1) * this.sizeConfig.spacing;
    const startX = this.layoutCenterX - diceAreaWidth / 2;

    for (let i = 0; i < diceCount; i++) {
      const sprite = this.sprites[i];
      const newX = startX + i * this.sizeConfig.spacing;
      this.renderer.animateReposition(sprite, newX);
    }

    // Show the 6th die
    const sixthDie = this.sprites[GAME_RULES.DICE_COUNT];
    this.renderer.animateShow(sixthDie);

    // Roll the 6th die immediately with a fresh random value
    const newValue = Phaser.Math.Between(1, 6);
    this.state.values[GAME_RULES.DICE_COUNT] = newValue;
    this.state.locked[GAME_RULES.DICE_COUNT] = false;

    log.log(`6th die rolled: ${newValue}`);
    this.animateSingleDieRoll(GAME_RULES.DICE_COUNT);
  }

  /**
   * Animate a single die roll (used for 6th die activation)
   * Value should already be set in state before calling
   */
  private animateSingleDieRoll(index: number): void {
    const sprite = this.sprites[index];
    if (!sprite || !this.renderer) return;

    this.renderer.animateSingleDieRoll(sprite, this.state.values[index], () => {
      this.updateDieDisplay(index);
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
    if (!this.renderer) return;

    log.log('Deactivating 6th die');
    this.state.sixthDieActive = false;

    // Hide the 6th die
    const sixthDie = this.sprites[GAME_RULES.DICE_COUNT];
    this.renderer.animateHide(sixthDie);

    // Reposition back to 5 dice centered
    const diceCount = GAME_RULES.DICE_COUNT;
    const diceAreaWidth = (diceCount - 1) * this.sizeConfig.spacing;
    const startX = this.layoutCenterX - diceAreaWidth / 2;

    for (let i = 0; i < diceCount; i++) {
      const sprite = this.sprites[i];
      const newX = startX + i * this.sizeConfig.spacing;
      this.renderer.animateReposition(sprite, newX);
    }
  }

  /**
   * Check if 6th die is currently active
   */
  isSixthDieActive(): boolean {
    return this.state.sixthDieActive;
  }

  /**
   * Restore dice from Sanctuary blessing
   * Only changes dice values - rerolls stay exactly as they were
   */
  restoreFromSanctuary(values: number[], _locked: boolean[]): void {
    log.log('Restoring from Sanctuary:', values, 'rerolls unchanged:', this.state.rerollsLeft);

    // Only set dice values, unlock non-cursed dice, don't touch rerolls
    // Cursed die stays locked - it's permanently locked for the round
    for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
      this.state.values[i] = values[i];
      this.state.locked[i] = (i === this.state.cursedIndex);
      this.updateDieDisplay(i);
    }

    // Rerolls stay exactly as they were - don't call updateRerollText
    this.updateRollButton();

    // Emit rolled event so scorecard updates
    this.events.emit('dice:rolled', {
      values: this.getValues(),
      isInitial: false,
      sixthDieActive: this.state.sixthDieActive
    });
  }

  // ===========================================================================
  // FORESIGHT PREVIEW MODE
  // ===========================================================================

  private previewValues: number[] | null = null;

  /**
   * Show foresight preview - displays preview values on the actual dice with purple glow
   */
  showForesightPreview(previewValues: number[]): void {
    log.log('Showing foresight preview:', previewValues);
    this.previewValues = [...previewValues];

    // Update dice visuals to preview mode
    for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
      const sprite = this.sprites[i];
      if (!sprite || !this.renderer) continue;

      const isLocked = this.state.locked[i];
      const value = isLocked ? this.state.values[i] : previewValues[i];
      this.renderer.updateDieVisualPreview(sprite, value, isLocked);
    }
  }

  /**
   * Clear foresight preview - restores original dice display
   */
  clearForesightPreview(): void {
    log.log('Clearing foresight preview');
    this.previewValues = null;

    // Restore normal dice display
    for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
      this.updateDieDisplay(i);
    }
  }

  /**
   * Check if preview mode is active
   */
  isPreviewActive(): boolean {
    return this.previewValues !== null;
  }

  /**
   * Reset hand completely (Mercy blessing)
   * New random dice + full rerolls, like starting the hand fresh
   * Note: Curse will be re-applied by GameplayScene after roll completes
   */
  resetHand(): void {
    log.log('Resetting hand (Mercy)');

    // Reset rerolls to full
    this.state.rerollsLeft = GAME_RULES.REROLLS_PER_TURN;

    // Clear cursed die (will be re-applied after roll by GameplayScene)
    this.state.cursedIndex = -1;

    // Unlock all dice
    for (let i = 0; i < this.state.locked.length; i++) {
      this.state.locked[i] = false;
    }

    // Roll all dice fresh
    this.roll(true);
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
      if (sprite && this.renderer) {
        this.renderer.animateCursedShake(sprite);
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
   * Create the dice UI using values from GameplayLayout (single source of truth)
   * @param layout - Complete layout configuration from getGameplayLayout()
   */
  createUI(layout: GameplayLayout): void {
    const { dice, tip, controls } = layout;

    // Store layout info for repositioning and bounds
    this.layoutCenterX = dice.centerX;
    this.layoutCenterY = dice.centerY;
    // Offset from dice center to tip text (accounts for dice radius + tip gap)
    this.layoutTipOffset = dice.centerY - tip.y;

    // Apply sizes from layout
    this.sizeConfig = {
      size: dice.size,
      spacing: dice.spacing,
      pipRadius: dice.pipRadius,
      pipOffset: dice.pipOffset,
    };

    // Create renderer with size config
    this.renderer = new DiceRenderer(this.scene, this.sizeConfig);

    const diceAreaWidth = (GAME_RULES.DICE_COUNT - 1) * dice.spacing;
    const startX = dice.centerX - diceAreaWidth / 2;

    // Pulsing tip text above dice (using layout values)
    const tipText = createText(this.scene, dice.centerX, tip.y, 'Tap dice to lock', {
      fontSize: tip.fontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
    });
    tipText.setOrigin(0.5, 0.5);

    // Create dice sprites via renderer
    for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
      const x = startX + i * dice.spacing;
      this.sprites.push(this.renderer.createDieSprite(
        x, dice.centerY, i,
        (idx) => this.onDieClicked(idx),
        (sprite, isHovered) => this.onDieHover(sprite, isHovered)
      ));
    }

    // Create 6th die sprite (hidden until Sixth Blessing activates)
    const sixthX = startX + GAME_RULES.DICE_COUNT * dice.spacing;
    const sixthDie = this.renderer.createDieSprite(
      sixthX, dice.centerY, GAME_RULES.DICE_COUNT,
      (idx) => this.onDieClicked(idx),
      (sprite, isHovered) => this.onDieHover(sprite, isHovered)
    );
    sixthDie.container.setVisible(false);
    sixthDie.container.setAlpha(0);
    this.sprites.push(sixthDie);

    // Extend state arrays for 6th die
    this.state.values.push(1);
    this.state.locked.push(false);

    // Create controls panel (using layout values)
    this.controls = new DiceControls({
      scene: this.scene,
      layout: controls, // Pass the controls layout section
      includeBlessingSlot: this.includeBlessingSlot,
      initialRerolls: this.state.rerollsLeft,
      onRoll: () => {
        playDiceRollSound();
        this.executeRoll(false);
      },
    });
  }

  /**
   * Handle die hover event
   */
  private onDieHover(sprite: DiceSprite, isHovered: boolean): void {
    const index = this.sprites.indexOf(sprite);
    if (index === -1) return;

    const isLocked = this.state.locked[index];
    const isCursed = index === this.state.cursedIndex;

    if (this.renderer && this.enabled) {
      this.renderer.animateHover(sprite, isHovered, isLocked, isCursed);
    }
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


  // ===========================================================================
  // DICE LOGIC
  // ===========================================================================

  /**
   * Check if a die can be toggled (for command validation)
   */
  canToggleLock(index: number): boolean {
    if (!this.enabled) return false;
    if (index === this.state.cursedIndex) return false;
    if (this.lockableIndices !== null && !this.lockableIndices.includes(index)) return false;
    return true;
  }

  /**
   * Toggle lock state for a die (public API for commands)
   * For direct calls, use onDieClicked() which handles visual feedback
   */
  toggleDiceLock(index: number): void {
    this.state.locked[index] = !this.state.locked[index];
    this.updateDieDisplay(index);
    this.updateRollButton();
    this.events.emit('dice:locked', { index, locked: this.state.locked[index] });
  }

  /**
   * Handle die click - validates and executes via command pattern
   */
  private onDieClicked(index: number): void {
    if (!this.enabled) {
      log.debug('onDieClicked rejected: dice disabled');
      return;
    }

    // Can't unlock a cursed die - show visual feedback
    if (index === this.state.cursedIndex) {
      log.debug(`onDieClicked rejected: die ${index} is cursed`);
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
        log.debug(`onDieClicked rejected: die ${index} not in lockable indices`);
        const sprite = this.sprites[index];
        if (sprite && this.renderer) {
          this.renderer.animateFailedLock(sprite);
        }
        return;
      }
    }

    // Execute lock toggle directly
    this.toggleDiceLock(index);
  }

  /**
   * Execute roll (for UI button clicks)
   */
  executeRoll(initial: boolean): void {
    this.roll(initial);
  }

  /**
   * Roll the dice (internal implementation)
   * @param initial - Is this the first roll of a turn (resets reroll count)
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
    if (!this.renderer) return;

    // Disable roll button during animation to prevent spam-clicking
    this.controls?.setEnabled(false);

    const diceCount = this.state.sixthDieActive ? 6 : GAME_RULES.DICE_COUNT;
    const spritesToAnimate = this.sprites.slice(0, diceCount);
    const lockedState = initial ? Array(diceCount).fill(false) : this.state.locked.slice(0, diceCount);

    this.renderer.animateRoll(spritesToAnimate, lockedState, initial, finalValues, () => {
      // Update state after animation
      for (let i = 0; i < diceCount; i++) {
        if (!this.state.locked[i] || initial) {
          this.state.values[i] = finalValues[i];
        }
      }

      if (initial) {
        this.state.locked = Array(diceCount).fill(false);
      }

      // Update display but keep button disabled
      this.updateRerollText();
      for (let i = 0; i < diceCount; i++) {
        this.updateDieDisplay(i);
      }

      this.events.emit('dice:rolled', {
        values: this.getValues(),
        isInitial: initial,
        sixthDieActive: this.state.sixthDieActive
      });

      // Re-enable roll button after 0.5s delay to prevent accidental double-clicks
      this.scene.time.delayedCall(500, () => {
        this.updateRollButton();
      });
    });
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
    if (!sprite || !this.renderer) return;

    const value = this.state.values[index];
    const isLocked = this.state.locked[index];
    const isCursed = index === this.state.cursedIndex;

    this.renderer.updateDieVisual(sprite, value, isLocked, isCursed);
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
   * Get the expanded dice area bounds including:
   * - "Tap dice to lock" text above
   * - Dice
   * - Checkmark/skull icons below
   * Goes from just below the hint text to just above the controls panel
   */
  getDiceAreaBounds(): { x: number; y: number; width: number; height: number } {
    const diceAreaWidth = (GAME_RULES.DICE_COUNT - 1) * this.sizeConfig.spacing + this.sizeConfig.size;
    const padding = 10;

    // Top: starts at the tip text (with some padding above)
    const topY = this.layoutCenterY - this.layoutTipOffset - 12;

    // Bottom: stops at the top of the controls panel
    const controlsBounds = this.getControlsBounds();
    const bottomY = controlsBounds.y - 4;

    return {
      x: this.layoutCenterX - diceAreaWidth / 2 - padding,
      y: topY,
      width: diceAreaWidth + padding * 2,
      height: bottomY - topY,
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
