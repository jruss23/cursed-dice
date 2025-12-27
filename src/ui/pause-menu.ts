/**
 * Pause Menu
 * Overlay shown when game is paused
 */

import Phaser from 'phaser';
import { FONTS, COLORS, PALETTE, TIMING, FLASH } from '@/config';
import { createText, createPanelFrame, addPanelFrameToContainer } from '@/ui/ui-utils';
import { BaseButton } from '@/ui/base/base-button';
import { toggleSFX, isSFXEnabled } from '@/systems/sfx-manager';
import { MusicManager } from '@/systems/music-manager';

export interface PauseMenuCallbacks {
  onResume: () => void;
  onQuit: () => void;
}

export interface PauseMenuConfig {
  x: number;
  y: number;
  callbacks: PauseMenuCallbacks;
  musicManager?: MusicManager | null;
}

export class PauseMenu {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private overlay: Phaser.GameObjects.Rectangle;
  private resumeButton: BaseButton | null = null;
  private quitButton: BaseButton | null = null;
  private musicButton: BaseButton | null = null;
  private sfxButton: BaseButton | null = null;
  private callbacks: PauseMenuCallbacks;
  private musicManager: MusicManager | null = null;

  private readonly width = 320;
  private readonly height = 340;

  constructor(scene: Phaser.Scene, config: PauseMenuConfig) {
    this.scene = scene;
    this.callbacks = config.callbacks;
    this.musicManager = config.musicManager ?? null;

    // Create container at center of screen
    this.container = scene.add.container(config.x, config.y);
    this.container.setDepth(300);
    this.container.setVisible(false);

    // Dark overlay (full screen, behind panel)
    const { width: screenW, height: screenH } = scene.cameras.main;
    this.overlay = scene.add.rectangle(
      screenW / 2, screenH / 2,
      screenW, screenH,
      COLORS.OVERLAY, 0.85
    );
    this.overlay.setInteractive(); // Block clicks behind
    this.overlay.setDepth(299);
    this.overlay.setVisible(false);

    this.build();
  }

  private build(): void {
    // Panel frame (centered in container)
    const frame = createPanelFrame(this.scene, {
      x: -this.width / 2,
      y: -this.height / 2,
      width: this.width,
      height: this.height,
      glowColor: PALETTE.purple[500],
      bgColor: PALETTE.purple[900],
      borderColor: PALETTE.purple[500],
      cornerColor: PALETTE.purple[400],
    });
    addPanelFrameToContainer(this.container, frame);

    // Title
    const title = createText(this.scene, 0, -120, 'PAUSED', {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    // Audio settings label
    const audioLabel = createText(this.scene, 0, -75, 'AUDIO', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    audioLabel.setOrigin(0.5, 0.5);
    this.container.add(audioLabel);

    // Music toggle button (secondary style - less prominent than Resume)
    const musicEnabled = this.musicManager?.isEnabled() ?? true;
    this.musicButton = new BaseButton(this.scene, {
      x: -70,
      y: -40,
      width: 120,
      height: 38,
      label: musicEnabled ? 'MUSIC: ON' : 'MUSIC: OFF',
      style: musicEnabled ? 'secondary' : 'ghost',
      onClick: () => this.toggleMusic(),
    });
    this.container.add(this.musicButton.getContainer());

    // SFX toggle button (secondary style - less prominent than Resume)
    const sfxEnabled = isSFXEnabled();
    this.sfxButton = new BaseButton(this.scene, {
      x: 70,
      y: -40,
      width: 120,
      height: 38,
      label: sfxEnabled ? 'SFX: ON' : 'SFX: OFF',
      style: sfxEnabled ? 'secondary' : 'ghost',
      onClick: () => this.toggleSfx(),
    });
    this.container.add(this.sfxButton.getContainer());

    // Resume button (green/primary)
    this.resumeButton = new BaseButton(this.scene, {
      x: 0,
      y: 30,
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
      y: 90,
      width: 180,
      height: 44,
      label: 'QUIT',
      style: 'danger',
      onClick: () => {
        this.scene.cameras.main.flash(150, FLASH.RED.r, FLASH.RED.g, FLASH.RED.b);
        this.callbacks.onQuit();
      },
    });
    this.container.add(this.quitButton.getContainer());
  }

  private toggleMusic(): void {
    if (!this.musicManager) return;
    const enabled = this.musicManager.toggle();
    this.musicButton?.setLabel(enabled ? 'MUSIC: ON' : 'MUSIC: OFF');
    this.musicButton?.setStyle(enabled ? 'secondary' : 'ghost');
  }

  private toggleSfx(): void {
    const enabled = toggleSFX();
    this.sfxButton?.setLabel(enabled ? 'SFX: ON' : 'SFX: OFF');
    this.sfxButton?.setStyle(enabled ? 'secondary' : 'ghost');
  }

  show(animate: boolean = true): void {
    // Show overlay
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

    // Show panel
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

  hide(animate: boolean = true): void {
    if (animate) {
      // Fade out overlay
      this.scene.tweens.add({
        targets: this.overlay,
        alpha: 0,
        duration: TIMING.QUICK,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.overlay.setVisible(false);
        },
      });

      // Fade out panel
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
      this.overlay.setVisible(false);
      this.container.setVisible(false);
    }
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  destroy(): void {
    this.resumeButton?.destroy();
    this.quitButton?.destroy();
    this.musicButton?.destroy();
    this.sfxButton?.destroy();

    this.scene.tweens.killTweensOf(this.overlay);
    this.scene.tweens.killTweensOf(this.container);

    this.overlay.destroy();
    this.container.destroy();
  }
}
