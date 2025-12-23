/**
 * Blessing of Abundance
 * Adds 4 new scoring categories: Two Pair, All Odd, All Even, Run of 4
 * Player can fill any 13 of 17 total categories
 */

import type { GameEventEmitter } from '../game-events';
import { createLogger } from '../logger';
import { BlessingManager } from './blessing-manager';
import { BLESSING_CONFIGS, type Blessing, type AbundanceModeState } from './types';

const log = createLogger('BlessingOfAbundance');

export class BlessingOfAbundance implements Blessing<AbundanceModeState> {
  readonly config = BLESSING_CONFIGS.abundance;
  private events: GameEventEmitter;
  private state: AbundanceModeState;

  constructor(events: GameEventEmitter) {
    this.events = events;
    this.state = {
      type: 'abundance',
      enabled: true, // Always enabled once chosen
    };
  }

  onModeStart(): void {
    // Emit event so Scorecard can enable special section
    this.events.emit('blessing:expansion:enable');
    log.log('Mode started - special section enabled');
  }

  onModeEnd(): void {
    // Abundance has no per-mode cleanup
  }

  onNewHand(): void {
    // Abundance has no per-hand state
  }

  canUse(): boolean {
    // Passive blessing - always "usable" (categories are always available)
    return true;
  }

  getState(): AbundanceModeState {
    return { ...this.state };
  }

  isEnabled(): boolean {
    return this.state.enabled;
  }

  destroy(): void {
    // Clear reference to events emitter
    this.events = null as unknown as GameEventEmitter;
  }
}

// Register this blessing with the manager
BlessingManager.registerBlessing('abundance', (events) => new BlessingOfAbundance(events));
