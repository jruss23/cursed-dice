/**
 * Pause Menu
 * Overlay shown when game is paused
 */

import Phaser from 'phaser';
import { FONTS, COLORS, TIMING, FLASH, LAYOUT, ALPHA, SCALE } from '@/config';
import { createText, createPanelFrame, addPanelFrameToContainer, PANEL_PRESETS } from '@/ui/ui-utils';
import { BaseButton } from '@/ui/base';
import { toggleSFX, isSFXEnabled } from '@/systems/sfx-manager';
import { MusicManager } from '@/systems/music-manager';
import { toDPR } from '@/systems/responsive';

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

/**
 * Calculate panel layout - all Y positions relative to panel center
 * Uses LAYOUT.pauseMenu as source of truth
 * All values scaled to device pixels via toDPR()
 */
function getPauseMenuLayout() {
  const L = LAYOUT.pauseMenu;

  // Scale all values to device pixels
  const titleHeight = toDPR(L.TITLE_HEIGHT);
  const gapTitleToAudio = toDPR(L.GAP_TITLE_TO_AUDIO);
  const audioLabelHeight = toDPR(L.AUDIO_LABEL_HEIGHT);
  const gapAudioToToggles = toDPR(L.GAP_AUDIO_TO_TOGGLES);
  const toggleButtonHeight = toDPR(L.TOGGLE_BUTTON_HEIGHT);
  const gapTogglesToResume = toDPR(L.GAP_TOGGLES_TO_RESUME);
  const actionButtonHeight = toDPR(L.ACTION_BUTTON_HEIGHT);
  const gapResumeToQuit = toDPR(L.GAP_RESUME_TO_QUIT);
  const panelPadding = toDPR(L.PANEL_PADDING);
  const panelWidth = toDPR(L.PANEL_WIDTH);
  const toggleButtonWidth = toDPR(L.TOGGLE_BUTTON_WIDTH);
  const actionButtonWidth = toDPR(L.ACTION_BUTTON_WIDTH);

  // Calculate total content height
  const contentHeight =
    titleHeight +
    gapTitleToAudio +
    audioLabelHeight +
    gapAudioToToggles +
    toggleButtonHeight +
    gapTogglesToResume +
    actionButtonHeight +
    gapResumeToQuit +
    actionButtonHeight;

  const panelHeight = contentHeight + panelPadding * 2;

  // Calculate Y positions (relative to panel center at 0)
  let y = -panelHeight / 2 + panelPadding;

  const titleY = y + titleHeight / 2;
  y += titleHeight + gapTitleToAudio;

  const audioLabelY = y + audioLabelHeight / 2;
  y += audioLabelHeight + gapAudioToToggles;

  const togglesY = y + toggleButtonHeight / 2;
  y += toggleButtonHeight + gapTogglesToResume;

  const resumeY = y + actionButtonHeight / 2;
  y += actionButtonHeight + gapResumeToQuit;

  const quitY = y + actionButtonHeight / 2;

  return {
    panelWidth,
    panelHeight,
    titleY,
    audioLabelY,
    togglesY,
    resumeY,
    quitY,
    toggleButtonWidth,
    toggleButtonHeight,
    actionButtonWidth,
    actionButtonHeight,
  };
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

  private layout = getPauseMenuLayout();

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
      COLORS.OVERLAY, ALPHA.OVERLAY_HEAVY
    );
    this.overlay.setInteractive(); // Block clicks behind
    this.overlay.setDepth(299);
    this.overlay.setVisible(false);

    this.build();
  }

  private build(): void {
    const L = this.layout;

    // Panel frame (centered in container)
    const frame = createPanelFrame(this.scene, {
      x: -L.panelWidth / 2,
      y: -L.panelHeight / 2,
      width: L.panelWidth,
      height: L.panelHeight,
      ...PANEL_PRESETS.modal,
    });
    addPanelFrameToContainer(this.container, frame);

    // Title
    const title = createText(this.scene, 0, L.titleY, 'PAUSED', {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    // Audio settings label
    const audioLabel = createText(this.scene, 0, L.audioLabelY, 'AUDIO', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_SECONDARY,
    });
    audioLabel.setOrigin(0.5, 0.5);
    this.container.add(audioLabel);

    // Toggle buttons spacing (8px gap between buttons, scaled to device pixels)
    const toggleSpacing = L.toggleButtonWidth / 2 + toDPR(8);

    // Music toggle button
    const musicEnabled = this.musicManager?.isEnabled() ?? true;
    this.musicButton = new BaseButton(this.scene, {
      x: -toggleSpacing,
      y: L.togglesY,
      width: L.toggleButtonWidth,
      height: L.toggleButtonHeight,
      label: musicEnabled ? 'MUSIC: ON' : 'MUSIC: OFF',
      style: musicEnabled ? 'secondary' : 'ghost',
      onClick: () => this.toggleMusic(),
    });
    this.container.add(this.musicButton.getContainer());

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
    this.container.add(this.sfxButton.getContainer());

    // Resume button (green/primary)
    this.resumeButton = new BaseButton(this.scene, {
      x: 0,
      y: L.resumeY,
      width: L.actionButtonWidth,
      height: L.actionButtonHeight,
      label: 'RESUME',
      style: 'primary',
      onClick: () => this.callbacks.onResume(),
    });
    this.container.add(this.resumeButton.getContainer());

    // Quit button (red/danger)
    this.quitButton = new BaseButton(this.scene, {
      x: 0,
      y: L.quitY,
      width: L.actionButtonWidth,
      height: L.actionButtonHeight,
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
        alpha: ALPHA.OVERLAY_HEAVY,
        duration: TIMING.QUICK,
        ease: 'Quad.easeOut',
      });
    } else {
      this.overlay.setAlpha(ALPHA.OVERLAY_HEAVY);
    }

    // Show panel
    this.container.setVisible(true);
    if (animate) {
      this.container.setAlpha(0);
      this.container.setScale(SCALE.ENTRY_SUBTLE);
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
        scaleX: SCALE.ENTRY_SUBTLE,
        scaleY: SCALE.ENTRY_SUBTLE,
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
