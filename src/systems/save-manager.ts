/**
 * Save Manager
 * Handles localStorage persistence for high scores and game data
 */

import { createLogger } from './logger';
import type { Difficulty } from '@/config';

const log = createLogger('SaveManager');

const STORAGE_KEY = 'cursed-dice-save';

export interface HighScores {
  /** Best score per difficulty (single mode doesn't matter, just best in that time limit) */
  byDifficulty: Record<Difficulty, number>;
  /** Best complete run total (all 4 modes) */
  bestRunTotal: number;
  /** Number of completed runs (all 4 modes passed) */
  runsCompleted: number;
}

export interface SaveData {
  version: number;
  highScores: HighScores;
}

const DEFAULT_SAVE: SaveData = {
  version: 1,
  highScores: {
    byDifficulty: {
      chill: 0,
      normal: 0,
      intense: 0,
    },
    bestRunTotal: 0,
    runsCompleted: 0,
  },
};

/**
 * Save Manager Singleton
 * Provides type-safe access to localStorage data
 */
class SaveManagerClass {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  /**
   * Load save data from localStorage
   */
  private load(): SaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        log.log('No save data found, using defaults');
        return { ...DEFAULT_SAVE };
      }

      const parsed = JSON.parse(raw) as SaveData;

      // Validate and migrate if needed
      if (!parsed.version || parsed.version < DEFAULT_SAVE.version) {
        log.log('Migrating save data from older version');
        return this.migrate(parsed);
      }

      log.log('Loaded save data:', parsed.highScores);
      return parsed;
    } catch (err) {
      log.error('Failed to load save data:', err);
      return { ...DEFAULT_SAVE };
    }
  }

  /**
   * Migrate old save data to current version
   */
  private migrate(old: Partial<SaveData>): SaveData {
    return {
      ...DEFAULT_SAVE,
      ...old,
      version: DEFAULT_SAVE.version,
    };
  }

  /**
   * Persist current data to localStorage
   */
  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      log.log('Save data persisted');
    } catch (err) {
      log.error('Failed to save data:', err);
    }
  }

  /**
   * Get high scores
   */
  getHighScores(): HighScores {
    return { ...this.data.highScores };
  }

  /**
   * Get high score for a specific difficulty
   */
  getHighScoreForDifficulty(difficulty: Difficulty): number {
    return this.data.highScores.byDifficulty[difficulty];
  }

  /**
   * Get best run total
   */
  getBestRunTotal(): number {
    return this.data.highScores.bestRunTotal;
  }

  /**
   * Get number of completed runs
   */
  getRunsCompleted(): number {
    return this.data.highScores.runsCompleted;
  }

  /**
   * Record a mode score (updates difficulty high score if better)
   * @returns true if this was a new high score
   */
  recordModeScore(difficulty: Difficulty, score: number): boolean {
    const current = this.data.highScores.byDifficulty[difficulty];
    if (score > current) {
      this.data.highScores.byDifficulty[difficulty] = score;
      this.save();
      log.log(`New high score for ${difficulty}: ${score} (was ${current})`);
      return true;
    }
    return false;
  }

  /**
   * Record a completed run (all 4 modes passed)
   * @returns true if this was a new best run
   */
  recordCompletedRun(totalScore: number): boolean {
    this.data.highScores.runsCompleted++;

    const wasNewBest = totalScore > this.data.highScores.bestRunTotal;
    if (wasNewBest) {
      this.data.highScores.bestRunTotal = totalScore;
      log.log(`New best run: ${totalScore} (run #${this.data.highScores.runsCompleted})`);
    } else {
      log.log(`Run completed: ${totalScore} (best: ${this.data.highScores.bestRunTotal})`);
    }

    this.save();
    return wasNewBest;
  }

  /**
   * Clear all save data (for testing/reset)
   */
  clearAll(): void {
    log.log('Clearing all save data');
    this.data = { ...DEFAULT_SAVE };
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Singleton instance
let instance: SaveManagerClass | null = null;

/**
 * Get the SaveManager singleton
 */
export function getSaveManager(): SaveManagerClass {
  if (!instance) {
    instance = new SaveManagerClass();
  }
  return instance;
}
