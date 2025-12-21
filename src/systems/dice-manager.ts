/**
 * Dice Manager
 * Handles dice state, rolling logic, and UI rendering
 * Extracted from GameplayScene for better separation of concerns
 */

import Phaser from 'phaser';
import { COLORS, SIZES, FONTS, GAME_RULES, PALETTE } from '@/config';
import { GameEventEmitter } from './game-events';
import { createLogger } from './logger';

const log = createLogger('DiceManager');

// =============================================================================
// TYPES
// =============================================================================

export interface DiceState {
  values: number[];
  locked: boolean[];
  rerollsLeft: number;
  cursedIndex: number; // Mode 2: which die is permanently locked this turn (-1 = none)
}

interface DiceSprite {
  container: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;
  bg: Phaser.GameObjects.Rectangle;
  innerBg: Phaser.GameObjects.Rectangle;
  shine: Phaser.GameObjects.Graphics;
  pipsGraphics: Phaser.GameObjects.Graphics;
  lockIndicator: Phaser.GameObjects.Text;
  lockIcon: Phaser.GameObjects.Graphics;
  cursedIcon: Phaser.GameObjects.Graphics;
  glowGraphics: Phaser.GameObjects.Graphics;
  originalX: number;
  originalY: number;
}

// Pip positions for each die value
const PIP_POSITIONS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 0, y: 0 }],
  2: [
    { x: -SIZES.DICE_PIP_OFFSET, y: -SIZES.DICE_PIP_OFFSET },
    { x: SIZES.DICE_PIP_OFFSET, y: SIZES.DICE_PIP_OFFSET },
  ],
  3: [
    { x: -SIZES.DICE_PIP_OFFSET, y: -SIZES.DICE_PIP_OFFSET },
    { x: 0, y: 0 },
    { x: SIZES.DICE_PIP_OFFSET, y: SIZES.DICE_PIP_OFFSET },
  ],
  4: [
    { x: -SIZES.DICE_PIP_OFFSET, y: -SIZES.DICE_PIP_OFFSET },
    { x: SIZES.DICE_PIP_OFFSET, y: -SIZES.DICE_PIP_OFFSET },
    { x: -SIZES.DICE_PIP_OFFSET, y: SIZES.DICE_PIP_OFFSET },
    { x: SIZES.DICE_PIP_OFFSET, y: SIZES.DICE_PIP_OFFSET },
  ],
  5: [
    { x: -SIZES.DICE_PIP_OFFSET, y: -SIZES.DICE_PIP_OFFSET },
    { x: SIZES.DICE_PIP_OFFSET, y: -SIZES.DICE_PIP_OFFSET },
    { x: 0, y: 0 },
    { x: -SIZES.DICE_PIP_OFFSET, y: SIZES.DICE_PIP_OFFSET },
    { x: SIZES.DICE_PIP_OFFSET, y: SIZES.DICE_PIP_OFFSET },
  ],
  6: [
    { x: -SIZES.DICE_PIP_OFFSET, y: -SIZES.DICE_PIP_OFFSET },
    { x: -SIZES.DICE_PIP_OFFSET, y: 0 },
    { x: -SIZES.DICE_PIP_OFFSET, y: SIZES.DICE_PIP_OFFSET },
    { x: SIZES.DICE_PIP_OFFSET, y: -SIZES.DICE_PIP_OFFSET },
    { x: SIZES.DICE_PIP_OFFSET, y: 0 },
    { x: SIZES.DICE_PIP_OFFSET, y: SIZES.DICE_PIP_OFFSET },
  ],
};

// =============================================================================
// DICE MANAGER
// =============================================================================

export class DiceManager {
  private scene: Phaser.Scene;
  private events: GameEventEmitter;
  private state: DiceState;
  private sprites: DiceSprite[] = [];
  private rollButton: Phaser.GameObjects.Container | null = null;
  private rerollText: Phaser.GameObjects.Text | null = null;
  private enabled: boolean = true;

  constructor(scene: Phaser.Scene, events: GameEventEmitter) {
    this.scene = scene;
    this.events = events;
    this.state = this.createInitialState();
  }

  // ===========================================================================
  // STATE MANAGEMENT
  // ===========================================================================

