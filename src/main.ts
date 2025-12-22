/**
 * Main Entry Point
 * Cursed Dice Game
 */

import Phaser from 'phaser';
import { DEV, COLORS } from '@/config';
import { createLogger } from '@/systems/logger';
import { MenuScene } from '@/scenes/MenuScene';
import { GameplayScene } from '@/scenes/GameplayScene';

const log = createLogger('Main');

// =============================================================================
// GLOBAL ERROR HANDLING
// =============================================================================

/**
 * Global error handler for uncaught exceptions.
 * In development: logs full error details to console.
 * In production: silently captures errors (could send to error tracking service).
 */
window.addEventListener('error', (event: ErrorEvent) => {
  log.error('Uncaught error:', event.message);
  if (DEV.IS_DEVELOPMENT) {
    log.error('Stack trace:', event.error?.stack);
    log.error('Location:', `${event.filename}:${event.lineno}:${event.colno}`);
  }
  // Prevent default browser error handling in production
  if (!DEV.IS_DEVELOPMENT) {
    event.preventDefault();
  }
});

/**
 * Global handler for unhandled promise rejections.
 */
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  log.error('Unhandled promise rejection:', event.reason);
  if (DEV.IS_DEVELOPMENT && event.reason?.stack) {
    log.error('Stack trace:', event.reason.stack);
  }
  // Prevent default browser handling in production
  if (!DEV.IS_DEVELOPMENT) {
    event.preventDefault();
  }
});

/**
 * Phaser Game Configuration
 * Uses Scale Manager for responsive layout
 */
const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  backgroundColor: COLORS.BG_DARK,
  scale: {
    mode: Phaser.Scale.RESIZE, // Resize canvas to match viewport for true responsiveness
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',  // Fill container width
    height: '100%', // Fill container height
    min: {
      width: 320,  // Minimum supported width
      height: 480, // Minimum supported height
    },
  },
  render: {
    antialias: true,
  },
  audio: {
    disableWebAudio: false, // Enable audio for music
  },
  input: {
    mouse: {
      preventDefaultWheel: false,
    },
    touch: {
      capture: true, // Better touch support for mobile
    },
  },
  scene: [MenuScene, GameplayScene],
};

// Initialize Phaser game
const game = new Phaser.Game(phaserConfig);

// Show game container after Phaser finishes initializing (hides resize flicker)
game.events.once('ready', () => {
  requestAnimationFrame(() => {
    document.getElementById('game-container')?.classList.add('ready');
  });
});
