/**
 * Design System - Theme Configuration
 * Colors, typography, and visual constants
 */

// =============================================================================
// COLOR PALETTE (HSL-based for consistency)
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
    900: 0x0a0610, // Darkest - backgrounds
    800: 0x120c1a, // Dark panels
    700: 0x1a1228, // Panel backgrounds
    600: 0x2a1a3a, // Elevated surfaces
    500: 0x6644aa, // Primary accent
    400: 0x8866cc, // Hover states
    300: 0xaa88ee, // Active/selected
    200: 0xccaaff, // Text on dark
    100: 0xeeddff, // Bright text
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

  // === DEBUG COLORS (bright for visibility) ===
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

  // === VICTORY CELEBRATION COLORS ===
  victory: {
    skyBlue: 0x87ceeb,        // Sky blue background
    skyBlueBg: 0xe6f5ff,      // Very light blue panel bg
    brightGold: 0xffd700,     // Bright gold (button fill)
    goldenrod: 0xdaa520,      // Goldenrod (borders, text)
    goldenBronze: 0xcd950c,   // Golden bronze
    darkGoldenrod: 0xb8860b,  // Dark goldenrod
    lightGoldHover: 0xffe033, // Light gold hover
    lightRays: 0xffffcc,      // Light rays color
    cornsilk: 0xfff8dc,       // Cornsilk text
    warmBrown: 0x8b5a2b,      // Warm brown
    darkBlueGray: 0x3c5064,   // Dark blue-gray text
  },

  // === FIREWORK ACCENT COLORS ===
  fireworks: {
    coral: 0xff6b6b,
    teal: 0x4ecdc4,
    yellow: 0xffe66d,
  },

  // === BLUE (Info/Normal difficulty) ===
  blue: {
    900: 0x0a1a2a,
    800: 0x142838,
    700: 0x1e3a4e,
    600: 0x2a3a5a,
    500: 0x4488ff,
    400: 0x55aaff,
    300: 0x77ccff,
    200: 0x99ddff,
    100: 0xbbeeFF,
  },

  // === SPOOKY MENU COLORS ===
  spooky: {
    // Background gradients
    bgDark: 0x050510,
    bgPurpleTint: 0x100520,
    bgGreenTint: 0x051510,

    // Ambient glow spots
    glowPurple: 0x2a0a3a,
    glowGreen: 0x0a2a1a,
    glowDeepPurple: 0x1a0a2a,

    // Floating elements
    skullGlow: 0x6633aa,
    diceOuterGlow: 0x6600aa,
    diceGlow: 0x8833bb,
    diceBg: 0x1a0a2a,
    diceBorder: 0x6a3a8a,
    dicePip: 0xaa66cc,

    // Fog
    fog: 0x2a1a3a,

    // Eyes
    eyeOuterGlow: 0xff0000,
    eyeGlow: 0xff2200,
    eyeCore: 0xff4400,
    eyePupil: 0xffff00,

    // Candles
    candleBody: 0x2a1a1a,
    flameOuter: 0xff4400,
    flameMid: 0xff6600,
    flameInner: 0xff8800,
    flameCore: 0xffcc00,

    // Ghosts
    ghostGlow: 0x8866cc,
  },

  // === MENU BUTTON COLORS ===
  menu: {
    // Learn to Play button (green accent)
    playGlow: 0x4a9a4a,
    playBg: 0x2a4a2a,
    playBgHover: 0x3a5a3a,
    playBorder: 0x4a9a4a,
    playBorderHover: 0x6aba6a,
  },

  // === GAMEPLAY BACKGROUND ===
  gameplay: {
    // Background gradient corners
    bgTopLeft: 0x0a0a1a,
    bgTopRight: 0x0a0a1a,
    bgBottomLeft: 0x0a1a2a,
    bgBottomRight: 0x1a0a2a,

    // Ambient particles
    particle: 0x4a4a8a,
  },
} as const;

// =============================================================================
// FLASH COLORS (RGB values for camera.flash() effects)
// =============================================================================

/**
 * Pre-computed RGB values for camera flash effects.
 * Usage: scene.cameras.main.flash(duration, FLASH.RED.r, FLASH.RED.g, FLASH.RED.b)
 */
