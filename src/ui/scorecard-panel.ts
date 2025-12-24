/**
 * Scorecard UI Panel
 * Displays the dice scorecard and handles category selection
 */

import Phaser from 'phaser';
import { type Scorecard, type CategoryId } from '@/systems/scorecard';
import { GameEventEmitter } from '@/systems/game-events';
import { FONTS, SIZES, PALETTE, COLORS, type ScorecardLayout } from '@/config';
import { createText } from '@/ui/ui-utils';
import type {
  Bounds,
  ScorecardAllowedActions,
  TutorialControllableScorecard,
} from '@/systems/tutorial/interfaces';
import {
  createScorecardStateManager,
  type ScorecardStateManager,
  calculateLayout,
  type LayoutConfig,
  type LayoutInput,
  type RowLayout,
} from '@/ui/scorecard';

export interface ScorecardPanelConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  compact?: boolean; // Smaller row heights for portrait/mobile layout
  maxHeight?: number; // Maximum height constraint from viewport layout
  passThreshold?: number; // Score threshold to display next to total (e.g., 250)
  // Note: layout is auto-determined based on viewport size, not passed in
}

// Note: ScorecardRow component exists but has interface mismatch with stateManager
// TODO: Unify RowDisplayState interfaces before migrating
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

export class ScorecardPanel implements TutorialControllableScorecard {
  private scene: Phaser.Scene;
  private scorecard: Scorecard;
  private events: GameEventEmitter;
  private config: ScorecardPanelConfig;
  private container: Phaser.GameObjects.Container;
  private categoryRows: Map<CategoryId, CategoryRow> = new Map();
  private isCompact: boolean = false; // Compact mode for portrait/mobile
  private layout: ScorecardLayout = 'single-column'; // Layout mode
  private gauntletPulseTweens: Map<CategoryId, Phaser.Tweens.Tween> = new Map(); // Pulsing effects by category
  private maxHeight: number | undefined; // Maximum height constraint from viewport
  private passThreshold: number = 250; // Score threshold to display next to total

  // Tutorial mode controls
  private highlightGraphics: Phaser.GameObjects.Graphics | null = null; // Gold highlight border
  private highlightPulseTween: Phaser.Tweens.Tween | null = null; // Pulsing animation for highlight

  // Modular state management
  private stateManager!: ScorecardStateManager;
  private layoutConfig!: LayoutConfig;

  // UI elements
  private totalText: Phaser.GameObjects.Text | null = null;
  private bonusText: Phaser.GameObjects.Text | null = null;
  private bonusProgressText: Phaser.GameObjects.Text | null = null;
  private categoryProgressText: Phaser.GameObjects.Text | null = null; // Shows "X/13 filled" in Gauntlet
  private expansionProgressText: Phaser.GameObjects.Text | null = null; // Shows "X/13 Scored" in expansion header

  // Tween tracking
  private flashTweens: Phaser.Tweens.Tween[] = [];

  // Bound event handlers for cleanup
  private onDiceRolled: (payload: { values: number[] }) => void;
  private onLockedCategories: (locked: Set<CategoryId>) => void;
  private onBlessingExpansion: () => void;

  // Convenience getter for two-column check
  private get isTwoColumn(): boolean {
    return this.layoutConfig?.mode === 'two-column';
  }

  /**
   * Compute layout configuration using the modular layout calculator
   */
  private computeLayoutConfig(): LayoutConfig {
    const { width, height } = this.scene.cameras.main;
    const input: LayoutInput = {
      viewportWidth: width,
      viewportHeight: height,
      isCompact: this.isCompact,
      hasSpecialSection: this.scorecard.isSpecialSectionEnabled(),
      maxHeight: this.maxHeight,
      upperCategories: this.scorecard.getUpperSection(),
      lowerCategories: this.scorecard.getLowerSection(),
      specialCategories: this.scorecard.getSpecialSection(),
    };
    return calculateLayout(input);
  }

  // Note: calculateRowHeight(), calculateHeight(), calculateWidth() removed
  // All sizing is now computed by layoutConfig via layout-calculator.ts

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
    this.maxHeight = config.maxHeight;
    this.passThreshold = config.passThreshold ?? 250;

