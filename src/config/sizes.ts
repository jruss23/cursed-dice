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
  // Dice (sized for 6 dice to fit at 430px viewport)
  DICE_SIZE: 50,
  DICE_PIP_RADIUS: 4,
  DICE_PIP_OFFSET: 13,
  DICE_SPACING: 64,
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
  MEDIUM: 250,
  ENTRANCE: 300,
  SLOW: 400,
  MEDIUM_SLOW: 600,
  LONG: 1000,
  EXTENDED: 1500,

  // Ambient animations
  PULSE: 2000,
  PULSE_SLOW: 2500,
  PULSE_LONG: 3000,
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
  // Confetti (mobile-only, game is locked to 430px width)
  CONFETTI_COUNT: 120,
  CONFETTI_SIZE_MIN: 4,
  CONFETTI_SIZE_MAX: 10,
  CONFETTI_FALL_VARIANCE: 1000,

  // Fireworks (mobile-only)
  FIREWORK_COUNT: 12,
  FIREWORK_SPARK_COUNT: 12,
  FIREWORK_SPARK_SIZE_MIN: 3,
  FIREWORK_SPARK_SIZE_MAX: 7,
  FIREWORK_STAGGER: 250,

  // Gradient/wipe effect
  GRADIENT_STEPS: 30,
  BLUR_SIZE: 80,
  RAY_COUNT: 5,
} as const;

// =============================================================================
// LAYOUT CONFIG (single source of truth for all layout values)
// =============================================================================