export const FLASH = {
  // Button feedback flashes (match button styles)
  GREEN: { r: 68, g: 170, b: 68 },      // PALETTE.green[500] = 0x44aa44
  RED: { r: 204, g: 68, b: 68 },        // PALETTE.red[500] = 0xcc4444
  GOLD: { r: 204, g: 170, b: 68 },      // PALETTE.gold[500] = 0xccaa44
  PURPLE: { r: 102, g: 68, b: 170 },    // PALETTE.purple[500] = 0x6644aa

  // Special flashes
  VICTORY: { r: 255, g: 215, b: 0 },    // Bright gold for victory
} as const;

// =============================================================================
// SEMANTIC COLORS (use these in components)
// =============================================================================

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
  TEXT_PRIMARY: '#eeeef4', // neutral.50
  TEXT_SECONDARY: '#aaaac0', // neutral.200
  TEXT_MUTED: '#666678', // neutral.400
  TEXT_DISABLED: '#444450', // neutral.500
  TEXT_SUCCESS: '#88ee88', // green.300
  TEXT_WARNING: '#ffdd88', // gold.300
  TEXT_DANGER: '#ff8888', // red.300
  TEXT_LOCKED: '#ee6666', // red.400
  TEXT_CURSED: '#aa88ee', // purple.300
  TEXT_ACCENT: '#ccaaff', // purple.200

  // Scorecard
  SCORECARD_BG: PALETTE.purple[800],
  SCORECARD_BORDER: PALETTE.purple[500],
  SCORECARD_ROW_EVEN: PALETTE.purple[800],
  SCORECARD_ROW_ODD: PALETTE.purple[900],
  SCORECARD_ROW_HOVER: PALETTE.green[800],
  SCORECARD_ROW_FILLED: PALETTE.neutral[900],

  // Timer states
  TIMER_SAFE: '#88ee88', // green.300
  TIMER_WARNING: '#ffdd88', // gold.300
  TIMER_DANGER: '#ee6666', // red.400
  TIMER_CRITICAL: '#ff8888', // red.300

  // Timer glow backgrounds
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

  // Debug panel colors
  DEBUG_CYAN: '#44ddff',
  DEBUG_RED: '#ff6666',
  DEBUG_GREEN: '#66cc88',
  DEBUG_GREEN_BRIGHT: '#66ee66',
  DEBUG_PURPLE: '#aa88ff',

  // Overlays and shadows
  OVERLAY: PALETTE.black,
  SHADOW: PALETTE.black,
  HIGHLIGHT: PALETTE.white,
  PANEL_BG_DEEP: 0x0a0a15,

  // Canvas border
  CANVAS_BORDER: '#7c3aed', // Purple border (CSS hex string)

  // Victory celebration
  VICTORY_BTN_BG: PALETTE.victory.brightGold,
  VICTORY_BTN_BG_HOVER: PALETTE.victory.lightGoldHover,
  VICTORY_BTN_BORDER: PALETTE.victory.goldenrod,
  VICTORY_BTN_BORDER_HOVER: PALETTE.victory.brightGold,
  VICTORY_BTN_GLOW: PALETTE.victory.goldenrod,
  VICTORY_BTN_TEXT: '#FFF8DC', // Cornsilk
  VICTORY_TITLE: '#DAA520', // Goldenrod hex for text

  // Difficulty colors (text/CSS hex strings)
  DIFFICULTY_CHILL: '#44aa44',   // green.500
  DIFFICULTY_NORMAL: '#4488ff', // blue.500
  DIFFICULTY_INTENSE: '#ff4444', // bright red

  // Score effect colors (CSS hex strings for text glow)
  SCORE_EFFECT_GREEN: '#22aa44',
  SCORE_EFFECT_GOLD: '#ffaa00',
  SCORE_EFFECT_PURPLE: '#aa66ff',
  SCORE_EFFECT_GRAY: '#666666',
  SCORE_EFFECT_WHITE: '#ffffff',
} as const;

// =============================================================================
// ALPHA VALUES (Opacity constants for consistency)
// =============================================================================

