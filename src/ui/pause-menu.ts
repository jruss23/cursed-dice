/**
 * Pause Menu
 * Overlay shown when game is paused
 * Extends BasePanel for consistent styling
 */

import Phaser from 'phaser';
import { FONTS, COLORS, TIMING } from '@/config';
import { BasePanel, BasePanelConfig } from '@/ui/base/base-panel';
import { BaseButton } from '@/ui/base/base-button';

export interface PauseMenuCallbacks {
  onResume: () => void;
  onQuit: () => void;
}

export interface PauseMenuConfig extends BasePanelConfig {
  callbacks: PauseMenuCallbacks;
}

export class PauseMenu extends BasePanel {
  protected readonly width = 320;
  protected readonly height = 240;

  private callbacks: PauseMenuCallbacks;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private resumeButton: BaseButton | null = null;
  private quitButton: BaseButton | null = null;

  constructor(scene: Phaser.Scene, config: PauseMenuConfig) {
    // Store callbacks before super() since build() will need them
    // Note: TypeScript requires super() before 'this', so we pass via config
    super(scene, {
      ...config,
      depth: config.depth ?? 300,
      visible: false,
    });
    this.callbacks = config.callbacks;
  }

  protected build(): void {
    const { width, height } = this.scene.cameras.main;

    // Dark overlay (full screen, behind panel)
    // Note: Added to scene directly, not container, since container is centered
    this.overlay = this.scene.add.rectangle(
      width / 2, height / 2,
      width, height,
      COLORS.OVERLAY, 0.85
    );
    this.overlay.setInteractive(); // Block clicks behind
    this.overlay.setDepth(299); // Just below panel
    this.overlay.setVisible(false);

    // Create standard panel frame (glow, background, corners)
    this.createFrame();

    // Title
    this.createText(0, -70, 'PAUSED', {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    // Resume button (green/primary)
    this.resumeButton = new BaseButton(this.scene, {
      x: 0,
      y: 0,
      width: 180,
      height: 44,
      label: 'RESUME',
      style: 'primary',
      onClick: () => this.callbacks.onResume(),
    });
    this.container.add(this.resumeButton.getContainer());

    // Quit button (red/danger)
    this.quitButton = new BaseButton(this.scene, {
      x: 0,
      y: 60,
      width: 180,
      height: 44,
      label: 'QUIT TO MENU',
      style: 'danger',
      onClick: () => this.callbacks.onQuit(),
    });
    this.container.add(this.quitButton.getContainer());
  }

  /**
   * Show the panel with overlay animation
   */
  override show(animate: boolean = true): void {
    // Show overlay first
    if (this.overlay) {
      this.overlay.setVisible(true);
      if (animate) {
        this.overlay.setAlpha(0);
        this.scene.tweens.add({
          targets: this.overlay,
          alpha: 0.85,
          duration: TIMING.QUICK,
          ease: 'Quad.easeOut',
        });
      } else {
        this.overlay.setAlpha(0.85);
      }
    }

    // Show panel
    super.show(animate);
  }

  /**
   * Hide the panel with overlay animation
   */
  override hide(animate: boolean = true): void {
    if (animate) {
      // Fade out overlay
      if (this.overlay) {
        this.scene.tweens.add({
          targets: this.overlay,
          alpha: 0,
          duration: TIMING.QUICK,
          ease: 'Quad.easeIn',
          onComplete: () => {
            this.overlay?.setVisible(false);
          },
        });
      }
    } else if (this.overlay) {
      this.overlay.setVisible(false);
    }

    // Hide panel
    super.hide(animate);
  }

  /**
   * Destroy and cleanup
   */
  override destroy(): void {
    // Clean up buttons
    this.resumeButton?.destroy();
    this.quitButton?.destroy();

    // Clean up overlay
    if (this.overlay) {
      this.scene.tweens.killTweensOf(this.overlay);
      this.overlay.destroy();
      this.overlay = null;
    }

    super.destroy();
  }
}
