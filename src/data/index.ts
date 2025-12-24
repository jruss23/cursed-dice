/**
 * Data Module
 * Central re-export for all game data
 */

// Modes (Curses)
export {
  MODES,
  getModeConfig,
  getModeName,
  getModeIcon,
  type ModeId,
  type ModeConfig,
} from './modes';

// Categories
export {
  UPPER_CATEGORIES,
  LOWER_CATEGORIES,
  SPECIAL_CATEGORIES,
  ALL_CATEGORIES,
  BASE_CATEGORIES,
  getCategoryConfig,
  getCategoryName,
  getCategoryShortName,
  calculateScore,
  getCategoriesBySection,
  getUpperCategoryIds,
  getLowerCategoryIds,
  getSpecialCategoryIds,
  getBaseCategoryIds,
  type CategoryId,
  type CategorySection,
  type CategoryConfig,
} from './categories';

// Blessings
export {
  BLESSINGS,
  BLESSING_IDS,
  getBlessingConfig,
  getImplementedBlessings,
  getAllBlessings,
  type BlessingId,
  type BlessingConfig,
} from './blessings';

// Difficulties
export {
  DIFFICULTIES,
  DIFFICULTY_LIST,
  getDifficultyConfig,
  getDifficultyTime,
  getDifficultyLabel,
  type Difficulty,
  type DifficultyConfig,
} from './difficulties';
