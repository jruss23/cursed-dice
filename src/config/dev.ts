/**
 * Development Flags
 * Controls debug features, logging, and error verbosity
 */

export const DEV = {
  /**
   * Automatically true in development, false in production builds.
   * Controls: debug panel visibility, console logging, error verbosity
   */
  IS_DEVELOPMENT: import.meta.env.DEV,
} as const;
