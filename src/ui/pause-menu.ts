/**
 * Pause Menu
 * Overlay shown when game is paused
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS, SIZES } from '@/config';
import { createText } from '@/ui/ui-utils';

export interface PauseMenuCallbacks {
  onResume: () => void;
  onQuit: () => void;
}

export class PauseMenu {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private callbacks: PauseMenuCallbacks;

  constructor(scene: Phaser.Scene, callbacks: PauseMenuCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(300);
    this.container.setVisible(false);

    this.create();
  }

  private create(): void {
    const { width, height } = this.scene.cameras.main;

    // Dark overlay
    const overlay = this.scene.add.rectangle(
      width / 2, height / 2,
      width, height,
      COLORS.OVERLAY, 0.85
    );
    overlay.setInteractive(); // Block clicks behind
    this.container.add(overlay);

    // Panel dimensions
    const panelWidth = 320;
    const panelHeight = 240;

    // Panel background
    const panelBg = this.scene.add.rectangle(
      width / 2, height / 2,
      panelWidth, panelHeight,
      PALETTE.purple[800], 0.98
    );
    panelBg.setStrokeStyle(SIZES.PANEL_BORDER_WIDTH, PALETTE.purple[500], 0.8);
    this.container.add(panelBg);

    // Corner accents
    const cornerSize = SIZES.PANEL_CORNER_SIZE;
    const cornerInset = SIZES.PANEL_CORNER_INSET;
    const panelLeft = width / 2 - panelWidth / 2;
    const panelTop = height / 2 - panelHeight / 2;

    const corners = [
      { x: panelLeft + cornerInset, y: panelTop + cornerInset, ax: 1, ay: 1 },
      { x: panelLeft + panelWidth - cornerInset, y: panelTop + cornerInset, ax: -1, ay: 1 },
      { x: panelLeft + panelWidth - cornerInset, y: panelTop + panelHeight - cornerInset, ax: -1, ay: -1 },
      { x: panelLeft + cornerInset, y: panelTop + panelHeight - cornerInset, ax: 1, ay: -1 },
    ];

    corners.forEach(corner => {
      const accent = this.scene.add.graphics();
      accent.lineStyle(2, PALETTE.purple[400], 0.5);
      accent.beginPath();
      accent.moveTo(corner.x, corner.y + cornerSize * corner.ay);
      accent.lineTo(corner.x, corner.y);
      accent.lineTo(corner.x + cornerSize * corner.ax, corner.y);
      accent.strokePath();
      this.container.add(accent);
    });

    // Title
    const title = createText(this.scene, width / 2, height / 2 - 70, 'PAUSED', {
      fontSize: FONTS.SIZE_HEADING,
      fontFamily: FONTS.FAMILY,
      color: COLORS.TEXT_PRIMARY,
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.container.add(title);

    // Resume button (green/primary)
    this.createButton(
      width / 2,
      height / 2,
      'RESUME',
      'primary',
      () => this.callbacks.onResume()
    );

    // Quit button (red/danger)
    this.createButton(
      width / 2,
      height / 2 + 60,
      'QUIT TO MENU',
      'danger',
      () => this.callbacks.onQuit()
    );

  }

  private createButton(
    x: number,
    y: number,
    label: string,
    style: 'primary' | 'danger',
    onClick: () => void
  ): void {
    const btnWidth = 180;
    const btnHeight = 44;

    const styles = {
      primary: {
        bg: PALETTE.green[700],
        bgHover: PALETTE.green[600],
        border: PALETTE.green[500],
        borderHover: PALETTE.green[400],
        text: COLORS.TEXT_SUCCESS,
      },
      danger: {
        bg: PALETTE.red[800],
        bgHover: PALETTE.red[700],
        border: PALETTE.red[500],
        borderHover: PALETTE.red[400],
        text: COLORS.TEXT_DANGER,
      },
    };

    const s = styles[style];

    const btnBg = this.scene.add.rectangle(x, y, btnWidth, btnHeight, s.bg, 0.95);
    btnBg.setStrokeStyle(2, s.border, 0.8);
    btnBg.setInteractive({ useHandCursor: true });
    this.container.add(btnBg);

    const btnText = createText(this.scene, x, y, label, {
      fontSize: FONTS.SIZE_BUTTON,
      fontFamily: FONTS.FAMILY,
      color: s.text,
      fontStyle: 'bold',
    });
    btnText.setOrigin(0.5, 0.5);
    this.container.add(btnText);

    // Hover effects
    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(s.bgHover, 1);
      btnBg.setStrokeStyle(2, s.borderHover, 1);
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(s.bg, 0.95);
      btnBg.setStrokeStyle(2, s.border, 0.8);
    });
    btnBg.on('pointerdown', onClick);
  }

  show(): void {
    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: SIZES.ANIM_QUICK,
      ease: 'Quad.easeOut',
    });
  }

  hide(): void {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: SIZES.ANIM_QUICK,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.container.setVisible(false);
      },
    });
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  destroy(): void {
    this.container.destroy();
  }
}
