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

  // Victory celebration
  VICTORY_DURATION: 4000,           // Total color transition duration
  VICTORY_CELEBRATION_DELAY: 800,   // Delay before confetti/fireworks start
  VICTORY_CONFETTI_STAGGER: 5000,   // Time to stagger confetti spawns
  VICTORY_CONFETTI_FALL: 2000,      // Base confetti fall duration
  VICTORY_FLASH: 300,               // Screen flash duration
  VICTORY_TRANSITION_START: 0.25,   // Start panel transition at 25% of wipe
  VICTORY_TRANSITION_DURATION: 0.5, // Panel transition takes 50% of total
} as const;

// =============================================================================
// DEPTH LAYERS (Z-ordering for game objects)
// =============================================================================

export const DEPTH = {
  // Background layers
  BACKGROUND: 0,
  GAME_BOARD: 10,

  // Game elements
  DICE: 20,
  UI_PANELS: 30,

  // Overlay layers
  LIGHT_RAYS: 98,
  BLUE_OVERLAY: 99,
  OVERLAY: 100,
  PANEL: 101,
  CONFETTI: 102,
  FIREWORKS: 103,

  // Top-most
  MODAL: 110,
  TOOLTIP: 120,
} as const;

// =============================================================================
// CELEBRATION SETTINGS
// =============================================================================

export const CELEBRATION = {
  // Confetti
  CONFETTI_COUNT_MOBILE: 120,
  CONFETTI_COUNT_DESKTOP: 200,
  CONFETTI_SIZE_MIN: 4,
  CONFETTI_SIZE_MAX: 10,
  CONFETTI_FALL_VARIANCE: 1000,

  // Fireworks
  FIREWORK_COUNT_MOBILE: 12,
  FIREWORK_COUNT_DESKTOP: 20,
  FIREWORK_SPARK_COUNT_MOBILE: 12,
  FIREWORK_SPARK_COUNT_DESKTOP: 20,
  FIREWORK_SPARK_SIZE_MIN: 3,
  FIREWORK_SPARK_SIZE_MAX: 7,
  FIREWORK_STAGGER: 250,

  // Gradient/wipe effect
  GRADIENT_STEPS: 30,
  BLUR_SIZE: 80,
  RAY_COUNT: 5,
} as const;

// =============================================================================
// GAMEPLAY LAYOUT
// =============================================================================

export const GAMEPLAY_LAYOUT = {
  // Score effect position
  SCORE_EFFECT_Y: 290,

  // Prompt positioning
  PROMPT_PADDING: 12,
  PROMPT_HEIGHT: 14,

  // Left margin based on debug mode
  LEFT_MARGIN_DEBUG: 160,
  LEFT_MARGIN_NORMAL: 30,

  // Screen shake intensity
  SHAKE_INTENSITY: 0.003,

  // Delay after roll before applying mode mechanics
  POST_ROLL_DELAY: 100,
} as const;

// =============================================================================
// END SCREEN OVERLAY
// =============================================================================

export const END_SCREEN = {
  // Panel dimensions
  PANEL_WIDTH_MOBILE: 340,
  PANEL_WIDTH_DESKTOP: 400,
  PANEL_HEIGHT_MOBILE: 300,
  PANEL_HEIGHT_DESKTOP: 340,
  PANEL_MARGIN: 30,

  // Content Y positions
  TITLE_Y: 45,
  SUBTITLE_OFFSET: 30,
  DIVIDER_1_Y: 100,
  SCORE_Y: 150,
  SCORE_LABEL_OFFSET: -25,
  SCORE_VALUE_OFFSET: 5,
  SCORE_ROUND_OFFSET: 30,
  DIVIDER_2_Y: 220,

  // Button positioning
  BUTTON_Y_MOBILE: 250,
  BUTTON_Y_DESKTOP: 280,
  BUTTON_OFFSET_MOBILE: 70,
  BUTTON_OFFSET_DESKTOP: 90,
  BUTTON_WIDTH_MOBILE: 120,
  BUTTON_WIDTH_DESKTOP: 150,
  BUTTON_HEIGHT_MOBILE: 36,
  BUTTON_HEIGHT_DESKTOP: 44,

  // Firework effects
  FIREWORK_EXPLOSION_MARGIN: 50,
  FIREWORK_HEIGHT_FACTOR: 0.4,
  FIREWORK_DISTANCE_MIN: 60,
  FIREWORK_DISTANCE_VARIANCE: 80,
  FIREWORK_GRAVITY: 40,
  SPARK_DURATION_BASE: 800,
  SPARK_DURATION_VARIANCE: 400,
  FLASH_RADIUS: 15,
  FLASH_DURATION: 200,
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
