/**
 * Dice Scorecard System
 * Handles all 17 categories (13 base + 4 special) and scoring logic
 * Special section unlocked via "Blessing of Expansion" after Mode 1
 */

import { GAME_RULES } from '@/config';
import { createLogger } from '@/systems/logger';
import { ALL_CATEGORIES, type CategoryId, type CategorySection } from '@/data/categories';

const log = createLogger('Scorecard');

// NOTE: CategoryId and CATEGORY_ID should be imported from @/data/categories
// This file only exports Scorecard, Category, and createScorecard

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  section: CategorySection;
  score: number | null; // null = not filled yet
  calculate: (dice: number[]) => number;
}

export interface ScorecardState {
  categories: Map<CategoryId, Category>;
  upperBonus: number; // +35 if upper section >= 63
  specialSectionEnabled: boolean; // Blessing of Expansion unlocked
}

// Number of categories required to complete the game
export const CATEGORIES_TO_COMPLETE = 13;

// =============================================================================
// 6-DICE HELPERS (Sixth Blessing) - Optimized for minimal allocation
// =============================================================================

/**
 * Reusable subset array - avoids allocation on every calculatePotential call.
 * We only need one 5-element array since we evaluate one subset at a time.
 */
const reusableSubset: number[] = [0, 0, 0, 0, 0];

/**
 * Fill reusableSubset with dice values excluding index `skipIndex`.
 * Mutates reusableSubset in place - no allocation.
 */
function fillSubsetExcluding(dice: number[], skipIndex: number): void {
  let j = 0;
  for (let i = 0; i < 6; i++) {
    if (i !== skipIndex) {
      reusableSubset[j++] = dice[i];
    }
  }
}

/**
 * Find the best score for a category across all 5-of-6 subsets.
 * Optimized: reuses single array instead of creating 6 new arrays per call.
 *
 * @param dice - Array of 6 dice values
 * @param calculate - Scoring function for the category
 * @param needSubset - If true, returns the best subset (allocates). If false, only returns score.
 */
function findBestScoreFor6Dice(
  dice: number[],
  calculate: (d: number[]) => number,
  needSubset: boolean = false
): { score: number; subset: number[] } {
  let bestScore = -1;
  let bestSkipIndex = 0;

  // Evaluate all 6 possible 5-dice subsets without allocating new arrays
  for (let skipIndex = 0; skipIndex < 6; skipIndex++) {
    fillSubsetExcluding(dice, skipIndex);
    const score = calculate(reusableSubset);
    if (score > bestScore) {
      bestScore = score;
      bestSkipIndex = skipIndex;
    }
  }

  // Only allocate the result subset if caller needs it (for logging/display)
  if (needSubset) {
    const subset: number[] = [];
    for (let i = 0; i < 6; i++) {
      if (i !== bestSkipIndex) subset.push(dice[i]);
    }
    return { score: bestScore, subset };
  }

  // Return empty array reference when subset not needed (calculatePotential)
  return { score: bestScore, subset: reusableSubset };
}

// =============================================================================
// CATEGORY INITIALIZATION
// =============================================================================

/**
 * Create initial category definitions from centralized config
 * Adds runtime `score` state to each CategoryConfig
 */
function createCategories(): Map<CategoryId, Category> {
  const categories = new Map<CategoryId, Category>();

  for (const config of ALL_CATEGORIES) {
    categories.set(config.id, {
      id: config.id,
      name: config.name,
      description: config.description,
      section: config.section,
      score: null,
      calculate: config.calculate,
    });
  }

  return categories;
}

export class Scorecard {
  private state: ScorecardState;

  constructor() {
    this.state = {
      categories: createCategories(),
      upperBonus: 0,
      specialSectionEnabled: false,
    };
  }

  /**
   * Reset scorecard for a new game
   */
  reset(): void {
    const wasEnabled = this.state.specialSectionEnabled;
    this.state = {
      categories: createCategories(),
      upperBonus: 0,
      specialSectionEnabled: wasEnabled, // Preserve blessing unlock across resets
    };
  }

  /**
   * Enable the special section (Blessing of Expansion)
   */
  enableSpecialSection(): void {
    log.log('Special section (Blessing of Expansion) enabled');
    this.state.specialSectionEnabled = true;
  }

