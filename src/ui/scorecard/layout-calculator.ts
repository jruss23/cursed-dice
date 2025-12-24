/**
 * Scorecard Layout Calculator
 * Pure functions for calculating layout - no Phaser dependency
 * All values are computed based on viewport and scorecard state
 */

import type { Category } from '@/systems/scorecard';
import type { LayoutConfig, RowLayout, ScorecardLayoutMode } from './layout-config';

// =============================================================================
// CONSTANTS (copied from config to avoid Phaser dependency)
// =============================================================================

const RESPONSIVE: {
  SCORECARD_WIDTH_TWO_COL: number;
  ROW_HEIGHT_MOBILE: number;
  COMPACT_TITLE_HEIGHT: number;
  COMPACT_HEADER_HEIGHT: number;
  COMPACT_TOTAL_HEIGHT: number;
  COMPACT_CONTENT_PADDING: number;
  COMPACT_DIVIDER_HEIGHT: number;
  COMPACT_BOTTOM_PADDING: number;
  COMPACT_TITLE_GAP: number;
} = {
  SCORECARD_WIDTH_TWO_COL: 340,
  ROW_HEIGHT_MOBILE: 36,
  COMPACT_TITLE_HEIGHT: 20,
  COMPACT_HEADER_HEIGHT: 18,
  COMPACT_TOTAL_HEIGHT: 28,
  COMPACT_CONTENT_PADDING: 4,
  COMPACT_DIVIDER_HEIGHT: 3,
  COMPACT_BOTTOM_PADDING: 4,
  COMPACT_TITLE_GAP: 0,
};

const SIZES: { SCORECARD_WIDTH: number } = {
  SCORECARD_WIDTH: 324,
};

// =============================================================================
// LAYOUT INPUT
// =============================================================================

export interface LayoutInput {
  viewportWidth: number;
  viewportHeight: number;
  isCompact: boolean;
  hasSpecialSection: boolean;
  maxHeight?: number;
  upperCategories: Category[];
  lowerCategories: Category[];
  specialCategories: Category[];
}

// =============================================================================
// LAYOUT CALCULATOR
// =============================================================================

/**
 * Determine layout mode based on viewport width
 */
export function determineLayoutMode(viewportWidth: number): ScorecardLayoutMode {
  return viewportWidth < 900 ? 'two-column' : 'single-column';
}

/**
 * Calculate complete layout configuration
 */
export function calculateLayout(input: LayoutInput): LayoutConfig {
  const mode = determineLayoutMode(input.viewportWidth);
  const needsCompactLayout = mode === 'two-column' && input.hasSpecialSection;

  if (mode === 'two-column') {
    return calculateTwoColumnLayout(input, needsCompactLayout);
  }
  return calculateSingleColumnLayout(input);
}

/**
 * Calculate two-column (mobile/portrait) layout
 */
