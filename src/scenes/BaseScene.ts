/**
 * BaseScene Abstract Class
 * Common functionality for all game scenes
 *
 * Provides:
 * - Camera fade in/out helpers
 * - Shutdown handler registration
 * - Resize listener management
 * - Viewport metrics helpers
 */

import Phaser from 'phaser';
import { SIZES, getViewportMetrics, type ViewportMetrics } from '@/config';
import { createLogger } from '@/systems/logger';

type Logger = ReturnType<typeof createLogger>;

export abstract class BaseScene extends Phaser.Scene {
  protected log: Logger;
  protected boundOnResize: (() => void) | null = null;

  constructor(config: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config);
    const key = typeof config === 'string' ? config : config.key ?? 'Unknown';
    this.log = createLogger(key);
  }

  /**
   * Register shutdown handler - call in create()
   */
  protected registerShutdown(): void {
    this.events.once('shutdown', this.onShutdown, this);
  }

  /**
   * Setup resize listener - call in create() if scene needs resize handling
   * Override onResize() to handle resize events
   */
  protected setupResizeListener(): void {
    this.boundOnResize = () => this.onResize();
    this.scale.on('resize', this.boundOnResize);
  }

  /**
   * Remove resize listener - called automatically in cleanup
   */
  protected removeResizeListener(): void {
    if (this.boundOnResize) {
      this.scale.off('resize', this.boundOnResize);
      this.boundOnResize = null;
    }
  }

  /**
   * Override to handle resize events
   */
  protected onResize(): void {
    // Override in subclass
  }

  /**
   * Fade in using a tween-based overlay for reliable scene transitions.
   * This approach is more robust than camera.fadeIn() for scene.restart() cases,
   * as it doesn't depend on camera state persisting through scene recreation.
   *
   * The overlay sits at highest depth and tweens from opaque to transparent.
   */
  protected fadeIn(duration: number = SIZES.FADE_DURATION_MS): void {
    const { width, height } = this.cameras.main;

    // Create a black overlay at highest depth - starts fully opaque
    const transitionOverlay = this.add.rectangle(
      width / 2, height / 2,
      width + 100, height + 100,
      0x000000, 1
    );
    transitionOverlay.setDepth(1000);

    // Tween the overlay alpha from 1 to 0 (more reliable than camera fade events)
    this.tweens.add({
      targets: transitionOverlay,
      alpha: 0,
      duration,
      ease: 'Linear',
      onComplete: () => {
        transitionOverlay.destroy();
      },
    });
  }

  /**
   * Fade camera out and execute callback when complete
   */
  protected fadeOut(
    callback: () => void,
    duration: number = SIZES.FADE_DURATION_MS
  ): void {
    this.cameras.main.fadeOut(duration, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', callback);
  }

  /**
   * Transition to another scene with fade
   */
  protected transitionTo(
    sceneKey: string,
    data?: object,
    duration: number = SIZES.FADE_DURATION_MS
  ): void {
    this.fadeOut(() => {
      this.scene.start(sceneKey, data);
    }, duration);
  }

  /**
   * Get viewport metrics
   */
  protected getMetrics(): ViewportMetrics {
    return getViewportMetrics(this);
  }

  /**
   * Get camera dimensions
   */
  protected getCameraBounds(): { width: number; height: number } {
    return {
      width: this.cameras.main.width,
      height: this.cameras.main.height,
    };
  }

  /**
   * Abstract shutdown handler - override to clean up scene-specific resources
   */
  protected abstract onShutdown(): void;

  /**
   * Base cleanup - call super.cleanup() in subclass onShutdown
   */
  protected cleanup(): void {
    this.removeResizeListener();
    this.log.log('Base cleanup complete');
  }
}
