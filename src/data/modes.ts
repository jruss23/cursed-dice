/**
 * Game Modes (Curses) Configuration
 * Data-driven mode definitions
 */

export type ModeId = 0 | 1 | 2 | 3;

export interface ModeConfig {
  id: ModeId;
  name: string;
  subtitle: string;
  description: string;
  mechanic: 'standard' | 'cursed-die' | 'sealed-paths' | 'gauntlet';
  icon: string;
  /** Number of categories locked at start (Mode 3) */
  lockedCategoriesCount?: number;
  /** Number of available categories at a time (Mode 4) */
  availableCategoriesCount?: number;
}

export const MODES: readonly ModeConfig[] = [
  {
    id: 0,
    name: 'THE AWAKENING',
    subtitle: 'Curse 1 of 4',
    description: 'Standard dice game - fill all 13 categories in any order before time runs out.',
    mechanic: 'standard',
    icon: '🌙',
  },
  {
    id: 1,
    name: 'SHACKLED DIE',
    subtitle: 'Curse 2 of 4',
    description: 'Your highest value die becomes cursed after each score. Cursed dice are locked and cannot be rerolled.',
    mechanic: 'cursed-die',
    icon: '⛓️',
  },
  {
    id: 2,
    name: 'SEALED PATHS',
    subtitle: 'Curse 3 of 4',
    description: '3 random categories are locked and unavailable. After scoring, 3 new random categories become locked.',
    mechanic: 'sealed-paths',
    icon: '🔒',
    lockedCategoriesCount: 3,
  },
  {
    id: 3,
    name: 'THE GAUNTLET',
    subtitle: 'Curse 4 of 4',
    description: 'Only 3 categories are available at a time. Score what you can with what you get!',
    mechanic: 'gauntlet',
    icon: '⚔️',
    availableCategoriesCount: 3,
  },
] as const;

export function getModeConfig(modeId: ModeId): ModeConfig {
  return MODES[modeId];
}

export function getModeName(modeId: ModeId): string {
  return MODES[modeId].name;
}

export function getModeIcon(modeId: ModeId): string {
  return MODES[modeId].icon;
}
