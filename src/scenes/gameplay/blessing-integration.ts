/**
 * Blessing Integration
 * Handles setup and coordination of blessing UI components
 * Extracted from GameplayScene for better separation of concerns
 */

import Phaser from 'phaser';
import { SixthBlessingButton } from '@/ui/gameplay/sixth-blessing-button';
import { ForesightBlessingButton } from '@/ui/gameplay/foresight-blessing-button';
import { ForesightPreviewPanel } from '@/ui/gameplay/foresight-preview-panel';
import { SanctuaryBlessingButton } from '@/ui/gameplay/sanctuary-blessing-button';
import { SixthBlessing } from '@/systems/blessings/blessing-sixth';
import { ForesightBlessing } from '@/systems/blessings/blessing-foresight';
import { SanctuaryBlessing } from '@/systems/blessings/blessing-sanctuary';
import type { BlessingManager } from '@/systems/blessings';
import type { GameEventEmitter } from '@/systems/game-events';
import type { DiceManager } from '@/systems/dice-manager';
import { createLogger } from '@/systems/logger';

const log = createLogger('BlessingIntegration');

export interface BlessingIntegrationConfig {
  scene: Phaser.Scene;
  events: GameEventEmitter;
  blessingManager: BlessingManager;
  diceManager: DiceManager;
  gameWidth: number;
  diceY: number;
  diceSize: number;
  diceSpacing: number;
}

/**
 * Manages blessing UI components and their callbacks
 */
export class BlessingIntegration {
  private scene: Phaser.Scene;
  private events: GameEventEmitter;
  private blessingManager: BlessingManager;
  private diceManager: DiceManager;

  // UI Components
  private sixthBlessingButton: SixthBlessingButton | null = null;
  private foresightBlessingButton: ForesightBlessingButton | null = null;
  private foresightPreviewPanel: ForesightPreviewPanel | null = null;
  private sanctuaryBlessingButton: SanctuaryBlessingButton | null = null;

  constructor(config: BlessingIntegrationConfig) {
    this.scene = config.scene;
    this.events = config.events;
    this.blessingManager = config.blessingManager;
    this.diceManager = config.diceManager;

    this.setup(config);
  }

  private setup(config: BlessingIntegrationConfig): void {
    const activeBlessing = this.blessingManager.getActiveBlessing();
    if (!activeBlessing) return;

    const blessingId = this.blessingManager.getChosenBlessingId();

    if (blessingId === 'sixth') {
      this.setupSixthBlessing();
    } else if (blessingId === 'foresight') {
      this.setupForesightBlessing(config);
    } else if (blessingId === 'sanctuary') {
      this.setupSanctuaryBlessing();
    }
  }

  private setupSixthBlessing(): void {
    const blessing = this.blessingManager.getActiveBlessing() as SixthBlessing | null;
    if (!blessing) return;

    log.log('Setting up Sixth Blessing integration');

    const pos = this.diceManager.getBlessingButtonPosition();
    if (!pos) {
      log.warn('Could not get blessing button position');
      return;
    }

    this.sixthBlessingButton = new SixthBlessingButton(
      this.scene,
      this.events,
      {
        x: pos.x,
        y: pos.y,
        height: pos.height,
        onActivate: () => {
          const success = blessing.activate();
          if (success) {
            this.diceManager.activateSixthDie();
          }
          return success;
        },
        getCharges: () => blessing.getChargesRemaining(),
        isActive: () => blessing.isActive(),
      }
    );
  }

  private setupForesightBlessing(config: BlessingIntegrationConfig): void {
    const blessing = this.blessingManager.getActiveBlessing() as ForesightBlessing | null;
    if (!blessing) return;

    log.log('Setting up Foresight Blessing integration');

    const centerX = config.gameWidth / 2;

    // Create preview panel
    this.foresightPreviewPanel = new ForesightPreviewPanel(this.scene, {
      centerX,
      centerY: config.diceY,
      diceSize: config.diceSize,
      diceSpacing: config.diceSpacing,
      onAccept: () => this.handleForesightAccept(blessing),
      onReject: () => this.handleForesightReject(blessing),
    });

    // Create button
    const pos = this.diceManager.getBlessingButtonPosition();
    if (!pos) {
      log.warn('Could not get blessing button position');
      return;
    }

    this.foresightBlessingButton = new ForesightBlessingButton(
      this.scene,
      this.events,
      {
        x: pos.x,
        y: pos.y,
        height: pos.height,
        onActivate: () => this.handleForesightActivate(blessing),
        getCharges: () => blessing.getChargesRemaining(),
        isPreviewActive: () => blessing.isPreviewActive(),
        canActivate: () => this.diceManager.getRerollsLeft() > 0,
      }
    );
  }

