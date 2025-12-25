/**
 * Mode Mechanics Manager
 *
 * Centralized system for all mode-specific game mechanics:
 * - Mode 1 (The Awakening): Standard dice game - no special mechanics
 * - Mode 2 (Shackled Die): Highest value die becomes cursed after scoring
 * - Mode 3 (Sealed Paths): 3 random categories locked after scoring
 * - Mode 4 (The Gauntlet): Only 3 categories available at a time
 *
 * This manager owns all mode-specific state and logic, keeping GameplayScene clean.
 */

import { type CategoryId } from '@/data/categories';
import { type DiceManager } from './dice-manager';
import { type GameEventEmitter } from './game-events';
import { createLogger } from './logger';
import { GAUNTLET_LOCKED_THRESHOLD, GAUNTLET_AVAILABLE_CATEGORIES } from './game-progression';

const log = createLogger('ModeMechanics');

// =============================================================================
// TYPES
// =============================================================================

export interface ModeConfig {
  cursedDice: boolean;      // Mode 2: curse highest die after scoring
  lockedCategories: number; // Mode 3: 3, Mode 4: 999 (all but 1)
}

interface Category {
  id: CategoryId;
  name: string;
  score: number | null;
}

// =============================================================================
// MODE MECHANICS MANAGER
// =============================================================================

export class ModeMechanicsManager {
  private lockedCategories: Set<CategoryId> = new Set();
  private config: ModeConfig = { cursedDice: false, lockedCategories: 0 };
  private events: GameEventEmitter | null = null;

  constructor() {}

  /**
   * Initialize for a new mode
   */
  init(config: ModeConfig, events: GameEventEmitter): void {
    this.config = config;
    this.events = events;
    this.lockedCategories.clear();
    log.log(`Initialized: cursedDice=${config.cursedDice}, lockedCategories=${config.lockedCategories}`);
  }

  /**
   * Apply mode mechanics at the start of a mode
   * Call this after scorecard is set up but before first roll
   */
  onModeStart(availableCategories: Category[]): void {
    // Lock initial categories for Modes 3 & 4
    if (this.config.lockedCategories > 0) {
      this.refreshLockedCategories(availableCategories);
    }

    // Emit gauntlet mode flag for UI (Mode 4)
    if (this.config.lockedCategories >= GAUNTLET_LOCKED_THRESHOLD) {
      this.events?.emit('mode:gauntlet', true);
    }
  }

  /**
   * Apply mode mechanics after the initial roll
   * Call this after the first roll of a turn
   */
  onAfterInitialRoll(diceManager: DiceManager): void {
    // Mode 2: Apply curse to highest die on initial roll
    if (this.config.cursedDice) {
      this.applyCursedDie(diceManager);
    }
  }

  /**
   * Apply mode mechanics after scoring a category
   * Call this after a category has been scored
   */
  onAfterScore(diceManager: DiceManager, availableCategories: Category[]): void {
    // Mode 2: Curse the highest die for next turn
    if (this.config.cursedDice) {
      this.applyCursedDie(diceManager);
    }

    // Modes 3 & 4: Refresh locked categories
    if (this.config.lockedCategories > 0) {
      this.refreshLockedCategories(availableCategories);
    }
  }

  /**
   * Check if a category is locked
   */
  isLocked(categoryId: CategoryId): boolean {
    return this.lockedCategories.has(categoryId);
  }

  /**
   * Get all locked category IDs
   */
  getLockedCategories(): Set<CategoryId> {
    return new Set(this.lockedCategories);
  }

  /**
   * Check if scoring is allowed for a category
   */
  canScore(categoryId: CategoryId): boolean {
    return !this.lockedCategories.has(categoryId);
  }

  /**
   * Reset all mode state
   */
  reset(): void {
    this.lockedCategories.clear();
    this.config = { cursedDice: false, lockedCategories: 0 };
    this.events = null;
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    this.reset();
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Apply curse to the highest value die
   */
  private applyCursedDie(diceManager: DiceManager): void {
    const values = diceManager.getValues();

    // Find the highest value die (prefer first if tied)
    let maxValue = 0;
    let maxIndex = 0;
    for (let i = 0; i < values.length; i++) {
      if (values[i] > maxValue) {
        maxValue = values[i];
        maxIndex = i;
      }
    }

    diceManager.setCursedDie(maxIndex);
    log.log(`Cursed die: index ${maxIndex} (value: ${maxValue})`);
  }

  /**
   * Refresh which categories are locked
   */
  private refreshLockedCategories(availableCategories: Category[]): void {
    this.lockedCategories.clear();

    const available = availableCategories.filter(c => c.score === null);
    if (available.length <= 1) {
      // Don't lock anything if only 0-1 categories left
      this.emitLockedCategories();
      return;
    }

    // Shuffle available categories
    const shuffled = [...available].sort(() => Math.random() - 0.5);

    // Mode 4 (Gauntlet): Lock all but GAUNTLET_AVAILABLE_CATEGORIES
    // Mode 3: Lock exactly N categories
    const numToLock = this.config.lockedCategories >= GAUNTLET_LOCKED_THRESHOLD
      ? available.length - GAUNTLET_AVAILABLE_CATEGORIES
      : Math.min(this.config.lockedCategories, available.length - 1);

    for (let i = 0; i < numToLock; i++) {
      this.lockedCategories.add(shuffled[i].id);
    }

    log.log(`Locked ${numToLock} categories:`, Array.from(this.lockedCategories));
    this.emitLockedCategories();
  }

  /**
   * Emit locked categories change event
   */
  private emitLockedCategories(): void {
    this.events?.emit('mode:lockedCategories', this.getLockedCategories());
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let instance: ModeMechanicsManager | null = null;

export function getModeMechanics(): ModeMechanicsManager {
  if (!instance) {
    instance = new ModeMechanicsManager();
  }
  return instance;
}

export function resetModeMechanics(): void {
  if (instance) {
    instance.reset();
  }
}
