/**
 * Responsive Layout System
 *
 * Centralized utilities for viewport-aware sizing and layout decisions.
 * All components should use these utilities instead of hardcoded values.
 */

import Phaser from 'phaser';
import { LAYOUT } from '@/config/sizes';
import { FONTS } from '@/config/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface ViewportMetrics {
  /** Canvas width in logical pixels (not DPR-scaled) */
  width: number;
  /** Canvas height in logical pixels (not DPR-scaled) */
  height: number;
  /** Aspect ratio (width / height) */
  aspectRatio: number;
  /** True if height > width * 0.9 */
  isPortrait: boolean;
  /** True if width < 600 */
  isMobile: boolean;
  /** True if width < 400 */
  isSmallMobile: boolean;
  /** True if height < 700 (iPhone X Safari, etc.) */
  isShortScreen: boolean;
  /** Scale factor relative to reference width (0.85 - 1.15) */
  scale: number;
  /** Safe area insets for notched devices */
  safeArea: SafeAreaInsets;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ScaledSizes {
  /** Dice size (50-70px) */
  dice: number;
  /** Dice spacing (60-85px) */
  diceSpacing: number;
  /** Pip radius scaled to dice */
  pipRadius: number;
  /** Pip offset scaled to dice */
  pipOffset: number;
  /** Scorecard width */
  scorecardWidth: number;
  /** Scorecard row height (24-36px) */
  rowHeight: number;
  /** Header panel width */
  headerWidth: number;
  /** Minimum touch target size */
  touchTarget: number;
  /** Button height */
  buttonHeight: number;
}

export type ScorecardLayout = 'two-column';

// =============================================================================
// GAMEPLAY LAYOUT - Single Source of Truth
// =============================================================================

/**
 * Complete layout configuration for gameplay scene.
 * This is THE source of truth - all components read from this, none calculate their own.
 */
export interface GameplayLayout {
  // === VIEWPORT ===
  viewport: {
    width: number;
    height: number;
    centerX: number;
    scale: number;
    isUltraCompact: boolean;
    isMobile: boolean;
    safeArea: SafeAreaInsets;
  };

  // === HEADER ===
  header: {
    y: number;
    height: number;
    width: number;
  };

  // === DICE ===
  dice: {
    centerX: number;
    centerY: number;
    size: number;
    spacing: number;
    pipRadius: number;
    pipOffset: number;
    /** Scale factor for visual elements (size / 70) */
    visualScale: number;
  };

  // === TIP TEXT (above dice) ===
  tip: {
    y: number;
    fontSize: string;
  };

  // === LOCK/CURSED ICONS (below dice) ===
  icons: {
    y: number;
    scale: number;
    gap: number;
    height: number;
  };

  // === CONTROLS PANEL ===
  controls: {
    centerX: number;
    centerY: number;
    height: number;
    colWidth: number;
    buttonHeight: number;
    buttonWidth: number;
    dividerPadding: number;
    fontSize: string;
    glowPaddingX: number;
    glowPaddingY: number;
    labelValueGap: number;
    compactMeetOffset: number;
    useCompactLayout: boolean;
  };

