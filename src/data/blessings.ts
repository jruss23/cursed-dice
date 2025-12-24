/**
 * Blessings Configuration
 * Data-driven blessing definitions
 */

export type BlessingId = 'abundance' | 'mercy' | 'sanctuary' | 'sixth';

export interface BlessingConfig {
  id: BlessingId;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  benefits: string[];
  bestFor: string;
  /** Number of uses (null = passive/unlimited) */
  charges: number | null;
  /** Is this blessing implemented? */
  implemented: boolean;
}

export const BLESSINGS: Record<BlessingId, BlessingConfig> = {
  abundance: {
    id: 'abundance',
    name: 'Blessing of Abundance',
    subtitle: 'More Options',
    description: 'Unlocks 4 bonus categories (Two Pair, All Odd, All Even, All High)',
    icon: '✨',
    benefits: [
      'Gain 4 new high-value categories',
      'Fill any 13 of 17 total categories',
      'Skip your worst rolls, capitalize on lucky ones',
    ],
    bestFor: 'Players who want flexibility and backup options',
    charges: null,
    implemented: true,
  },
  mercy: {
    id: 'mercy',
    name: 'Blessing of Mercy',
    subtitle: 'Fresh Start',
    description: 'Once per curse, reset your hand completely: new dice, full rerolls.',
    icon: '🕊️',
    benefits: [
      'Completely reset a dead hand',
      'New dice + rerolls restored to 3',
      'Resets each curse round',
    ],
    bestFor: 'Players who want a panic button for bad rolls',
    charges: 1,
    implemented: true,
  },
  sanctuary: {
    id: 'sanctuary',
    name: 'Blessing of Sanctuary',
    subtitle: 'Clutch Saves',
    description: 'Save your current dice, then restore them later when you need them. 1 use per curse.',
    icon: '🛡️',
    benefits: [
      'Bank a promising hand for later',
      'Restore swaps dice, keeps rerolls',
      'Resets each curse round',
    ],
    bestFor: 'Players who like risk/reward timing',
    charges: 1,
    implemented: true,
  },
  sixth: {
    id: 'sixth',
    name: 'The Sixth Blessing',
    subtitle: 'Extra Die',
    description: 'Add a 6th die to your roll, but only the best 5 count for scoring. 3 uses per curse.',
    icon: '🎲',
    benefits: [
      'Roll 6 dice instead of 5',
      'Keep the best 5 for scoring',
      '3 charges per curse, resets each round',
    ],
    bestFor: 'Players who want raw statistical advantage',
    charges: 3,
    implemented: true,
  },
} as const;

export const BLESSING_IDS: readonly BlessingId[] = ['abundance', 'mercy', 'sanctuary', 'sixth'];

export function getBlessingConfig(id: BlessingId): BlessingConfig {
  return BLESSINGS[id];
}

export function getImplementedBlessings(): BlessingConfig[] {
  return BLESSING_IDS.map((id) => BLESSINGS[id]).filter((b) => b.implemented);
}

export function getAllBlessings(): BlessingConfig[] {
  return BLESSING_IDS.map((id) => BLESSINGS[id]);
}
