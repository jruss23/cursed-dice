/**
 * Dice Scorecard System
 * Handles all 17 categories (13 base + 4 special) and scoring logic
 * Special section unlocked via "Blessing of Expansion" after Mode 1
 */

import { GAME_RULES } from '@/config';
import { createLogger } from '@/systems/logger';

const log = createLogger('Scorecard');

export type CategoryId =
  // Upper section
  | 'ones'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes'
  // Lower section
  | 'threeOfAKind'
  | 'fourOfAKind'
  | 'fullHouse'
  | 'smallStraight'
  | 'largeStraight'
  | 'fiveDice'
  | 'chance'
  // Special section (Blessing of Expansion)
  | 'twoPair'
  | 'allOdd'
  | 'allEven'
  | 'allHigh';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  section: 'upper' | 'lower' | 'special';
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

/**
 * Calculate sum of specific die value
 */
function sumOfValue(dice: number[], value: number): number {
  return dice.filter((d) => d === value).reduce((sum, d) => sum + d, 0);
}

/**
 * Count occurrences of each die value
 */
function getCounts(dice: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const d of dice) {
    counts.set(d, (counts.get(d) || 0) + 1);
  }
  return counts;
}

/**
 * Check if dice contain N of a kind
 */
function hasNOfAKind(dice: number[], n: number): boolean {
  const counts = getCounts(dice);
  return Array.from(counts.values()).some((count) => count >= n);
}

/**
 * Check for small straight (4 consecutive)
 */
function hasSmallStraight(dice: number[]): boolean {
  const unique = [...new Set(dice)].sort((a, b) => a - b).join('');
  return unique.includes('1234') || unique.includes('2345') || unique.includes('3456');
}

/**
 * Check for large straight (5 consecutive)
 */
function hasLargeStraight(dice: number[]): boolean {
  const sorted = [...dice].sort((a, b) => a - b).join('');
  return sorted === '12345' || sorted === '23456';
}

/**
 * Check for full house (3 of one kind + 2 of another)
 */
function hasFullHouse(dice: number[]): boolean {
  const counts = Array.from(getCounts(dice).values()).sort((a, b) => b - a);
  return counts[0] === 3 && counts[1] === 2;
}

/**
 * Sum all dice
 */
function sumAll(dice: number[]): number {
  return dice.reduce((sum, d) => sum + d, 0);
}

/**
 * Generate all 5-dice subsets from 6 dice
 * Used by Sixth Blessing to find the best 5 of 6 for each category
 * Returns 6 possible combinations (dropping each die once)
 */
function get5of6Subsets(dice: number[]): number[][] {
  if (dice.length !== 6) return [dice];

  const subsets: number[][] = [];
  for (let i = 0; i < 6; i++) {
    // Create subset excluding index i
    const subset = [...dice.slice(0, i), ...dice.slice(i + 1)];
    subsets.push(subset);
  }
  return subsets;
}

/**
 * Find the best score for a category across all 5-of-6 subsets
 * Used by Sixth Blessing scoring
 */
function findBestScoreFor6Dice(dice: number[], calculate: (d: number[]) => number): { score: number; subset: number[] } {
  const subsets = get5of6Subsets(dice);
  let bestScore = -1;
  let bestSubset = dice.slice(0, 5);

  for (const subset of subsets) {
    const score = calculate(subset);
    if (score > bestScore) {
      bestScore = score;
      bestSubset = subset;
    }
  }

  return { score: bestScore, subset: bestSubset };
}

// =============================================================================
// SPECIAL SECTION DETECTION (Blessing of Expansion)
// =============================================================================

/**
 * Check for two pair (two different pairs, NOT full house or 4-of-a-kind)
 * Examples: [3,3,5,5,2] = true, [3,3,3,5,5] = false (full house takes precedence)
 */
function hasTwoPair(dice: number[]): boolean {
  const counts = Array.from(getCounts(dice).values()).sort((a, b) => b - a);
  // Need at least 2 pairs, but NOT a full house or 4-of-a-kind
  const pairCount = counts.filter((c) => c >= 2).length;
  return pairCount >= 2 && !hasFullHouse(dice) && !hasNOfAKind(dice, 4);
}

/**
 * Check if all dice show odd numbers (1, 3, 5)
 */
function isAllOdd(dice: number[]): boolean {
  return dice.every((d) => d % 2 === 1);
}

/**
 * Check if all dice show even numbers (2, 4, 6)
 */
function isAllEven(dice: number[]): boolean {
  return dice.every((d) => d % 2 === 0);
}

/**
 * Check if all dice show high numbers (4, 5, 6)
 */
function isAllHigh(dice: number[]): boolean {
  return dice.every((d) => d >= 4);
}

/**
 * Create initial category definitions
 */
