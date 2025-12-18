/**
 * Scorecard UI Panel
 * Displays the Yahtzee scorecard and handles category selection
 */

import Phaser from 'phaser';
import { type Scorecard, type CategoryId, type Category } from '@/systems/scorecard';
import { GameEventEmitter } from '@/systems/game-events';
import { COLORS, FONTS, SIZES, GAME_RULES } from '@/config';

export interface ScorecardPanelConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

interface CategoryRow {
  id: CategoryId;
  nameText: Phaser.GameObjects.Text;
  scoreText: Phaser.GameObjects.Text;
  potentialText: Phaser.GameObjects.Text;
  background: Phaser.GameObjects.Rectangle;
  hitArea: Phaser.GameObjects.Rectangle;
  rowColor: number;
}

// Panel-specific styling (extends global theme)
const PANEL_COLORS = {
  background: 0x12121a,
  // Upper section - blue tint
  upperRowEven: 0x1a2a4a,
  upperRowOdd: 0x152238,
  upperHeader: 0x2a4a7a,
  upperBorder: 0x4a7aaa,
  // Lower section - purple tint
  lowerRowEven: 0x2a1a4a,
  lowerRowOdd: 0x221538,
  lowerHeader: 0x4a2a7a,
  lowerBorder: 0x7a4aaa,
  // Interaction states
  rowHover: 0x2a6a3e,
  rowFilled: 0x1a3a2a,
  // Text colors
  textPotential: '#66ff66',
  border: 0x3a3a5a,
} as const;

// Colors for locked categories (Modes 3 & 4)
const LOCKED_CATEGORY_COLOR = 0x1a1a1a;
const LOCKED_CATEGORY_BORDER = 0x4a4a4a;

export class ScorecardPanel {
  private scene: Phaser.Scene;
  private scorecard: Scorecard;
  private events: GameEventEmitter;
  private config: ScorecardPanelConfig;
  private container: Phaser.GameObjects.Container;
  private categoryRows: Map<CategoryId, CategoryRow> = new Map();
  private currentDice: number[] = Array(GAME_RULES.DICE_COUNT).fill(1);
  private lockedCategories: Set<CategoryId> = new Set(); // Mode 3 & 4: locked categories

