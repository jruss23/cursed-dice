/**
 * Configuration Module
 * Central re-export for all configuration
 */

// Development flags
export { DEV } from './dev';

// Theme (colors, fonts, flash effects)
export { PALETTE, COLORS, FONTS, FLASH } from './theme';

// Sizes and timing
export { CANVAS, SIZES, TIMING, ANIM } from './sizes';

// Game rules
export { GAME_RULES, SCORING } from './game-rules';

// Responsive utilities (from systems)
export {
  RESPONSIVE,
  BREAKPOINTS,
  getViewportMetrics,
  getScaledSizes,
  getScorecardLayout,
  getScaledFontSizes,
  getPortraitLayout,
  scaleValue,
  type ViewportMetrics,
  type ScaledSizes,
  type ScorecardLayout,
  type PortraitLayout,
} from '@/systems/responsive';
