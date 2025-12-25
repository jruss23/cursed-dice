/**
 * Main Entry Point
 * Cursed Dice Game
 */

import Phaser from 'phaser';
import { DEV, COLORS } from '@/config';
import { createLogger } from '@/systems/logger';
import { initializeGlobalServices } from '@/systems/services';
import { MenuScene } from '@/scenes/MenuScene';
import { GameplayScene } from '@/scenes/GameplayScene';
import { TutorialScene } from '@/scenes/TutorialScene';

const log = createLogger('Main');

// Initialize global services (save, progression) before anything else
initializeGlobalServices();

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
// RESPONSIVE CONFIGURATION
// =============================================================================

log.log(`Device pixel ratio: ${window.devicePixelRatio}`);

/**
 * Phaser Game Configuration
 * Uses Scale.FIT for proper sizing across devices
 * Text sharpness handled via setResolution() in createText helper
 */
const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  backgroundColor: COLORS.BG_DARK,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: false,
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
  scene: [MenuScene, GameplayScene, TutorialScene],
};

// Initialize Phaser game
const game = new Phaser.Game(phaserConfig);

/**
 * Handle window resize - update game size to match viewport
 */
const handleResize = () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
  log.debug(`Resized to ${window.innerWidth}x${window.innerHeight}`);
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