  // === SCORECARD ===
  scorecard: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/** @deprecated Use GameplayLayout instead */
export interface PortraitLayout {
  /** Header panel height */
  headerHeight: number;
  /** Y position for header panel center */
  headerY: number;
  /** Y position for dice center */
  diceY: number;
  /** Y position for controls panel center */
  controlsY: number;
  /** Y position for scorecard top */
  scorecardY: number;
  /** Available height for scorecard */
  scorecardHeight: number;
  /** Whether layout is in ultra-compact mode */
  isUltraCompact: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Reference width for sizing calculations (iPhone 16 Pro Max)
 * With RESIZE mode, canvas matches viewport exactly.
 * Scale = 1.0 at 430px width (our desktop lock target).
 */
const REFERENCE_WIDTH = 430;

/** Responsive breakpoints (mobile-only app) */
export const BREAKPOINTS = {
  SMALL_MOBILE: 380,  // iPhone SE, small Androids
  MOBILE: 600,        // All phones (always true for mobile-only)
} as const;

/** Responsive sizing constraints */
export const RESPONSIVE = {
  // Touch targets
  TOUCH_TARGET_MIN: 44,

  // Dice (sized for 6 dice to fit with comfortable margins)
  // 430px: 5×64 + 50 = 370px, leaves 30px margins each side
  // 325px: 5×48 + 42 = 282px, leaves 21px margins each side
  DICE_SIZE_MIN: 42,
  DICE_SIZE_MAX: 50,
  DICE_SPACING_MIN: 48,
  DICE_SPACING_MAX: 64,

  // Scorecard
  SCORECARD_WIDTH_MIN: 280,
  SCORECARD_WIDTH_MAX: 324,
  SCORECARD_WIDTH_TWO_COL: 340, // Width for 2-column layout
  ROW_HEIGHT_MIN: 24,
  ROW_HEIGHT_MOBILE: 36,

  // Scorecard compact mode (when expansion blessing adds 4 categories)
  // Keep 36px rows for touch targets, reduce everything else
  COMPACT_TITLE_HEIGHT: 20,     // Standard: 28
  COMPACT_HEADER_HEIGHT: 18,    // Standard: 24
  COMPACT_TOTAL_HEIGHT: 28,     // Standard: 36
  COMPACT_CONTENT_PADDING: 4,   // Standard: 6
  COMPACT_DIVIDER_HEIGHT: 3,    // Standard: 6
  COMPACT_BOTTOM_PADDING: 4,    // Standard: 8
  COMPACT_TITLE_GAP: 0,         // Standard: 2

  // Header
  HEADER_WIDTH_MIN: 280,
  HEADER_WIDTH_MAX: 420,

  // Buttons
  BUTTON_HEIGHT_MIN: 44,
  BUTTON_HEIGHT_MAX: 48,

  // Font scale range
  FONT_SCALE_MIN: 0.75,
  FONT_SCALE_MAX: 1.0,
} as const;

// =============================================================================
// VIEWPORT METRICS
// =============================================================================

/**
 * Get current viewport metrics from a Phaser scene
 * With EXPAND mode, canvas dimensions match the actual viewport.
 */
export function getViewportMetrics(scene: Phaser.Scene): ViewportMetrics {
  const { width, height } = scene.cameras.main;

  const aspectRatio = width / height;
  const isPortrait = height > width * 0.9;
  // Mobile-only app: always true, but keep for compatibility
  const isMobile = true;
  const isSmallMobile = width < BREAKPOINTS.SMALL_MOBILE;
  const isShortScreen = height < 700; // iPhone X Safari ~640px
  // Scale relative to reference width for sizing calculations
  // Clamped to reasonable range for very small/large viewports
  const scale = Math.max(0.85, Math.min(1.15, width / REFERENCE_WIDTH));
  const safeArea = getSafeAreaInsets();

  return {
    width,
    height,
    aspectRatio,
    isPortrait,
    isMobile,
    isSmallMobile,
    isShortScreen,
    scale,
    safeArea,
  };
}

/**
 * Get safe area insets from CSS environment variables
 * Returns zeros if not available (desktop browsers)
 */
export function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined' || typeof getComputedStyle === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const style = getComputedStyle(document.documentElement);

  const parseInset = (prop: string): number => {
    const value = style.getPropertyValue(prop);
    return parseInt(value, 10) || 0;
  };