export const LAYOUT = {
  // Breakpoints
  ULTRA_COMPACT_THRESHOLD: 580, // usableHeight below this triggers compact mode

  // =========================================================================
  // GAMEPLAY SCENE
  // =========================================================================
  gameplay: {
    SCORE_EFFECT_Y: 290,
    PROMPT_PADDING: 12,
    PROMPT_HEIGHT: 14,
    LEFT_MARGIN_DEBUG: 160,
    LEFT_MARGIN_NORMAL: 30,
    SCORECARD_RIGHT_MARGIN: 15,
    SHAKE_INTENSITY: 0.003,
    POST_ROLL_DELAY: 100,
  },

  // =========================================================================
  // HEADER
  // =========================================================================
  header: {
    HEIGHT: 48,
    HEIGHT_COMPACT: 40,
    MARGIN: 20,
    TOP_PADDING: 5,
    // Gap between header bottom and dice zone (tip text)
    GAP: 8,
    GAP_COMPACT: 5,
  },

  // =========================================================================
  // DICE
  // =========================================================================
  dice: {
    REFERENCE_SIZE: 70,
    PIP_RADIUS_RATIO: 0.086,
    PIP_OFFSET_RATIO: 0.257,
  },

  // =========================================================================
  // TIP TEXT (above dice)
  // =========================================================================
  tip: {
    HEIGHT: 14,
    // Gap between tip text and dice - space for new content
    GAP: 18,
  },

  // =========================================================================
  // LOCK/CURSED ICONS (below dice)
  // =========================================================================
  icons: {
    GAP_BASE: 14,
    HEIGHT_BASE: 16,
  },

  // =========================================================================
  // CONTROLS PANEL
  // =========================================================================
  controls: {
    HEIGHT: 60,
    HEIGHT_COMPACT: 50,
    GAP: 8,
    GAP_COMPACT: 4,
    COL_WIDTH: 130,
    COL_WIDTH_MOBILE: 120,
    BUTTON_HEIGHT: 44,
    BUTTON_HEIGHT_MOBILE: 32,
    BUTTON_HEIGHT_COMPACT: 28,
    BUTTON_WIDTH: 110,
    BUTTON_WIDTH_MOBILE: 100,
    DIVIDER_PADDING: 24,
    DIVIDER_PADDING_MOBILE: 16,
    DIVIDER_PADDING_COMPACT: 10,
    GLOW_PADDING_X: 10,
    GLOW_PADDING_X_COMPACT: 8,
    GLOW_PADDING_Y: 8,
    GLOW_PADDING_Y_COMPACT: 6,
    LABEL_VALUE_GAP: 12,
    LABEL_VALUE_GAP_MOBILE: 10,
    COMPACT_MEET_OFFSET: 34,
    COMPACT_MEET_OFFSET_COMPACT: 30,
  },

  // =========================================================================
  // SCORECARD (positioning from gameplay layout)
  // =========================================================================
  scorecard: {
    GAP: 12,
    GAP_COMPACT: 8,
    MIN_HEIGHT: 200,
    // External: space between scorecard bottom and screen edge
    BOTTOM_PADDING: 45,
    BOTTOM_PADDING_COMPACT: 35,
    // Internal: padding inside panel below the total row
    INTERNAL_BOTTOM_PADDING: 10,
    INTERNAL_BOTTOM_PADDING_COMPACT: 6,
    // Panel dimensions
    WIDTH: 340,
    // Row heights
    ROW_HEIGHT: 36,
    ROW_HEIGHT_MIN: 28,
    TOTAL_ROW_HEIGHT: 36,
    TOTAL_ROW_HEIGHT_COMPACT: 28,
    // Spacing
    CONTENT_PADDING: 6,
    CONTENT_PADDING_COMPACT: 4,
    TITLE_HEIGHT: 28,
    TITLE_HEIGHT_COMPACT: 20,
    TITLE_GAP: 2,
    TITLE_GAP_COMPACT: 0,
    HEADER_HEIGHT: 24,
    HEADER_HEIGHT_COMPACT: 18,
    DIVIDER_HEIGHT: 6,
    DIVIDER_HEIGHT_COMPACT: 3,
    COLUMN_GAP: 6,
    // Row styling
    NAME_PADDING_LEFT: 8,
    LABEL_PADDING_LEFT: 6,
    POTENTIAL_OFFSET_FROM_RIGHT: 45,
    SCORE_OFFSET_FROM_RIGHT: 12,
  },

  // =========================================================================
  // HEADER PANEL
  // =========================================================================
  headerPanel: {
    // Panel widths
    WIDTH_COMPACT: 340,
    WIDTH_NORMAL: 420,
    MARGIN: 20,
    SAFE_AREA_OFFSET: 10,
    // Heights (mobile-only, game is locked to 430px width)
    HEIGHT_COMPACT: 70,
    HEIGHT_NORMAL: 85,
    // Side columns
    SIDE_INSET_MIN: 40,
    SIDE_INSET_RATIO: 0.12,
    SECTION_WIDTH: 70,
    SECTION_PADDING: 2,
    // Font sizes (mobile-only)
    FONT_LABEL: 13,
    FONT_VALUE: 18,
    FONT_TIMER: 20,
    // Vertical positioning (mobile-only)
    SIDE_CENTER_Y_RATIO: 0.5,
    LABEL_OFFSET: -10,
    VALUE_OFFSET: 8,
  },

  // =========================================================================
  // PAUSE MENU
  // =========================================================================
  pauseMenu: {
    PANEL_WIDTH: 280,
    PANEL_PADDING: 24,
    TITLE_HEIGHT: 28,
    AUDIO_LABEL_HEIGHT: 16,
    TOGGLE_BUTTON_HEIGHT: 38,
    TOGGLE_BUTTON_WIDTH: 115,
    ACTION_BUTTON_HEIGHT: 44,
    ACTION_BUTTON_WIDTH: 160,
    GAP_TITLE_TO_AUDIO: 16,
    GAP_AUDIO_TO_TOGGLES: 10,
    GAP_TOGGLES_TO_RESUME: 20,
    GAP_RESUME_TO_QUIT: 12,
  },

  // =========================================================================
  // SETTINGS PANEL (menu scene)
  // =========================================================================
  settingsPanel: {
    PANEL_WIDTH: 260,
    PANEL_PADDING: 20,
    TITLE_HEIGHT: 28,
    AUDIO_LABEL_HEIGHT: 16,
    TOGGLE_BUTTON_HEIGHT: 38,
    TOGGLE_BUTTON_WIDTH: 110,
    CLOSE_BUTTON_HEIGHT: 38,
    CLOSE_BUTTON_WIDTH: 110,
    GAP_TITLE_TO_AUDIO: 14,
    GAP_AUDIO_TO_TOGGLES: 10,
    GAP_TOGGLES_TO_CLOSE: 18,
  },

  // =========================================================================
  // BLESSING CHOICE PANEL
  // Game is always mobile-sized (430px width locked via CSS)
  // =========================================================================
  blessingPanel: {
    // Panel sizing
    PANEL_MARGIN: 20,
    // Title padding from panel top
    TITLE_PADDING: 22,
    // Button
    CONTINUE_BUTTON_HEIGHT: 50,
    CONTINUE_BUTTON_WIDTH: 200,
    GAP_BUTTON_FROM_BOTTOM: 25,
    // Gaps
    GAP_TITLE_TO_SUBTITLE: 22,
    GAP_SUBTITLE_TO_CHOOSE: 28,
    GAP_CHOOSE_TO_CARDS: 18,
    // Card dimensions
    CARD_WIDTH_MARGIN: 20,
    CARD_HEIGHT: 88,
    CARD_SPACING: 3,
  },
} as const;

// =============================================================================
// END SCREEN OVERLAY
// =============================================================================

export const END_SCREEN = {
  // Panel dimensions (mobile-only, game is locked to 430px width)
  PANEL_WIDTH: 340,
  PANEL_MARGIN: 30,
  PANEL_PADDING: 20,

  // Element heights
  TITLE_HEIGHT: 24,
  SUBTITLE_HEIGHT: 18,
  DIVIDER_HEIGHT: 1,
  SCORE_LABEL_HEIGHT: 14,
  SCORE_VALUE_HEIGHT: 28,
  SCORE_ROUND_HEIGHT: 14,
  BUTTON_HEIGHT: 36,
  PREVIEW_BOX_HEIGHT: 58,

  // Gaps between elements
  GAP_TITLE_TO_SUBTITLE: 8,
  GAP_SUBTITLE_TO_PREVIEW: 16,
  GAP_PREVIEW_TO_DIVIDER: 16,
  GAP_SUBTITLE_TO_DIVIDER: 20,
  GAP_DIVIDER_TO_SCORES: 16,
  GAP_SCORE_LABEL_TO_VALUE: 6,
  GAP_SCORE_VALUE_TO_ROUND: 8,
  GAP_SCORES_TO_DIVIDER: 16,
  GAP_DIVIDER_TO_BUTTON: 16,

  // Button sizing
  BUTTON_OFFSET: 70,
  BUTTON_WIDTH: 120,

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
