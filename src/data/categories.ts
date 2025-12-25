/**
 * Scorecard Categories Configuration
 *
 * This is the SINGLE SOURCE OF TRUTH for all category data:
 * - Category IDs (use CATEGORY_ID.XXX instead of magic strings)
 * - Category metadata (names, descriptions, sections)
 * - Scoring functions for each category
 *
 * SECTIONS:
 * - 'upper' (UI: "NUMBERS") - Categories 1s through 6s, scores sum of matching dice
 * - 'lower' (UI: "COMBOS") - Combination categories like Full House, Straights
 * - 'special' (UI: "EXPANSION") - Unlocked via Blessing of Expansion after Mode 1
 */

import { SCORING } from '@/config/game-rules';

// =============================================================================
// CATEGORY IDS - Single source of truth for all category identifiers
// =============================================================================

/**
 * Const object containing all category IDs.
 * Use these instead of magic strings: CATEGORY_ID.ONES instead of 'ones'
 *
 * @example
 * // Good - type-safe and refactorable
 * scorecard.score(CATEGORY_ID.FOURS, dice);
 *
 * // Bad - magic string, typo-prone
 * scorecard.score('fours', dice);
 */
export const CATEGORY_ID = {
  // Numbers section (UI: "NUMBERS") - sum of matching dice values
  ONES: 'ones',
  TWOS: 'twos',
  THREES: 'threes',
  FOURS: 'fours',
  FIVES: 'fives',
  SIXES: 'sixes',
  // Combos section (UI: "COMBOS") - dice combinations
  THREE_OF_A_KIND: 'threeOfAKind',
  FOUR_OF_A_KIND: 'fourOfAKind',
  FULL_HOUSE: 'fullHouse',
  SMALL_STRAIGHT: 'smallStraight',
  LARGE_STRAIGHT: 'largeStraight',
  FIVE_DICE: 'fiveDice',
  CHANCE: 'chance',
  // Expansion section (UI: "EXPANSION") - unlocked via Blessing of Expansion
  TWO_PAIR: 'twoPair',
  ALL_ODD: 'allOdd',
  ALL_EVEN: 'allEven',
  ALL_HIGH: 'allHigh',
} as const;

/**
 * Union type of all valid category ID strings.
 * Derived from CATEGORY_ID to ensure type safety.
 */
export type CategoryId = (typeof CATEGORY_ID)[keyof typeof CATEGORY_ID];

/**
 * Internal section identifiers used for scoring logic and styling.
 * Note: UI displays these as "NUMBERS", "COMBOS", and "EXPANSION"
 */
export type CategorySection = 'upper' | 'lower' | 'special';

/**
 * Configuration for a single scoring category.
 */
export interface CategoryConfig {
  /** Unique identifier for this category */
  id: CategoryId;
  /** Full display name (e.g., "Three of a Kind") */
  name: string;
  /** Abbreviated name for compact layouts (e.g., "3 of a Kind") */
  shortName: string;
  /** Brief description shown in tooltips/help */
  description: string;
  /** Which section this category belongs to */
  section: CategorySection;
  /** Scoring function - takes dice values, returns score (0 if invalid) */
  calculate: (dice: number[]) => number;
}

// =============================================================================
// SCORING HELPERS - Internal functions for category validation
// =============================================================================

/** Sum all dice matching a specific value (for Numbers section) */
function sumOfValue(dice: number[], value: number): number {
  return dice.filter((d) => d === value).reduce((sum, d) => sum + d, 0);
}

/** Count occurrences of each die value */
function getCounts(dice: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const d of dice) {
    counts.set(d, (counts.get(d) || 0) + 1);
  }
  return counts;
}

/** Check if dice contain N or more of any single value */
function hasNOfAKind(dice: number[], n: number): boolean {
  const counts = getCounts(dice);
  return Array.from(counts.values()).some((count) => count >= n);
}

/** Check for 4 consecutive values (1-2-3-4, 2-3-4-5, or 3-4-5-6) */
function hasSmallStraight(dice: number[]): boolean {
  const unique = [...new Set(dice)].sort((a, b) => a - b).join('');
  return unique.includes('1234') || unique.includes('2345') || unique.includes('3456');
}

/** Check for 5 consecutive values (1-2-3-4-5 or 2-3-4-5-6) */
function hasLargeStraight(dice: number[]): boolean {
  // Deduplicate for 6-dice case (Sixth Blessing allows best 5 of 6)
  const unique = [...new Set(dice)].sort((a, b) => a - b).join('');
  return unique === '12345' || unique === '23456';
}

