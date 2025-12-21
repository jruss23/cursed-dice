/**
 * Blessing of Expansion
 * Adds 3 new scoring categories: Two Pair, All Odd, All Even
 * Player can fill any 13 of 16 total categories
 */

import type { GameEventEmitter } from '../game-events';
import { createLogger } from '../logger';
import { BlessingManager } from './blessing-manager';
import { BLESSING_CONFIGS, type Blessing, type ExpansionModeState } from './types';

const log = createLogger('BlessingOfExpansion');

export class BlessingOfExpansion implements Blessing<ExpansionModeState> {
  readonly config = BLESSING_CONFIGS.expansion;
  private events: GameEventEmitter;
  private state: ExpansionModeState;

  constructor(events: GameEventEmitter) {
    this.events = events;
    this.state = {
      type: 'expansion',
      enabled: true, // Always enabled once chosen
    };
  }

  onModeStart(): void {
    // Emit event so Scorecard can enable special section
    this.events.emit('blessing:expansion:enable');
    log.log('Mode started - special section enabled');
  }

  onModeEnd(): void {
    // Expansion has no per-mode cleanup
  }

  onNewHand(): void {
    // Expansion has no per-hand state
  }

  canUse(): boolean {
    // Passive blessing - always "usable" (categories are always available)
    return true;
  }

  getState(): ExpansionModeState {
    return { ...this.state };
  }

  isEnabled(): boolean {
    return this.state.enabled;
  }
}

// Register this blessing with the manager
BlessingManager.registerBlessing('expansion', (events) => new BlessingOfExpansion(events));
