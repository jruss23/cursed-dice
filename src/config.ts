/**
 * Configuration and Constants
 * Single source of truth for game settings
 */

// =============================================================================
// DEVELOPMENT FLAGS
// =============================================================================

export const DEV = {
  /**
   * Automatically true in development, false in production builds.
   * Controls: debug panel visibility, console logging, error verbosity
   */
  IS_DEVELOPMENT: import.meta.env.DEV,
} as const;

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
// DESIGN SYSTEM - UNIFIED COLOR PALETTE
// =============================================================================

/**
 * Color palette based on HSL for consistency
 * All colors are derived from these base hues:
 * - Purple (primary): 270°
 * - Green (success): 120°
 * - Red (danger): 0°
 * - Gold (warning/bonus): 45°
 * - Blue (info): 210°
 */
export const PALETTE = {
  // === PURPLE (Primary brand color) ===
  purple: {
    900: 0x0a0610,  // Darkest - backgrounds
    800: 0x120c1a,  // Dark panels
    700: 0x1a1228,  // Panel backgrounds
    600: 0x2a1a3a,  // Elevated surfaces
    500: 0x6644aa,  // Primary accent
    400: 0x8866cc,  // Hover states
    300: 0xaa88ee,  // Active/selected
    200: 0xccaaff,  // Text on dark
    100: 0xeeddff,  // Bright text
  },

  // === GREEN (Success/positive) ===
  green: {
    900: 0x0a1a0a,
    800: 0x142814,
    700: 0x1e3a1e,
    600: 0x2a4a2a,
    500: 0x44aa44,
    400: 0x66cc66,
    300: 0x88ee88,
    200: 0xaaffaa,
    100: 0xccffcc,
  },

  // === RED (Danger/locked) ===
  red: {
    900: 0x1a0a0a,
    800: 0x2a1414,
    700: 0x3a1a1a,
    600: 0x4a2a2a,
    500: 0xcc4444,
    400: 0xee6666,
    300: 0xff8888,
    200: 0xffaaaa,
    100: 0xffcccc,
  },

  // === GOLD (Warning/bonus) ===
  gold: {
    900: 0x1a1408,
    800: 0x2a2010,
    700: 0x3a2a18,
    600: 0x4a3a20,
    500: 0xccaa44,
    400: 0xeecc66,
    300: 0xffdd88,
    200: 0xffeeaa,
    100: 0xffffcc,
  },

  // === NEUTRAL (Grays with purple tint) ===
  neutral: {
    900: 0x08080c,
    800: 0x101014,
    700: 0x18181e,
    600: 0x222228,
    500: 0x444450,
    400: 0x666678,
    300: 0x8888a0,
    200: 0xaaaac0,
    100: 0xccccdd,
    50: 0xeeeef4,
  },

  // === ABSOLUTE COLORS ===
  black: 0x000000,
  white: 0xffffff,

  // === DEBUG COLORS (bright for visibility, not in PALETTE shades) ===
  debug: {
    cyan: 0x00ccff,
    cyanLight: 0x66eeff,
    cyanDark: 0x002233,
    cyanDarkHover: 0x003355,
    redDark: 0x331111,
    redDarkHover: 0x552222,
    greenDark: 0x112233,
    greenDarkHover: 0x223344,
    greenBorder: 0x44aa66,
    greenBorderHover: 0x66cc88,
    currentModeBg: 0x112211,
    currentModeBorder: 0x44aa44,
    currentModeHover: 0x224422,
    closeBg: 0x442222,
    closeBgHover: 0x663333,
    closeBorder: 0xcc4444,
  },
} as const;

