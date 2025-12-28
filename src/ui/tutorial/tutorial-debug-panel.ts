/**
 * Tutorial Debug Panel
 * Simple debug panel for TutorialScene with two actions:
 * - Pass Tutorial (show completion with 250+ score)
 * - Fail Tutorial (show completion with <250 score)
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, SIZES } from '@/config';
import { createText } from '@/ui/ui-utils';

// Debug-specific colors
const DEBUG_COLORS = {
  panelBg: PALETTE.gold[900],
  panelBorder: PALETTE.gold[500],
  practiceBg: PALETTE.debug.cyanDark,
  practiceBorder: PALETTE.debug.cyan,
  practiceBgHover: PALETTE.debug.cyanDarkHover,
  passBg: PALETTE.debug.greenDark,
  passBorder: PALETTE.debug.greenBorder,
  passBgHover: PALETTE.debug.greenDarkHover,
  failBg: PALETTE.debug.redDark,
  failBorder: PALETTE.debug.closeBorder,
  failBgHover: PALETTE.debug.redDarkHover,
} as const;

export interface TutorialDebugPanelCallbacks {
  onSkipToPractice: () => void;
  onPassTutorial: () => void;
  onFailTutorial: () => void;
}

export class TutorialDebugPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private modalContainer: Phaser.GameObjects.Container | null = null;
  private callbacks: TutorialDebugPanelCallbacks;
  private isModalOpen: boolean = false;

  constructor(scene: Phaser.Scene, height: number, callbacks: TutorialDebugPanelCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.container = this.scene.add.container(0, 0);

    // Always use mobile icon (game is locked to 430px width)
    this.buildMobileIcon(height);
  }

  private buildMobileIcon(height: number): void {
    const { width } = this.scene.cameras.main;
    const iconSize = 32;
    const iconX = width - iconSize - 6;
    const iconY = height - iconSize - 6;

    this.container.setPosition(iconX, iconY);

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

    // Backdrop
    const backdrop = this.scene.add.rectangle(width / 2, height / 2, width, height, COLORS.OVERLAY, 0.7);
    backdrop.setInteractive();
    backdrop.on('pointerdown', () => this.closeModal());
    this.modalContainer.add(backdrop);

    // Panel
    const panelWidth = 180;
    const panelHeight = 190;
    const panelX = width / 2;
    const panelY = height / 2;

    const panelBg = this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, DEBUG_COLORS.panelBg, 0.98);
    panelBg.setStrokeStyle(SIZES.PANEL_BORDER_WIDTH, DEBUG_COLORS.panelBorder, 1);
    panelBg.setInteractive();
    this.modalContainer.add(panelBg);

    // Close button
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

    // Title
    const title = createText(this.scene, panelX, panelY - 70, '🐛 DEBUG', {
      fontSize: FONTS.SIZE_BODY,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_WARNING,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.modalContainer.add(title);

    // Buttons
    const buttonWidth = panelWidth - 32;
    const buttonHeight = 36;

    // Skip to Practice button (cyan)
    this.createModalButton(panelX, panelY - 30, buttonWidth, buttonHeight, 'Skip to Practice',
      DEBUG_COLORS.practiceBg, DEBUG_COLORS.practiceBorder, DEBUG_COLORS.practiceBgHover,
      COLORS.DEBUG_CYAN, () => {
        this.callbacks.onSkipToPractice();
        this.closeModal();
      });

    // Pass Tutorial button (green)
    this.createModalButton(panelX, panelY + 15, buttonWidth, buttonHeight, 'Pass Tutorial',
      DEBUG_COLORS.passBg, DEBUG_COLORS.passBorder, DEBUG_COLORS.passBgHover,
      COLORS.DEBUG_GREEN, () => {
        this.callbacks.onPassTutorial();
        this.closeModal();
      });

    // Fail Tutorial button (red)
    this.createModalButton(panelX, panelY + 60, buttonWidth, buttonHeight, 'Fail Tutorial',
      DEBUG_COLORS.failBg, DEBUG_COLORS.failBorder, DEBUG_COLORS.failBgHover,
      COLORS.DEBUG_RED, () => {
        this.callbacks.onFailTutorial();
        this.closeModal();
      });

    this.isModalOpen = true;
  }

  private createModalButton(
    x: number, y: number, width: number, height: number, label: string,
    bgColor: number, borderColor: number, hoverBg: number, textColor: string,
    onClick: () => void
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
      btn.setStrokeStyle(2, borderColor, 1);
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

  destroy(): void {
    this.closeModal();
    this.container.destroy();
  }
}
