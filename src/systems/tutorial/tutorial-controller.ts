/**
 * Tutorial Controller
 * Centralized controller that owns ALL tutorial logic, step definitions, and event handling.
 * The TutorialScene just wires up components and delegates to this controller.
 */

import Phaser from 'phaser';
import { SIZES } from '@/config';
import { createLogger } from '@/systems/logger';
import type { CategoryId, Scorecard } from '@/systems/scorecard';
import type { GameEventEmitter } from '@/systems/game-events';
import type {
  Bounds,
  TutorialStepConfig,
  TutorialStepDisplay,
  TutorialControllableDice,
  TutorialControllableScorecard,
  TutorialHighlightableHeader,
  PopupPosition,
} from './interfaces';

const log = createLogger('TutorialController');

// =============================================================================
// SCRIPTED ROLL VALUES
// =============================================================================

const TUTORIAL_ROLLS = {
  roll1: [1, 3, 2, 1, 1], // Three 1s - good start
  roll2: [1, 4, 5, 1, 1], // Bad luck - no new 1s
  roll3: [1, 1, 5, 1, 1], // Fourth 1!
  roll4: [1, 1, 1, 1, 1], // Five 1s!
  zeroRoll: [1, 1, 2, 3, 3], // Junk - no combos
};

const ONES_INDICES = {
  roll1: [0, 3, 4], // Dice showing 1 after first roll
  roll3: [1], // Only the NEW 1 after third roll
};

// =============================================================================
// STEP DEFINITIONS
// =============================================================================

type StepId =
  | 'welcome'
  | 'header-intro'
  | 'curse-counter'
  | 'score-goal'
  | 'scorecard-intro'
  | 'categories-counter'
  | 'upper-bonus'
  | 'pass-threshold'
  | 'explain-dice'
  | 'lock-ones'
  | 'reroll-1'
  | 'no-luck'
  | 'lock-fourth'
  | 'reroll-2'
  | 'five-dice-celebration'
  | 'score'
  | 'explain-chance'
  | 'zero-setup'
  | 'zero-explain'
  | 'practice-ready';

// =============================================================================
// CONTROLLER CONFIGURATION
// =============================================================================

export interface TutorialControllerConfig {
  scene: Phaser.Scene;
  diceManager: TutorialControllableDice;
  scorecardPanel: TutorialControllableScorecard;
  headerPanel: TutorialHighlightableHeader;
  scorecard: Scorecard;
  gameEvents: GameEventEmitter;
  onShowStep: (step: TutorialStepDisplay) => void;
  onHideOverlay: () => void;
  onShowHint: (message: string) => void;
  onComplete: () => void;
  onUpdateScore: (total: number) => void;
}

// =============================================================================
// TUTORIAL CONTROLLER
// =============================================================================

export class TutorialController {
  private scene: Phaser.Scene;
  private dice: TutorialControllableDice;
  private scorecard: TutorialControllableScorecard;
  private header: TutorialHighlightableHeader;
  private scorecardData: Scorecard;
  private events: GameEventEmitter;

  private onShowStep: (step: TutorialStepDisplay) => void;
  private onHideOverlay: () => void;
  private onShowHint: (message: string) => void;
  private onComplete: () => void;
  private onUpdateScore: (total: number) => void;

  private steps: TutorialStepConfig<StepId>[];
  private currentStepIndex: number = 0;
  private lockedCount: number = 0;
  private tutorialComplete: boolean = false;

  constructor(config: TutorialControllerConfig) {
    this.scene = config.scene;
    this.dice = config.diceManager;
    this.scorecard = config.scorecardPanel;
    this.header = config.headerPanel;
    this.scorecardData = config.scorecard;
    this.events = config.gameEvents;

    this.onShowStep = config.onShowStep;
    this.onHideOverlay = config.onHideOverlay;
    this.onShowHint = config.onShowHint;
    this.onComplete = config.onComplete;
    this.onUpdateScore = config.onUpdateScore;

    this.steps = this.createSteps();
    this.setupEventListeners();
  }

  // ===========================================================================
  // STEP DEFINITIONS - All tutorial logic in one place
  // ===========================================================================

