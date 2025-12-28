/**
 * End Screen Overlay
 * Displays game end results with scores and action buttons
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, SIZES, TIMING, DEPTH, CELEBRATION, END_SCREEN, FLASH } from '@/config';
import { createText, hexToRgb } from '@/ui/ui-utils';
import { MODE_CONFIGS, type GameMode } from '@/systems/game-progression';

// =============================================================================
// LAYOUT CALCULATION - Group-based positioning
// =============================================================================

interface EndScreenLayout {
  panelWidth: number;
  panelHeight: number;
  titleY: number;
  subtitleY: number;
  previewBoxY: number;
  divider1Y: number;
  scoreLabelY: number;
  scoreValueY: number;
  scoreRoundY: number;
  divider2Y: number;
  buttonY: number;
  buttonWidth: number;
  buttonHeight: number;
  buttonOffset: number;
  previewBoxHeight: number;
}

function getEndScreenLayout(showPreview: boolean): EndScreenLayout {
  const S = END_SCREEN;
  const panelWidth = S.PANEL_WIDTH;
  const buttonHeight = S.BUTTON_HEIGHT;
  const previewBoxHeight = showPreview ? S.PREVIEW_BOX_HEIGHT : 0;

  // Calculate total content height
  let contentHeight = 0;

  // Title group
  contentHeight += S.TITLE_HEIGHT;
  contentHeight += S.GAP_TITLE_TO_SUBTITLE;
  contentHeight += S.SUBTITLE_HEIGHT;

  // Preview box (conditional)
  if (showPreview) {
    contentHeight += S.GAP_SUBTITLE_TO_PREVIEW;
    contentHeight += previewBoxHeight;
    contentHeight += S.GAP_PREVIEW_TO_DIVIDER;
  } else {
    contentHeight += S.GAP_SUBTITLE_TO_DIVIDER;
  }

  // Divider 1
  contentHeight += S.DIVIDER_HEIGHT;
  contentHeight += S.GAP_DIVIDER_TO_SCORES;

  // Score group
  contentHeight += S.SCORE_LABEL_HEIGHT;
  contentHeight += S.GAP_SCORE_LABEL_TO_VALUE;
  contentHeight += S.SCORE_VALUE_HEIGHT;
  contentHeight += S.GAP_SCORE_VALUE_TO_ROUND;
  contentHeight += S.SCORE_ROUND_HEIGHT;
  contentHeight += S.GAP_SCORES_TO_DIVIDER;

  // Divider 2
  contentHeight += S.DIVIDER_HEIGHT;
  contentHeight += S.GAP_DIVIDER_TO_BUTTON;

  // Button
  contentHeight += buttonHeight;

  const panelHeight = contentHeight + S.PANEL_PADDING * 2;

  // Calculate Y positions (relative to panel top-left at 0,0)
  let y = S.PANEL_PADDING;

  const titleY = y + S.TITLE_HEIGHT / 2;
  y += S.TITLE_HEIGHT + S.GAP_TITLE_TO_SUBTITLE;

  const subtitleY = y + S.SUBTITLE_HEIGHT / 2;
  y += S.SUBTITLE_HEIGHT;

  let previewBoxY = 0;
  if (showPreview) {
    y += S.GAP_SUBTITLE_TO_PREVIEW;
    previewBoxY = y + previewBoxHeight / 2;
    y += previewBoxHeight + S.GAP_PREVIEW_TO_DIVIDER;
  } else {
    y += S.GAP_SUBTITLE_TO_DIVIDER;
  }

  const divider1Y = y + S.DIVIDER_HEIGHT / 2;
  y += S.DIVIDER_HEIGHT + S.GAP_DIVIDER_TO_SCORES;

  const scoreLabelY = y + S.SCORE_LABEL_HEIGHT / 2;
  y += S.SCORE_LABEL_HEIGHT + S.GAP_SCORE_LABEL_TO_VALUE;

  const scoreValueY = y + S.SCORE_VALUE_HEIGHT / 2;
  y += S.SCORE_VALUE_HEIGHT + S.GAP_SCORE_VALUE_TO_ROUND;

  const scoreRoundY = y + S.SCORE_ROUND_HEIGHT / 2;
  y += S.SCORE_ROUND_HEIGHT + S.GAP_SCORES_TO_DIVIDER;

  const divider2Y = y + S.DIVIDER_HEIGHT / 2;
  y += S.DIVIDER_HEIGHT + S.GAP_DIVIDER_TO_BUTTON;

  const buttonY = y + buttonHeight / 2;

  return {
    panelWidth,
    panelHeight,
    titleY,
    subtitleY,
    previewBoxY,
    divider1Y,
    scoreLabelY,
    scoreValueY,
    scoreRoundY,
    divider2Y,
    buttonY,
    buttonWidth: S.BUTTON_WIDTH,
    buttonHeight,
    buttonOffset: S.BUTTON_OFFSET,
    previewBoxHeight,
  };
}

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

type ButtonStyle = 'primary' | 'secondary' | 'warning' | 'danger' | 'victory';

export class EndScreenOverlay {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Container;
  private tweens: Phaser.Tweens.Tween[] = [];
  private celebrationParticles: Phaser.GameObjects.Graphics[] = [];
  private destroyed: boolean = false;
  private borderAnimationId: number | null = null;
  private delayedCalls: Phaser.Time.TimerEvent[] = [];

  // Layout calculated dynamically
  private layout: EndScreenLayout;

  // Elements to animate during victory color transition
  private panelBg: Phaser.GameObjects.Rectangle | null = null;
  private dividers: Phaser.GameObjects.Rectangle[] = [];
  private cornerAccents: Phaser.GameObjects.Graphics[] = [];
  private titleText: Phaser.GameObjects.Text | null = null;
  private titleGlow: Phaser.GameObjects.Text | null = null;
  private subtitleText: Phaser.GameObjects.Text | null = null;

  // Score texts with type information for color animation
  private scoreLabelText: Phaser.GameObjects.Text | null = null;
  private scoreValueText: Phaser.GameObjects.Text | null = null;
  private roundLabelText: Phaser.GameObjects.Text | null = null;

  // Victory button elements (stored directly, no fragile detection)
  private victoryButtonBg: Phaser.GameObjects.Rectangle | null = null;
  private victoryButtonText: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    config: EndScreenConfig,
    callbacks: EndScreenCallbacks
  ) {
    this.scene = scene;
    const { width, height } = this.scene.cameras.main;

    // Dark overlay - blocks clicks to elements behind (like pause button)
    this.overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, PALETTE.purple[900], 0.95);
    this.overlay.setInteractive();
    this.overlay.setDepth(DEPTH.OVERLAY);

    // Calculate layout based on whether preview is shown
    const showPreview = config.passed && !config.isRunComplete;
    this.layout = getEndScreenLayout(showPreview);

    // Constrain panel width to viewport
    const panelWidth = Math.min(this.layout.panelWidth, width - END_SCREEN.PANEL_MARGIN);
    const panelHeight = this.layout.panelHeight;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;

    // Panel container
    this.panel = this.scene.add.container(panelX, panelY);
    this.panel.setDepth(DEPTH.PANEL);

    this.build(panelWidth, panelHeight, config, callbacks);
    this.animateEntrance();

    // Victory celebration for beating all 4 curses!
    if (config.isRunComplete) {
      this.playVictoryCelebration(width, height);
    }
  }

  private build(
    panelWidth: number,
    panelHeight: number,
    config: EndScreenConfig,
    callbacks: EndScreenCallbacks
  ): void {
    const { passed, isRunComplete, showBlessingChoice, modeScore, totalScore, currentMode, completed, passThreshold } = config;
    const L = this.layout;

    this.panelBg = this.scene.add.rectangle(
      panelWidth / 2, panelHeight / 2,
      panelWidth, panelHeight,
      PALETTE.purple[900], 0.98
    );
    this.panelBg.setStrokeStyle(SIZES.PANEL_BORDER_WIDTH, PALETTE.purple[500], 0.8);
    this.panel.add(this.panelBg);

    // Corner accents
    this.addCornerAccents(panelWidth, panelHeight);

    // Determine title based on pass/fail
    const { titleText, titleColor, subtitleText } = this.getTitleInfo(
      isRunComplete, passed, completed, currentMode, passThreshold
    );

    // Title with glow
    this.titleGlow = createText(this.scene, panelWidth / 2, L.titleY, titleText, {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: titleColor,
      fontStyle: 'bold',
    });
    this.titleGlow.setOrigin(0.5, 0.5);
    this.titleGlow.setAlpha(0.4);
    this.titleGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.panel.add(this.titleGlow);

    this.titleText = createText(this.scene, panelWidth / 2, L.titleY, titleText, {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: titleColor,
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5, 0.5);
    this.panel.add(this.titleText);

    // Subtitle
    this.subtitleText = createText(this.scene, panelWidth / 2, L.subtitleY, subtitleText, {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    this.subtitleText.setOrigin(0.5, 0.5);
    this.panel.add(this.subtitleText);

    // Next mode preview (only when passed and not final seal)
    if (passed && !isRunComplete) {
      const nextModeNum = (currentMode + 1) as GameMode;
      const nextMode = MODE_CONFIGS[nextModeNum];
      if (nextMode) {
        const previewBoxWidth = panelWidth - 40;

        // Red warning box
        const previewBox = this.scene.add.rectangle(
          panelWidth / 2, L.previewBoxY,
          previewBoxWidth, L.previewBoxHeight,
          PALETTE.red[800], 0.4
        );
        previewBox.setStrokeStyle(1, PALETTE.red[500], 0.5);
        this.panel.add(previewBox);

        // Warning icons + title (inside preview box)
        const row1Offset = 14;
        const row1Y = L.previewBoxY - row1Offset;
        const iconOffset = 20;

        const iconLeft = createText(this.scene, panelWidth / 2 - previewBoxWidth / 2 + iconOffset, row1Y, '⚠️', {
          fontSize: FONTS.SIZE_SMALL,
          fontFamily: FONTS.FAMILY,
        });
        iconLeft.setOrigin(0.5, 0.5);
        this.panel.add(iconLeft);

        const iconRight = createText(this.scene, panelWidth / 2 + previewBoxWidth / 2 - iconOffset, row1Y, '⚠️', {
          fontSize: FONTS.SIZE_SMALL,
          fontFamily: FONTS.FAMILY,
        });
        iconRight.setOrigin(0.5, 0.5);
        this.panel.add(iconRight);

        const nextTitle = createText(this.scene, panelWidth / 2, row1Y, `NEXT: ${nextMode.name}`, {
          fontSize: FONTS.SIZE_LABEL,
          fontFamily: FONTS.FAMILY,
          color: COLORS.TEXT_DANGER,
          fontStyle: 'bold',
        });
        nextTitle.setOrigin(0.5, 0.5);
        this.panel.add(nextTitle);

        // Mode description
        const row2Y = L.previewBoxY + row1Offset;
        const nextDesc = createText(this.scene, panelWidth / 2, row2Y, nextMode.description, {
          fontSize: FONTS.SIZE_TINY,
          fontFamily: FONTS.FAMILY,
          color: COLORS.TEXT_WARNING,
          wordWrap: { width: previewBoxWidth - 20 },
          align: 'center',
        });
        nextDesc.setOrigin(0.5, 0.5);
        this.panel.add(nextDesc);
      }
    }

    // Divider line
    const divider1 = this.scene.add.rectangle(panelWidth / 2, L.divider1Y, panelWidth - 60, 1, PALETTE.purple[500], 0.4);
    this.panel.add(divider1);
    this.dividers.push(divider1);

    // Scores section
    this.buildScoresSection(panelWidth, modeScore, totalScore, passed);

    // Divider before buttons
    const divider2 = this.scene.add.rectangle(panelWidth / 2, L.divider2Y, panelWidth - 60, 1, PALETTE.purple[500], 0.4);
    this.panel.add(divider2);
    this.dividers.push(divider2);

    // Buttons section
    this.buildButtons(panelWidth, isRunComplete, passed, showBlessingChoice, callbacks);

  }

  private cornerData: { x: number; y: number; ax: number; ay: number }[] = [];

  private addCornerAccents(panelWidth: number, panelHeight: number): void {
    const cornerSize = SIZES.PANEL_CORNER_SIZE;
    const cornerInset = SIZES.PANEL_CORNER_INSET;
    this.cornerData = [
      { x: cornerInset, y: cornerInset, ax: 1, ay: 1 },
      { x: panelWidth - cornerInset, y: cornerInset, ax: -1, ay: 1 },
      { x: panelWidth - cornerInset, y: panelHeight - cornerInset, ax: -1, ay: -1 },
      { x: cornerInset, y: panelHeight - cornerInset, ax: 1, ay: -1 },
    ];

    this.cornerData.forEach(corner => {
      const accent = this.scene.add.graphics();
      accent.lineStyle(2, PALETTE.purple[400], 0.6);
      accent.beginPath();
      accent.moveTo(corner.x, corner.y + cornerSize * corner.ay);
      accent.lineTo(corner.x, corner.y);
      accent.lineTo(corner.x + cornerSize * corner.ax, corner.y);
      accent.strokePath();
      this.panel.add(accent);
      this.cornerAccents.push(accent);
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
        titleText: 'The curse is broken!',
        titleColor: COLORS.TEXT_WARNING,
        subtitleText: 'All 4 seals shattered!',
      };
    } else if (passed) {
      return {
        titleText: 'Seal broken!',
        titleColor: COLORS.TEXT_SUCCESS,
        subtitleText: `${4 - currentMode} seals remain`,
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
    const centerX = panelWidth / 2;
    const L = this.layout;

    this.scoreLabelText = createText(this.scene, centerX, L.scoreLabelY, 'FINAL SCORE', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    this.scoreLabelText.setOrigin(0.5, 0.5);
    this.panel.add(this.scoreLabelText);

    this.scoreValueText = createText(this.scene, centerX, L.scoreValueY, `${totalScore}`, {
      fontSize: FONTS.SIZE_MODE_TITLE,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_ACCENT,
      fontStyle: 'bold',
    });
    this.scoreValueText.setOrigin(0.5, 0.5);
    this.panel.add(this.scoreValueText);

    // Round score - smaller, underneath
    this.roundLabelText = createText(this.scene, centerX, L.scoreRoundY, `This round: +${modeScore}`, {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: passed ? COLORS.TEXT_SUCCESS : COLORS.TEXT_DANGER,
    });
    this.roundLabelText.setOrigin(0.5, 0.5);
    this.panel.add(this.roundLabelText);
  }

  private buildButtons(
    panelWidth: number,
    isRunComplete: boolean,
    passed: boolean,
    showBlessingChoice: boolean,
    callbacks: EndScreenCallbacks
  ): void {
    const L = this.layout;
    const buttonY = L.buttonY;
    const buttonOffset = L.buttonOffset;

    if (isRunComplete) {
      // Victory - single menu button (centered, solid gold style)
      // Store references for color animation
      const { bg, text } = this.createButton(panelWidth / 2, buttonY, 'NEW GAME', () => {
        this.fadeToBlackAndExecute(callbacks.onNewGame, FLASH.VICTORY);
      }, 'victory');
      this.victoryButtonBg = bg;
      this.victoryButtonText = text;
    } else if (passed) {
      // Passed - quit (danger) left, continue (primary) right
      this.createButton(panelWidth / 2 - buttonOffset, buttonY, 'QUIT', () => {
        this.fadeToBlackAndExecute(callbacks.onQuit, FLASH.RED);
      }, 'danger');
      this.createButton(panelWidth / 2 + buttonOffset, buttonY, 'CONTINUE', () => {
        // Green flash for feedback
        this.scene.cameras.main.flash(150, FLASH.GREEN.r, FLASH.GREEN.g, FLASH.GREEN.b);

        if (showBlessingChoice) {
          // Fade out just the panel, keep dark overlay for blessing choice
          this.fadeOutPanel(() => {
            callbacks.onContinue();
          });
        } else {
          // Fade camera to black before continuing (flash already done above)
          this.fadeToBlackAndExecute(callbacks.onContinue, false);
        }
      }, 'primary');
    } else {
      // Failed - quit (danger) left, try again (warning) right
      this.createButton(panelWidth / 2 - buttonOffset, buttonY, 'QUIT', () => {
        this.fadeToBlackAndExecute(callbacks.onQuit, FLASH.RED);
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
    style: ButtonStyle = 'primary'
  ): { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } {
    const btnWidth = this.layout.buttonWidth;
    const btnHeight = this.layout.buttonHeight;

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
      victory: {
        bg: COLORS.VICTORY_BTN_BG,
        bgHover: COLORS.VICTORY_BTN_BG_HOVER,
        border: COLORS.VICTORY_BTN_BORDER,
        borderHover: COLORS.VICTORY_BTN_BORDER_HOVER,
        glow: COLORS.VICTORY_BTN_GLOW,
        text: COLORS.VICTORY_BTN_TEXT,
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

    return { bg: btnBg, text: btnText };
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

  private fadeOutPanel(onComplete?: () => void): void {
    const fadeTween = this.scene.tweens.add({
      targets: this.panel,
      alpha: 0,
      duration: SIZES.ANIM_NORMAL,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.panel.setVisible(false);
        onComplete?.();
      },
    });
    this.tweens.push(fadeTween);
  }

  /**
   * Fade camera to black with optional flash effect, then execute callback.
   * This ensures the screen is fully black before any scene transition.
   */
  private fadeToBlackAndExecute(callback: () => void, flashColor?: { r: number; g: number; b: number } | false): void {
    // Disable all button interactions immediately
    this.panel.each((child: Phaser.GameObjects.GameObject) => {
      if ('disableInteractive' in child) {
        (child as Phaser.GameObjects.Rectangle).disableInteractive();
      }
    });

    // Flash effect for feedback (skip if flashColor is false)
    if (flashColor !== false) {
      const { r, g, b } = flashColor ?? FLASH.PURPLE;
      this.scene.cameras.main.flash(150, r, g, b);
    }

    // Fade camera to black
    this.scene.cameras.main.fadeOut(SIZES.ANIM_NORMAL, 0, 0, 0);
    this.scene.cameras.main.once('camerafadeoutcomplete', () => {
      callback();
    });
  }

  /**
   * Victory celebration with screen flash, confetti, and fireworks
   */
  private playVictoryCelebration(width: number, height: number): void {
    // Screen flash effect
    this.scene.cameras.main.flash(TIMING.VICTORY_FLASH, 255, 215, 0, false); // Gold flash

    // Color chase transition STARTS FIRST: purple → light blue / gold
    this.playColorTransition(width, height);

    // Confetti and fireworks start after a delay (while colors are already transitioning)
    const celebrationDelay = TIMING.VICTORY_CELEBRATION_DELAY;

    // Create celebratory particles (confetti-like) - lots over extended time
    const colors = [PALETTE.gold[400], PALETTE.gold[500], PALETTE.white, PALETTE.gold[200]];
    const particleCount = CELEBRATION.CONFETTI_COUNT;

    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics();
      const color = colors[Math.floor(Math.random() * colors.length)];
      const sizeRange = CELEBRATION.CONFETTI_SIZE_MAX - CELEBRATION.CONFETTI_SIZE_MIN;
      const size = CELEBRATION.CONFETTI_SIZE_MIN + Math.random() * sizeRange;

      particle.fillStyle(color, 1);
      particle.fillRect(-size / 2, -size / 2, size, size);

      // Start position - spread across top
      const startX = Math.random() * width;
      const startY = -20;
      particle.setPosition(startX, startY);
      particle.setDepth(DEPTH.CONFETTI);
      particle.setRotation(Math.random() * Math.PI * 2);

      this.celebrationParticles.push(particle);

      // Animate falling with slight horizontal movement - staggered
      const targetX = startX + (Math.random() - 0.5) * 100;
      const targetY = height + 50;
      const delay = celebrationDelay + Math.random() * TIMING.VICTORY_CONFETTI_STAGGER;
      const duration = TIMING.VICTORY_CONFETTI_FALL + Math.random() * CELEBRATION.CONFETTI_FALL_VARIANCE;

      const fallTween = this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        rotation: particle.rotation + Math.PI * 2 * (Math.random() > 0.5 ? 1 : -1),
        delay,
        duration,
        ease: 'Quad.easeIn',
        onComplete: () => {
          particle.destroy();
        },
      });
      this.tweens.push(fallTween);
    }

    // Firework explosions! (also delayed)
    const fireworksCall = this.scene.time.delayedCall(celebrationDelay, () => {
      if (!this.destroyed) {
        this.launchFireworks(width, height);
      }
    });
    this.delayedCalls.push(fireworksCall);
  }

  /**
   * Animate colors from dark purple to light blue/gold with top-down wipe effect
   */
  private playColorTransition(width: number, height: number): void {
    const duration = TIMING.VICTORY_DURATION;

    // Create blue overlay with soft gradient edge (light breaking through effect)
    const blueOverlay = this.scene.add.graphics();
    blueOverlay.setDepth(DEPTH.BLUE_OVERLAY);
    this.celebrationParticles.push(blueOverlay);

    // Create light rays/beams effect
    const lightRays = this.scene.add.graphics();
    lightRays.setDepth(DEPTH.LIGHT_RAYS);
    this.celebrationParticles.push(lightRays);

    // Create wipe animation with soft gradient edge
    const wipeProgress = { value: 0 };
    const wipeTween = this.scene.tweens.add({
      targets: wipeProgress,
      value: 1,
      duration,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        const progress = wipeProgress.value;
        const mainY = height * progress;
        const blurSize = CELEBRATION.BLUR_SIZE;

        blueOverlay.clear();
        lightRays.clear();

        // Draw the solid blue portion (above the blur zone)
        if (mainY > blurSize) {
          blueOverlay.fillStyle(PALETTE.victory.skyBlue, 1);
          blueOverlay.fillRect(0, 0, width, mainY - blurSize);
        }

        // Draw smooth gradient blur zone (more steps for less grain)
        const gradientSteps = CELEBRATION.GRADIENT_STEPS;
        for (let i = 0; i < gradientSteps; i++) {
          const stepProgress = i / gradientSteps;
          const y = mainY - blurSize + (blurSize * stepProgress);
          const stripHeight = (blurSize / gradientSteps) + 1;

          if (y > 0) {
            // Smooth blend from sky blue to purple using eased progress
            const easedProgress = stepProgress * stepProgress; // Ease in
            const r = Math.floor(135 + (50 - 135) * easedProgress);
            const g = Math.floor(206 + (30 - 206) * easedProgress);
            const b = Math.floor(235 + (120 - 235) * easedProgress);
            const color = Phaser.Display.Color.GetColor(r, g, b);

            blueOverlay.fillStyle(color, 1); // Fully opaque for cleaner look
            blueOverlay.fillRect(0, y, width, stripHeight);
          }
        }

        // Add light ray effects at the leading edge
        if (progress > 0.05 && progress < 0.95) {
          const rayCount = CELEBRATION.RAY_COUNT;
          for (let r = 0; r < rayCount; r++) {
            const rayX = (width / (rayCount + 1)) * (r + 1);
            const rayWidth = 30 + Math.sin(progress * Math.PI * 2 + r) * 15;
            const rayAlpha = 0.3 + Math.sin(progress * Math.PI + r * 0.5) * 0.2;

            // Vertical light beam
            lightRays.fillStyle(PALETTE.victory.lightRays, rayAlpha);
            lightRays.fillRect(rayX - rayWidth / 2, 0, rayWidth, mainY);
          }
        }

        // Fade out the original purple overlay
        const purpleAlpha = Math.max(0, 1 - progress * 1.2);
        this.overlay.setAlpha(purpleAlpha);
      },
      onComplete: () => {
        this.overlay.setVisible(false);
        lightRays.clear();
        // Fill with solid blue
        blueOverlay.clear();
        blueOverlay.fillStyle(PALETTE.victory.skyBlue, 1);
        blueOverlay.fillRect(0, 0, width, height);
      }
    });
    this.tweens.push(wipeTween);

    // Animate the game canvas border with wipe timing
    const gameCanvas = document.querySelector('canvas');
    if (gameCanvas) {
      const startColor = hexToRgb(PALETTE.purple[500]);
      const endColor = hexToRgb(PALETTE.victory.brightGold);
      const startTime = Date.now();
      const animateBorder = () => {
        // Stop if overlay was destroyed
        if (this.destroyed) return;

        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const r = Math.floor(startColor.r + (endColor.r - startColor.r) * progress);
        const g = Math.floor(startColor.g + (endColor.g - startColor.g) * progress);
        const b = Math.floor(startColor.b + (endColor.b - startColor.b) * progress);
        gameCanvas.style.borderColor = `rgb(${r}, ${g}, ${b})`;
        if (progress < 1) {
          this.borderAnimationId = requestAnimationFrame(animateBorder);
        }
      };
      this.borderAnimationId = requestAnimationFrame(animateBorder);
    }

    // UNIFIED TIMING: All panel elements transition together
    const transitionDelay = duration * TIMING.VICTORY_TRANSITION_START;
    const transitionDuration = duration * TIMING.VICTORY_TRANSITION_DURATION;

    // Animate panel background
    if (this.panelBg) {
      const colorProxy = hexToRgb(PALETTE.purple[900]);
      const targetBg = hexToRgb(PALETTE.victory.skyBlueBg);

      const bgTween = this.scene.tweens.add({
        targets: colorProxy,
        r: targetBg.r,
        g: targetBg.g,
        b: targetBg.b,
        delay: transitionDelay,
        duration: transitionDuration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const color = Phaser.Display.Color.GetColor(
            Math.floor(colorProxy.r),
            Math.floor(colorProxy.g),
            Math.floor(colorProxy.b)
          );
          this.panelBg?.setFillStyle(color, 1);
        },
      });
      this.tweens.push(bgTween);

      // Panel border - same timing
      const borderProxy = hexToRgb(PALETTE.purple[500]);
      const targetBorder = hexToRgb(PALETTE.victory.brightGold);

      const borderTween = this.scene.tweens.add({
        targets: borderProxy,
        r: targetBorder.r,
        g: targetBorder.g,
        b: targetBorder.b,
        delay: transitionDelay,
        duration: transitionDuration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const color = Phaser.Display.Color.GetColor(
            Math.floor(borderProxy.r),
            Math.floor(borderProxy.g),
            Math.floor(borderProxy.b)
          );
          this.panelBg?.setStrokeStyle(SIZES.PANEL_BORDER_WIDTH, color, 1);
        },
      });
      this.tweens.push(borderTween);
    }

    // Dividers - same timing
    this.dividers.forEach((divider) => {
      const dividerProxy = hexToRgb(PALETTE.purple[500]);
      const targetDiv = hexToRgb(PALETTE.victory.brightGold);

      const divTween = this.scene.tweens.add({
        targets: dividerProxy,
        r: targetDiv.r,
        g: targetDiv.g,
        b: targetDiv.b,
        delay: transitionDelay,
        duration: transitionDuration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const color = Phaser.Display.Color.GetColor(
            Math.floor(dividerProxy.r),
            Math.floor(dividerProxy.g),
            Math.floor(dividerProxy.b)
          );
          divider.setFillStyle(color, 1);
        },
      });
      this.tweens.push(divTween);
    });

    // Corner accents - same timing
    const cornerSize = SIZES.PANEL_CORNER_SIZE;
    this.cornerAccents.forEach((accent, index) => {
      const cornerProxy = hexToRgb(PALETTE.purple[400]);
      const targetCorner = hexToRgb(PALETTE.victory.brightGold);

      const cornerTween = this.scene.tweens.add({
        targets: cornerProxy,
        r: targetCorner.r,
        g: targetCorner.g,
        b: targetCorner.b,
        delay: transitionDelay,
        duration: transitionDuration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const color = Phaser.Display.Color.GetColor(
            Math.floor(cornerProxy.r),
            Math.floor(cornerProxy.g),
            Math.floor(cornerProxy.b)
          );
          const corner = this.cornerData[index];
          accent.clear();
          accent.lineStyle(2, color, 1);
          accent.beginPath();
          accent.moveTo(corner.x, corner.y + cornerSize * corner.ay);
          accent.lineTo(corner.x, corner.y);
          accent.lineTo(corner.x + cornerSize * corner.ax, corner.y);
          accent.strokePath();
        },
      });
      this.tweens.push(cornerTween);
    });

    // Animate text colors and button with same unified timing
    this.animateTextColors(transitionDelay, transitionDuration);
    this.animateVictoryButton(transitionDelay, transitionDuration);
  }

  /**
   * Animate text colors from light (for dark bg) to dark (for light bg)
   */
  private animateTextColors(delay: number, duration: number): void {
    // Title: light gold → rich gold (pops on light blue bg)
    if (this.titleText) {
      const titleProxy = hexToRgb(PALETTE.gold[300]);
      const targetTitle = hexToRgb(PALETTE.victory.goldenrod);

      const titleTween = this.scene.tweens.add({
        targets: titleProxy,
        r: targetTitle.r,
        g: targetTitle.g,
        b: targetTitle.b,
        delay,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const hex = Phaser.Display.Color.RGBToString(
            Math.floor(titleProxy.r),
            Math.floor(titleProxy.g),
            Math.floor(titleProxy.b)
          );
          this.titleText?.setColor(hex);
        },
      });
      this.tweens.push(titleTween);
    }

    // Fade out title glow (doesn't work well on light bg)
    if (this.titleGlow) {
      const glowTween = this.scene.tweens.add({
        targets: this.titleGlow,
        alpha: 0,
        delay,
        duration,
        ease: 'Sine.easeInOut',
      });
      this.tweens.push(glowTween);
    }

    // Subtitle: light purple → dark blue-gray (contrasts with light blue bg)
    if (this.subtitleText) {
      const subProxy = hexToRgb(PALETTE.neutral[200]);
      const targetSub = hexToRgb(PALETTE.victory.darkBlueGray);

      const subTween = this.scene.tweens.add({
        targets: subProxy,
        r: targetSub.r,
        g: targetSub.g,
        b: targetSub.b,
        delay,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const hex = Phaser.Display.Color.RGBToString(
            Math.floor(subProxy.r),
            Math.floor(subProxy.g),
            Math.floor(subProxy.b)
          );
          this.subtitleText?.setColor(hex);
        },
      });
      this.tweens.push(subTween);
    }

    // Score label text: secondary → warm brown
    if (this.scoreLabelText) {
      const labelProxy = hexToRgb(PALETTE.neutral[200]);
      const targetLabel = hexToRgb(PALETTE.victory.warmBrown);

      const labelTween = this.scene.tweens.add({
        targets: labelProxy,
        r: targetLabel.r,
        g: targetLabel.g,
        b: targetLabel.b,
        delay,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const hex = Phaser.Display.Color.RGBToString(
            Math.floor(labelProxy.r),
            Math.floor(labelProxy.g),
            Math.floor(labelProxy.b)
          );
          this.scoreLabelText?.setColor(hex);
        },
      });
      this.tweens.push(labelTween);
    }

    // Score value text: purple accent → golden bronze
    if (this.scoreValueText) {
      const valueProxy = hexToRgb(PALETTE.purple[200]);
      const targetValue = hexToRgb(PALETTE.victory.goldenBronze);

      const valueTween = this.scene.tweens.add({
        targets: valueProxy,
        r: targetValue.r,
        g: targetValue.g,
        b: targetValue.b,
        delay,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const hex = Phaser.Display.Color.RGBToString(
            Math.floor(valueProxy.r),
            Math.floor(valueProxy.g),
            Math.floor(valueProxy.b)
          );
          this.scoreValueText?.setColor(hex);
        },
      });
      this.tweens.push(valueTween);
    }

    // Round label text: green/red success/danger → dark goldenrod
    if (this.roundLabelText) {
      const roundProxy = hexToRgb(PALETTE.green[300]);
      const targetRound = hexToRgb(PALETTE.victory.darkGoldenrod);

      const roundTween = this.scene.tweens.add({
        targets: roundProxy,
        r: targetRound.r,
        g: targetRound.g,
        b: targetRound.b,
        delay,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const hex = Phaser.Display.Color.RGBToString(
            Math.floor(roundProxy.r),
            Math.floor(roundProxy.g),
            Math.floor(roundProxy.b)
          );
          this.roundLabelText?.setColor(hex);
        },
      });
      this.tweens.push(roundTween);
    }
  }

  /**
   * Shimmer animation for the victory button - synced with panel transitions
   * Uses stored references instead of fragile detection
   */
  private animateVictoryButton(delay: number, duration: number): void {
    // Animate button background: purple → bright gold
    if (this.victoryButtonBg) {
      const fillProxy = hexToRgb(PALETTE.purple[500]);
      const borderProxy = hexToRgb(PALETTE.purple[500]);
      const targetFill = hexToRgb(PALETTE.victory.brightGold);
      const targetBorder = hexToRgb(PALETTE.victory.goldenrod);

      // Set initial colors
      this.victoryButtonBg.setFillStyle(
        Phaser.Display.Color.GetColor(fillProxy.r, fillProxy.g, fillProxy.b), 1
      );
      this.victoryButtonBg.setStrokeStyle(
        2, Phaser.Display.Color.GetColor(borderProxy.r, borderProxy.g, borderProxy.b), 1
      );

      // Fill tween → bright gold
      const fillTween = this.scene.tweens.add({
        targets: fillProxy,
        r: targetFill.r, g: targetFill.g, b: targetFill.b,
        delay,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const color = Phaser.Display.Color.GetColor(
            Math.floor(fillProxy.r),
            Math.floor(fillProxy.g),
            Math.floor(fillProxy.b)
          );
          this.victoryButtonBg?.setFillStyle(color, 1);
        },
      });
      this.tweens.push(fillTween);

      // Border tween → goldenrod
      const borderTween = this.scene.tweens.add({
        targets: borderProxy,
        r: targetBorder.r, g: targetBorder.g, b: targetBorder.b,
        delay,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const color = Phaser.Display.Color.GetColor(
            Math.floor(borderProxy.r),
            Math.floor(borderProxy.g),
            Math.floor(borderProxy.b)
          );
          this.victoryButtonBg?.setStrokeStyle(2, color, 1);
        },
      });
      this.tweens.push(borderTween);
    }

    // Animate button text: white → goldenrod
    if (this.victoryButtonText) {
      const textProxy = hexToRgb(PALETTE.white);
      const targetText = hexToRgb(PALETTE.victory.goldenrod);

      const textTween = this.scene.tweens.add({
        targets: textProxy,
        r: targetText.r,
        g: targetText.g,
        b: targetText.b,
        delay,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const hex = Phaser.Display.Color.RGBToString(
            Math.floor(textProxy.r),
            Math.floor(textProxy.g),
            Math.floor(textProxy.b)
          );
          this.victoryButtonText?.setColor(hex);
        },
      });
      this.tweens.push(textTween);
    }
  }

  /**
   * Launch firework explosions at random positions
   */
  private launchFireworks(width: number, height: number): void {
    const fireworkCount = CELEBRATION.FIREWORK_COUNT;
    const fireworkColors = [
      PALETTE.gold[300], PALETTE.gold[500],
      PALETTE.green[300], PALETTE.green[500],
      PALETTE.purple[300], PALETTE.purple[500],
      PALETTE.fireworks.coral, PALETTE.fireworks.teal, PALETTE.fireworks.yellow
    ];

    for (let f = 0; f < fireworkCount; f++) {
      const delay = f * CELEBRATION.FIREWORK_STAGGER + Math.random() * 100;

      const fireworkCall = this.scene.time.delayedCall(delay, () => {
        // Skip if destroyed
        if (this.destroyed) return;

        // Random explosion point (avoid edges and center panel area)
        const margin = END_SCREEN.FIREWORK_EXPLOSION_MARGIN;
        const explosionX = margin + Math.random() * (width - margin * 2);
        const explosionY = margin + Math.random() * (height * END_SCREEN.FIREWORK_HEIGHT_FACTOR);

        // Pick a random color for this firework
        const baseColor = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
        const sparkCount = CELEBRATION.FIREWORK_SPARK_COUNT;

        // Create explosion sparks
        for (let i = 0; i < sparkCount; i++) {
          const spark = this.scene.add.graphics();
          const sparkSizeRange = CELEBRATION.FIREWORK_SPARK_SIZE_MAX - CELEBRATION.FIREWORK_SPARK_SIZE_MIN;
          const sparkSize = CELEBRATION.FIREWORK_SPARK_SIZE_MIN + Math.random() * sparkSizeRange;

          spark.fillStyle(baseColor, 1);
          spark.fillCircle(0, 0, sparkSize);

          spark.setPosition(explosionX, explosionY);
          spark.setDepth(DEPTH.FIREWORKS);
          spark.setAlpha(1);

          this.celebrationParticles.push(spark);

          // Explode outward in all directions
          const angle = (i / sparkCount) * Math.PI * 2 + Math.random() * 0.3;
          const distance = END_SCREEN.FIREWORK_DISTANCE_MIN + Math.random() * END_SCREEN.FIREWORK_DISTANCE_VARIANCE;
          const targetX = explosionX + Math.cos(angle) * distance;
          const targetY = explosionY + Math.sin(angle) * distance + END_SCREEN.FIREWORK_GRAVITY;

          const sparkTween = this.scene.tweens.add({
            targets: spark,
            x: targetX,
            y: targetY,
            alpha: 0,
            scaleX: 0.3,
            scaleY: 0.3,
            duration: END_SCREEN.SPARK_DURATION_BASE + Math.random() * END_SCREEN.SPARK_DURATION_VARIANCE,
            ease: 'Quad.easeOut',
            onComplete: () => {
              spark.destroy();
            },
          });
          this.tweens.push(sparkTween);
        }

        // Add a brief flash at explosion center
        const flash = this.scene.add.graphics();
        flash.fillStyle(PALETTE.white, 0.8);
        flash.fillCircle(0, 0, END_SCREEN.FLASH_RADIUS);
        flash.setPosition(explosionX, explosionY);
        flash.setDepth(DEPTH.FIREWORKS);
        this.celebrationParticles.push(flash);

        const flashTween = this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          duration: END_SCREEN.FLASH_DURATION,
          ease: 'Quad.easeOut',
          onComplete: () => {
            flash.destroy();
          },
        });
        this.tweens.push(flashTween);
      });
      this.delayedCalls.push(fireworkCall);
    }
  }

  destroy(): void {
    // Mark as destroyed to stop ongoing animations
    this.destroyed = true;

    // Cancel canvas border animation
    if (this.borderAnimationId !== null) {
      cancelAnimationFrame(this.borderAnimationId);
      this.borderAnimationId = null;
    }

    // Reset canvas border to purple immediately
    const canvas = document.querySelector('canvas');
    if (canvas) {
      (canvas as HTMLCanvasElement).style.borderColor = COLORS.CANVAS_BORDER;
    }

    // Cancel delayed calls (fireworks, etc.)
    this.delayedCalls.forEach(call => call.destroy());
    this.delayedCalls = [];

    // Stop all tweens
    this.tweens.forEach(tween => {
      if (tween.isPlaying()) {
        tween.stop();
      }
    });
    this.tweens = [];

    // Cleanup celebration particles
    this.celebrationParticles.forEach(p => p.destroy());
    this.celebrationParticles = [];

    this.overlay.destroy();
    this.panel.destroy();
  }
}
