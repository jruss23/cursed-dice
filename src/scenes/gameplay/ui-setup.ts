/**
 * UI Setup Helpers
 * Extracted from GameplayScene for cleaner organization
 * These functions create UI components and return them for the scene to manage
 */

import Phaser from 'phaser';
import {
  FONTS,
  SIZES,
  PALETTE,
  COLORS,
  DEV,
  FLASH,
  ALPHA,
  TIMING,
  type ViewportMetrics,
} from '@/config';
import { toDPR } from '@/systems/responsive';
import { HeaderPanel, DebugPanel } from '@/ui/gameplay';
import { PauseMenu } from '@/ui/pause-menu';
import { InputManager } from '@/systems/input-manager';
import { DebugController } from '@/systems/debug-controller';
import { createText } from '@/ui/ui-utils';
import type { GameStateMachine } from '@/systems/state-machine';
import type { DiceManager } from '@/systems/dice-manager';
import type { MusicManager } from '@/systems/music-manager';

// ============================================================================
// ANIMATED BACKGROUND
// ============================================================================

/**
 * Create animated background with gradient and floating particles
 */
export function createAnimatedBackground(scene: Phaser.Scene, width: number, height: number): void {
  // Dark gradient base
  const bg = scene.add.graphics();
  bg.fillGradientStyle(PALETTE.gameplay.bgTopLeft, PALETTE.gameplay.bgTopRight, PALETTE.gameplay.bgBottomLeft, PALETTE.gameplay.bgBottomRight, 1);
  bg.fillRect(0, 0, width, height);

  // Subtle ambient particles
  for (let i = 0; i < 20; i++) {
    const x = Phaser.Math.Between(0, width);
    const y = Phaser.Math.Between(0, height);
    const size = Phaser.Math.Between(2, 6);

    const particle = scene.add.circle(x, y, size, PALETTE.gameplay.particle, ALPHA.GLOW_SOFT);

    scene.tweens.add({
      targets: particle,
      y: y + Phaser.Math.Between(-50, 50),
      alpha: Phaser.Math.FloatBetween(0.05, 0.15),
      duration: Phaser.Math.Between(4000, 8000),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Phaser.Math.Between(0, 3000),
    });
  }

  // Corner vignettes
  const vignette = scene.add.graphics();
  vignette.fillStyle(PALETTE.black, ALPHA.GLOW_HOVER);
  vignette.fillCircle(0, 0, 200);
  vignette.fillCircle(width, 0, 200);
  vignette.fillCircle(0, height, 200);
  vignette.fillCircle(width, height, 200);
  vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);
}

// ============================================================================
// DEBUG PANEL
// ============================================================================

export interface DebugPanelConfig {
  scene: Phaser.Scene;
  height: number;
  currentMode: number;
  debugController: DebugController;
}

/**
 * Create debug panel if in development mode
 */
export function createDebugPanel(config: DebugPanelConfig): DebugPanel | null {
  if (!DEV.IS_DEVELOPMENT) return null;

  return new DebugPanel(config.scene, config.height, {
    onSkipTime: () => config.debugController.skipTime(),
    onSkipStage: () => config.debugController.skipStage(),
    onClearData: () => config.debugController.clearData(),
    onPerfectUpper: () => config.debugController.perfectUpper(),
    onSkipToMode: (mode: number) => config.debugController.skipToMode(mode),
    currentMode: config.currentMode,
  });
}

// ============================================================================
// HEADER PANEL
// ============================================================================

export interface HeaderPanelConfig {
  scene: Phaser.Scene;
  centerX: number;
  currentMode: number;
  modeName: string;
  totalScore: number;
  timeRemaining: number;
  passThreshold: number;
  compact: boolean;
  metrics: ViewportMetrics;
  compactHeight?: number;
}

/**
 * Create header panel with mode info and timer
 */
export function createHeaderPanel(config: HeaderPanelConfig): HeaderPanel {
  return new HeaderPanel(config.scene, config.centerX, {
    currentMode: config.currentMode,
    modeName: config.modeName,
    totalScore: config.totalScore,
    timeRemaining: config.timeRemaining,
    passThreshold: config.passThreshold,
    compact: config.compact,
    metrics: config.metrics,
    compactHeight: config.compactHeight,
  });
}

// ============================================================================
// CONTROL BUTTONS (PAUSE/QUIT)
// ============================================================================

export interface ControlButtonsConfig {
  scene: Phaser.Scene;
  height: number;
  stateMachine: GameStateMachine;
  diceManager: DiceManager | null;
  debugController: DebugController | null;
  musicManager?: MusicManager | null;
  onPause: () => void;
  onResume: () => void;
  onQuit: () => void;
}

