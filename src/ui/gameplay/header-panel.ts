/**
 * Header Panel
 * Displays curse #, mode title, timer, total score, and threshold
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, SIZES, type ViewportMetrics } from '@/config';
import { createText } from '@/ui/ui-utils';

export interface HeaderPanelConfig {
  currentMode: number;
  modeName: string;
  totalScore: number;
  timeRemaining: number;
  passThreshold: number;
  compact?: boolean;
  /** Viewport metrics for responsive sizing */
  metrics?: ViewportMetrics;
  /** Override compact height from layout calculation */
  compactHeight?: number;
}

export class HeaderPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private timerText: Phaser.GameObjects.Text | null = null;
  private timerGlow: Phaser.GameObjects.Text | null = null;
  private totalScoreText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, centerX: number, config: HeaderPanelConfig) {
    this.scene = scene;
    this.container = this.scene.add.container(0, 0);

    this.build(centerX, config);
  }

  private build(centerX: number, config: HeaderPanelConfig): void {
    const { currentMode, modeName, totalScore, timeRemaining, compact = false, metrics, compactHeight } = config;

    // Responsive sizing based on viewport
    const isMobile = metrics?.isMobile ?? false;
    const viewportWidth = metrics?.width ?? 1200;
    const scale = metrics?.scale ?? 1;

    // Panel width: constrained by viewport, smaller on mobile
    const baseWidth = compact ? 340 : 420;
    const panelWidth = Math.min(baseWidth, viewportWidth - 20);

    // Panel height: use provided compactHeight if available, otherwise calculate
    const panelHeight = compactHeight ?? (isMobile ? (compact ? 70 : 85) : (compact ? 110 : 140));

    const panelX = centerX - panelWidth / 2;
    const panelY = (metrics?.safeArea.top ?? 0) + 10;

    // Font scaling for mobile - bigger labels, tighter spacing
    const fontScale = Math.max(0.75, Math.min(1, scale));
    const labelSize = `${Math.round((isMobile ? 13 : 14) * fontScale)}px`;
    const valueSize = `${Math.round((isMobile ? 18 : 24) * fontScale)}px`;
    const timerSize = `${Math.round(isMobile ? 20 : 44)}px`;

    this.container.setPosition(panelX, panelY);

    const panelBg = this.scene.add.rectangle(
      panelWidth / 2, panelHeight / 2,
      panelWidth, panelHeight,
      PALETTE.purple[900], 0.92
    );
    panelBg.setStrokeStyle(SIZES.PANEL_BORDER_WIDTH, PALETTE.purple[500], 0.7);
    this.container.add(panelBg);

    // Corner accents
    const cornerSize = 10;
    const corners = [
      { x: 6, y: 6, ax: 1, ay: 1 },
      { x: panelWidth - 6, y: 6, ax: -1, ay: 1 },
      { x: panelWidth - 6, y: panelHeight - 6, ax: -1, ay: -1 },
      { x: 6, y: panelHeight - 6, ax: 1, ay: -1 },
    ];

    corners.forEach(corner => {
      const accent = this.scene.add.graphics();
      accent.lineStyle(2, PALETTE.purple[400], 0.5);
      accent.beginPath();
      accent.moveTo(corner.x, corner.y + cornerSize * corner.ay);
      accent.lineTo(corner.x, corner.y);
      accent.lineTo(corner.x + cornerSize * corner.ax, corner.y);
      accent.strokePath();
      this.container.add(accent);
    });

    // === SIDE COLUMNS: Curse # (left) | Run Total (right) ===
    const sideInset = Math.max(40, panelWidth * 0.12); // Proportional side columns

    // Tighter vertical spacing - labels and values closer together
    const sideCenterY = isMobile ? panelHeight / 2 : 25;
    const labelOffset = isMobile ? -10 : -8;
    const valueOffset = isMobile ? 8 : 12;

    // Left: Curse number
    const curseLabel = createText(this.scene, sideInset, sideCenterY + labelOffset, 'CURSE', {
      fontSize: labelSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    curseLabel.setOrigin(0.5, 0.5);
    this.container.add(curseLabel);

    const curseNum = createText(this.scene, sideInset, sideCenterY + valueOffset, `${currentMode}/4`, {
      fontSize: valueSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    curseNum.setOrigin(0.5, 0.5);
    this.container.add(curseNum);

    // Center: Mode name (label) + Timer (value) - same vertical layout as sides
    const title = createText(this.scene, panelWidth / 2, sideCenterY + labelOffset, modeName.toUpperCase(), {
      fontSize: labelSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    // Timer as the "value" in center column
    this.timerGlow = createText(this.scene, panelWidth / 2, sideCenterY + valueOffset, this.formatTime(timeRemaining), {
      fontSize: timerSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TIMER_GLOW_SAFE,
      fontStyle: 'bold',
    });
    this.timerGlow.setOrigin(0.5, 0.5);
    this.timerGlow.setAlpha(0.25);
    this.timerGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.container.add(this.timerGlow);

    this.timerText = createText(this.scene, panelWidth / 2, sideCenterY + valueOffset, this.formatTime(timeRemaining), {
      fontSize: timerSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TIMER_SAFE,
      fontStyle: 'bold',
    });
    this.timerText.setOrigin(0.5, 0.5);
    this.container.add(this.timerText);

    // Right: Run total
    const totalLabel = createText(this.scene, panelWidth - sideInset, sideCenterY + labelOffset, 'TOTAL', {
      fontSize: labelSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    totalLabel.setOrigin(0.5, 0.5);
    this.container.add(totalLabel);

    this.totalScoreText = createText(this.scene, panelWidth - sideInset, sideCenterY + valueOffset, `${totalScore}`, {
      fontSize: valueSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    this.totalScoreText.setOrigin(0.5, 0.5);
    this.container.add(this.totalScoreText);
  }

  updateTimer(timeRemaining: number, color?: string): void {
    const formatted = this.formatTime(timeRemaining);
    if (this.timerText) {
      this.timerText.setText(formatted);
      if (color) {
        this.timerText.setColor(color);
      }
    }
    if (this.timerGlow) {
      this.timerGlow.setText(formatted);
      if (color) {
        // Set glow to darker version of the color
        const glowColor = color === COLORS.TIMER_SAFE ? COLORS.TIMER_GLOW_SAFE :
                         color === COLORS.TIMER_WARNING ? COLORS.TIMER_GLOW_WARNING :
                         color === COLORS.TIMER_DANGER ? COLORS.TIMER_GLOW_DANGER :
                         color === COLORS.TIMER_CRITICAL ? COLORS.TIMER_GLOW_DANGER : COLORS.TIMER_GLOW_SAFE;
        this.timerGlow.setColor(glowColor);
      }
    }
  }

  updateTotalScore(score: number): void {
    if (this.totalScoreText) {
      this.totalScoreText.setText(`${score}`);
    }
  }

  /**
   * Get timer text elements for external animation
   */
  getTimerElements(): { text: Phaser.GameObjects.Text | null; glow: Phaser.GameObjects.Text | null } {
    return { text: this.timerText, glow: this.timerGlow };
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  destroy(): void {
    this.container.destroy();
  }
}
