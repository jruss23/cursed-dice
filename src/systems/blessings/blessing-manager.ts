/**
 * Blessing Manager
 * Singleton that manages blessing choice and lifecycle
 */

import type { GameEventEmitter } from '../game-events';
import { createLogger } from '../logger';
import type { Blessing, BlessingId, BlessingModeState } from './types';

const log = createLogger('BlessingManager');

export interface BlessingManagerState {
  hasChosen: boolean;
  chosenBlessingId: BlessingId | null;
}

// Blessing factory type - creates a blessing instance
type BlessingFactory = (events: GameEventEmitter) => Blessing;

/**
 * Central manager for the blessing system
 * - Tracks which blessing was chosen (persists across modes)
 * - Handles mode lifecycle (start/end)
 * - Provides access to active blessing
 *
 * NOTE: Events are passed on each call, not stored, because
 * gameEvents is recreated each time GameplayScene restarts.
 */
export class BlessingManager {
  private state: BlessingManagerState;
  private activeBlessing: Blessing | null = null;

  // Registry of blessing factories (populated by registerBlessing)
  private static blessingFactories: Map<BlessingId, BlessingFactory> = new Map();

  constructor() {
    this.state = {
      hasChosen: false,
      chosenBlessingId: null,
    };
  }

  /**
   * Register a blessing factory (called at module load time)
   * This allows blessings to be added without modifying the manager
   */
  static registerBlessing(id: BlessingId, factory: BlessingFactory): void {
    BlessingManager.blessingFactories.set(id, factory);
  }

  /**
   * Called when player makes their choice after Mode 1
   * @param blessingId - The blessing to activate
   * @param events - Current game events emitter
   */
  chooseBlessing(blessingId: BlessingId, events: GameEventEmitter): void {
    if (this.state.hasChosen) {
      log.warn('Blessing already chosen');
      return;
    }

    const factory = BlessingManager.blessingFactories.get(blessingId);
    if (!factory) {
      log.error(`Unknown blessing: ${blessingId}`);
      return;
    }

    this.state.chosenBlessingId = blessingId;
    this.state.hasChosen = true;
    this.activeBlessing = factory(events);

    events.emit('blessing:chosen', { blessingId });
    log.log(`Chose blessing: ${blessingId}`);
  }

  /**
   * Called at start of each mode (2, 3, 4)
   * Recreates blessing instance with fresh events emitter
   * @param events - Current game events emitter
   */
  onModeStart(events: GameEventEmitter): void {
    // Recreate blessing instance with fresh events
    if (this.state.chosenBlessingId) {
      const factory = BlessingManager.blessingFactories.get(this.state.chosenBlessingId);
      if (factory) {
        log.log(`Recreating blessing instance: ${this.state.chosenBlessingId}`);
        this.activeBlessing = factory(events);
        this.activeBlessing.onModeStart();
      } else {
        log.error(`Failed to find factory for blessing: ${this.state.chosenBlessingId} - blessing will not activate!`);
      }
    } else {
      log.log('Mode started without blessing (Mode 1 or no blessing chosen)');
    }
  }

  /**
   * Called at end of each mode
   */
  onModeEnd(): void {
    this.activeBlessing?.onModeEnd();
  }

  /**
   * Called when a new hand starts (after scoring)
   */
  onNewHand(): void {
    this.activeBlessing?.onNewHand();
  }

  /**
   * Get the active blessing (if any)
   */
  getActiveBlessing(): Blessing | null {
    return this.activeBlessing;
  }

  /**
   * Get typed blessing state (for UI components)
   */
  getBlessingState<T extends BlessingModeState>(): T | null {
    return this.activeBlessing?.getState() as T | null;
  }

  /**
   * Check if player has already chosen a blessing
   */
  hasChosenBlessing(): boolean {
    return this.state.hasChosen;
  }

  /**
   * Get the chosen blessing ID (null if not chosen yet)
   */
  getChosenBlessingId(): BlessingId | null {
    return this.state.chosenBlessingId;
  }

  /**
   * Get full state for persistence/debugging
   */
  getState(): BlessingManagerState {
    return { ...this.state };
  }

  /**
   * Restore state (for loading saved games)
   * Note: Call onModeStart(events) after restore to initialize blessing
   */
  restore(savedState: BlessingManagerState): void {
    this.state = { ...savedState };
    // Blessing instance will be created on next onModeStart() call
    this.activeBlessing = null;
  }

  /**
   * Reset for new game
   */
  reset(): void {
    log.log('Reset blessing manager for new game');
    this.state = { hasChosen: false, chosenBlessingId: null };
    this.activeBlessing = null;
  }
}

// Singleton instance (persists across scenes like GameProgression)
let instance: BlessingManager | null = null;

/**
 * Get or create the BlessingManager singleton
 */
export function getBlessingManager(): BlessingManager {
  if (!instance) {
    instance = new BlessingManager();
  }
  return instance;
}

/**
 * Reset the blessing manager (for new game)
 */
export function resetBlessingManager(): void {
  instance?.reset();
  instance = null;
}

/**
 * Check if blessing manager exists (without creating)
 */
export function hasBlessingManager(): boolean {
  return instance !== null;
}

/**
 * DEBUG: Set a blessing as chosen without going through Mode 1
 * Used for debug skip-to-mode feature
 */
export function debugSetBlessing(blessingId: BlessingId): void {
  const manager = getBlessingManager();
  // Access private state for debug purposes
  const state = (manager as unknown as { state: BlessingManagerState }).state;
  state.chosenBlessingId = blessingId;
  state.hasChosen = true;
  log.debug(`DEBUG: Set blessing to ${blessingId}`);
}
