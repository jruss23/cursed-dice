/**
 * Game Event System
 * Typed event bus for decoupled component communication
 */

import Phaser from 'phaser';
import type { CategoryId } from './scorecard';
import type { BlessingId } from './blessings/types';

// =============================================================================
// EVENT TYPES
// =============================================================================

export interface GameEvents {
  // Dice events
  'dice:rolled': { values: number[]; isInitial: boolean; sixthDieActive?: boolean };
  'dice:locked': { index: number; locked: boolean };
  'dice:unlockAll': void;

  // Scoring events
  'score:category': { categoryId: CategoryId; dice: number[] };
  'score:updated': { categoryId: CategoryId; score: number; total: number };
  'score:complete': { total: number; timeRemaining: number };

  // Timer events
  'timer:tick': { remaining: number; formatted: string };
  'timer:warning': { remaining: number };
  'timer:expired': void;

  // Game state events
  'game:start': { difficulty: string };
  'game:pause': void;
  'game:resume': void;
  'game:end': { completed: boolean; score: number };

  // UI events
  'ui:categoryHover': { categoryId: CategoryId | null };
  'ui:menuRequested': void;

  // Blessing events
  'blessing:chosen': { blessingId: BlessingId };
  'blessing:expansion:enable': void;
  'blessing:sacrifice:preview': { values: number[]; chargesRemaining: number };
  'blessing:sacrifice:consumed': void;
  'blessing:sacrifice:activated': { chargesRemaining: number };
  'blessing:insurance:banked': { dice: number[] };
  'blessing:insurance:restored': { dice: number[] };
  'blessing:insurance:reset': void;
  'blessing:sacrifice:reset': { charges: number };
  'blessing:sixth:activated': { chargesRemaining: number };
  'blessing:sixth:deactivated': void;
  'blessing:sixth:reset': { charges: number };

  // Mode mechanics events
  'mode:gauntlet': boolean;
  'mode:lockedCategories': Set<CategoryId>;
}

// =============================================================================
// TYPED EVENT EMITTER
// =============================================================================

/**
 * Typed wrapper around Phaser's event emitter
 * Provides type safety for event names and payloads
 */
export class GameEventEmitter {
  private emitter: Phaser.Events.EventEmitter;

  constructor() {
    this.emitter = new Phaser.Events.EventEmitter();
  }

  /**
   * Emit an event with typed payload
   */
  emit<K extends keyof GameEvents>(event: K, payload?: GameEvents[K]): void {
    this.emitter.emit(event, payload);
  }

  /**
   * Subscribe to an event with typed handler
   */
  on<K extends keyof GameEvents>(
    event: K,
    handler: (payload: GameEvents[K]) => void,
    context?: object
  ): this {
    this.emitter.on(event, handler, context);
    return this;
  }

  /**
   * Subscribe to an event once
   */
  once<K extends keyof GameEvents>(
    event: K,
    handler: (payload: GameEvents[K]) => void,
    context?: object
  ): this {
    this.emitter.once(event, handler, context);
    return this;
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof GameEvents>(
    event: K,
    handler?: (payload: GameEvents[K]) => void,
    context?: object
  ): this {
    this.emitter.off(event, handler, context);
    return this;
  }

  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners(event?: keyof GameEvents): this {
    this.emitter.removeAllListeners(event);
    return this;
  }

  /**
   * Destroy the emitter and clean up
   */
  destroy(): void {
    this.emitter.removeAllListeners();
    this.emitter.destroy();
  }
}

/**
 * Factory function to create a new event emitter
 */
export function createGameEvents(): GameEventEmitter {
  return new GameEventEmitter();
}
