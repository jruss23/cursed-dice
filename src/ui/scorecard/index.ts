/**
 * Scorecard UI Components
 * Modular scorecard display components
 */

// Layout configuration (pure data, no Phaser)
export type {
  ScorecardLayoutMode,
  RowLayout,
  LayoutConfig,
  RowStyleConfig,
  RowDisplayState,
  BonusDisplayState,
  TotalDisplayState,
  RowColors,
} from './layout-config';

// Layout calculator (pure functions, no Phaser)
export {
  calculateLayout,
  determineLayoutMode,
  type LayoutInput,
} from './layout-calculator';

// State manager (pure TypeScript, no Phaser)
export {
  ScorecardStateManager,
  createScorecardStateManager,
} from './state-manager';
