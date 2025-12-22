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

// =============================================================================
// HIGH-DPI / RETINA SUPPORT
// =============================================================================

/**
 * Device pixel ratio - capped at 3 for performance
 * iPhone: 2-3x, Android: 1-4x, Desktop: typically 1-2x
 */
const DPR = Math.min(window.devicePixelRatio || 1, 3);

log.log(`Device pixel ratio: ${window.devicePixelRatio}, using: ${DPR}`);

/**
 * Phaser Game Configuration
 * Uses Scale.NONE with manual DPR handling for crisp retina graphics
 */
const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  backgroundColor: COLORS.BG_DARK,
  scale: {
    mode: Phaser.Scale.NONE, // Manual scaling for retina support
    width: window.innerWidth * DPR,
    height: window.innerHeight * DPR,
    zoom: 1 / DPR, // Counter-scale to fit viewport
  },
  render: {
    antialias: true,
    pixelArt: false,
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

/**
 * Handle window resize - manually update canvas size for retina support
 */
const handleResize = () => {
  const w = window.innerWidth * DPR;
  const h = window.innerHeight * DPR;
  game.scale.resize(w, h);
  log.debug(`Resized to ${w}x${h} (logical: ${window.innerWidth}x${window.innerHeight})`);
};

window.addEventListener('resize', handleResize);

// Handle orientation change on mobile (iOS Safari needs a delay)
window.addEventListener('orientationchange', () => {
  setTimeout(handleResize, 100);
});

// Show game container after Phaser finishes initializing (hides resize flicker)
game.events.once('ready', () => {
  requestAnimationFrame(() => {
    document.getElementById('game-container')?.classList.add('ready');
  });
});
