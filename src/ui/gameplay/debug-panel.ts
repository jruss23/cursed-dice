/**
 * Debug Panel
 * Shows debug controls when DEV.DEBUG_MODE is enabled
 * On mobile: Shows a bug icon that opens a modal overlay
 * On desktop: Shows the full panel
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, SIZES } from '@/config';
import { toDPR } from '@/systems/responsive';
import { createText } from '@/ui/ui-utils';

// Debug-specific colors (intentionally bright for visibility)
const DEBUG_COLORS = {
  panelBg: PALETTE.gold[900],
  panelBorder: PALETTE.gold[500],
  skipTimeBg: PALETTE.gold[800],
  skipTimeBorder: PALETTE.gold[400],
  skipTimeBgHover: PALETTE.gold[700],
  skipTimeBorderHover: PALETTE.gold[300],
  skipStageBg: PALETTE.debug.cyanDark,
  skipStageBorder: PALETTE.debug.cyan,
  skipStageBgHover: PALETTE.debug.cyanDarkHover,
  skipStageBorderHover: PALETTE.debug.cyanLight,
  clearDataBg: PALETTE.debug.redDark,
  clearDataBorder: PALETTE.debug.closeBorder,
  clearDataBgHover: PALETTE.debug.redDarkHover,
  clearDataBorderHover: PALETTE.red[400],
  perfectUpperBg: PALETTE.debug.greenDark,
  perfectUpperBorder: PALETTE.debug.greenBorder,
  perfectUpperBgHover: PALETTE.debug.greenDarkHover,
  perfectUpperBorderHover: PALETTE.debug.greenBorderHover,
} as const;

export interface DebugPanelCallbacks {
  onSkipTime: () => void;
  onSkipStage: () => void;
  onClearData?: () => void;
  onPerfectUpper?: () => void;
  onSkipToMode?: (mode: number) => void; // Skip directly to mode 1-4 (2-4 auto-enable expansion)
  currentMode?: number; // Current mode (1-4) - used to highlight in green
}

export class DebugPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private modalContainer: Phaser.GameObjects.Container | null = null;
  private callbacks: DebugPanelCallbacks;
  private isModalOpen: boolean = false;

  constructor(scene: Phaser.Scene, height: number, callbacks: DebugPanelCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.container = this.scene.add.container(0, 0);

    // Always use mobile icon (game is locked to 430px width)
    this.buildMobileIcon(height);
  }

  private buildMobileIcon(height: number): void {
    const { width } = this.scene.cameras.main;

    // Icon positioning (scaled for DPR)
    const iconSize = toDPR(32); // Match 32px touch targets
    const edgePadding = toDPR(8);

    const iconX = width - iconSize - edgePadding;
    const iconY = height - iconSize - edgePadding;

    this.container.setPosition(iconX, iconY);

    // Bug icon button
    const iconBg = this.scene.add.rectangle(iconSize / 2, iconSize / 2, iconSize, iconSize, DEBUG_COLORS.panelBg, 0.9);
    iconBg.setStrokeStyle(toDPR(2), DEBUG_COLORS.panelBorder, 0.8);
    iconBg.setInteractive({ useHandCursor: true });
    this.container.add(iconBg);

    const bugIcon = createText(this.scene, iconSize / 2, iconSize / 2, '🐛', {
      fontSize: FONTS.SIZE_BODY,
    });
    bugIcon.setOrigin(0.5, 0.5);
    this.container.add(bugIcon);

    iconBg.on('pointerdown', () => this.toggleModal());
  }

  private toggleModal(): void {
    if (this.isModalOpen) {
      this.closeModal();
    } else {
      this.openModal();
    }
  }

  private openModal(): void {
    if (this.modalContainer) return;

    const { width, height } = this.scene.cameras.main;
    this.modalContainer = this.scene.add.container(0, 0);
    this.modalContainer.setDepth(1000);

    // Semi-transparent backdrop - clicking closes modal
    const backdrop = this.scene.add.rectangle(width / 2, height / 2, width, height, COLORS.OVERLAY, 0.7);
    backdrop.setInteractive();
    backdrop.on('pointerdown', () => this.closeModal());
    this.modalContainer.add(backdrop);

    // Modal panel - sized to fit content tightly (scaled for DPR)
    const panelWidth = toDPR(200);
    const panelHeight = toDPR(320);
    const panelX = width / 2;
    const panelY = height / 2;

    const panelBg = this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, DEBUG_COLORS.panelBg, 0.98);
    panelBg.setStrokeStyle(toDPR(SIZES.PANEL_BORDER_WIDTH), DEBUG_COLORS.panelBorder, 1);
    panelBg.setInteractive(); // Prevent clicks from reaching backdrop
    this.modalContainer.add(panelBg);

    // X close button at top right (scaled for DPR)
    const closeBtnSize = toDPR(30);
    const closeOffset = toDPR(20);
    const closeX = panelX + panelWidth / 2 - closeOffset;
    const closeY = panelY - panelHeight / 2 + closeOffset;
    const closeBtn = this.scene.add.rectangle(closeX, closeY, closeBtnSize, closeBtnSize, PALETTE.debug.closeBg, 0.9);
    closeBtn.setStrokeStyle(toDPR(2), PALETTE.debug.closeBorder, 0.8);
    closeBtn.setInteractive({ useHandCursor: true });
    this.modalContainer.add(closeBtn);

    const closeIcon = createText(this.scene, closeX, closeY, '✕', {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.DEBUG_RED,
      fontStyle: 'bold',
    });
    closeIcon.setOrigin(0.5, 0.5);
    this.modalContainer.add(closeIcon);

    closeBtn.on('pointerover', () => closeBtn.setFillStyle(PALETTE.debug.closeBgHover));
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(PALETTE.debug.closeBg));
    closeBtn.on('pointerdown', () => this.closeModal());

    // Title - positioned near top (scaled for DPR)
    const title = createText(this.scene, panelX, panelY - toDPR(130), '🐛 DEBUG', {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.modalContainer.add(title);

    // Buttons - compact layout (scaled for DPR)
    const buttonWidth = panelWidth - toDPR(32);
    const buttonHeight = toDPR(38);
    const buttonSpacing = toDPR(44);
    let yPos = panelY - toDPR(90);

    // Skip time button
    this.createModalButton(panelX, yPos, buttonWidth, buttonHeight, '-10 Seconds',
      DEBUG_COLORS.skipTimeBg, DEBUG_COLORS.skipTimeBorder,
      DEBUG_COLORS.skipTimeBgHover, DEBUG_COLORS.skipTimeBorderHover,
      COLORS.TEXT_WARNING, () => {
        this.callbacks.onSkipTime();
        // Don't close - allow repeated clicks
      });

    // Skip stage button
    yPos += buttonSpacing;
    this.createModalButton(panelX, yPos, buttonWidth, buttonHeight, 'Skip Stage',
      DEBUG_COLORS.skipStageBg, DEBUG_COLORS.skipStageBorder,
      DEBUG_COLORS.skipStageBgHover, DEBUG_COLORS.skipStageBorderHover,
      COLORS.DEBUG_CYAN, () => {
        this.callbacks.onSkipStage();
        this.closeModal(); // This one closes since it changes scene
      });

    // Clear data button
    if (this.callbacks.onClearData) {
      yPos += buttonSpacing;
      this.createModalButton(panelX, yPos, buttonWidth, buttonHeight, 'Clear Data',
        DEBUG_COLORS.clearDataBg, DEBUG_COLORS.clearDataBorder,
        DEBUG_COLORS.clearDataBgHover, DEBUG_COLORS.clearDataBorderHover,
        COLORS.DEBUG_RED, () => {
          this.callbacks.onClearData!();
          this.closeModal(); // This one closes since it resets data
        });
    }

    // Perfect upper section button
    if (this.callbacks.onPerfectUpper) {
      yPos += buttonSpacing;
      this.createModalButton(panelX, yPos, buttonWidth, buttonHeight, 'Perfect Upper',
        DEBUG_COLORS.perfectUpperBg, DEBUG_COLORS.perfectUpperBorder,
        DEBUG_COLORS.perfectUpperBgHover, DEBUG_COLORS.perfectUpperBorderHover,
        COLORS.DEBUG_GREEN, () => {
          this.callbacks.onPerfectUpper!();
          // Don't close - allow seeing result
        });
    }

    // Skip to seal row (4 columns: 1, 2, 3, 4)
    if (this.callbacks.onSkipToMode) {
      yPos += buttonSpacing + toDPR(8); // Extra spacing before this section
      const modeLabel = createText(this.scene, panelX, yPos - toDPR(22), 'Skip to Seal:', {
        fontSize: FONTS.SIZE_MICRO,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_MUTED,
      });
      modeLabel.setOrigin(0.5, 0.5);
      this.modalContainer.add(modeLabel);

      const modeBtnSize = toDPR(32);
      const modeGap = toDPR(6);
      const totalWidth = 4 * modeBtnSize + 3 * modeGap;
      const startX = panelX - totalWidth / 2 + modeBtnSize / 2;

      for (let mode = 1; mode <= 4; mode++) {
        const btnX = startX + (mode - 1) * (modeBtnSize + modeGap);
        this.createModeButton(btnX, yPos + toDPR(8), modeBtnSize, mode);
      }
    }

    this.isModalOpen = true;
  }

  private createModeButton(x: number, y: number, size: number, mode: number): void {
    if (!this.modalContainer) return;

    // Color based on whether this is the current mode
    // Current mode: green (active indicator)
    // Other modes: purple (inactive)
    const isCurrent = mode === this.callbacks.currentMode;
    const bgColor = isCurrent ? PALETTE.debug.currentModeBg : PALETTE.purple[800];
    const borderColor = isCurrent ? PALETTE.debug.currentModeBorder : PALETTE.purple[500];
    const hoverBg = isCurrent ? PALETTE.debug.currentModeHover : PALETTE.purple[700];
    const textColor = isCurrent ? COLORS.DEBUG_GREEN_BRIGHT : COLORS.DEBUG_PURPLE;

    const btn = this.scene.add.rectangle(x, y, size, size, bgColor, 1);
    btn.setStrokeStyle(toDPR(2), borderColor, 0.8);
    btn.setInteractive({ useHandCursor: true });
    this.modalContainer.add(btn);

    const text = createText(this.scene, x, y, `${mode}`, {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: textColor,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);
    this.modalContainer.add(text);

    btn.on('pointerover', () => {
      btn.setFillStyle(hoverBg);
      btn.setStrokeStyle(toDPR(2), borderColor, 1);
    });
    btn.on('pointerout', () => {
      btn.setFillStyle(bgColor);
      btn.setStrokeStyle(toDPR(2), borderColor, 0.8);
    });
    btn.on('pointerdown', () => {
      this.callbacks.onSkipToMode!(mode);
      this.closeModal();
    });
  }

  private createModalButton(
    x: number, y: number, width: number, height: number, label: string,
    bgColor: number, borderColor: number, hoverBg: number, hoverBorder: number,
    textColor: string, onClick: () => void
  ): void {
    if (!this.modalContainer) return;

    const btn = this.scene.add.rectangle(x, y, width, height, bgColor, 1);
    btn.setStrokeStyle(toDPR(2), borderColor, 0.8);
    btn.setInteractive({ useHandCursor: true });
    this.modalContainer.add(btn);

    const text = createText(this.scene, x, y, label, {
      fontSize: FONTS.SIZE_BUTTON,
      fontFamily: FONTS.FAMILY,
      color: textColor,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);
    this.modalContainer.add(text);

    btn.on('pointerover', () => {
      btn.setFillStyle(hoverBg);
      btn.setStrokeStyle(toDPR(2), hoverBorder, 1);
    });
    btn.on('pointerout', () => {
      btn.setFillStyle(bgColor);
      btn.setStrokeStyle(toDPR(2), borderColor, 0.8);
    });
    btn.on('pointerdown', onClick);
  }

  private closeModal(): void {
    if (this.modalContainer) {
      this.modalContainer.destroy();
      this.modalContainer = null;
    }
    this.isModalOpen = false;
  }

  destroy(): void {
    this.closeModal();
    this.container.destroy();
  }
}
