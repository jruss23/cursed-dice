/**
 * Blessing Integration
 * Handles setup and coordination of blessing UI components
 * Extracted from GameplayScene for better separation of concerns
 */

import Phaser from 'phaser';
import { SixthBlessingButton } from '@/ui/gameplay/sixth-blessing-button';
import { MercyBlessingButton } from '@/ui/gameplay/mercy-blessing-button';
import { SanctuaryBlessingButton } from '@/ui/gameplay/sanctuary-blessing-button';
import { SixthBlessing } from '@/systems/blessings/blessing-sixth';
import { MercyBlessing } from '@/systems/blessings/blessing-mercy';
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
  private mercyBlessingButton: MercyBlessingButton | null = null;
  private sanctuaryBlessingButton: SanctuaryBlessingButton | null = null;

  constructor(config: BlessingIntegrationConfig) {
    this.scene = config.scene;
    this.events = config.events;
    this.blessingManager = config.blessingManager;
    this.diceManager = config.diceManager;

    this.setup(config);
  }

  private setup(_config: BlessingIntegrationConfig): void {
    const activeBlessing = this.blessingManager.getActiveBlessing();
    if (!activeBlessing) return;

    const blessingId = this.blessingManager.getChosenBlessingId();

    if (blessingId === 'sixth') {
      this.setupSixthBlessing();
    } else if (blessingId === 'mercy') {
      this.setupMercyBlessing();
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

  private setupMercyBlessing(): void {
    const blessing = this.blessingManager.getActiveBlessing() as MercyBlessing | null;
    if (!blessing) return;

    log.log('Setting up Mercy Blessing integration');

    const pos = this.diceManager.getBlessingButtonPosition();
    if (!pos) {
      log.warn('Could not get blessing button position');
      return;
    }

    this.mercyBlessingButton = new MercyBlessingButton(
      this.scene,
      this.events,
      {
        x: pos.x,
        y: pos.y,
        height: pos.height,
        onUse: () => this.handleMercyUse(blessing),
        canUse: () => blessing.canUse(),
      }
    );
  }

  private handleMercyUse(blessing: MercyBlessing): boolean {
    const success = blessing.use();
    if (!success) return false;

    log.log('Mercy used - resetting hand');

    // Reset the dice completely: new random dice + full rerolls
    this.diceManager.resetHand();

    return true;
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

    if (this.mercyBlessingButton) {
      this.mercyBlessingButton.destroy();
      this.mercyBlessingButton = null;
    }

    if (this.sanctuaryBlessingButton) {
      this.sanctuaryBlessingButton.destroy();
      this.sanctuaryBlessingButton = null;
    }
  }
}
