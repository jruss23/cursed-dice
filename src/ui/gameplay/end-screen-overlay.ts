/**
 * End Screen Overlay
 * Displays game end results with scores and action buttons
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, SIZES, getViewportMetrics } from '@/config';
import { createText } from '@/ui/ui-utils';

export interface EndScreenConfig {
  passed: boolean;
  isRunComplete: boolean;
  showBlessingChoice: boolean;
  modeScore: number;
  totalScore: number;
  currentMode: number;
  completed: boolean; // Whether time ran out (false) or completed normally (true)
  passThreshold: number;
}

export interface EndScreenCallbacks {
  onNewGame: () => void;
  onQuit: () => void;
  onContinue: () => void;
  onTryAgain: () => void;
}

type ButtonStyle = 'primary' | 'secondary' | 'warning' | 'danger';

export class EndScreenOverlay {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Container;
  private tweens: Phaser.Tweens.Tween[] = [];
  private isMobile: boolean = false;

  constructor(
    scene: Phaser.Scene,
    config: EndScreenConfig,
    callbacks: EndScreenCallbacks
  ) {
    this.scene = scene;
    const { width, height } = this.scene.cameras.main;
    const metrics = getViewportMetrics(scene);
    this.isMobile = metrics.isMobile;

    // Dark overlay
    this.overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, PALETTE.purple[900], 0.95);
    this.overlay.setDepth(100);

    // Panel dimensions - responsive for mobile
    const panelWidth = this.isMobile ? Math.min(340, width - 30) : 400;
    const panelHeight = this.isMobile ? 300 : 340;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;

    // Panel container
    this.panel = this.scene.add.container(panelX, panelY);
    this.panel.setDepth(101);

    this.build(panelWidth, panelHeight, config, callbacks);
    this.animateEntrance();
  }

  private build(
    panelWidth: number,
    panelHeight: number,
    config: EndScreenConfig,
    callbacks: EndScreenCallbacks
  ): void {
    const { passed, isRunComplete, showBlessingChoice, modeScore, totalScore, currentMode, completed, passThreshold } = config;

    const panelBg = this.scene.add.rectangle(
      panelWidth / 2, panelHeight / 2,
      panelWidth, panelHeight,
      PALETTE.purple[900], 0.98
    );
    panelBg.setStrokeStyle(SIZES.PANEL_BORDER_WIDTH, PALETTE.purple[500], 0.8);
    this.panel.add(panelBg);

    // Corner accents
    this.addCornerAccents(panelWidth, panelHeight);

    // Determine title based on pass/fail
    const { titleText, titleColor, subtitleText } = this.getTitleInfo(
      isRunComplete, passed, completed, currentMode, passThreshold
    );

    // Title with glow
    const titleY = 45;
    const titleGlow = createText(this.scene, panelWidth / 2, titleY, titleText, {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: titleColor,
      fontStyle: 'bold',
    });
    titleGlow.setOrigin(0.5, 0.5);
    titleGlow.setAlpha(0.4);
    titleGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.panel.add(titleGlow);

    const title = createText(this.scene, panelWidth / 2, titleY, titleText, {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: titleColor,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.panel.add(title);

    // Subtitle
    const subtitle = createText(this.scene, panelWidth / 2, titleY + 30, subtitleText, {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    subtitle.setOrigin(0.5, 0.5);
    this.panel.add(subtitle);

    // Divider line
    const divider1 = this.scene.add.rectangle(panelWidth / 2, 100, panelWidth - 60, 1, PALETTE.purple[500], 0.4);
    this.panel.add(divider1);

    // Scores section
    this.buildScoresSection(panelWidth, modeScore, totalScore, passed);

    // Divider before buttons
    const divider2 = this.scene.add.rectangle(panelWidth / 2, 220, panelWidth - 60, 1, PALETTE.purple[500], 0.4);
    this.panel.add(divider2);

    // Buttons section
    this.buildButtons(panelWidth, isRunComplete, passed, showBlessingChoice, callbacks);

  }

  private addCornerAccents(panelWidth: number, panelHeight: number): void {
    const cornerSize = SIZES.PANEL_CORNER_SIZE;
    const cornerInset = SIZES.PANEL_CORNER_INSET;
    const corners = [
      { x: cornerInset, y: cornerInset, ax: 1, ay: 1 },
      { x: panelWidth - cornerInset, y: cornerInset, ax: -1, ay: 1 },
      { x: panelWidth - cornerInset, y: panelHeight - cornerInset, ax: -1, ay: -1 },
      { x: cornerInset, y: panelHeight - cornerInset, ax: 1, ay: -1 },
    ];

    corners.forEach(corner => {
      const accent = this.scene.add.graphics();
      accent.lineStyle(2, PALETTE.purple[400], 0.6);
      accent.beginPath();
      accent.moveTo(corner.x, corner.y + cornerSize * corner.ay);
      accent.lineTo(corner.x, corner.y);
      accent.lineTo(corner.x + cornerSize * corner.ax, corner.y);
      accent.strokePath();
      this.panel.add(accent);
    });
  }

  private getTitleInfo(
    isRunComplete: boolean,
    passed: boolean,
    completed: boolean,
    currentMode: number,
    passThreshold: number
  ): { titleText: string; titleColor: string; subtitleText: string } {
    if (isRunComplete) {
      return {
        titleText: 'You broke the curse!',
        titleColor: COLORS.TEXT_WARNING,
        subtitleText: 'All 4 curses broken!',
      };
    } else if (passed) {
      return {
        titleText: 'Curse weakened...',
        titleColor: COLORS.TEXT_SUCCESS,
        subtitleText: `${4 - currentMode} curses remain`,
      };
    } else if (!completed) {
      return {
        titleText: 'The curse prevails...',
        titleColor: COLORS.TEXT_DANGER,
        subtitleText: "Time's up!",
      };
    } else {
      return {
        titleText: 'The curse prevails...',
        titleColor: COLORS.TEXT_DANGER,
        subtitleText: `Need ${passThreshold}+ to advance`,
      };
    }
  }

  private buildScoresSection(
    panelWidth: number,
    modeScore: number,
    totalScore: number,
    passed: boolean
  ): void {
    const scoresY = 155;
    const leftX = panelWidth / 3;
    const rightX = (panelWidth * 2) / 3;

    // Round score (left)
    const roundLabel = createText(this.scene, leftX, scoresY - 25, 'ROUND SCORE', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    roundLabel.setOrigin(0.5, 0.5);
    this.panel.add(roundLabel);

    const roundScore = createText(this.scene, leftX, scoresY + 10, `${modeScore}`, {
      fontSize: FONTS.SIZE_TITLE,
      fontFamily: FONTS.FAMILY,
      color: passed ? COLORS.TEXT_SUCCESS : COLORS.TEXT_DANGER,
      fontStyle: 'bold',
    });
    roundScore.setOrigin(0.5, 0.5);
    this.panel.add(roundScore);

    // Vertical divider between scores
    const scoreDivider = this.scene.add.rectangle(panelWidth / 2, scoresY, 1, 70, PALETTE.purple[500], 0.3);
    this.panel.add(scoreDivider);

    // Total score (right)
    const totalLabel = createText(this.scene, rightX, scoresY - 25, 'RUN TOTAL', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    totalLabel.setOrigin(0.5, 0.5);
    this.panel.add(totalLabel);

    const totalScoreText = createText(this.scene, rightX, scoresY + 10, `${totalScore}`, {
      fontSize: FONTS.SIZE_TITLE,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_ACCENT,
      fontStyle: 'bold',
    });
    totalScoreText.setOrigin(0.5, 0.5);
    this.panel.add(totalScoreText);
  }

  private buildButtons(
    panelWidth: number,
    isRunComplete: boolean,
    passed: boolean,
    showBlessingChoice: boolean,
    callbacks: EndScreenCallbacks
  ): void {
    const buttonY = this.isMobile ? 250 : 280;
    const buttonOffset = this.isMobile ? 70 : 90;

    if (isRunComplete) {
      // Victory - single menu button (centered, primary style)
      this.createButton(panelWidth / 2, buttonY, 'NEW GAME', callbacks.onNewGame, 'primary');
    } else if (passed) {
      // Passed - quit (danger) left, continue (primary) right
      this.createButton(panelWidth / 2 - buttonOffset, buttonY, 'QUIT', callbacks.onQuit, 'danger');
      this.createButton(panelWidth / 2 + buttonOffset, buttonY, 'CONTINUE', () => {
        if (showBlessingChoice) {
          // Fade out just the panel, keep dark overlay for smooth transition
          this.fadeOutPanel(() => {
            callbacks.onContinue();
          });
        } else {
          callbacks.onContinue();
        }
      }, 'primary');
    } else {
      // Failed - quit (danger) left, try again (warning) right
      this.createButton(panelWidth / 2 - buttonOffset, buttonY, 'QUIT', callbacks.onQuit, 'danger');
      this.createButton(panelWidth / 2 + buttonOffset, buttonY, 'TRY AGAIN', callbacks.onTryAgain, 'warning');
    }
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    style: ButtonStyle = 'primary'
  ): void {
    const btnWidth = this.isMobile ? 120 : 150;
    const btnHeight = this.isMobile ? 36 : 44;

    // Style configurations
    const styles = {
      primary: {
        bg: PALETTE.green[700],
        bgHover: PALETTE.green[600],
        border: PALETTE.green[500],
        borderHover: PALETTE.green[400],
        glow: PALETTE.green[500],
        text: COLORS.TEXT_SUCCESS,
      },
      secondary: {
        bg: PALETTE.purple[700],
        bgHover: PALETTE.purple[600],
        border: PALETTE.purple[500],
        borderHover: PALETTE.purple[400],
        glow: PALETTE.purple[500],
        text: COLORS.TEXT_SECONDARY,
      },
      warning: {
        bg: PALETTE.gold[700],
        bgHover: PALETTE.gold[600],
        border: PALETTE.gold[500],
        borderHover: PALETTE.gold[400],
        glow: PALETTE.gold[500],
        text: COLORS.TEXT_WARNING,
      },
      danger: {
        bg: PALETTE.red[800],
        bgHover: PALETTE.red[700],
        border: PALETTE.red[500],
        borderHover: PALETTE.red[400],
        glow: PALETTE.red[500],
        text: COLORS.TEXT_DANGER,
      },
    };

    const s = styles[style];

    // Button glow
    const btnGlow = this.scene.add.rectangle(x, y, btnWidth + 8, btnHeight + 8, s.glow, 0.1);
    this.panel.add(btnGlow);

    // Button background
    const btnBg = this.scene.add.rectangle(x, y, btnWidth, btnHeight, s.bg, 0.95);
    btnBg.setStrokeStyle(2, s.border);
    btnBg.setInteractive({ useHandCursor: true });
    this.panel.add(btnBg);

    // Button text
    const btnText = createText(this.scene, x, y, label, {
      fontSize: FONTS.SIZE_BUTTON,
      fontFamily: FONTS.FAMILY,
      color: s.text,
      fontStyle: 'bold',
    });
    btnText.setOrigin(0.5, 0.5);
    this.panel.add(btnText);

    // Hover effects
    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(s.bgHover, 1);
      btnBg.setStrokeStyle(2, s.borderHover);
      btnGlow.setAlpha(0.25);
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(s.bg, 0.95);
      btnBg.setStrokeStyle(2, s.border);
      btnGlow.setAlpha(0.1);
    });
    btnBg.on('pointerdown', onClick);
  }

  private animateEntrance(): void {
    this.panel.setScale(0.8);
    this.panel.setAlpha(0);

    const entranceTween = this.scene.tweens.add({
      targets: this.panel,
      scale: 1,
      alpha: 1,
      duration: SIZES.ANIM_ENTRANCE,
      ease: 'Back.easeOut',
    });
    this.tweens.push(entranceTween);
  }

  private fadeOutPanel(onComplete?: () => void): void {
    const fadeTween = this.scene.tweens.add({
      targets: this.panel,
      alpha: 0,
      scale: 0.9,
      duration: SIZES.ANIM_NORMAL,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.panel.setVisible(false);
        onComplete?.();
      },
    });
    this.tweens.push(fadeTween);
  }

  destroy(): void {
    // Stop all tweens
    this.tweens.forEach(tween => {
      if (tween.isPlaying()) {
        tween.stop();
      }
    });
    this.tweens = [];

    this.overlay.destroy();
    this.panel.destroy();
  }
}
