/**
 * Main Entry Point
 * Yahtzee Sprint Game
 */

import Phaser from 'phaser';
import { CANVAS, COLORS } from '@/config';
import { MenuScene } from '@/scenes/MenuScene';
import { SprintScene } from '@/scenes/SprintScene';

/**
 * Phaser Game Configuration
 */
const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  backgroundColor: COLORS.BG_DARK,
  width: CANVAS.WIDTH,
  height: CANVAS.HEIGHT,
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
  },
  scene: [MenuScene, SprintScene],
};

// Initialize Phaser game
new Phaser.Game(phaserConfig);
