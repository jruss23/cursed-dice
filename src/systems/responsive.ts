/**
 * Responsive Layout System
 *
 * Centralized utilities for viewport-aware sizing and layout decisions.
 * All components should use these utilities instead of hardcoded values.
 */

import Phaser from 'phaser';

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
  /** Scale factor relative to 1200px base (0.3 - 1.0) */
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

export type ScorecardLayout = 'single-column' | 'two-column';

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

/** Base canvas width for scale calculations */
const BASE_WIDTH = 1200;

/** Responsive breakpoints */
export const BREAKPOINTS = {
  SMALL_MOBILE: 400,
  MOBILE: 600,
  TABLET: 900,
} as const;

/** Responsive sizing constraints */
export const RESPONSIVE = {
  // Touch targets
  TOUCH_TARGET_MIN: 44,

  // Dice
  DICE_SIZE_MIN: 50,
  DICE_SIZE_MAX: 70,
  DICE_SPACING_MIN: 60,
  DICE_SPACING_MAX: 85,

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
 * Camera dimensions are in logical pixels (Phaser handles DPR via resolution config)
 */
export function getViewportMetrics(scene: Phaser.Scene): ViewportMetrics {
  const { width, height } = scene.cameras.main;

  const aspectRatio = width / height;
  const isPortrait = height > width * 0.9;
  const isMobile = width < BREAKPOINTS.MOBILE;
  const isSmallMobile = width < BREAKPOINTS.SMALL_MOBILE;
  const isShortScreen = height < 700; // iPhone X Safari ~640px
  const scale = Math.max(0.3, Math.min(1.0, width / BASE_WIDTH));
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
 */
export function getScorecardLayout(metrics: ViewportMetrics): ScorecardLayout {
  // Use 2-column on mobile portrait
  if (metrics.isMobile && metrics.isPortrait) {
    return 'two-column';
  }
  return 'single-column';
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
// PORTRAIT LAYOUT (Mobile-First)
// =============================================================================

/**
 * Calculate portrait layout using Phaser's scale.gameSize
 * Uses percentage-based positioning with min/max constraints
 *
 * Layout zones (top to bottom):
 * - Safe area top padding
 * - Header panel (12% of usable height, min 55px, max 75px)
 * - Dice zone (dice + controls, ~28% of usable height)
 * - Scorecard (remaining space)
 * - Bottom padding + safe area
 *
 * Reference: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scalemanager/
 */
export function getPortraitLayout(scene: Phaser.Scene): PortraitLayout {
  // Use Phaser's scale API for actual visible dimensions
  const { height } = scene.scale.gameSize;
  const safeArea = getSafeAreaInsets();

  // Usable height after safe areas
  const usableHeight = height - safeArea.top - safeArea.bottom;

  // Ultra-compact mode for very short screens (iPhone SE with browser chrome ~550px)
  const isUltraCompact = usableHeight < 580;

  // Header zone: compact 3-column layout (curse | timer | total)
  // Ultra-compact: 40px, normal mobile: 48px
  const headerHeight = isUltraCompact ? 40 : Math.min(50, Math.max(44, usableHeight * 0.08));

  // Dice zone sizing
  const diceVisualHeight = isUltraCompact ? 70 : 80; // dice + lock icons
  const controlsHeight = isUltraCompact ? 50 : 60;   // controls panel
  const diceZoneGap = isUltraCompact ? 8 : 12;       // gap between dice and controls
  const diceZoneTotal = diceVisualHeight + controlsHeight + diceZoneGap;

  // Bottom padding (for quit buttons, etc.)
  const bottomPadding = isUltraCompact ? 35 : 45;

  // Calculate positions from top down
  const headerY = safeArea.top + headerHeight / 2 + 5;
  const headerEndY = safeArea.top + headerHeight + 10;

  // Dice area starts after header
  const diceZoneStartY = headerEndY + (isUltraCompact ? 5 : 10);
  const diceY = diceZoneStartY + diceVisualHeight / 2;
  const controlsY = diceZoneStartY + diceVisualHeight + diceZoneGap + controlsHeight / 2;

  // Scorecard starts after dice zone
  const scorecardStartY = diceZoneStartY + diceZoneTotal + (isUltraCompact ? 8 : 15);

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
