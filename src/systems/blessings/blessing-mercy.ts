/**
 * Blessing of Mercy
 * Once per curse round, completely reset your hand: new dice, full rerolls.
 * Simple panic button for dead hands.
 */

import type { GameEventEmitter } from '../game-events';
import { createLogger } from '../logger';
import { BlessingManager } from './blessing-manager';
import { BLESSING_CONFIGS, type Blessing, type MercyModeState } from './types';

const log = createLogger('MercyBlessing');

export class MercyBlessing implements Blessing<MercyModeState> {
  readonly config = BLESSING_CONFIGS.mercy;
  private events: GameEventEmitter;
  private state: MercyModeState;

  constructor(events: GameEventEmitter) {
    this.events = events;
    this.state = {
      type: 'mercy',
      used: false,
    };
  }

  onModeStart(): void {
    // Reset for new curse round
    this.state.used = false;
    this.events.emit('blessing:mercy:reset', { used: false });
    log.log('Curse round started - mercy available');
  }

  onModeEnd(): void {
    // Nothing to clean up
  }

  onNewHand(): void {
    // Nothing to do on new hand
  }

  /**
   * Use mercy - signals that player wants to reset the hand
   * @returns true if mercy was used successfully
   */
  use(): boolean {
    if (this.state.used) {
      log.log('Cannot use mercy - already used this curse round');
      return false;
    }

    this.state.used = true;
    this.events.emit('blessing:mercy:used', {});
    log.log('Mercy used - hand will reset');
    return true;
  }

  /**
   * Check if mercy can be used
   */
  canUse(): boolean {
    return !this.state.used;
  }

  /**
   * Check if mercy has been used this curse round
   */
  isUsed(): boolean {
    return this.state.used;
  }

  getState(): MercyModeState {
    return { ...this.state };
  }

  destroy(): void {
    this.events = null as unknown as GameEventEmitter;
  }
}

// Register this blessing with the manager
BlessingManager.registerBlessing('mercy', (events) => new MercyBlessing(events));
