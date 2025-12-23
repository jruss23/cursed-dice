/**
 * The Sixth Blessing
 * Roll 6 dice instead of 5, scoring automatically uses best 5 of 6
 * 3 charges total for the run
 */

import type { GameEventEmitter } from '../game-events';
import { createLogger } from '../logger';
import { BlessingManager } from './blessing-manager';
import { BLESSING_CONFIGS, type Blessing, type SixthModeState } from './types';

const log = createLogger('SixthBlessing');

export class SixthBlessing implements Blessing<SixthModeState> {
  readonly config = BLESSING_CONFIGS.sixth;
  private events: GameEventEmitter;
  private state: SixthModeState;
  private isActiveThisTurn: boolean = false;

  constructor(events: GameEventEmitter) {
    this.events = events;
    this.state = {
      type: 'sixth',
      chargesRemaining: 3,
      maxCharges: 3,
    };
  }

  onModeStart(): void {
    // Clear active state at start of each curse round (charges persist across run)
    this.isActiveThisTurn = false;
    this.events.emit('blessing:sixth:reset', { charges: this.state.chargesRemaining });
    log.log('Curse round started - charges remaining:', this.state.chargesRemaining);
  }

  onModeEnd(): void {
    this.isActiveThisTurn = false;
  }

  onNewHand(): void {
    // Clear active state on new hand - the 6th die is only for one turn
    if (this.isActiveThisTurn) {
      log.log('New hand started - clearing 6th die active state');
      this.isActiveThisTurn = false;
      this.events.emit('blessing:sixth:deactivated');
    }
  }

  /**
   * Activate the blessing for this turn
   * The 6th die will be active until the player scores
   * Returns true if activation succeeded
   */
  activate(): boolean {
    if (this.state.chargesRemaining <= 0) {
      log.log('Cannot activate - no charges remaining');
      return false;
    }

    if (this.isActiveThisTurn) {
      log.log('Already activated for this turn');
      return false;
    }

    this.state.chargesRemaining--;
    this.isActiveThisTurn = true;

    this.events.emit('blessing:sixth:activated', {
      chargesRemaining: this.state.chargesRemaining
    });

    log.log('Activated! 6th die will be active until scoring. Charges remaining:', this.state.chargesRemaining);
    return true;
  }

  /**
   * Check if blessing is active for this turn
   */
  isActive(): boolean {
    return this.isActiveThisTurn;
  }

  /**
   * Called after player scores to deactivate the 6th die
   */
  deactivate(): void {
    if (this.isActiveThisTurn) {
      this.isActiveThisTurn = false;
      this.events.emit('blessing:sixth:deactivated');
      log.log('Deactivated - 6th die hidden');
    }
  }

  canUse(): boolean {
    return this.state.chargesRemaining > 0 && !this.isActiveThisTurn;
  }

  getState(): SixthModeState {
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
BlessingManager.registerBlessing('sixth', (events) => new SixthBlessing(events));
