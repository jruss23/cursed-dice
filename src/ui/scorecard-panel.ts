/**
 * Scorecard UI Panel
 * Displays the dice scorecard and handles category selection
 */

import Phaser from 'phaser';
import { type Scorecard, type CategoryId, type Category } from '@/systems/scorecard';
import { GameEventEmitter } from '@/systems/game-events';
import { FONTS, SIZES, GAME_RULES, PALETTE, COLORS, type ScorecardLayout, RESPONSIVE } from '@/config';
import { createText } from '@/ui/ui-utils';

export interface ScorecardPanelConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  compact?: boolean; // Smaller row heights for portrait/mobile layout
  // Note: layout is auto-determined based on viewport size, not passed in
}

interface CategoryRow {
  id: CategoryId;
  nameText: Phaser.GameObjects.Text;
  scoreText: Phaser.GameObjects.Text;
  potentialText: Phaser.GameObjects.Text;
  lockIcon: Phaser.GameObjects.Graphics;
  background: Phaser.GameObjects.Rectangle;
  hitArea: Phaser.GameObjects.Rectangle;
  rowColor: number;
}

// Panel styling using the unified PALETTE color system
const PANEL_COLORS = {
  background: PALETTE.purple[900],
  // Upper section
  upperRowEven: PALETTE.purple[800],
  upperRowOdd: PALETTE.purple[900],
  upperHeader: PALETTE.purple[700],
  upperBorder: PALETTE.purple[500],
  // Lower section
  lowerRowEven: PALETTE.purple[800],
  lowerRowOdd: PALETTE.purple[900],
  lowerHeader: PALETTE.purple[700],
  lowerBorder: PALETTE.purple[500],
  // Special section (Blessing of Expansion)
  specialRowEven: PALETTE.gold[800],
  specialRowOdd: PALETTE.gold[900],
  specialHeader: PALETTE.gold[700],
  specialBorder: PALETTE.gold[500],
  // Interaction states
  rowHover: PALETTE.green[800],
  rowFilled: PALETTE.neutral[900],
  // Text colors
  textPotential: COLORS.TEXT_SUCCESS,
  border: PALETTE.purple[500],
} as const;

// Colors for locked categories (Modes 3 & 4)
const LOCKED_CATEGORY_COLOR = PALETTE.neutral[800];
const LOCKED_CATEGORY_BORDER = PALETTE.neutral[500];

export class ScorecardPanel {
  private scene: Phaser.Scene;
  private scorecard: Scorecard;
  private events: GameEventEmitter;
  private config: ScorecardPanelConfig;
  private container: Phaser.GameObjects.Container;
  private categoryRows: Map<CategoryId, CategoryRow> = new Map();
  private currentDice: number[] = Array(GAME_RULES.DICE_COUNT).fill(1);
  private lockedCategories: Set<CategoryId> = new Set(); // Mode 3 & 4: locked categories
  private isCompact: boolean = false; // Compact mode for portrait/mobile
  private layout: ScorecardLayout = 'single-column'; // Layout mode
  private isGauntletMode: boolean = false; // Mode 4: limited categories available
  private gauntletPulseTweens: Map<CategoryId, Phaser.Tweens.Tween> = new Map(); // Pulsing effects by category

  // UI elements
  private totalText: Phaser.GameObjects.Text | null = null;
  private bonusText: Phaser.GameObjects.Text | null = null;
  private bonusProgressText: Phaser.GameObjects.Text | null = null;
  private categoryProgressText: Phaser.GameObjects.Text | null = null; // Shows "X/13 filled" in Gauntlet
  private expansionProgressText: Phaser.GameObjects.Text | null = null; // Shows "X/13 Scored" in expansion header

  // Tween tracking
  private outerGlowTween: Phaser.Tweens.Tween | null = null;
  private flashTweens: Phaser.Tweens.Tween[] = [];

  // Bound event handlers for cleanup
  private onDiceRolled: (payload: { values: number[] }) => void;
  private onLockedCategories: (locked: Set<CategoryId>) => void;
  private onBlessingExpansion: () => void;

  // Content bounds (set during build, used by row methods)
  private contentBounds: { x: number; width: number } = { x: 0, width: 0 };

  // Sizing helpers - adapt to layout mode
  // "Compact mode" = two-column layout with special section enabled (17 categories)
  private get needsCompactLayout(): boolean {
    return this.layout === 'two-column' && this.scorecard.isSpecialSectionEnabled();
  }
  private get rowHeight(): number {
    if (this.layout === 'two-column') return RESPONSIVE.ROW_HEIGHT_MOBILE; // 36px for touch - never reduce
    return this.isCompact ? 22 : 24;
  }
  private get headerHeight(): number {
    if (this.layout === 'two-column') {
      return this.needsCompactLayout ? RESPONSIVE.COMPACT_HEADER_HEIGHT : 24;
    }
    return this.isCompact ? 18 : 20;
  }
  private get totalRowHeight(): number {
    if (this.layout === 'two-column') {
      return this.needsCompactLayout ? RESPONSIVE.COMPACT_TOTAL_HEIGHT : RESPONSIVE.ROW_HEIGHT_MOBILE;
    }
    return this.isCompact ? 22 : 24;
  }
  private get titleHeight(): number {
    if (this.layout === 'two-column') {
      return this.needsCompactLayout ? RESPONSIVE.COMPACT_TITLE_HEIGHT : 28;
    }
    return this.isCompact ? 24 : 28;
  }
  private get contentPadding(): number {
    if (this.layout === 'two-column') {
      return this.needsCompactLayout ? RESPONSIVE.COMPACT_CONTENT_PADDING : 6;
    }
    return 6;
  }
  private get dividerHeight(): number {
    if (this.layout === 'two-column') {
      return this.needsCompactLayout ? RESPONSIVE.COMPACT_DIVIDER_HEIGHT : 6;
    }
    return 6;
  }
  private get bottomPadding(): number {
    if (this.layout === 'two-column') {
      return this.needsCompactLayout ? RESPONSIVE.COMPACT_BOTTOM_PADDING : 8;
    }
    return 8;
  }
  private get titleGap(): number {
    if (this.layout === 'two-column') {
      return this.needsCompactLayout ? RESPONSIVE.COMPACT_TITLE_GAP : 2;
    }
    return 2;
  }
  private get fontSize(): string {
    if (this.layout === 'two-column') return '15px'; // Bumped from 13px for readability
    return this.isCompact ? '11px' : '12px';
  }
  private get smallFontSize(): string {
    if (this.layout === 'two-column') return '13px'; // Bumped from 11px for readability
    return this.isCompact ? '9px' : '10px';
  }
  private get scoreFontSize(): string {
    if (this.layout === 'two-column') return '16px'; // Bumped from 14px for readability
    return this.isCompact ? '12px' : '14px';
  }
  private get isTwoColumn(): boolean {
    return this.layout === 'two-column';
  }

