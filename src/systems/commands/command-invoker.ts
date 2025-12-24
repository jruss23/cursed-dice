/**
 * Command Invoker
 * Manages command execution and undo/redo history
 *
 * Usage:
 *   const invoker = new CommandInvoker();
 *   invoker.execute(new ScoreCategoryCommand(...));
 *   invoker.undo(); // Reverts the last command
 *   invoker.redo(); // Re-executes the undone command
 */

import { createLogger } from '@/systems/logger';
import type { Command } from './types';

const log = createLogger('CommandInvoker');

// =============================================================================
// COMMAND INVOKER
// =============================================================================

export class CommandInvoker {
  private history: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 50) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Execute a command and add it to history
   * @returns true if command was executed successfully
   */
  execute<T extends Command>(command: T): boolean {
    if (!command.canExecute()) {
      log.debug(`Command "${command.name}" cannot execute`);
      return false;
    }

    command.execute();
    log.log(`Executed: ${command.name}`);

    // Add to history (only if command has undo)
    if (command.undo) {
      this.history.push(command);

      // Trim history if too large
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
      }

      // Clear redo stack on new command
      this.redoStack = [];
    }

    return true;
  }

  /**
   * Execute a command and return its result
   * For commands that implement CommandWithResult
   */
  executeWithResult<R>(command: { name: string; canExecute(): boolean; execute(): R; undo?(): void }): R | null {
    if (!command.canExecute()) {
      log.debug(`Command "${command.name}" cannot execute`);
      return null;
    }

    const result = command.execute();
    log.log(`Executed: ${command.name} -> ${result}`);

    // Store as Command for history (undo support)
    if (command.undo) {
      // Cast to Command since it has the same shape
      this.history.push(command as unknown as Command);
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
      }
      this.redoStack = [];
    }

    return result;
  }

  /**
   * Undo the last command
   * @returns true if undo was successful
   */
  undo(): boolean {
    const command = this.history.pop();
    if (!command) {
      log.debug('Nothing to undo');
      return false;
    }

    if (!command.undo) {
      log.warn(`Command "${command.name}" does not support undo`);
      return false;
    }

    command.undo();
    this.redoStack.push(command);
    log.log(`Undone: ${command.name}`);
    return true;
  }

  /**
   * Redo the last undone command
   * @returns true if redo was successful
   */
  redo(): boolean {
    const command = this.redoStack.pop();
    if (!command) {
      log.debug('Nothing to redo');
      return false;
    }

    command.execute();
    this.history.push(command);
    log.log(`Redone: ${command.name}`);
    return true;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.history.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get the number of commands in history
   */
  getHistorySize(): number {
    return this.history.length;
  }

  /**
   * Get names of commands in history (for debugging)
   */
  getHistoryNames(): string[] {
    return this.history.map(cmd => cmd.name);
  }

  /**
   * Clear all history
   */
  clear(): void {
    const count = this.history.length + this.redoStack.length;
    this.history = [];
    this.redoStack = [];
    log.log(`Cleared ${count} commands from history`);
  }

  /**
   * Destroy the invoker (clear history and reset)
   */
  destroy(): void {
    this.clear();
    log.log('CommandInvoker destroyed');
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createCommandInvoker(maxHistorySize?: number): CommandInvoker {
  return new CommandInvoker(maxHistorySize);
}
