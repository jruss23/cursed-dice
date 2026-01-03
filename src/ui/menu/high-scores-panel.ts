/**
 * High Scores Panel
 * Displays saved high scores on the main menu
 */

import Phaser from 'phaser';
import { type Difficulty, DIFFICULTIES, FONTS, SIZES, PALETTE, COLORS } from '@/config';
import { type ViewportSizing, toDPR } from '@/systems/responsive';
import { getSave } from '@/systems/services';
import { createText } from '@/ui/ui-utils';

export interface HighScoresPanelConfig {
  x: number;
  y: number;
  depth?: number;
  sizing?: ViewportSizing;
}

export class HighScoresPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, config: HighScoresPanelConfig) {
    this.scene = scene;
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(config.depth ?? 100);

    this.build(config);
  }

  private build(config: HighScoresPanelConfig): void {
    const { x, y, depth = 100, sizing } = config;

    const saveManager = getSave();
    const highScores = saveManager.getHighScores();

    const hasData = highScores.bestRunTotal > 0 ||
      highScores.byDifficulty.chill > 0 ||
      highScores.byDifficulty.normal > 0 ||
      highScores.byDifficulty.intense > 0;

    // Use viewport-relative sizing (sizing values are already in device pixels from getMenuSizing)
    const panelWidth = sizing?.highScoresPanelWidth ?? toDPR(170);
    const panelHeight = hasData ? (sizing?.highScoresPanelHeight ?? toDPR(155)) : toDPR(70);
    const fontSize = sizing?.bodyFontSize ?? FONTS.SIZE_SMALL; // Use body size for better readability
    const headerFontSize = sizing?.headerFontSize ?? FONTS.SIZE_BUTTON;
    const centerX = x + panelWidth / 2;
    const centerY = y + panelHeight / 2;

    // Calculate scale factor based on panel height vs base height (155px)
    const baseHeight = toDPR(155);
    const heightScale = panelHeight / baseHeight;

    // Spacing values scale with panel height
    const scaleSpacing = (base: number): number => Math.round(toDPR(base) * heightScale);

    const shadowOffset = toDPR(3);
    const cornerInset = toDPR(SIZES.PANEL_CORNER_INSET);
    const cornerSize = toDPR(SIZES.PANEL_CORNER_SIZE);
    const textPaddingX = scaleSpacing(10);
    const textIndentX = scaleSpacing(14);
    const headerY = scaleSpacing(16);
    const emptyTextY = scaleSpacing(40);
    const contentStartY = scaleSpacing(36);
    const lineHeightSmall = scaleSpacing(14);
    const lineHeightMedium = scaleSpacing(15);
    const lineHeightLarge = scaleSpacing(18);

    // Background shadow
    const bgShadow = this.scene.add.rectangle(centerX + shadowOffset, centerY + shadowOffset, panelWidth, panelHeight, PALETTE.neutral[900], 0.5);
    bgShadow.setDepth(depth);
    this.container.add(bgShadow);

    // Main background
    const bg = this.scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, PALETTE.purple[900], 0.95);
    bg.setStrokeStyle(toDPR(SIZES.PANEL_BORDER_WIDTH), PALETTE.purple[500], 0.7);
    bg.setDepth(depth);
    this.container.add(bg);

    // Corner accents
    const corners = [
      { cx: x + cornerInset, cy: y + cornerInset, ax: 1, ay: 1 },
      { cx: x + panelWidth - cornerInset, cy: y + cornerInset, ax: -1, ay: 1 },
      { cx: x + panelWidth - cornerInset, cy: y + panelHeight - cornerInset, ax: -1, ay: -1 },
      { cx: x + cornerInset, cy: y + panelHeight - cornerInset, ax: 1, ay: -1 },
    ];

    corners.forEach(corner => {
      const accent = this.scene.add.graphics();
      accent.lineStyle(toDPR(2), PALETTE.purple[400], 0.6);
      accent.beginPath();
      accent.moveTo(corner.cx, corner.cy + corner.ay * cornerSize);
      accent.lineTo(corner.cx, corner.cy);
      accent.lineTo(corner.cx + corner.ax * cornerSize, corner.cy);
      accent.strokePath();
      accent.setDepth(depth + 1);
      this.container.add(accent);
    });

    // Header
    const header = createText(this.scene, centerX, y + headerY, 'HIGH SCORES', {
      fontSize: headerFontSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_ACCENT,
      fontStyle: 'bold',
    });
    header.setOrigin(0.5, 0.5);
    header.setDepth(depth + 1);
    this.container.add(header);

    // Show "No scores yet" if empty
    if (!hasData) {
      const emptyText = createText(this.scene, centerX, y + emptyTextY, 'No scores yet', {
        fontSize,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_MUTED,
      });
      emptyText.setOrigin(0.5, 0.5);
      emptyText.setDepth(depth + 1);
      this.container.add(emptyText);
      return;
    }

    let currentY = y + contentStartY;

    // Best Run section (if any completed runs)
    if (highScores.bestRunTotal > 0) {
      const fullRunHeader = createText(this.scene, x + textPaddingX, currentY, '4-Seal Run', {
        fontSize,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_ACCENT,
        fontStyle: 'bold',
      });
      fullRunHeader.setOrigin(0, 0.5);
      fullRunHeader.setDepth(depth + 1);
      this.container.add(fullRunHeader);

      currentY += lineHeightMedium;

      const bestRunLabel = createText(this.scene, x + textIndentX, currentY, 'Best Total:', {
        fontSize,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SECONDARY,
        fontStyle: 'bold',
      });
      bestRunLabel.setOrigin(0, 0.5);
      bestRunLabel.setDepth(depth + 1);
      this.container.add(bestRunLabel);

      const bestRunValue = createText(this.scene, x + panelWidth - textPaddingX, currentY, highScores.bestRunTotal.toString(), {
        fontSize,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_WARNING,
        fontStyle: 'bold',
      });
      bestRunValue.setOrigin(1, 0.5);
      bestRunValue.setDepth(depth + 1);
      this.container.add(bestRunValue);

      currentY += lineHeightSmall;

      const runsLabel = createText(this.scene, x + textIndentX, currentY, 'Completed:', {
        fontSize,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SECONDARY,
        fontStyle: 'bold',
      });
      runsLabel.setOrigin(0, 0.5);
      runsLabel.setDepth(depth + 1);
      this.container.add(runsLabel);

      const runsValue = createText(this.scene, x + panelWidth - textPaddingX, currentY, `${highScores.runsCompleted}x`, {
        fontSize,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SECONDARY,
        fontStyle: 'bold',
      });
      runsValue.setOrigin(1, 0.5);
      runsValue.setDepth(depth + 1);
      this.container.add(runsValue);

      currentY += lineHeightLarge;
    }

    // Per-difficulty high scores
    const hasDiffScores = highScores.byDifficulty.chill > 0 ||
      highScores.byDifficulty.normal > 0 ||
      highScores.byDifficulty.intense > 0;

    if (hasDiffScores) {
      const sealHeader = createText(this.scene, x + textPaddingX, currentY, 'Best Single Seal', {
        fontSize,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_ACCENT,
        fontStyle: 'bold',
      });
      sealHeader.setOrigin(0, 0.5);
      sealHeader.setDepth(depth + 1);
      this.container.add(sealHeader);

      currentY += lineHeightMedium;

      const difficulties: { key: Difficulty; label: string; color: string }[] = [
        { key: 'chill', label: DIFFICULTIES.chill.label, color: DIFFICULTIES.chill.color },
        { key: 'normal', label: DIFFICULTIES.normal.label, color: DIFFICULTIES.normal.color },
        { key: 'intense', label: DIFFICULTIES.intense.label, color: DIFFICULTIES.intense.color },
      ];

      for (const diff of difficulties) {
        const score = highScores.byDifficulty[diff.key];
        if (score > 0) {
          const diffLabel = createText(this.scene, x + textIndentX, currentY, diff.label + ':', {
            fontSize,
            fontFamily: FONTS.FAMILY,
            color: diff.color,
            fontStyle: 'bold',
          });
          diffLabel.setOrigin(0, 0.5);
          diffLabel.setDepth(depth + 1);
          this.container.add(diffLabel);

          const diffValue = createText(this.scene, x + panelWidth - textPaddingX, currentY, score.toString(), {
            fontSize,
            fontFamily: FONTS.FAMILY,
            color: COLORS.TEXT_PRIMARY,
            fontStyle: 'bold',
          });
          diffValue.setOrigin(1, 0.5);
          diffValue.setDepth(depth + 1);
          this.container.add(diffValue);

          currentY += lineHeightSmall;
        }
      }
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
