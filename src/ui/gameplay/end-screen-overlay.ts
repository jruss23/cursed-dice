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

type ButtonStyle = 'primary' | 'secondary' | 'warning' | 'danger' | 'victory';

export class EndScreenOverlay {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Rectangle;
  private panel: Phaser.GameObjects.Container;
  private tweens: Phaser.Tweens.Tween[] = [];
  private isMobile: boolean = false;
  private celebrationParticles: Phaser.GameObjects.Graphics[] = [];

  // Elements to animate during victory color transition
  private panelBg: Phaser.GameObjects.Rectangle | null = null;
  private dividers: Phaser.GameObjects.Rectangle[] = [];
  private cornerAccents: Phaser.GameObjects.Graphics[] = [];
  private titleText: Phaser.GameObjects.Text | null = null;
  private titleGlow: Phaser.GameObjects.Text | null = null;
  private subtitleText: Phaser.GameObjects.Text | null = null;
  private scoreTexts: Phaser.GameObjects.Text[] = [];

  constructor(
    scene: Phaser.Scene,
    config: EndScreenConfig,
    callbacks: EndScreenCallbacks
  ) {
    this.scene = scene;
    const { width, height } = this.scene.cameras.main;
    const metrics = getViewportMetrics(scene);
    this.isMobile = metrics.isMobile;

    // Dark overlay - blocks clicks to elements behind (like pause button)
    this.overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, PALETTE.purple[900], 0.95);
    this.overlay.setInteractive();
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
    const titleY = 45;
    this.titleGlow = createText(this.scene, panelWidth / 2, titleY, titleText, {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: titleColor,
      fontStyle: 'bold',
    });
    this.titleGlow.setOrigin(0.5, 0.5);
    this.titleGlow.setAlpha(0.4);
    this.titleGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.panel.add(this.titleGlow);

