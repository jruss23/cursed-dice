/**
 * Dice Commands
 * Commands for dice-related actions
 */

import type { Command } from './types';
import type { DiceManager } from '@/systems/dice-manager';
import type { GameEventEmitter } from '@/systems/game-events';

// =============================================================================
// ROLL DICE COMMAND
// =============================================================================

export interface RollDiceCommandDeps {
  diceManager: DiceManager;
  events: GameEventEmitter;
  isInitialRoll: boolean;
}

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
}

// =============================================================================
// TOGGLE DICE LOCK COMMAND
// Note: This command is for future use when DiceManager exposes public lock methods
// =============================================================================

export interface ToggleDiceLockCommandDeps {
  diceManager: DiceManager;
  events: GameEventEmitter;
  diceIndex: number;
}

/**
 * Command to toggle dice lock state
 * Currently a placeholder - lock toggling is handled internally by DiceManager
 */
export class ToggleDiceLockCommand implements Command {
  readonly name = 'ToggleDiceLock';
  private readonly diceIndex: number;

  constructor(deps: ToggleDiceLockCommandDeps) {
    this.diceIndex = deps.diceIndex;
  }

  canExecute(): boolean {
    // DiceManager handles lock validation internally
    return true;
  }

  execute(): void {
    // Lock toggling is currently handled by DiceManager's internal click handlers
    // This command exists for future refactoring where we want explicit command control
    console.warn(`ToggleDiceLockCommand: Use DiceManager click handlers for dice ${this.diceIndex}`);
  }

  undo(): void {
    // Would toggle again to undo
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createRollDiceCommand(
  diceManager: DiceManager,
  events: GameEventEmitter,
  isInitialRoll: boolean
): RollDiceCommand {
  return new RollDiceCommand({ diceManager, events, isInitialRoll });
}

export function createToggleDiceLockCommand(
  diceManager: DiceManager,
  events: GameEventEmitter,
  diceIndex: number
): ToggleDiceLockCommand {
  return new ToggleDiceLockCommand({ diceManager, events, diceIndex });
}
