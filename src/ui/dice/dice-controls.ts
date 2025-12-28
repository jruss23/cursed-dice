/**
 * Dice Controls Panel
 * Reusable component for roll button and rerolls display
 *
 * Uses values from GameplayLayout.controls - no local sizing calculations.
 */

import Phaser from 'phaser';
import { FONTS, SIZES, PALETTE, COLORS, type GameplayLayout } from '@/config';
import { createText, createPanelFrame, addPanelFrameToContainer } from '@/ui/ui-utils';

// =============================================================================
// TYPES
// =============================================================================

/** Controls layout from GameplayLayout.controls */
type ControlsLayout = GameplayLayout['controls'];

/** Sizing values extracted from layout */
interface DiceControlsSizing {
  colWidth: number;
  panelHeight: number;
  rollButtonHeight: number;
  dividerPadding: number;
  rollButtonWidth: number;
  rollFontSize: string;
  glowPaddingX: number;
  glowPaddingY: number;
  labelValueGap: number;
  compactMeetOffset: number;
  useCompactLayout: boolean;
}

export interface DiceControlsConfig {
  scene: Phaser.Scene;
  /** Layout values from GameplayLayout.controls */
  layout: ControlsLayout;
  includeBlessingSlot?: boolean;
  initialRerolls?: number;
  onRoll: () => void;
}

export class DiceControls {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private rerollText: Phaser.GameObjects.Text | null = null;
  private rollButton: Phaser.GameObjects.Rectangle | null = null;
  private rollButtonGlow: Phaser.GameObjects.Rectangle | null = null;

  // Dimensions (stored for external access)
  private panelWidth: number;
  private panelHeight: number;
  private rollButtonHeight: number;
  private colWidth: number;

  // Config
  private includeBlessingSlot: boolean;
  private sizing: DiceControlsSizing;

  constructor(config: DiceControlsConfig) {
    this.scene = config.scene;
    this.includeBlessingSlot = config.includeBlessingSlot ?? false;

    const { layout } = config;

    // Extract sizing from layout (single source of truth)
    this.sizing = {
      colWidth: layout.colWidth,
      panelHeight: layout.height,
      rollButtonHeight: layout.buttonHeight,
      dividerPadding: layout.dividerPadding,
      rollButtonWidth: layout.buttonWidth,
      rollFontSize: layout.fontSize,
      glowPaddingX: layout.glowPaddingX,
      glowPaddingY: layout.glowPaddingY,
      labelValueGap: layout.labelValueGap,
      compactMeetOffset: layout.compactMeetOffset,
      useCompactLayout: layout.useCompactLayout,
    };

    // Column-based layout: divide panel into equal columns
    const numCols = this.includeBlessingSlot ? 3 : 2;
    this.colWidth = this.sizing.colWidth;
    this.panelWidth = numCols * this.colWidth;
    this.panelHeight = this.sizing.panelHeight;
    this.rollButtonHeight = this.sizing.rollButtonHeight;

    const panelX = layout.centerX - this.panelWidth / 2;
    const panelY = layout.centerY - this.panelHeight / 2;

    // Panel container
    this.container = this.scene.add.container(panelX, panelY);

    this.build(numCols, config.initialRerolls ?? 3, config.onRoll);
  }

  private build(numCols: number, initialRerolls: number, onRoll: () => void): void {
    // Panel frame (glow, background, corners)
    const frame = createPanelFrame(this.scene, {
      x: 0,
      y: 0,
      width: this.panelWidth,
      height: this.panelHeight,
      glowAlpha: 0.06,
      bgAlpha: 0.88,
      borderAlpha: 0.5,
      borderWidth: SIZES.PANEL_BORDER_WIDTH,
      cornerAlpha: 0.4,
    });
    addPanelFrameToContainer(this.container, frame);

    const rowY = this.panelHeight / 2;
    const dividerPadding = this.sizing.dividerPadding;

    // Calculate column centers
    // With blessing: [Blessing] | [Rerolls] | [Roll]
    // Without:       [Rerolls] | [Roll]
    const getColCenter = (colIndex: number) => this.colWidth * colIndex + this.colWidth / 2;
    const rerollsColX = this.includeBlessingSlot ? getColCenter(1) : getColCenter(0);
    const rollColX = this.includeBlessingSlot ? getColCenter(2) : getColCenter(1);

    // Add dividers between columns
    for (let i = 1; i < numCols; i++) {
      const dividerX = i * this.colWidth;
      const divider = this.scene.add.rectangle(
        dividerX, rowY, 1, this.panelHeight - dividerPadding, PALETTE.purple[500], 0.35
      );
      this.container.add(divider);
    }

    // Rerolls display - centered in its column
    this.createRerollsDisplay(rerollsColX, rowY, initialRerolls);

    // Roll button - centered in its column
    this.createRollButton(rollColX, rowY, onRoll);
  }

