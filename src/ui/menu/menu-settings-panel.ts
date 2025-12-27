/**
 * Menu Settings Panel
 * Cog icon button that opens a settings overlay
 * Similar to pause menu styling
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, TIMING } from '@/config';
import { createText, createPanelFrame, addPanelFrameToContainer } from '@/ui/ui-utils';
import { BaseButton } from '@/ui/base/base-button';
import { toggleSFX, isSFXEnabled } from '@/systems/sfx-manager';
import { isMusicEnabled } from '@/systems/music-manager';

// Persist music enabled state (same key as MusicManager)
const MUSIC_STORAGE_KEY = 'cursed-dice-music-enabled';

function saveMusicEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(MUSIC_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage errors
  }
}

export interface MenuSettingsPanelConfig {
  x: number;
  y: number;
  onMusicToggle?: (enabled: boolean) => void;
}

export class MenuSettingsPanel {
  private scene: Phaser.Scene;
  private cogButton: Phaser.GameObjects.Container;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private panel: Phaser.GameObjects.Container | null = null;
  private musicButton: BaseButton | null = null;
  private sfxButton: BaseButton | null = null;
  private closeButton: BaseButton | null = null;
  private musicEnabled: boolean;
  private onMusicToggle?: (enabled: boolean) => void;
  private isOpen: boolean = false;

  private readonly panelWidth = 280;
  private readonly panelHeight = 250;

  constructor(scene: Phaser.Scene, config: MenuSettingsPanelConfig) {
    this.scene = scene;
    this.musicEnabled = isMusicEnabled();
    this.onMusicToggle = config.onMusicToggle;

    // Create cog button
    this.cogButton = this.createCogButton(config.x, config.y);
  }

  private createCogButton(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setDepth(100);

    const size = 44;

    // Button background
    const bg = this.scene.add.rectangle(0, 0, size, size, PALETTE.purple[800], 0.9);
    bg.setStrokeStyle(2, PALETTE.purple[500], 0.6);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    // Cog icon (using unicode gear)
    const icon = createText(this.scene, 0, 0, '⚙', {
      fontSize: '24px',
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
    });
    icon.setOrigin(0.5, 0.5);
    container.add(icon);

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(PALETTE.purple[700], 1);
      bg.setStrokeStyle(2, PALETTE.purple[400], 0.8);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(PALETTE.purple[800], 0.9);
      bg.setStrokeStyle(2, PALETTE.purple[500], 0.6);
    });
    bg.on('pointerdown', () => this.open());

    return container;
  }

  private open(): void {
    if (this.isOpen) return;
    this.isOpen = true;

    const { width, height } = this.scene.cameras.main;

    // Dark overlay
    this.overlay = this.scene.add.rectangle(
      width / 2, height / 2,
      width, height,
      COLORS.OVERLAY, 0.85
    );
    this.overlay.setInteractive();
    this.overlay.setDepth(299);
    this.overlay.setAlpha(0);

    // Animate overlay in
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: 0.85,
      duration: TIMING.QUICK,
      ease: 'Quad.easeOut',
    });

    // Panel container
    this.panel = this.scene.add.container(width / 2, height / 2);
    this.panel.setDepth(300);

    // Panel frame
    const frame = createPanelFrame(this.scene, {
      x: -this.panelWidth / 2,
      y: -this.panelHeight / 2,
      width: this.panelWidth,
      height: this.panelHeight,
      glowColor: PALETTE.purple[500],
      bgColor: PALETTE.purple[900],
      borderColor: PALETTE.purple[500],
      cornerColor: PALETTE.purple[400],
    });
    addPanelFrameToContainer(this.panel, frame);

    // Title
    const title = createText(this.scene, 0, -55, 'SETTINGS', {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.panel.add(title);

    // Audio label
    const audioLabel = createText(this.scene, 0, -15, 'AUDIO', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    audioLabel.setOrigin(0.5, 0.5);
    this.panel.add(audioLabel);

    // Music toggle button
    this.musicButton = new BaseButton(this.scene, {
      x: -70,
      y: 25,
      width: 120,
      height: 38,
      label: this.musicEnabled ? 'MUSIC: ON' : 'MUSIC: OFF',
      style: this.musicEnabled ? 'secondary' : 'ghost',
      onClick: () => this.toggleMusic(),
    });
    this.panel.add(this.musicButton.getContainer());

    // SFX toggle button
    const sfxEnabled = isSFXEnabled();
    this.sfxButton = new BaseButton(this.scene, {
      x: 70,
      y: 25,
      width: 120,
      height: 38,
      label: sfxEnabled ? 'SFX: ON' : 'SFX: OFF',
      style: sfxEnabled ? 'secondary' : 'ghost',
      onClick: () => this.toggleSfx(),
    });
    this.panel.add(this.sfxButton.getContainer());

    // Close button
    this.closeButton = new BaseButton(this.scene, {
      x: 0,
      y: 85,
      width: 120,
      height: 38,
      label: 'CLOSE',
      style: 'danger',
      onClick: () => this.close(),
    });
    this.panel.add(this.closeButton.getContainer());

    // Animate panel in
    this.panel.setAlpha(0);
    this.panel.setScale(0.95);
    this.scene.tweens.add({
      targets: this.panel,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: TIMING.ENTRANCE,
      ease: 'Back.easeOut',
    });

    // Close on overlay click
    this.overlay.on('pointerdown', () => this.close());
  }

  private close(): void {
    if (!this.isOpen) return;

    // Animate out
    if (this.overlay) {
      this.scene.tweens.add({
        targets: this.overlay,
        alpha: 0,
        duration: TIMING.QUICK,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.overlay?.destroy();
          this.overlay = null;
        },
      });
    }

    if (this.panel) {
      this.scene.tweens.add({
        targets: this.panel,
        alpha: 0,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: TIMING.QUICK,
        ease: 'Power2',
        onComplete: () => {
          this.musicButton?.destroy();
          this.sfxButton?.destroy();
          this.closeButton?.destroy();
          this.panel?.destroy();
          this.panel = null;
          this.musicButton = null;
          this.sfxButton = null;
          this.closeButton = null;
        },
      });
    }

    this.isOpen = false;
  }

  private toggleMusic(): void {
    this.musicEnabled = !this.musicEnabled;
    saveMusicEnabled(this.musicEnabled);

    this.musicButton?.setLabel(this.musicEnabled ? 'MUSIC: ON' : 'MUSIC: OFF');
    this.musicButton?.setStyle(this.musicEnabled ? 'secondary' : 'ghost');

    // Notify parent to update music volume
    this.onMusicToggle?.(this.musicEnabled);
  }

  private toggleSfx(): void {
    const enabled = toggleSFX();
    this.sfxButton?.setLabel(enabled ? 'SFX: ON' : 'SFX: OFF');
    this.sfxButton?.setStyle(enabled ? 'secondary' : 'ghost');
  }

  destroy(): void {
    this.close();
    this.cogButton.destroy();
  }
}
