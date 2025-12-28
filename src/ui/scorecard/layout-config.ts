/**
 * Scorecard Layout Configuration
 * Pure data structures defining layout values - no Phaser dependency
 */

import type { CategoryId } from '@/data/categories';

// =============================================================================
// LAYOUT TYPES
// =============================================================================

export type ScorecardLayoutMode = 'two-column';

export interface RowLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  categoryId?: CategoryId;
  section: 'upper' | 'lower' | 'special' | 'bonus' | 'total' | 'header';
  isEven?: boolean;
  label?: string;
}

export interface LayoutConfig {
  mode: ScorecardLayoutMode;

  // Overall dimensions
  width: number;
  height: number;

  // Spacing values
  contentPadding: number;
  titleHeight: number;
  titleGap: number;
  headerHeight: number;
  rowHeight: number;
  totalRowHeight: number;
  dividerHeight: number;
  bottomPadding: number;

  // Font sizes
  fontSize: string;
  smallFontSize: string;
  scoreFontSize: string;
  titleFontSize: string;

  // Column layout (for two-column mode)
  columnGap: number;
  columnWidth: number;
  leftColumnX: number;
  rightColumnX: number;

  // Row layouts - computed positions for each element
  titleY: number;
  upperHeaderY: number;
  lowerHeaderY: number;
  specialHeaderY?: number;
  totalY: number;

  // Content bounds for rows
  contentX: number;
  contentWidth: number;

  // Rows
  rows: RowLayout[];

  // Whether special section is enabled
  hasSpecialSection: boolean;

  // Whether this needs compact layout (17 categories in two-column)
  needsCompactLayout: boolean;

  // ==========================================================================
  // ROW STYLING (mode-specific values that eliminate isTwoCol conditionals)
  // ==========================================================================

  rowStyle: RowStyleConfig;
}

/**
 * Styling values for rows
 */
export interface RowStyleConfig {
  // Text padding from row edge
  namePaddingLeft: number;
  labelPaddingLeft: number;

  // Score/value text origin X (0 = left, 0.5 = center, 1 = right)
  scoreOriginX: number;

  // Whether to use short category names
  useShortNames: boolean;

  // Whether to show divider line above total row
  showTotalDivider: boolean;

  // Offset for potential text from row right edge
  potentialOffsetFromRight: number;

  // Offset for score text from row right edge
  scoreOffsetFromRight: number;
}

// =============================================================================
// ROW DISPLAY STATE
// =============================================================================

export interface RowDisplayState {
  categoryId: CategoryId;
  score: number | null;
  potential: number;
  isLocked: boolean;
  isAvailable: boolean;
  isGauntletHighlight: boolean;
}

export interface BonusDisplayState {
  upperSubtotal: number;
  bonusEarned: number;
  allUppersFilled: boolean;
}

export interface TotalDisplayState {
  total: number;
  passThreshold: number;
  filledCount: number;
  totalCount: number;
}

// =============================================================================
// COLORS
// =============================================================================

export interface RowColors {
  upperRowEven: number;
  upperRowOdd: number;
  lowerRowEven: number;
  lowerRowOdd: number;
  specialRowEven: number;
  specialRowOdd: number;
  rowHover: number;
  rowFilled: number;
  lockedBg: number;
  lockedBorder: number;
}
