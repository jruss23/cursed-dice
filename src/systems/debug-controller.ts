/**
 * Debug Controller
 * Handles all debug functionality for GameplayScene
 */

import Phaser from 'phaser';
import { FONTS, COLORS, SIZES, getViewportMetrics, type Difficulty } from '@/config';
import { type Scorecard, type CategoryId } from '@/systems/scorecard';
import { type GameMode, resetGameProgression, debugSetMode } from '@/systems/game-progression';
import { resetBlessingManager, debugSetBlessing } from '@/systems/blessings/blessing-manager';
import { getSaveManager } from '@/systems/save-manager';
import { createLogger } from '@/systems/logger';
import { createText } from '@/ui/ui-utils';

const log = createLogger('DebugController');

export interface DebugControllerDeps {
  scene: Phaser.Scene;
  getScorecard: () => Scorecard;
  getTimeRemaining: () => number;
  setTimeRemaining: (time: number) => void;
  getDifficulty: () => Difficulty;
  updateTimerDisplay: (formattedTime: string) => void;
  updateScorecardDisplay: () => void;
  syncAudioToTime: (time: number) => void;
  endGame: (completed: boolean) => void;
  restartScene: (data: { difficulty: Difficulty }) => void;
}

/**
 * Debug Controller
 * Extracts all debug logic from GameplayScene for cleaner separation
 */
export class DebugController {
  private deps: DebugControllerDeps;

  constructor(deps: DebugControllerDeps) {
    this.deps = deps;
  }

  /**
   * Skip 10 seconds of time
   */
  skipTime(): void {
    const currentTime = this.deps.getTimeRemaining();
    const newTime = Math.max(0, currentTime - 10000);
    this.deps.setTimeRemaining(newTime);
    this.deps.updateTimerDisplay(this.formatTime(newTime));
    this.deps.syncAudioToTime(newTime);
    log.debug(`Skipped 10s, time remaining: ${this.formatTime(newTime)}`);

    // Visual feedback
    this.deps.scene.cameras.main.flash(100, 255, 200, 100);
  }

  /**
   * Skip to next stage with perfect score
   */
  skipStage(): void {
    log.debug('Skipping stage with perfect score');

    const scorecard = this.deps.getScorecard();
    const available = scorecard.getAvailableCategories();

    for (const cat of available) {
      const perfectDice = this.getPerfectDiceForCategory(cat.id);
      scorecard.score(cat.id, perfectDice);
    }

    this.deps.updateScorecardDisplay();

    // Show feedback
    const { width } = this.deps.scene.cameras.main;
    const skipText = createText(this.deps.scene, width / 2, 200, '⚡ DEBUG: Stage Skipped!', {
      fontSize: FONTS.SIZE_LARGE,
      fontFamily: FONTS.FAMILY,
      color: COLORS.DEBUG_GREEN,
      fontStyle: 'bold',
    });
    skipText.setOrigin(0.5, 0.5);
    skipText.setAlpha(0);

    this.deps.scene.tweens.add({
      targets: skipText,
      alpha: 1,
      y: 160,
      duration: SIZES.ANIM_ENTRANCE,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.deps.scene.tweens.add({
          targets: skipText,
          alpha: 0,
          duration: 500,
          delay: 500,
          onComplete: () => skipText.destroy(),
        });
      },
    });

    this.deps.scene.cameras.main.flash(200, 100, 255, 200);

