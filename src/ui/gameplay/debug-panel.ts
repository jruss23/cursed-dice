/**
 * Debug Panel
 * Shows debug controls when DEV.DEBUG_MODE is enabled
 */

import Phaser from 'phaser';
import { FONTS, PALETTE, COLORS } from '@/config';
import { createText } from '@/ui/ui-utils';

// Debug-specific colors (intentionally bright for visibility)
const DEBUG_COLORS = {
  panelBg: PALETTE.gold[900],
  panelBorder: PALETTE.gold[500],
  skipTimeBg: PALETTE.gold[800],
  skipTimeBorder: PALETTE.gold[400],
  skipTimeBgHover: PALETTE.gold[700],
  skipTimeBorderHover: PALETTE.gold[300],
  skipStageBg: 0x002233,  // Cyan doesn't exist in PALETTE
  skipStageBorder: 0x00ccff,
  skipStageBgHover: 0x003355,
  skipStageBorderHover: 0x66eeff,
  clearDataBg: 0x331111,
  clearDataBorder: 0xcc4444,
  clearDataBgHover: 0x552222,
  clearDataBorderHover: 0xff6666,
} as const;

export interface DebugPanelCallbacks {
  onSkipTime: () => void;
  onSkipStage: () => void;
  onClearData?: () => void;
}

export class DebugPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private callbacks: DebugPanelCallbacks;

  constructor(scene: Phaser.Scene, height: number, callbacks: DebugPanelCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.container = this.scene.add.container(0, 0);

    this.build(height);
    // Note: Keyboard shortcuts (D, S) are handled by InputManager in GameplayScene
  }

  private build(height: number): void {
    const panelWidth = 130;
    const panelHeight = 160;
    const panelX = 15;
    const panelY = (height - panelHeight) / 2;

    this.container.setPosition(panelX, panelY);

    // Panel background - bright orange border for visibility
    const panelBg = this.scene.add.rectangle(panelWidth / 2, panelHeight / 2, panelWidth, panelHeight, DEBUG_COLORS.panelBg, 0.95);
    panelBg.setStrokeStyle(3, DEBUG_COLORS.panelBorder, 0.9);
    this.container.add(panelBg);

    let yPos = 18;
    const debugLabel = createText(this.scene, panelWidth / 2, yPos, '⚡ DEBUG', {
      fontSize: '14px',
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
      fontSize: '14px',
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
      fontSize: '14px',
      fontFamily: FONTS.FAMILY,
      color: '#44ddff',
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
        fontSize: '12px',
        fontFamily: FONTS.FAMILY,
        color: '#ff6666',
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
    }
  }

  destroy(): void {
    // Note: Keyboard shortcuts cleanup is handled by InputManager
    this.container.destroy();
  }
}
