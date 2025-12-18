/**
 * Yahtzee Scorecard System
 * Handles all 13 categories and scoring logic
 */

import { GAME_RULES } from '@/config';

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
  | 'yahtzee'
  | 'chance';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  section: 'upper' | 'lower';
  score: number | null; // null = not filled yet
  calculate: (dice: number[]) => number;
}

export interface ScorecardState {
  categories: Map<CategoryId, Category>;
  upperBonus: number; // +35 if upper section >= 63
}

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

  categories.set('yahtzee', {
    id: 'yahtzee',
    name: 'Yahtzee',
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

  return categories;
}

export class Scorecard {
  private state: ScorecardState;

  constructor() {
    this.state = {
      categories: createCategories(),
      upperBonus: 0,
    };
  }

  /**
   * Reset scorecard for a new game
   */
  reset(): void {
    this.state = {
      categories: createCategories(),
      upperBonus: 0,
    };
  }

  /**
   * Get all categories
   */
  getCategories(): Category[] {
    return Array.from(this.state.categories.values());
  }

  /**
   * Get upper section categories
   */
  getUpperSection(): Category[] {
    return this.getCategories().filter((c) => c.section === 'upper');
  }

  /**
   * Get lower section categories
   */
  getLowerSection(): Category[] {
    return this.getCategories().filter((c) => c.section === 'lower');
  }

  /**
   * Get a specific category
   */
  getCategory(id: CategoryId): Category | undefined {
    return this.state.categories.get(id);
  }

  /**
   * Check if a category is available (not filled)
   */
  isAvailable(id: CategoryId): boolean {
    const cat = this.state.categories.get(id);
    return cat ? cat.score === null : false;
  }

  /**
   * Get available (unfilled) categories
   */
  getAvailableCategories(): Category[] {
    return this.getCategories().filter((c) => c.score === null);
  }

  /**
   * Calculate potential score for a category with given dice
   */
  calculatePotential(id: CategoryId, dice: number[]): number {
    const cat = this.state.categories.get(id);
    return cat ? cat.calculate(dice) : 0;
  }

  /**
   * Score a category with given dice
   * Returns the score achieved, or -1 if category already filled
   */
  score(id: CategoryId, dice: number[]): number {
    const cat = this.state.categories.get(id);
    if (!cat || cat.score !== null) {
      return -1; // Already filled
    }

    const points = cat.calculate(dice);
    cat.score = points;

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
   * Check and apply upper section bonus
   */
  private checkUpperBonus(): void {
    const upperSum = this.getUpperSection()
      .filter((c) => c.score !== null)
      .reduce((sum, c) => sum + (c.score || 0), 0);

    if (upperSum >= GAME_RULES.UPPER_BONUS_THRESHOLD && this.state.upperBonus === 0) {
      this.state.upperBonus = GAME_RULES.UPPER_BONUS_AMOUNT;
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
   * Get grand total
   */
  getTotal(): number {
    return this.getUpperSubtotal() + this.state.upperBonus + this.getLowerTotal();
  }

  /**
   * Check if scorecard is complete
   */
  isComplete(): boolean {
    return this.getAvailableCategories().length === 0;
  }

  /**
   * Get completion percentage
   */
  getCompletionPercent(): number {
    const total = this.getCategories().length;
    const filled = total - this.getAvailableCategories().length;
    return Math.round((filled / total) * 100);
  }

  /**
   * Get number of filled categories
   */
  getFilledCount(): number {
    return this.getCategories().length - this.getAvailableCategories().length;
  }
}

/**
 * Factory function to create a new scorecard
 * Use this instead of singleton for better testability and isolation
 */
export function createScorecard(): Scorecard {
  return new Scorecard();
}
