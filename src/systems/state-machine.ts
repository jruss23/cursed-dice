/**
 * Game State Machine
 * Manages game flow states and transitions
 *
 * States:
 *   idle        - Waiting for game to start
 *   rolling     - Dice are being rolled (animation)
 *   selecting   - Player selecting dice to lock/unlock
 *   scoring     - Player selecting a category to score
 *   transitioning - Between turns, showing score animation
 *   blessing-choice - Choosing a blessing after mode completion
 *   mode-transition - Transitioning between modes
 *   paused      - Game is paused
 *   game-over   - Game ended (win or lose)
 *
 * Usage:
 *   const machine = new GameStateMachine();
 *   machine.onEnter('scoring', () => scorecardPanel.enable());
 *   machine.onExit('scoring', () => scorecardPanel.disable());
 *   machine.transition('rolling');
 */

import { createLogger } from './logger';

const log = createLogger('StateMachine');

// =============================================================================
// TYPES
// =============================================================================

export type GameState =
  | 'idle'
  | 'rolling'
  | 'selecting'
  | 'scoring'
  | 'transitioning'
  | 'blessing-choice'
  | 'mode-transition'
  | 'paused'
  | 'game-over';

export type StateCallback = () => void;

interface StateTransition {
  from: GameState | '*';
  to: GameState;
  guard?: () => boolean;
}

// =============================================================================
// STATE MACHINE
// =============================================================================

export class GameStateMachine {
  private currentState: GameState = 'idle';
  private previousState: GameState = 'idle';

  private enterCallbacks = new Map<GameState, StateCallback[]>();
  private exitCallbacks = new Map<GameState, StateCallback[]>();
  private transitions: StateTransition[] = [];

  constructor() {
    this.setupDefaultTransitions();
  }

  /**
   * Define default valid state transitions
   */
  private setupDefaultTransitions(): void {
    // From idle
    this.allow('idle', 'rolling');

    // From rolling
    this.allow('rolling', 'selecting');
    this.allow('rolling', 'scoring'); // If no rerolls left

    // From selecting (player choosing dice to lock)
    this.allow('selecting', 'rolling'); // Reroll
    this.allow('selecting', 'scoring'); // Score without rerolling
    this.allow('selecting', 'game-over'); // All categories filled (13th scored)
    this.allow('selecting', 'mode-transition'); // Return to menu

    // From scoring
    this.allow('scoring', 'transitioning');
    this.allow('scoring', 'game-over'); // Time ran out or all categories filled

    // Direct game-over from rolling (timer runs out during roll)
    this.allow('rolling', 'game-over');
    this.allow('rolling', 'mode-transition'); // Return to menu during roll

    // From transitioning
    this.allow('transitioning', 'rolling'); // Next turn
    this.allow('transitioning', 'blessing-choice'); // Mode complete
    this.allow('transitioning', 'game-over'); // Game complete

    // From blessing choice
    this.allow('blessing-choice', 'mode-transition');

    // From mode transition
    this.allow('mode-transition', 'rolling');
    this.allow('mode-transition', 'game-over'); // All modes complete

    // Pause can happen during active gameplay (timer running)
    this.allow('rolling', 'paused');
    this.allow('selecting', 'paused');
    this.allow('scoring', 'paused');
    // Note: transitioning, blessing-choice, mode-transition don't allow pause (no timer)

    // Resume goes back to previous state (handled specially)
    this.allow('paused', 'rolling');
    this.allow('paused', 'selecting');
    this.allow('paused', 'scoring');
    this.allow('paused', 'transitioning');
    this.allow('paused', 'mode-transition'); // Quit from pause menu

    // Game over can transition to next mode (after blessing choice) or restart
    this.allow('game-over', 'idle'); // Restart
    this.allow('game-over', 'mode-transition'); // Continue to next mode after blessing
  }

  /**
   * Allow a specific transition
   */
  allow(from: GameState | '*', to: GameState, guard?: () => boolean): void {
    this.transitions.push({ from, to, guard });
  }

  /**
   * Check if transition is allowed
   */
  can(to: GameState): boolean {
    const validTransition = this.transitions.find((t) => {
      const fromMatch = t.from === '*' || t.from === this.currentState;
      const toMatch = t.to === to;
      const guardPass = !t.guard || t.guard();
      return fromMatch && toMatch && guardPass;
    });
    return !!validTransition;
  }

  /**
   * Transition to a new state
   * @returns true if transition succeeded
   */
  transition(to: GameState): boolean {
    if (!this.can(to)) {
      log.warn(`Invalid transition: ${this.currentState} -> ${to}`);
      return false;
    }

    const from = this.currentState;
    log.log(`Transition: ${from} -> ${to}`);

    // Store previous state (for pause/resume)
    this.previousState = from;

    // Exit callbacks
    const exitCbs = this.exitCallbacks.get(from) || [];
    exitCbs.forEach((cb) => cb());

    // Update state
    this.currentState = to;

    // Enter callbacks
    const enterCbs = this.enterCallbacks.get(to) || [];
    enterCbs.forEach((cb) => cb());

    return true;
  }

  /**
   * Force transition (bypasses guards) - use sparingly
   */
  forceTransition(to: GameState): void {
    const from = this.currentState;
    log.warn(`Force transition: ${from} -> ${to}`);

    this.previousState = from;

    const exitCbs = this.exitCallbacks.get(from) || [];
    exitCbs.forEach((cb) => cb());

    this.currentState = to;

    const enterCbs = this.enterCallbacks.get(to) || [];
    enterCbs.forEach((cb) => cb());
  }

  /**
   * Register callback for entering a state
   */
  onEnter(state: GameState, callback: StateCallback): void {
    if (!this.enterCallbacks.has(state)) {
      this.enterCallbacks.set(state, []);
    }
    this.enterCallbacks.get(state)!.push(callback);
  }

  /**
   * Register callback for exiting a state
   */
  onExit(state: GameState, callback: StateCallback): void {
    if (!this.exitCallbacks.has(state)) {
      this.exitCallbacks.set(state, []);
    }
    this.exitCallbacks.get(state)!.push(callback);
  }

  /**
   * Get current state
   */
  getState(): GameState {
    return this.currentState;
  }

  /**
   * Get previous state (useful for resume from pause)
   */
  getPreviousState(): GameState {
    return this.previousState;
  }

  /**
   * Check if in a specific state
   */
  is(state: GameState): boolean {
    return this.currentState === state;
  }

  /**
   * Check if in any of the given states
   */
  isAny(...states: GameState[]): boolean {
    return states.includes(this.currentState);
  }

  /**
   * Check if game is in a playable state (not paused, game over, or transitioning)
   */
  isPlayable(): boolean {
    return this.isAny('rolling', 'selecting', 'scoring');
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.currentState = 'idle';
    this.previousState = 'idle';
    log.log('State machine reset');
  }

  /**
   * Clear all callbacks (for cleanup)
   */
  clearCallbacks(): void {
    this.enterCallbacks.clear();
    this.exitCallbacks.clear();
  }

  /**
   * Destroy the state machine (clear callbacks and reset state)
   */
  destroy(): void {
    this.clearCallbacks();
    this.transitions = [];
    this.currentState = 'idle';
    this.previousState = 'idle';
    log.log('State machine destroyed');
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createGameStateMachine(): GameStateMachine {
  return new GameStateMachine();
}
