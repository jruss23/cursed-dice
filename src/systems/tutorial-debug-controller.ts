/**
 * Tutorial Debug Controller
 * Handles debug functionality specific to TutorialScene
 * Two actions: Pass Tutorial (250+) and Fail Tutorial (<250)
 */

import { createLogger } from '@/systems/logger';

const log = createLogger('TutorialDebugController');

export interface TutorialDebugControllerDeps {
  scene: Phaser.Scene;
  isInFreePlay: () => boolean;
  skipToFreePlay: () => void;
  hideTutorialOverlay: () => void;
  showCompletion: (overrideScore?: number) => void;
}

/**
 * Debug Controller for TutorialScene
 */
export class TutorialDebugController {
  private deps: TutorialDebugControllerDeps;

  constructor(deps: TutorialDebugControllerDeps) {
    this.deps = deps;
  }

  /**
   * Skip to practice mode (free play)
   */
  skipToPractice(): void {
    log.debug('Skipping to practice mode');
    this.deps.skipToFreePlay();
  }

  /**
   * Show completion with passing score (250+)
   */
  passTutorial(): void {
    log.debug('Debug: Pass tutorial with 275 points');
    this.deps.hideTutorialOverlay();
    this.deps.showCompletion(275);
  }

  /**
   * Show completion with failing score (<250)
   */
  failTutorial(): void {
    log.debug('Debug: Fail tutorial with 180 points');
    this.deps.hideTutorialOverlay();
    this.deps.showCompletion(180);
  }
}