  private createInitialState(): DiceState {
    return {
      values: Array(GAME_RULES.DICE_COUNT).fill(1),
      locked: Array(GAME_RULES.DICE_COUNT).fill(false),
      rerollsLeft: GAME_RULES.REROLLS_PER_TURN,
      cursedIndex: -1,
    };
  }

  /**
   * Reset dice state for a new turn
   * Clears cursed die - will be set again by GameplayScene after roll
   */
  reset(): void {
    this.state = this.createInitialState();
    this.updateDisplay();
    this.events.emit('dice:unlockAll');
  }

  /**
   * Set which die is "cursed" (permanently locked) - Mode 2
   * @param index Die index (0-4), or -1 to clear
   */
  setCursedDie(index: number): void {
    // Clear old cursed die visual
    if (this.state.cursedIndex >= 0) {
      this.state.locked[this.state.cursedIndex] = false;
      this.updateDieDisplay(this.state.cursedIndex);
    }

    this.state.cursedIndex = index;

    if (index >= 0 && index < GAME_RULES.DICE_COUNT) {
      // Lock the cursed die
      this.state.locked[index] = true;
      this.updateDieDisplay(index);

      // Visual feedback - shake the cursed die
      const sprite = this.sprites[index];
      if (sprite) {
        this.scene.tweens.add({
          targets: sprite.container,
          x: sprite.originalX + 5,
          duration: 50,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            sprite.container.x = sprite.originalX; // Ensure exact position
          },
        });
      }
    }