function createCategories(): Map<CategoryId, Category> {
  const categories = new Map<CategoryId, Category>();

  // Upper section
  categories.set('ones', {
    id: 'ones',
    name: 'Ones',
    description: 'Sum of all ones',
    section: 'upper',
    score: null,
    calculate: (dice) => sumOfValue(dice, 1),
  });

  categories.set('twos', {
    id: 'twos',
    name: 'Twos',
    description: 'Sum of all twos',
    section: 'upper',
    score: null,
    calculate: (dice) => sumOfValue(dice, 2),
  });

  categories.set('threes', {
    id: 'threes',
    name: 'Threes',
    description: 'Sum of all threes',
    section: 'upper',
    score: null,
    calculate: (dice) => sumOfValue(dice, 3),
  });

  categories.set('fours', {
    id: 'fours',
    name: 'Fours',
    description: 'Sum of all fours',
    section: 'upper',
    score: null,
    calculate: (dice) => sumOfValue(dice, 4),
  });

  categories.set('fives', {
    id: 'fives',
    name: 'Fives',
    description: 'Sum of all fives',
    section: 'upper',
    score: null,
    calculate: (dice) => sumOfValue(dice, 5),
  });

  categories.set('sixes', {
    id: 'sixes',
    name: 'Sixes',
    description: 'Sum of all sixes',
    section: 'upper',
    score: null,
    calculate: (dice) => sumOfValue(dice, 6),
  });

  // Lower section
  categories.set('threeOfAKind', {
    id: 'threeOfAKind',
    name: '3 of a Kind',
    description: 'Sum of all dice if 3+ match',
    section: 'lower',
    score: null,
    calculate: (dice) => (hasNOfAKind(dice, 3) ? sumAll(dice) : 0),
  });

  categories.set('fourOfAKind', {
    id: 'fourOfAKind',
    name: '4 of a Kind',
    description: 'Sum of all dice if 4+ match',
    section: 'lower',
    score: null,
    calculate: (dice) => (hasNOfAKind(dice, 4) ? sumAll(dice) : 0),
  });

  categories.set('fullHouse', {
    id: 'fullHouse',
    name: 'Full House',
    description: '3 of one + 2 of another = 25',
    section: 'lower',
    score: null,
    calculate: (dice) => (hasFullHouse(dice) ? 25 : 0),
  });

  categories.set('smallStraight', {
    id: 'smallStraight',
    name: 'Sm Straight',
    description: '4 in sequence = 30',
    section: 'lower',
    score: null,
    calculate: (dice) => (hasSmallStraight(dice) ? 30 : 0),
  });

  categories.set('largeStraight', {
    id: 'largeStraight',
    name: 'Lg Straight',
    description: '5 in sequence = 40',
    section: 'lower',
    score: null,
    calculate: (dice) => (hasLargeStraight(dice) ? 40 : 0),
  });

  categories.set('fiveDice', {
    id: 'fiveDice',
    name: 'Five Dice',
    description: '5 of a kind = 50',
    section: 'lower',
    score: null,
    calculate: (dice) => (hasNOfAKind(dice, 5) ? 50 : 0),
  });

  categories.set('chance', {
    id: 'chance',
    name: 'Chance',
    description: 'Sum of all dice',
    section: 'lower',
    score: null,
    calculate: (dice) => sumAll(dice),
  });

  // Special section (Blessing of Expansion - unlocked after Mode 1)
  // All expansion categories score fixed 45 pts when condition is met
  categories.set('twoPair', {
    id: 'twoPair',
    name: 'Two Pair',
    description: '2 different pairs = 45 pts',
    section: 'special',
    score: null,
    calculate: (dice) => (hasTwoPair(dice) ? 45 : 0),
  });

  categories.set('allOdd', {
    id: 'allOdd',
    name: 'All Odd',
    description: 'All dice 1, 3, or 5 = 45 pts',
    section: 'special',
    score: null,
    calculate: (dice) => (isAllOdd(dice) ? 45 : 0),
  });

  categories.set('allEven', {
    id: 'allEven',
    name: 'All Even',
    description: 'All dice 2, 4, or 6 = 45 pts',
    section: 'special',
    score: null,
    calculate: (dice) => (isAllEven(dice) ? 45 : 0),
  });

  categories.set('allHigh', {
    id: 'allHigh',
    name: 'All High',
    description: 'All dice 4, 5, or 6 = 45 pts',
    section: 'special',
    score: null,
    calculate: (dice) => (isAllHigh(dice) ? 45 : 0),
  });

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
   * Calculate potential score for a category with given dice
   * If 6 dice are passed (Sixth Blessing), finds the best 5 of 6 for this category
   */
  calculatePotential(id: CategoryId, dice: number[]): number {
    const cat = this.state.categories.get(id);
    if (!cat) return 0;

    // If 6 dice, find the best 5-of-6 subset for this category
    if (dice.length === 6) {
      return findBestScoreFor6Dice(dice, cat.calculate).score;
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

    // If 6 dice, find the best 5-of-6 subset for this category
    if (dice.length === 6) {
      const result = findBestScoreFor6Dice(dice, cat.calculate);
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
