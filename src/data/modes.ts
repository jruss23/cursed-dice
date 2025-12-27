/**
 * Game Modes (Seals) Configuration
 * Data-driven mode definitions - each seal guards the curse
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
    subtitle: 'Seal 1 of 4',
    description: 'Standard rules - fill all 13 categories before time runs out.',
    mechanic: 'standard',
    icon: '🌙',
  },
  {
    id: 1,
    name: 'SHACKLED DIE',
    subtitle: 'Seal 2 of 4',
    description: 'Each turn, your highest die is cursed and cannot be rerolled.',
    mechanic: 'cursed-die',
    icon: '⛓️',
  },
  {
    id: 2,
    name: 'SEALED PATHS',
    subtitle: 'Seal 3 of 4',
    description: '3 categories locked at random. After you score, 3 new ones lock.',
    mechanic: 'sealed-paths',
    icon: '🔒',
    lockedCategoriesCount: 3,
  },
  {
    id: 3,
    name: 'THE GAUNTLET',
    subtitle: 'Seal 4 of 4',
    description: 'Only 3 random categories available. They shuffle after each score.',
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
