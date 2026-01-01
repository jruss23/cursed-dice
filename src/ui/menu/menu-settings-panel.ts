/**
 * Menu Settings Panel
 * Cog icon button that opens a settings overlay
 * Similar to pause menu styling
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, TIMING, LAYOUT, ALPHA } from '@/config';
import { type ViewportSizing, toDPR } from '@/systems/responsive';
import { createText, createPanelFrame, addPanelFrameToContainer, PANEL_PRESETS } from '@/ui/ui-utils';
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

/**
 * Calculate settings panel layout
 * Uses LAYOUT.settingsPanel as source of truth
 * All values scaled to device pixels via toDPR()
 */
function getSettingsLayout() {
  const L = LAYOUT.settingsPanel;

  // Scale all values to device pixels
  const titleHeight = toDPR(L.TITLE_HEIGHT);
  const gapTitleToAudio = toDPR(L.GAP_TITLE_TO_AUDIO);
  const audioLabelHeight = toDPR(L.AUDIO_LABEL_HEIGHT);
  const gapAudioToToggles = toDPR(L.GAP_AUDIO_TO_TOGGLES);
  const toggleButtonHeight = toDPR(L.TOGGLE_BUTTON_HEIGHT);
  const gapTogglesToClose = toDPR(L.GAP_TOGGLES_TO_CLOSE);
  const closeButtonHeight = toDPR(L.CLOSE_BUTTON_HEIGHT);
  const panelPadding = toDPR(L.PANEL_PADDING);
  const panelWidth = toDPR(L.PANEL_WIDTH);
  const toggleButtonWidth = toDPR(L.TOGGLE_BUTTON_WIDTH);
  const closeButtonWidth = toDPR(L.CLOSE_BUTTON_WIDTH);

  const contentHeight =
    titleHeight +
    gapTitleToAudio +
    audioLabelHeight +
    gapAudioToToggles +
    toggleButtonHeight +
    gapTogglesToClose +
    closeButtonHeight;

  const panelHeight = contentHeight + panelPadding * 2;

  // Calculate Y positions relative to panel center
  let y = -panelHeight / 2 + panelPadding;

  const titleY = y + titleHeight / 2;
  y += titleHeight + gapTitleToAudio;

  const audioLabelY = y + audioLabelHeight / 2;
  y += audioLabelHeight + gapAudioToToggles;

  const togglesY = y + toggleButtonHeight / 2;
  y += toggleButtonHeight + gapTogglesToClose;

  const closeY = y + closeButtonHeight / 2;

  return {
    panelWidth,
    panelHeight,
    titleY,
    audioLabelY,
    togglesY,
    closeY,
    toggleButtonWidth,
    toggleButtonHeight,
    closeButtonWidth,
    closeButtonHeight,
  };
}

export interface MenuSettingsPanelConfig {
  x: number;
  y: number;
  onMusicToggle?: (enabled: boolean) => void;
  sizing?: ViewportSizing;
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

  private layout = getSettingsLayout();

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

    const size = toDPR(44);

    // Button background
    const bg = this.scene.add.rectangle(0, 0, size, size, PALETTE.purple[800], ALPHA.PANEL_SOLID);
    bg.setStrokeStyle(toDPR(2), PALETTE.purple[500], ALPHA.BORDER_MEDIUM);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    // Cog icon (using unicode gear)
    const icon = createText(this.scene, 0, 0, '⚙', {
      fontSize: FONTS.SIZE_LARGE,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
    });
    icon.setOrigin(0.5, 0.5);
    container.add(icon);

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(PALETTE.purple[700], 1);
      bg.setStrokeStyle(toDPR(2), PALETTE.purple[400], ALPHA.BORDER_SOLID);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(PALETTE.purple[800], ALPHA.PANEL_SOLID);
      bg.setStrokeStyle(toDPR(2), PALETTE.purple[500], ALPHA.BORDER_MEDIUM);
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
      COLORS.OVERLAY, ALPHA.OVERLAY_HEAVY
    );
    this.overlay.setInteractive();
    this.overlay.setDepth(299);
    this.overlay.setAlpha(0);

    // Animate overlay in
    this.scene.tweens.add({
      targets: this.overlay,
      alpha: ALPHA.OVERLAY_HEAVY,
      duration: TIMING.QUICK,
      ease: 'Quad.easeOut',
    });

    // Panel container
    this.panel = this.scene.add.container(width / 2, height / 2);
    this.panel.setDepth(300);

    const L = this.layout;

    // Panel frame
    const frame = createPanelFrame(this.scene, {
      x: -L.panelWidth / 2,
      y: -L.panelHeight / 2,
      width: L.panelWidth,
      height: L.panelHeight,
      ...PANEL_PRESETS.modal,
    });
    addPanelFrameToContainer(this.panel, frame);

    // Title
    const title = createText(this.scene, 0, L.titleY, 'SETTINGS', {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.panel.add(title);

    // Audio label
    const audioLabel = createText(this.scene, 0, L.audioLabelY, 'AUDIO', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    audioLabel.setOrigin(0.5, 0.5);
    this.panel.add(audioLabel);

    // Toggle buttons spacing (6px gap between buttons, scaled to device pixels)
    const toggleSpacing = L.toggleButtonWidth / 2 + toDPR(6);

    // Music toggle button
    this.musicButton = new BaseButton(this.scene, {
      x: -toggleSpacing,
      y: L.togglesY,
      width: L.toggleButtonWidth,
      height: L.toggleButtonHeight,
      label: this.musicEnabled ? 'MUSIC: ON' : 'MUSIC: OFF',
      style: this.musicEnabled ? 'secondary' : 'ghost',
      onClick: () => this.toggleMusic(),
    });
    this.panel.add(this.musicButton.getContainer());

    // SFX toggle button
    const sfxEnabled = isSFXEnabled();
    this.sfxButton = new BaseButton(this.scene, {
      x: toggleSpacing,
      y: L.togglesY,
      width: L.toggleButtonWidth,
      height: L.toggleButtonHeight,
      label: sfxEnabled ? 'SFX: ON' : 'SFX: OFF',
      style: sfxEnabled ? 'secondary' : 'ghost',
      onClick: () => this.toggleSfx(),
    });
    this.panel.add(this.sfxButton.getContainer());

    // Close button
    this.closeButton = new BaseButton(this.scene, {
      x: 0,
      y: L.closeY,
      width: L.closeButtonWidth,
      height: L.closeButtonHeight,
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