export interface ControlButtonsResult {
  pauseMenu: PauseMenu;
  inputManager: InputManager;
}

/**
 * Create PAUSE and QUIT buttons in bottom left corner
 */
export function createControlButtons(config: ControlButtonsConfig): ControlButtonsResult {
  const { scene, height } = config;
  // Scale button dimensions for DPR
  const btnWidth = toDPR(70);
  const btnHeight = toDPR(32);
  const btnY = height - toDPR(6);
  const btnGap = toDPR(4);
  const margin = toDPR(6);

  // PAUSE button (left) - use center origin for Phaser 4 compatibility
  const pauseCenterX = margin + btnWidth / 2;
  const pauseCenterY = btnY - btnHeight / 2;
  const pauseBg = scene.add.rectangle(pauseCenterX, pauseCenterY, btnWidth, btnHeight, PALETTE.purple[700], ALPHA.PANEL_SOLID);
  pauseBg.setStrokeStyle(toDPR(2), PALETTE.purple[500], ALPHA.BORDER_SOLID);
  pauseBg.setInteractive({ useHandCursor: true });

  const pauseText = createText(scene, pauseCenterX, pauseCenterY, 'PAUSE', {
    fontSize: FONTS.SIZE_SMALL,
    fontFamily: FONTS.FAMILY,
    color: COLORS.TEXT_ACCENT,
    fontStyle: 'bold',
  });
  pauseText.setOrigin(0.5, 0.5);

  pauseBg.on('pointerover', () => {
    pauseBg.setFillStyle(PALETTE.purple[600], 1);
    pauseBg.setStrokeStyle(toDPR(2), PALETTE.purple[400], 1);
  });
  pauseBg.on('pointerout', () => {
    pauseBg.setFillStyle(PALETTE.purple[700], ALPHA.PANEL_SOLID);
    pauseBg.setStrokeStyle(toDPR(2), PALETTE.purple[500], ALPHA.BORDER_SOLID);
  });
  pauseBg.on('pointerdown', () => config.onPause());

  // QUIT button (right of pause) - use center origin for Phaser 4 compatibility
  const quitCenterX = margin + btnWidth + btnGap + btnWidth / 2;
  const quitCenterY = btnY - btnHeight / 2;
  const quitBg = scene.add.rectangle(quitCenterX, quitCenterY, btnWidth, btnHeight, PALETTE.red[800], ALPHA.PANEL_SOLID);
  quitBg.setStrokeStyle(toDPR(2), PALETTE.red[500], ALPHA.BORDER_SOLID);
  quitBg.setInteractive({ useHandCursor: true });

  const quitText = createText(scene, quitCenterX, quitCenterY, 'QUIT', {
    fontSize: FONTS.SIZE_SMALL,
    fontFamily: FONTS.FAMILY,
    color: COLORS.TEXT_DANGER,
    fontStyle: 'bold',
  });
  quitText.setOrigin(0.5, 0.5);

  quitBg.on('pointerover', () => {
    quitBg.setFillStyle(PALETTE.red[700], 1);
    quitBg.setStrokeStyle(toDPR(2), PALETTE.red[400], 1);
    quitText.setColor(COLORS.TEXT_PRIMARY);
  });
  quitBg.on('pointerout', () => {
    quitBg.setFillStyle(PALETTE.red[800], ALPHA.PANEL_SOLID);
    quitBg.setStrokeStyle(toDPR(2), PALETTE.red[500], ALPHA.BORDER_SOLID);
    quitText.setColor(COLORS.TEXT_DANGER);
  });
  quitBg.on('pointerdown', () => {
    scene.cameras.main.flash(150, FLASH.RED.r, FLASH.RED.g, FLASH.RED.b);
    config.onQuit();
  });

  // Create pause menu (centered on screen)
  const { width: screenWidth, height: screenHeight } = scene.cameras.main;
  const pauseMenu = new PauseMenu(scene, {
    x: screenWidth / 2,
    y: screenHeight / 2,
    callbacks: {
      onResume: () => config.onResume(),
      onQuit: () => config.onQuit(),
    },
    musicManager: config.musicManager,
  });

  // Setup centralized input handling
  const inputManager = new InputManager(scene);

  // Bind game actions
  inputManager.bind('roll', () => {
    if (config.stateMachine.isPlayable() && config.diceManager) {
      config.diceManager.roll(false);
    }
  });

  inputManager.bind('pause', () => {
    if (config.stateMachine.is('paused')) {
      config.onResume();
    } else if (config.stateMachine.isPlayable()) {
      config.onPause();
    }
  });

  // Debug keys (only in development)
  if (DEV.IS_DEVELOPMENT && config.debugController) {
    inputManager.bind('debugTime', () => config.debugController!.skipTime());
    inputManager.bind('debugStage', () => config.debugController!.skipStage());
  }

  // Register interactive buttons with input manager for unified enable/disable
  inputManager.registerInteractive(pauseBg);
  inputManager.registerInteractive(quitBg);

  return { pauseMenu, inputManager };
}