  /**
   * Single source of truth for layout decision
   * Two-column on screens < 900px wide
   */
  private determineLayout(): ScorecardLayout {
    const { width } = this.scene.cameras.main;
    return width < 900 ? 'two-column' : 'single-column';
  }

  /**
   * Calculate the dynamic height based on layout and whether special section is enabled
   */
  private calculateHeight(): number {
    // Use dynamic getters for all spacing values
    const padding = this.contentPadding;
    const title = this.titleHeight;
    const gap = this.titleGap;
    const divider = this.dividerHeight;
    const bottom = this.bottomPadding;

    if (this.isTwoColumn) {
      // Two-column layout: Left has upper(6)+bonus, Right has lower(7)
      // Special section (if enabled) spans full width, then Total at bottom
      let height = padding + title + gap;
      height += this.headerHeight; // Column headers
      height += 7 * this.rowHeight; // 7 rows (max of lower section)
      height += this.totalRowHeight; // Total row at bottom
      height += bottom;

      // Special section spans both columns at bottom (4 categories in 2x2 grid)
      if (this.scorecard.isSpecialSectionEnabled()) {
        height += divider;
        height += this.headerHeight;
        height += 2 * this.rowHeight; // 2 rows of 2 categories each
      }
      return height;
    }

    // Single-column layout (original)
    const totalDividerHeight = 1;
    let height = padding + title + gap;
    height += this.headerHeight; // Upper section header
    height += 6 * this.rowHeight; // 6 upper categories
    height += this.rowHeight; // Bonus row
    height += divider; // Divider between upper and lower
    height += this.headerHeight; // Lower section header
    height += 7 * this.rowHeight; // 7 lower categories
    height += totalDividerHeight; // Line above total
    height += this.totalRowHeight; // Total row
    height += bottom;

    // Add special section if enabled
    if (this.scorecard.isSpecialSectionEnabled()) {
      height += divider; // Divider before special
      height += this.headerHeight; // Special section header
      height += 4 * this.rowHeight; // 4 special categories
    }

    return height;
  }

  /**
   * Calculate width based on layout
   */
  private calculateWidth(): number {
    if (this.isTwoColumn) {
      return RESPONSIVE.SCORECARD_WIDTH_TWO_COL; // 340px
    }
    return this.isCompact ? 300 : SIZES.SCORECARD_WIDTH;
  }

  constructor(
    scene: Phaser.Scene,
    scorecard: Scorecard,
    events: GameEventEmitter,
    config: ScorecardPanelConfig
  ) {
    this.scene = scene;
    this.scorecard = scorecard;
    this.events = events;
    this.isCompact = config.compact ?? false;

    // Determine layout based on viewport - single source of truth
    this.layout = this.determineLayout();

    // Initialize bound event handlers
    this.onDiceRolled = ({ values }) => this.setDice(values);
    this.onLockedCategories = (locked: Set<CategoryId>) => this.setLockedCategories(locked);
    this.onBlessingExpansion = () => {
      this.rebuild();
    };

    // Calculate dimensions based on layout mode
    const dynamicWidth = config.width ?? this.calculateWidth();
    const dynamicHeight = this.calculateHeight();

    this.config = {
      ...config,
      width: dynamicWidth,
      height: dynamicHeight,
    };
    this.container = scene.add.container(config.x, config.y);

    this.build();
    this.setupEventListeners();
  }

  // ===========================================================================
  // EVENT HANDLING
  // ===========================================================================

  private setupEventListeners(): void {
    // Update display when dice are rolled
    this.events.on('dice:rolled', this.onDiceRolled);

    // Update locked categories (Mode 3 & 4)
    this.events.on('mode:lockedCategories', this.onLockedCategories);

    // Rebuild when blessing of expansion is enabled (adds 4 categories)
    this.events.on('blessing:expansion:enable', this.onBlessingExpansion);
  }

  /**
   * Rebuild the scorecard panel with new dimensions
   * Called when blessing of expansion adds 4 new categories
   */
  private rebuild(): void {
    // Recalculate layout using single source of truth
    this.layout = this.determineLayout();
    this.config.width = this.calculateWidth();

    // Stop all running tweens
    if (this.outerGlowTween) {
      this.outerGlowTween.stop();
      this.outerGlowTween = null;
    }
    this.gauntletPulseTweens.forEach(tween => tween.stop());
    this.gauntletPulseTweens.clear();
    this.flashTweens.forEach(tween => {
      if (tween.isPlaying()) tween.stop();
    });
    this.flashTweens = [];

    // Clear category rows map
    this.categoryRows.clear();

    // Clear UI element references
    this.totalText = null;
    this.bonusText = null;
    this.bonusProgressText = null;

    // Destroy all children of the container
    this.container.removeAll(true);

    // Recalculate height with special section now enabled
    this.config.height = this.calculateHeight();

    // Rebuild UI
    this.build();
    this.updateDisplay();

    // Animate the expansion
    this.scene.tweens.add({
      targets: this.container,
      scaleY: { from: 0.95, to: 1 },
      alpha: { from: 0.8, to: 1 },
      duration: SIZES.ANIM_ENTRANCE,
      ease: 'Back.easeOut',
    });
  }

