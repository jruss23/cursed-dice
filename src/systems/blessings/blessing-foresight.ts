/**
 * Foresight Blessing
 * Preview your next roll before committing. Costs 1 reroll, 3 charges total.
 *
 * How it works:
 * 1. Player activates Foresight (costs 1 reroll)
 * 2. Preview dice appear showing what the next roll would be
 * 3. Player can accept the preview (it becomes their actual roll) or reject it
 * 4. If rejected, preview disappears and they can roll normally (using another reroll)
 */

import Phaser from 'phaser';
import type { GameEventEmitter } from '../game-events';
import { createLogger } from '../logger';
import { BlessingManager } from './blessing-manager';
import { BLESSING_CONFIGS, type Blessing, type ForesightModeState } from './types';

const log = createLogger('ForesightBlessing');

export class ForesightBlessing implements Blessing<ForesightModeState> {
  readonly config = BLESSING_CONFIGS.foresight;
  private events: GameEventEmitter;
  private state: ForesightModeState;

  constructor(events: GameEventEmitter) {
    this.events = events;
    this.state = {
      type: 'foresight',
      chargesRemaining: 3,
      maxCharges: 3,
      isPreviewActive: false,
      previewedValues: null,
    };
  }

  onModeStart(): void {
    // Clear preview state at start of each curse round (charges persist across run)
    this.state.isPreviewActive = false;
    this.state.previewedValues = null;
    this.events.emit('blessing:foresight:reset', { charges: this.state.chargesRemaining });
    log.log('Curse round started - charges remaining:', this.state.chargesRemaining);
  }

  onModeEnd(): void {
    this.clearPreview();
  }

  onNewHand(): void {
    // Clear preview on new hand
    if (this.state.isPreviewActive) {
      log.log('New hand started - clearing preview');
      this.clearPreview();
    }
  }

  /**
   * Activate Foresight to preview the next roll
   * @param lockedDice Array of booleans indicating which dice are locked
   * @returns The previewed values if successful, null if activation failed
   */
  activate(lockedDice: boolean[]): number[] | null {
    if (this.state.chargesRemaining <= 0) {
      log.log('Cannot activate - no charges remaining');
      return null;
    }

    if (this.state.isPreviewActive) {
      log.log('Preview already active');
      return null;
    }

    this.state.chargesRemaining--;
    this.state.isPreviewActive = true;

    // Generate preview values for unlocked dice
    const previewValues: number[] = [];
    for (let i = 0; i < lockedDice.length; i++) {
      if (lockedDice[i]) {
        // Keep locked dice values (will be filled by caller)
        previewValues.push(0); // Placeholder, will be replaced
      } else {
        previewValues.push(Phaser.Math.Between(1, 6));
      }
    }

    this.state.previewedValues = previewValues;

    this.events.emit('blessing:foresight:activated', {
      chargesRemaining: this.state.chargesRemaining,
      previewValues: previewValues,
    });

    log.log('Activated! Preview values:', previewValues, 'Charges remaining:', this.state.chargesRemaining);
    return previewValues;
  }

  /**
   * Accept the previewed roll - these values become the actual dice values
   */
  acceptPreview(): number[] | null {
    if (!this.state.isPreviewActive || !this.state.previewedValues) {
      log.log('No preview to accept');
      return null;
    }

    const values = [...this.state.previewedValues];
    this.clearPreview();

    this.events.emit('blessing:foresight:accepted', { values });
    log.log('Preview accepted:', values);

    return values;
  }

  /**
   * Reject the preview - player can roll normally
   */
  rejectPreview(): void {
    if (!this.state.isPreviewActive) {
      log.log('No preview to reject');
      return;
    }

    this.clearPreview();
    this.events.emit('blessing:foresight:rejected');
    log.log('Preview rejected');
  }

  private clearPreview(): void {
    this.state.isPreviewActive = false;
    this.state.previewedValues = null;
    this.events.emit('blessing:foresight:cleared');
  }

  /**
   * Check if preview is currently showing
   */
  isPreviewActive(): boolean {
    return this.state.isPreviewActive;
  }

  /**
   * Get the previewed values (null if no preview active)
   */
  getPreviewedValues(): number[] | null {
    return this.state.previewedValues ? [...this.state.previewedValues] : null;
  }

  canUse(): boolean {
    return this.state.chargesRemaining > 0 && !this.state.isPreviewActive;
  }

  getState(): ForesightModeState {
    return { ...this.state };
  }

  getChargesRemaining(): number {
    return this.state.chargesRemaining;
  }

  destroy(): void {
    this.events = null as unknown as GameEventEmitter;
  }
}

// Register this blessing with the manager
BlessingManager.registerBlessing('foresight', (events) => new ForesightBlessing(events));