  // UI elements
  private totalText: Phaser.GameObjects.Text | null = null;
  private upperSubtotalText: Phaser.GameObjects.Text | null = null;
  private lowerSubtotalText: Phaser.GameObjects.Text | null = null;
  private bonusText: Phaser.GameObjects.Text | null = null;
  private bonusProgressText: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    scorecard: Scorecard,
    events: GameEventEmitter,
    config: ScorecardPanelConfig
  ) {
    this.scene = scene;
    this.scorecard = scorecard;
    this.events = events;
    this.config = {
      ...config,
      width: config.width ?? SIZES.SCORECARD_WIDTH,
      height: config.height ?? SIZES.SCORECARD_HEIGHT,
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
    this.events.on('dice:rolled', ({ values }) => {
      this.setDice(values);
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

  private build(): void {
    const width = this.config.width!;
    const height = this.config.height!;

    // Main background
    const bg = this.scene.add.rectangle(0, 0, width, height, PANEL_COLORS.background);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, PANEL_COLORS.border);
    this.container.add(bg);

    // Title
    const title = this.createText(width / 2, 10, 'SCORECARD', {
      fontSize: '16px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0);
    this.container.add(title);

    let y = 35;

    // Upper section
    y = this.addSectionHeader('UPPER SECTION', y, 'upper');
    const upperCategories = this.scorecard.getUpperSection();
    for (let i = 0; i < upperCategories.length; i++) {
      y = this.addCategoryRow(upperCategories[i], y, i % 2 === 0, 'upper');
    }

    // Upper subtotal & bonus
    y = this.addSubtotalRow('Subtotal', y, 'upperSubtotal', 'upper');
    y = this.addBonusRow(y);

    // Divider
    y += 4;
    const divider = this.scene.add.rectangle(0, y, width, 3, 0x666666);
    divider.setOrigin(0, 0);
    this.container.add(divider);
    y += 7;

    // Lower section
    y = this.addSectionHeader('LOWER SECTION', y, 'lower');
    const lowerCategories = this.scorecard.getLowerSection();
    for (let i = 0; i < lowerCategories.length; i++) {
      y = this.addCategoryRow(lowerCategories[i], y, i % 2 === 0, 'lower');
    }

    // Lower subtotal
    y = this.addLowerSubtotalRow(y);
    y += 6;

    // Grand total
    this.addTotalRow(y);
  }

  private addSectionHeader(text: string, y: number, section: 'upper' | 'lower'): number {
    const width = this.config.width!;
    const headerColor = section === 'upper' ? PANEL_COLORS.upperHeader : PANEL_COLORS.lowerHeader;
    const borderColor = section === 'upper' ? PANEL_COLORS.upperBorder : PANEL_COLORS.lowerBorder;

    const header = this.scene.add.rectangle(0, y, width, 22, headerColor);
    header.setOrigin(0, 0);
    header.setStrokeStyle(1, borderColor);
    this.container.add(header);

    // Left accent bar
    const accent = this.scene.add.rectangle(0, y, 4, 22, borderColor);
    accent.setOrigin(0, 0);
    this.container.add(accent);

    const headerText = this.createText(14, y + 4, text, {
      fontSize: '11px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    this.container.add(headerText);

    return y + 22;
  }

  private addCategoryRow(
    category: Category,
    y: number,
    isEven: boolean,
    section: 'upper' | 'lower'
  ): number {
    const width = this.config.width!;
    const rowColor =
      section === 'upper'
        ? isEven
          ? PANEL_COLORS.upperRowEven
          : PANEL_COLORS.upperRowOdd
        : isEven
          ? PANEL_COLORS.lowerRowEven
          : PANEL_COLORS.lowerRowOdd;

    // Background
    const background = this.scene.add.rectangle(0, y, width, SIZES.SCORECARD_ROW_HEIGHT, rowColor);
    background.setOrigin(0, 0);
    this.container.add(background);

    // Category name
    const nameText = this.createText(10, y + 8, category.name, {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
    });
    this.container.add(nameText);

    // Potential score
    const potentialText = this.createText(width - 80, y + 8, '', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: PANEL_COLORS.textPotential,
    });
    potentialText.setOrigin(0.5, 0);
    this.container.add(potentialText);

    // Actual score
    const scoreText = this.createText(width - 30, y + 8, '', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    scoreText.setOrigin(0.5, 0);
    this.container.add(scoreText);

    // Hit area for interaction
    const hitArea = this.scene.add.rectangle(0, y, width, SIZES.SCORECARD_ROW_HEIGHT, 0xffffff, 0);
    hitArea.setOrigin(0, 0);
    hitArea.setInteractive({ useHandCursor: true });
    this.container.add(hitArea);

    // Hover effects
    hitArea.on('pointerover', () => {
      if (this.scorecard.isAvailable(category.id)) {
        background.setFillStyle(PANEL_COLORS.rowHover);
        background.setStrokeStyle(2, 0x44ff44);
        potentialText.setFontStyle('bold');
        this.events.emit('ui:categoryHover', { categoryId: category.id });
      }
    });

    hitArea.on('pointerout', () => {
      const cat = this.scorecard.getCategory(category.id);
      background.setStrokeStyle(0);
      potentialText.setFontStyle('normal');
      if (cat && cat.score !== null) {
        background.setFillStyle(PANEL_COLORS.rowFilled);
      } else {
        background.setFillStyle(rowColor);
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
      background,
      hitArea,
      rowColor,
    });

    return y + SIZES.SCORECARD_ROW_HEIGHT;
  }

  private addSubtotalRow(
    label: string,
    y: number,
    id: string,
    _section: 'upper' | 'lower'
  ): number {
    const width = this.config.width!;

    const bg = this.scene.add.rectangle(0, y, width, 24, 0x0a1520);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x3a5a7a);
    this.container.add(bg);

    const labelText = this.createText(10, y + 5, label, {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: '#88aacc',
      fontStyle: 'bold',
    });
    this.container.add(labelText);

    const valueBox = this.scene.add.rectangle(width - 35, y + 12, 50, 18, 0x1a3a5a);
    valueBox.setStrokeStyle(1, 0x4a7aaa);
    this.container.add(valueBox);

    const valueText = this.createText(width - 35, y + 5, '0', {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    valueText.setOrigin(0.5, 0);
    this.container.add(valueText);

    if (id === 'upperSubtotal') {
      this.upperSubtotalText = valueText;
    }

    return y + 24;
  }

  private addBonusRow(y: number): number {
    const width = this.config.width!;

    const bg = this.scene.add.rectangle(0, y, width, 26, 0x2a2510);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x6a5a2a);
    this.container.add(bg);

    const star = this.createText(10, y + 5, '★', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: '#ffcc00',
    });
    this.container.add(star);

    const labelText = this.createText(28, y + 6, 'BONUS', {
      fontSize: '11px',
      fontFamily: FONTS.FAMILY,
      color: '#ffdd66',
      fontStyle: 'bold',
    });
    this.container.add(labelText);

    this.bonusProgressText = this.createText(width - 95, y + 6, '0/63 → +35', {
      fontSize: '10px',
      fontFamily: FONTS.FAMILY,
      color: '#aa9944',
    });
    this.bonusProgressText.setOrigin(0.5, 0);
    this.container.add(this.bonusProgressText);

    const valueBox = this.scene.add.rectangle(width - 35, y + 13, 50, 18, 0x4a4520);
    valueBox.setStrokeStyle(1, 0x8a7a3a);
    this.container.add(valueBox);

    this.bonusText = this.createText(width - 35, y + 6, '0', {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: '#ffee00',
      fontStyle: 'bold',
    });
    this.bonusText.setOrigin(0.5, 0);
    this.container.add(this.bonusText);

    return y + 26;
  }

  private addLowerSubtotalRow(y: number): number {
    const width = this.config.width!;

    const bg = this.scene.add.rectangle(0, y, width, 24, 0x150a20);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x5a3a7a);
    this.container.add(bg);

    const labelText = this.createText(10, y + 5, 'Subtotal', {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: '#aa88cc',
      fontStyle: 'bold',
    });
    this.container.add(labelText);

    const valueBox = this.scene.add.rectangle(width - 35, y + 12, 50, 18, 0x2a1a4a);
    valueBox.setStrokeStyle(1, 0x6a4a9a);
    this.container.add(valueBox);

    this.lowerSubtotalText = this.createText(width - 35, y + 5, '0', {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    this.lowerSubtotalText.setOrigin(0.5, 0);
    this.container.add(this.lowerSubtotalText);

    return y + 24;
  }

  private addTotalRow(y: number): number {
    const width = this.config.width!;

    const bg = this.scene.add.rectangle(0, y, width, 32, 0x0a2a15);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, 0x2a6a3a);
    this.container.add(bg);

    const trophy = this.createText(10, y + 7, '🏆', { fontSize: '16px', fontFamily: FONTS.FAMILY });
    this.container.add(trophy);

    const labelText = this.createText(34, y + 8, 'TOTAL', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: '#66ff88',
      fontStyle: 'bold',
    });
    this.container.add(labelText);

    const valueBox = this.scene.add.rectangle(width - 40, y + 16, 60, 22, 0x1a4a2a);
    valueBox.setStrokeStyle(2, 0x4a8a5a);
    this.container.add(valueBox);

    this.totalText = this.createText(width - 40, y + 8, '0', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: '#44ff66',
      fontStyle: 'bold',
    });
    this.totalText.setOrigin(0.5, 0);
    this.container.add(this.totalText);

    return y + 32;
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
        row.background.setFillStyle(PANEL_COLORS.rowFilled);
        row.background.setStrokeStyle(0);
        row.hitArea.disableInteractive();
        row.nameText.setColor(COLORS.TEXT_PRIMARY);
      } else if (isLocked) {
        // Category is locked (Mode 3 & 4)
        row.scoreText.setText('');
        row.potentialText.setText('🔒');
        row.potentialText.setColor('#666666');
        row.background.setFillStyle(LOCKED_CATEGORY_COLOR);
        row.background.setStrokeStyle(1, LOCKED_CATEGORY_BORDER);
        row.hitArea.disableInteractive();
        row.nameText.setColor('#555555');
      } else {
        // Category available
        const potential = this.scorecard.calculatePotential(id, this.currentDice);
        row.scoreText.setText('');
        row.potentialText.setText(potential > 0 ? `+${potential}` : '0');
        row.potentialText.setColor(potential > 0 ? PANEL_COLORS.textPotential : COLORS.TEXT_MUTED);
        row.background.setFillStyle(row.rowColor);
        row.background.setStrokeStyle(0);
        row.hitArea.setInteractive({ useHandCursor: true });
        row.nameText.setColor(COLORS.TEXT_PRIMARY);
      }
    }

    // Update totals
    const upperSubtotal = this.scorecard.getUpperSubtotal();
    const bonus = this.scorecard.getUpperBonus();
    const lowerSubtotal = this.scorecard.getLowerTotal();

    if (this.upperSubtotalText) {
      this.upperSubtotalText.setText(upperSubtotal.toString());
    }

    if (this.bonusProgressText) {
      if (upperSubtotal >= GAME_RULES.UPPER_BONUS_THRESHOLD) {
        this.bonusProgressText.setText('EARNED!');
        this.bonusProgressText.setColor(COLORS.TEXT_SUCCESS);
      } else {
        this.bonusProgressText.setText(`${upperSubtotal}/${GAME_RULES.UPPER_BONUS_THRESHOLD} → +${GAME_RULES.UPPER_BONUS_AMOUNT}`);
        this.bonusProgressText.setColor(upperSubtotal >= 50 ? '#ffcc00' : '#aa9944');
      }
    }

    if (this.bonusText) {
      this.bonusText.setText(bonus > 0 ? `+${bonus}` : '0');
      this.bonusText.setColor(bonus > 0 ? COLORS.TEXT_SUCCESS : '#ffee00');
    }

    if (this.lowerSubtotalText) {
      this.lowerSubtotalText.setText(lowerSubtotal.toString());
    }

    if (this.totalText) {
      this.totalText.setText(this.scorecard.getTotal().toString());
    }
  }

  /**
   * Reset for a new game
   */
  reset(): void {
    this.scorecard.reset();
    this.lockedCategories.clear();
    for (const [, row] of this.categoryRows) {
      row.hitArea.setInteractive({ useHandCursor: true });
      row.scoreText.setText('');
      row.potentialText.setText('');
      row.background.setFillStyle(row.rowColor);
    }
    this.updateDisplay();
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
        this.scene.tweens.add({
          targets: row.background,
          alpha: 0.5,
          duration: 150,
          yoyo: true,
          repeat: 1,
        });
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
   * Destroy the panel
   */
  destroy(): void {
    this.container.destroy();
  }
}