// ============================================================================
// SELECT PROMPT
// ============================================================================

/**
 * Create the "Click a category to score" prompt with pulse animation
 */
export function createSelectPrompt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string = 'Click a category to score'
): Phaser.GameObjects.Text {
  const prompt = createText(scene, x, y, text, {
    fontSize: FONTS.SIZE_SMALL,
    fontFamily: FONTS.FAMILY,
    color: COLORS.TEXT_SUCCESS,
  });

  // Add pulse animation
  scene.tweens.add({
    targets: prompt,
    alpha: ALPHA.GLOW_HOVER,
    duration: SIZES.ANIM_PULSE,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  return prompt;
}

// ============================================================================
// SCORE EFFECTS
// ============================================================================

export interface ScoreEffectConfig {
  scene: Phaser.Scene;
  centerX: number;
  centerY: number;
  points: number;
  onParticles?: (x: number, y: number, count: number, color: number) => void;
}

/**
 * Show animated score popup with particles
 */
export function showScoreEffect(config: ScoreEffectConfig): void {
  const { scene, centerX, centerY, points } = config;

  // Determine color and size based on score quality
  let color: string = COLORS.TEXT_SUCCESS;
  let glowColor: string = COLORS.SCORE_EFFECT_GREEN;
  let size: string = FONTS.SIZE_TITLE;
  if (points >= 50) {
    color = COLORS.TEXT_WARNING;
    glowColor = COLORS.SCORE_EFFECT_GOLD;
    size = FONTS.SIZE_SCORE_HUGE;
  } else if (points >= 30) {
    color = COLORS.TEXT_ACCENT;
    glowColor = COLORS.SCORE_EFFECT_PURPLE;
    size = FONTS.SIZE_SCORE_LARGE;
  } else if (points >= 15) {
    color = COLORS.TEXT_SUCCESS;
    glowColor = COLORS.SCORE_EFFECT_GREEN;
    size = FONTS.SIZE_TITLE;
  } else if (points === 0) {
    color = COLORS.TEXT_MUTED;
    glowColor = COLORS.SCORE_EFFECT_GRAY;
    size = FONTS.SIZE_DISPLAY;
  }

  // Glow layer behind text
  const scoreGlow = createText(scene, centerX, centerY, `+${points}`, {
    fontSize: size,
    fontFamily: FONTS.FAMILY,
    color: glowColor,
    fontStyle: 'bold',
  });
  scoreGlow.setOrigin(0.5, 0.5);
  scoreGlow.setAlpha(0);
  scoreGlow.setBlendMode(Phaser.BlendModes.ADD);
  scoreGlow.setScale(1.1);

  // Main score text
  const scoreText = createText(scene, centerX, centerY, `+${points}`, {
    fontSize: size,
    fontFamily: FONTS.FAMILY,
    color: color,
    fontStyle: 'bold',
  });
  scoreText.setOrigin(0.5, 0.5);
  scoreText.setAlpha(0);

  const targets = [scoreText, scoreGlow];

  // Animate in with punch effect
  scene.tweens.add({
    targets,
    y: centerY - 60,
    alpha: 1,
    scaleX: 1.3,
    scaleY: 1.3,
    duration: TIMING.MEDIUM,
    ease: 'Back.easeOut',
    onComplete: () => {
      // Settle to normal scale
      scene.tweens.add({
        targets,
        scaleX: 1,
        scaleY: 1,
        duration: TIMING.FAST,
        ease: 'Quad.easeOut',
        onComplete: () => {
          // Hold for a moment, then fade out
          scene.tweens.add({
            targets,
            y: centerY - 120,
            alpha: 0,
            duration: TIMING.SLOW + TIMING.QUICK,
            delay: TIMING.SLOW + TIMING.NORMAL,
            ease: 'Quad.easeIn',
            onComplete: () => {
              scoreText.destroy();
              scoreGlow.destroy();
            },
          });
        },
      });
    },
  });

  // Particle burst for good scores
  if (points >= 15 && config.onParticles) {
    const colorNum = Phaser.Display.Color.HexStringToColor(color).color;
    const count = points >= 50 ? 20 : points >= 30 ? 12 : 6;
    config.onParticles(centerX, centerY - 40, count, colorNum);
  }

  // Screen flash for Five Dice (5 of a kind)
  if (points >= 50) {
    scene.cameras.main.flash(TIMING.ENTRANCE, 255, 220, 100);
  }
}
