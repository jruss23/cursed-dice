/**
 * Scorecard UI Panel
 * Displays the dice scorecard and handles category selection
 */

import Phaser from 'phaser';
import { type Scorecard, type CategoryId, type Category } from '@/systems/scorecard';
import { GameEventEmitter } from '@/systems/game-events';
import { FONTS, SIZES, GAME_RULES, PALETTE, COLORS } from '@/config';

export interface ScorecardPanelConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  compact?: boolean; // Smaller row heights for portrait/mobile layout
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
  private isGauntletMode: boolean = false; // Mode 4: limited categories available
  private hasExpansionBlessing: boolean = false; // Blessing of Expansion active (adds categories)
  private gauntletPulseTweens: Map<CategoryId, Phaser.Tweens.Tween> = new Map(); // Pulsing effects by category

  // UI elements
  private totalText: Phaser.GameObjects.Text | null = null;
  private bonusText: Phaser.GameObjects.Text | null = null;
  private bonusProgressText: Phaser.GameObjects.Text | null = null;
  private categoryProgressText: Phaser.GameObjects.Text | null = null; // Shows "X/13 filled" in Gauntlet

  // Tween tracking
  private outerGlowTween: Phaser.Tweens.Tween | null = null;
  private flashTweens: Phaser.Tweens.Tween[] = [];

  // Bound event handlers for cleanup
  private onDiceRolled: (payload: { values: number[] }) => void;
  private onLockedCategories: (locked: Set<CategoryId>) => void;
  private onBlessingExpansion: () => void;

  // Content bounds (set during build, used by row methods)
  private contentBounds: { x: number; width: number } = { x: 0, width: 0 };

  // Sizing helpers - compact to fit all content including blessing categories
  private get rowHeight(): number {
    return this.isCompact ? 22 : 24;
  }
  private get headerHeight(): number {
    return this.isCompact ? 18 : 20;
  }
  private get totalRowHeight(): number {
    return this.isCompact ? 22 : 24;
  }
  private get fontSize(): string {
    return this.isCompact ? '11px' : '12px';
  }
  private get smallFontSize(): string {
    return this.isCompact ? '9px' : '10px';
  }
  private get scoreFontSize(): string {
    return this.isCompact ? '12px' : '14px';
  }

  /**
   * Calculate the dynamic height based on whether special section is enabled
   */
  private calculateHeight(): number {
    const contentPadding = 6;
    const titleHeight = this.isCompact ? 24 : 28;
    const titleGap = 2;
    const dividerHeight = 6; // 2 + 1 + 3 for divider gaps
    const totalDividerHeight = 1;
    const bottomPadding = 8;

    // Base content: title + upper section + bonus + lower section + total
    let height = contentPadding + titleHeight + titleGap;
    height += this.headerHeight; // Upper section header
    height += 6 * this.rowHeight; // 6 upper categories
    height += this.rowHeight; // Bonus row
    height += dividerHeight; // Divider between upper and lower
    height += this.headerHeight; // Lower section header
    height += 7 * this.rowHeight; // 7 lower categories
    height += totalDividerHeight; // Line above total
    height += this.totalRowHeight; // Total row
    height += bottomPadding;

    // Add special section if enabled
    if (this.scorecard.isSpecialSectionEnabled()) {
      height += dividerHeight; // Divider before special
      height += this.headerHeight; // Special section header
      height += 3 * this.rowHeight; // 3 special categories
    }

    return height;
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

    // Initialize bound event handlers
    this.onDiceRolled = ({ values }) => this.setDice(values);
    this.onLockedCategories = (locked: Set<CategoryId>) => this.setLockedCategories(locked);
    this.onBlessingExpansion = () => {
      this.hasExpansionBlessing = true;
      this.rebuild();
    };

    // Calculate dynamic height based on current state
    const compactWidth = 300;
    const dynamicHeight = this.calculateHeight();

    this.config = {
      ...config,
      width: config.width ?? (this.isCompact ? compactWidth : SIZES.SCORECARD_WIDTH),
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

    // Rebuild when blessing of expansion is enabled (adds 3 categories)
    this.events.on('blessing:expansion:enable', this.onBlessingExpansion);
  }

  /**
   * Rebuild the scorecard panel with new dimensions
   * Called when blessing of expansion adds 3 new categories
   */
  private rebuild(): void {
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
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  // ===========================================================================
  // UI BUILDING
  // ===========================================================================

  /** Helper to create crisp text on retina displays */
  private createText(
    x: number,
    y: number,
    content: string,
    style: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Text {
    const text = this.scene.add.text(x, y, content, style);
    text.setResolution(window.devicePixelRatio * 2);
    return text;
  }

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

    // Outer glow (stroke only, pulses)
    const outerGlow = this.scene.add.rectangle(width / 2, height / 2, width + 20, height + 20, 0x000000, 0);
    outerGlow.setStrokeStyle(8, PALETTE.purple[500], 0.1);
    this.container.add(outerGlow);

    // Glow pulse animation
    this.outerGlowTween = this.scene.tweens.add({
      targets: outerGlow,
      alpha: 0.15,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Shadow behind panel
    const shadow = this.scene.add.rectangle(width / 2 + 4, height / 2 + 4, width, height, 0x000000, 0.5);
    this.container.add(shadow);

    // Main background (dark, matching menu buttons)
    const panelBg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x0a0a15, 0.9);
    panelBg.setStrokeStyle(3, PALETTE.purple[500], 0.8);
    this.container.add(panelBg);

    // Inner highlight bar at top
    const highlightHeight = this.isCompact ? 8 : 10;
    const innerHighlight = this.scene.add.rectangle(
      width / 2, highlightHeight / 2 + 3,
      width - 20, highlightHeight,
      0xffffff, 0.03
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

    // === CONTENT AREA (inset from panel edges) ===
    const contentPadding = 6;
    const contentX = contentPadding;
    const contentWidth = width - contentPadding * 2;

    // Title area (no background)
    const titleHeight = this.isCompact ? 24 : 28;

    // Title with glow
    const titleFontSize = this.isCompact ? '15px' : '18px';
    const titleY = contentPadding + titleHeight / 2;

    const titleGlow = this.createText(width / 2, titleY, 'SCORECARD', {
      fontSize: titleFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_ACCENT,
      fontStyle: 'bold',
    });
    titleGlow.setOrigin(0.5, 0.5);
    titleGlow.setAlpha(0.3);
    titleGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.container.add(titleGlow);

    const title = this.createText(width / 2, titleY, 'SCORECARD', {
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

      y = this.addSectionHeader('BLESSING BONUS', y, 'special');
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

    const headerText = this.createText(cx + 16, y + height / 2, text, {
      fontSize: this.smallFontSize,
      fontFamily: FONTS.FAMILY,
      color: textColor,
      fontStyle: 'bold',
    });
    headerText.setOrigin(0, 0.5);
    this.container.add(headerText);

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
    const nameText = this.createText(cx + 14, y + height / 2, category.name, {
      fontSize: this.fontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
    });
    nameText.setOrigin(0, 0.5);
    this.container.add(nameText);

    // Potential score
    const potentialText = this.createText(width - cx - 85, y + height / 2, '', {
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
    const scoreText = this.createText(width - cx - 32, y + height / 2, '', {
      fontSize: this.scoreFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    scoreText.setOrigin(0.5, 0.5);
    this.container.add(scoreText);

    // Hit area for interaction
    const hitArea = this.scene.add.rectangle(cx, y, cw, height, 0xffffff, 0);
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
    const labelText = this.createText(cx + 14, y + height / 2, 'Bonus (≥63 = +35)', {
      fontSize: this.fontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
    });
    labelText.setOrigin(0, 0.5);
    this.container.add(labelText);

    // Progress: "12/63" style, positioned like potential score
    this.bonusProgressText = this.createText(width - cx - 85, y + height / 2, '0/63', {
      fontSize: this.fontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_MUTED,
    });
    this.bonusProgressText.setOrigin(0.5, 0.5);
    this.container.add(this.bonusProgressText);

    // Bonus earned: positioned like score column
    this.bonusText = this.createText(width - cx - 32, y + height / 2, '', {
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

    const labelText = this.createText(cx + 14, y + height / 2, 'TOTAL', {
      fontSize: this.isCompact ? '12px' : '14px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    labelText.setOrigin(0, 0.5);
    this.container.add(labelText);

    this.totalText = this.createText(cx + cw - 24, y + height / 2, '0', {
      fontSize: this.isCompact ? '14px' : '16px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    this.totalText.setOrigin(0.5, 0.5);
    this.container.add(this.totalText);

    // Category progress (shown in Gauntlet mode) - positioned between TOTAL and score
    this.categoryProgressText = this.createText(cx + cw / 2, y + height / 2, '', {
      fontSize: this.isCompact ? '10px' : '11px',
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
              duration: 600,
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

    // Update category progress (shown when Blessing of Expansion is active)
    if (this.categoryProgressText) {
      if (this.hasExpansionBlessing) {
        // Count filled vs total categories
        const allCategories = this.scorecard.getCategories();
        const totalCount = allCategories.length;
        const filledCount = allCategories.filter(c => c.score !== null).length;
        const remainingCount = totalCount - filledCount;

        // Count upper section specifically for bonus planning
        const upperIds = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
        const upperFilled = allCategories.filter(c => upperIds.includes(c.id) && c.score !== null).length;
        const upperTotal = 6;

        // Show remaining count and upper progress
        this.categoryProgressText.setText(`${remainingCount} left (top: ${upperFilled}/${upperTotal})`);
        this.categoryProgressText.setVisible(true);
      } else {
        this.categoryProgressText.setVisible(false);
      }
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
    this.hasExpansionBlessing = false;

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
          duration: 150,
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
