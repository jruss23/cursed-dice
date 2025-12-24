/**
 * Scorecard State Manager
 * Manages display state for the scorecard - no Phaser dependency
 * Pure TypeScript class that can be unit tested
 */

import type { Scorecard, CategoryId, Category } from '@/systems/scorecard';
import type { RowDisplayState, BonusDisplayState, TotalDisplayState } from './layout-config';

// =============================================================================
// STATE MANAGER
// =============================================================================

export class ScorecardStateManager {
  private scorecard: Scorecard;
  private currentDice: number[] = [1, 1, 1, 1, 1];
  private lockedCategories: Set<CategoryId> = new Set();
  private isGauntletMode: boolean = false;
  private isInputLocked: boolean = false;
  private allowedCategories: Set<CategoryId> | null = null;
  private hoverEnabled: boolean = true;
  private passThreshold: number = 250;

  constructor(scorecard: Scorecard, passThreshold: number = 250) {
    this.scorecard = scorecard;
    this.passThreshold = passThreshold;
  }

  // ===========================================================================
  // DICE
  // ===========================================================================

  setDice(dice: number[]): void {
    this.currentDice = [...dice];
  }

  getDice(): number[] {
    return [...this.currentDice];
  }

  // ===========================================================================
  // LOCKED CATEGORIES
  // ===========================================================================

  setLockedCategories(locked: Set<CategoryId>): void {
    this.lockedCategories = new Set(locked);
  }

  isLocked(categoryId: CategoryId): boolean {
    return this.lockedCategories.has(categoryId);
  }

  getLockedCategories(): Set<CategoryId> {
    return new Set(this.lockedCategories);
  }

  // ===========================================================================
  // GAUNTLET MODE
  // ===========================================================================

  setGauntletMode(enabled: boolean): void {
    this.isGauntletMode = enabled;
  }

  getGauntletMode(): boolean {
    return this.isGauntletMode;
  }

  // ===========================================================================
  // INPUT LOCKING
  // ===========================================================================

  lockInput(): void {
    this.isInputLocked = true;
  }

  unlockInput(): void {
    this.isInputLocked = false;
  }

  isInputLockedState(): boolean {
    return this.isInputLocked;
  }

  // ===========================================================================
  // TUTORIAL MODE
  // ===========================================================================

  setAllowedCategories(categories: CategoryId[] | null): void {
    if (categories === null) {
      this.allowedCategories = null;
    } else {
      this.allowedCategories = new Set(categories);
    }
  }

  isAllowed(categoryId: CategoryId): boolean {
    if (this.allowedCategories === null) {
      return true; // All allowed if not in tutorial mode
    }
    return this.allowedCategories.has(categoryId);
  }

  setHoverEnabled(enabled: boolean): void {
    this.hoverEnabled = enabled;
  }

  isHoverEnabled(): boolean {
    return this.hoverEnabled;
  }

  // ===========================================================================
  // ROW DISPLAY STATE
  // ===========================================================================

  /**
   * Get the display state for a category row
   * This is the main method for determining what to render
   */
  getRowDisplayState(categoryId: CategoryId): RowDisplayState {
    const category = this.scorecard.getCategory(categoryId);
    const isLocked = this.lockedCategories.has(categoryId);
    const isAvailable = this.scorecard.isAvailable(categoryId);
    const score = category?.score ?? null;
    const potential = score === null && !isLocked
      ? this.scorecard.calculatePotential(categoryId, this.currentDice)
      : 0;

    return {
      categoryId,
      score,
      potential,
      isLocked,
      isAvailable: isAvailable && !isLocked && score === null,
      isGauntletHighlight: this.isGauntletMode && isAvailable && !isLocked && score === null,
    };
  }

  /**
   * Get display states for all categories
   */
  getAllRowStates(): Map<CategoryId, RowDisplayState> {
    const states = new Map<CategoryId, RowDisplayState>();
    const categories = this.scorecard.getCategories();

    for (const cat of categories) {
      states.set(cat.id, this.getRowDisplayState(cat.id));
    }

    return states;
  }

  // ===========================================================================
  // BONUS DISPLAY STATE
  // ===========================================================================

  getBonusDisplayState(): BonusDisplayState {
    const upperCategories = this.scorecard.getUpperSection();
    const allUppersFilled = upperCategories.every(c => c.score !== null);

    return {
      upperSubtotal: this.scorecard.getUpperSubtotal(),
      bonusEarned: this.scorecard.getUpperBonus(),
      allUppersFilled,
    };
  }

  // ===========================================================================
  // TOTAL DISPLAY STATE
  // ===========================================================================

  getTotalDisplayState(): TotalDisplayState {
    const allCategories = this.scorecard.getCategories();
    const filledCount = allCategories.filter(c => c.score !== null).length;

    return {
      total: this.scorecard.getTotal(),
      passThreshold: this.passThreshold,
      filledCount,
      totalCount: 13, // Standard game has 13 categories to fill
    };
  }

  // ===========================================================================
  // CATEGORY QUERIES
  // ===========================================================================

  getUpperSection(): Category[] {
    return this.scorecard.getUpperSection();
  }

  getLowerSection(): Category[] {
    return this.scorecard.getLowerSection();
  }

  getSpecialSection(): Category[] {
    return this.scorecard.getSpecialSection();
  }

  hasSpecialSection(): boolean {
    return this.scorecard.isSpecialSectionEnabled();
  }

  getCategory(id: CategoryId): Category | undefined {
    return this.scorecard.getCategory(id);
  }

  // ===========================================================================
  // CLICK VALIDATION
  // ===========================================================================

  /**
   * Check if a category can be clicked/scored
   * Used by the renderer to determine if a click should be processed
   */
  canScore(categoryId: CategoryId): boolean {
    if (this.isInputLocked) return false;
    if (!this.isAllowed(categoryId)) return false;
    if (!this.scorecard.isAvailable(categoryId)) return false;
    return true;
  }

  // ===========================================================================
  // RESET
  // ===========================================================================

  reset(): void {
    this.lockedCategories.clear();
    this.isGauntletMode = false;
    this.isInputLocked = false;
    this.allowedCategories = null;
    this.hoverEnabled = true;
    this.currentDice = [1, 1, 1, 1, 1];
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createScorecardStateManager(
  scorecard: Scorecard,
  passThreshold?: number
): ScorecardStateManager {
  return new ScorecardStateManager(scorecard, passThreshold);
}