  private handleForesightActivate(blessing: ForesightBlessing): boolean {
    if (this.diceManager.getRerollsLeft() <= 0) {
      log.log('Cannot activate Foresight - no rerolls left');
      return false;
    }

    const diceState = this.diceManager.getState();
    const lockedDice = diceState.locked.slice(0, 5);

    const previewValues = blessing.activate(lockedDice);
    if (!previewValues) {
      return false;
    }

    // Fill in locked dice values
    for (let i = 0; i < 5; i++) {
      if (lockedDice[i]) {
        previewValues[i] = diceState.values[i];
      }
    }

    this.foresightPreviewPanel?.show(previewValues, lockedDice);
    this.diceManager.setEnabled(false);

    return true;
  }

  private handleForesightAccept(blessing: ForesightBlessing): void {
    const values = blessing.acceptPreview();
    if (!values) return;

    this.foresightPreviewPanel?.hide();

    const diceState = this.diceManager.getState();

    // Fill in locked values
    for (let i = 0; i < 5; i++) {
      if (diceState.locked[i]) {
        values[i] = diceState.values[i];
      }
    }

    // Apply values via forced roll
    this.diceManager.setForcedRollValues(values);
    this.diceManager.setEnabled(true);
    this.diceManager.roll(false);
  }

  private handleForesightReject(blessing: ForesightBlessing): void {
    blessing.rejectPreview();
    this.foresightPreviewPanel?.hide();
    this.diceManager.setEnabled(true);
  }

  private setupSanctuaryBlessing(): void {
    const blessing = this.blessingManager.getActiveBlessing() as SanctuaryBlessing | null;
    if (!blessing) return;

    log.log('Setting up Sanctuary Blessing integration');

    const pos = this.diceManager.getBlessingButtonPosition();
    if (!pos) {
      log.warn('Could not get blessing button position');
      return;
    }

    this.sanctuaryBlessingButton = new SanctuaryBlessingButton(
      this.scene,
      this.events,
      {
        x: pos.x,
        y: pos.y,
        height: pos.height,
        onBank: () => this.handleSanctuaryBank(blessing),
        onRestore: () => this.handleSanctuaryRestore(blessing),
        canBank: () => blessing.canBankDice(),
        canRestore: () => blessing.canRestoreDice(),
        getBankedValues: () => blessing.getBankedValues(),
      }
    );
  }

  private handleSanctuaryBank(blessing: SanctuaryBlessing): boolean {
    const diceState = this.diceManager.getState();
    // Only bank the first 5 dice (ignore 6th die if active)
    const values = diceState.values.slice(0, 5);
    const locked = diceState.locked.slice(0, 5);

    const success = blessing.bank(values, locked);
    if (success) {
      log.log('Dice banked:', values);
    }
    return success;
  }

  private handleSanctuaryRestore(blessing: SanctuaryBlessing): boolean {
    const bankedState = blessing.restore();
    if (!bankedState) return false;

    // Apply the banked values and locked states
    this.diceManager.restoreFromSanctuary(bankedState.values, bankedState.locked);
    log.log('Dice restored:', bankedState.values);
    return true;
  }

  destroy(): void {
    if (this.sixthBlessingButton) {
      this.sixthBlessingButton.destroy();
      this.sixthBlessingButton = null;
    }

    if (this.foresightBlessingButton) {
      this.foresightBlessingButton.destroy();
      this.foresightBlessingButton = null;
    }

    if (this.foresightPreviewPanel) {
      this.foresightPreviewPanel.destroy();
      this.foresightPreviewPanel = null;
    }

    if (this.sanctuaryBlessingButton) {
      this.sanctuaryBlessingButton.destroy();
      this.sanctuaryBlessingButton = null;
    }
  }
}
