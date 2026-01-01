/**
 * Tutorial Overlay Component
 * Displays instructional popups with gold highlight borders (no dark overlay)
 * Keeps full game visible for learn-by-doing approach
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS } from '@/config';
import { toDPR } from '@/systems/responsive';
import { createText } from '@/ui/ui-utils';
import { createLogger } from '@/systems/logger';
import type { Bounds, TutorialStepDisplay } from '@/systems/tutorial/interfaces';

const log = createLogger('TutorialOverlay');

// Re-export for backwards compatibility
export type { Bounds as HighlightBounds, TutorialStepDisplay } from '@/systems/tutorial/interfaces';

// Keep TutorialStep as alias for backwards compatibility
export type TutorialStep = TutorialStepDisplay;

export interface TutorialOverlayConfig {
  onNext: () => void;
}

export class TutorialOverlay {
  private scene: Phaser.Scene;
  private config: TutorialOverlayConfig;
  private container: Phaser.GameObjects.Container;

  // Highlight elements (using Graphics for stroke-only rendering)
  private highlightGraphics: Phaser.GameObjects.Graphics | null = null;
  private popupContainer: Phaser.GameObjects.Container | null = null;
  private titleText: Phaser.GameObjects.Text | null = null;
  private messageText: Phaser.GameObjects.Text | null = null;
  private nextButton: Phaser.GameObjects.Container | null = null;
  private actionPromptText: Phaser.GameObjects.Text | null = null;
  private popupBg: Phaser.GameObjects.Rectangle | null = null;
  private cornerGraphics: Phaser.GameObjects.Graphics[] = [];

  private isVisible: boolean = false;
  private isTransitioning: boolean = false;
  private pendingStep: TutorialStep | null = null;
  private pulseTimeline: Phaser.Tweens.TweenChain | null = null;
  private currentTallPopup: boolean = false;

  constructor(scene: Phaser.Scene, config: TutorialOverlayConfig) {
    this.scene = scene;
    this.config = config;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(500); // Above game elements
    this.container.setVisible(false);

    this.createOverlay();
  }

  private createOverlay(): void {
    // Graphics for highlight border - add directly to scene with high depth
    // NOT inside the container, so it renders on top of everything
    this.highlightGraphics = this.scene.add.graphics();
    this.highlightGraphics.setDepth(1000); // Very high depth
    log.log('Created highlightGraphics with depth 1000');

    log.log('Highlight colors - gold[500]:', PALETTE.gold[500].toString(16));

    // Create popup container
    this.popupContainer = this.scene.add.container(0, 0);
    this.container.add(this.popupContainer);

    this.createPopup();
  }

  private drawHighlight(highlight: Bounds | null, startPulse: boolean = true): void {
    if (!this.highlightGraphics) return;

    // Clear previous drawing
    this.highlightGraphics.clear();

    // Stop any existing pulse animation
    if (this.pulseTimeline) {
      this.pulseTimeline.destroy();
      this.pulseTimeline = null;
    }

    if (!highlight) return;

    const hx = highlight.x;
    const hy = highlight.y;
    const hw = highlight.width;
    const hh = highlight.height;

    // Draw solid gold border
    this.highlightGraphics.lineStyle(toDPR(3), PALETTE.gold[500], 1.0);
    this.highlightGraphics.strokeRoundedRect(hx, hy, hw, hh, toDPR(6));

    // Start pulse animation (can be deferred for transitions)
    if (startPulse) {
      this.startPulseAnimation();
    }
  }

  private startPulseAnimation(): void {
    if (!this.highlightGraphics) return;

    // Pulse the graphics alpha between 0.4 and 1.0
    this.pulseTimeline = this.scene.tweens.chain({
      targets: this.highlightGraphics,
      tweens: [
        {
          alpha: 0.4,
          duration: 600,
          ease: 'Sine.easeInOut',
        },
        {
          alpha: 1.0,
          duration: 600,
          ease: 'Sine.easeInOut',
        },
      ],
      loop: -1,
    });
  }

  private createPopup(): void {
    if (!this.popupContainer) return;

    // Scale dimensions for DPR
    const margin = toDPR(40);
    const maxWidthCSS = 300;
    const maxWidth = Math.min(this.scene.scale.gameSize.width - margin, toDPR(maxWidthCSS));
    const popupHeight = toDPR(160);

    // Semi-transparent background (not fully opaque so game shows through slightly)
    this.popupBg = this.scene.add.rectangle(0, 0, maxWidth, popupHeight, PALETTE.purple[900], 0.95);
    this.popupBg.setStrokeStyle(toDPR(2), PALETTE.gold[500], 0.8);
    this.popupContainer.add(this.popupBg);

    // Corner accents in gold
    this.addCornerAccents(maxWidth, popupHeight);

    // Title (scaled positions)
    this.titleText = createText(this.scene, 0, toDPR(-50), '', {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5, 0.5);
    this.popupContainer.add(this.titleText);

    // Message - origin at top so it grows downward (scaled)
    const wordWrapWidth = maxWidth - toDPR(30);
    this.messageText = createText(this.scene, 0, toDPR(-30), '', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      wordWrap: { width: wordWrapWidth },
      align: 'center',
    });
    this.messageText.setOrigin(0.5, 0);
    this.popupContainer.add(this.messageText);

    // Next button (will be shown/hidden per step) - scaled
    const buttonY = toDPR(55);
    const buttonWidth = toDPR(100);
    const buttonHeight = toDPR(32);

    this.nextButton = this.createButton(
      0,
      buttonY,
      buttonWidth,
      buttonHeight,
      'NEXT',
      PALETTE.green[700],
      PALETTE.green[500],
      COLORS.TEXT_SUCCESS,
      () => this.config.onNext()
    );
    this.popupContainer.add(this.nextButton);

    // Action prompt text (shown when user needs to do something, hidden when NEXT button is shown)
    this.actionPromptText = createText(this.scene, 0, buttonY, 'Try it now!', {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
      fontStyle: 'bold italic',
    });
    this.actionPromptText.setOrigin(0.5, 0.5);
    this.actionPromptText.setVisible(false);
    this.popupContainer.add(this.actionPromptText);
  }

  private addCornerAccents(width: number, height: number): void {
    if (!this.popupContainer) return;

    // Clear existing corners
    this.cornerGraphics.forEach((g) => g.destroy());
    this.cornerGraphics = [];

    // Scale corner dimensions for DPR
    const inset = toDPR(6);
    const length = toDPR(14);
    const thickness = 2;

    const corners = [
      { x: -width / 2 + inset, y: -height / 2 + inset, ax: 1, ay: 1 },
      { x: width / 2 - inset, y: -height / 2 + inset, ax: -1, ay: 1 },
      { x: width / 2 - inset, y: height / 2 - inset, ax: -1, ay: -1 },
      { x: -width / 2 + inset, y: height / 2 - inset, ax: 1, ay: -1 },
    ];

    corners.forEach(({ x, y, ax, ay }) => {
      const graphics = this.scene.add.graphics();
      graphics.lineStyle(thickness, PALETTE.gold[500], 0.8);
      graphics.beginPath();
      graphics.moveTo(x, y + ay * length);
      graphics.lineTo(x, y);
      graphics.lineTo(x + ax * length, y);
      graphics.strokePath();
      this.popupContainer!.add(graphics);
      this.cornerGraphics.push(graphics);
    });
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    bgColor: number,
    strokeColor: number,
    textColor: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    // Glow effect behind button (like roll button) - scale glow padding
    const glowPadX = toDPR(8);
    const glowPadY = toDPR(6);
    const glow = this.scene.add.rectangle(0, 0, width + glowPadX, height + glowPadY, strokeColor, 0.12);
    container.add(glow);

    const bg = this.scene.add.rectangle(0, 0, width, height, bgColor, 0.95);
    bg.setStrokeStyle(toDPR(2), strokeColor, 0.8);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    const text = createText(this.scene, 0, 0, label, {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: textColor,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);
    container.add(text);

    // Use PALETTE colors directly for hover (green[600] is brighter than green[700])
    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => {
      bg.setFillStyle(PALETTE.green[600], 1);
      bg.setStrokeStyle(toDPR(2), PALETTE.green[400], 1);
      glow.setAlpha(0.3);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor, 0.95);
      bg.setStrokeStyle(toDPR(2), strokeColor, 0.8);
      glow.setAlpha(0.12);
    });

    return container;
  }

  show(step: TutorialStep): void {
    log.log(`Showing step: ${step.id}`);
    const wasAlreadyVisible = this.isVisible;
    this.isVisible = true;

    // If we're in the middle of a transition, queue this step
    if (this.isTransitioning) {
      this.pendingStep = step;
      return;
    }

    // First show - fade everything in
    if (!wasAlreadyVisible) {
      this.updateStepContent(step);
      this.container.setVisible(true);
      this.container.setAlpha(0);
      this.scene.tweens.add({
        targets: this.container,
        alpha: 1,
        duration: 300,
        ease: 'Power2',
      });
    } else {
      // Transition between steps
      this.transitionToStep(step);
    }
  }

  private transitionToStep(step: TutorialStep): void {
    if (!this.popupContainer) return;

    this.isTransitioning = true;

    // Kill any existing pulse
    if (this.pulseTimeline) {
      this.pulseTimeline.destroy();
      this.pulseTimeline = null;
    }

    const fadeOutDuration = 120;
    const fadeInDuration = 150;

    // Fade out popup
    this.scene.tweens.add({
      targets: this.popupContainer,
      alpha: 0,
      duration: fadeOutDuration,
      ease: 'Power2',
    });

    // Fade out highlight at the same time
    if (this.highlightGraphics) {
      this.scene.tweens.add({
        targets: this.highlightGraphics,
        alpha: 0,
        duration: fadeOutDuration,
        ease: 'Power2',
      });
    }

    // After fade out, update content and fade both back in together
    this.scene.time.delayedCall(fadeOutDuration, () => {
      // Update content but don't start pulse yet (would conflict with fade-in)
      this.updateStepContent(step, false);

      // Fade highlight and popup in together
      if (this.highlightGraphics) {
        this.highlightGraphics.setAlpha(0);
        this.scene.tweens.add({
          targets: this.highlightGraphics,
          alpha: 1,
          duration: fadeInDuration,
          ease: 'Power2',
          onComplete: () => {
            // Start pulse AFTER fade-in completes to avoid tween conflict
            this.startPulseAnimation();
          },
        });
      }

      this.scene.tweens.add({
        targets: this.popupContainer,
        alpha: 1,
        duration: fadeInDuration,
        ease: 'Power2',
        onComplete: () => {
          this.isTransitioning = false;

          // If another step was queued, show it now
          if (this.pendingStep) {
            const nextStep = this.pendingStep;
            this.pendingStep = null;
            this.show(nextStep);
          }
        },
      });
    });
  }

  private updateStepContent(step: TutorialStep, startPulse: boolean = true): void {
    // Draw the highlight (no dark overlay)
    // startPulse=false during transitions to avoid conflict with fade-in tween
    this.drawHighlight(step.highlight, startPulse);

    // Handle tall popup sizing (scaled for DPR)
    const isTall = step.tallPopup ?? false;
    this.currentTallPopup = isTall;
    const popupHeight = toDPR(isTall ? 190 : 160);
    const popupWidth = this.popupBg?.width ?? toDPR(300);

    // Resize background if needed
    if (this.popupBg) {
      this.popupBg.setSize(popupWidth, popupHeight);
    }

    // Redraw corner accents for new size
    this.addCornerAccents(popupWidth, popupHeight);

    // Adjust element positions for tall popup (scaled for DPR)
    const titleY = toDPR(isTall ? -65 : -50);
    const messageY = toDPR(isTall ? -40 : -30);
    const buttonY = toDPR(isTall ? 70 : 55);

    // Update popup content
    if (this.titleText) {
      this.titleText.setText(step.title);
      this.titleText.setY(titleY);
    }
    if (this.messageText) {
      this.messageText.setText(step.message);
      this.messageText.setY(messageY);
    }

    // Show/hide next button and action prompt based on step type
    if (this.nextButton) {
      this.nextButton.setVisible(step.showNextButton);
      this.nextButton.setY(buttonY);

      // Update button text for last step (text is at index 2: glow, bg, text)
      const nextText = this.nextButton.getAt(2) as Phaser.GameObjects.Text;
      if (nextText && nextText.setText) {
        nextText.setText(step.id === 'freeplay' ? 'GOT IT!' : 'NEXT');
      }
    }

    // Show action prompt when user needs to do something (no NEXT button)
    if (this.actionPromptText) {
      this.actionPromptText.setVisible(!step.showNextButton);
      this.actionPromptText.setY(buttonY);
    }

    // Position popup based on highlight and position preference
    this.positionPopup(step);
  }

  private positionPopup(step: TutorialStep): void {
    if (!this.popupContainer) return;

    const { width, height } = this.scene.scale.gameSize;
    // Scale popup dimensions for DPR
    const popupWidth = toDPR(300);
    const popupHeight = toDPR(this.currentTallPopup ? 190 : 160);
    const margin = toDPR(20);

    let popupX = width / 2;
    let popupY = height / 2;

    if (!step.highlight) {
      // No highlight - center the popup
      this.popupContainer.setPosition(popupX, popupY);
      return;
    }

    const h = step.highlight;
    const highlightCenterX = h.x + h.width / 2;
    const highlightCenterY = h.y + h.height / 2;

    switch (step.popupPosition) {
      case 'above':
        popupX = highlightCenterX;
        popupY = h.y - popupHeight / 2 - margin;
        break;
      case 'below':
        popupX = highlightCenterX;
        popupY = h.y + h.height + popupHeight / 2 + margin;
        break;
      case 'left':
        popupX = h.x - popupWidth / 2 - margin;
        popupY = highlightCenterY;
        break;
      case 'right':
        popupX = h.x + h.width + popupWidth / 2 + margin;
        popupY = highlightCenterY;
        break;
      case 'center':
      default:
        // Position at center of screen
        break;
    }

    // Clamp to screen bounds (scaled padding for DPR)
    const clampPad = toDPR(10);
    popupX = Phaser.Math.Clamp(popupX, popupWidth / 2 + clampPad, width - popupWidth / 2 - clampPad);
    popupY = Phaser.Math.Clamp(popupY, popupHeight / 2 + clampPad, height - popupHeight / 2 - clampPad);

    this.popupContainer.setPosition(popupX, popupY);
  }

  hide(): void {
    if (!this.isVisible) return;

    if (this.pulseTimeline) {
      this.pulseTimeline.destroy();
      this.pulseTimeline = null;
    }

    // Clear the highlight graphics
    if (this.highlightGraphics) {
      this.highlightGraphics.clear();
    }

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        this.container.setVisible(false);
        this.isVisible = false;
      },
    });
  }

  destroy(): void {
    log.log('Destroying tutorial overlay');
    if (this.pulseTimeline) {
      this.pulseTimeline.destroy();
    }
    if (this.highlightGraphics) {
      this.scene.tweens.killTweensOf(this.highlightGraphics);
      this.highlightGraphics.destroy(); // Destroy separately since not in container
    }
    this.cornerGraphics.forEach((g) => g.destroy());
    this.cornerGraphics = [];
    this.container.destroy();
  }
}