export const ALPHA = {
  // Subtle effects (glows, hints)
  GLOW_SUBTLE: 0.06,
  GLOW_SOFT: 0.08,
  GLOW_LIGHT: 0.12,
  GLOW_MEDIUM: 0.15,
  GLOW_STRONG: 0.25,
  GLOW_HOVER: 0.3,
  GLOW_INTENSE: 0.35,

  // Overlays and shadows
  SHADOW_LIGHT: 0.3,
  SHADOW_MEDIUM: 0.4,
  SHADOW_HEAVY: 0.5,
  OVERLAY_LIGHT: 0.5,
  OVERLAY_MEDIUM: 0.7,
  OVERLAY_HEAVY: 0.85,

  // Panel backgrounds
  PANEL_TRANSPARENT: 0.88,
  PANEL_SOLID: 0.92,
  PANEL_OPAQUE: 0.95,
  PANEL_NEAR_SOLID: 0.98,

  // Borders and strokes
  BORDER_SUBTLE: 0.35,
  BORDER_LIGHT: 0.5,
  BORDER_MEDIUM: 0.6,
  BORDER_STRONG: 0.7,
  BORDER_SOLID: 0.8,

  // Interactive states
  DISABLED: 0.5,
  DISABLED_STRONG: 0.15,
  HOVER: 0.25,
  ACTIVE: 0.3,

  // Text overlays (glow behind text)
  TEXT_GLOW: 0.4,
  TEXT_GLOW_STRONG: 0.5,
} as const;

// =============================================================================
// SCALE VALUES (Transform scale constants)
// =============================================================================

export const SCALE = {
  // Button interactions
  CLICK: 0.97,
  HOVER: 1.03,
  HOVER_SUBTLE: 1.02,

  // Animations
  ENTRY: 0.9,
  ENTRY_SUBTLE: 0.95,
  EXIT: 0.95,

  // Emphasis
  PULSE_MIN: 0.98,
  PULSE_MAX: 1.02,
  BOUNCE: 1.1,
  BOUNCE_SMALL: 1.05,

  // Glow scaling
  GLOW_PULSE: 1.2,
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const FONTS = {
  FAMILY: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial',

  // Font sizes (largest to smallest)
  SIZE_SCORE_HUGE: '72px',   // Score effect 50+ points
  SIZE_SCORE_LARGE: '56px',  // Score effect 30+ points
  SIZE_TIMER: '56px',
  SIZE_MENU_TITLE: '52px',
  SIZE_TITLE: '48px',        // Score effect 15+ points
  SIZE_BLESSING: '42px',
  SIZE_DISPLAY: '36px',      // Score effect 0 points
  SIZE_MODE_TITLE: '32px',
  SIZE_HEADING: '28px',
  SIZE_LARGE: '24px',
  SIZE_SUBHEADING: '20px',
  SIZE_BODY: '18px',
  SIZE_BUTTON: '16px',
  SIZE_LABEL: '15px',
  SIZE_SMALL: '14px',
  SIZE_TINY: '12px',
  SIZE_MICRO: '11px',
  SIZE_NANO: '10px',
} as const;

// =============================================================================
// PANEL STYLING (Standard dialog/popup styling)
// =============================================================================

export const PANEL = {
  // Glow
  GLOW_SIZE: 12, // Extra size around panel for glow
  GLOW_COLOR: PALETTE.purple[500],
  GLOW_ALPHA: ALPHA.GLOW_SOFT,

  // Background
  BG_COLOR: PALETTE.purple[800],
  BG_ALPHA: ALPHA.PANEL_SOLID,

  // Border
  BORDER_WIDTH: 2,
  BORDER_COLOR: PALETTE.purple[500],
  BORDER_ALPHA: ALPHA.BORDER_MEDIUM,

  // Corner accents
  CORNER_INSET: 6,
  CORNER_LENGTH: 14,
  CORNER_THICKNESS: 2,
  CORNER_COLOR: PALETTE.purple[400],
  CORNER_ALPHA: ALPHA.BORDER_SOLID,

  // Backdrop (for modal dialogs)
  BACKDROP_COLOR: PALETTE.black,
  BACKDROP_ALPHA: ALPHA.OVERLAY_MEDIUM,
} as const;
