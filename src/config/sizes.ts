/**
 * Size Constants
 * Dimensions, spacing, and animation timing
 */

// =============================================================================
// CANVAS SETTINGS
// =============================================================================

export const CANVAS = {
  WIDTH: 1200,
  HEIGHT: 700,
} as const;

// =============================================================================
// SIZES & DIMENSIONS
// =============================================================================

export const SIZES = {
  // Dice
  DICE_SIZE: 70,
  DICE_PIP_RADIUS: 6,
  DICE_PIP_OFFSET: 18,
  DICE_SPACING: 85,
  DICE_BORDER_WIDTH: 3,

  // Buttons
  BTN_ROLL_WIDTH: 140,
  BTN_ROLL_HEIGHT: 44,
  BTN_ROLL_GLOW_WIDTH: 150,
  BTN_ROLL_GLOW_HEIGHT: 52,
  BTN_MENU_WIDTH: 100,
  BTN_MENU_HEIGHT: 36,

  // Scorecard
  SCORECARD_WIDTH: 324,
  SCORECARD_HEIGHT: 545,
  SCORECARD_ROW_HEIGHT: 24,
  SCORECARD_MARGIN: 15,

  // Left control panel
  LEFT_PANEL_WIDTH: 130,
  LEFT_PANEL_HEIGHT: 280,
  LEFT_PANEL_MARGIN: 15,

  // Center header panel
  HEADER_PANEL_WIDTH: 280,
  HEADER_PANEL_HEIGHT: 160,

  // Dice controls panel
  DICE_CONTROLS_WIDTH: 360,
  DICE_CONTROLS_HEIGHT: 100,

  // Shared panel styling
  PANEL_CORNER_SIZE: 10,
  PANEL_CORNER_INSET: 6,
  PANEL_GLOW_SIZE: 12,
  PANEL_BORDER_WIDTH: 1,

  // Glow stroke widths
  GLOW_STROKE_SMALL: 4,
  GLOW_STROKE_MEDIUM: 6,
  GLOW_STROKE_LARGE: 8,
  GLOW_STROKE_HOVER: 10,

  // Layout Y positions (legacy - prefer getPortraitLayout)
  LAYOUT_TITLE_Y: 40,
  LAYOUT_TIMER_Y: 90,
  LAYOUT_THRESHOLD_Y: 140,
  LAYOUT_DICE_Y: 320,
  LAYOUT_DICE_HELPER_OFFSET: -90,
  LAYOUT_DICE_REROLL_OFFSET: 75,
  LAYOUT_DICE_BUTTON_OFFSET: 140,

  // Animation durations (also in TIMING, kept here for compatibility)
  ROLL_DURATION_MS: 500,
  FADE_DURATION_MS: 300,
  ANIM_FLASH: 80,
  ANIM_INSTANT: 50,
  ANIM_FAST: 100,
  ANIM_QUICK: 150,
  ANIM_NORMAL: 200,
  ANIM_ENTRANCE: 300,
  ANIM_SLOW: 400,
  ANIM_MEDIUM_SLOW: 600,
  ANIM_PULSE: 2000,
  ANIM_PULSE_SLOW: 2500,
  ANIM_AMBIENT: 5000,
} as const;

// =============================================================================
// ANIMATION TIMING
// =============================================================================

export const TIMING = {
  // Dice
  ROLL_DURATION: 500,
  FADE_DURATION: 300,

  // UI Transitions (fastest to slowest)
  FLASH: 80,
  INSTANT: 50,
  FAST: 100,
  QUICK: 150,
  NORMAL: 200,
  ENTRANCE: 300,
  SLOW: 400,
  MEDIUM_SLOW: 600,

  // Ambient animations
  PULSE: 2000,
  PULSE_SLOW: 2500,
  AMBIENT: 5000,

  // Game flow
  SCORE_DISPLAY_DELAY: 1200,
  TRANSITION_DURATION: 500,
  MODE_TRANSITION_DELAY: 2000,
} as const;

// Legacy alias for backwards compatibility during migration
export const ANIM = {
  ANIM_FLASH: TIMING.FLASH,
  ANIM_INSTANT: TIMING.INSTANT,
  ANIM_FAST: TIMING.FAST,
  ANIM_QUICK: TIMING.QUICK,
  ANIM_NORMAL: TIMING.NORMAL,
  ANIM_ENTRANCE: TIMING.ENTRANCE,
  ANIM_SLOW: TIMING.SLOW,
  ANIM_MEDIUM_SLOW: TIMING.MEDIUM_SLOW,
  ANIM_PULSE: TIMING.PULSE,
  ANIM_PULSE_SLOW: TIMING.PULSE_SLOW,
  ANIM_AMBIENT: TIMING.AMBIENT,
} as const;
