/**
 * Header Panel
 * Displays curse #, mode title, timer, total score, and threshold
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS } from '@/config';

export interface HeaderPanelConfig {
  currentMode: number;
  modeName: string;
  totalScore: number;
  timeRemaining: number;
  passThreshold: number;
  compact?: boolean;
}

export class HeaderPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private timerText: Phaser.GameObjects.Text | null = null;
  private timerGlow: Phaser.GameObjects.Text | null = null;
  private totalScoreText: Phaser.GameObjects.Text | null = null;
  private glowTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, centerX: number, config: HeaderPanelConfig) {
    this.scene = scene;
    this.container = this.scene.add.container(0, 0);

    this.build(centerX, config);
  }

  private build(centerX: number, config: HeaderPanelConfig): void {
    const { currentMode, modeName, totalScore, timeRemaining, passThreshold, compact = false } = config;

    const panelWidth = compact ? 340 : 420;
    const panelHeight = compact ? 110 : 140;
    const panelX = centerX - panelWidth / 2;
    const panelY = 15;

    this.container.setPosition(panelX, panelY);

    // Panel background with glow effect
    const outerGlow = this.scene.add.rectangle(
      panelWidth / 2, panelHeight / 2,
      panelWidth + 12, panelHeight + 12,
      PALETTE.purple[500], 0.08
    );
    this.container.add(outerGlow);

    const panelBg = this.scene.add.rectangle(
      panelWidth / 2, panelHeight / 2,
      panelWidth, panelHeight,
      PALETTE.purple[900], 0.92
    );
    panelBg.setStrokeStyle(2, PALETTE.purple[500], 0.7);
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

    // === TOP ROW: Curse # | Mode Title | Run Total ===
    const topY = 25;

    // Left: Curse number
    const curseLabel = this.createText(50, topY - 8, 'CURSE', {
      fontSize: '11px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
      fontStyle: 'bold',
    });
    curseLabel.setOrigin(0.5, 0.5);
    this.container.add(curseLabel);

    const curseNum = this.createText(50, topY + 12, `${currentMode}/4`, {
      fontSize: '24px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    curseNum.setOrigin(0.5, 0.5);
    this.container.add(curseNum);

    // Center: Mode title
    const title = this.createText(panelWidth / 2, topY, modeName, {
      fontSize: FONTS.SIZE_SUBHEADING,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    // Right: Run total
    const totalLabel = this.createText(panelWidth - 50, topY - 8, 'TOTAL', {
      fontSize: '11px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
      fontStyle: 'bold',
    });
    totalLabel.setOrigin(0.5, 0.5);
    this.container.add(totalLabel);

    this.totalScoreText = this.createText(panelWidth - 50, topY + 12, `${totalScore}`, {
      fontSize: '24px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    this.totalScoreText.setOrigin(0.5, 0.5);
    this.container.add(this.totalScoreText);

    // === MIDDLE: Timer ===
    const timerY = 70;
    this.timerGlow = this.createText(panelWidth / 2, timerY, this.formatTime(timeRemaining), {
      fontSize: '44px',
      fontFamily: FONTS.FAMILY,
      color: '#226622',
      fontStyle: 'bold',
    });
    this.timerGlow.setOrigin(0.5, 0.5);
    this.timerGlow.setAlpha(0.25);
    this.timerGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.container.add(this.timerGlow);

    this.timerText = this.createText(panelWidth / 2, timerY, this.formatTime(timeRemaining), {
      fontSize: '44px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TIMER_SAFE,
      fontStyle: 'bold',
    });
    this.timerText.setOrigin(0.5, 0.5);
    this.container.add(this.timerText);

    // === BOTTOM ROW: Threshold (centered) ===
    const bottomY = 115;

    const thresholdText = this.createText(panelWidth / 2, bottomY, `Need ${passThreshold}+ to advance`, {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
    });
    thresholdText.setOrigin(0.5, 0.5);
    this.container.add(thresholdText);

    // Glow pulse
    this.glowTween = this.scene.tweens.add({
      targets: outerGlow,
      alpha: 0.15,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
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
        const glowColor = color === COLORS.TIMER_SAFE ? '#226622' :
                         color === COLORS.TIMER_WARNING ? '#665522' :
                         color === COLORS.TIMER_DANGER ? '#662222' :
                         color === COLORS.TIMER_CRITICAL ? '#662222' : '#226622';
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

  destroy(): void {
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
    }
    this.container.destroy();
  }
}
