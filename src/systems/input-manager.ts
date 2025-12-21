/**
 * Input Manager
 * Centralizes keyboard input handling for a scene.
 * Provides clean registration/cleanup and future keybinding support.
 */

import Phaser from 'phaser';
import { createLogger } from './logger';

const log = createLogger('InputManager');

/** Standard game actions that can be bound to keys */
export type GameAction =
  | 'roll'        // Roll/reroll dice
  | 'pause'       // Toggle pause menu
  | 'debugTime'   // Debug: skip time
  | 'debugStage'; // Debug: skip stage

/** Default key bindings */
const DEFAULT_BINDINGS: Record<GameAction, string> = {
  roll: 'SPACE',
  pause: 'ESC',
  debugTime: 'D',
  debugStage: 'S',
};

type ActionCallback = () => void;

interface BoundAction {
  action: GameAction;
  key: string;
  callback: ActionCallback;
  eventName: string;
}

/**
 * Input Manager - handles keyboard input for a scene
 *
 * Usage:
 *   const input = new InputManager(scene);
 *   input.bind('roll', () => this.rollDice());
 *   input.bind('pause', () => this.togglePause());
 *   // On cleanup:
 *   input.destroy();
 */
export class InputManager {
  private scene: Phaser.Scene;
  private bindings: Map<GameAction, BoundAction> = new Map();
  private enabled: boolean = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    log.log('InputManager created for scene');
  }

  /**
   * Bind an action to its default key
   * @param action - The game action to bind
   * @param callback - Function to call when key is pressed
   */
  bind(action: GameAction, callback: ActionCallback): void {
    // Unbind if already bound
    if (this.bindings.has(action)) {
      this.unbind(action);
    }

    const key = DEFAULT_BINDINGS[action];
    const eventName = `keydown-${key}`;

    const wrappedCallback = () => {
      if (this.enabled) {
        callback();
      }
    };

    this.scene.input.keyboard?.on(eventName, wrappedCallback);

    this.bindings.set(action, {
      action,
      key,
      callback: wrappedCallback,
      eventName,
    });

    log.debug(`Bound action "${action}" to key "${key}"`);
  }

  /**
   * Unbind a specific action
   */
  unbind(action: GameAction): void {
    const bound = this.bindings.get(action);
    if (bound) {
      this.scene.input.keyboard?.off(bound.eventName, bound.callback);
      this.bindings.delete(action);
      log.debug(`Unbound action "${action}"`);
    }
  }

  /**
   * Enable all input handling
   */
  enable(): void {
    this.enabled = true;
    log.debug('Input enabled');
  }

  /**
   * Disable all input handling (actions won't fire)
   */
  disable(): void {
    this.enabled = false;
    log.debug('Input disabled');
  }

  /**
   * Check if input is currently enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get the key bound to an action
   */
  getKeyForAction(action: GameAction): string {
    return DEFAULT_BINDINGS[action];
  }

  /**
   * Get display string for a key (e.g., "SPACE" -> "Space")
   */
  getKeyDisplayName(action: GameAction): string {
    const key = DEFAULT_BINDINGS[action];
    switch (key) {
      case 'SPACE': return 'Space';
      case 'ESC': return 'Esc';
      default: return key;
    }
  }

  /**
   * Clean up all bindings - call on scene shutdown
   */
  destroy(): void {
    const actionCount = this.bindings.size;

    for (const [action] of this.bindings) {
      this.unbind(action);
    }

    this.bindings.clear();
    log.log(`InputManager destroyed (${actionCount} bindings removed)`);
  }
}
