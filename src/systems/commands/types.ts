/**
 * Command Pattern Types
 * Base interfaces for game commands
 */

/**
 * Base command interface
 * All game actions implement this
 */
export interface Command {
  /** Execute the command */
  execute(): void;

  /** Check if command can be executed */
  canExecute(): boolean;

  /** Undo the command (optional - not all commands are undoable) */
  undo?(): void;

  /** Command name for debugging/logging */
  readonly name: string;
}

/**
 * Command with result
 * For commands that return a value
 */
export interface CommandWithResult<T> extends Command {
  execute(): T;
}

/**
 * Async command
 * For commands that are asynchronous
 */
export interface AsyncCommand extends Command {
  execute(): Promise<void>;
}