  /**
   * Check if special section is enabled
   */
  isSpecialSectionEnabled(): boolean {
    return this.state.specialSectionEnabled;
  }

  /**
   * Get all categories (respects special section enabled state)
   */
  getCategories(): Category[] {
    return Array.from(this.state.categories.values()).filter(
      (c) => c.section !== 'special' || this.state.specialSectionEnabled
    );
  }

  /**
   * Get upper section categories
   */
  getUpperSection(): Category[] {
    return Array.from(this.state.categories.values()).filter((c) => c.section === 'upper');
  }

  /**
   * Get lower section categories
   */
  getLowerSection(): Category[] {
    return Array.from(this.state.categories.values()).filter((c) => c.section === 'lower');
  }

  /**
   * Get special section categories (Blessing of Expansion)
   */
  getSpecialSection(): Category[] {
    return Array.from(this.state.categories.values()).filter((c) => c.section === 'special');
  }

  /**
   * Get a specific category
   */
  getCategory(id: CategoryId): Category | undefined {
    return this.state.categories.get(id);
  }

  /**
   * Check if a category is available (not filled and section enabled)
   */
  isAvailable(id: CategoryId): boolean {
    const cat = this.state.categories.get(id);
    if (!cat) {
      log.warn(`isAvailable: unknown category "${id}"`);
      return false;
    }
    if (cat.score !== null) {
      return false; // Already scored - this is normal, not worth logging
    }
    // Special section categories only available if blessing is unlocked
    if (cat.section === 'special' && !this.state.specialSectionEnabled) {
      log.debug(`isAvailable: "${id}" unavailable (special section locked)`);
      return false;
    }
    return true;
  }

  /**
   * Get available (unfilled) categories (respects special section)
   */
  getAvailableCategories(): Category[] {
    return this.getCategories().filter((c) => c.score === null);
  }

  /**
   * Calculate potential score for a category with given dice.
   * If 6 dice are passed (Sixth Blessing), finds the best 5 of 6 for this category.
   * Optimized: no allocation when calculating potentials.
   */
  calculatePotential(id: CategoryId, dice: number[]): number {
    const cat = this.state.categories.get(id);
    if (!cat) return 0;

    // If 6 dice, find the best 5-of-6 subset (no allocation - needSubset=false)
    if (dice.length === 6) {
      return findBestScoreFor6Dice(dice, cat.calculate, false).score;
    }

    return cat.calculate(dice);
  }

  /**
   * Score a category with given dice
   * If 6 dice are passed (Sixth Blessing), uses the best 5 of 6 for this category
   * Returns the score achieved, or -1 if category already filled
   */
  score(id: CategoryId, dice: number[]): number {
    const cat = this.state.categories.get(id);
    if (!cat) {
      log.error(`score: unknown category "${id}"`);
      return -1;
    }
    if (cat.score !== null) {
      log.warn(`score: category "${id}" already filled with ${cat.score}`);
      return -1;
    }

    let points: number;
    let usedDice: number[];

    // If 6 dice, find the best 5-of-6 subset (needSubset=true for logging)
    if (dice.length === 6) {
      const result = findBestScoreFor6Dice(dice, cat.calculate, true);
      points = result.score;
      usedDice = result.subset;
      log.log(`Sixth Blessing: best 5 of [${dice.join(', ')}] for "${id}" is [${usedDice.join(', ')}] = ${points}`);
    } else {
      points = cat.calculate(dice);
      usedDice = dice;
    }

    cat.score = points;
    log.log(`Scored ${points} in "${id}" with dice [${usedDice.join(', ')}]`);

    // Check upper bonus
    this.checkUpperBonus();

    return points;
  }

  /**
   * Force a score (for Hot Potato mode - must score even if 0)
   */
  forceScore(id: CategoryId, dice: number[]): number {
    return this.score(id, dice);
  }

  /**
   * Remove a score from a category (for tutorial undo)
   * Returns true if the category was cleared, false if it wasn't scored
   */
  unscore(id: CategoryId): boolean {
    const cat = this.state.categories.get(id);
    if (!cat) {
      log.warn(`unscore: unknown category "${id}"`);
      return false;
    }
    if (cat.score === null) {
      log.debug(`unscore: category "${id}" was not scored`);
      return false;
    }

    log.log(`Unscoring category "${id}" (was ${cat.score})`);
    cat.score = null;

    // Recalculate upper bonus
    this.recheckUpperBonus();

    return true;
  }