  private createRerollsDisplay(colX: number, rowY: number, initialRerolls: number): void {
    if (this.sizing.useCompactLayout) {
      // Compact horizontal layout: "REROLLS: 2"
      // Offset meeting point right to visually center the combined text
      const meetPoint = colX + this.sizing.compactMeetOffset;
      const rerollsLabel = createText(this.scene, meetPoint, rowY, 'REROLLS: ', {
        fontSize: FONTS.SIZE_SMALL,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_PRIMARY,
        fontStyle: 'bold',
      });
      rerollsLabel.setOrigin(1, 0.5);
      this.container.add(rerollsLabel);

      this.rerollText = createText(this.scene, meetPoint, rowY, `${initialRerolls}`, {
        fontSize: FONTS.SIZE_BODY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SUCCESS,
        fontStyle: 'bold',
      });
      this.rerollText.setOrigin(0, 0.5);
      this.container.add(this.rerollText);
    } else {
      // Desktop: stacked vertical layout - both centered
      const gap = this.sizing.labelValueGap;
      const rerollsLabel = createText(this.scene, colX, rowY - gap, 'REROLLS', {
        fontSize: FONTS.SIZE_SMALL,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_PRIMARY,
        fontStyle: 'bold',
      });
      rerollsLabel.setOrigin(0.5, 0.5);
      this.container.add(rerollsLabel);

      this.rerollText = createText(this.scene, colX, rowY + gap, `${initialRerolls}`, {
        fontSize: FONTS.SIZE_HEADING,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SUCCESS,
        fontStyle: 'bold',
      });
      this.rerollText.setOrigin(0.5, 0.5);
      this.container.add(this.rerollText);
    }
  }

  private createRollButton(colX: number, rowY: number, onRoll: () => void): void {
    const btnWidth = this.sizing.rollButtonWidth;

    // Glow behind button
    this.rollButtonGlow = this.scene.add.rectangle(
      colX, rowY,
      btnWidth + this.sizing.glowPaddingX * 2,
      this.rollButtonHeight + this.sizing.glowPaddingY * 2,
      PALETTE.green[500], 0.12
    );
    this.container.add(this.rollButtonGlow);

    // Button
    this.rollButton = this.scene.add.rectangle(
      colX, rowY,
      btnWidth, this.rollButtonHeight,
      PALETTE.green[700], 0.95
    );
    this.rollButton.setStrokeStyle(2, PALETTE.green[500]);
    this.rollButton.setInteractive({ useHandCursor: true });
    this.container.add(this.rollButton);

    // Button text
    const rollText = createText(this.scene, colX, rowY, 'ROLL', {
      fontSize: this.sizing.rollFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    rollText.setOrigin(0.5, 0.5);
    this.container.add(rollText);

    // Interactions
    this.rollButton.on('pointerover', () => {
      this.rollButton?.setFillStyle(PALETTE.green[600], 1);
      this.rollButton?.setStrokeStyle(2, PALETTE.green[400]);
      this.rollButtonGlow?.setAlpha(0.25);
    });

    this.rollButton.on('pointerout', () => {
      this.rollButton?.setFillStyle(PALETTE.green[700], 0.95);
      this.rollButton?.setStrokeStyle(2, PALETTE.green[500]);
      this.rollButtonGlow?.setAlpha(0.12);
    });

    this.rollButton.on('pointerdown', onRoll);
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Update rerolls display
   */
  setRerolls(count: number): void {
    if (!this.rerollText) return;
    this.rerollText.setText(`${count}`);
    this.rerollText.setColor(count > 0 ? COLORS.TEXT_SUCCESS : COLORS.TEXT_DANGER);
  }

  /**
   * Enable/disable the roll button
   */
  setEnabled(enabled: boolean): void {
    if (!this.rollButton) return;

    if (enabled) {
      this.rollButton.setFillStyle(PALETTE.green[700], 0.95);
      this.rollButton.setStrokeStyle(2, PALETTE.green[500]);
      this.rollButton.setInteractive({ useHandCursor: true });
      this.rollButtonGlow?.setAlpha(0.12);
    } else {
      this.rollButton.setFillStyle(PALETTE.neutral[700], 0.8);
      this.rollButton.setStrokeStyle(2, PALETTE.neutral[500]);
      // Use disableInteractive() instead of removeInteractive() to preserve event listeners
      this.rollButton.disableInteractive();
      this.rollButtonGlow?.setAlpha(0.05);
    }
  }

  /**
   * Flash the reroll text (visual feedback when no rerolls left)
   */
  flashRerollText(): void {
    if (!this.rerollText) return;
    this.scene.tweens.add({
      targets: this.rerollText,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 2,
    });
  }

  /**
   * Get container for external positioning
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Get panel height
   */
  getPanelHeight(): number {
    return this.panelHeight;
  }

  /**
   * Get roll button height (for matching blessing button)
   */
  getRollButtonHeight(): number {
    return this.rollButtonHeight;
  }

  /**
   * Get the position and height for the blessing button within the controls panel
   * Returns null if blessing slot is not enabled
   */
  getBlessingButtonPosition(): { x: number; y: number; height: number } | null {
    if (!this.includeBlessingSlot) return null;

    // Blessing button is centered in column 0
    const colCenter = this.colWidth / 2;
    return {
      x: this.container.x + colCenter,
      y: this.container.y + this.panelHeight / 2,
      height: this.rollButtonHeight,
    };
  }

  /**
   * Get bounds
   */
  getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.container.x,
      y: this.container.y,
      width: this.panelWidth,
      height: this.panelHeight,
    };
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    this.container.destroy();
  }
}