/** Check for exactly 3 of one value and 2 of another */
function hasFullHouse(dice: number[]): boolean {
  const counts = Array.from(getCounts(dice).values()).sort((a, b) => b - a);
  return counts[0] === 3 && counts[1] === 2;
}

/** Check for two different pairs (4-of-a-kind does NOT count) */
function hasTwoPair(dice: number[]): boolean {
  const counts = Array.from(getCounts(dice).values()).sort((a, b) => b - a);
  return counts[0] >= 2 && counts[1] >= 2;
}

/** Sum all dice values (used for Chance and N-of-a-kind) */
function sumAll(dice: number[]): number {
  return dice.reduce((sum, d) => sum + d, 0);
}

// =============================================================================
// CATEGORY DEFINITIONS
// =============================================================================

/**
 * Numbers section categories (UI: "NUMBERS")
 * Score = sum of dice matching the target value
 * Bonus: +35 points if section total >= 63 (equivalent to 3 of each)
 */
export const UPPER_CATEGORIES: readonly CategoryConfig[] = [
  {
    id: CATEGORY_ID.ONES,
    name: 'Ones',
    shortName: '1s',
    description: 'Sum of all ones',
    section: 'upper',
    calculate: (dice) => sumOfValue(dice, 1),
  },
  {
    id: CATEGORY_ID.TWOS,
    name: 'Twos',
    shortName: '2s',
    description: 'Sum of all twos',
    section: 'upper',
    calculate: (dice) => sumOfValue(dice, 2),
  },
  {
    id: CATEGORY_ID.THREES,
    name: 'Threes',
    shortName: '3s',
    description: 'Sum of all threes',
    section: 'upper',
    calculate: (dice) => sumOfValue(dice, 3),
  },
  {
    id: CATEGORY_ID.FOURS,
    name: 'Fours',
    shortName: '4s',
    description: 'Sum of all fours',
    section: 'upper',
    calculate: (dice) => sumOfValue(dice, 4),
  },
  {
    id: CATEGORY_ID.FIVES,
    name: 'Fives',
    shortName: '5s',
    description: 'Sum of all fives',
    section: 'upper',
    calculate: (dice) => sumOfValue(dice, 5),
  },
  {
    id: CATEGORY_ID.SIXES,
    name: 'Sixes',
    shortName: '6s',
    description: 'Sum of all sixes',
    section: 'upper',
    calculate: (dice) => sumOfValue(dice, 6),
  },
] as const;

/**
 * Combos section categories (UI: "COMBOS")
 * Various dice combinations with fixed or variable scores
 */
export const LOWER_CATEGORIES: readonly CategoryConfig[] = [
  {
    id: CATEGORY_ID.THREE_OF_A_KIND,
    name: 'Three of a Kind',
    shortName: '3 of a Kind',
    description: 'Sum of all dice if 3+ match',
    section: 'lower',
    calculate: (dice) => (hasNOfAKind(dice, 3) ? sumAll(dice) : 0),
  },
  {
    id: CATEGORY_ID.FOUR_OF_A_KIND,
    name: 'Four of a Kind',
    shortName: '4 of a Kind',
    description: 'Sum of all dice if 4+ match',
    section: 'lower',
    calculate: (dice) => (hasNOfAKind(dice, 4) ? sumAll(dice) : 0),
  },
  {
    id: CATEGORY_ID.FULL_HOUSE,
    name: 'Full House',
    shortName: 'Full House',
    description: '3 of one kind + 2 of another',
    section: 'lower',
    calculate: (dice) => (hasFullHouse(dice) ? SCORING.FULL_HOUSE : 0),
  },
  {
    id: CATEGORY_ID.SMALL_STRAIGHT,
    name: 'Small Straight',
    shortName: 'Sm Straight',
    description: '4 dice in sequence',
    section: 'lower',
    calculate: (dice) => (hasSmallStraight(dice) ? SCORING.SMALL_STRAIGHT : 0),
  },
  {
    id: CATEGORY_ID.LARGE_STRAIGHT,
    name: 'Large Straight',
    shortName: 'Lg Straight',
    description: '5 dice in sequence',
    section: 'lower',
    calculate: (dice) => (hasLargeStraight(dice) ? SCORING.LARGE_STRAIGHT : 0),
  },
  {
    id: CATEGORY_ID.FIVE_DICE,
    name: '5 of a Kind',
    shortName: '5 of a Kind',
    description: '5 of a kind',
    section: 'lower',
    calculate: (dice) => (hasNOfAKind(dice, 5) ? SCORING.FIVE_DICE : 0),
  },
  {
    id: CATEGORY_ID.CHANCE,
    name: 'Chance',
    shortName: 'Chance',
    description: 'Sum of all dice',
    section: 'lower',
    calculate: sumAll,
  },
] as const;

