/**
 * Game Progression System
 * Tracks progress through the 4 game modes and cumulative score
 */

import { createLogger } from '@/systems/logger';

const log = createLogger('GameProgression');

export type GameMode = 1 | 2 | 3 | 4;

export interface ModeConfig {
  mode: GameMode;
  name: string;
  description: string;
  cursedDice: boolean; // Mode 2: 1 die locked per hand
  lockedCategories: number; // Mode 3: 3 locked, Mode 4: 10 locked (only 3 available)
}

export const MODE_CONFIGS: Record<GameMode, ModeConfig> = {
  1: {
    mode: 1,
    name: 'THE AWAKENING',
    description: 'Standard dice game - fill all categories',
    cursedDice: false,
    lockedCategories: 0,
  },
  2: {
    mode: 2,
    name: 'SHACKLED DIE',
    description: 'Your highest die becomes cursed after each score',
    cursedDice: true,
    lockedCategories: 0,
  },
  3: {
    mode: 3,
    name: 'SEALED PATHS',
    description: '3 random categories locked - new locks after each score',
    cursedDice: false,
    lockedCategories: 3,
  },
  4: {
    mode: 4,
    name: 'THE GAUNTLET',
    description: 'Only 3 categories available at a time',
    cursedDice: false,
    lockedCategories: 10, // 10 locked = only 3 available
  },
};

export const PASS_THRESHOLD = 250;
export const TOTAL_MODES = 4;

// Gauntlet mode configuration
export const GAUNTLET_AVAILABLE_CATEGORIES = 3; // Number of categories available in Gauntlet mode
export const GAUNTLET_LOCKED_THRESHOLD = 10; // lockedCategories >= this means Gauntlet mode

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
    log.log('Reset to Mode 1');
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
   * Returns whether the player passed and the next mode (if any)
   */
  completeMode(score: number): { passed: boolean; nextMode: GameMode | null; showBlessingChoice: boolean } {
    const completedMode = this.state.currentMode;
    const modeIndex = completedMode - 1;
    this.state.modeScores[modeIndex] = score;
    this.state.totalScore += score;

    const passed = this.checkPass(score);

    if (!passed) {
      this.state.failed = true;
      log.log(`Mode ${completedMode} FAILED with ${score} (< ${PASS_THRESHOLD})`);
      return { passed: false, nextMode: null, showBlessingChoice: false };
    }

    log.log(`Mode ${completedMode} PASSED with ${score}`);

    // Check if all modes complete
    if (completedMode === TOTAL_MODES) {
      this.state.isRunComplete = true;
      log.log(`RUN COMPLETE! Total: ${this.state.totalScore}`);
      return { passed: true, nextMode: null, showBlessingChoice: false };
    }

    // Advance to next mode
    const nextMode = (completedMode + 1) as GameMode;
    this.state.currentMode = nextMode;
    log.log(`Advancing to Mode ${nextMode}`);

    // Show blessing choice after Mode 1
    const showBlessingChoice = completedMode === 1;

    return { passed: true, nextMode, showBlessingChoice };
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

/**
 * DEBUG: Set the current mode directly (for testing)
 */
export function debugSetMode(mode: GameMode): void {
  const manager = getGameProgression();
  (manager as unknown as { state: ProgressionState }).state.currentMode = mode;
  log.debug(`DEBUG: Set mode to ${mode}`);
}
