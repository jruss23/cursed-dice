/**
 * Scorecard Categories Configuration
 * Data-driven category definitions with scoring functions
 */

import { SCORING } from '@/config/game-rules';

// =============================================================================
// TYPES
// =============================================================================

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

export type CategorySection = 'upper' | 'lower' | 'special';

export interface CategoryConfig {
  id: CategoryId;
  name: string;
  shortName: string;
  description: string;
  section: CategorySection;
  calculate: (dice: number[]) => number;
}

// =============================================================================
// SCORING HELPERS
// =============================================================================

function sumOfValue(dice: number[], value: number): number {
  return dice.filter((d) => d === value).reduce((sum, d) => sum + d, 0);
}

function getCounts(dice: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const d of dice) {
    counts.set(d, (counts.get(d) || 0) + 1);
  }
  return counts;
}

function hasNOfAKind(dice: number[], n: number): boolean {
  const counts = getCounts(dice);
  return Array.from(counts.values()).some((count) => count >= n);
}

function hasSmallStraight(dice: number[]): boolean {
  const unique = [...new Set(dice)].sort((a, b) => a - b).join('');
  return unique.includes('1234') || unique.includes('2345') || unique.includes('3456');
}

function hasLargeStraight(dice: number[]): boolean {
  // Deduplicate for 6-dice case (Sixth blessing)
  const unique = [...new Set(dice)].sort((a, b) => a - b).join('');
  return unique === '12345' || unique === '23456';
}

function hasFullHouse(dice: number[]): boolean {
  const counts = Array.from(getCounts(dice).values()).sort((a, b) => b - a);
  return counts[0] === 3 && counts[1] === 2;
}

function hasTwoPair(dice: number[]): boolean {
  const counts = Array.from(getCounts(dice).values()).sort((a, b) => b - a);
  return counts[0] >= 2 && counts[1] >= 2;
}

function sumAll(dice: number[]): number {
  return dice.reduce((sum, d) => sum + d, 0);
}

// =============================================================================
// CATEGORY DEFINITIONS
// =============================================================================

export const UPPER_CATEGORIES: readonly CategoryConfig[] = [
  {
    id: 'ones',
    name: 'Ones',
    shortName: '1s',
    description: 'Sum of all ones',
    section: 'upper',
    calculate: (dice) => sumOfValue(dice, 1),
  },
  {
    id: 'twos',
    name: 'Twos',
    shortName: '2s',
    description: 'Sum of all twos',
    section: 'upper',
    calculate: (dice) => sumOfValue(dice, 2),
  },
  {
    id: 'threes',
    name: 'Threes',
    shortName: '3s',
    description: 'Sum of all threes',
    section: 'upper',
    calculate: (dice) => sumOfValue(dice, 3),
  },
  {
    id: 'fours',
    name: 'Fours',
    shortName: '4s',
    description: 'Sum of all fours',
    section: 'upper',
    calculate: (dice) => sumOfValue(dice, 4),
  },
  {
    id: 'fives',
    name: 'Fives',
    shortName: '5s',
    description: 'Sum of all fives',
    section: 'upper',
    calculate: (dice) => sumOfValue(dice, 5),
  },
  {
    id: 'sixes',
    name: 'Sixes',
    shortName: '6s',
    description: 'Sum of all sixes',
    section: 'upper',
    calculate: (dice) => sumOfValue(dice, 6),
  },
] as const;