  /**
   * Debug: overwrite a category score (ignores if already filled)
   */
  debugOverwriteScore(id: CategoryId, dice: number[]): number {
    const cat = this.state.categories.get(id);
    if (!cat) {
      log.error(`debugOverwriteScore: unknown category "${id}"`);
      return -1;
    }

    const points = cat.calculate(dice);
    cat.score = points;
    log.debug(`DEBUG: Overwrote "${id}" with ${points} using dice [${dice.join(', ')}]`);

    // Recheck upper bonus
    this.checkUpperBonus();

    return points;
  }

  /**
   * Check and apply upper section bonus
   */
  private checkUpperBonus(): void {
    const upperSum = this.getUpperSection()
      .filter((c) => c.score !== null)
      .reduce((sum, c) => sum + (c.score || 0), 0);

    if (upperSum >= GAME_RULES.UPPER_BONUS_THRESHOLD && this.state.upperBonus === 0) {
      this.state.upperBonus = GAME_RULES.UPPER_BONUS_AMOUNT;
      log.log(`Upper bonus awarded! (+${GAME_RULES.UPPER_BONUS_AMOUNT} for reaching ${upperSum}/${GAME_RULES.UPPER_BONUS_THRESHOLD})`);
    }
  }

  /**
   * Recalculate upper bonus (used when unscoring)
   */
  private recheckUpperBonus(): void {
    const upperSum = this.getUpperSection()
      .filter((c) => c.score !== null)
      .reduce((sum, c) => sum + (c.score || 0), 0);

    if (upperSum < GAME_RULES.UPPER_BONUS_THRESHOLD && this.state.upperBonus > 0) {
      log.log(`Upper bonus removed (upper sum now ${upperSum})`);
      this.state.upperBonus = 0;
    }
  }

  /**
   * Get upper section subtotal
   */
  getUpperSubtotal(): number {
    return this.getUpperSection()
      .filter((c) => c.score !== null)
      .reduce((sum, c) => sum + (c.score || 0), 0);
  }

  /**
   * Get upper bonus (35 if upper >= 63)
   */
  getUpperBonus(): number {
    return this.state.upperBonus;
  }

  /**
   * Get lower section total
   */
  getLowerTotal(): number {
    return this.getLowerSection()
      .filter((c) => c.score !== null)
      .reduce((sum, c) => sum + (c.score || 0), 0);
  }

  /**
   * Get special section total (Blessing of Expansion)
   */
  getSpecialTotal(): number {
    return this.getSpecialSection()
      .filter((c) => c.score !== null)
      .reduce((sum, c) => sum + (c.score || 0), 0);
  }

  /**
   * Get grand total (includes special section if enabled)
   */
  getTotal(): number {
    let total = this.getUpperSubtotal() + this.state.upperBonus + this.getLowerTotal();
    if (this.state.specialSectionEnabled) {
      total += this.getSpecialTotal();
    }
    return total;
  }

  /**
   * Check if scorecard is complete (13 categories filled)
   * With Blessing of Expansion, can fill any 13 of 16 total
   */
  isComplete(): boolean {
    return this.getFilledCount() >= CATEGORIES_TO_COMPLETE;
  }

  /**
   * Get completion percentage (based on 13 required categories)
   */
  getCompletionPercent(): number {
    const filled = this.getFilledCount();
    return Math.round((filled / CATEGORIES_TO_COMPLETE) * 100);
  }

  /**
   * Get number of filled categories
   */
  getFilledCount(): number {
    return this.getCategories().filter((c) => c.score !== null).length;
  }

  /**
   * Get remaining categories to fill
   */
  getRemainingCount(): number {
    return Math.max(0, CATEGORIES_TO_COMPLETE - this.getFilledCount());
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    this.state.categories.clear();
  }
}

/**
 * Factory function to create a new scorecard
 * Use this instead of singleton for better testability and isolation
 */
export function createScorecard(): Scorecard {
  return new Scorecard();
}
