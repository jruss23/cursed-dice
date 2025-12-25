/**
 * Service Registry
 * Centralized dependency management for cross-cutting concerns
 *
 * Usage:
 *   // Initialize global services once at app startup
 *   initializeGlobalServices();
 *
 *   // Retrieval (anywhere) - type-safe helpers
 *   const save = getSave();
 *   const progression = getProgression();
 *
 *   // Or generic access
 *   const music = Services.get<MusicManager>('music');
 *
 *   // Testing
 *   Services.reset();
 *   Services.register('save', mockSaveManager);
 */

import { createLogger } from './logger';
import { getSaveManager, type SaveManagerClass } from './save-manager';
import { getGameProgression, type GameProgressionManager } from './game-progression';
import type { GameStateMachine } from './state-machine';
import type { GameEventEmitter } from './game-events';
import type { Scorecard } from './scorecard';
import type { MusicManager } from './music-manager';

const log = createLogger('Services');

// =============================================================================
// SERVICE KEYS (type-safe service identifiers)
// =============================================================================

export type ServiceKey =
  | 'music'
  | 'save'
  | 'progression'
  | 'blessings'
  | 'input'
  | 'scorecard'
  | 'events'
  | 'stateMachine'
  | 'diceManager';

// =============================================================================
// SERVICE REGISTRY
// =============================================================================

class ServiceRegistry {
  private services = new Map<ServiceKey, unknown>();
  private initialized = false;

  /**
   * Register a service
   * @throws if service already registered (prevents accidental overwrite)
   */
  register<T>(key: ServiceKey, service: T): void {
    if (this.services.has(key)) {
      log.warn(`Service "${key}" already registered, overwriting`);
    }
    this.services.set(key, service);
    log.log(`Registered service: ${key}`);
  }

  /**
   * Get a registered service
   * @throws if service not found
   */
  get<T>(key: ServiceKey): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service "${key}" not registered. Did you forget to initialize it?`);
    }
    return service as T;
  }

  /**
   * Check if a service is registered
   */
  has(key: ServiceKey): boolean {
    return this.services.has(key);
  }

  /**
   * Get a service if it exists, otherwise return undefined
   */
  tryGet<T>(key: ServiceKey): T | undefined {
    return this.services.get(key) as T | undefined;
  }

  /**
   * Remove a specific service
   */
  unregister(key: ServiceKey): void {
    if (this.services.has(key)) {
      this.services.delete(key);
      log.log(`Unregistered service: ${key}`);
    }
  }

  /**
   * Clear all registered services
   * Useful for testing and cleanup
   */
  reset(): void {
    const count = this.services.size;
    this.services.clear();
    this.initialized = false;
    log.log(`Reset service registry (${count} services cleared)`);
  }

  /**
   * Mark as initialized (prevents re-initialization)
   */
  markInitialized(): void {
    this.initialized = true;
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get list of registered service keys (for debugging)
   */
  getRegisteredKeys(): ServiceKey[] {
    return Array.from(this.services.keys());
  }
}

// Singleton instance
export const Services = new ServiceRegistry();

// =============================================================================
// TYPE-SAFE SERVICE GETTERS
// =============================================================================

/**
 * Get the SaveManager service
 * @throws if not registered
 */
export function getSave(): SaveManagerClass {
  return Services.get<SaveManagerClass>('save');
}

/**
 * Get the GameProgression service
 * @throws if not registered
 */
export function getProgression(): GameProgressionManager {
  return Services.get<GameProgressionManager>('progression');
}

/**
 * Get the MusicManager service (if registered)
 */
export function getMusic(): MusicManager | undefined {
  return Services.tryGet<MusicManager>('music');
}

/**
 * Get the GameEventEmitter service
 * @throws if not registered
 */
export function getEvents(): GameEventEmitter {
  return Services.get<GameEventEmitter>('events');
}

/**
 * Get the GameStateMachine service
 * @throws if not registered
 */
export function getStateMachine(): GameStateMachine {
  return Services.get<GameStateMachine>('stateMachine');
}

/**
 * Get the Scorecard service
 * @throws if not registered
 */
export function getScorecard(): Scorecard {
  return Services.get<Scorecard>('scorecard');
}


// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize global services (save, progression)
 * Call this once at app startup before any scenes load
 */
export function initializeGlobalServices(): void {
  if (Services.isInitialized()) {
    log.warn('Services already initialized');
    return;
  }

  Services.register('save', getSaveManager());
  Services.register('progression', getGameProgression());
  Services.markInitialized();

  log.log('Global services initialized');
}
