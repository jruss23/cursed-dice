/**
 * Dice Commands
 * Commands for dice-related actions (supports undo)
 */

import type { Command } from './types';
import type { DiceManager } from '@/systems/dice-manager';

// =============================================================================
// ROLL DICE COMMAND
// =============================================================================

export interface RollDiceCommandDeps {
  diceManager: DiceManager;
  isInitialRoll: boolean;
}

/**
 * Command to roll dice
 * Note: Undo is not supported for rolls (RNG cannot be reversed)
 */
export class RollDiceCommand implements Command {
  readonly name = 'RollDice';

  constructor(private deps: RollDiceCommandDeps) {}

  canExecute(): boolean {
    const { diceManager, isInitialRoll } = this.deps;

    // Initial roll always allowed
    if (isInitialRoll) return true;

    // Must have rerolls remaining
    return diceManager.getRerollsLeft() > 0;
  }

  execute(): void {
    if (!this.canExecute()) return;

    const { diceManager, isInitialRoll } = this.deps;
    diceManager.roll(isInitialRoll);
  }

  // Note: Undo for rolls is not practical - RNG cannot be reversed
}

// =============================================================================
// TOGGLE DICE LOCK COMMAND
// =============================================================================

export interface ToggleDiceLockCommandDeps {
  diceManager: DiceManager;
  diceIndex: number;
}

/**
 * Command to toggle dice lock state
 * Supports undo (just toggles again)
 */
export class ToggleDiceLockCommand implements Command {
  readonly name = 'ToggleDiceLock';
  private wasLocked: boolean = false;

  constructor(private deps: ToggleDiceLockCommandDeps) {}

  canExecute(): boolean {
    const { diceManager, diceIndex } = this.deps;
    return diceManager.canToggleLock(diceIndex);
  }

  execute(): void {
    if (!this.canExecute()) return;

    const { diceManager, diceIndex } = this.deps;

    // Store previous state for undo
    this.wasLocked = diceManager.getState().locked[diceIndex];

    // Toggle the lock
    diceManager.toggleDiceLock(diceIndex);
  }

  undo(): void {
    const { diceManager, diceIndex } = this.deps;
    // Toggle back to previous state
    const currentlyLocked = diceManager.getState().locked[diceIndex];
    if (currentlyLocked !== this.wasLocked) {
      diceManager.toggleDiceLock(diceIndex);
    }
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createRollDiceCommand(
  diceManager: DiceManager,
  isInitialRoll: boolean
): RollDiceCommand {
  return new RollDiceCommand({ diceManager, isInitialRoll });
}

export function createToggleDiceLockCommand(
  diceManager: DiceManager,
  diceIndex: number
): ToggleDiceLockCommand {
  return new ToggleDiceLockCommand({ diceManager, diceIndex });
}
