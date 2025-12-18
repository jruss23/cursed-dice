/**
 * Game Progression System
 * Tracks progress through the 4 game modes and cumulative score
 */

export type GameMode = 1 | 2 | 3 | 4;

export interface ModeConfig {
  mode: GameMode;
  name: string;
  description: string;
  cursedDice: boolean; // Mode 2: 1 die locked per hand
  lockedCategories: number; // Mode 3: 3 locked, Mode 4: 12 locked (only 1 available)
}

export const MODE_CONFIGS: Record<GameMode, ModeConfig> = {
  1: {
    mode: 1,
    name: 'CLASSIC SPRINT',
    description: 'Standard Yahtzee - fill all categories',
    cursedDice: false,
    lockedCategories: 0,
  },
  2: {
    mode: 2,
    name: 'CURSED DICE',
    description: 'One die is locked each hand - position changes after scoring',
    cursedDice: true,
    lockedCategories: 0,
  },
  3: {
    mode: 3,
    name: 'CURSED CATEGORIES',
    description: '3 random categories locked - new locks after each score',
    cursedDice: false,
    lockedCategories: 3,
  },
  4: {
    mode: 4,
    name: 'FINAL CHALLENGE',
    description: 'Only 1 category available at a time',
    cursedDice: false,
    lockedCategories: 12, // 12 locked = only 1 available
  },
};

export const PASS_THRESHOLD = 250;
export const TOTAL_MODES = 4;

export interface ProgressionState {
  currentMode: GameMode;
  modeScores: (number | null)[];  // Score for each completed mode (null = not yet played)
  totalScore: number;
  isRunComplete: boolean;
  failed: boolean;
}

/**
 * Game Progression Manager
 * Singleton to persist across scenes
 */
class GameProgressionManager {
  private state: ProgressionState;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): ProgressionState {
    return {
      currentMode: 1,
      modeScores: [null, null, null, null],
      totalScore: 0,
      isRunComplete: false,
      failed: false,
    };
  }

  /**
   * Reset progression (start new run)
   */
  reset(): void {
    this.state = this.createInitialState();
    console.log('[GameProgression] Reset to Mode 1');
  }

  /**
   * Get current state
   */
  getState(): ProgressionState {
    return { ...this.state };
  }

  /**
   * Get current mode
   */
  getCurrentMode(): GameMode {
    return this.state.currentMode;
  }

  /**
   * Get current mode config
   */
  getCurrentModeConfig(): ModeConfig {
    return MODE_CONFIGS[this.state.currentMode];
  }

  /**
   * Get mode config by number
   */
  getModeConfig(mode: GameMode): ModeConfig {
    return MODE_CONFIGS[mode];
  }

  /**
   * Check if a score passes the threshold
   */
  checkPass(score: number): boolean {
    return score >= PASS_THRESHOLD;
  }

  /**
   * Complete current mode with a score
   * Returns whether the player passed
   */
  completeMode(score: number): { passed: boolean; nextMode: GameMode | null } {
    const modeIndex = this.state.currentMode - 1;
    this.state.modeScores[modeIndex] = score;
    this.state.totalScore += score;

    const passed = this.checkPass(score);

    if (!passed) {
      this.state.failed = true;
      console.log(`[GameProgression] Mode ${this.state.currentMode} FAILED with ${score} (< ${PASS_THRESHOLD})`);
      return { passed: false, nextMode: null };
    }

    console.log(`[GameProgression] Mode ${this.state.currentMode} PASSED with ${score}`);

    // Check if all modes complete
    if (this.state.currentMode === TOTAL_MODES) {
      this.state.isRunComplete = true;
      console.log(`[GameProgression] RUN COMPLETE! Total: ${this.state.totalScore}`);
      return { passed: true, nextMode: null };
    }

    // Advance to next mode
    const nextMode = (this.state.currentMode + 1) as GameMode;
    this.state.currentMode = nextMode;
    console.log(`[GameProgression] Advancing to Mode ${nextMode}`);

    return { passed: true, nextMode };
  }

  /**
   * Get total score across all completed modes
   */
  getTotalScore(): number {
    return this.state.totalScore;
  }

  /**
   * Get score for a specific mode (null if not played)
   */
  getModeScore(mode: GameMode): number | null {
    return this.state.modeScores[mode - 1];
  }

  /**
   * Check if the entire run is complete (all 4 modes passed)
   */
  isRunComplete(): boolean {
    return this.state.isRunComplete;
  }

  /**
   * Check if the run has failed
   */
  hasFailed(): boolean {
    return this.state.failed;
  }

  /**
   * Check if we're on a fresh run (haven't completed any modes)
   */
  isFreshRun(): boolean {
    return this.state.modeScores.every(s => s === null);
  }

  /**
   * Get progress string (e.g., "Mode 2/4")
   */
  getProgressString(): string {
    return `Mode ${this.state.currentMode}/${TOTAL_MODES}`;
  }
}

// Singleton instance
let instance: GameProgressionManager | null = null;

/**
 * Get the game progression manager instance
 */
export function getGameProgression(): GameProgressionManager {
  if (!instance) {
    instance = new GameProgressionManager();
  }
  return instance;
}

/**
 * Reset the game progression (start fresh)
 */
export function resetGameProgression(): void {
  if (instance) {
    instance.reset();
  } else {
    instance = new GameProgressionManager();
  }
}