  private createSteps(): TutorialStepConfig<StepId>[] {
    return [
      {
        id: 'welcome',
        title: 'Welcome!',
        message:
          "You have 13 turns to fill all categories on the scorecard. Score 250+ points before time runs out to break the curse!",
        highlightTarget: 'none',
        showNextButton: true,
        onEnter: () => {
          this.dice.setEnabled(false);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'header-intro',
        title: 'The Curse Timer',
        message:
          "This timer counts down. If it hits zero before you finish, you lose! Don't worry - the timer is off while you practice.",
        highlightTarget: 'header-timer',
        showNextButton: true,
        onEnter: () => {
          this.dice.setEnabled(false);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'curse-counter',
        title: 'Curse Progress',
        message:
          "The game has 4 curses to beat. Each curse gets harder but you keep your score. Beat all 4 to win!",
        highlightTarget: 'header-curse',
        showNextButton: true,
        onEnter: () => {
          this.dice.setEnabled(false);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'score-goal',
        title: 'Your Score',
        message:
          "Your total score across all curses. Points carry over as you progress through each stage!",
        highlightTarget: 'header-total',
        showNextButton: true,
        onEnter: () => {
          this.dice.setEnabled(false);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'scorecard-intro',
        title: 'The Scorecard',
        message:
          "There are 13 scoring categories. The number categories (1s through 6s) add up dice showing that number. The rest require special dice patterns.",
        highlightTarget: 'scorecard',
        showNextButton: true,
        onEnter: () => {
          this.dice.setEnabled(false);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'categories-counter',
        title: 'Turn Counter',
        message:
          "This shows how many categories you've filled. You get exactly 13 turns - one for each category!",
        highlightTarget: 'scorecard-categories',
        showNextButton: true,
        onEnter: () => {
          this.dice.setEnabled(false);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'upper-bonus',
        title: 'Numbers Bonus',
        message:
          "Score 63+ in 1s through 6s to earn a 35 point bonus. Aim for 3 of each number!",
        highlightTarget: 'scorecard-numbers-column',
        showNextButton: true,
        onEnter: () => {
          this.dice.setEnabled(false);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'pass-threshold',
        title: 'Pass Threshold',
        message:
          "The bottom shows your goal: 250+ points to pass. Fall short and the curse claims you!",
        highlightTarget: 'scorecard-total',
        showNextButton: true,
        onEnter: () => {
          this.dice.setEnabled(false);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'explain-dice',
        title: 'Your First Roll',
        message:
          "Each turn starts with an automatic roll of 5 dice. Look - you rolled three 1s! That's a great start.",
        highlightTarget: 'dice',
        showNextButton: true,
        onEnter: () => {
          this.dice.setEnabled(false);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'lock-ones',
        title: 'Lock the 1s!',
        message:
          "Tap each die showing a 1 to lock it. Locked dice turn green and won't change when you reroll.",
        highlightTarget: 'dice',
        showNextButton: false,
        advanceOn: 'lock-count',
        lockCountRequired: 3,
        onEnter: () => {
          this.lockedCount = 0;
          this.dice.setTutorialMode({ lockableIndices: ONES_INDICES.roll1, canRoll: false });
          this.dice.setEnabled(true);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'reroll-1',
        title: 'Reroll!',
        message:
          "You get 3 rerolls per turn to improve your dice. Tap ROLL to reroll only the unlocked dice.",
        highlightTarget: 'roll-button',
        showNextButton: false,
        advanceOn: 'roll',
        onEnter: () => {
          this.dice.setTutorialMode({ lockableIndices: [], canRoll: true });
          this.dice.forceTutorialState({ rollValues: TUTORIAL_ROLLS.roll2, rerollsRemaining: null });
          this.dice.setEnabled(true);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'no-luck',
        title: 'No Luck!',
        message: "The unlocked dice didn't land on 1. That happens! Tap ROLL to try again.",
        highlightTarget: 'roll-button',
        showNextButton: false,
        advanceOn: 'roll',
        onEnter: () => {
          this.dice.setTutorialMode({ lockableIndices: [], canRoll: true });
          this.dice.forceTutorialState({ rollValues: TUTORIAL_ROLLS.roll3, rerollsRemaining: null });
          this.dice.setEnabled(true);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'lock-fourth',
        title: 'Another 1!',
        message: "You got a fourth 1! Tap it to lock it. You have one reroll left.",
        highlightTarget: 'dice',
        showNextButton: false,
        advanceOn: 'lock-count',
        lockCountRequired: 1,
        onEnter: () => {
          this.lockedCount = 0;
          this.dice.setTutorialMode({ lockableIndices: ONES_INDICES.roll3, canRoll: false });
          this.dice.setEnabled(true);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'reroll-2',
        title: 'Last Reroll',
        message: "One more chance to get all five 1s! Tap ROLL for your final reroll.",
        highlightTarget: 'roll-button',
        showNextButton: false,
        advanceOn: 'roll',
        onEnter: () => {
          this.dice.setTutorialMode({ lockableIndices: [], canRoll: true });
          this.dice.forceTutorialState({ rollValues: TUTORIAL_ROLLS.roll4, rerollsRemaining: null });
          this.dice.setEnabled(true);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'five-dice-celebration',
        title: '5 Dice!',
        message:
          'All five dice match - that\'s called "5 Dice" and it\'s worth 50 points! Tap the "5 Dice" row on the scorecard to claim it.',
        highlightTarget: 'category',
        highlightCategory: 'fiveDice',
        showNextButton: false,
        advanceOn: 'score',
        onEnter: () => {
          this.dice.setEnabled(false);
          // Release tutorial lock so user can score
          this.scorecard.setTutorialLock(false);
          this.scorecard.unlockInput();
          this.scorecard.setTutorialMode({
            allowedCategories: ['fiveDice'],
            hoverEnabled: false,
            highlightCategory: 'fiveDice',
          });
        },
      },
      {
        id: 'score',
        title: 'Nice!',
        message: "You scored 50 points! Now let's talk about your safety net.",
        highlightTarget: 'none',
        showNextButton: true,
        onEnter: () => {
          this.dice.setEnabled(false);
          // Re-enable tutorial lock
          this.scorecard.setTutorialLock(true);
          this.scorecard.setTutorialMode({
            allowedCategories: null,
            hoverEnabled: false,
            highlightCategory: null,
          });
        },
      },
      {
        id: 'explain-chance',
        title: 'Chance',
        message:
          "Chance is your backup plan! It scores the sum of ALL dice, no matter what you roll. Save it for when nothing else fits.",
        highlightTarget: 'category',
        highlightCategory: 'chance',
        showNextButton: true,
        onEnter: () => {
          this.dice.setEnabled(false);
          this.scorecard.lockInput();
          this.scorecard.setTutorialMode({
            allowedCategories: null,
            hoverEnabled: false,
            highlightCategory: 'chance',
          });
        },
      },
      {
        id: 'zero-setup',
        title: 'A Bad Roll',
        message:
          "But what if you get unlucky AND you've already used Chance? This roll has no patterns and no rerolls left.",
        highlightTarget: 'dice',
        showNextButton: true,
        onEnter: () => {
          // Pre-fill number categories (1s-6s) and CHANCE so zeroing out makes sense
          this.scorecardData.score('ones', [1, 1, 1, 2, 3]); // 3 pts
          this.scorecardData.score('twos', [2, 2, 3, 4, 5]); // 4 pts
          this.scorecardData.score('threes', [3, 3, 3, 1, 2]); // 9 pts
          this.scorecardData.score('fours', [4, 4, 1, 2, 3]); // 8 pts
          this.scorecardData.score('fives', [5, 5, 5, 1, 2]); // 15 pts
          this.scorecardData.score('sixes', [6, 6, 6, 1, 2]); // 18 pts
          this.scorecardData.score('chance', [3, 4, 2, 5, 6]); // 20 pts - Chance already used!
          this.onUpdateScore(this.scorecardData.getTotal());
          this.scorecard.updateDisplay();

          // Reset dice and show junk roll
          this.dice.reset();
          this.dice.forceTutorialState({ rollValues: TUTORIAL_ROLLS.zeroRoll, rerollsRemaining: null });
          this.dice.setEnabled(true);
          this.dice.roll(true);
          this.dice.forceTutorialState({ rollValues: null, rerollsRemaining: 0 });
          this.dice.setEnabled(false);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'zero-explain',
        title: 'Zero It Out',
        message:
          'You MUST pick a category every turn. When Chance is gone, sacrifice a hard category for 0 points. Tap "4 of a Kind".',
        highlightTarget: 'category',
        highlightCategory: 'fourOfAKind',
        showNextButton: false,
        advanceOn: 'score',
        onEnter: () => {
          this.dice.setEnabled(false);
          // Release tutorial lock so user can score
          this.scorecard.setTutorialLock(false);
          this.scorecard.unlockInput();
          this.scorecard.setTutorialMode({
            allowedCategories: ['fourOfAKind'],
            hoverEnabled: false,
            highlightCategory: 'fourOfAKind',
          });
        },
      },
      {
        id: 'practice-ready',
        title: "You're Ready!",
        message:
          "That's everything! Now practice on your own. Fill all 13 categories and try to hit 250 points!",
        highlightTarget: 'none',
        showNextButton: true,
        onEnter: () => {
          // Re-enable tutorial lock while showing this step
          this.scorecard.setTutorialLock(true);
          // Undo all scored categories for fresh practice
          this.scorecardData.unscore('fourOfAKind');
          this.scorecardData.unscore('fiveDice');
          this.scorecardData.unscore('ones');
          this.scorecardData.unscore('twos');
          this.scorecardData.unscore('threes');
          this.scorecardData.unscore('fours');
          this.scorecardData.unscore('fives');
          this.scorecardData.unscore('sixes');
          this.scorecardData.unscore('chance');
          this.onUpdateScore(this.scorecardData.getTotal());
          this.scorecard.updateDisplay();
          this.dice.setEnabled(false);
        },
      },
    ];
  }

  // ===========================================================================
  // EVENT LISTENERS
  // ===========================================================================

  private setupEventListeners(): void {
    this.events.on('dice:rolled', this.handleDiceRolled, this);
    this.events.on('dice:locked', this.handleDiceLocked, this);
    this.events.on('score:category', this.handleCategoryScored, this);
  }

  private handleDiceRolled = (data: { values: number[]; isInitial: boolean }): void => {
    log.log('Dice rolled:', data.values);

    // Update scorecard preview
    this.scorecard.setDice(data.values);

    const currentStep = this.steps[this.currentStepIndex];
    if (currentStep.advanceOn === 'roll') {
      // IMPORTANT: Disable dice immediately to prevent race condition
      // where user could roll again before next step's onEnter sets up forced values
      this.dice.setEnabled(false);

      this.scene.time.delayedCall(SIZES.ROLL_DURATION_MS + 200, () => {
        if (this.steps[this.currentStepIndex].id === currentStep.id) {
          this.advanceStep();
        }
      });
    }
  };

  private handleDiceLocked = (data: { index: number; locked: boolean }): void => {
    log.log('Die locked:', data);

    if (!data.locked) return;

    const currentStep = this.steps[this.currentStepIndex];
    if (currentStep.advanceOn === 'lock-count') {
      this.lockedCount++;
      if (this.lockedCount >= (currentStep.lockCountRequired ?? 1)) {
        this.scene.time.delayedCall(400, () => {
          if (this.steps[this.currentStepIndex].id === currentStep.id) {
            this.advanceStep();
          }
        });
      }
    }
  };

  private handleCategoryScored = (data: { categoryId: CategoryId; dice: number[] }): void => {
    log.log('Category scored:', data);

    const score = this.scorecardData.score(data.categoryId, data.dice);
    log.log(`Scored ${score} in ${data.categoryId}`);
    this.onUpdateScore(this.scorecardData.getTotal());

    const currentStep = this.steps[this.currentStepIndex];

    // Clear highlight and update display
    this.scorecard.setTutorialMode({
      allowedCategories: null,
      hoverEnabled: false,
      highlightCategory: null,
    });
    this.scorecard.updateDisplay();

    if (currentStep.advanceOn === 'score') {
      this.scene.time.delayedCall(1200, () => {
        if (this.steps[this.currentStepIndex].id === currentStep.id) {
          this.advanceStep();
        }
      });
    }
  };

  // ===========================================================================
  // STEP MANAGEMENT
  // ===========================================================================

  start(): void {
    log.log('Starting tutorial');

    // Lock scorecard for entire tutorial (prevents dice:rolled from auto-unlocking)
    this.scorecard.setTutorialLock(true);

    // Do initial roll with predetermined values
    this.dice.setEnabled(true);
    this.dice.forceTutorialState({ rollValues: TUTORIAL_ROLLS.roll1, rerollsRemaining: null });
    this.dice.roll(true);
    this.dice.setEnabled(false);

    // Show first step
    this.showStep(0);
  }

  private showStep(index: number): void {
    if (index >= this.steps.length) {
      this.complete();
      return;
    }

    this.currentStepIndex = index;
    const stepConfig = this.steps[index];

    log.log(`Showing step: ${stepConfig.id}`);

    // Execute step's onEnter
    stepConfig.onEnter?.();

    // Build display object
    const highlight = this.getHighlightBounds(stepConfig);
    const popupPosition = this.getPopupPosition(highlight);

    const displayStep: TutorialStepDisplay = {
      id: stepConfig.id,
      title: stepConfig.title,
      message: stepConfig.message,
      highlight,
      popupPosition,
      showNextButton: stepConfig.showNextButton,
    };

    this.onShowStep(displayStep);
  }

  advanceStep(): void {
    const currentStep = this.steps[this.currentStepIndex];

    // Special handling for practice-ready - triggers restart
    if (currentStep.id === 'practice-ready') {
      log.log('Practice mode requested');
      this.onComplete();
      return;
    }

    this.showStep(this.currentStepIndex + 1);
  }

  private complete(): void {
    log.log('Tutorial complete');
    this.tutorialComplete = true;
    this.onHideOverlay();
    this.dice.resetTutorialMode();
    this.scorecard.resetTutorialMode();
    this.onComplete();
  }

  // ===========================================================================
  // HIGHLIGHT BOUNDS
  // ===========================================================================

  private getHighlightBounds(step: TutorialStepConfig<StepId>): Bounds | null {
    switch (step.highlightTarget) {
      case 'none':
        return null;

      case 'roll-button':
        return this.dice.getControlsBounds();

      case 'dice':
        return this.dice.getDiceAreaBounds();

      case 'dice-and-controls':
        return this.dice.getFullBounds();

      case 'scorecard':
        return this.scorecard.getBounds();

      case 'scorecard-categories':
        return this.scorecard.getCategoriesCounterBounds();

      case 'scorecard-bonus':
        return this.scorecard.getBonusRowBounds();

      case 'scorecard-total':
        return this.scorecard.getTotalRowBounds();

      case 'scorecard-numbers-column':
        return this.scorecard.getNumbersColumnBounds();

      case 'header':
        return this.header.getBounds();

      case 'header-curse':
        return this.header.getCurseBounds();

      case 'header-timer':
        return this.header.getTimerBounds();

      case 'header-total':
        return this.header.getTotalBounds();

      case 'category':
        if (step.highlightCategory) {
          return this.scorecard.getCategoryBounds(step.highlightCategory);
        }
        return null;

      default:
        return null;
    }
  }

  private getPopupPosition(highlight: Bounds | null): PopupPosition {
    if (!highlight) return 'center';

    const { height } = this.scene.scale.gameSize;
    const highlightCenterY = highlight.y + highlight.height / 2;

    return highlightCenterY < height * 0.4 ? 'below' : 'above';
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  onLockAttemptBlocked(): void {
    this.onShowHint('Tap the 1s to lock them!');
  }

  isTutorialComplete(): boolean {
    return this.tutorialComplete;
  }

  destroy(): void {
    this.events.off('dice:rolled', this.handleDiceRolled);
    this.events.off('dice:locked', this.handleDiceLocked);
    this.events.off('score:category', this.handleCategoryScored);
  }
}
