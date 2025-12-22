/**
 * Debug Panel
 * Shows debug controls when DEV.DEBUG_MODE is enabled
 * On mobile: Shows a bug icon that opens a modal overlay
 * On desktop: Shows the full panel
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, SIZES, getViewportMetrics } from '@/config';
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

    const metrics = getViewportMetrics(scene);
    if (metrics.isMobile) {
      this.buildMobileIcon(height);
    } else {
      this.buildDesktopPanel(height);
    }
  }

  private buildMobileIcon(height: number): void {
    const { width } = this.scene.cameras.main;
    const iconSize = 32; // Match 32px touch targets
    const iconX = width - iconSize - 6; // Closer to corner
    const iconY = height - iconSize - 6;

    this.container.setPosition(iconX, iconY);

    // Bug icon button
    const iconBg = this.scene.add.rectangle(iconSize / 2, iconSize / 2, iconSize, iconSize, DEBUG_COLORS.panelBg, 0.9);
    iconBg.setStrokeStyle(2, DEBUG_COLORS.panelBorder, 0.8);
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

    // Modal panel - sized to fit content tightly
    const panelWidth = 200;
    const panelHeight = 320;
    const panelX = width / 2;
    const panelY = height / 2;

    const panelBg = this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, DEBUG_COLORS.panelBg, 0.98);
    panelBg.setStrokeStyle(SIZES.PANEL_BORDER_WIDTH, DEBUG_COLORS.panelBorder, 1);
    panelBg.setInteractive(); // Prevent clicks from reaching backdrop
    this.modalContainer.add(panelBg);

    // X close button at top right
    const closeX = panelX + panelWidth / 2 - 20;
    const closeY = panelY - panelHeight / 2 + 20;
    const closeBtn = this.scene.add.rectangle(closeX, closeY, 30, 30, PALETTE.debug.closeBg, 0.9);
    closeBtn.setStrokeStyle(2, PALETTE.debug.closeBorder, 0.8);
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

    // Title - positioned near top
    const title = createText(this.scene, panelX, panelY - 130, '🐛 DEBUG', {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.modalContainer.add(title);

    // Buttons - compact layout
    const buttonWidth = panelWidth - 32;
    const buttonHeight = 38;
    const buttonSpacing = 44;
    let yPos = panelY - 90;

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

    // Skip to curse row (4 columns: 1, 2, 3, 4)
    if (this.callbacks.onSkipToMode) {
      yPos += buttonSpacing + 8; // Extra spacing before this section
      const modeLabel = createText(this.scene, panelX, yPos - 22, 'Skip to Curse:', {
        fontSize: FONTS.SIZE_MICRO,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_MUTED,
      });
      modeLabel.setOrigin(0.5, 0.5);
      this.modalContainer.add(modeLabel);

      const modeBtnSize = 32;
      const modeGap = 6;
      const totalWidth = 4 * modeBtnSize + 3 * modeGap;
      const startX = panelX - totalWidth / 2 + modeBtnSize / 2;

      for (let mode = 1; mode <= 4; mode++) {
        const btnX = startX + (mode - 1) * (modeBtnSize + modeGap);
        this.createModeButton(btnX, yPos + 8, modeBtnSize, mode);
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
    btn.setStrokeStyle(2, borderColor, 0.8);
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
      btn.setStrokeStyle(2, borderColor, 1);
    });
    btn.on('pointerout', () => {
      btn.setFillStyle(bgColor);
      btn.setStrokeStyle(2, borderColor, 0.8);
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
    btn.setStrokeStyle(2, borderColor, 0.8);
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
      btn.setStrokeStyle(2, hoverBorder, 1);
    });
    btn.on('pointerout', () => {
      btn.setFillStyle(bgColor);
      btn.setStrokeStyle(2, borderColor, 0.8);
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

  private buildDesktopPanel(height: number): void {
    const panelWidth = 130;
    const panelHeight = 260; // Fit skip-to-mode buttons
    const panelX = 15;
    const panelY = (height - panelHeight) / 2;

    this.container.setPosition(panelX, panelY);

    // Panel background - bright orange border for visibility
    const panelBg = this.scene.add.rectangle(panelWidth / 2, panelHeight / 2, panelWidth, panelHeight, DEBUG_COLORS.panelBg, 0.95);
    panelBg.setStrokeStyle(SIZES.PANEL_BORDER_WIDTH, DEBUG_COLORS.panelBorder, 0.9);
    this.container.add(panelBg);

    let yPos = 18;
    const debugLabel = createText(this.scene, panelWidth / 2, yPos, '⚡ DEBUG', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
      fontStyle: 'bold',
    });
    debugLabel.setOrigin(0.5, 0.5);
    this.container.add(debugLabel);

    // Skip time button - bright yellow
    yPos += 30;
    const skipTimeBtn = this.scene.add.rectangle(panelWidth / 2, yPos, panelWidth - 16, 28, DEBUG_COLORS.skipTimeBg, 1);
    skipTimeBtn.setStrokeStyle(2, DEBUG_COLORS.skipTimeBorder, 0.8);
    skipTimeBtn.setInteractive({ useHandCursor: true });
    this.container.add(skipTimeBtn);

    const skipTimeText = createText(this.scene, panelWidth / 2, yPos, '-10s [D]', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
      fontStyle: 'bold',
    });
    skipTimeText.setOrigin(0.5, 0.5);
    this.container.add(skipTimeText);

    skipTimeBtn.on('pointerover', () => {
      skipTimeBtn.setFillStyle(DEBUG_COLORS.skipTimeBgHover);
      skipTimeBtn.setStrokeStyle(2, DEBUG_COLORS.skipTimeBorderHover, 1);
    });
    skipTimeBtn.on('pointerout', () => {
      skipTimeBtn.setFillStyle(DEBUG_COLORS.skipTimeBg);
      skipTimeBtn.setStrokeStyle(2, DEBUG_COLORS.skipTimeBorder, 0.8);
    });
    skipTimeBtn.on('pointerdown', () => this.callbacks.onSkipTime());

    // Skip stage button - bright cyan
    yPos += 36;
    const skipStageBtn = this.scene.add.rectangle(panelWidth / 2, yPos, panelWidth - 16, 28, DEBUG_COLORS.skipStageBg, 1);
    skipStageBtn.setStrokeStyle(2, DEBUG_COLORS.skipStageBorder, 0.8);
    skipStageBtn.setInteractive({ useHandCursor: true });
    this.container.add(skipStageBtn);

    const skipStageText = createText(this.scene, panelWidth / 2, yPos, 'SKIP [S]', {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: COLORS.DEBUG_CYAN,
      fontStyle: 'bold',
    });
    skipStageText.setOrigin(0.5, 0.5);
    this.container.add(skipStageText);

    skipStageBtn.on('pointerover', () => {
      skipStageBtn.setFillStyle(DEBUG_COLORS.skipStageBgHover);
      skipStageBtn.setStrokeStyle(2, DEBUG_COLORS.skipStageBorderHover, 1);
    });
    skipStageBtn.on('pointerout', () => {
      skipStageBtn.setFillStyle(DEBUG_COLORS.skipStageBg);
      skipStageBtn.setStrokeStyle(2, DEBUG_COLORS.skipStageBorder, 0.8);
    });
    skipStageBtn.on('pointerdown', () => this.callbacks.onSkipStage());

    // Clear data button - red
    if (this.callbacks.onClearData) {
      yPos += 36;
      const clearBtn = this.scene.add.rectangle(panelWidth / 2, yPos, panelWidth - 16, 28, DEBUG_COLORS.clearDataBg, 1);
      clearBtn.setStrokeStyle(2, DEBUG_COLORS.clearDataBorder, 0.8);
      clearBtn.setInteractive({ useHandCursor: true });
      this.container.add(clearBtn);

      const clearText = createText(this.scene, panelWidth / 2, yPos, 'CLEAR DATA', {
        fontSize: FONTS.SIZE_TINY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.DEBUG_RED,
        fontStyle: 'bold',
      });
      clearText.setOrigin(0.5, 0.5);
      this.container.add(clearText);

      clearBtn.on('pointerover', () => {
        clearBtn.setFillStyle(DEBUG_COLORS.clearDataBgHover);
        clearBtn.setStrokeStyle(2, DEBUG_COLORS.clearDataBorderHover, 1);
      });
      clearBtn.on('pointerout', () => {
        clearBtn.setFillStyle(DEBUG_COLORS.clearDataBg);
        clearBtn.setStrokeStyle(2, DEBUG_COLORS.clearDataBorder, 0.8);
      });
      clearBtn.on('pointerdown', () => this.callbacks.onClearData!());
      yPos += 36;
    }

    // Perfect upper button - green
    if (this.callbacks.onPerfectUpper) {
      const perfectBtn = this.scene.add.rectangle(panelWidth / 2, yPos, panelWidth - 16, 28, DEBUG_COLORS.perfectUpperBg, 1);
      perfectBtn.setStrokeStyle(2, DEBUG_COLORS.perfectUpperBorder, 0.8);
      perfectBtn.setInteractive({ useHandCursor: true });
      this.container.add(perfectBtn);

      const perfectText = createText(this.scene, panelWidth / 2, yPos, 'PERFECT ↑', {
        fontSize: FONTS.SIZE_TINY,
        fontFamily: FONTS.FAMILY,
        color: COLORS.DEBUG_GREEN,
        fontStyle: 'bold',
      });
      perfectText.setOrigin(0.5, 0.5);
      this.container.add(perfectText);

      perfectBtn.on('pointerover', () => {
        perfectBtn.setFillStyle(DEBUG_COLORS.perfectUpperBgHover);
        perfectBtn.setStrokeStyle(2, DEBUG_COLORS.perfectUpperBorderHover, 1);
      });
      perfectBtn.on('pointerout', () => {
        perfectBtn.setFillStyle(DEBUG_COLORS.perfectUpperBg);
        perfectBtn.setStrokeStyle(2, DEBUG_COLORS.perfectUpperBorder, 0.8);
      });
      perfectBtn.on('pointerdown', () => this.callbacks.onPerfectUpper!());
      yPos += 36;
    }

    // Skip to curse mode buttons (1-4)
    if (this.callbacks.onSkipToMode) {
      const modeLabel = createText(this.scene, panelWidth / 2, yPos, 'Skip to Curse:', {
        fontSize: FONTS.SIZE_NANO,
        fontFamily: FONTS.FAMILY,
        color: COLORS.TEXT_MUTED,
      });
      modeLabel.setOrigin(0.5, 0.5);
      this.container.add(modeLabel);

      yPos += 22;
      const modeBtnSize = 26;
      const modeGap = 4;
      const totalWidth = 4 * modeBtnSize + 3 * modeGap;
      const startX = (panelWidth - totalWidth) / 2 + modeBtnSize / 2;

      for (let mode = 1; mode <= 4; mode++) {
        const btnX = startX + (mode - 1) * (modeBtnSize + modeGap);
        this.createDesktopModeButton(btnX, yPos, modeBtnSize, mode);
      }
    }
  }

  private createDesktopModeButton(x: number, y: number, size: number, mode: number): void {
    const isCurrent = mode === this.callbacks.currentMode;
    const bgColor = isCurrent ? PALETTE.debug.currentModeBg : PALETTE.purple[800];
    const borderColor = isCurrent ? PALETTE.debug.currentModeBorder : PALETTE.purple[500];
    const hoverBg = isCurrent ? PALETTE.debug.currentModeHover : PALETTE.purple[700];
    const textColor = isCurrent ? COLORS.DEBUG_GREEN_BRIGHT : COLORS.DEBUG_PURPLE;

    const btn = this.scene.add.rectangle(x, y, size, size, bgColor, 1);
    btn.setStrokeStyle(2, borderColor, 0.8);
    btn.setInteractive({ useHandCursor: true });
    this.container.add(btn);

    const text = createText(this.scene, x, y, `${mode}`, {
      fontSize: FONTS.SIZE_SMALL,
      fontFamily: FONTS.FAMILY,
      color: textColor,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);
    this.container.add(text);

    btn.on('pointerover', () => {
      btn.setFillStyle(hoverBg);
      btn.setStrokeStyle(2, borderColor, 1);
    });
    btn.on('pointerout', () => {
      btn.setFillStyle(bgColor);
      btn.setStrokeStyle(2, borderColor, 0.8);
    });
    btn.on('pointerdown', () => {
      this.callbacks.onSkipToMode!(mode);
    });
  }

  destroy(): void {
    this.closeModal();
    this.container.destroy();
  }
}
