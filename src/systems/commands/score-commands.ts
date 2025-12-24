/**
 * Score Commands
 * Commands for scoring actions
 */

import type { CommandWithResult } from './types';
import type { Scorecard, CategoryId } from '@/systems/scorecard';

// =============================================================================
// SCORE CATEGORY COMMAND
// =============================================================================

export interface ScoreCategoryCommandDeps {
  scorecard: Scorecard;
  categoryId: CategoryId;
  dice: number[];
}

export class ScoreCategoryCommand implements CommandWithResult<number> {
  readonly name = 'ScoreCategory';
  private scoredValue: number | null = null;

  constructor(private deps: ScoreCategoryCommandDeps) {}

  canExecute(): boolean {
    const { scorecard, categoryId } = this.deps;
    return scorecard.isAvailable(categoryId);
  }

  execute(): number {
    if (!this.canExecute()) return 0;

    const { scorecard, categoryId, dice } = this.deps;
    const score = scorecard.score(categoryId, dice);
    this.scoredValue = score;

    return score;
  }

  undo(): void {
    if (this.scoredValue === null) return;

    const { scorecard, categoryId } = this.deps;
    scorecard.unscore(categoryId);
    this.scoredValue = null;
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createScoreCategoryCommand(
  scorecard: Scorecard,
  categoryId: CategoryId,
  dice: number[]
): ScoreCategoryCommand {
  return new ScoreCategoryCommand({ scorecard, categoryId, dice });
}