  // ===========================================================================
  // UI BUILDING
  // ===========================================================================

  /** Helper to create a "locked" X icon using Graphics */
  private createLockIcon(x: number, y: number, color: number = PALETTE.red[400]): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const size = 5; // Half-size of the X (total 10px)

    // Draw X shape - two diagonal lines
    g.lineStyle(2.5, color, 1);

    // Top-left to bottom-right
    g.beginPath();
    g.moveTo(x - size, y - size);
    g.lineTo(x + size, y + size);
    g.strokePath();

    // Top-right to bottom-left
    g.beginPath();
    g.moveTo(x + size, y - size);
    g.lineTo(x - size, y + size);
    g.strokePath();

    g.setVisible(false); // Hidden by default
    return g;
  }

  private build(): void {
    const width = this.config.width!;
    const height = this.config.height!;

    // === PANEL FRAME (matching menu button design) ===
    this.buildPanelFrame(width, height);

    // === CONTENT ===
    if (this.isTwoColumn) {
      this.buildTwoColumnContent(width, height);
    } else {
      this.buildSingleColumnContent(width, height);
    }
  }

  /** Build the shared panel frame (glow, background, corners) */
  private buildPanelFrame(width: number, height: number): void {
    // Outer glow (stroke only, pulses)
    const outerGlow = this.scene.add.rectangle(width / 2, height / 2, width + 20, height + 20, COLORS.OVERLAY, 0);
    outerGlow.setStrokeStyle(SIZES.GLOW_STROKE_MEDIUM, PALETTE.purple[500], 0.1);
    this.container.add(outerGlow);

    // Glow pulse animation
    this.outerGlowTween = this.scene.tweens.add({
      targets: outerGlow,
      alpha: 0.15,
      duration: SIZES.ANIM_PULSE,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Shadow behind panel
    const shadow = this.scene.add.rectangle(width / 2 + 4, height / 2 + 4, width, height, COLORS.SHADOW, 0.5);
    this.container.add(shadow);

    // Main background (dark, matching menu buttons)
    const panelBg = this.scene.add.rectangle(width / 2, height / 2, width, height, COLORS.PANEL_BG_DEEP, 0.9);
    panelBg.setStrokeStyle(SIZES.PANEL_BORDER_WIDTH, PALETTE.purple[500], 0.8);
    this.container.add(panelBg);

    // Inner highlight bar at top
    const highlightHeight = this.isTwoColumn ? 10 : (this.isCompact ? 8 : 10);
    const innerHighlight = this.scene.add.rectangle(
      width / 2, highlightHeight / 2 + 3,
      width - 20, highlightHeight,
      COLORS.HIGHLIGHT, 0.03
    );
    this.container.add(innerHighlight);

    // Corner accents (L-shaped, matching menu buttons)
    const cornerSize = 12;
    const cornerInset = 5;
    const corners = [
      { x: cornerInset, y: cornerInset, dx: 1, dy: 1 },
      { x: width - cornerInset, y: cornerInset, dx: -1, dy: 1 },
      { x: width - cornerInset, y: height - cornerInset, dx: -1, dy: -1 },
      { x: cornerInset, y: height - cornerInset, dx: 1, dy: -1 },
    ];

    corners.forEach(corner => {
      const accent = this.scene.add.graphics();
      accent.lineStyle(2, PALETTE.purple[400], 0.6);
      accent.beginPath();
      accent.moveTo(corner.x, corner.y + cornerSize * corner.dy);
      accent.lineTo(corner.x, corner.y);
      accent.lineTo(corner.x + cornerSize * corner.dx, corner.y);
      accent.strokePath();
      this.container.add(accent);
    });
  }

  /** Build two-column mobile layout: Upper+Bonus on left, Lower+Total on right */
  private buildTwoColumnContent(width: number, _height: number): void {
    const padding = this.contentPadding;
    const colGap = 6;
    const colWidth = (width - padding * 2 - colGap) / 2;
    const leftX = padding;
    const rightX = padding + colWidth + colGap;

    // Title - use dynamic height
    const title_h = this.titleHeight;
    const titleFontSize = this.needsCompactLayout ? FONTS.SIZE_SMALL : FONTS.SIZE_BUTTON;
    const titleY = padding + title_h / 2;

    const title = createText(this.scene,width / 2, titleY, 'SCORECARD', {
      fontSize: titleFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_ACCENT,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    let leftY = padding + title_h + this.titleGap;
    let rightY = leftY;

    // === LEFT COLUMN: Upper section + Bonus ===
    this.contentBounds = { x: leftX, width: colWidth };

    leftY = this.addSectionHeader('UPPER', leftY, 'upper');
    const upperCategories = this.scorecard.getUpperSection();
    for (let i = 0; i < upperCategories.length; i++) {
      leftY = this.addCategoryRowTwoCol(upperCategories[i], leftY, i % 2 === 0, 'upper', leftX, colWidth);
    }
    leftY = this.addBonusRowTwoCol(leftY, leftX, colWidth);

    // === RIGHT COLUMN: Lower section ===
    this.contentBounds = { x: rightX, width: colWidth };

    rightY = this.addSectionHeader('LOWER', rightY, 'lower');
    const lowerCategories = this.scorecard.getLowerSection();
    for (let i = 0; i < lowerCategories.length; i++) {
      rightY = this.addCategoryRowTwoCol(lowerCategories[i], rightY, i % 2 === 0, 'lower', rightX, colWidth);
    }

    // Track where columns end
    let bottomY = Math.max(leftY, rightY);

    // === SPECIAL SECTION (2x2 grid) ===
    if (this.scorecard.isSpecialSectionEnabled()) {
      const fullWidth = width - padding * 2;

      let y = bottomY + this.dividerHeight / 2;
      const divider = this.scene.add.rectangle(padding, y, fullWidth, 1, PALETTE.gold[500], 0.5);
      divider.setOrigin(0, 0);
      this.container.add(divider);
      y += this.dividerHeight / 2;

      // Expansion header with helper text on same row
      y = this.addExpansionHeader(y, padding, fullWidth);

      // 2x2 grid layout for 4 expansion categories
      const specialCategories = this.scorecard.getSpecialSection();
      const gridColWidth = (fullWidth - colGap) / 2;
      const gridLeftX = padding;
      const gridRightX = padding + gridColWidth + colGap;

      // Row 1: categories 0 and 1
      if (specialCategories[0]) {
        this.contentBounds = { x: gridLeftX, width: gridColWidth };
        this.addCategoryRowTwoCol(specialCategories[0], y, true, 'special', gridLeftX, gridColWidth);
      }
      if (specialCategories[1]) {
        this.contentBounds = { x: gridRightX, width: gridColWidth };
        this.addCategoryRowTwoCol(specialCategories[1], y, true, 'special', gridRightX, gridColWidth);
      }
      y += this.rowHeight;

      // Row 2: categories 2 and 3
      if (specialCategories[2]) {
        this.contentBounds = { x: gridLeftX, width: gridColWidth };
        this.addCategoryRowTwoCol(specialCategories[2], y, false, 'special', gridLeftX, gridColWidth);
      }
      if (specialCategories[3]) {
        this.contentBounds = { x: gridRightX, width: gridColWidth };
        this.addCategoryRowTwoCol(specialCategories[3], y, false, 'special', gridRightX, gridColWidth);
      }
      y += this.rowHeight;

      bottomY = y;
    }

    // === TOTAL ROW (spans full width at very bottom) ===
    const fullWidth = width - padding * 2;
    this.contentBounds = { x: padding, width: fullWidth };
    this.addTotalRowTwoCol(bottomY, padding, fullWidth);

    // Reset content bounds
    this.contentBounds = { x: padding, width: fullWidth };
  }

  /** Add a category row for two-column layout (simplified, no potential column) */
  private addCategoryRowTwoCol(
    category: Category,
    y: number,
    isEven: boolean,
    section: 'upper' | 'lower' | 'special',
    colX: number,
    colWidth: number
  ): number {
    const height = this.rowHeight;
    const rowColor = this.getRowColor(section, isEven);

    // Background
    const background = this.scene.add.rectangle(colX, y, colWidth, height, rowColor);
    background.setOrigin(0, 0);
    this.container.add(background);

    // Category name (shorter for 2-col)
    const shortName = this.getShortCategoryName(category.id);
    const nameText = createText(this.scene,colX + 8, y + height / 2, shortName, {
      fontSize: this.fontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
    });
    nameText.setOrigin(0, 0.5);
    this.container.add(nameText);

    // Potential text (shows when available, smaller)
    const potentialText = createText(this.scene,colX + colWidth - 45, y + height / 2, '', {
      fontSize: this.smallFontSize,
      fontFamily: FONTS.FAMILY,
      color: PANEL_COLORS.textPotential,
    });
    potentialText.setOrigin(0.5, 0.5);
    this.container.add(potentialText);

    // Lock icon
    const lockIcon = this.createLockIcon(colX + colWidth - 45, y + height / 2, PALETTE.red[400]);
    this.container.add(lockIcon);

    // Score text (right aligned)
    const scoreText = createText(this.scene,colX + colWidth - 12, y + height / 2, '', {
      fontSize: this.scoreFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    scoreText.setOrigin(1, 0.5);
    this.container.add(scoreText);

    // Hit area (transparent)
    const hitArea = this.scene.add.rectangle(colX, y, colWidth, height, COLORS.HIGHLIGHT, 0);
    hitArea.setOrigin(0, 0);
    hitArea.setInteractive({ useHandCursor: true });
    this.container.add(hitArea);

    // Hover effects
    hitArea.on('pointerover', () => {
      if (this.scorecard.isAvailable(category.id)) {
        this.container.bringToTop(background);
        this.container.bringToTop(nameText);
        this.container.bringToTop(potentialText);
        this.container.bringToTop(scoreText);
        this.container.bringToTop(hitArea);

        if (this.isGauntletMode) {
          background.setFillStyle(PALETTE.green[700]);
          background.setStrokeStyle(2, PALETTE.green[400]);
        } else {
          background.setFillStyle(PANEL_COLORS.rowHover);
          background.setStrokeStyle(2, PALETTE.green[500]);
        }
        this.events.emit('ui:categoryHover', { categoryId: category.id });
      }
    });

    hitArea.on('pointerout', () => {
      const cat = this.scorecard.getCategory(category.id);
      if (cat && cat.score !== null) {
        background.setFillStyle(PANEL_COLORS.rowFilled);
        background.setStrokeStyle(0);
        nameText.setColor(COLORS.TEXT_SECONDARY);
      } else if (this.isGauntletMode && this.scorecard.isAvailable(category.id)) {
        background.setFillStyle(PALETTE.green[900]);
        background.setStrokeStyle(2, PALETTE.green[500], 0.8);
        nameText.setColor(COLORS.TEXT_SUCCESS);
      } else {
        background.setFillStyle(rowColor);
        background.setStrokeStyle(0);
        nameText.setColor(COLORS.TEXT_PRIMARY);
      }
      this.events.emit('ui:categoryHover', { categoryId: null });
    });

    hitArea.on('pointerdown', () => {
      if (this.scorecard.isAvailable(category.id)) {
        this.events.emit('score:category', { categoryId: category.id, dice: this.currentDice });
      }
    });

    // Store row reference
    this.categoryRows.set(category.id, {
      id: category.id,
      nameText,
      scoreText,
      potentialText,
      lockIcon,
      background,
      hitArea,
      rowColor,
    });

    return y + height;
  }

  /** Add bonus row for two-column layout */
  private addBonusRowTwoCol(y: number, colX: number, colWidth: number): number {
    const height = this.rowHeight;

    const background = this.scene.add.rectangle(colX, y, colWidth, height, PALETTE.gold[900], 0.4);
    background.setOrigin(0, 0);
    this.container.add(background);

    const labelText = createText(this.scene,colX + 8, y + height / 2, 'Bonus', {
      fontSize: this.fontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
    });
    labelText.setOrigin(0, 0.5);
    this.container.add(labelText);

    // Progress: "12/63" style - positioned left of bonus value
    this.bonusProgressText = createText(this.scene,colX + colWidth - 75, y + height / 2, '0/63', {
      fontSize: this.smallFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_MUTED,
    });
    this.bonusProgressText.setOrigin(0.5, 0.5);
    this.container.add(this.bonusProgressText);

    // Bonus earned
    this.bonusText = createText(this.scene,colX + colWidth - 12, y + height / 2, '', {
      fontSize: this.scoreFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    this.bonusText.setOrigin(1, 0.5);
    this.container.add(this.bonusText);

    return y + height;
  }

  /** Add total row for two-column layout */
  private addTotalRowTwoCol(y: number, colX: number, colWidth: number): number {
    const height = this.totalRowHeight;

    const divider = this.scene.add.rectangle(colX, y, colWidth, 1, PALETTE.green[500], 0.6);
    divider.setOrigin(0, 0);
    this.container.add(divider);

    const labelText = createText(this.scene,colX + 8, y + height / 2, 'TOTAL', {
      fontSize: FONTS.SIZE_LABEL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    labelText.setOrigin(0, 0.5);
    this.container.add(labelText);

    this.totalText = createText(this.scene,colX + colWidth - 12, y + height / 2, '0', {
      fontSize: FONTS.SIZE_BODY_SM,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    this.totalText.setOrigin(1, 0.5);
    this.container.add(this.totalText);

    // Category progress (shown when Blessing of Expansion is active)
    this.categoryProgressText = createText(this.scene,colX + colWidth / 2, y + height / 2 + 12, '', {
      fontSize: FONTS.SIZE_MICRO,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_MUTED,
    });
    this.categoryProgressText.setOrigin(0.5, 0.5);
    this.container.add(this.categoryProgressText);

    return y + height;
  }

  /** Get row color based on section and parity */
  private getRowColor(section: 'upper' | 'lower' | 'special', isEven: boolean): number {
    if (section === 'special') {
      return isEven ? PANEL_COLORS.specialRowEven : PANEL_COLORS.specialRowOdd;
    } else if (section === 'upper') {
      return isEven ? PANEL_COLORS.upperRowEven : PANEL_COLORS.upperRowOdd;
    }
    return isEven ? PANEL_COLORS.lowerRowEven : PANEL_COLORS.lowerRowOdd;
  }

  /** Get short category name for 2-column display */
  private getShortCategoryName(id: CategoryId): string {
    const shortNames: Record<string, string> = {
      ones: '1s',
      twos: '2s',
      threes: '3s',
      fours: '4s',
      fives: '5s',
      sixes: '6s',
      threeOfAKind: '3 of Kind',
      fourOfAKind: '4 of Kind',
      fullHouse: 'Full House',
      smallStraight: 'Sm Straight',
      largeStraight: 'Lg Straight',
      fiveDice: '5 Dice!',
      chance: 'Chance',
      // Special categories (Blessing of Expansion)
      twoPair: 'Two Pair',
      allOdd: 'All Odd',
      allEven: 'All Even',
      allHigh: 'All High',
    };
    return shortNames[id] || id;
  }

  /** Build single-column layout (original desktop layout) */
  private buildSingleColumnContent(width: number, _height: number): void {
    const contentPadding = 6;
    const contentX = contentPadding;
    const contentWidth = width - contentPadding * 2;

    // Title area (no background)
    const titleHeight = this.isCompact ? 24 : 28;

    // Title with glow
    const titleFontSize = this.isCompact ? FONTS.SIZE_LABEL : FONTS.SIZE_BODY;
    const titleY = contentPadding + titleHeight / 2;

    const titleGlow = createText(this.scene,width / 2, titleY, 'SCORECARD', {
      fontSize: titleFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_ACCENT,
      fontStyle: 'bold',
    });
    titleGlow.setOrigin(0.5, 0.5);
    titleGlow.setAlpha(0.3);
    titleGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.container.add(titleGlow);

    const title = createText(this.scene,width / 2, titleY, 'SCORECARD', {
      fontSize: titleFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_ACCENT,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    // Store content bounds for row methods
    this.contentBounds = { x: contentX, width: contentWidth };

    let y = contentPadding + titleHeight + 2;

    // Upper section
    y = this.addSectionHeader('UPPER SECTION', y, 'upper');
    const upperCategories = this.scorecard.getUpperSection();
    for (let i = 0; i < upperCategories.length; i++) {
      y = this.addCategoryRow(upperCategories[i], y, i % 2 === 0, 'upper');
    }

    // Upper bonus (tracks 63-point threshold)
    y = this.addBonusRow(y);

    // Divider
    y += 2;
    const divider = this.scene.add.rectangle(contentX, y, contentWidth, 1, PALETTE.neutral[500], 0.4);
    divider.setOrigin(0, 0);
    this.container.add(divider);
    y += 3;

    // Lower section
    y = this.addSectionHeader('LOWER SECTION', y, 'lower');
    const lowerCategories = this.scorecard.getLowerSection();
    for (let i = 0; i < lowerCategories.length; i++) {
      y = this.addCategoryRow(lowerCategories[i], y, i % 2 === 0, 'lower');
    }

    // Special section (Blessing of Expansion) - normal rows like other sections
    if (this.scorecard.isSpecialSectionEnabled()) {
      y += 2;
      const divider2 = this.scene.add.rectangle(contentX, y, contentWidth, 1, PALETTE.gold[500], 0.5);
      divider2.setOrigin(0, 0);
      this.container.add(divider2);
      y += 3;

      y = this.addExpansionHeader(y, contentX, contentWidth);
      const specialCategories = this.scorecard.getSpecialSection();
      for (let i = 0; i < specialCategories.length; i++) {
        y = this.addCategoryRow(specialCategories[i], y, i % 2 === 0, 'special');
      }
    }

    // Grand total
    this.addTotalRow(y);
  }

  private addSectionHeader(text: string, y: number, section: 'upper' | 'lower' | 'special'): number {
    const { x: cx } = this.contentBounds;
    const height = this.headerHeight;
    const borderColor = section === 'special' ? PANEL_COLORS.specialBorder
      : section === 'upper' ? PANEL_COLORS.upperBorder : PANEL_COLORS.lowerBorder;
    const textColor = section === 'special' ? COLORS.TEXT_WARNING : COLORS.TEXT_ACCENT;

    // Left accent bar only (no background)
    const accent = this.scene.add.rectangle(cx, y, 4, height, borderColor);
    accent.setOrigin(0, 0);
    this.container.add(accent);

    const headerText = createText(this.scene,cx + 16, y + height / 2, text, {
      fontSize: this.smallFontSize,
      fontFamily: FONTS.FAMILY,
      color: textColor,
      fontStyle: 'bold',
    });
    headerText.setOrigin(0, 0.5);
    this.container.add(headerText);

    return y + height;
  }

  /** Expansion section header with helper text: "EXPANSION | Fill 13 of 17" */
  private addExpansionHeader(y: number, x: number, width: number): number {
    const height = this.headerHeight;

    // Left accent bar
    const accent = this.scene.add.rectangle(x, y, 4, height, PANEL_COLORS.specialBorder);
    accent.setOrigin(0, 0);
    this.container.add(accent);

    // "EXPANSION" on left
    const headerText = createText(this.scene,x + 12, y + height / 2, 'EXPANSION', {
      fontSize: this.smallFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
      fontStyle: 'bold',
    });
    headerText.setOrigin(0, 0.5);
    this.container.add(headerText);

    // "X/13 Scored" helper text on right (updates dynamically)
    this.expansionProgressText = createText(this.scene,x + width - 8, y + height / 2, '0/13 Scored', {
      fontSize: this.smallFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
      fontStyle: 'bold',
    });
    this.expansionProgressText.setOrigin(1, 0.5);
    this.container.add(this.expansionProgressText);

    return y + height;
  }

  private addCategoryRow(
    category: Category,
    y: number,
    isEven: boolean,
    section: 'upper' | 'lower' | 'special'
  ): number {
    const { x: cx, width: cw } = this.contentBounds;
    const width = this.config.width!;
    const height = this.rowHeight;
    const rowColor =
      section === 'special'
        ? isEven
          ? PANEL_COLORS.specialRowEven
          : PANEL_COLORS.specialRowOdd
        : section === 'upper'
          ? isEven
            ? PANEL_COLORS.upperRowEven
            : PANEL_COLORS.upperRowOdd
          : isEven
            ? PANEL_COLORS.lowerRowEven
            : PANEL_COLORS.lowerRowOdd;

    // Background
    const background = this.scene.add.rectangle(cx, y, cw, height, rowColor);
    background.setOrigin(0, 0);
    this.container.add(background);

    // Category name
    const nameText = createText(this.scene,cx + 14, y + height / 2, category.name, {
      fontSize: this.fontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
    });
    nameText.setOrigin(0, 0.5);
    this.container.add(nameText);

    // Potential score
    const potentialText = createText(this.scene,width - cx - 85, y + height / 2, '', {
      fontSize: this.fontSize,
      fontFamily: FONTS.FAMILY,
      color: PANEL_COLORS.textPotential,
    });
    potentialText.setOrigin(0.5, 0.5);
    this.container.add(potentialText);

    // Lock icon (shown when category is locked)
    const lockIcon = this.createLockIcon(width - cx - 85, y + height / 2, PALETTE.red[400]);
    this.container.add(lockIcon);

    // Actual score
    const scoreText = createText(this.scene,width - cx - 32, y + height / 2, '', {
      fontSize: this.scoreFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    scoreText.setOrigin(0.5, 0.5);
    this.container.add(scoreText);

    // Hit area for interaction (transparent)
    const hitArea = this.scene.add.rectangle(cx, y, cw, height, COLORS.HIGHLIGHT, 0);
    hitArea.setOrigin(0, 0);
    hitArea.setInteractive({ useHandCursor: true });
    this.container.add(hitArea);

    // Hover effects
    hitArea.on('pointerover', () => {
      if (this.scorecard.isAvailable(category.id)) {
        // Bring row elements to top so border isn't hidden by next row
        this.container.bringToTop(background);
        this.container.bringToTop(nameText);
        this.container.bringToTop(potentialText);
        this.container.bringToTop(scoreText);
        this.container.bringToTop(hitArea);

        // In gauntlet mode, keep the green styling
        if (this.isGauntletMode) {
          background.setFillStyle(PALETTE.green[700]); // Brighter green on hover
          background.setStrokeStyle(2, PALETTE.green[400]);
          nameText.setColor(COLORS.TEXT_SUCCESS); // Keep green text
        } else {
          background.setFillStyle(PANEL_COLORS.rowHover);
          background.setStrokeStyle(2, PALETTE.green[500]);
          nameText.setColor(COLORS.TEXT_PRIMARY);
        }
        potentialText.setFontStyle('bold');
        this.events.emit('ui:categoryHover', { categoryId: category.id });
      }
    });

    hitArea.on('pointerout', () => {
      const cat = this.scorecard.getCategory(category.id);
      potentialText.setFontStyle('normal');

      if (cat && cat.score !== null) {
        background.setFillStyle(PANEL_COLORS.rowFilled);
        background.setStrokeStyle(0);
        nameText.setColor(COLORS.TEXT_SECONDARY);
      } else if (this.isGauntletMode && this.scorecard.isAvailable(category.id)) {
        // Restore gauntlet mode green styling
        background.setFillStyle(PALETTE.green[900]);
        background.setStrokeStyle(2, PALETTE.green[500], 0.8);
        nameText.setColor(COLORS.TEXT_SUCCESS);
      } else {
        background.setFillStyle(rowColor);
        background.setStrokeStyle(0);
        nameText.setColor(COLORS.TEXT_PRIMARY);
      }
      this.events.emit('ui:categoryHover', { categoryId: null });
    });

    // Click to score
    hitArea.on('pointerdown', () => {
      if (this.scorecard.isAvailable(category.id)) {
        // Emit event for scoring - let the scene handle it
        this.events.emit('score:category', { categoryId: category.id, dice: this.currentDice });
      }
    });

    // Store row reference
    this.categoryRows.set(category.id, {
      id: category.id,
      nameText,
      scoreText,
      potentialText,
      lockIcon,
      background,
      hitArea,
      rowColor,
    });

    return y + height;
  }

  private addBonusRow(y: number): number {
    const { x: cx, width: cw } = this.contentBounds;
    const width = this.config.width!;
    const height = this.rowHeight;

    // Background - subtle gold tint
    const background = this.scene.add.rectangle(cx, y, cw, height, PALETTE.gold[900], 0.4);
    background.setOrigin(0, 0);
    this.container.add(background);

    // Label: "Bonus" with threshold hint
    const labelText = createText(this.scene,cx + 14, y + height / 2, 'Bonus (≥63 = +35)', {
      fontSize: this.fontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
    });
    labelText.setOrigin(0, 0.5);
    this.container.add(labelText);

    // Progress: "12/63" style, positioned like potential score
    this.bonusProgressText = createText(this.scene,width - cx - 85, y + height / 2, '0/63', {
      fontSize: this.fontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_MUTED,
    });
    this.bonusProgressText.setOrigin(0.5, 0.5);
    this.container.add(this.bonusProgressText);

    // Bonus earned: positioned like score column
    this.bonusText = createText(this.scene,width - cx - 32, y + height / 2, '', {
      fontSize: this.scoreFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    this.bonusText.setOrigin(0.5, 0.5);
    this.container.add(this.bonusText);

    return y + height;
  }

  private addTotalRow(y: number): number {
    const { x: cx, width: cw } = this.contentBounds;
    const height = this.totalRowHeight;

    // Simple line above total
    const divider = this.scene.add.rectangle(cx, y, cw, 1, PALETTE.green[500], 0.6);
    divider.setOrigin(0, 0);
    this.container.add(divider);

    const labelText = createText(this.scene,cx + 14, y + height / 2, 'TOTAL', {
      fontSize: this.isCompact ? FONTS.SIZE_TINY : FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    labelText.setOrigin(0, 0.5);
    this.container.add(labelText);

    this.totalText = createText(this.scene,cx + cw - 24, y + height / 2, '0', {
      fontSize: this.isCompact ? FONTS.SIZE_SMALL : FONTS.SIZE_BUTTON,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    this.totalText.setOrigin(0.5, 0.5);
    this.container.add(this.totalText);

    // Category progress (shown in Gauntlet mode) - positioned between TOTAL and score
    this.categoryProgressText = createText(this.scene,cx + cw / 2, y + height / 2, '', {
      fontSize: this.isCompact ? FONTS.SIZE_NANO : FONTS.SIZE_MICRO,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_MUTED,
    });
    this.categoryProgressText.setOrigin(0.5, 0.5);
    this.container.add(this.categoryProgressText);

    return y + height;
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Update dice values
   */
  setDice(dice: number[]): void {
    this.currentDice = [...dice];
    this.updateDisplay();
  }

  /**
   * Update display to reflect current scorecard state
   */
  updateDisplay(): void {
    // Update category rows
    for (const [id, row] of this.categoryRows) {
      const cat = this.scorecard.getCategory(id);
      if (!cat) continue;

      const isLocked = this.lockedCategories.has(id);

      if (cat.score !== null) {
        // Category already scored
        row.scoreText.setText(cat.score.toString());
        row.potentialText.setText('');
        row.lockIcon.setVisible(false);
        row.background.setFillStyle(PANEL_COLORS.rowFilled);
        row.background.setStrokeStyle(0);
        row.hitArea.disableInteractive();
        row.nameText.setColor(COLORS.TEXT_SECONDARY);
      } else if (isLocked) {
        // Category is locked (Mode 3 & 4)
        row.scoreText.setText('');
        row.potentialText.setText('');
        row.lockIcon.setVisible(true);
        row.background.setFillStyle(LOCKED_CATEGORY_COLOR);
        row.background.setStrokeStyle(1, LOCKED_CATEGORY_BORDER);
        row.hitArea.disableInteractive();
        row.nameText.setColor(COLORS.TEXT_DISABLED);
      } else {
        // Category available
        const potential = this.scorecard.calculatePotential(id, this.currentDice);
        row.scoreText.setText('');
        row.potentialText.setText(potential > 0 ? `+${potential}` : '0');
        row.potentialText.setColor(potential > 0 ? PANEL_COLORS.textPotential : COLORS.TEXT_MUTED);
        row.lockIcon.setVisible(false);
        row.background.setFillStyle(row.rowColor);
        row.hitArea.setInteractive({ useHandCursor: true });
        row.nameText.setColor(COLORS.TEXT_PRIMARY);

        row.background.setStrokeStyle(0);

        // Gauntlet mode: highlight available categories in green with pulse
        if (this.isGauntletMode) {
          row.nameText.setColor(COLORS.TEXT_SUCCESS);
          row.background.setFillStyle(PALETTE.green[900]);
          row.background.setStrokeStyle(2, PALETTE.green[500], 0.8);
          // Note: Pulse tweens are created after the loop to avoid stopping/recreating
        }
      }
    }

    // Gauntlet mode: Manage pulse tweens for available categories
    if (this.isGauntletMode) {
      // Build set of currently available category IDs
      const availableIds = new Set<CategoryId>();
      for (const [id] of this.categoryRows) {
        const cat = this.scorecard.getCategory(id);
        const isLocked = this.lockedCategories.has(id);
        if (cat && cat.score === null && !isLocked) {
          availableIds.add(id);
        }
      }

      // Remove tweens for categories that are no longer available
      for (const [id, tween] of this.gauntletPulseTweens) {
        if (!availableIds.has(id)) {
          tween.stop();
          const row = this.categoryRows.get(id);
          if (row) row.nameText.setAlpha(1);
          this.gauntletPulseTweens.delete(id);
        }
      }

      // Add tweens for newly available categories
      for (const id of availableIds) {
        if (!this.gauntletPulseTweens.has(id)) {
          const row = this.categoryRows.get(id);
          if (row) {
            row.nameText.setAlpha(1);
            const tween = this.scene.tweens.add({
              targets: row.nameText,
              alpha: { from: 1, to: 0.5 },
              duration: SIZES.ANIM_MEDIUM_SLOW,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut',
            });
            this.gauntletPulseTweens.set(id, tween);
          }
        }
      }
    }

    // Update bonus progress and total
    const upperSubtotal = this.scorecard.getUpperSubtotal();
    const bonus = this.scorecard.getUpperBonus();

    if (this.bonusProgressText && this.bonusText) {
      // Always show progress
      this.bonusProgressText.setText(`${upperSubtotal}/63`);
      this.bonusProgressText.setColor(upperSubtotal >= 63 ? COLORS.TEXT_SUCCESS : COLORS.TEXT_MUTED);

      // Show +35 when earned
      this.bonusText.setText(bonus > 0 ? '+35' : '');
    }

    if (this.totalText) {
      this.totalText.setText(this.scorecard.getTotal().toString());
    }

    // Category progress text is no longer shown
    if (this.categoryProgressText) {
      this.categoryProgressText.setVisible(false);
    }

    // Update expansion progress text (X/13 Scored)
    if (this.expansionProgressText && this.scorecard.isSpecialSectionEnabled()) {
      const allCategories = this.scorecard.getCategories();
      const filledCount = allCategories.filter(c => c.score !== null).length;
      this.expansionProgressText.setText(`${filledCount}/13 Scored`);
    }
  }

  /**
   * Reset for a new game
   */
  reset(): void {
    this.scorecard.reset();
    this.lockedCategories.clear();
    // Stop gauntlet pulse tweens
    this.gauntletPulseTweens.forEach(tween => tween.stop());
    this.gauntletPulseTweens.clear();
    this.isGauntletMode = false;

    for (const [, row] of this.categoryRows) {
      row.hitArea.setInteractive({ useHandCursor: true });
      row.scoreText.setText('');
      row.potentialText.setText('');
      row.background.setFillStyle(row.rowColor);
      row.nameText.setAlpha(1); // Reset alpha from pulsing
    }
    this.updateDisplay();
  }

  /**
   * Enable/disable gauntlet mode (Mode 4 - limited categories with pulsing)
   */
  setGauntletMode(enabled: boolean): void {
    this.isGauntletMode = enabled;
    if (!enabled) {
      this.gauntletPulseTweens.forEach(tween => tween.stop());
      this.gauntletPulseTweens.clear();
      // Reset alpha on all name texts
      for (const [, row] of this.categoryRows) {
        row.nameText.setAlpha(1);
      }
    }
  }

  /**
   * Set which categories are locked (Modes 3 & 4)
   */
  setLockedCategories(locked: Set<CategoryId>): void {
    this.lockedCategories = new Set(locked);
    this.updateDisplay();

    // Animate the category rows that just got locked
    for (const categoryId of locked) {
      const row = this.categoryRows.get(categoryId);
      if (row) {
        // Brief flash to indicate locking
        const flashTween = this.scene.tweens.add({
          targets: row.background,
          alpha: 0.5,
          duration: SIZES.ANIM_QUICK,
          yoyo: true,
          repeat: 1,
          onComplete: () => {
            // Remove from tracked tweens when done
            const index = this.flashTweens.indexOf(flashTween);
            if (index > -1) this.flashTweens.splice(index, 1);
          },
        });
        this.flashTweens.push(flashTween);
      }
    }
  }

  /**
   * Check if a category is locked
   */
  isCategoryLocked(categoryId: CategoryId): boolean {
    return this.lockedCategories.has(categoryId);
  }

  /**
   * Get container for positioning
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Disable all interactivity (used when game ends)
   */
  disableInteractivity(): void {
    for (const row of this.categoryRows.values()) {
      row.hitArea.disableInteractive();
    }
  }

  /**
   * Destroy the panel
   */
  destroy(): void {
    // Remove event listeners
    this.events.off('dice:rolled', this.onDiceRolled);
    this.events.off('mode:lockedCategories', this.onLockedCategories);
    this.events.off('blessing:expansion:enable', this.onBlessingExpansion);

    // Stop all tweens
    this.gauntletPulseTweens.forEach(tween => tween.stop());
    this.gauntletPulseTweens.clear();
    if (this.outerGlowTween) {
      this.outerGlowTween.stop();
      this.outerGlowTween = null;
    }
    this.flashTweens.forEach(tween => {
      if (tween.isPlaying()) tween.stop();
    });
    this.flashTweens = [];

    this.container.destroy();
  }
}