export const LOWER_CATEGORIES: readonly CategoryConfig[] = [
  {
    id: 'threeOfAKind',
    name: 'Three of a Kind',
    shortName: '3 of Kind',
    description: 'Sum of all dice if 3+ match',
    section: 'lower',
    calculate: (dice) => (hasNOfAKind(dice, 3) ? sumAll(dice) : 0),
  },
  {
    id: 'fourOfAKind',
    name: 'Four of a Kind',
    shortName: '4 of Kind',
    description: 'Sum of all dice if 4+ match',
    section: 'lower',
    calculate: (dice) => (hasNOfAKind(dice, 4) ? sumAll(dice) : 0),
  },
  {
    id: 'fullHouse',
    name: 'Full House',
    shortName: 'Full House',
    description: '3 of one kind + 2 of another',
    section: 'lower',
    calculate: (dice) => (hasFullHouse(dice) ? SCORING.FULL_HOUSE : 0),
  },
  {
    id: 'smallStraight',
    name: 'Small Straight',
    shortName: 'Sm Straight',
    description: '4 dice in sequence',
    section: 'lower',
    calculate: (dice) => (hasSmallStraight(dice) ? SCORING.SMALL_STRAIGHT : 0),
  },
  {
    id: 'largeStraight',
    name: 'Large Straight',
    shortName: 'Lg Straight',
    description: '5 dice in sequence',
    section: 'lower',
    calculate: (dice) => (hasLargeStraight(dice) ? SCORING.LARGE_STRAIGHT : 0),
  },
  {
    id: 'fiveDice',
    name: '5 Dice!',
    shortName: '5 Dice!',
    description: '5 of a kind',
    section: 'lower',
    calculate: (dice) => (hasNOfAKind(dice, 5) ? SCORING.FIVE_DICE : 0),
  },
  {
    id: 'chance',
    name: 'Chance',
    shortName: 'Chance',
    description: 'Sum of all dice',
    section: 'lower',
    calculate: sumAll,
  },
] as const;

export const SPECIAL_CATEGORIES: readonly CategoryConfig[] = [
  {
    id: 'twoPair',
    name: 'Two Pair',
    shortName: 'Two Pair',
    description: '2 different pairs = 45 pts',
    section: 'special',
    calculate: (dice) => (hasTwoPair(dice) ? SCORING.SPECIAL_CATEGORY : 0),
  },
  {
    id: 'allOdd',
    name: 'All Odd',
    shortName: 'All Odd',
    description: 'All dice 1, 3, or 5 = 45 pts',
    section: 'special',
    calculate: (dice) => (dice.every((d) => d % 2 === 1) ? SCORING.SPECIAL_CATEGORY : 0),
  },
  {
    id: 'allEven',
    name: 'All Even',
    shortName: 'All Even',
    description: 'All dice 2, 4, or 6 = 45 pts',
    section: 'special',
    calculate: (dice) => (dice.every((d) => d % 2 === 0) ? SCORING.SPECIAL_CATEGORY : 0),
  },
  {
    id: 'allHigh',
    name: 'All High',
    shortName: 'All High',
    description: 'All dice 4, 5, or 6 = 45 pts',
    section: 'special',
    calculate: (dice) => (dice.every((d) => d >= 4) ? SCORING.SPECIAL_CATEGORY : 0),
  },
] as const;

// All categories combined
export const ALL_CATEGORIES: readonly CategoryConfig[] = [
  ...UPPER_CATEGORIES,
  ...LOWER_CATEGORIES,
  ...SPECIAL_CATEGORIES,
] as const;

// Base categories (without special)
export const BASE_CATEGORIES: readonly CategoryConfig[] = [
  ...UPPER_CATEGORIES,
  ...LOWER_CATEGORIES,
] as const;

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

const categoryMap = new Map<CategoryId, CategoryConfig>(
  ALL_CATEGORIES.map((c) => [c.id, c])
);

export function getCategoryConfig(id: CategoryId): CategoryConfig {
  const config = categoryMap.get(id);
  if (!config) throw new Error(`Unknown category: ${id}`);
  return config;
}

export function getCategoryName(id: CategoryId): string {
  return getCategoryConfig(id).name;
}

export function getCategoryShortName(id: CategoryId): string {
  return getCategoryConfig(id).shortName;
}

export function calculateScore(id: CategoryId, dice: number[]): number {
  return getCategoryConfig(id).calculate(dice);
}

export function getCategoriesBySection(section: CategorySection): CategoryConfig[] {
  return ALL_CATEGORIES.filter((c) => c.section === section);
}

export function getUpperCategoryIds(): CategoryId[] {
  return UPPER_CATEGORIES.map((c) => c.id);
}

export function getLowerCategoryIds(): CategoryId[] {
  return LOWER_CATEGORIES.map((c) => c.id);
}

export function getSpecialCategoryIds(): CategoryId[] {
  return SPECIAL_CATEGORIES.map((c) => c.id);
}

export function getBaseCategoryIds(): CategoryId[] {
  return BASE_CATEGORIES.map((c) => c.id);
}