    // Initialize modular state manager
    this.stateManager = createScorecardStateManager(scorecard, this.passThreshold);

    // Calculate layout using the modular layout calculator (single source of truth)
    this.layoutConfig = this.computeLayoutConfig();

    // Set layout mode from layoutConfig
    this.layout = this.layoutConfig.mode === 'two-column' ? 'two-column' : 'single-column';

    // Initialize bound event handlers
    this.onDiceRolled = ({ values }) => {
      this.unlockInput(); // Re-enable category selection after roll
      this.setDice(values);
    };
    this.onLockedCategories = (locked: Set<CategoryId>) => this.setLockedCategories(locked);
    this.onBlessingExpansion = () => {
      this.rebuild();
    };

    // Use dimensions from layoutConfig
    this.config = {
      ...config,
      width: config.width ?? this.layoutConfig.width,
      height: this.layoutConfig.height,
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
    // Recompute layout (includes special section now)
    this.layoutConfig = this.computeLayoutConfig();
    this.layout = this.layoutConfig.mode === 'two-column' ? 'two-column' : 'single-column';
    this.config.width = this.layoutConfig.width;
    this.config.height = this.layoutConfig.height;

    // Stop all running tweens
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

    // === CONTENT (unified using layoutConfig.rows) ===
    this.buildContentUnified();
  }

