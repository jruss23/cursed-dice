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

const DPR = window.devicePixelRatio || 1;
log.log(`Device pixel ratio: ${DPR}`);

/**
 * Get the game container's CSS dimensions
 * On desktop, container is locked to 430px width via CSS
 * On mobile, container fills the viewport
 */
function getContainerSize(): { width: number; height: number } {
  const container = document.getElementById('game-container');
  if (container) {
    const rect = container.getBoundingClientRect();
    // Debug: log what we're getting
    log.log(`Container rect: width=${rect.width}, height=${rect.height}, top=${rect.top}, left=${rect.left}`);

    // If container has no dimensions yet (CSS not applied), fall back to window
    if (rect.width === 0 || rect.height === 0) {
      log.warn('Container has no dimensions, falling back to window size');
      return { width: window.innerWidth, height: window.innerHeight };
    }
    return { width: rect.width, height: rect.height };
  }
  // Fallback to window if container not found
  log.warn('Container not found, falling back to window size');
  return { width: window.innerWidth, height: window.innerHeight };
}

const initialSize = getContainerSize();
log.log(`Container size: ${initialSize.width}x${initialSize.height} CSS pixels`);
log.log(`DPR: ${DPR}, Canvas will be: ${initialSize.width * DPR}x${initialSize.height * DPR} device pixels`);

/**
 * Phaser Game Configuration
 * Uses Scale.NONE + zoom for crisp text on high-DPR displays
 * - Canvas created at device pixel resolution (container × DPR)
 * - Zoom scales display back to CSS pixels (1/DPR)
 * - All coordinates work in device pixels for pixel-perfect rendering
 * - Text sharpness via resolution: DPR in createText helper
 */
const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  backgroundColor: COLORS.BG_DARK,
  scale: {
    mode: Phaser.Scale.NONE,
    width: initialSize.width * DPR,
    height: initialSize.height * DPR,
    zoom: 1 / DPR,
  },
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: true,
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
 * Handle resize/orientation changes
 * Scale.NONE requires manual resize handling
 */
function handleResize(): void {
  const size = getContainerSize();
  const newWidth = size.width * DPR;
  const newHeight = size.height * DPR;
  game.scale.resize(newWidth, newHeight);
  log.debug(`Resized to ${newWidth}x${newHeight} (DPR: ${DPR})`);
}

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', () => {
  // iOS Safari needs a delay for orientation changes
  setTimeout(handleResize, 100);
});

// Show game container after Phaser finishes initializing (hides resize flicker)
game.events.once('ready', () => {
  requestAnimationFrame(() => {
    document.getElementById('game-container')?.classList.add('ready');

    // Debug: Log actual canvas dimensions
    const canvas = game.canvas;
    if (canvas) {
      log.log(`Canvas internal: ${canvas.width}x${canvas.height}`);
      log.log(`Canvas CSS: ${canvas.style.width}x${canvas.style.height}`);
      log.log(`Canvas getBoundingClientRect: ${canvas.getBoundingClientRect().width}x${canvas.getBoundingClientRect().height}`);
    }
  });
});
