/**
 * Configuration - Central Re-export
 * This file re-exports from modular config files for backwards compatibility
 *
 * Import from '@/config' and everything works as before.
 * The actual definitions are now in:
 *   - src/config/dev.ts
 *   - src/config/theme.ts
 *   - src/config/sizes.ts
 *   - src/config/game-rules.ts
 */

// Development flags
export { DEV } from './config/dev';

// Theme (colors, typography, flash effects, alpha, scale, panel styling)
export { PALETTE, COLORS, FONTS, FLASH, ALPHA, SCALE, PANEL } from './config/theme';

// Sizes and timing
export { CANVAS, SIZES, TIMING, DEPTH, CELEBRATION, LAYOUT, END_SCREEN } from './config/sizes';

// Game rules
export { GAME_RULES, SCORING } from './config/game-rules';

// Responsive utilities
export {
  RESPONSIVE,
  BREAKPOINTS,
  getViewportMetrics,
  getScaledSizes,
  getScorecardLayout,
  getScaledFontSizes,
  getPortraitLayout,
  getGameplayLayout,
  scaleValue,
  type ViewportMetrics,
  type ScaledSizes,
  type ScorecardLayout,
  type PortraitLayout,
  type GameplayLayout,
} from './systems/responsive';

// Data re-exports for convenience
export { DIFFICULTIES, DIFFICULTY_LIST, type Difficulty, type DifficultyConfig } from './data/difficulties';
