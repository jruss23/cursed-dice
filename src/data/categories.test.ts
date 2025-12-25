import { describe, it, expect } from 'vitest';
import { calculateScore, CATEGORY_ID } from './categories';
import { SCORING } from '@/config/game-rules';

describe('Upper Section Scoring', () => {
  it('sums matching dice for ones', () => {
    expect(calculateScore(CATEGORY_ID.ONES, [1, 1, 3, 4, 5])).toBe(2);
  });

  it('sums matching dice for twos', () => {
    expect(calculateScore(CATEGORY_ID.TWOS, [2, 2, 2, 4, 5])).toBe(6);
  });

  it('sums matching dice for threes', () => {
    expect(calculateScore(CATEGORY_ID.THREES, [1, 3, 3, 3, 5])).toBe(9);
  });

  it('sums matching dice for fours', () => {
    expect(calculateScore(CATEGORY_ID.FOURS, [4, 4, 4, 4, 5])).toBe(16);
  });

  it('sums matching dice for fives', () => {
    expect(calculateScore(CATEGORY_ID.FIVES, [5, 5, 5, 5, 5])).toBe(25);
  });

  it('sums matching dice for sixes', () => {
    expect(calculateScore(CATEGORY_ID.SIXES, [6, 6, 6, 2, 1])).toBe(18);
  });

  it('returns 0 when no matches', () => {
    expect(calculateScore(CATEGORY_ID.ONES, [2, 3, 4, 5, 6])).toBe(0);
  });
});

describe('Three of a Kind', () => {
  it('scores sum when valid', () => {
    expect(calculateScore(CATEGORY_ID.THREE_OF_A_KIND, [3, 3, 3, 4, 5])).toBe(18);
  });

  it('returns 0 when invalid', () => {
    expect(calculateScore(CATEGORY_ID.THREE_OF_A_KIND, [1, 2, 3, 4, 5])).toBe(0);
  });

  it('five of a kind counts as three of a kind', () => {
    expect(calculateScore(CATEGORY_ID.THREE_OF_A_KIND, [4, 4, 4, 4, 4])).toBe(20);
  });

  it('four of a kind counts as three of a kind', () => {
    expect(calculateScore(CATEGORY_ID.THREE_OF_A_KIND, [2, 2, 2, 2, 5])).toBe(13);
  });
});

describe('Four of a Kind', () => {
  it('scores sum when valid', () => {
    expect(calculateScore(CATEGORY_ID.FOUR_OF_A_KIND, [4, 4, 4, 4, 2])).toBe(18);
  });

  it('returns 0 when invalid', () => {
    expect(calculateScore(CATEGORY_ID.FOUR_OF_A_KIND, [3, 3, 3, 4, 5])).toBe(0);
  });

  it('five of a kind counts as four of a kind', () => {
    expect(calculateScore(CATEGORY_ID.FOUR_OF_A_KIND, [5, 5, 5, 5, 5])).toBe(25);
  });
});

describe('Full House', () => {
  it('scores 25 when valid', () => {
    expect(calculateScore(CATEGORY_ID.FULL_HOUSE, [2, 2, 3, 3, 3])).toBe(25);
  });

  it('five of a kind is NOT a full house', () => {
    expect(calculateScore(CATEGORY_ID.FULL_HOUSE, [4, 4, 4, 4, 4])).toBe(0);
  });

  it('returns 0 when only pairs', () => {
    expect(calculateScore(CATEGORY_ID.FULL_HOUSE, [1, 1, 2, 2, 3])).toBe(0);
  });

  it('returns 0 when three of a kind without pair', () => {
    expect(calculateScore(CATEGORY_ID.FULL_HOUSE, [3, 3, 3, 1, 2])).toBe(0);
  });
});

describe('Small Straight', () => {
  it('scores 30 with 1-2-3-4', () => {
    expect(calculateScore(CATEGORY_ID.SMALL_STRAIGHT, [1, 2, 3, 4, 6])).toBe(30);
  });

  it('scores 30 with 2-3-4-5', () => {
    expect(calculateScore(CATEGORY_ID.SMALL_STRAIGHT, [2, 3, 4, 5, 1])).toBe(30);
  });

  it('scores 30 with 3-4-5-6', () => {
    expect(calculateScore(CATEGORY_ID.SMALL_STRAIGHT, [3, 4, 5, 6, 1])).toBe(30);
  });

  it('works with duplicates', () => {
    expect(calculateScore(CATEGORY_ID.SMALL_STRAIGHT, [1, 2, 3, 4, 4])).toBe(30);
  });

  it('returns 0 when invalid (gap in sequence)', () => {
    expect(calculateScore(CATEGORY_ID.SMALL_STRAIGHT, [1, 2, 3, 5, 6])).toBe(0);
  });
});