    this.titleText = createText(this.scene, panelWidth / 2, titleY, titleText, {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: titleColor,
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5, 0.5);
    this.panel.add(this.titleText);

    // Subtitle
    this.subtitleText = createText(this.scene, panelWidth / 2, titleY + 30, subtitleText, {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    this.subtitleText.setOrigin(0.5, 0.5);
    this.panel.add(this.subtitleText);

    // Divider line
    const divider1 = this.scene.add.rectangle(panelWidth / 2, 100, panelWidth - 60, 1, PALETTE.purple[500], 0.4);
    this.panel.add(divider1);
    this.dividers.push(divider1);

    // Scores section
    this.buildScoresSection(panelWidth, modeScore, totalScore, passed);

    // Divider before buttons
    const divider2 = this.scene.add.rectangle(panelWidth / 2, 220, panelWidth - 60, 1, PALETTE.purple[500], 0.4);
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
    const centerX = panelWidth / 2;
    const scoreY = 150;

    const totalLabel = createText(this.scene, centerX, scoreY - 25, 'FINAL SCORE', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    totalLabel.setOrigin(0.5, 0.5);
    this.panel.add(totalLabel);
    this.scoreTexts.push(totalLabel);

    const totalScoreText = createText(this.scene, centerX, scoreY + 5, `${totalScore}`, {
      fontSize: FONTS.SIZE_MODE_TITLE,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_ACCENT,
      fontStyle: 'bold',
    });
    totalScoreText.setOrigin(0.5, 0.5);
    this.panel.add(totalScoreText);
    this.scoreTexts.push(totalScoreText);

    // Round score - smaller, underneath
    const roundLabel = createText(this.scene, centerX, scoreY + 30, `This round: +${modeScore}`, {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: passed ? COLORS.TEXT_SUCCESS : COLORS.TEXT_DANGER,
    });
    roundLabel.setOrigin(0.5, 0.5);
    this.panel.add(roundLabel);
    this.scoreTexts.push(roundLabel);
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
      // Victory - single menu button (centered, solid gold style)
      this.createButton(panelWidth / 2, buttonY, 'NEW GAME', callbacks.onNewGame, 'victory');
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
      victory: {
        bg: 0xFFD700,        // Solid bright gold
        bgHover: 0xFFE033,   // Lighter gold on hover
        border: 0xDAA520,    // Goldenrod border (richer contrast)
        borderHover: 0xFFD700, // Bright gold on hover
        glow: 0xDAA520,      // Goldenrod glow
        text: '#FFF8DC',     // Cornsilk / light cream text
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

  /**
   * Victory celebration with screen flash, confetti, and fireworks
   */
  private playVictoryCelebration(width: number, height: number): void {
    // Screen flash effect
    this.scene.cameras.main.flash(300, 255, 215, 0, false); // Gold flash

    // Color chase transition STARTS FIRST: purple → light blue / gold over 4 seconds
    this.playColorTransition(width, height);

    // Confetti and fireworks start after a delay (while colors are already transitioning)
    const celebrationDelay = 800; // Start confetti 0.8s after color transition begins

    // Create celebratory particles (confetti-like) - lots over extended time
    const colors = [PALETTE.gold[400], PALETTE.gold[500], 0xffffff, 0xFFE4B5]; // Warm colors only
    const particleCount = this.isMobile ? 120 : 200;

    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics();
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 4 + Math.random() * 6;

      particle.fillStyle(color, 1);
      particle.fillRect(-size / 2, -size / 2, size, size);

      // Start position - spread across top
      const startX = Math.random() * width;
      const startY = -20;
      particle.setPosition(startX, startY);
      particle.setDepth(102); // Above panel
      particle.setRotation(Math.random() * Math.PI * 2);

      this.celebrationParticles.push(particle);

      // Animate falling with slight horizontal movement - staggered over 5 seconds
      const targetX = startX + (Math.random() - 0.5) * 100;
      const targetY = height + 50;
      const delay = celebrationDelay + Math.random() * 5000;
      const duration = 2000 + Math.random() * 1000;

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
    this.scene.time.delayedCall(celebrationDelay, () => {
      this.launchFireworks(width, height);
    });
  }

  /**
   * Animate colors from dark purple to light blue/gold with top-down wipe effect
   */
  private playColorTransition(width: number, height: number): void {
    const duration = 4000;

    // Create blue overlay with soft gradient edge (light breaking through effect)
    const blueOverlay = this.scene.add.graphics();
    blueOverlay.setDepth(99);
    this.celebrationParticles.push(blueOverlay);

    // Create light rays/beams effect
    const lightRays = this.scene.add.graphics();
    lightRays.setDepth(98);
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
        const blurSize = 80; // Size of the soft gradient edge

        blueOverlay.clear();
        lightRays.clear();

        // Draw the solid blue portion (above the blur zone)
        if (mainY > blurSize) {
          blueOverlay.fillStyle(0x87CEEB, 1);
          blueOverlay.fillRect(0, 0, width, mainY - blurSize);
        }

        // Draw smooth gradient blur zone (more steps for less grain)
        const gradientSteps = 30;
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
          const rayCount = 5;
          for (let r = 0; r < rayCount; r++) {
            const rayX = (width / (rayCount + 1)) * (r + 1);
            const rayWidth = 30 + Math.sin(progress * Math.PI * 2 + r) * 15;
            const rayAlpha = 0.3 + Math.sin(progress * Math.PI + r * 0.5) * 0.2;

            // Vertical light beam
            lightRays.fillStyle(0xFFFFCC, rayAlpha);
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
        blueOverlay.fillStyle(0x87CEEB, 1);
        blueOverlay.fillRect(0, 0, width, height);
      }
    });
    this.tweens.push(wipeTween);

    // Animate the game canvas border with wipe timing
    const gameCanvas = document.querySelector('canvas');
    if (gameCanvas) {
      const startTime = Date.now();
      const animateBorder = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const r = Math.floor(124 + (255 - 124) * progress);
        const g = Math.floor(58 + (215 - 58) * progress);
        const b = Math.floor(237 + (0 - 237) * progress);
        gameCanvas.style.borderColor = `rgb(${r}, ${g}, ${b})`;
        if (progress < 1) {
          requestAnimationFrame(animateBorder);
        }
      };
      animateBorder();
    }

    // UNIFIED TIMING: All panel elements transition together
    const transitionDelay = duration * 0.25; // Start at 25% through wipe
    const transitionDuration = duration * 0.5; // Take 50% of total duration

    // Animate panel background
    if (this.panelBg) {
      const colorProxy = { r: 26, g: 10, b: 46 };
      const targetBg = { r: 230, g: 245, b: 255 }; // Very light blue

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
      const borderProxy = { r: 124, g: 58, b: 237 };
      const targetBorder = { r: 255, g: 215, b: 0 };

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
      const dividerProxy = { r: 124, g: 58, b: 237 };
      const targetDiv = { r: 255, g: 215, b: 0 };

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
      const cornerProxy = { r: 167, g: 139, b: 250 };
      const targetCorner = { r: 255, g: 223, b: 0 };

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
      const titleProxy = { r: 255, g: 221, b: 136 };
      const targetTitle = { r: 218, g: 165, b: 32 }; // Goldenrod - rich gold

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
      const subProxy = { r: 170, g: 170, b: 192 };
      const targetSub = { r: 60, g: 80, b: 100 }; // Dark blue-gray

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

    // Score texts: all transition to warm bronze/amber tones for light blue bg
    this.scoreTexts.forEach((text) => {
      const currentColor = text.style.color as string;
      let startColor = { r: 170, g: 170, b: 192 }; // Default
      let endColor = { r: 139, g: 90, b: 43 }; // Warm brown/bronze

      // Determine starting color based on current
      if (currentColor.includes('88ee88') || currentColor.includes('TEXT_SUCCESS')) {
        // Green (total score) → dark goldenrod
        startColor = { r: 136, g: 238, b: 136 };
        endColor = { r: 184, g: 134, b: 11 }; // Dark goldenrod
      } else if (currentColor.includes('ccaaff') || currentColor.includes('TEXT_ACCENT')) {
        // Purple (run score) → golden bronze
        startColor = { r: 204, g: 170, b: 255 };
        endColor = { r: 205, g: 149, b: 12 }; // Golden bronze
      } else if (currentColor.includes('aaaac0')) {
        // Secondary text → dark warm gray
        startColor = { r: 170, g: 170, b: 192 };
        endColor = { r: 100, g: 80, b: 60 }; // Warm dark gray
      }

      const textProxy = { ...startColor };
      const textTween = this.scene.tweens.add({
        targets: textProxy,
        r: endColor.r,
        g: endColor.g,
        b: endColor.b,
        delay,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const hex = Phaser.Display.Color.RGBToString(
            Math.floor(textProxy.r),
            Math.floor(textProxy.g),
            Math.floor(textProxy.b)
          );
          text.setColor(hex);
        },
      });
      this.tweens.push(textTween);
    });
  }

  /**
   * Shimmer animation for the victory button - synced with panel transitions
   */
  private animateVictoryButton(delay: number, duration: number): void {
    // Find the button elements (they're near the end of the panel's children)
    const panelChildren = this.panel.list as Phaser.GameObjects.GameObject[];

    let buttonFound = false;

    // Look for the button background (rectangle near end) and button text
    for (let i = panelChildren.length - 1; i >= 0; i--) {
      const child = panelChildren[i];

      // Find button background
      if (!buttonFound && child instanceof Phaser.GameObjects.Rectangle && child.width > 100) {
        // This is likely the button background
        const btn = child;
        buttonFound = true;

        // Start with purple, shimmer to gold/goldenrod - use unified timing
        const fillProxy = { r: 124, g: 58, b: 237 }; // Start purple
        const borderProxy = { r: 124, g: 58, b: 237 }; // Start purple

        btn.setFillStyle(Phaser.Display.Color.GetColor(fillProxy.r, fillProxy.g, fillProxy.b), 1);
        btn.setStrokeStyle(2, Phaser.Display.Color.GetColor(borderProxy.r, borderProxy.g, borderProxy.b), 1);

        // Fill tween → bright gold
        const fillTween = this.scene.tweens.add({
          targets: fillProxy,
          r: 255, g: 215, b: 0,
          delay,
          duration,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            const color = Phaser.Display.Color.GetColor(
              Math.floor(fillProxy.r),
              Math.floor(fillProxy.g),
              Math.floor(fillProxy.b)
            );
            btn.setFillStyle(color, 1);
          },
        });
        this.tweens.push(fillTween);

        // Border tween → goldenrod
        const borderTween = this.scene.tweens.add({
          targets: borderProxy,
          r: 218, g: 165, b: 32,
          delay,
          duration,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            const color = Phaser.Display.Color.GetColor(
              Math.floor(borderProxy.r),
              Math.floor(borderProxy.g),
              Math.floor(borderProxy.b)
            );
            btn.setStrokeStyle(2, color, 1);
          },
        });
        this.tweens.push(borderTween);
      }

      // Find button text (text element near end with "NEW GAME")
      if (child instanceof Phaser.GameObjects.Text) {
        const text = child.text.toUpperCase();
        if (text.includes('NEW') || text.includes('GAME')) {
          // Animate button text to goldenrod
          const textProxy = { r: 255, g: 255, b: 255 }; // Start white
          const targetText = { r: 218, g: 165, b: 32 }; // Goldenrod

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
              child.setColor(hex);
            },
          });
          this.tweens.push(textTween);
        }
      }
    }
  }

  /**
   * Launch firework explosions at random positions
   */
  private launchFireworks(width: number, height: number): void {
    const fireworkCount = this.isMobile ? 12 : 20;
    const fireworkColors = [
      PALETTE.gold[300], PALETTE.gold[500],
      PALETTE.green[300], PALETTE.green[500],
      PALETTE.purple[300], PALETTE.purple[500],
      0xff6b6b, 0x4ecdc4, 0xffe66d
    ];

    for (let f = 0; f < fireworkCount; f++) {
      const delay = f * 250 + Math.random() * 100; // Spread over 5 seconds

      this.scene.time.delayedCall(delay, () => {
        // Random explosion point (avoid edges and center panel area)
        const explosionX = 50 + Math.random() * (width - 100);
        const explosionY = 50 + Math.random() * (height * 0.4);

        // Pick a random color for this firework
        const baseColor = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
        const sparkCount = this.isMobile ? 12 : 20;

        // Create explosion sparks
        for (let i = 0; i < sparkCount; i++) {
          const spark = this.scene.add.graphics();
          const sparkSize = 3 + Math.random() * 4;

          spark.fillStyle(baseColor, 1);
          spark.fillCircle(0, 0, sparkSize);

          spark.setPosition(explosionX, explosionY);
          spark.setDepth(103); // Above confetti
          spark.setAlpha(1);

          this.celebrationParticles.push(spark);

          // Explode outward in all directions
          const angle = (i / sparkCount) * Math.PI * 2 + Math.random() * 0.3;
          const distance = 60 + Math.random() * 80;
          const targetX = explosionX + Math.cos(angle) * distance;
          const targetY = explosionY + Math.sin(angle) * distance + 40; // Slight gravity

          const sparkTween = this.scene.tweens.add({
            targets: spark,
            x: targetX,
            y: targetY,
            alpha: 0,
            scaleX: 0.3,
            scaleY: 0.3,
            duration: 800 + Math.random() * 400,
            ease: 'Quad.easeOut',
            onComplete: () => {
              spark.destroy();
            },
          });
          this.tweens.push(sparkTween);
        }

        // Add a brief flash at explosion center
        const flash = this.scene.add.graphics();
        flash.fillStyle(0xffffff, 0.8);
        flash.fillCircle(0, 0, 15);
        flash.setPosition(explosionX, explosionY);
        flash.setDepth(103);
        this.celebrationParticles.push(flash);

        const flashTween = this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          duration: 200,
          ease: 'Quad.easeOut',
          onComplete: () => {
            flash.destroy();
          },
        });
        this.tweens.push(flashTween);
      });
    }
  }

  destroy(): void {
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
