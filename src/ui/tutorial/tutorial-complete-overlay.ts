/**
 * Tutorial Complete Overlay
 * Displays tutorial completion with pass/fail status
 * Styled to match the seal broken overlay from end-screen-overlay.ts
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, SIZES, DEPTH, FLASH, END_SCREEN } from '@/config';
import { createText, createPanelFrame, addPanelFrameToContainer, PANEL_PRESETS } from '@/ui/ui-utils';

// Use END_SCREEN constants for consistency with end-screen-overlay.ts
const S = END_SCREEN;

interface TutorialCompleteLayout {
  panelWidth: number;
  panelHeight: number;
  titleY: number;
  subtitleY: number;
  divider1Y: number;
  scoreLabelY: number;
  scoreValueY: number;
  divider2Y: number;
  buttonY: number;
  buttonWidth: number;
  buttonHeight: number;
  buttonOffset: number;
}

function getTutorialCompleteLayout(): TutorialCompleteLayout {
  const panelWidth = S.PANEL_WIDTH;
  const buttonHeight = S.BUTTON_HEIGHT;

  // Calculate total content height
  let contentHeight = 0;
  contentHeight += S.TITLE_HEIGHT;
  contentHeight += S.GAP_TITLE_TO_SUBTITLE;
  contentHeight += S.SUBTITLE_HEIGHT;
  contentHeight += S.GAP_SUBTITLE_TO_DIVIDER;
  contentHeight += S.DIVIDER_HEIGHT;
  contentHeight += S.GAP_DIVIDER_TO_SCORES;
  contentHeight += S.SCORE_LABEL_HEIGHT;
  contentHeight += S.GAP_SCORE_LABEL_TO_VALUE;
  contentHeight += S.SCORE_VALUE_HEIGHT;
  contentHeight += S.GAP_SCORES_TO_DIVIDER;
  contentHeight += S.DIVIDER_HEIGHT;
  contentHeight += S.GAP_DIVIDER_TO_BUTTON;
  contentHeight += buttonHeight;

  const panelHeight = contentHeight + S.PANEL_PADDING * 2;

  // Calculate Y positions (relative to panel top-left at 0,0)
  let y = S.PANEL_PADDING;

  const titleY = y + S.TITLE_HEIGHT / 2;
  y += S.TITLE_HEIGHT + S.GAP_TITLE_TO_SUBTITLE;

  const subtitleY = y + S.SUBTITLE_HEIGHT / 2;
  y += S.SUBTITLE_HEIGHT + S.GAP_SUBTITLE_TO_DIVIDER;

  const divider1Y = y + S.DIVIDER_HEIGHT / 2;
  y += S.DIVIDER_HEIGHT + S.GAP_DIVIDER_TO_SCORES;

  const scoreLabelY = y + S.SCORE_LABEL_HEIGHT / 2;
  y += S.SCORE_LABEL_HEIGHT + S.GAP_SCORE_LABEL_TO_VALUE;

  const scoreValueY = y + S.SCORE_VALUE_HEIGHT / 2;
  y += S.SCORE_VALUE_HEIGHT + S.GAP_SCORES_TO_DIVIDER;

  const divider2Y = y + S.DIVIDER_HEIGHT / 2;
  y += S.DIVIDER_HEIGHT + S.GAP_DIVIDER_TO_BUTTON;

  const buttonY = y + buttonHeight / 2;

  return {
    panelWidth,
    panelHeight,
    titleY,
    subtitleY,
    divider1Y,
    scoreLabelY,
    scoreValueY,
    divider2Y,
    buttonY,
    buttonWidth: S.BUTTON_WIDTH,
    buttonHeight,
    buttonOffset: S.BUTTON_OFFSET,
  };
}

export interface TutorialCompleteConfig {
  totalScore: number;
  passThreshold: number;
}

export interface TutorialCompleteCallbacks {
  onTryAgain: () => void;
  onMenu: () => void;
}

export class TutorialCompleteOverlay {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Container;
  private tweens: Phaser.Tweens.Tween[] = [];
  private layout: TutorialCompleteLayout;

  constructor(
    scene: Phaser.Scene,
    config: TutorialCompleteConfig,
    callbacks: TutorialCompleteCallbacks
  ) {
    this.scene = scene;
    const { width, height } = this.scene.cameras.main;

    // Calculate layout
    this.layout = getTutorialCompleteLayout();

    // Dark overlay - matches end-screen-overlay
    this.overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, PALETTE.purple[900], 0.95);
    this.overlay.setInteractive();
    this.overlay.setDepth(DEPTH.OVERLAY);

    // Panel dimensions - responsive for mobile
    const panelWidth = Math.min(this.layout.panelWidth, width - S.PANEL_MARGIN);
    const panelHeight = this.layout.panelHeight;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;

    // Panel container
    this.panel = this.scene.add.container(panelX, panelY);
    this.panel.setDepth(DEPTH.PANEL);

    this.build(panelWidth, panelHeight, config, callbacks);
    this.animateEntrance();
  }

  private build(
    panelWidth: number,
    panelHeight: number,
    config: TutorialCompleteConfig,
    callbacks: TutorialCompleteCallbacks
  ): void {
    const { totalScore, passThreshold } = config;
    const passed = totalScore >= passThreshold;
    const L = this.layout;

    // Panel frame (glow, background, corners)
    const frame = createPanelFrame(this.scene, {
      x: 0,
      y: 0,
      width: panelWidth,
      height: panelHeight,
      ...PANEL_PRESETS.overlay,
      borderWidth: SIZES.PANEL_BORDER_WIDTH,
    });
    addPanelFrameToContainer(this.panel, frame);

    // Title - changes based on pass/fail
    const titleString = passed ? 'Tutorial Complete!' : 'Almost There!';
    const titleColor = passed ? COLORS.TEXT_SUCCESS : COLORS.TEXT_WARNING;

    // Title glow
    const titleGlow = createText(this.scene, panelWidth / 2, L.titleY, titleString, {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: titleColor,
      fontStyle: 'bold',
    });
    titleGlow.setOrigin(0.5, 0.5);
    titleGlow.setAlpha(0.4);
    titleGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.panel.add(titleGlow);

    const titleText = createText(this.scene, panelWidth / 2, L.titleY, titleString, {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: titleColor,
      fontStyle: 'bold',
    });
    titleText.setOrigin(0.5, 0.5);
    this.panel.add(titleText);

    // Subtitle - pass/fail message
    const subtitleText = passed
      ? 'You would have broken this seal!'
      : `Need ${passThreshold}+ to break a seal`;
    const subtitle = createText(this.scene, panelWidth / 2, L.subtitleY, subtitleText, {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    subtitle.setOrigin(0.5, 0.5);
    this.panel.add(subtitle);

    // Divider line
    const divider1 = this.scene.add.rectangle(panelWidth / 2, L.divider1Y, panelWidth - 60, 1, PALETTE.purple[500], 0.4);
    this.panel.add(divider1);

    // Score section
    this.buildScoresSection(panelWidth, totalScore, passed);

    // Divider before buttons
    const divider2 = this.scene.add.rectangle(panelWidth / 2, L.divider2Y, panelWidth - 60, 1, PALETTE.purple[500], 0.4);
    this.panel.add(divider2);

    // Buttons
    this.buildButtons(panelWidth, passed, callbacks);
  }

  private buildScoresSection(panelWidth: number, totalScore: number, passed: boolean): void {
    const centerX = panelWidth / 2;
    const L = this.layout;

    const scoreLabel = createText(this.scene, centerX, L.scoreLabelY, 'FINAL SCORE', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    scoreLabel.setOrigin(0.5, 0.5);
    this.panel.add(scoreLabel);

    const scoreValue = createText(this.scene, centerX, L.scoreValueY, `${totalScore}`, {
      fontSize: FONTS.SIZE_MODE_TITLE,
      fontFamily: FONTS.FAMILY,
      color: passed ? COLORS.TEXT_SUCCESS : COLORS.TEXT_DANGER,
      fontStyle: 'bold',
    });
    scoreValue.setOrigin(0.5, 0.5);
    this.panel.add(scoreValue);
  }

  private buildButtons(panelWidth: number, passed: boolean, callbacks: TutorialCompleteCallbacks): void {
    const L = this.layout;
    const buttonY = L.buttonY;
    const buttonOffset = L.buttonOffset;

    if (passed) {
      // Pass: single centered FINISH button (they're ready for real game)
      this.createButton(panelWidth / 2, buttonY, 'FINISH', () => {
        this.fadeToBlackAndExecute(callbacks.onMenu, FLASH.GREEN);
      }, 'primary');
    } else {
      // Fail: QUIT (left) | TRY AGAIN (right)
      this.createButton(panelWidth / 2 - buttonOffset, buttonY, 'QUIT', () => {
        this.fadeToBlackAndExecute(callbacks.onMenu, FLASH.RED);
      }, 'danger');

      this.createButton(panelWidth / 2 + buttonOffset, buttonY, 'TRY AGAIN', () => {
        this.fadeToBlackAndExecute(callbacks.onTryAgain, FLASH.GOLD);
      }, 'warning');
    }
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    style: 'primary' | 'secondary' | 'warning' | 'danger'
  ): void {
    const btnWidth = this.layout.buttonWidth;
    const btnHeight = this.layout.buttonHeight;

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
        text: COLORS.TEXT_PRIMARY,
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
    this.panel.setAlpha(0);

    const entranceTween = this.scene.tweens.add({
      targets: this.panel,
      alpha: 1,
      duration: SIZES.ANIM_ENTRANCE,
      ease: 'Quad.easeOut',
    });
    this.tweens.push(entranceTween);
  }

  private fadeToBlackAndExecute(callback: () => void, flashColor: { r: number; g: number; b: number }): void {
    // Disable all button interactions
    this.panel.each((child: Phaser.GameObjects.GameObject) => {
      if ('disableInteractive' in child) {
        (child as Phaser.GameObjects.Rectangle).disableInteractive();
      }
    });

    // Flash effect
    this.scene.cameras.main.flash(150, flashColor.r, flashColor.g, flashColor.b);

    // Fade camera to black
    this.scene.cameras.main.fadeOut(SIZES.ANIM_NORMAL, 0, 0, 0);
    this.scene.cameras.main.once('camerafadeoutcomplete', () => {
      callback();
    });
  }

  destroy(): void {
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