  return {
    top: parseInset('--sat'),
    bottom: parseInset('--sab'),
    left: parseInset('--sal'),
    right: parseInset('--sar'),
  };
}

// =============================================================================
// SCALED SIZES
// =============================================================================

/**
 * Get all scaled sizes based on viewport metrics
 */
export function getScaledSizes(metrics: ViewportMetrics): ScaledSizes {
  const { width, isMobile, scale } = metrics;

  // Dice sizing - scale down on mobile
  const diceSize = scaleValue(
    RESPONSIVE.DICE_SIZE_MAX,
    scale,
    RESPONSIVE.DICE_SIZE_MIN,
    RESPONSIVE.DICE_SIZE_MAX
  );

  const diceSpacing = scaleValue(
    RESPONSIVE.DICE_SPACING_MAX,
    scale,
    RESPONSIVE.DICE_SPACING_MIN,
    RESPONSIVE.DICE_SPACING_MAX
  );

  // Pip sizing proportional to dice
  const pipRadius = Math.round(diceSize * 0.086); // 6/70 ratio
  const pipOffset = Math.round(diceSize * 0.257); // 18/70 ratio

  // Scorecard width
  const scorecardWidth = isMobile
    ? Math.min(RESPONSIVE.SCORECARD_WIDTH_TWO_COL, width - 20)
    : scaleValue(
        RESPONSIVE.SCORECARD_WIDTH_MAX,
        scale,
        RESPONSIVE.SCORECARD_WIDTH_MIN,
        RESPONSIVE.SCORECARD_WIDTH_MAX
      );

  // Row height - larger on mobile for touch
  const rowHeight = isMobile
    ? RESPONSIVE.ROW_HEIGHT_MOBILE
    : RESPONSIVE.ROW_HEIGHT_MIN;

  // Header width
  const headerWidth = Math.min(
    RESPONSIVE.HEADER_WIDTH_MAX,
    width - 20
  );

  // Touch target minimum
  const touchTarget = RESPONSIVE.TOUCH_TARGET_MIN;

  // Button height
  const buttonHeight = isMobile
    ? RESPONSIVE.BUTTON_HEIGHT_MIN
    : RESPONSIVE.BUTTON_HEIGHT_MAX;

  return {
    dice: diceSize,
    diceSpacing,
    pipRadius,
    pipOffset,
    scorecardWidth,
    rowHeight,
    headerWidth,
    touchTarget,
    buttonHeight,
  };
}

/**
 * Scale a value based on viewport scale with min/max constraints
 */
export function scaleValue(
  base: number,
  scale: number,
  min?: number,
  max?: number
): number {
  let value = Math.round(base * scale);
  if (min !== undefined) value = Math.max(min, value);
  if (max !== undefined) value = Math.min(max, value);
  return value;
}

// =============================================================================
// LAYOUT HELPERS
// =============================================================================

/**
 * Determine which scorecard layout to use
 * Mobile-only app: always use two-column layout
 */
export function getScorecardLayout(_metrics: ViewportMetrics): ScorecardLayout {
  // Mobile-only app: always use two-column for portrait
  return 'two-column';
}

/**
 * Get scaled font sizes based on viewport
 */
export function getScaledFontSizes(metrics: ViewportMetrics): Record<string, string> {
  const { scale, isMobile } = metrics;

  // Clamp scale for fonts (don't go too small)
  const fontScale = Math.max(
    RESPONSIVE.FONT_SCALE_MIN,
    Math.min(RESPONSIVE.FONT_SCALE_MAX, scale)
  );

  // Mobile gets slightly larger fonts for readability
  const mobileBoost = isMobile ? 1.1 : 1.0;

  const scaledSize = (base: number, min: number): string => {
    const size = Math.max(min, Math.round(base * fontScale * mobileBoost));
    return `${size}px`;
  };

  return {
    SIZE_TIMER: scaledSize(56, 32),
    SIZE_TITLE: scaledSize(48, 28),
    SIZE_MODE_TITLE: scaledSize(32, 20),
    SIZE_HEADING: scaledSize(28, 18),
    SIZE_SUBHEADING: scaledSize(20, 14),
    SIZE_BODY: scaledSize(18, 14),
    SIZE_BUTTON: scaledSize(16, 14),
    SIZE_SMALL: scaledSize(14, 12),
    SIZE_TINY: scaledSize(12, 11),
  };
}

/**
 * Calculate centered X position with optional offset
 */
export function centerX(metrics: ViewportMetrics, offset: number = 0): number {
  return metrics.width / 2 + offset;
}

/**
 * Calculate centered Y position with optional offset
 */
export function centerY(metrics: ViewportMetrics, offset: number = 0): number {
  return metrics.height / 2 + offset;
}

/**
 * Get usable width accounting for safe areas
 */
export function getUsableWidth(metrics: ViewportMetrics): number {
  return metrics.width - metrics.safeArea.left - metrics.safeArea.right;
}

/**
 * Get usable height accounting for safe areas
 */
export function getUsableHeight(metrics: ViewportMetrics): number {
  return metrics.height - metrics.safeArea.top - metrics.safeArea.bottom;
}

// =============================================================================
// VIEWPORT-RELATIVE SIZING (EXPAND Mode)
// =============================================================================

/**
 * Calculate viewport-relative sizes for UI elements.
 * All sizes are percentages of viewport dimensions with min/max constraints.
 * Use these for EXPAND mode where canvas matches viewport exactly.
 */
export interface ViewportSizing {
  // Positions (Y as percentage of height)
  titleY: number;
  versionY: number;
  subtitleY: number;
  learnBtnY: number;
  headerY: number;
  buttonStartY: number;
  buttonSpacing: number;
  modeInfoY: number;
  highScoresY: number;

