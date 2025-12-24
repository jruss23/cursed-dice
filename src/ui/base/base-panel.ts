/**
 * BasePanel Abstract Class
 * Common functionality for all panel components
 *
 * Usage:
 *   class MyPanel extends BasePanel {
 *     protected width = 300;
 *     protected height = 200;
 *
 *     build(): void {
 *       this.createFrame();
 *       // Add custom content
 *     }
 *   }
 */

import Phaser from 'phaser';
import { PALETTE, TIMING } from '@/config';
import { createText, createPanelFrame, addPanelFrameToContainer } from '@/ui/ui-utils';

// =============================================================================
// TYPES
// =============================================================================

export interface BasePanelConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  depth?: number;
  visible?: boolean;
}

// =============================================================================
// BASE PANEL
// =============================================================================

export abstract class BasePanel {
  protected scene: Phaser.Scene;
  protected container: Phaser.GameObjects.Container;
  protected config: BasePanelConfig;

  // Override in subclass
  protected abstract readonly width: number;
  protected abstract readonly height: number;

  constructor(scene: Phaser.Scene, config: BasePanelConfig) {
    this.scene = scene;
    this.config = config;

    this.container = scene.add.container(config.x, config.y);
    if (config.depth !== undefined) {
      this.container.setDepth(config.depth);
    }
    if (config.visible === false) {
      this.container.setVisible(false);
    }

    this.build();
  }

  /**
   * Build the panel content - implement in subclass
   */
  protected abstract build(): void;

  /**
   * Create standard panel frame (glow, background, corners)
   * Call this in build() before adding custom content
   */
  protected createFrame(options?: {
    glowColor?: number;
    bgColor?: number;
    borderColor?: number;
    cornerColor?: number;
  }): void {
    const frame = createPanelFrame(this.scene, {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      glowColor: options?.glowColor ?? PALETTE.purple[500],
      bgColor: options?.bgColor ?? PALETTE.purple[900],
      borderColor: options?.borderColor ?? PALETTE.purple[500],
      cornerColor: options?.cornerColor ?? PALETTE.purple[400],
    });
    addPanelFrameToContainer(this.container, frame);
  }

  /**
   * Create text with standard settings
   */
  protected createText(
    x: number,
    y: number,
    content: string,
    style: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Text {
    const text = createText(this.scene, x, y, content, style);
    this.container.add(text);
    return text;
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Show the panel with optional animation
   */
  show(animate: boolean = true): void {
    this.container.setVisible(true);

    if (animate) {
      this.container.setAlpha(0);
      this.container.setScale(0.95);
      this.scene.tweens.add({
        targets: this.container,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: TIMING.ENTRANCE,
        ease: 'Back.easeOut',
      });
    } else {
      this.container.setAlpha(1);
      this.container.setScale(1);
    }
  }

  /**
   * Hide the panel with optional animation
   */
  hide(animate: boolean = true): void {
    if (animate) {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: TIMING.QUICK,
        ease: 'Power2',
        onComplete: () => {
          this.container.setVisible(false);
        },
      });
    } else {
      this.container.setVisible(false);
    }
  }

  /**
   * Set visibility directly
   */
  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  /**
   * Check if panel is visible
   */
  isVisible(): boolean {
    return this.container.visible;
  }

  /**
   * Set depth
   */
  setDepth(depth: number): void {
    this.container.setDepth(depth);
  }

  /**
   * Get the container (for external positioning)
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Get bounds for highlighting
   */
  getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.config.x,
      y: this.config.y,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Destroy the panel and cleanup
   */
  destroy(): void {
    this.scene.tweens.killTweensOf(this.container);
    this.container.destroy();
  }
}