function calculateTwoColumnLayout(input: LayoutInput, needsCompact: boolean): LayoutConfig {
  const width = RESPONSIVE.SCORECARD_WIDTH_TWO_COL;
  const contentPadding = needsCompact ? RESPONSIVE.COMPACT_CONTENT_PADDING : 6;
  const titleHeight = needsCompact ? RESPONSIVE.COMPACT_TITLE_HEIGHT : 28;
  const titleGap = needsCompact ? RESPONSIVE.COMPACT_TITLE_GAP : 2;
  const headerHeight = needsCompact ? RESPONSIVE.COMPACT_HEADER_HEIGHT : 24;
  const totalRowHeight = needsCompact ? RESPONSIVE.COMPACT_TOTAL_HEIGHT : RESPONSIVE.ROW_HEIGHT_MOBILE;
  const dividerHeight = needsCompact ? RESPONSIVE.COMPACT_DIVIDER_HEIGHT : 6;
  const bottomPadding = needsCompact ? RESPONSIVE.COMPACT_BOTTOM_PADDING : 8;
  const columnGap = 6;
  const columnWidth = (width - contentPadding * 2 - columnGap) / 2;

  // Calculate row height dynamically if maxHeight is provided
  let rowHeight = RESPONSIVE.ROW_HEIGHT_MOBILE;
  if (input.maxHeight) {
    const fixedHeight = contentPadding + titleHeight + titleGap + headerHeight + totalRowHeight + bottomPadding;
    let extraHeight = 0;
    let numRows = 7; // Max of upper(6)+bonus or lower(7)

    if (input.hasSpecialSection) {
      extraHeight = dividerHeight + headerHeight;
      numRows += 2; // 2 rows for 2x2 grid
    }

    const availableForRows = input.maxHeight - fixedHeight - extraHeight;
    const idealRowHeight = Math.floor(availableForRows / numRows);
    rowHeight = Math.max(28, Math.min(RESPONSIVE.ROW_HEIGHT_MOBILE, idealRowHeight));
  }

  // Calculate height
  let height = contentPadding + titleHeight + titleGap;
  height += headerHeight;
  height += 7 * rowHeight;
  height += totalRowHeight;
  height += bottomPadding;

  if (input.hasSpecialSection) {
    height += dividerHeight + headerHeight + 2 * rowHeight;
  }

  const leftColumnX = contentPadding;
  const rightColumnX = contentPadding + columnWidth + columnGap;

  // Build rows
  const rows: RowLayout[] = [];
  let leftY = contentPadding + titleHeight + titleGap;
  let rightY = leftY;

  // Upper section header
  rows.push({
    x: leftColumnX, y: leftY, width: columnWidth, height: headerHeight,
    section: 'header', label: 'UPPER',
  });
  leftY += headerHeight;

  // Upper categories
  input.upperCategories.forEach((cat, i) => {
    rows.push({
      x: leftColumnX, y: leftY, width: columnWidth, height: rowHeight,
      categoryId: cat.id, section: 'upper', isEven: i % 2 === 0,
    });
    leftY += rowHeight;
  });

  // Bonus row
  rows.push({
    x: leftColumnX, y: leftY, width: columnWidth, height: rowHeight,
    section: 'bonus',
  });
  leftY += rowHeight;

  // Lower section header
  rows.push({
    x: rightColumnX, y: rightY, width: columnWidth, height: headerHeight,
    section: 'header', label: 'LOWER',
  });
  rightY += headerHeight;

  // Lower categories
  input.lowerCategories.forEach((cat, i) => {
    rows.push({
      x: rightColumnX, y: rightY, width: columnWidth, height: rowHeight,
      categoryId: cat.id, section: 'lower', isEven: i % 2 === 0,
    });
    rightY += rowHeight;
  });

  let bottomY = Math.max(leftY, rightY);

  // Special section (2x2 grid)
  if (input.hasSpecialSection) {
    const fullWidth = width - contentPadding * 2;
    const gridColWidth = (fullWidth - columnGap) / 2;

    bottomY += dividerHeight / 2;
    // Divider row is implicit
    bottomY += dividerHeight / 2;

    // Expansion header
    rows.push({
      x: contentPadding, y: bottomY, width: fullWidth, height: headerHeight,
      section: 'header', label: 'EXPANSION',
    });
    bottomY += headerHeight;

    // 2x2 grid
    const gridLeftX = contentPadding;
    const gridRightX = contentPadding + gridColWidth + columnGap;

    if (input.specialCategories[0]) {
      rows.push({
        x: gridLeftX, y: bottomY, width: gridColWidth, height: rowHeight,
        categoryId: input.specialCategories[0].id, section: 'special', isEven: true,
      });
    }
    if (input.specialCategories[1]) {
      rows.push({
        x: gridRightX, y: bottomY, width: gridColWidth, height: rowHeight,
        categoryId: input.specialCategories[1].id, section: 'special', isEven: true,
      });
    }
    bottomY += rowHeight;

    if (input.specialCategories[2]) {
      rows.push({
        x: gridLeftX, y: bottomY, width: gridColWidth, height: rowHeight,
        categoryId: input.specialCategories[2].id, section: 'special', isEven: false,
      });
    }
    if (input.specialCategories[3]) {
      rows.push({
        x: gridRightX, y: bottomY, width: gridColWidth, height: rowHeight,
        categoryId: input.specialCategories[3].id, section: 'special', isEven: false,
      });
    }
    bottomY += rowHeight;
  }

  // Total row
  rows.push({
    x: contentPadding, y: bottomY, width: width - contentPadding * 2, height: totalRowHeight,
    section: 'total',
  });

  return {
    mode: 'two-column',
    width,
    height,
    contentPadding,
    titleHeight,
    titleGap,
    headerHeight,
    rowHeight,
    totalRowHeight,
    dividerHeight,
    bottomPadding,
    fontSize: '15px',
    smallFontSize: '13px',
    scoreFontSize: '16px',
    titleFontSize: needsCompact ? '12px' : '14px',
    columnGap,
    columnWidth,
    leftColumnX,
    rightColumnX,
    titleY: contentPadding + titleHeight / 2,
    upperHeaderY: contentPadding + titleHeight + titleGap,
    lowerHeaderY: contentPadding + titleHeight + titleGap,
    specialHeaderY: input.hasSpecialSection ? bottomY - 2 * rowHeight - headerHeight : undefined,
    totalY: bottomY,
    contentX: contentPadding,
    contentWidth: width - contentPadding * 2,
    rows,
    hasSpecialSection: input.hasSpecialSection,
    needsCompactLayout: needsCompact,
    rowStyle: {
      namePaddingLeft: 8,
      labelPaddingLeft: 6,
      scoreOriginX: 1,
      useShortNames: true,
      showTotalDivider: false,
      potentialOffsetFromRight: 45,
      scoreOffsetFromRight: 12,
    },
  };
}

