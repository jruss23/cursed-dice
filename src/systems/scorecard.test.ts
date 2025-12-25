import { describe, it, expect, beforeEach } from 'vitest';
import { createScorecard, Scorecard, CATEGORIES_TO_COMPLETE } from './scorecard';
import { SCORING } from '@/config/game-rules';

describe('Scorecard', () => {
  let scorecard: Scorecard;

  beforeEach(() => {
    scorecard = createScorecard();
  });

  describe('Scoring Basics', () => {
    it('starts with all categories unfilled', () => {
      const available = scorecard.getAvailableCategories();
      expect(available.length).toBe(13); // Base categories only (special disabled by default)
    });

    it('fills a category when scored', () => {
      const score = scorecard.score('ones', [1, 1, 3, 4, 5]);
      expect(score).toBe(2);
      expect(scorecard.getCategory('ones')?.score).toBe(2);
    });

    it('prevents scoring the same category twice', () => {
      scorecard.score('ones', [1, 1, 1, 1, 1]);
      const secondAttempt = scorecard.score('ones', [1, 1, 3, 4, 5]);
      expect(secondAttempt).toBe(-1);
    });

    it('reduces available count after scoring', () => {
      const before = scorecard.getAvailableCategories().length;
      scorecard.score('chance', [1, 2, 3, 4, 5]);
      const after = scorecard.getAvailableCategories().length;
      expect(after).toBe(before - 1);
    });

    it('allows scoring zero (zeroing out)', () => {
      const score = scorecard.score('fiveDice', [1, 2, 3, 4, 5]);
      expect(score).toBe(0);
      expect(scorecard.getCategory('fiveDice')?.score).toBe(0);
    });
  });

  describe('Upper Bonus', () => {
    it('starts with no bonus', () => {
      expect(scorecard.getUpperBonus()).toBe(0);
    });

    it('awards +35 bonus when upper section reaches 63', () => {
      // Score 3 of each in upper section = 3+6+9+12+15+18 = 63
      scorecard.score('ones', [1, 1, 1, 2, 3]);   // 3
      scorecard.score('twos', [2, 2, 2, 1, 3]);   // 6
      scorecard.score('threes', [3, 3, 3, 1, 2]); // 9
      scorecard.score('fours', [4, 4, 4, 1, 2]);  // 12
      scorecard.score('fives', [5, 5, 5, 1, 2]);  // 15
      scorecard.score('sixes', [6, 6, 6, 1, 2]);  // 18

      expect(scorecard.getUpperBonus()).toBe(35);
    });

    it('does not award bonus below 63', () => {
      scorecard.score('ones', [1, 1, 2, 3, 4]);   // 2
      scorecard.score('twos', [2, 2, 1, 3, 4]);   // 4
      scorecard.score('threes', [3, 3, 1, 2, 4]); // 6
      scorecard.score('fours', [4, 4, 1, 2, 3]);  // 8
      scorecard.score('fives', [5, 5, 1, 2, 3]);  // 10
      scorecard.score('sixes', [6, 6, 1, 2, 3]);  // 12
      // Total: 42, below 63

      expect(scorecard.getUpperBonus()).toBe(0);
    });

    it('includes bonus in total', () => {
      // Score exactly 63 in upper section
      scorecard.score('ones', [1, 1, 1, 2, 3]);
      scorecard.score('twos', [2, 2, 2, 1, 3]);
      scorecard.score('threes', [3, 3, 3, 1, 2]);
      scorecard.score('fours', [4, 4, 4, 1, 2]);
      scorecard.score('fives', [5, 5, 5, 1, 2]);
      scorecard.score('sixes', [6, 6, 6, 1, 2]);

      expect(scorecard.getTotal()).toBe(63 + 35);
    });
  });

  describe('Completion Detection', () => {
    it('isComplete returns false when not all categories filled', () => {
      scorecard.score('ones', [1, 1, 1, 1, 1]);
      expect(scorecard.isComplete()).toBe(false);
    });

    it('isComplete returns true when 13 categories filled', () => {
      // Fill all 13 base categories
      scorecard.score('ones', [1, 1, 1, 1, 1]);
      scorecard.score('twos', [2, 2, 2, 2, 2]);
      scorecard.score('threes', [3, 3, 3, 3, 3]);
      scorecard.score('fours', [4, 4, 4, 4, 4]);
      scorecard.score('fives', [5, 5, 5, 5, 5]);
      scorecard.score('sixes', [6, 6, 6, 6, 6]);
      scorecard.score('threeOfAKind', [1, 1, 1, 2, 3]);
      scorecard.score('fourOfAKind', [1, 1, 1, 1, 2]);
      scorecard.score('fullHouse', [1, 1, 2, 2, 2]);
      scorecard.score('smallStraight', [1, 2, 3, 4, 6]);
      scorecard.score('largeStraight', [1, 2, 3, 4, 5]);
      scorecard.score('fiveDice', [1, 2, 3, 4, 5]); // Will be 0
      scorecard.score('chance', [1, 2, 3, 4, 5]);

      expect(scorecard.isComplete()).toBe(true);
      expect(scorecard.getFilledCount()).toBe(13);
    });

    it('tracks remaining count correctly', () => {
      expect(scorecard.getRemainingCount()).toBe(CATEGORIES_TO_COMPLETE);
      scorecard.score('ones', [1, 1, 1, 1, 1]);
      expect(scorecard.getRemainingCount()).toBe(CATEGORIES_TO_COMPLETE - 1);
    });
  });

  describe('Special Section (Blessing of Expansion)', () => {
    it('special section is disabled by default', () => {
      expect(scorecard.isSpecialSectionEnabled()).toBe(false);
      expect(scorecard.getSpecialSection().length).toBe(4);
      // But they shouldn't be in available categories
      const available = scorecard.getAvailableCategories();
      const specialAvailable = available.filter((c) => c.section === 'special');
      expect(specialAvailable.length).toBe(0);
    });

    it('enableSpecialSection unlocks special categories', () => {
      scorecard.enableSpecialSection();
      expect(scorecard.isSpecialSectionEnabled()).toBe(true);
      const available = scorecard.getAvailableCategories();
      const specialAvailable = available.filter((c) => c.section === 'special');
      expect(specialAvailable.length).toBe(4);
    });

    it('special section included in total when enabled', () => {
      scorecard.enableSpecialSection();
      scorecard.score('twoPair', [2, 2, 4, 4, 6]);
      expect(scorecard.getSpecialTotal()).toBe(SCORING.SPECIAL_CATEGORY);
      expect(scorecard.getTotal()).toBe(SCORING.SPECIAL_CATEGORY);
    });
  });

  describe('6-Dice Subset Selection (Sixth Blessing)', () => {
    it('finds best 5 of 6 for upper section', () => {
      // [6, 6, 6, 6, 5, 5] - best 5 for sixes would drop a 5
      const score = scorecard.calculatePotential('sixes', [6, 6, 6, 6, 5, 5]);
      expect(score).toBe(24); // 4 sixes = 24
    });

    it('finds best 5 of 6 for large straight', () => {
      // [1, 2, 3, 4, 4, 5] - drop one 4 to get 1-2-3-4-5
      const score = scorecard.calculatePotential('largeStraight', [1, 2, 3, 4, 4, 5]);
      expect(score).toBe(40);
    });

    it('scores using best 5 of 6', () => {
      const score = scorecard.score('fiveDice', [4, 4, 4, 4, 4, 2]);
      expect(score).toBe(50); // Drops the 2, keeps 5 fours
    });
  });

  describe('Reset', () => {
    it('clears all scores on reset', () => {
      scorecard.score('ones', [1, 1, 1, 1, 1]);
      scorecard.score('twos', [2, 2, 2, 2, 2]);
      scorecard.reset();
      expect(scorecard.getFilledCount()).toBe(0);
      expect(scorecard.getTotal()).toBe(0);
    });

    it('preserves special section enabled state on reset', () => {
      scorecard.enableSpecialSection();
      scorecard.score('twoPair', [2, 2, 4, 4, 6]);
      scorecard.reset();
      expect(scorecard.isSpecialSectionEnabled()).toBe(true);
      expect(scorecard.getFilledCount()).toBe(0);
    });

    it('clears upper bonus on reset', () => {
      // Score to get bonus
      scorecard.score('ones', [1, 1, 1, 2, 3]);
      scorecard.score('twos', [2, 2, 2, 1, 3]);
      scorecard.score('threes', [3, 3, 3, 1, 2]);
      scorecard.score('fours', [4, 4, 4, 1, 2]);
      scorecard.score('fives', [5, 5, 5, 1, 2]);
      scorecard.score('sixes', [6, 6, 6, 1, 2]);
      expect(scorecard.getUpperBonus()).toBe(35);

      scorecard.reset();
      expect(scorecard.getUpperBonus()).toBe(0);
    });
  });

  describe('Unscore (Tutorial)', () => {
    it('allows unscoring a filled category', () => {
      scorecard.score('ones', [1, 1, 1, 1, 1]);
      const result = scorecard.unscore('ones');
      expect(result).toBe(true);
      expect(scorecard.getCategory('ones')?.score).toBeNull();
    });

    it('returns false when unscoring empty category', () => {
      const result = scorecard.unscore('ones');
      expect(result).toBe(false);
    });

    it('removes upper bonus if unscore drops below threshold', () => {
      // Score to exactly 63
      scorecard.score('ones', [1, 1, 1, 2, 3]);
      scorecard.score('twos', [2, 2, 2, 1, 3]);
      scorecard.score('threes', [3, 3, 3, 1, 2]);
      scorecard.score('fours', [4, 4, 4, 1, 2]);
      scorecard.score('fives', [5, 5, 5, 1, 2]);
      scorecard.score('sixes', [6, 6, 6, 1, 2]);
      expect(scorecard.getUpperBonus()).toBe(35);

      // Unscore ones (removes 3 points, dropping to 60)
      scorecard.unscore('ones');
      expect(scorecard.getUpperBonus()).toBe(0);
    });
  });
});
