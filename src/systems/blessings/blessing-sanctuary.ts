/**
 * Sanctuary Blessing
 * Bank current dice to restore later. One use per curse round.
 *
 * How it works:
 * 1. At any point, player can "bank" their current dice values
 * 2. Later, they can "restore" to those banked values (rerolls stay as-is)
 * 3. Resets each curse round - can bank/restore once per curse
 */

import type { GameEventEmitter } from '../game-events';
import { createLogger } from '../logger';
import { BlessingManager } from './blessing-manager';
import { BLESSING_CONFIGS, type Blessing, type SanctuaryModeState } from './types';

const log = createLogger('SanctuaryBlessing');

export interface BankedDiceState {
  values: number[];
  locked: boolean[];
}

// Minimum actions required before restore is allowed after banking
const MIN_ACTIONS_BEFORE_RESTORE = 1;

export class SanctuaryBlessing implements Blessing<SanctuaryModeState> {
  readonly config = BLESSING_CONFIGS.sanctuary;
  private events: GameEventEmitter;
  private state: SanctuaryModeState;
  private bankedState: BankedDiceState | null = null;
  private actionsSinceBanking: number = 0;

  constructor(events: GameEventEmitter) {
    this.events = events;
    this.state = {
      type: 'sanctuary',
      bankedDice: null,
      canBank: true,
      canRestore: false,
    };

    // Listen for actions (roll or score) to enable USE
    this.events.on('dice:rolled', this.onAction, this);
    this.events.on('score:updated', this.onAction, this);
  }

  private onAction = (): void => {
    // After any action (roll or score), enable USE if we have banked dice
    if (this.state.canRestore && this.bankedState) {
      this.actionsSinceBanking++;
      log.log('Action after banking, actions:', this.actionsSinceBanking);
      // Emit update so button refreshes to show USE
      this.events.emit('blessing:sanctuary:reset', {
        canBank: this.state.canBank,
        canRestore: this.state.canRestore,
        bankedDice: this.state.bankedDice,
      });
    }
  };

  onModeStart(): void {
    // Reset blessing for new curse round
    this.state.canBank = true;
    this.state.canRestore = false;
    this.state.bankedDice = null;
    this.bankedState = null;
    this.actionsSinceBanking = 0;

    // Emit reset event for UI updates
    this.events.emit('blessing:sanctuary:reset', {
      canBank: this.state.canBank,
      canRestore: this.state.canRestore,
      bankedDice: this.state.bankedDice,
    });
    log.log('Curse round started - blessing reset, canBank:', this.state.canBank);
  }

  onModeEnd(): void {
    // Nothing to clear - banking persists across modes
  }

  onNewHand(): void {
    // Nothing to do on new hand - banking persists
  }

  /**
   * Bank the current dice state
   * @param values Current dice values
   * @param locked Current locked states
   * @returns true if banking succeeded
   */
  bank(values: number[], locked: boolean[]): boolean {
    if (!this.state.canBank) {
      log.log('Cannot bank - already used');
      return false;
    }

    this.bankedState = {
      values: [...values],
      locked: [...locked],
    };
    this.state.bankedDice = [...values];
    this.state.canBank = false;
    this.state.canRestore = true;
    this.actionsSinceBanking = 0; // Reset counter - must take action before restore

    this.events.emit('blessing:sanctuary:banked', {
      values: this.bankedState.values,
      locked: this.bankedState.locked,
    });

    log.log('Dice banked:', this.bankedState.values);
    return true;
  }

  /**
   * Restore to the banked dice state
   * @returns The banked state if restore succeeded, null otherwise
   */
  restore(): BankedDiceState | null {
    if (!this.state.canRestore || !this.bankedState) {
      log.log('Cannot restore - no banked state or already restored');
      return null;
    }

    const restored = { ...this.bankedState };

    // Clear state - blessing is spent for this curse round
    this.state.canRestore = false;
    this.state.bankedDice = null;
    this.bankedState = null;

    this.events.emit('blessing:sanctuary:restored', {
      values: restored.values,
      locked: restored.locked,
    });

    log.log('Dice restored:', restored.values);
    return restored;
  }

  /**
   * Check if we can currently bank dice
   */
  canBankDice(): boolean {
    return this.state.canBank;
  }

  /**
   * Check if we can currently restore dice
   * Requires at least one action (roll or score) since banking
   */
  canRestoreDice(): boolean {
    return this.state.canRestore &&
           this.bankedState !== null &&
           this.actionsSinceBanking >= MIN_ACTIONS_BEFORE_RESTORE;
  }

  /**
   * Get the banked dice values for display
   */
  getBankedValues(): number[] | null {
    return this.state.bankedDice;
  }

  /**
   * Get the full banked state (values + locked)
   */
  getBankedState(): BankedDiceState | null {
    return this.bankedState;
  }

  canUse(): boolean {
    return this.state.canBank || this.state.canRestore;
  }

  getState(): SanctuaryModeState {
    return { ...this.state };
  }

  destroy(): void {
    this.events.off('dice:rolled', this.onAction, this);
    this.events.off('score:updated', this.onAction, this);
    this.events = null as unknown as GameEventEmitter;
  }
}

// Register this blessing with the manager
BlessingManager.registerBlessing('sanctuary', (events) => new SanctuaryBlessing(events));