// === SEMANTIC COLORS (use these in components) ===
export const COLORS = {
  // Backgrounds
  BG_DARK: PALETTE.purple[900],
  BG_PANEL: PALETTE.purple[700],
  BG_SURFACE: PALETTE.purple[800],

  // Borders & accents
  BORDER_DEFAULT: PALETTE.purple[500],
  BORDER_MUTED: PALETTE.neutral[600],
  ACCENT_PRIMARY: PALETTE.purple[500],
  ACCENT_GLOW: PALETTE.purple[400],

  // Dice
  DICE_BG: PALETTE.neutral[700],
  DICE_BORDER: PALETTE.neutral[500],
  DICE_BORDER_HOVER: PALETTE.purple[400],
  DICE_LOCKED_BG: PALETTE.red[700],
  DICE_LOCKED_BORDER: PALETTE.red[400],
  DICE_CURSED_BG: PALETTE.purple[600],
  DICE_CURSED_BORDER: PALETTE.purple[400],
  DICE_PIP: PALETTE.neutral[100],
  DICE_PIP_LOCKED: PALETTE.red[300],
  DICE_PIP_CURSED: PALETTE.purple[300],

  // Buttons
  BTN_PRIMARY_BG: PALETTE.green[700],
  BTN_PRIMARY_BORDER: PALETTE.green[500],
  BTN_PRIMARY_HOVER: PALETTE.green[600],
  BTN_SECONDARY_BG: PALETTE.neutral[700],
  BTN_SECONDARY_BORDER: PALETTE.neutral[500],
  BTN_SECONDARY_HOVER: PALETTE.neutral[600],
  BTN_DISABLED_BG: PALETTE.neutral[800],

  // Text (hex strings for Phaser text)
  TEXT_PRIMARY: '#eeeef4',     // neutral.50
  TEXT_SECONDARY: '#aaaac0',   // neutral.200
  TEXT_MUTED: '#666678',       // neutral.400
  TEXT_DISABLED: '#444450',    // neutral.500
  TEXT_SUCCESS: '#88ee88',     // green.300
  TEXT_WARNING: '#ffdd88',     // gold.300
  TEXT_DANGER: '#ff8888',      // red.300
  TEXT_LOCKED: '#ee6666',      // red.400
  TEXT_CURSED: '#aa88ee',      // purple.300
  TEXT_ACCENT: '#ccaaff',      // purple.200

  // Scorecard
  SCORECARD_BG: PALETTE.purple[800],
  SCORECARD_BORDER: PALETTE.purple[500],
  SCORECARD_ROW_EVEN: PALETTE.purple[800],
  SCORECARD_ROW_ODD: PALETTE.purple[900],
  SCORECARD_ROW_HOVER: PALETTE.green[800],
  SCORECARD_ROW_FILLED: PALETTE.neutral[900],

  // Timer states
  TIMER_SAFE: '#88ee88',       // green.300
  TIMER_WARNING: '#ffdd88',    // gold.300
  TIMER_DANGER: '#ee6666',     // red.400
  TIMER_CRITICAL: '#ff8888',   // red.300

  // Timer glow backgrounds (darker versions)
  TIMER_GLOW_SAFE: '#226622',
  TIMER_GLOW_WARNING: '#665522',
  TIMER_GLOW_DANGER: '#662222',

  // Menu text colors
  MENU_SUBTITLE: '#aa88bb',
  MENU_HEADER: '#aa66cc',
  MENU_HEADER_GLOW: '#440066',
  MENU_INFO: '#bb88dd',
  MENU_INFO_GLOW: '#6622aa',
  MENU_VERSION: '#555566',

  // Debug panel colors (intentionally bright for visibility)
  DEBUG_CYAN: '#44ddff',
  DEBUG_RED: '#ff6666',
  DEBUG_GREEN: '#66cc88',
  DEBUG_GREEN_BRIGHT: '#66ee66',
  DEBUG_PURPLE: '#aa88ff',

  // Overlays and shadows (hex values for rectangle fills)
  OVERLAY: PALETTE.black,
  SHADOW: PALETTE.black,
  HIGHLIGHT: PALETTE.white,
  PANEL_BG_DEEP: 0x0a0a15,  // Very dark blue-purple for main panels
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

  // Pulsing glow stroke widths (for outer glow rectangles)
  GLOW_STROKE_SMALL: 4,    // Subtle glow for small elements
  GLOW_STROKE_MEDIUM: 6,   // Standard panel glow
  GLOW_STROKE_LARGE: 8,    // Prominent glow for buttons/focus elements
  GLOW_STROKE_HOVER: 10,   // Enhanced glow on hover

  // Sprint scene layout (Y positions)
  LAYOUT_TITLE_Y: 40,
  LAYOUT_TIMER_Y: 90,
  LAYOUT_THRESHOLD_Y: 140,
  LAYOUT_DICE_Y: 320,
  LAYOUT_DICE_HELPER_OFFSET: -90,
  LAYOUT_DICE_REROLL_OFFSET: 75,
  LAYOUT_DICE_BUTTON_OFFSET: 140,

  // Animation durations
  ROLL_DURATION_MS: 500,
  FADE_DURATION_MS: 300,
  // Animation durations (in ms)
  ANIM_FLASH: 80,           // Very quick flash/blink
  ANIM_INSTANT: 50,         // Near-instant
  ANIM_FAST: 100,           // Fast feedback
  ANIM_QUICK: 150,          // Quick UI transitions
  ANIM_NORMAL: 200,         // Standard transitions
  ANIM_ENTRANCE: 300,       // Panel entrance/exit
  ANIM_SLOW: 400,           // Slower, noticeable
  ANIM_MEDIUM_SLOW: 600,    // Medium-slow effects
  ANIM_PULSE: 2000,         // Standard pulse/glow
  ANIM_PULSE_SLOW: 2500,    // Slower ambient pulse
  ANIM_AMBIENT: 5000,       // Slow ambient animations
} as const;

// =============================================================================
// FONTS
// =============================================================================

export const FONTS = {
  FAMILY: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial',
  SIZE_TIMER: '56px',       // 56px - countdown timer
  SIZE_MENU_TITLE: '52px',  // 52px - menu title
  SIZE_TITLE: '48px',       // 48px - large headings
  SIZE_BLESSING: '42px',    // 42px - blessing icons
  SIZE_BLESSING_SM: '36px', // 36px - smaller blessing icons
  SIZE_MODE_TITLE: '32px',  // 32px - mode titles
  SIZE_HEADING: '28px',     // 28px - section headings
  SIZE_LARGE: '24px',       // 24px - large body text
  SIZE_SUBHEADING: '20px',  // 20px - subheadings
  SIZE_BODY: '18px',        // 18px - body text
  SIZE_BODY_SM: '17px',     // 17px - slightly smaller body
  SIZE_BUTTON: '16px',      // 16px - button text
  SIZE_LABEL: '15px',       // 15px - labels
  SIZE_SMALL: '14px',       // 14px - small text
  SIZE_TINY: '12px',        // 12px - tiny text
  SIZE_MICRO: '11px',       // 11px - micro text
  SIZE_NANO: '10px',        // 10px - smallest text
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
// RESPONSIVE EXPORTS
// =============================================================================

// Re-export responsive utilities for convenient imports
export {
  RESPONSIVE,
  BREAKPOINTS,
  getViewportMetrics,
  getScaledSizes,
  getScorecardLayout,
  getScaledFontSizes,
  getPortraitLayout,
  scaleValue,
  type ViewportMetrics,
  type ScaledSizes,
  type ScorecardLayout,
  type PortraitLayout,
} from './systems/responsive';

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
