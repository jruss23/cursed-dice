/**
 * Header Panel
 * Displays curse #, mode title, timer, total score, and threshold
 */

import Phaser from 'phaser';
import { FONTS, COLORS, SIZES, LAYOUT, type ViewportMetrics } from '@/config';
import { createText, createPanelFrame, addPanelFrameToContainer } from '@/ui/ui-utils';

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

  // Panel bounds for highlighting
  private panelX = 0;
  private panelY = 0;
  private panelWidth = 0;
  private panelHeight = 0;
  private sideInset = 0; // X offset for curse/total sections

  constructor(scene: Phaser.Scene, centerX: number, config: HeaderPanelConfig) {
    this.scene = scene;
    this.container = this.scene.add.container(0, 0);

    this.build(centerX, config);
  }

  private build(centerX: number, config: HeaderPanelConfig): void {
    const { currentMode, modeName, totalScore, timeRemaining, compact = false, metrics, compactHeight } = config;
    const L = LAYOUT.headerPanel;

    // Responsive sizing based on viewport
    const viewportWidth = metrics?.width ?? 430;
    const scale = metrics?.scale ?? 1;

    // Panel width: constrained by viewport
    const baseWidth = compact ? L.WIDTH_COMPACT : L.WIDTH_NORMAL;
    const panelWidth = Math.min(baseWidth, viewportWidth - L.MARGIN);

    // Panel height: use provided compactHeight if available, otherwise use defaults
    const panelHeight = compactHeight ?? (compact ? L.HEIGHT_COMPACT : L.HEIGHT_NORMAL);

    const panelX = centerX - panelWidth / 2;
    const panelY = (metrics?.safeArea.top ?? 0) + L.SAFE_AREA_OFFSET;

    // Store panel bounds for getBounds()
    this.panelX = panelX;
    this.panelY = panelY;
    this.panelWidth = panelWidth;
    this.panelHeight = panelHeight;

    // Font scaling
    const fontScale = Math.max(0.75, Math.min(1, scale));
    const labelSize = `${Math.round(L.FONT_LABEL * fontScale)}px`;
    const valueSize = `${Math.round(L.FONT_VALUE * fontScale)}px`;
    const timerSize = `${L.FONT_TIMER}px`;

    this.container.setPosition(panelX, panelY);

    // Panel frame (glow, background, corners)
    const frame = createPanelFrame(this.scene, {
      x: 0,
      y: 0,
      width: panelWidth,
      height: panelHeight,
      glowAlpha: 0.06,
      borderWidth: SIZES.PANEL_BORDER_WIDTH,
      cornerAlpha: 0.5,
    });
    addPanelFrameToContainer(this.container, frame);

    // === SIDE COLUMNS: Curse # (left) | Run Total (right) ===
    const sideInset = Math.max(L.SIDE_INSET_MIN, panelWidth * L.SIDE_INSET_RATIO);
    this.sideInset = sideInset;

    // Tighter vertical spacing - labels and values closer together
    const sideCenterY = panelHeight * L.SIDE_CENTER_Y_RATIO;
    const labelOffset = L.LABEL_OFFSET;
    const valueOffset = L.VALUE_OFFSET;

    // Left: Seal number
    const sealLabel = createText(this.scene, sideInset, sideCenterY + labelOffset, 'SEAL', {
      fontSize: labelSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    sealLabel.setOrigin(0.5, 0.5);
    this.container.add(sealLabel);

    const sealNum = createText(this.scene, sideInset, sideCenterY + valueOffset, `${currentMode}/4`, {
      fontSize: valueSize,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    sealNum.setOrigin(0.5, 0.5);
    this.container.add(sealNum);

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

  /**
   * Get panel bounds for tutorial highlighting
   */
  getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.panelX,
      y: this.panelY,
      width: this.panelWidth,
      height: this.panelHeight,
    };
  }

  /**
   * Get bounds for curse counter section (left side)
   */
  getCurseBounds(): { x: number; y: number; width: number; height: number } {
    const L = LAYOUT.headerPanel;
    // Tighter bounds around the seal counter
    const tighterWidth = L.SECTION_WIDTH - 12;
    return {
      x: this.panelX + this.sideInset - tighterWidth / 2,
      y: this.panelY + L.SECTION_PADDING,
      width: tighterWidth,
      height: this.panelHeight - L.SECTION_PADDING * 2,
    };
  }

  /**
   * Get bounds for timer section (center)
   */
  getTimerBounds(): { x: number; y: number; width: number; height: number } {
    const L = LAYOUT.headerPanel;
    const sectionWidth = this.panelWidth - this.sideInset * 4;
    return {
      x: this.panelX + this.sideInset * 2 - L.SECTION_PADDING,
      y: this.panelY + L.SECTION_PADDING,
      width: sectionWidth + L.SECTION_PADDING * 2,
      height: this.panelHeight - L.SECTION_PADDING * 2,
    };
  }

  /**
   * Get bounds for total score section (right side)
   */
  getTotalBounds(): { x: number; y: number; width: number; height: number } {
    const L = LAYOUT.headerPanel;
    // Slightly tighter on the right side
    const tighterWidth = L.SECTION_WIDTH - 6;
    return {
      x: this.panelX + this.panelWidth - this.sideInset - tighterWidth / 2,
      y: this.panelY + L.SECTION_PADDING,
      width: tighterWidth,
      height: this.panelHeight - L.SECTION_PADDING * 2,
    };
  }

  destroy(): void {
    this.container.destroy();
  }
}