  /** Build the shared panel frame (background, corners) */
  private buildPanelFrame(width: number, height: number): void {
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

  // ===========================================================================
  // UNIFIED BUILD METHODS (using layoutConfig.rows)
  // ===========================================================================

  /**
   * Build content using layoutConfig.rows for positioning
   * Replaces buildTwoColumnContent and buildSingleColumnContent
   */
  private buildContentUnified(): void {
    const lc = this.layoutConfig;
    const isTwoCol = lc.mode === 'two-column';

    // Title (not in rows array)
    const title = createText(this.scene, lc.width / 2, lc.titleY, 'SCORECARD', {
      fontSize: lc.titleFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_ACCENT,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    // Divider before special section (if enabled)
    if (lc.hasSpecialSection && lc.specialHeaderY !== undefined) {
      const dividerY = lc.specialHeaderY - lc.dividerHeight / 2;
      const divider = this.scene.add.rectangle(
        lc.contentX, dividerY,
        lc.contentWidth, 1,
        PALETTE.gold[500], 0.5
      );
      divider.setOrigin(0, 0.5);
      this.container.add(divider);
    }

    // Render all rows from layoutConfig
    for (const row of lc.rows) {
      switch (row.section) {
        case 'header':
          this.renderHeader(row, isTwoCol);
          break;
        case 'upper':
        case 'lower':
        case 'special':
          this.renderCategoryRow(row, isTwoCol);
          break;
        case 'bonus':
          this.renderBonusRow(row, isTwoCol);
          break;
        case 'total':
          this.renderTotalRow(row, isTwoCol);
          break;
      }
    }
  }

  /** Render a section header */
  private renderHeader(row: RowLayout, _isTwoCol: boolean): void {
    const section = row.label === 'UPPER' || row.label === 'UPPER SECTION' ? 'upper'
      : row.label === 'LOWER' || row.label === 'LOWER SECTION' ? 'lower'
      : 'special';

    const headerColors = {
      upper: PANEL_COLORS.upperHeader,
      lower: PANEL_COLORS.lowerHeader,
      special: PANEL_COLORS.specialHeader,
    };
    const borderColors = {
      upper: PANEL_COLORS.upperBorder,
      lower: PANEL_COLORS.lowerBorder,
      special: PANEL_COLORS.specialBorder,
    };

    const bg = this.scene.add.rectangle(row.x, row.y, row.width, row.height, headerColors[section], 0.7);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, borderColors[section], 0.5);
    this.container.add(bg);

    // For expansion header, we add helper text too
    if (row.label === 'EXPANSION') {
      // Title on left
      const headerText = createText(this.scene, row.x + 8, row.y + row.height / 2, 'EXPANSION', {
        fontSize: FONTS.SIZE_SMALL,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_WARNING,
        fontStyle: 'bold',
      });
      headerText.setOrigin(0, 0.5);
      this.container.add(headerText);

      // Progress text on right
      this.expansionProgressText = createText(this.scene, row.x + row.width - 8, row.y + row.height / 2, '0/13 Scored', {
        fontSize: FONTS.SIZE_SMALL,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SECONDARY,
      });
      this.expansionProgressText.setOrigin(1, 0.5);
      this.container.add(this.expansionProgressText);
    } else {
      // Normal header
      const headerText = createText(this.scene, row.x + 8, row.y + row.height / 2, row.label || '', {
        fontSize: FONTS.SIZE_SMALL,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SECONDARY,
        fontStyle: 'bold',
      });
      headerText.setOrigin(0, 0.5);
      this.container.add(headerText);
    }
  }

  /** Render a category row (upper, lower, or special section) */
  private renderCategoryRow(row: RowLayout, isTwoCol: boolean): void {
    if (!row.categoryId) return;

    const category = this.scorecard.getCategory(row.categoryId);
    if (!category) return;

    const rowColor = this.getRowColorFromLayout(row);

    // Background
    const background = this.scene.add.rectangle(row.x, row.y, row.width, row.height, rowColor);
    background.setOrigin(0, 0);
    this.container.add(background);

    // Category name
    const displayName = isTwoCol
      ? this.getShortCategoryName(row.categoryId)
      : category.name;
    const nameX = row.x + (isTwoCol ? 8 : 14);
    const nameText = createText(this.scene, nameX, row.y + row.height / 2, displayName, {
      fontSize: this.layoutConfig.fontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
    });
    nameText.setOrigin(0, 0.5);
    this.container.add(nameText);

    // Potential text
    const potentialX = isTwoCol
      ? row.x + row.width - 45
      : this.layoutConfig.width - row.x - 85;
    const potentialText = createText(this.scene, potentialX, row.y + row.height / 2, '', {
      fontSize: this.layoutConfig.smallFontSize,
      fontFamily: FONTS.FAMILY,
      color: PANEL_COLORS.textPotential,
    });
    potentialText.setOrigin(0.5, 0.5);
    this.container.add(potentialText);

    // Lock icon
    const lockIcon = this.createLockIcon(potentialX, row.y + row.height / 2, PALETTE.red[400]);
    this.container.add(lockIcon);

    // Score text
    const scoreX = isTwoCol
      ? row.x + row.width - 12
      : this.layoutConfig.width - row.x - 32;
    const scoreText = createText(this.scene, scoreX, row.y + row.height / 2, '', {
      fontSize: this.layoutConfig.scoreFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    scoreText.setOrigin(isTwoCol ? 1 : 0.5, 0.5);
    this.container.add(scoreText);

    // Hit area
    const hitArea = this.scene.add.rectangle(row.x, row.y, row.width, row.height, COLORS.HIGHLIGHT, 0);
    hitArea.setOrigin(0, 0);
    hitArea.setInteractive({ useHandCursor: true });
    this.container.add(hitArea);

    // Hover effects
    hitArea.on('pointerover', () => {
      if (!this.stateManager.isHoverEnabled()) return;
      if (!this.scorecard.isAvailable(row.categoryId!)) return;

      this.container.bringToTop(background);
      this.container.bringToTop(nameText);
      this.container.bringToTop(potentialText);
      this.container.bringToTop(scoreText);
      this.container.bringToTop(hitArea);

      if (this.stateManager.getGauntletMode()) {
        background.setFillStyle(PALETTE.green[700]);
        background.setStrokeStyle(2, PALETTE.green[400]);
      } else {
        background.setFillStyle(PANEL_COLORS.rowHover);
        background.setStrokeStyle(2, PALETTE.green[500]);
      }
      this.events.emit('ui:categoryHover', { categoryId: row.categoryId! });
    });

    hitArea.on('pointerout', () => {
      const cat = this.scorecard.getCategory(row.categoryId!);
      if (cat && cat.score !== null) {
        background.setFillStyle(PANEL_COLORS.rowFilled);
        background.setStrokeStyle(0);
        nameText.setColor(COLORS.TEXT_SECONDARY);
      } else if (this.stateManager.getGauntletMode() && this.scorecard.isAvailable(row.categoryId!)) {
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
      if (this.stateManager.isInputLockedState()) return;
      if (!this.stateManager.isAllowed(row.categoryId!)) return;
      if (!this.scorecard.isAvailable(row.categoryId!)) return;

      this.lockInput();
      this.events.emit('score:category', { categoryId: row.categoryId!, dice: this.stateManager.getDice() });
    });

    // Store row reference
    this.categoryRows.set(row.categoryId, {
      id: row.categoryId,
      nameText,
      scoreText,
      potentialText,
      lockIcon,
      background,
      hitArea,
      rowColor,
    });
  }

  /** Render bonus row */
  private renderBonusRow(row: RowLayout, isTwoCol: boolean): void {
    const background = this.scene.add.rectangle(row.x, row.y, row.width, row.height, PALETTE.gold[800], 0.3);
    background.setOrigin(0, 0);
    this.container.add(background);

    // Label with progress
    const labelX = row.x + (isTwoCol ? 6 : 14);
    this.bonusProgressText = createText(this.scene, labelX, row.y + row.height / 2, 'Upper (0) >= 63', {
      fontSize: this.layoutConfig.smallFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    this.bonusProgressText.setOrigin(0, 0.5);
    this.container.add(this.bonusProgressText);

    // Bonus earned text
    const bonusX = isTwoCol
      ? row.x + row.width - 12
      : this.layoutConfig.width - row.x - 32;
    this.bonusText = createText(this.scene, bonusX, row.y + row.height / 2, '+0', {
      fontSize: this.layoutConfig.scoreFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_MUTED,
      fontStyle: 'bold',
    });
    this.bonusText.setOrigin(isTwoCol ? 1 : 0.5, 0.5);
    this.container.add(this.bonusText);
  }

  /** Render total row */
  private renderTotalRow(row: RowLayout, isTwoCol: boolean): void {
    // Divider line above (for single-column)
    if (!isTwoCol) {
      const divider = this.scene.add.rectangle(row.x, row.y - 1, row.width, 1, PALETTE.purple[500], 0.5);
      divider.setOrigin(0, 0);
      this.container.add(divider);
    }

    const background = this.scene.add.rectangle(row.x, row.y, row.width, row.height, PALETTE.purple[700], 0.4);
    background.setOrigin(0, 0);
    this.container.add(background);

    // Total label with threshold
    const labelX = row.x + (isTwoCol ? 6 : 14);
    const thresholdLabel = createText(this.scene, labelX, row.y + row.height / 2, `TOTAL (${this.passThreshold}+ to pass)`, {
      fontSize: this.layoutConfig.smallFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    thresholdLabel.setOrigin(0, 0.5);
    this.container.add(thresholdLabel);

    // Progress text for gauntlet (X/13)
    if (this.stateManager.getGauntletMode()) {
      this.categoryProgressText = createText(this.scene, row.x + row.width / 2, row.y + row.height / 2, '0/13', {
        fontSize: this.layoutConfig.smallFontSize,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SECONDARY,
      });
      this.categoryProgressText.setOrigin(0.5, 0.5);
      this.container.add(this.categoryProgressText);
    }

    // Total score
    const totalX = isTwoCol
      ? row.x + row.width - 12
      : this.layoutConfig.width - row.x - 32;
    this.totalText = createText(this.scene, totalX, row.y + row.height / 2, '0', {
      fontSize: this.layoutConfig.scoreFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    this.totalText.setOrigin(isTwoCol ? 1 : 0.5, 0.5);
    this.container.add(this.totalText);
  }

  /** Get row color based on section and isEven flag from RowLayout */
  private getRowColorFromLayout(row: RowLayout): number {
    const colors = {
      upper: { even: PANEL_COLORS.upperRowEven, odd: PANEL_COLORS.upperRowOdd },
      lower: { even: PANEL_COLORS.lowerRowEven, odd: PANEL_COLORS.lowerRowOdd },
      special: { even: PANEL_COLORS.specialRowEven, odd: PANEL_COLORS.specialRowOdd },
    };
    const section = row.section as 'upper' | 'lower' | 'special';
    return row.isEven ? colors[section].even : colors[section].odd;
  }

  /** Get short category name for compact display */
  private getShortCategoryName(id: CategoryId): string {
    const shortNames: Record<string, string> = {
      ones: '1s', twos: '2s', threes: '3s', fours: '4s', fives: '5s', sixes: '6s',
      threeOfAKind: '3 of Kind', fourOfAKind: '4 of Kind', fullHouse: 'Full House',
      smallStraight: 'Sm Straight', largeStraight: 'Lg Straight', fiveDice: '5 Dice!',
      chance: 'Chance', twoPair: 'Two Pair', allOdd: 'All Odd', allEven: 'All Even', allHigh: 'All High',
    };
    return shortNames[id] || id;
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Update dice values
   */
  setDice(dice: number[]): void {
    this.stateManager.setDice(dice);
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

      const isLocked = this.stateManager.isLocked(id);

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
        const potential = this.scorecard.calculatePotential(id, this.stateManager.getDice());
        row.scoreText.setText('');
        row.potentialText.setText(potential > 0 ? `+${potential}` : '0');
        row.potentialText.setColor(potential > 0 ? PANEL_COLORS.textPotential : COLORS.TEXT_MUTED);
        row.lockIcon.setVisible(false);
        row.background.setFillStyle(row.rowColor);
        row.hitArea.setInteractive({ useHandCursor: true });
        row.nameText.setColor(COLORS.TEXT_PRIMARY);

        row.background.setStrokeStyle(0);

        // Gauntlet mode: highlight available categories in green with pulse
        if (this.stateManager.getGauntletMode()) {
          row.nameText.setColor(COLORS.TEXT_SUCCESS);
          row.background.setFillStyle(PALETTE.green[900]);
          row.background.setStrokeStyle(2, PALETTE.green[500], 0.8);
          // Note: Pulse tweens are created after the loop to avoid stopping/recreating
        }
      }
    }

    // Gauntlet mode: Manage pulse tweens for available categories
    if (this.stateManager.getGauntletMode()) {
      // Build set of currently available category IDs
      const availableIds = new Set<CategoryId>();
      for (const [id] of this.categoryRows) {
        const cat = this.scorecard.getCategory(id);
        const isLocked = this.stateManager.isLocked(id);
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
      // Check if all upper categories are filled
      const upperCategories = this.scorecard.getUpperSection();
      const allUppersFilled = upperCategories.every(c => c.score !== null);

      // Two-column: inline format "Upper (X) >= 63"
      if (this.layout === 'two-column') {
        this.bonusProgressText.setText(`Upper (${upperSubtotal}) >= 63`);
        // Keep label gold/amber - only the score value turns green
        this.bonusProgressText.setColor(COLORS.TEXT_WARNING);
        // Show 35 if earned, 0 if all filled but not earned, empty if still in progress
        if (bonus > 0) {
          this.bonusText.setText('35');
          this.bonusText.setColor(COLORS.TEXT_SUCCESS);
        } else if (allUppersFilled) {
          this.bonusText.setText('0');
          this.bonusText.setColor(COLORS.TEXT_PRIMARY);
        } else {
          this.bonusText.setText('');
        }
      } else {
        // Single-column: progress format "X/63"
        this.bonusProgressText.setText(`${upperSubtotal}/63`);
        this.bonusProgressText.setColor(upperSubtotal >= 63 ? COLORS.TEXT_SUCCESS : COLORS.TEXT_MUTED);
        if (bonus > 0) {
          this.bonusText.setText('+35');
          this.bonusText.setColor(COLORS.TEXT_SUCCESS);
        } else if (allUppersFilled) {
          this.bonusText.setText('0');
          this.bonusText.setColor(COLORS.TEXT_PRIMARY);
        } else {
          this.bonusText.setText('');
        }
      }
    }

    if (this.totalText) {
      const total = this.scorecard.getTotal();
      // Two-column uses combined "score/threshold" format
      if (this.layout === 'two-column') {
        this.totalText.setText(`${total}/${this.passThreshold}`);
      } else {
        this.totalText.setText(total.toString());
      }
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
    this.stateManager.reset(); // Resets dice, locked categories, gauntlet mode, input, etc.
    // Stop gauntlet pulse tweens
    this.gauntletPulseTweens.forEach(tween => tween.stop());
    this.gauntletPulseTweens.clear();

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
    this.stateManager.setGauntletMode(enabled);
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
    this.stateManager.setLockedCategories(locked);
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
    return this.stateManager.isLocked(categoryId);
  }

  /**
   * Get container for positioning
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Get the bounding box of the scorecard panel
   */
  getBounds(): { x: number; y: number; width: number; height: number } {
    // Use layoutConfig dimensions (computed from modular layout calculator)
    return {
      x: this.config.x,
      y: this.config.y,
      width: this.layoutConfig.width,
      height: this.layoutConfig.height,
    };
  }

  /**
   * Lock input to prevent multi-click exploit after scoring
   * Call this immediately after a category is selected
   */
  lockInput(): void {
    this.stateManager.lockInput();
  }

  /**
   * Unlock input after dice are rolled
   */
  unlockInput(): void {
    this.stateManager.unlockInput();
  }

  /**
   * Disable all interactivity (used when game ends)
   */
  disableInteractivity(): void {
    for (const row of this.categoryRows.values()) {
      row.hitArea.disableInteractive();
    }
  }

  // ===========================================================================
  // TUTORIAL MODE CONTROLS
  // ===========================================================================

  /**
   * Set which categories can be clicked (null = all available)
   * Used by tutorial to restrict selection to specific categories
   */
  setAllowedCategories(categories: CategoryId[] | null): void {
    this.stateManager.setAllowedCategories(categories);
  }

  /**
   * Enable/disable hover visual effects
   * Used by tutorial to prevent distracting hover states
   */
  setHoverEnabled(enabled: boolean): void {
    this.stateManager.setHoverEnabled(enabled);
  }

  /**
   * Highlight a specific category (cleanup only - TutorialOverlay handles the visual)
   */
  highlightCategory(_categoryId: CategoryId | null): void {
    // Clear existing highlight
    if (this.highlightPulseTween) {
      this.highlightPulseTween.stop();
      this.highlightPulseTween = null;
    }
    if (this.highlightGraphics) {
      this.highlightGraphics.destroy();
      this.highlightGraphics = null;
    }
    // Visual highlight is now handled by TutorialOverlay
  }

  /**
   * Get the bounds of a specific category row for tutorial highlighting
   */
  getCategoryBounds(categoryId: CategoryId): Bounds | null {
    const row = this.categoryRows.get(categoryId);
    if (!row) return null;

    // Get the background rectangle bounds
    const bg = row.background;
    return {
      x: this.config.x + bg.x,
      y: this.config.y + bg.y,
      width: bg.width,
      height: bg.height,
    };
  }

  // ===========================================================================
  // TUTORIAL INTERFACE METHODS
  // ===========================================================================

  /**
   * Set tutorial mode restrictions (implements TutorialControllableScorecard)
   */
  setTutorialMode(actions: ScorecardAllowedActions): void {
    this.setAllowedCategories(actions.allowedCategories);
    this.setHoverEnabled(actions.hoverEnabled);
    this.highlightCategory(actions.highlightCategory);
  }

  /**
   * Reset all tutorial mode restrictions (implements TutorialControllableScorecard)
   */
  resetTutorialMode(): void {
    this.setAllowedCategories(null);
    this.setHoverEnabled(true);
    this.highlightCategory(null);
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
    this.flashTweens.forEach(tween => {
      if (tween.isPlaying()) tween.stop();
    });
    this.flashTweens = [];

    // Clean up tutorial highlight
    if (this.highlightPulseTween) {
      this.highlightPulseTween.stop();
      this.highlightPulseTween = null;
    }
    if (this.highlightGraphics) {
      this.highlightGraphics.destroy();
      this.highlightGraphics = null;
    }

    this.container.destroy();
  }
}
