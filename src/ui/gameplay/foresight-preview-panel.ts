/**
 * Foresight Preview Panel
 * Shows ghost/translucent dice previewing the next roll
 * Includes Accept and Reject buttons
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, GAME_RULES } from '@/config';
import { createText } from '@/ui/ui-utils';
import { createLogger } from '@/systems/logger';

const log = createLogger('ForesightPreview');

/** Pip position multipliers (normalized to pip offset) */
const PIP_LAYOUT: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 0, y: 0 }],
  2: [{ x: -1, y: -1 }, { x: 1, y: 1 }],
  3: [{ x: -1, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 1 }],
  4: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }],
  5: [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 0, y: 0 }, { x: -1, y: 1 }, { x: 1, y: 1 }],
  6: [{ x: -1, y: -1 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
};

export interface ForesightPreviewConfig {
  centerX: number;
  centerY: number; // Y position of main dice - preview will appear above
  diceSize: number;
  diceSpacing: number;
  onAccept: () => void;
  onReject: () => void;
}

interface PreviewDie {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  pipsGraphics: Phaser.GameObjects.Graphics;
}

export class ForesightPreviewPanel {
  private scene: Phaser.Scene;
  private config: ForesightPreviewConfig;
  private container: Phaser.GameObjects.Container;

  private previewDice: PreviewDie[] = [];
  private acceptButton: Phaser.GameObjects.Container | null = null;
  private rejectButton: Phaser.GameObjects.Container | null = null;
  private labelText: Phaser.GameObjects.Text | null = null;
  private glowTween: Phaser.Tweens.Tween | null = null;

  private isVisible: boolean = false;
  private currentValues: number[] = [];

  constructor(scene: Phaser.Scene, config: ForesightPreviewConfig) {
    this.scene = scene;
    this.config = config;

    // Position preview above main dice
    const previewY = config.centerY - 100;
    this.container = scene.add.container(config.centerX, previewY);
    this.container.setDepth(100);
    this.container.setVisible(false);
    this.container.setAlpha(0);

    this.create();
  }

  private create(): void {
    const { diceSize, diceSpacing } = this.config;
    const pipRadius = diceSize * 0.08;
    const pipOffset = diceSize * 0.22;

    // Label above preview dice
    this.labelText = createText(this.scene, 0, -45, '✨ PREVIEW ✨', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
      fontStyle: 'bold',
    });
    this.labelText.setOrigin(0.5, 0.5);
    this.container.add(this.labelText);

    // Create preview dice (smaller, translucent)
    const previewDiceSize = diceSize * 0.75;
    const previewSpacing = diceSpacing * 0.75;
    const diceAreaWidth = (GAME_RULES.DICE_COUNT - 1) * previewSpacing;
    const startX = -diceAreaWidth / 2;

    for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
      const x = startX + i * previewSpacing;
      const die = this.createPreviewDie(x, 0, previewDiceSize, pipRadius * 0.75, pipOffset * 0.75);
      this.previewDice.push(die);
    }

    // Accept button (green checkmark)
    const buttonY = 50;
    const buttonWidth = 70;
    const buttonHeight = 32;
    const buttonGap = 20;

    this.acceptButton = this.createButton(
      -buttonWidth / 2 - buttonGap / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      '✓ USE',
      PALETTE.green[700],
      PALETTE.green[500],
      COLORS.TEXT_SUCCESS,
      () => {
        log.log('Accept clicked');
        this.config.onAccept();
      }
    );
    this.container.add(this.acceptButton);

    // Reject button (red X)
    this.rejectButton = this.createButton(
      buttonWidth / 2 + buttonGap / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      '✗ SKIP',
      PALETTE.red[700],
      PALETTE.red[500],
      COLORS.TEXT_DANGER,
      () => {
        log.log('Reject clicked');
        this.config.onReject();
      }
    );
    this.container.add(this.rejectButton);
  }

  private createPreviewDie(x: number, y: number, size: number, pipRadius: number, pipOffset: number): PreviewDie {
    const container = this.scene.add.container(x, y);
    this.container.add(container);

    // Mystical glow behind die
    const glow = this.scene.add.graphics();
    glow.fillStyle(PALETTE.purple[400], 0.3);
    glow.fillCircle(0, 0, size * 0.7);
    container.add(glow);

    // Die background - translucent purple/mystical
    const bg = this.scene.add.rectangle(0, 0, size, size, PALETTE.purple[600], 0.8);
    bg.setStrokeStyle(2, PALETTE.purple[400], 0.9);
    container.add(bg);

    // Pips
    const pipsGraphics = this.scene.add.graphics();
    container.add(pipsGraphics);

    // Store pip config for drawing
    (container as unknown as { pipRadius: number; pipOffset: number }).pipRadius = pipRadius;
    (container as unknown as { pipRadius: number; pipOffset: number }).pipOffset = pipOffset;

    return { container, bg, pipsGraphics };
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

    // Glow
    const glow = this.scene.add.rectangle(0, 0, width + 6, height + 6, strokeColor, 0.15);
    container.add(glow);

    // Background
    const bg = this.scene.add.rectangle(0, 0, width, height, bgColor, 0.95);
    bg.setStrokeStyle(2, strokeColor, 0.8);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    // Label
    const text = createText(this.scene, 0, 0, label, {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: textColor,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);
    container.add(text);

    // Interactions
    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => {
      bg.setFillStyle(bgColor, 1);
      bg.setStrokeStyle(2, strokeColor, 1);
      glow.setAlpha(0.3);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor, 0.95);
      bg.setStrokeStyle(2, strokeColor, 0.8);
      glow.setAlpha(0.15);
    });

    return container;
  }

  private drawPips(graphics: Phaser.GameObjects.Graphics, value: number, pipRadius: number, pipOffset: number): void {
    graphics.clear();
    graphics.fillStyle(0xffffff, 0.9);

    const positions = PIP_LAYOUT[value];
    for (const pos of positions) {
      graphics.fillCircle(pos.x * pipOffset, pos.y * pipOffset, pipRadius);
    }
  }

  /**
   * Show the preview with the given dice values
   * @param values Array of dice values to preview
   * @param lockedIndices Indices of dice that are locked (will be dimmed in preview)
   */
  show(values: number[], lockedIndices: boolean[]): void {
    if (this.isVisible) return;

    log.log('Showing preview:', values);
    this.isVisible = true;
    this.currentValues = [...values];

    // Update dice displays
    for (let i = 0; i < this.previewDice.length; i++) {
      const die = this.previewDice[i];
      const value = values[i];
      const isLocked = lockedIndices[i];

      // Get pip config from container
      const cfg = die.container as unknown as { pipRadius: number; pipOffset: number };

      if (isLocked) {
        // Locked dice are dimmed - they won't change
        die.bg.setFillStyle(PALETTE.neutral[700], 0.5);
        die.bg.setStrokeStyle(1, PALETTE.neutral[500], 0.5);
        this.drawPips(die.pipsGraphics, value, cfg.pipRadius, cfg.pipOffset);
        die.pipsGraphics.setAlpha(0.5);
      } else {
        // Unlocked dice show the preview
        die.bg.setFillStyle(PALETTE.purple[600], 0.9);
        die.bg.setStrokeStyle(2, PALETTE.purple[400], 1);
        this.drawPips(die.pipsGraphics, value, cfg.pipRadius, cfg.pipOffset);
        die.pipsGraphics.setAlpha(1);
      }
    }

    // Animate in
    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.container.setScale(0.8);

    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Pulsing glow effect
    this.glowTween = this.scene.tweens.add({
      targets: this.labelText,
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Mystical particles
    this.createMysticalParticles();
  }

  private createMysticalParticles(): void {
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 50, () => {
        if (!this.isVisible) return;

        const x = this.config.centerX + Phaser.Math.Between(-100, 100);
        const y = this.config.centerY - 100 + Phaser.Math.Between(-30, 30);

        const particle = this.scene.add.circle(x, y, Phaser.Math.Between(2, 5), PALETTE.purple[300], 0.8);
        particle.setDepth(99);

        this.scene.tweens.add({
          targets: particle,
          y: y - 40,
          alpha: 0,
          scaleX: 0.3,
          scaleY: 0.3,
          duration: 600,
          ease: 'Quad.easeOut',
          onComplete: () => particle.destroy(),
        });
      });
    }
  }

  /**
   * Hide the preview panel
   */
  hide(): void {
    if (!this.isVisible) return;

    log.log('Hiding preview');
    this.isVisible = false;

    // Stop glow animation
    if (this.glowTween) {
      this.glowTween.destroy();
      this.glowTween = null;
    }

    // Animate out
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.container.setVisible(false);
      },
    });
  }

  /**
   * Get the current preview values
   */
  getValues(): number[] {
    return [...this.currentValues];
  }

  /**
   * Check if preview is currently visible
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  destroy(): void {
    if (this.glowTween) {
      this.glowTween.destroy();
    }
    this.container.destroy();
  }
}
