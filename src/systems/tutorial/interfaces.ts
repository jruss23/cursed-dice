/**
 * Tutorial System Interfaces
 * Defines contracts for components that can be highlighted and controlled during tutorials
 */

import type { CategoryId } from '@/data/categories';

// =============================================================================
// BOUNDS & HIGHLIGHT
// =============================================================================

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Components that can be visually highlighted during tutorial
 */
export interface Highlightable {
  getBounds(): Bounds;
}

/**
 * Header panel with section-specific bounds for tutorial
 */
export interface TutorialHighlightableHeader extends Highlightable {
  getCurseBounds(): Bounds;
  getTimerBounds(): Bounds;
  getTotalBounds(): Bounds;
}

// =============================================================================
// TUTORIAL CONTROLLABLE
// =============================================================================

/**
 * Dice-specific allowed actions during tutorial
 */
export interface DiceAllowedActions {
  /** Which dice indices can be locked (null = all, [] = none) */
  lockableIndices: number[] | null;
  /** Whether the roll button is enabled */
  canRoll: boolean;
}

/**
 * Scorecard-specific allowed actions during tutorial
 */
export interface ScorecardAllowedActions {
  /** Which categories can be clicked (null = all, [] = none) */
  allowedCategories: CategoryId[] | null;
  /** Whether hover preview is enabled */
  hoverEnabled: boolean;
  /** Category to visually highlight */
  highlightCategory: CategoryId | null;
}

/**
 * Forced state for dice during tutorial
 */
export interface DiceForcedState {
  /** Predetermined values for next roll */
  rollValues: number[] | null;
  /** Force specific reroll count */
  rerollsRemaining: number | null;
}

/**
 * Components that can be controlled during tutorial steps
 */
export interface TutorialControllableDice {
  setTutorialMode(actions: DiceAllowedActions): void;
  forceTutorialState(state: DiceForcedState): void;
  resetTutorialMode(): void;
  setEnabled(enabled: boolean): void;
  reset(): void;
  roll(isInitial: boolean): void;
  getDiceBounds(): Bounds;
  getDiceAreaBounds(): Bounds;
  getControlsBounds(): Bounds;
  getFullBounds(): Bounds;
}

export interface TutorialControllableScorecard {
  setTutorialMode(actions: ScorecardAllowedActions): void;
  resetTutorialMode(): void;
  lockInput(): void;
  unlockInput(): void;
  setTutorialLock(locked: boolean): void;
  setDice(values: number[]): void;
  updateDisplay(): void;
  getBounds(): Bounds;
  getCategoryBounds(categoryId: CategoryId): Bounds | null;
  getCategoriesCounterBounds(): Bounds;
  getBonusRowBounds(): Bounds | null;
  getTotalRowBounds(): Bounds | null;
  getNumbersColumnBounds(): Bounds | null;
}

// =============================================================================
// TUTORIAL STEP DEFINITIONS
// =============================================================================

export type HighlightTarget =
  | 'none'
  | 'roll-button'
  | 'dice'
  | 'dice-and-controls'
  | 'scorecard'
  | 'scorecard-categories'
  | 'scorecard-bonus'
  | 'scorecard-total'
  | 'scorecard-numbers-column'
  | 'header'
  | 'header-curse'
  | 'header-timer'
  | 'header-total'
  | 'category';

export type PopupPosition = 'center' | 'above' | 'below' | 'left' | 'right';

export interface TutorialStepConfig<StepId extends string = string> {
  id: StepId;
  title: string;
  message: string;
  highlightTarget: HighlightTarget;
  showNextButton: boolean;
  /** For 'category' highlight */
  highlightCategory?: CategoryId;
  /** Called when entering this step - configure components */
  onEnter?: () => void;
  /** Condition that auto-advances to next step (checked on events) */
  advanceOn?: 'roll' | 'lock-count' | 'score';
  /** For lock-count advance, how many locks needed */
  lockCountRequired?: number;
  /** Use taller popup for longer messages */
  tallPopup?: boolean;
}

export interface TutorialStepDisplay {
  id: string;
  title: string;
  message: string;
  highlight: Bounds | null;
  popupPosition: PopupPosition;
  showNextButton: boolean;
  /** Use taller popup for longer messages */
  tallPopup?: boolean;
}
