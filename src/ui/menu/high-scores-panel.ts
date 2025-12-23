/**
 * High Scores Panel
 * Displays saved high scores on the main menu
 */

import Phaser from 'phaser';
import { type Difficulty, DIFFICULTIES, FONTS, SIZES, PALETTE, COLORS } from '@/config';
import { getSaveManager } from '@/systems/save-manager';
import { createText } from '@/ui/ui-utils';

export interface HighScoresPanelConfig {
  x: number;
  y: number;
  depth?: number;
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
    const { x, y, depth = 100 } = config;

    const saveManager = getSaveManager();
    const highScores = saveManager.getHighScores();

    const hasData = highScores.bestRunTotal > 0 ||
      highScores.byDifficulty.chill > 0 ||
      highScores.byDifficulty.normal > 0 ||
      highScores.byDifficulty.intense > 0;

    const panelWidth = 170;
    const panelHeight = hasData ? 155 : 70;
    const centerX = x + panelWidth / 2;
    const centerY = y + panelHeight / 2;

    // Background shadow
    const bgShadow = this.scene.add.rectangle(centerX + 3, centerY + 3, panelWidth, panelHeight, PALETTE.neutral[900], 0.5);
    bgShadow.setDepth(depth);
    this.container.add(bgShadow);

    // Main background
    const bg = this.scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, PALETTE.purple[900], 0.95);
    bg.setStrokeStyle(SIZES.PANEL_BORDER_WIDTH, PALETTE.purple[500], 0.7);
    bg.setDepth(depth);
    this.container.add(bg);

    // Corner accents
    const cornerSize = 10;
    const corners = [
      { cx: x + 5, cy: y + 5, ax: 1, ay: 1 },
      { cx: x + panelWidth - 5, cy: y + 5, ax: -1, ay: 1 },
      { cx: x + panelWidth - 5, cy: y + panelHeight - 5, ax: -1, ay: -1 },
      { cx: x + 5, cy: y + panelHeight - 5, ax: 1, ay: -1 },
    ];

    corners.forEach(corner => {
      const accent = this.scene.add.graphics();
      accent.lineStyle(2, PALETTE.purple[400], 0.6);
      accent.beginPath();
      accent.moveTo(corner.cx, corner.cy + corner.ay * cornerSize);
      accent.lineTo(corner.cx, corner.cy);
      accent.lineTo(corner.cx + corner.ax * cornerSize, corner.cy);
      accent.strokePath();
      accent.setDepth(depth + 1);
      this.container.add(accent);
    });

    // Header
    const header = createText(this.scene, centerX, y + 18, 'HIGH SCORES', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_ACCENT,
      fontStyle: 'bold',
    });
    header.setOrigin(0.5, 0.5);
    header.setDepth(depth + 1);
    this.container.add(header);

    // Show "No scores yet" if empty
    if (!hasData) {
      const emptyText = createText(this.scene, centerX, y + 45, 'No scores yet', {
        fontSize: FONTS.SIZE_TINY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_MUTED,
      });
      emptyText.setOrigin(0.5, 0.5);
      emptyText.setDepth(depth + 1);
      this.container.add(emptyText);
      return;
    }

    let currentY = y + 42;

    // Best Run section (if any completed runs)
    if (highScores.bestRunTotal > 0) {
      const fullRunHeader = createText(this.scene, x + 10, currentY, '4-Curse Run', {
        fontSize: FONTS.SIZE_TINY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_MUTED,
      });
      fullRunHeader.setOrigin(0, 0.5);
      fullRunHeader.setDepth(depth + 1);
      this.container.add(fullRunHeader);

      currentY += 16;

      const bestRunLabel = createText(this.scene, x + 14, currentY, 'Best Total:', {
        fontSize: FONTS.SIZE_TINY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SECONDARY,
      });
      bestRunLabel.setOrigin(0, 0.5);
      bestRunLabel.setDepth(depth + 1);
      this.container.add(bestRunLabel);

      const bestRunValue = createText(this.scene, x + panelWidth - 10, currentY, highScores.bestRunTotal.toString(), {
        fontSize: FONTS.SIZE_TINY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_WARNING,
        fontStyle: 'bold',
      });
      bestRunValue.setOrigin(1, 0.5);
      bestRunValue.setDepth(depth + 1);
      this.container.add(bestRunValue);

      currentY += 15;

      const runsLabel = createText(this.scene, x + 14, currentY, 'Completed:', {
        fontSize: FONTS.SIZE_TINY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SECONDARY,
      });
      runsLabel.setOrigin(0, 0.5);
      runsLabel.setDepth(depth + 1);
      this.container.add(runsLabel);

      const runsValue = createText(this.scene, x + panelWidth - 10, currentY, `${highScores.runsCompleted}x`, {
        fontSize: FONTS.SIZE_TINY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_SECONDARY,
      });
      runsValue.setOrigin(1, 0.5);
      runsValue.setDepth(depth + 1);
      this.container.add(runsValue);

      currentY += 20;
    }

    // Per-difficulty high scores
    const hasDiffScores = highScores.byDifficulty.chill > 0 ||
      highScores.byDifficulty.normal > 0 ||
      highScores.byDifficulty.intense > 0;

    if (hasDiffScores) {
      const curseHeader = createText(this.scene, x + 10, currentY, 'Best Single Curse', {
        fontSize: FONTS.SIZE_TINY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_MUTED,
      });
      curseHeader.setOrigin(0, 0.5);
      curseHeader.setDepth(depth + 1);
      this.container.add(curseHeader);

      currentY += 16;

      const difficulties: { key: Difficulty; label: string; color: string }[] = [
        { key: 'chill', label: 'Chill', color: DIFFICULTIES.chill.color },
        { key: 'normal', label: 'Normal', color: DIFFICULTIES.normal.color },
        { key: 'intense', label: 'Intense', color: DIFFICULTIES.intense.color },
      ];

      for (const diff of difficulties) {
        const score = highScores.byDifficulty[diff.key];
        if (score > 0) {
          const diffLabel = createText(this.scene, x + 14, currentY, diff.label + ':', {
            fontSize: FONTS.SIZE_TINY,
            fontFamily: FONTS.FAMILY,
            color: diff.color,
          });
          diffLabel.setOrigin(0, 0.5);
          diffLabel.setDepth(depth + 1);
          this.container.add(diffLabel);

          const diffValue = createText(this.scene, x + panelWidth - 10, currentY, score.toString(), {
            fontSize: FONTS.SIZE_TINY,
            fontFamily: FONTS.FAMILY,
            color: COLORS.TEXT_PRIMARY,
          });
          diffValue.setOrigin(1, 0.5);
          diffValue.setDepth(depth + 1);
          this.container.add(diffValue);

          currentY += 15;
        }
      }
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