  // Sizes
  titleFontSize: string;
  versionFontSize: string;
  subtitleFontSize: string;
  headerFontSize: string;
  bodyFontSize: string;
  smallFontSize: string;
  tinyFontSize: string;

  // Button dimensions
  buttonWidth: number;
  buttonHeight: number;
  smallButtonWidth: number;
  smallButtonHeight: number;

  // Panel dimensions
  panelWidth: number;
  highScoresPanelWidth: number;
  highScoresPanelHeight: number;

  // Spacing
  padding: number;
  smallPadding: number;
}

/**
 * Menu Layout - Group-based with fixed spacing
 *
 * Layout is built top-down with fixed pixel gaps between groups.
 * The entire layout is then centered vertically in the viewport.
 *
 * ┌─────────────────────────┐
 * │ TITLE GROUP             │  title (32px) + version (14px) + subtitle (16px)
 * │ gap: 30px               │
 * │ LEARN BUTTON            │  36px tall
 * │ gap: 30px               │
 * │ DIFFICULTY GROUP        │  header + 3 buttons with 16px gaps
 * │ gap: 24px               │
 * │ HIGH SCORES             │  panel
 * └─────────────────────────┘
 */
export function getMenuSizing(scene: Phaser.Scene): ViewportSizing {
  const { width, height } = scene.cameras.main;

  // ==========================================================================
  // FIXED SIZES (in pixels) - Easy to adjust
  // ==========================================================================
  const TITLE_HEIGHT = 32;
  const VERSION_HEIGHT = 14;
  const SUBTITLE_HEIGHT = 16;
  const TITLE_INTERNAL_GAP = 6;      // Between title elements

  const LEARN_BTN_HEIGHT = 36;

  const HEADER_TEXT_HEIGHT = 18;
  const BUTTON_HEIGHT = 52;
  const BUTTON_GAP = 16;              // Between difficulty buttons
  const HEADER_TO_BUTTON_GAP = 12;    // "Choose Your Fate" to first button

  const HIGH_SCORES_HEIGHT = 160;

  // Gaps between major groups
  const GAP_TITLE_TO_LEARN = 30;
  const GAP_LEARN_TO_DIFFICULTY = 30;
  const GAP_DIFFICULTY_TO_SCORES = 24;

  // ==========================================================================
  // CALCULATE GROUP HEIGHTS
  // ==========================================================================
  const titleGroupHeight = TITLE_HEIGHT + TITLE_INTERNAL_GAP + VERSION_HEIGHT + TITLE_INTERNAL_GAP + SUBTITLE_HEIGHT;
  const difficultyGroupHeight = HEADER_TEXT_HEIGHT + HEADER_TO_BUTTON_GAP + (BUTTON_HEIGHT * 3) + (BUTTON_GAP * 2);

  // ==========================================================================
  // TOTAL LAYOUT HEIGHT
  // ==========================================================================
  const totalLayoutHeight =
    titleGroupHeight +
    GAP_TITLE_TO_LEARN +
    LEARN_BTN_HEIGHT +
    GAP_LEARN_TO_DIFFICULTY +
    difficultyGroupHeight +
    GAP_DIFFICULTY_TO_SCORES +
    HIGH_SCORES_HEIGHT;

  // ==========================================================================
  // POSITION LAYOUT VERTICALLY
  // ==========================================================================
  // If layout fits: center it. If not: use minimum top padding.
  const MIN_TOP_PADDING = 30;
  const availableSpace = height - totalLayoutHeight;
  const topPadding = availableSpace > MIN_TOP_PADDING * 2
    ? availableSpace / 2  // Center if there's room
    : MIN_TOP_PADDING;    // Otherwise just use minimum top padding

  // If layout is too tall, compress the gaps proportionally
  let gapScale = 1;
  if (availableSpace < MIN_TOP_PADDING * 2) {
    const excessHeight = totalLayoutHeight - (height - MIN_TOP_PADDING * 2);
    const totalGaps = GAP_TITLE_TO_LEARN + GAP_LEARN_TO_DIFFICULTY + GAP_DIFFICULTY_TO_SCORES;
    gapScale = Math.max(0.3, (totalGaps - excessHeight) / totalGaps);
  }

  const scaledGapTitleToLearn = GAP_TITLE_TO_LEARN * gapScale;
  const scaledGapLearnToDifficulty = GAP_LEARN_TO_DIFFICULTY * gapScale;
  const scaledGapDifficultyToScores = GAP_DIFFICULTY_TO_SCORES * gapScale;

  let y = topPadding;

  // Title group positions
  const titleY = y + TITLE_HEIGHT / 2;
  y += TITLE_HEIGHT + TITLE_INTERNAL_GAP;
  const versionY = y + VERSION_HEIGHT / 2;
  y += VERSION_HEIGHT + TITLE_INTERNAL_GAP;
  const subtitleY = y + SUBTITLE_HEIGHT / 2;
  y += SUBTITLE_HEIGHT;

  // Gap (scaled if needed)
  y += scaledGapTitleToLearn;

  // Learn button
  const learnBtnY = y + LEARN_BTN_HEIGHT / 2;
  y += LEARN_BTN_HEIGHT;

  // Gap (scaled if needed)
  y += scaledGapLearnToDifficulty;

  // Difficulty group
  const headerY = y + HEADER_TEXT_HEIGHT / 2;
  y += HEADER_TEXT_HEIGHT + HEADER_TO_BUTTON_GAP;
  const buttonStartY = y + BUTTON_HEIGHT / 2;
  const buttonSpacing = BUTTON_HEIGHT + BUTTON_GAP;
  y += (BUTTON_HEIGHT * 3) + (BUTTON_GAP * 2);

  // Gap (scaled if needed)
  y += scaledGapDifficultyToScores;

  // High scores
  const highScoresY = y;

  // ==========================================================================
  // RETURN SIZING
  // ==========================================================================
  return {
    titleY,
    versionY,
    subtitleY,
    learnBtnY,
    headerY,
    buttonStartY,
    buttonSpacing,
    modeInfoY: 0, // Unused
    highScoresY,

    // Fixed font sizes (no scaling needed with fixed layout)
    titleFontSize: '32px',
    versionFontSize: '11px',
    subtitleFontSize: '14px',
    headerFontSize: '16px',
    bodyFontSize: '14px',
    smallFontSize: '12px',
    tinyFontSize: '11px',

    // Button dimensions
    buttonWidth: Math.min(width * 0.70, 272),
    buttonHeight: BUTTON_HEIGHT,
    smallButtonWidth: Math.min(width * 0.38, 145),
    smallButtonHeight: LEARN_BTN_HEIGHT,

    // Panel dimensions
    panelWidth: Math.min(width * 0.85, 340),
    highScoresPanelWidth: Math.min(width * 0.56, 200),
    highScoresPanelHeight: HIGH_SCORES_HEIGHT,

    // Spacing
    padding: 12,
    smallPadding: 6,
  };
}

// =============================================================================
// PORTRAIT LAYOUT (Mobile-First)
// =============================================================================

/**
 * Calculate portrait layout using Phaser's scale.gameSize
 * Uses actual dice sizes to calculate zone heights accurately.
 *
 * Layout zones (top to bottom):
 * - Safe area top padding
 * - Header panel
 * - Gap
 * - Dice zone (tip text + dice + lock icons + gap + controls)
 * - Gap
 * - Scorecard (remaining space)
 * - Bottom padding + safe area
 *
 * Reference: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scalemanager/
 */
export function getPortraitLayout(scene: Phaser.Scene): PortraitLayout {
  // Use Phaser's scale API for actual visible dimensions
  const { width, height } = scene.scale.gameSize;
  const safeArea = getSafeAreaInsets();

  // Usable height after safe areas
  const usableHeight = height - safeArea.top - safeArea.bottom;

  // Ultra-compact mode for very short screens (iPhone SE with browser chrome ~550px)
  const isUltraCompact = usableHeight < 580;

  // === HEADER ===
  const headerHeight = isUltraCompact ? 40 : 48;
  const headerGap = isUltraCompact ? 5 : 8;

  // === DICE SIZING (match getScaledSizes logic) ===
  const scale = Math.max(0.85, Math.min(1.15, width / REFERENCE_WIDTH));
  const diceSize = scaleValue(RESPONSIVE.DICE_SIZE_MAX, scale, RESPONSIVE.DICE_SIZE_MIN, RESPONSIVE.DICE_SIZE_MAX);
  const diceRadius = diceSize / 2;

  // Tip text above dice (matches dice-manager.ts)
  const tipGap = 4;
  const tipHeight = 14; // Approximate text height

  // Lock icons below dice (matches dice-renderer.ts)
  const iconScale = diceSize / 70;
  const iconGap = Math.round(12 * iconScale);
  const iconHeight = Math.round(10 * iconScale);

  // Controls panel height (matches dice-controls.ts)
  const controlsPanelHeight = isUltraCompact ? 50 : 60;

  // Gap between icons and controls
  const diceToControlsGap = isUltraCompact ? 4 : 8;

  // === CALCULATE POSITIONS ===
  const headerY = safeArea.top + headerHeight / 2 + 5;
  const headerEndY = safeArea.top + headerHeight + 5;

  // Dice zone starts after header with gap
  const diceZoneStartY = headerEndY + headerGap;

  // diceY is the CENTER of the dice, positioned so tip text has room above
  const diceY = diceZoneStartY + tipHeight + tipGap + diceRadius;

  // Controls positioned below dice (center Y)
  const controlsY = diceY + diceRadius + iconGap + iconHeight + diceToControlsGap + controlsPanelHeight / 2;

  // Scorecard starts after controls
  const scorecardGap = isUltraCompact ? 8 : 12;
  const scorecardStartY = controlsY + controlsPanelHeight / 2 + scorecardGap;

  // Bottom padding (for quit buttons, etc.)
  const bottomPadding = isUltraCompact ? 35 : 45;

  // Scorecard gets remaining space
  const scorecardHeight = Math.max(
    200, // minimum usable height
    height - safeArea.bottom - bottomPadding - scorecardStartY
  );

  return {
    headerHeight,
    headerY,
    diceY,
    controlsY,
    scorecardY: scorecardStartY,
    scorecardHeight,
    isUltraCompact,
  };
}

// =============================================================================
// GAMEPLAY LAYOUT - Single Source of Truth
// =============================================================================

/**
 * Calculate complete gameplay layout.
 * This is THE single source of truth for all layout values.
 * Components should ONLY use values from this - no local calculations.
 *
 * @param scene - Phaser scene for viewport access
 * @returns Complete layout configuration
 */
export function getGameplayLayout(scene: Phaser.Scene): GameplayLayout {
  const { width, height } = scene.scale.gameSize;
  const safeArea = getSafeAreaInsets();
  const centerX = width / 2;

  // Usable height after safe areas
  const usableHeight = height - safeArea.top - safeArea.bottom;

  // Ultra-compact mode for very short screens
  const isUltraCompact = usableHeight < LAYOUT.ULTRA_COMPACT_THRESHOLD;
  const isMobile = true; // Always mobile-first

  // Scale factor for sizing (clamped to 0.85-1.15)
  const scale = Math.max(0.85, Math.min(1.15, width / REFERENCE_WIDTH));

  // ==========================================================================
  // DICE SIZING
  // ==========================================================================
  const diceSize = scaleValue(RESPONSIVE.DICE_SIZE_MAX, scale, RESPONSIVE.DICE_SIZE_MIN, RESPONSIVE.DICE_SIZE_MAX);
  const diceSpacing = scaleValue(RESPONSIVE.DICE_SPACING_MAX, scale, RESPONSIVE.DICE_SPACING_MIN, RESPONSIVE.DICE_SPACING_MAX);
  const diceRadius = diceSize / 2;
  const diceVisualScale = diceSize / LAYOUT.dice.REFERENCE_SIZE;

  // Pip sizing proportional to dice
  const pipRadius = Math.round(diceSize * LAYOUT.dice.PIP_RADIUS_RATIO);
  const pipOffset = Math.round(diceSize * LAYOUT.dice.PIP_OFFSET_RATIO);

  // ==========================================================================
  // ICON SIZING (lock/cursed indicators below dice)
  // ==========================================================================
  const iconScale = diceVisualScale;
  const iconGap = Math.round(LAYOUT.icons.GAP_BASE * iconScale);
  const iconHeight = Math.round(LAYOUT.icons.HEIGHT_BASE * iconScale);

  // ==========================================================================
  // HEADER
  // ==========================================================================
  const headerHeight = isUltraCompact ? LAYOUT.header.HEIGHT_COMPACT : LAYOUT.header.HEIGHT;
  const headerWidth = Math.min(RESPONSIVE.HEADER_WIDTH_MAX, width - LAYOUT.header.MARGIN);
  const headerGap = isUltraCompact ? LAYOUT.header.GAP_COMPACT : LAYOUT.header.GAP;
  const headerY = safeArea.top + headerHeight / 2 + LAYOUT.header.TOP_PADDING;
  const headerEndY = safeArea.top + headerHeight + LAYOUT.header.TOP_PADDING;

  // ==========================================================================
  // TIP TEXT (above dice)
  // ==========================================================================
  const tipGap = LAYOUT.tip.GAP;
  const tipHeight = LAYOUT.tip.HEIGHT;
  const tipFontSize = isMobile ? FONTS.SIZE_MICRO : FONTS.SIZE_SMALL;

  // ==========================================================================
  // DICE ZONE POSITIONING
  // ==========================================================================
  const diceZoneStartY = headerEndY + headerGap;
  const diceCenterY = diceZoneStartY + tipHeight + tipGap + diceRadius;
  const tipY = diceCenterY - diceRadius - tipGap;
  const iconY = diceCenterY + diceRadius + iconGap;

  // ==========================================================================
  // CONTROLS PANEL
  // ==========================================================================
  const controlsHeight = isUltraCompact ? LAYOUT.controls.HEIGHT_COMPACT : LAYOUT.controls.HEIGHT;
  const diceToControlsGap = isUltraCompact ? LAYOUT.controls.GAP_COMPACT : LAYOUT.controls.GAP;
  const controlsCenterY = diceCenterY + diceRadius + iconGap + iconHeight + diceToControlsGap + controlsHeight / 2;

  // Controls sizing
  const controlsColWidth = isUltraCompact || isMobile ? LAYOUT.controls.COL_WIDTH_MOBILE : LAYOUT.controls.COL_WIDTH;
  const controlsButtonHeight = isUltraCompact ? LAYOUT.controls.BUTTON_HEIGHT_COMPACT : (isMobile ? LAYOUT.controls.BUTTON_HEIGHT_MOBILE : LAYOUT.controls.BUTTON_HEIGHT);
  const controlsButtonWidth = isMobile ? LAYOUT.controls.BUTTON_WIDTH_MOBILE : LAYOUT.controls.BUTTON_WIDTH;
  const controlsDividerPadding = isUltraCompact ? LAYOUT.controls.DIVIDER_PADDING_COMPACT : (isMobile ? LAYOUT.controls.DIVIDER_PADDING_MOBILE : LAYOUT.controls.DIVIDER_PADDING);
  const controlsFontSize = isMobile ? FONTS.SIZE_LABEL : FONTS.SIZE_BODY;
  const controlsGlowPaddingX = isUltraCompact ? LAYOUT.controls.GLOW_PADDING_X_COMPACT : LAYOUT.controls.GLOW_PADDING_X;
  const controlsGlowPaddingY = isUltraCompact ? LAYOUT.controls.GLOW_PADDING_Y_COMPACT : LAYOUT.controls.GLOW_PADDING_Y;
  const controlsLabelValueGap = isMobile ? LAYOUT.controls.LABEL_VALUE_GAP_MOBILE : LAYOUT.controls.LABEL_VALUE_GAP;
  const controlsCompactMeetOffset = isUltraCompact ? LAYOUT.controls.COMPACT_MEET_OFFSET_COMPACT : LAYOUT.controls.COMPACT_MEET_OFFSET;
  const controlsUseCompactLayout = isUltraCompact || isMobile;

  // ==========================================================================
  // SCORECARD
  // ==========================================================================
  const scorecardGap = isUltraCompact ? LAYOUT.scorecard.GAP_COMPACT : LAYOUT.scorecard.GAP;
  const scorecardY = controlsCenterY + controlsHeight / 2 + scorecardGap;
  const scorecardWidth = Math.min(RESPONSIVE.SCORECARD_WIDTH_TWO_COL, width - LAYOUT.header.MARGIN);
  const scorecardX = (width - scorecardWidth) / 2;
  const bottomPadding = isUltraCompact ? LAYOUT.scorecard.BOTTOM_PADDING_COMPACT : LAYOUT.scorecard.BOTTOM_PADDING;
  const scorecardHeight = Math.max(LAYOUT.scorecard.MIN_HEIGHT, height - safeArea.bottom - bottomPadding - scorecardY);

  // ==========================================================================
  // RETURN COMPLETE LAYOUT
  // ==========================================================================
  return {
    viewport: {
      width,
      height,
      centerX,
      scale,
      isUltraCompact,
      isMobile,
      safeArea,
    },
    header: {
      y: headerY,
      height: headerHeight,
      width: headerWidth,
    },
    dice: {
      centerX,
      centerY: diceCenterY,
      size: diceSize,
      spacing: diceSpacing,
      pipRadius,
      pipOffset,
      visualScale: diceVisualScale,
    },
    tip: {
      y: tipY,
      fontSize: tipFontSize,
    },
    icons: {
      y: iconY,
      scale: iconScale,
      gap: iconGap,
      height: iconHeight,
    },
    controls: {
      centerX,
      centerY: controlsCenterY,
      height: controlsHeight,
      colWidth: controlsColWidth,
      buttonHeight: controlsButtonHeight,
      buttonWidth: controlsButtonWidth,
      dividerPadding: controlsDividerPadding,
      fontSize: controlsFontSize,
      glowPaddingX: controlsGlowPaddingX,
      glowPaddingY: controlsGlowPaddingY,
      labelValueGap: controlsLabelValueGap,
      compactMeetOffset: controlsCompactMeetOffset,
      useCompactLayout: controlsUseCompactLayout,
    },
    scorecard: {
      x: scorecardX,
      y: scorecardY,
      width: scorecardWidth,
      height: scorecardHeight,
    },
  };
}