describe('Large Straight', () => {
  it('scores 40 with 1-2-3-4-5', () => {
    expect(calculateScore(CATEGORY_ID.LARGE_STRAIGHT, [1, 2, 3, 4, 5])).toBe(40);
  });

  it('scores 40 with 2-3-4-5-6', () => {
    expect(calculateScore(CATEGORY_ID.LARGE_STRAIGHT, [2, 3, 4, 5, 6])).toBe(40);
  });

  it('works with 6 dice and duplicates (Sixth blessing)', () => {
    expect(calculateScore(CATEGORY_ID.LARGE_STRAIGHT, [1, 2, 3, 4, 4, 5])).toBe(40);
  });

  it('works with 6 dice high straight', () => {
    expect(calculateScore(CATEGORY_ID.LARGE_STRAIGHT, [2, 3, 4, 5, 5, 6])).toBe(40);
  });

  it('returns 0 when only small straight', () => {
    expect(calculateScore(CATEGORY_ID.LARGE_STRAIGHT, [1, 2, 3, 4, 6])).toBe(0);
  });
});

describe('Five Dice (Yahtzee)', () => {
  it('scores 50 when all match', () => {
    expect(calculateScore(CATEGORY_ID.FIVE_DICE, [4, 4, 4, 4, 4])).toBe(50);
  });

  it('returns 0 when not all match', () => {
    expect(calculateScore(CATEGORY_ID.FIVE_DICE, [4, 4, 4, 4, 5])).toBe(0);
  });

  it('works with any value', () => {
    expect(calculateScore(CATEGORY_ID.FIVE_DICE, [1, 1, 1, 1, 1])).toBe(50);
    expect(calculateScore(CATEGORY_ID.FIVE_DICE, [6, 6, 6, 6, 6])).toBe(50);
  });
});

describe('Chance', () => {
  it('sums all dice', () => {
    expect(calculateScore(CATEGORY_ID.CHANCE, [1, 2, 3, 4, 5])).toBe(15);
  });

  it('sums high rolls', () => {
    expect(calculateScore(CATEGORY_ID.CHANCE, [6, 6, 6, 6, 6])).toBe(30);
  });

  it('sums low rolls', () => {
    expect(calculateScore(CATEGORY_ID.CHANCE, [1, 1, 1, 1, 1])).toBe(5);
  });
});

describe('Special Categories - Two Pair', () => {
  it('scores fixed points when valid', () => {
    expect(calculateScore(CATEGORY_ID.TWO_PAIR, [2, 2, 4, 4, 6])).toBe(SCORING.SPECIAL_CATEGORY);
  });

  it('full house counts as two pair', () => {
    expect(calculateScore(CATEGORY_ID.TWO_PAIR, [3, 3, 5, 5, 5])).toBe(SCORING.SPECIAL_CATEGORY);
  });

  it('four of a kind does NOT count as two pair', () => {
    // Design choice: 4-of-a-kind should use the 4-of-a-kind category instead
    expect(calculateScore(CATEGORY_ID.TWO_PAIR, [4, 4, 4, 4, 1])).toBe(0);
  });

  it('returns 0 with only one pair', () => {
    expect(calculateScore(CATEGORY_ID.TWO_PAIR, [2, 2, 3, 4, 5])).toBe(0);
  });
});

describe('Special Categories - All Odd', () => {
  it('scores fixed points when all odd', () => {
    expect(calculateScore(CATEGORY_ID.ALL_ODD, [1, 3, 3, 5, 5])).toBe(SCORING.SPECIAL_CATEGORY);
  });

  it('returns 0 with any even', () => {
    expect(calculateScore(CATEGORY_ID.ALL_ODD, [1, 2, 3, 5, 5])).toBe(0);
  });
});

describe('Special Categories - All Even', () => {
  it('scores fixed points when all even', () => {
    expect(calculateScore(CATEGORY_ID.ALL_EVEN, [2, 4, 4, 6, 6])).toBe(SCORING.SPECIAL_CATEGORY);
  });

  it('returns 0 with any odd', () => {
    expect(calculateScore(CATEGORY_ID.ALL_EVEN, [2, 3, 4, 6, 6])).toBe(0);
  });
});

describe('Special Categories - All High', () => {
  it('scores fixed points when all 4-6', () => {
    expect(calculateScore(CATEGORY_ID.ALL_HIGH, [4, 5, 5, 6, 6])).toBe(SCORING.SPECIAL_CATEGORY);
  });

  it('returns 0 with any low dice (1-3)', () => {
    expect(calculateScore(CATEGORY_ID.ALL_HIGH, [3, 4, 5, 6, 6])).toBe(0);
  });

  it('accepts all fours', () => {
    expect(calculateScore(CATEGORY_ID.ALL_HIGH, [4, 4, 4, 4, 4])).toBe(SCORING.SPECIAL_CATEGORY);
  });
});