    log.log(`Cursed die set to index: ${index}`);
  }

  /**
   * Clear cursed die
   */
  clearCursedDie(): void {
    this.setCursedDie(-1);
  }

  /**
   * Get current dice values
   */
  getValues(): number[] {
    return [...this.state.values];
  }

  /**
   * Get current state
   */
  getState(): DiceState {
    return { ...this.state };
  }

  /**
   * Enable/disable dice interaction
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    // Actually disable/enable the interactive elements
    for (const sprite of this.sprites) {
      if (enabled) {
        sprite.bg.setInteractive({ useHandCursor: true });
      } else {
        sprite.bg.disableInteractive();
      }
    }

    // Also disable roll button
    const rollBtn = this.rollButton?.getData('bg') as Phaser.GameObjects.Rectangle | null;
    if (rollBtn) {
      if (enabled) {
        rollBtn.setInteractive({ useHandCursor: true });
      } else {
        rollBtn.disableInteractive();
      }
    }
  }

  // ===========================================================================
  // UI CREATION
  // ===========================================================================

  /**
   * Create the dice UI at the specified position
   */
  createUI(centerX: number, centerY: number): void {
    const diceAreaWidth = (GAME_RULES.DICE_COUNT - 1) * SIZES.DICE_SPACING;
    const startX = centerX - diceAreaWidth / 2;

    // Pulsing tip text above dice (like scorecard helper)
    const tipText = this.scene.add.text(centerX, centerY - 70, 'Click dice to lock', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
    });
    tipText.setOrigin(0.5, 0.5);
    tipText.setResolution(window.devicePixelRatio * 2);

    // Pulsing animation
    this.scene.tweens.add({
      targets: tipText,
      alpha: 0.3,
      duration: SIZES.ANIM_PULSE,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Create dice sprites
    for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
      const x = startX + i * SIZES.DICE_SPACING;
      this.sprites.push(this.createDieSprite(x, centerY, i));
    }

    // Create controls panel below dice (more spacing)
    this.createControlsPanel(centerX, centerY + 140);
  }

  /**
   * Create the controls panel with rerolls and roll button
   */
  private createControlsPanel(centerX: number, centerY: number): void {
    const panelWidth = 260;
    const panelHeight = 70;
    const panelX = centerX - panelWidth / 2;
    const panelY = centerY - panelHeight / 2;

    // Panel container
    const panel = this.scene.add.container(panelX, panelY);

    // Panel background with glow
    const outerGlow = this.scene.add.rectangle(
      panelWidth / 2, panelHeight / 2,
      panelWidth + SIZES.PANEL_GLOW_SIZE, panelHeight + SIZES.PANEL_GLOW_SIZE,
      PALETTE.purple[500], 0.06
    );
    panel.add(outerGlow);

    const panelBg = this.scene.add.rectangle(
      panelWidth / 2, panelHeight / 2,
      panelWidth, panelHeight,
      PALETTE.purple[900], 0.88
    );
    panelBg.setStrokeStyle(SIZES.PANEL_BORDER_WIDTH, PALETTE.purple[500], 0.5);
    panel.add(panelBg);

    // Corner accents
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
      accent.lineStyle(2, PALETTE.purple[400], 0.4);
      accent.beginPath();
      accent.moveTo(corner.x, corner.y + cornerSize * corner.ay);
      accent.lineTo(corner.x, corner.y);
      accent.lineTo(corner.x + cornerSize * corner.ax, corner.y);
      accent.strokePath();
      panel.add(accent);
    });

    // Two-column layout: Rerolls (left) | Roll button (right)
    const leftColX = 65;
    const rightColX = panelWidth - 75;
    const rowY = panelHeight / 2;

    // Rerolls display (left column)
    const rerollsLabel = this.scene.add.text(leftColX, rowY - 12, 'REROLLS', {
      fontSize: FONTS.SIZE_TINY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    rerollsLabel.setOrigin(0.5, 0.5);
    rerollsLabel.setResolution(window.devicePixelRatio * 2);
    panel.add(rerollsLabel);

    this.rerollText = this.scene.add.text(leftColX, rowY + 12, `${this.state.rerollsLeft}`, {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    this.rerollText.setOrigin(0.5, 0.5);
    this.rerollText.setResolution(window.devicePixelRatio * 2);
    panel.add(this.rerollText);

    // Vertical divider
    const divider = this.scene.add.rectangle(panelWidth / 2, rowY, 1, panelHeight - 24, PALETTE.purple[500], 0.3);
    panel.add(divider);

    // Roll button (right column)
    const btnGlow = this.scene.add.rectangle(
      rightColX, rowY,
      120, 52,
      PALETTE.green[500], 0.12
    );
    panel.add(btnGlow);

    const rollBtn = this.scene.add.rectangle(
      rightColX, rowY,
      110, 44,
      PALETTE.green[700], 0.95
    );
    rollBtn.setStrokeStyle(2, PALETTE.green[500]);
    rollBtn.setInteractive({ useHandCursor: true });
    panel.add(rollBtn);

    const rollText = this.scene.add.text(rightColX, rowY, 'ROLL', {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SUCCESS,
      fontStyle: 'bold',
    });
    rollText.setOrigin(0.5, 0.5);
    rollText.setResolution(window.devicePixelRatio * 2);
    panel.add(rollText);

    // Roll button interactions
    rollBtn.on('pointerover', () => {
      rollBtn.setFillStyle(PALETTE.green[600], 1);
      rollBtn.setStrokeStyle(2, PALETTE.green[400]);
      btnGlow.setAlpha(0.25);
    });
    rollBtn.on('pointerout', () => {
      rollBtn.setFillStyle(PALETTE.green[700], 0.95);
      rollBtn.setStrokeStyle(2, PALETTE.green[500]);
      btnGlow.setAlpha(0.12);
    });
    rollBtn.on('pointerdown', () => this.roll(false));

    // Note: Keyboard shortcut (SPACE) is handled by InputManager in GameplayScene

    // Store roll button reference for state updates
    this.rollButton = panel;
    this.rollButton.setData('bg', rollBtn);
    this.rollButton.setData('glow', btnGlow);

    // Subtle glow pulse
    this.scene.tweens.add({
      targets: outerGlow,
      alpha: 0.12,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createDieSprite(x: number, y: number, index: number): DiceSprite {
    const container = this.scene.add.container(x, y);
    const size = SIZES.DICE_SIZE;

    // Shadow beneath die (centered)
    const shadow = this.scene.add.ellipse(0, size / 2 + 6, size * 0.85, size * 0.25, 0x000000, 0.4);
    container.add(shadow);

    // Glow effect (behind die)
    const glowGraphics = this.scene.add.graphics();
    container.add(glowGraphics);

    // Die outer background (border effect) - darker, more refined
    const bg = this.scene.add.rectangle(0, 0, size, size, PALETTE.neutral[700], 1);
    bg.setStrokeStyle(2, PALETTE.neutral[500]);
    container.add(bg);

    // Die inner background (face) - slightly lighter for contrast
    const innerBg = this.scene.add.rectangle(0, 0, size - 6, size - 6, PALETTE.neutral[700], 1);
    container.add(innerBg);

    // Shine/highlight effect - more subtle
    const shine = this.scene.add.graphics();
    shine.fillStyle(0xffffff, 0.06);
    shine.fillRoundedRect(-size / 2 + 5, -size / 2 + 5, size - 16, 10, 3);
    container.add(shine);

    // Pips graphics
    const pipsGraphics = this.scene.add.graphics();
    container.add(pipsGraphics);

    // Lock indicator text (for cursed dice)
    const lockIndicator = this.scene.add.text(0, size / 2 + 22, '', {
      fontSize: '12px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_MUTED,
      fontStyle: 'bold',
    });
    lockIndicator.setOrigin(0.5, 0.5);
    lockIndicator.setResolution(window.devicePixelRatio * 2);
    container.add(lockIndicator);

    // Hold icon graphic (for user-held dice) - green checkmark
    const lockIcon = this.scene.add.graphics();
    const iconY = size / 2 + 22;
    const checkColor = PALETTE.green[400];
    lockIcon.lineStyle(3, checkColor, 1);
    lockIcon.beginPath();
    lockIcon.moveTo(-6, iconY - 1);
    lockIcon.lineTo(-2, iconY + 4);
    lockIcon.lineTo(7, iconY - 5);
    lockIcon.strokePath();
    lockIcon.setVisible(false);
    container.add(lockIcon);

    // Cursed icon graphic (for cursed dice) - purple skull
    const cursedIcon = this.scene.add.graphics();
    const cursedColor = PALETTE.purple[400];
    // Skull head (circle)
    cursedIcon.fillStyle(cursedColor, 1);
    cursedIcon.fillCircle(0, iconY - 2, 6);
    // Jaw (smaller arc)
    cursedIcon.fillRoundedRect(-4, iconY + 2, 8, 4, 2);
    // Eyes (dark circles)
    cursedIcon.fillStyle(0x000000, 1);
    cursedIcon.fillCircle(-2, iconY - 3, 1.5);
    cursedIcon.fillCircle(2, iconY - 3, 1.5);
    cursedIcon.setVisible(false);
    container.add(cursedIcon);

    // Make interactive
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => this.toggleLock(index));
    bg.on('pointerover', () => {
      if (!this.state.locked[index] && this.enabled) {
        // Hover lift effect
        this.scene.tweens.add({
          targets: container,
          y: y - 5,
          duration: 100,
          ease: 'Quad.easeOut',
        });
        this.scene.tweens.add({
          targets: shadow,
          scaleX: 1.1,
          scaleY: 1.2,
          alpha: 0.2,
          duration: 100,
        });
        bg.setStrokeStyle(3, PALETTE.green[400]);
        innerBg.setFillStyle(PALETTE.green[700]);
      }
    });
    bg.on('pointerout', () => {
      // Return to original position
      this.scene.tweens.add({
        targets: container,
        y: y,
        duration: 100,
        ease: 'Quad.easeOut',
      });
      this.scene.tweens.add({
        targets: shadow,
        scaleX: 1,
        scaleY: 1,
        alpha: 0.3,
        duration: 100,
      });
      const isCursed = index === this.state.cursedIndex;
      const locked = this.state.locked[index];
      if (isCursed) {
        bg.setStrokeStyle(3, PALETTE.purple[400]);
        innerBg.setFillStyle(PALETTE.purple[600]);
      } else if (locked) {
        bg.setStrokeStyle(3, PALETTE.green[500]);
        innerBg.setFillStyle(PALETTE.green[700]);
      } else {
        bg.setStrokeStyle(3, PALETTE.neutral[500]);
        innerBg.setFillStyle(PALETTE.neutral[700]);
      }
    });

    return { container, shadow, bg, innerBg, shine, pipsGraphics, lockIndicator, lockIcon, cursedIcon, glowGraphics, originalX: x, originalY: y };
  }

  // ===========================================================================
  // DICE LOGIC
  // ===========================================================================

  /**
   * Toggle lock state for a die
   */
  private toggleLock(index: number): void {
    if (!this.enabled) {
      log.debug('toggleLock rejected: dice disabled');
      return;
    }

    // Can't unlock a cursed die
    if (index === this.state.cursedIndex) {
      log.debug(`toggleLock rejected: die ${index} is cursed`);
      // Visual feedback - flash red
      const sprite = this.sprites[index];
      if (sprite) {
        this.scene.tweens.add({
          targets: sprite.bg,
          alpha: 0.5,
          duration: 100,
          yoyo: true,
          repeat: 1,
        });
      }
      return;
    }

    this.state.locked[index] = !this.state.locked[index];
    this.updateDieDisplay(index);
    this.updateRollButton(); // Update button state based on holdable dice
    this.events.emit('dice:locked', { index, locked: this.state.locked[index] });
  }

  /**
   * Roll the dice
   */
  roll(initial: boolean): void {
    if (!this.enabled) {
      log.debug('roll rejected: dice disabled');
      return;
    }

    if (!initial && this.state.rerollsLeft <= 0) {
      log.debug('roll rejected: no rerolls remaining');
      this.flashRerollText();
      return;
    }

    // Check if any dice can actually be rerolled (not locked by user, not cursed)
    if (!initial) {
      const canReroll = this.state.locked.some((locked, i) => !locked && i !== this.state.cursedIndex);
      if (!canReroll) {
        log.debug('roll rejected: all dice are held or cursed');
        // All dice are held or cursed - don't waste the reroll
        return;
      }
      this.state.rerollsLeft--;
    }

    log.log(`Rolling dice (initial: ${initial}, rerolls left: ${this.state.rerollsLeft})`);

    // Update rerolls text immediately
    this.updateRerollText();

    // Generate final values
    const finalValues: number[] = [];
    for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
      if (!this.state.locked[i] || initial) {
        finalValues[i] = Phaser.Math.Between(1, 6);
      } else {
        finalValues[i] = this.state.values[i];
      }
    }

    // Animate and set values
    this.animateRoll(initial, finalValues);
  }

  private animateRoll(initial: boolean, finalValues: number[]): void {
    const rollDuration = SIZES.ROLL_DURATION_MS;

    for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
      if (!this.state.locked[i] || initial) {
        const sprite = this.sprites[i];
        const delay = i * 50; // Stagger the dice

        // Hide pips during animation
        sprite.pipsGraphics.setVisible(false);

        // Add glow during roll
        sprite.glowGraphics.clear();
        sprite.glowGraphics.fillStyle(PALETTE.purple[400], 0.3);
        sprite.glowGraphics.fillCircle(0, 0, SIZES.DICE_SIZE * 0.8);

        // Animate glow pulse
        this.scene.tweens.add({
          targets: sprite.glowGraphics,
          alpha: 0,
          duration: rollDuration,
          ease: 'Quad.easeIn',
        });

        // Launch dice upward with random trajectory
        const jumpHeight = Phaser.Math.Between(60, 100);
        const horizontalOffset = Phaser.Math.Between(-20, 20);

        // Phase 1: Launch up
        this.scene.tweens.add({
          targets: sprite.container,
          y: sprite.originalY - jumpHeight,
          x: sprite.originalX + horizontalOffset,
          duration: rollDuration * 0.4,
          ease: 'Quad.easeOut',
          delay,
        });

        // Shadow shrinks as die goes up
        this.scene.tweens.add({
          targets: sprite.shadow,
          scaleX: 0.5,
          scaleY: 0.3,
          alpha: 0.15,
          duration: rollDuration * 0.4,
          ease: 'Quad.easeOut',
          delay,
        });

        // Tumble rotation
        const rotations = Phaser.Math.Between(2, 4) * 360;
        this.scene.tweens.add({
          targets: [sprite.bg, sprite.innerBg, sprite.shine, sprite.pipsGraphics],
          angle: rotations,
          duration: rollDuration * 0.8,
          ease: 'Cubic.easeOut',
          delay,
        });

        // Phase 2: Fall down and land with bounce
        this.scene.time.delayedCall(rollDuration * 0.4 + delay, () => {
          // Fall
          this.scene.tweens.add({
            targets: sprite.container,
            y: sprite.originalY,
            x: sprite.originalX, // Return to exact original position
            duration: rollDuration * 0.35,
            ease: 'Bounce.easeOut',
          });

          // Shadow returns
          this.scene.tweens.add({
            targets: sprite.shadow,
            scaleX: 1.2,
            scaleY: 1.3,
            alpha: 0.4,
            duration: rollDuration * 0.2,
            ease: 'Quad.easeIn',
            onComplete: () => {
              // Normalize shadow after landing
              this.scene.tweens.add({
                targets: sprite.shadow,
                scaleX: 1,
                scaleY: 1,
                alpha: 0.3,
                duration: 150,
              });
            },
          });
        });

        // Create trail particles during roll
        this.createRollParticles(sprite.container.x, sprite.originalY, i, delay);
      }
    }

    // Set final values after animation
    this.scene.time.delayedCall(rollDuration + 100, () => {
      for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
        if (!this.state.locked[i] || initial) {
          const sprite = this.sprites[i];
          this.state.values[i] = finalValues[i];
          sprite.pipsGraphics.setVisible(true);

          // Reset rotation
          sprite.bg.setAngle(0);
          sprite.innerBg.setAngle(0);
          sprite.shine.setAngle(0);
          sprite.pipsGraphics.setAngle(0);

          // Landing impact effect
          this.createLandingImpact(sprite, finalValues[i]);
        }
      }

      if (initial) {
        this.state.locked = Array(GAME_RULES.DICE_COUNT).fill(false);
      }

      this.updateDisplay();
      this.events.emit('dice:rolled', { values: this.getValues(), isInitial: initial });
    });
  }

  private createRollParticles(x: number, y: number, _index: number, delay: number): void {
    this.scene.time.delayedCall(delay, () => {
      for (let p = 0; p < 5; p++) {
        this.scene.time.delayedCall(p * 40, () => {
          const particle = this.scene.add.circle(
            x + Phaser.Math.Between(-15, 15),
            y + Phaser.Math.Between(-30, -60),
            Phaser.Math.Between(3, 6),
            PALETTE.purple[400],
            0.6
          );

          this.scene.tweens.add({
            targets: particle,
            y: particle.y + 40,
            alpha: 0,
            scaleX: 0.2,
            scaleY: 0.2,
            duration: 300,
            ease: 'Quad.easeOut',
            onComplete: () => particle.destroy(),
          });
        });
      }
    });
  }

  private createLandingImpact(sprite: DiceSprite, value: number): void {
    // Scale pop
    this.scene.tweens.add({
      targets: [sprite.bg, sprite.innerBg],
      scaleX: 1.15,
      scaleY: 0.9,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    // Impact ring
    const ring = this.scene.add.circle(sprite.container.x, sprite.originalY, 20, 0xffffff, 0);
    ring.setStrokeStyle(2, PALETTE.purple[400], 0.8);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });

    // Extra effects for high values
    if (value === 6) {
      // Golden sparkle for 6
      for (let s = 0; s < 6; s++) {
        const angle = (s / 6) * Math.PI * 2;
        const sparkle = this.scene.add.circle(
          sprite.container.x + Math.cos(angle) * 30,
          sprite.originalY + Math.sin(angle) * 30,
          4,
          PALETTE.gold[400],
          1
        );

        this.scene.tweens.add({
          targets: sparkle,
          x: sparkle.x + Math.cos(angle) * 25,
          y: sparkle.y + Math.sin(angle) * 25,
          alpha: 0,
          duration: 400,
          ease: 'Quad.easeOut',
          onComplete: () => sparkle.destroy(),
        });
      }
    }
  }

  // ===========================================================================
  // UI UPDATES
  // ===========================================================================

  private updateDisplay(): void {
    for (let i = 0; i < GAME_RULES.DICE_COUNT; i++) {
      this.updateDieDisplay(i);
    }
    this.updateRerollText();
    this.updateRollButton();
  }

  private updateDieDisplay(index: number): void {
    const sprite = this.sprites[index];
    if (!sprite) return;

    const value = this.state.values[index];
    const locked = this.state.locked[index];
    const isCursed = index === this.state.cursedIndex;

    // Update background - cursed = purple, held = green, normal = neutral
    if (isCursed) {
      sprite.bg.setFillStyle(COLORS.DICE_CURSED_BG);
      sprite.bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, COLORS.DICE_CURSED_BORDER);
      sprite.innerBg.setFillStyle(PALETTE.purple[600]);
    } else if (locked) {
      sprite.bg.setFillStyle(PALETTE.green[700]);
      sprite.bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, PALETTE.green[500]);
      sprite.innerBg.setFillStyle(PALETTE.green[700]);
    } else {
      sprite.bg.setFillStyle(COLORS.DICE_BG);
      sprite.bg.setStrokeStyle(SIZES.DICE_BORDER_WIDTH, COLORS.DICE_BORDER);
      sprite.innerBg.setFillStyle(PALETTE.neutral[700]);
    }

    // Update pips - cursed = purple, held/normal = white
    const pipColor = isCursed ? COLORS.DICE_PIP_CURSED : COLORS.DICE_PIP;
    this.drawPips(sprite.pipsGraphics, value, pipColor);

    // Update icons - cursed shows purple X, held shows green checkmark
    if (isCursed) {
      sprite.lockIndicator.setText('');
      sprite.lockIcon.setVisible(false);
      sprite.cursedIcon.setVisible(true);
    } else if (locked) {
      sprite.lockIndicator.setText('');
      sprite.lockIcon.setVisible(true);
      sprite.cursedIcon.setVisible(false);
    } else {
      sprite.lockIndicator.setText('');
      sprite.lockIcon.setVisible(false);
      sprite.cursedIcon.setVisible(false);
    }
  }

  private drawPips(graphics: Phaser.GameObjects.Graphics, value: number, color: number): void {
    graphics.clear();
    graphics.fillStyle(color, 1);
    const positions = PIP_POSITIONS[value] || [];
    for (const pos of positions) {
      graphics.fillCircle(pos.x, pos.y, SIZES.DICE_PIP_RADIUS);
    }
  }

  private updateRerollText(): void {
    if (!this.rerollText) return;
    this.rerollText.setText(`${this.state.rerollsLeft}`);
    this.rerollText.setColor(this.state.rerollsLeft > 0 ? COLORS.TEXT_SUCCESS : COLORS.TEXT_DANGER);
  }

  private updateRollButton(): void {
    if (!this.rollButton) return;
    const bg = this.rollButton.getData('bg') as Phaser.GameObjects.Rectangle | null;
    const glow = this.rollButton.getData('glow') as Phaser.GameObjects.Rectangle | null;
    if (!bg) return;

    // Check if any dice can be rerolled (not held, not cursed)
    const canReroll = this.state.locked.some((locked, i) => !locked && i !== this.state.cursedIndex);

    if (this.state.rerollsLeft > 0 && canReroll) {
      bg.setFillStyle(PALETTE.green[700], 0.95);
      bg.setStrokeStyle(2, PALETTE.green[500]);
      bg.setInteractive({ useHandCursor: true });
      glow?.setAlpha(0.12);
    } else {
      bg.setFillStyle(PALETTE.neutral[700], 0.8);
      bg.setStrokeStyle(2, PALETTE.neutral[500]);
      bg.removeInteractive();
      glow?.setAlpha(0.05);
    }
  }

  private flashRerollText(): void {
    if (!this.rerollText) return;
    this.scene.tweens.add({
      targets: this.rerollText,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 2,
    });
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Destroy all UI elements
   */
  destroy(): void {
    log.log(`Destroying DiceManager (${this.sprites.length} sprites, rollButton: ${!!this.rollButton})`);

    // Note: Keyboard listener (SPACE) cleanup is handled by InputManager

    for (const sprite of this.sprites) {
      sprite.container.destroy();
    }
    this.sprites = [];

    if (this.rollButton) {
      this.rollButton.destroy();
      this.rollButton = null;
    }

    if (this.rerollText) {
      this.rerollText.destroy();
      this.rerollText = null;
    }
  }
}
