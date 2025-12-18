/**
 * Configuration and Constants
 * Single source of truth for game settings
 */

// =============================================================================
// DIFFICULTY SETTINGS
// =============================================================================

export type Difficulty = 'chill' | 'normal' | 'intense';

export interface DifficultyConfig {
  key: Difficulty;
  label: string;
  timeMs: number;
  timeDisplay: string;
  color: string;
  hoverColor: number;
  bgColor: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  chill: {
    key: 'chill',
    label: 'CHILL',
    timeMs: 4 * 60 * 1000,
    timeDisplay: '4 min',
    color: '#44aa44',
    hoverColor: 0x55cc55,
    bgColor: 0x2a4a2a,
  },
  normal: {
    key: 'normal',
    label: 'NORMAL',
    timeMs: 3 * 60 * 1000,
    timeDisplay: '3 min',
    color: '#4488ff',
    hoverColor: 0x55aaff,
    bgColor: 0x2a3a5a,
  },
  intense: {
    key: 'intense',
    label: 'INTENSE',
    timeMs: 2 * 60 * 1000,
    timeDisplay: '2 min',
    color: '#ff4444',
    hoverColor: 0xff6666,
    bgColor: 0x5a2a2a,
  },
};

export const DIFFICULTY_LIST: Difficulty[] = ['chill', 'normal', 'intense'];

// =============================================================================
// CANVAS SETTINGS
// =============================================================================

export const CANVAS = {
  WIDTH: 1200,
  HEIGHT: 700,
} as const;

// =============================================================================
// THEME / COLORS
// =============================================================================

export const COLORS = {
  // Backgrounds
  BG_DARK: 0x0a0a1a,
  BG_PANEL: 0x1a1a2e,

  // Dice
  DICE_BG: 0x2a2a4a,
  DICE_BORDER: 0x4a4a6a,
  DICE_BORDER_HOVER: 0x6a6a8a,
  DICE_LOCKED_BG: 0x4a2a2a,
  DICE_LOCKED_BORDER: 0xff6666,
  DICE_PIP: 0xcccccc,
  DICE_PIP_LOCKED: 0xff9999,

  // Buttons
  BTN_PRIMARY_BG: 0x2a5a2a,
  BTN_PRIMARY_BORDER: 0x4a8a4a,
  BTN_PRIMARY_HOVER: 0x3a7a3a,
  BTN_SECONDARY_BG: 0x3a3a4a,
  BTN_SECONDARY_BORDER: 0x5a5a6a,
  BTN_SECONDARY_HOVER: 0x4a4a5a,
  BTN_DISABLED_BG: 0x2a2a2a,

  // Text
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#aaaaaa',
  TEXT_MUTED: '#888888',
  TEXT_DISABLED: '#666666',
  TEXT_SUCCESS: '#44ff44',
  TEXT_WARNING: '#ffaa44',
  TEXT_DANGER: '#ff4444',
  TEXT_LOCKED: '#ff6666',

  // Scorecard
  SCORECARD_BG: 0x1a1a2e,
  SCORECARD_BORDER: 0x3a3a5a,
  SCORECARD_ROW_HOVER: 0x2a2a4a,
  SCORECARD_ROW_SELECTED: 0x3a3a5a,
} as const;

// =============================================================================
// SIZES
// =============================================================================

export const SIZES = {
  // Dice
  DICE_SIZE: 70,
  DICE_PIP_RADIUS: 6,
  DICE_PIP_OFFSET: 18,
  DICE_SPACING: 85,
  DICE_BORDER_WIDTH: 3,

  // Buttons
  BTN_ROLL_WIDTH: 150,
  BTN_ROLL_HEIGHT: 50,
  BTN_MENU_WIDTH: 100,
  BTN_MENU_HEIGHT: 36,

  // Scorecard
  SCORECARD_WIDTH: 270,
  SCORECARD_HEIGHT: 560,
  SCORECARD_ROW_HEIGHT: 28,

  // Animation
  ROLL_DURATION_MS: 500,
  FADE_DURATION_MS: 300,
} as const;

// =============================================================================
// FONTS
// =============================================================================

export const FONTS = {
  FAMILY: 'Arial',
  SIZE_TITLE: '48px',
  SIZE_HEADING: '28px',
  SIZE_SUBHEADING: '20px',
  SIZE_BODY: '18px',
  SIZE_SMALL: '14px',
  SIZE_TINY: '12px',
} as const;

// =============================================================================
// GAME RULES
// =============================================================================

export const GAME_RULES = {
  DICE_COUNT: 5,
  REROLLS_PER_TURN: 3,
  UPPER_BONUS_THRESHOLD: 63,
  UPPER_BONUS_AMOUNT: 35,
  CATEGORIES_COUNT: 13,
} as const;

// =============================================================================
// LEGACY EXPORT (for backwards compatibility during migration)
// =============================================================================

export interface GameConfig {
  CANVAS_WIDTH: number;
  CANVAS_HEIGHT: number;
}

export const CONFIG: GameConfig = {
  CANVAS_WIDTH: CANVAS.WIDTH,
  CANVAS_HEIGHT: CANVAS.HEIGHT,
};
