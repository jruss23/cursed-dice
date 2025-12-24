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
  Highlightable,
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
  | 'scorecard-intro'
  | 'explain-dice'
  | 'lock-ones'
  | 'reroll-1'
  | 'no-luck'
  | 'lock-fourth'
  | 'reroll-2'
  | 'five-dice-celebration'
  | 'score'
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
  headerPanel: Highlightable;
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
  private header: Highlightable;
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
        message: "Let's learn Cursed Dice! Fill 13 categories and score 250+ before time runs out.",
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
        message: "See the timer? Score 250+ before it runs out to survive this curse!",
        highlightTarget: 'header',
        showNextButton: true,
        onEnter: () => {
          this.dice.setEnabled(false);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'scorecard-intro',
        title: 'Scoring Categories',
        message: "13 categories. Upper section sums matching dice (63+ = 35 bonus!). Lower has combos.",
        highlightTarget: 'scorecard',
        showNextButton: true,
        onEnter: () => {
          this.dice.setEnabled(false);
          this.scorecard.lockInput();
        },
      },
      {
        id: 'explain-dice',
        title: 'Your Roll',
        message: "Each turn starts with an automatic roll. You got three 1s - that's a great start!",
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
        message: "Tap each 1 to lock it. Locked dice (green) won't change when you reroll. Go ahead and try it now!",
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
        message: "You have 3 rerolls. Tap ROLL to reroll only the unlocked dice!",
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
        message: "No new 1s this time. Keep going - tap ROLL again!",
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
        message: "Nice! Lock the new 1. You have 1 reroll left.",
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
        message: "One more chance for 5 of a kind! Tap ROLL.",
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
        message: "Five of a kind! That's worth 50 points! Tap 5 Dice to score it.",
        highlightTarget: 'category',
        highlightCategory: 'fiveDice',
        showNextButton: false,
        advanceOn: 'score',
        onEnter: () => {
          this.dice.setEnabled(false);
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
        title: 'Nice Score!',
        message: "50 points! Now let's see what happens when nothing matches...",
        highlightTarget: 'none',
        showNextButton: true,
        onEnter: () => {
          this.dice.setEnabled(false);
          this.scorecard.lockInput();
          this.scorecard.setTutorialMode({
            allowedCategories: null,
            hoverEnabled: false,
            highlightCategory: null,
          });
        },
      },
      {
        id: 'zero-setup',
        title: 'Sometimes Nothing Fits',
        message: "No combos here - no 3-of-a-kind, no straights, nothing. You have no rerolls left.",
        highlightTarget: 'dice',
        showNextButton: true,
        onEnter: () => {
          // Reset and show junk roll
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
        message: "You MUST score each turn. Sacrifice a hard category - tap 4 of a Kind to take 0.",
        highlightTarget: 'category',
        highlightCategory: 'fourOfAKind',
        showNextButton: false,
        advanceOn: 'score',
        onEnter: () => {
          this.dice.setEnabled(false);
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
        title: "You've Got This!",
        message: "Now you know the basics! Let's start fresh for you to practice on your own.",
        highlightTarget: 'none',
        showNextButton: true,
        onEnter: () => {
          // Undo scored categories for fresh practice
          this.scorecardData.unscore('fourOfAKind');
          this.scorecardData.unscore('fiveDice');
          this.onUpdateScore(this.scorecardData.getTotal());
          this.scorecard.updateDisplay();
          this.dice.setEnabled(false);
          this.scorecard.lockInput();
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
        return this.dice.getDiceBounds();

      case 'dice-and-controls':
        return this.dice.getFullBounds();

      case 'scorecard':
        return this.scorecard.getBounds();

      case 'header':
        return this.header.getBounds();

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
    this.onShowHint("Tap the 1s to lock them!");
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
