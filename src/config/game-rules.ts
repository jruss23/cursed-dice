/**
 * Game Rules Configuration
 * Core game mechanics and constants
 */

// =============================================================================
// GAME RULES
// =============================================================================

export const GAME_RULES = {
  DICE_COUNT: 5,
  DICE_COUNT_WITH_SIXTH: 6,
  REROLLS_PER_TURN: 3,
  UPPER_BONUS_THRESHOLD: 63,
  UPPER_BONUS_AMOUNT: 35,
  CATEGORIES_COUNT: 13,
  CATEGORIES_WITH_EXPANSION: 17,
  PASS_THRESHOLD: 250,
  TOTAL_MODES: 4,
} as const;

// =============================================================================
// SCORING VALUES
// =============================================================================

export const SCORING = {
  FULL_HOUSE: 25,
  SMALL_STRAIGHT: 30,
  LARGE_STRAIGHT: 40,
  FIVE_DICE: 50,
  SPECIAL_CATEGORY: 45, // Blessing of Expansion categories (allOdd, allEven, allHigh, twoPair)
} as const;
