/**
 * Scorecard Layout Calculator
 * Pure functions for calculating two-column mobile layout
 * All values are computed based on viewport and scorecard state
 */

import type { Category } from '@/systems/scorecard';
import type { LayoutConfig, RowLayout } from './layout-config';
import { LAYOUT, FONTS } from '@/config';

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
 * Calculate complete layout configuration (two-column only)
 */
export function calculateLayout(input: LayoutInput): LayoutConfig {
  const needsCompactLayout = input.hasSpecialSection;
  return calculateTwoColumnLayout(input, needsCompactLayout);
}

/**
 * Calculate two-column (mobile/portrait) layout
 * Uses LAYOUT.scorecard as source of truth
 */
function calculateTwoColumnLayout(input: LayoutInput, needsCompact: boolean): LayoutConfig {
  const L = LAYOUT.scorecard;
  const width = L.WIDTH;

  // Select sizing based on compact mode
  const contentPadding = needsCompact ? L.CONTENT_PADDING_COMPACT : L.CONTENT_PADDING;
  const titleHeight = needsCompact ? L.TITLE_HEIGHT_COMPACT : L.TITLE_HEIGHT;
  const titleGap = needsCompact ? L.TITLE_GAP_COMPACT : L.TITLE_GAP;
  const headerHeight = needsCompact ? L.HEADER_HEIGHT_COMPACT : L.HEADER_HEIGHT;
  const totalRowHeight = needsCompact ? L.TOTAL_ROW_HEIGHT_COMPACT : L.TOTAL_ROW_HEIGHT;
  const dividerHeight = needsCompact ? L.DIVIDER_HEIGHT_COMPACT : L.DIVIDER_HEIGHT;
  // Use internal padding for inside the panel (smaller than external BOTTOM_PADDING)
  const bottomPadding = needsCompact ? L.INTERNAL_BOTTOM_PADDING_COMPACT : L.INTERNAL_BOTTOM_PADDING;
  const columnWidth = (width - contentPadding * 2 - L.COLUMN_GAP) / 2;

  // Calculate row height dynamically if maxHeight is provided
  let rowHeight: number = L.ROW_HEIGHT;
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
    rowHeight = Math.max(L.ROW_HEIGHT_MIN, Math.min(L.ROW_HEIGHT, idealRowHeight));
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
  const rightColumnX = contentPadding + columnWidth + L.COLUMN_GAP;

  // Build rows
  const rows: RowLayout[] = [];
  let leftY = contentPadding + titleHeight + titleGap;
  let rightY = leftY;

  // Numbers section header (formerly "upper")
  rows.push({
    x: leftColumnX, y: leftY, width: columnWidth, height: headerHeight,
    section: 'header', label: 'NUMBERS',
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

  // Combos section header (formerly "lower")
  rows.push({
    x: rightColumnX, y: rightY, width: columnWidth, height: headerHeight,
    section: 'header', label: 'COMBOS',
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
    const gridColWidth = (fullWidth - L.COLUMN_GAP) / 2;

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
    const gridRightX = contentPadding + gridColWidth + L.COLUMN_GAP;

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
    fontSize: FONTS.SIZE_LABEL,
    smallFontSize: FONTS.SIZE_SMALL,
    scoreFontSize: FONTS.SIZE_BUTTON,
    titleFontSize: needsCompact ? FONTS.SIZE_TINY : FONTS.SIZE_SMALL,
    columnGap: L.COLUMN_GAP,
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
      namePaddingLeft: L.NAME_PADDING_LEFT,
      labelPaddingLeft: L.LABEL_PADDING_LEFT,
      scoreOriginX: 1,
      useShortNames: true,
      showTotalDivider: false,
      potentialOffsetFromRight: L.POTENTIAL_OFFSET_FROM_RIGHT,
      scoreOffsetFromRight: L.SCORE_OFFSET_FROM_RIGHT,
    },
  };
}
