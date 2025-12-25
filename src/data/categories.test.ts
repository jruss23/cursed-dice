import { describe, it, expect } from 'vitest';
import { calculateScore } from './categories';

describe('Upper Section Scoring', () => {
  it('sums matching dice for ones', () => {
    expect(calculateScore('ones', [1, 1, 3, 4, 5])).toBe(2);
  });

  it('sums matching dice for twos', () => {
    expect(calculateScore('twos', [2, 2, 2, 4, 5])).toBe(6);
  });

  it('sums matching dice for threes', () => {
    expect(calculateScore('threes', [1, 3, 3, 3, 5])).toBe(9);
  });

  it('sums matching dice for fours', () => {
    expect(calculateScore('fours', [4, 4, 4, 4, 5])).toBe(16);
  });

  it('sums matching dice for fives', () => {
    expect(calculateScore('fives', [5, 5, 5, 5, 5])).toBe(25);
  });

  it('sums matching dice for sixes', () => {
    expect(calculateScore('sixes', [6, 6, 6, 2, 1])).toBe(18);
  });

  it('returns 0 when no matches', () => {
    expect(calculateScore('ones', [2, 3, 4, 5, 6])).toBe(0);
  });
});

describe('Three of a Kind', () => {
  it('scores sum when valid', () => {
    expect(calculateScore('threeOfAKind', [3, 3, 3, 4, 5])).toBe(18);
  });

  it('returns 0 when invalid', () => {
    expect(calculateScore('threeOfAKind', [1, 2, 3, 4, 5])).toBe(0);
  });

  it('five of a kind counts as three of a kind', () => {
    expect(calculateScore('threeOfAKind', [4, 4, 4, 4, 4])).toBe(20);
  });

  it('four of a kind counts as three of a kind', () => {
    expect(calculateScore('threeOfAKind', [2, 2, 2, 2, 5])).toBe(13);
  });
});

describe('Four of a Kind', () => {
  it('scores sum when valid', () => {
    expect(calculateScore('fourOfAKind', [4, 4, 4, 4, 2])).toBe(18);
  });

  it('returns 0 when invalid', () => {
    expect(calculateScore('fourOfAKind', [3, 3, 3, 4, 5])).toBe(0);
  });

  it('five of a kind counts as four of a kind', () => {
    expect(calculateScore('fourOfAKind', [5, 5, 5, 5, 5])).toBe(25);
  });
});

describe('Full House', () => {
  it('scores 25 when valid', () => {
    expect(calculateScore('fullHouse', [2, 2, 3, 3, 3])).toBe(25);
  });

  it('five of a kind is NOT a full house', () => {
    expect(calculateScore('fullHouse', [4, 4, 4, 4, 4])).toBe(0);
  });

  it('returns 0 when only pairs', () => {
    expect(calculateScore('fullHouse', [1, 1, 2, 2, 3])).toBe(0);
  });

  it('returns 0 when three of a kind without pair', () => {
    expect(calculateScore('fullHouse', [3, 3, 3, 1, 2])).toBe(0);
  });
});

describe('Small Straight', () => {
  it('scores 30 with 1-2-3-4', () => {
    expect(calculateScore('smallStraight', [1, 2, 3, 4, 6])).toBe(30);
  });

  it('scores 30 with 2-3-4-5', () => {
    expect(calculateScore('smallStraight', [2, 3, 4, 5, 1])).toBe(30);
  });

  it('scores 30 with 3-4-5-6', () => {
    expect(calculateScore('smallStraight', [3, 4, 5, 6, 1])).toBe(30);
  });

  it('works with duplicates', () => {
    expect(calculateScore('smallStraight', [1, 2, 3, 4, 4])).toBe(30);
  });

  it('returns 0 when invalid (gap in sequence)', () => {
    expect(calculateScore('smallStraight', [1, 2, 3, 5, 6])).toBe(0);
  });
});

describe('Large Straight', () => {
  it('scores 40 with 1-2-3-4-5', () => {
    expect(calculateScore('largeStraight', [1, 2, 3, 4, 5])).toBe(40);
  });

  it('scores 40 with 2-3-4-5-6', () => {
    expect(calculateScore('largeStraight', [2, 3, 4, 5, 6])).toBe(40);
  });

  it('works with 6 dice and duplicates (Sixth blessing)', () => {
    expect(calculateScore('largeStraight', [1, 2, 3, 4, 4, 5])).toBe(40);
  });

  it('works with 6 dice high straight', () => {
    expect(calculateScore('largeStraight', [2, 3, 4, 5, 5, 6])).toBe(40);
  });

  it('returns 0 when only small straight', () => {
    expect(calculateScore('largeStraight', [1, 2, 3, 4, 6])).toBe(0);
  });
});

describe('Five Dice (Yahtzee)', () => {
  it('scores 50 when all match', () => {
    expect(calculateScore('fiveDice', [4, 4, 4, 4, 4])).toBe(50);
  });

  it('returns 0 when not all match', () => {
    expect(calculateScore('fiveDice', [4, 4, 4, 4, 5])).toBe(0);
  });

  it('works with any value', () => {
    expect(calculateScore('fiveDice', [1, 1, 1, 1, 1])).toBe(50);
    expect(calculateScore('fiveDice', [6, 6, 6, 6, 6])).toBe(50);
  });
});

describe('Chance', () => {
  it('sums all dice', () => {
    expect(calculateScore('chance', [1, 2, 3, 4, 5])).toBe(15);
  });

  it('sums high rolls', () => {
    expect(calculateScore('chance', [6, 6, 6, 6, 6])).toBe(30);
  });

  it('sums low rolls', () => {
    expect(calculateScore('chance', [1, 1, 1, 1, 1])).toBe(5);
  });
});

describe('Special Categories - Two Pair', () => {
  it('scores sum when valid', () => {
    expect(calculateScore('twoPair', [2, 2, 4, 4, 6])).toBe(18);
  });

  it('full house counts as two pair', () => {
    expect(calculateScore('twoPair', [3, 3, 5, 5, 5])).toBe(21);
  });

  it('four of a kind does NOT count as two pair', () => {
    // Design choice: 4-of-a-kind should use the 4-of-a-kind category instead
    expect(calculateScore('twoPair', [4, 4, 4, 4, 1])).toBe(0);
  });

  it('returns 0 with only one pair', () => {
    expect(calculateScore('twoPair', [2, 2, 3, 4, 5])).toBe(0);
  });
});

describe('Special Categories - All Odd', () => {
  it('scores sum when all odd', () => {
    expect(calculateScore('allOdd', [1, 3, 3, 5, 5])).toBe(17);
  });

  it('returns 0 with any even', () => {
    expect(calculateScore('allOdd', [1, 2, 3, 5, 5])).toBe(0);
  });
});

describe('Special Categories - All Even', () => {
  it('scores sum when all even', () => {
    expect(calculateScore('allEven', [2, 4, 4, 6, 6])).toBe(22);
  });

  it('returns 0 with any odd', () => {
    expect(calculateScore('allEven', [2, 3, 4, 6, 6])).toBe(0);
  });
});

describe('Special Categories - All High', () => {
  it('scores sum when all 4-6', () => {
    expect(calculateScore('allHigh', [4, 5, 5, 6, 6])).toBe(26);
  });

  it('returns 0 with any low dice (1-3)', () => {
    expect(calculateScore('allHigh', [3, 4, 5, 6, 6])).toBe(0);
  });

  it('accepts all fours', () => {
    expect(calculateScore('allHigh', [4, 4, 4, 4, 4])).toBe(20);
  });
});