/**
 * Expansion section categories (UI: "EXPANSION")
 * Unlocked via "Blessing of Expansion" after completing Mode 1
 * All categories score a fixed 45 points when valid
 */
export const SPECIAL_CATEGORIES: readonly CategoryConfig[] = [
  {
    id: CATEGORY_ID.TWO_PAIR,
    name: 'Two Pair',
    shortName: 'Two Pair',
    description: '2 different pairs = 45 pts',
    section: 'special',
    calculate: (dice) => (hasTwoPair(dice) ? SCORING.SPECIAL_CATEGORY : 0),
  },
  {
    id: CATEGORY_ID.ALL_ODD,
    name: 'All Odd',
    shortName: 'All Odd',
    description: 'All dice 1, 3, or 5 = 45 pts',
    section: 'special',
    calculate: (dice) => (dice.every((d) => d % 2 === 1) ? SCORING.SPECIAL_CATEGORY : 0),
  },
  {
    id: CATEGORY_ID.ALL_EVEN,
    name: 'All Even',
    shortName: 'All Even',
    description: 'All dice 2, 4, or 6 = 45 pts',
    section: 'special',
    calculate: (dice) => (dice.every((d) => d % 2 === 0) ? SCORING.SPECIAL_CATEGORY : 0),
  },
  {
    id: CATEGORY_ID.ALL_HIGH,
    name: 'All High',
    shortName: 'All High',
    description: 'All dice 4, 5, or 6 = 45 pts',
    section: 'special',
    calculate: (dice) => (dice.every((d) => d >= 4) ? SCORING.SPECIAL_CATEGORY : 0),
  },
] as const;

/** All 17 categories (Numbers + Combos + Expansion) */
export const ALL_CATEGORIES: readonly CategoryConfig[] = [
  ...UPPER_CATEGORIES,
  ...LOWER_CATEGORIES,
  ...SPECIAL_CATEGORIES,
] as const;

/** Base 13 categories required for game completion (Numbers + Combos) */
export const BASE_CATEGORIES: readonly CategoryConfig[] = [
  ...UPPER_CATEGORIES,
  ...LOWER_CATEGORIES,
] as const;

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/** Pre-built lookup map for O(1) category access */
const categoryMap = new Map<CategoryId, CategoryConfig>(
  ALL_CATEGORIES.map((c) => [c.id, c])
);

/**
 * Get full category configuration by ID.
 * @throws Error if category ID is invalid
 */
export function getCategoryConfig(id: CategoryId): CategoryConfig {
  const config = categoryMap.get(id);
  if (!config) throw new Error(`Unknown category: ${id}`);
  return config;
}

/** Get the full display name for a category */
export function getCategoryName(id: CategoryId): string {
  return getCategoryConfig(id).name;
}

/** Get the short display name for compact layouts */
export function getCategoryShortName(id: CategoryId): string {
  return getCategoryConfig(id).shortName;
}

/**
 * Calculate score for a category given dice values.
 * Returns 0 if the dice don't satisfy the category requirements.
 */
export function calculateScore(id: CategoryId, dice: number[]): number {
  return getCategoryConfig(id).calculate(dice);
}

/** Get all categories in a specific section */
export function getCategoriesBySection(section: CategorySection): CategoryConfig[] {
  return ALL_CATEGORIES.filter((c) => c.section === section);
}

/** Get IDs for Numbers section (1s-6s) */
export function getUpperCategoryIds(): CategoryId[] {
  return UPPER_CATEGORIES.map((c) => c.id);
}

/** Get IDs for Combos section */
export function getLowerCategoryIds(): CategoryId[] {
  return LOWER_CATEGORIES.map((c) => c.id);
}

/** Get IDs for Expansion section */
export function getSpecialCategoryIds(): CategoryId[] {
  return SPECIAL_CATEGORIES.map((c) => c.id);
}

/** Get IDs for base 13 categories (Numbers + Combos, excludes Expansion) */
export function getBaseCategoryIds(): CategoryId[] {
  return BASE_CATEGORIES.map((c) => c.id);
}