    // End game successfully
    this.deps.scene.time.delayedCall(SIZES.ANIM_ENTRANCE, () => {
      this.deps.endGame(true);
    });
  }

  /**
   * Clear all save data
   */
  clearData(): void {
    const saveManager = getSaveManager();
    saveManager.clearAll();
    log.debug('Save data cleared');

    // Visual feedback
    this.deps.scene.cameras.main.flash(200, 255, 50, 50);

    const { width } = this.deps.scene.cameras.main;
    const clearText = createText(this.deps.scene, width / 2, 200, 'Data Cleared!', {
      fontSize: FONTS.SIZE_LARGE,
      fontFamily: FONTS.FAMILY,
      color: COLORS.DEBUG_RED,
      fontStyle: 'bold',
    });
    clearText.setOrigin(0.5, 0.5);

    this.deps.scene.tweens.add({
      targets: clearText,
      alpha: 0,
      y: 160,
      duration: 1000,
      delay: 500,
      onComplete: () => clearText.destroy(),
    });
  }

  /**
   * Score perfect upper section (all 5-of-a-kind for each number)
   */
  perfectUpper(): void {
    const upperCategories: CategoryId[] = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
    const scorecard = this.deps.getScorecard();
    let scored = 0;

    for (const categoryId of upperCategories) {
      const perfectDice = this.getPerfectDiceForCategory(categoryId);
      const result = scorecard.score(categoryId, perfectDice);
      if (result >= 0) {
        scored++;
      }
    }

    this.deps.updateScorecardDisplay();

    // Visual feedback
    this.deps.scene.cameras.main.flash(200, 50, 255, 50);

    const metrics = getViewportMetrics(this.deps.scene);
    const feedbackY = metrics.isMobile ? 120 : 200;
    const feedbackText = createText(this.deps.scene, this.deps.scene.cameras.main.width / 2, feedbackY,
      scored > 0 ? `Perfect Upper! (${scored} categories)` : 'Upper already complete!', {
      fontSize: FONTS.SIZE_SUBHEADING,
      fontFamily: FONTS.FAMILY,
      color: COLORS.DEBUG_GREEN,
      fontStyle: 'bold',
    });
    feedbackText.setOrigin(0.5, 0.5);

    this.deps.scene.tweens.add({
      targets: feedbackText,
      alpha: 0,
      y: feedbackY - 40,
      duration: 1000,
      delay: 500,
      onComplete: () => feedbackText.destroy(),
    });

    log.debug(`DEBUG: Scored ${scored} upper categories with perfect scores`);
  }

  /**
   * Skip directly to a specific mode (1-4)
   * Modes 2-4 automatically enable expansion blessing
   */
  skipToMode(mode: number): void {
    const difficulty = this.deps.getDifficulty();
    log.debug(`DEBUG: Skipping to mode ${mode} (difficulty: ${difficulty})`);

    // Reset progression and blessings
    resetGameProgression();
    resetBlessingManager();

    // Set the target mode
    debugSetMode(mode as GameMode);

    // Enable expansion blessing for modes 2-4
    if (mode >= 2) {
      debugSetBlessing('expansion');
    }

    // Restart the scene with current difficulty
    this.deps.restartScene({ difficulty });
  }

  /**
   * Get perfect dice values for a given category
   */
  getPerfectDiceForCategory(categoryId: CategoryId): number[] {
    switch (categoryId) {
      case 'ones':
        return [1, 1, 1, 1, 1];
      case 'twos':
        return [2, 2, 2, 2, 2];
      case 'threes':
        return [3, 3, 3, 3, 3];
      case 'fours':
        return [4, 4, 4, 4, 4];
      case 'fives':
        return [5, 5, 5, 5, 5];
      case 'sixes':
        return [6, 6, 6, 6, 6];
      case 'threeOfAKind':
        return [6, 6, 6, 5, 5]; // 29 points
      case 'fourOfAKind':
        return [6, 6, 6, 6, 5]; // 29 points
      case 'fullHouse':
        return [6, 6, 6, 5, 5]; // 25 points
      case 'smallStraight':
        return [1, 2, 3, 4, 6]; // 30 points
      case 'largeStraight':
        return [1, 2, 3, 4, 5]; // 40 points
      case 'fiveDice':
        return [6, 6, 6, 6, 6]; // 50 points
      case 'chance':
        return [6, 6, 6, 6, 6]; // 30 points
      // Special section (Blessing of Expansion)
      case 'twoPair':
        return [3, 3, 5, 5, 6]; // 22 points (two pair)
      case 'allOdd':
        return [1, 3, 3, 5, 5]; // 17 points (all odd)
      case 'allEven':
        return [2, 4, 4, 6, 6]; // 22 points (all even)
      case 'allHigh':
        return [4, 5, 5, 6, 6]; // 26 points (all high 4-6)
      default:
        return [6, 6, 6, 6, 6];
    }
  }

  /**
   * Format time in mm:ss
   */
  private formatTime(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