/**
 * Calculate single-column (desktop) layout
 */
function calculateSingleColumnLayout(input: LayoutInput): LayoutConfig {
  const isCompact = input.isCompact;
  const width = isCompact ? 300 : SIZES.SCORECARD_WIDTH;
  const contentPadding = 6;
  const titleHeight = isCompact ? 24 : 28;
  const titleGap = 2;
  const headerHeight = isCompact ? 18 : 20;
  const rowHeight = isCompact ? 22 : 24;
  const totalRowHeight = isCompact ? 22 : 24;
  const dividerHeight = 6;
  const bottomPadding = 8;

  // Calculate height
  let height = contentPadding + titleHeight + titleGap;
  height += headerHeight;
  height += 6 * rowHeight; // Upper categories
  height += rowHeight; // Bonus
  height += dividerHeight;
  height += headerHeight;
  height += 7 * rowHeight; // Lower categories
  height += 1; // Divider line
  height += totalRowHeight;
  height += bottomPadding;

  if (input.hasSpecialSection) {
    height += dividerHeight + headerHeight + 4 * rowHeight;
  }

  const contentX = contentPadding;
  const contentWidth = width - contentPadding * 2;

  // Build rows
  const rows: RowLayout[] = [];
  let y = contentPadding + titleHeight + titleGap;

  // Upper header
  rows.push({
    x: contentX, y, width: contentWidth, height: headerHeight,
    section: 'header', label: 'UPPER SECTION',
  });
  y += headerHeight;

  // Upper categories
  input.upperCategories.forEach((cat, i) => {
    rows.push({
      x: contentX, y, width: contentWidth, height: rowHeight,
      categoryId: cat.id, section: 'upper', isEven: i % 2 === 0,
    });
    y += rowHeight;
  });

  // Bonus row
  rows.push({
    x: contentX, y, width: contentWidth, height: rowHeight,
    section: 'bonus',
  });
  y += rowHeight;

  // Divider
  y += dividerHeight;

  // Lower header
  rows.push({
    x: contentX, y, width: contentWidth, height: headerHeight,
    section: 'header', label: 'LOWER SECTION',
  });
  y += headerHeight;

  // Lower categories
  input.lowerCategories.forEach((cat, i) => {
    rows.push({
      x: contentX, y, width: contentWidth, height: rowHeight,
      categoryId: cat.id, section: 'lower', isEven: i % 2 === 0,
    });
    y += rowHeight;
  });

  // Special section
  if (input.hasSpecialSection) {
    y += dividerHeight;

    rows.push({
      x: contentX, y, width: contentWidth, height: headerHeight,
      section: 'header', label: 'EXPANSION',
    });
    y += headerHeight;

    input.specialCategories.forEach((cat, i) => {
      rows.push({
        x: contentX, y, width: contentWidth, height: rowHeight,
        categoryId: cat.id, section: 'special', isEven: i % 2 === 0,
      });
      y += rowHeight;
    });
  }

  // Total row (after 1px divider line)
  y += 1;
  rows.push({
    x: contentX, y, width: contentWidth, height: totalRowHeight,
    section: 'total',
  });

  return {
    mode: 'single-column',
    width,
    height,
    contentPadding,
    titleHeight,
    titleGap,
    headerHeight,
    rowHeight,
    totalRowHeight,
    dividerHeight,
    bottomPadding,
    fontSize: isCompact ? '11px' : '12px',
    smallFontSize: isCompact ? '9px' : '10px',
    scoreFontSize: isCompact ? '12px' : '14px',
    titleFontSize: isCompact ? '14px' : '16px',
    columnGap: 0,
    columnWidth: contentWidth,
    leftColumnX: contentX,
    rightColumnX: contentX,
    titleY: contentPadding + titleHeight / 2,
    upperHeaderY: contentPadding + titleHeight + titleGap,
    lowerHeaderY: 0, // Calculated dynamically in single-column
    totalY: y - totalRowHeight,
    contentX,
    contentWidth,
    rows,
    hasSpecialSection: input.hasSpecialSection,
    needsCompactLayout: false,
    rowStyle: {
      namePaddingLeft: 14,
      labelPaddingLeft: 14,
      scoreOriginX: 0.5,
      useShortNames: false,
      showTotalDivider: true,
      potentialOffsetFromRight: 85,
      scoreOffsetFromRight: 32,
    },
  };
}

