/**
 * Blessings Configuration
 * Data-driven blessing definitions
 */

export type BlessingId = 'abundance' | 'foresight' | 'sanctuary' | 'sixth';

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
  foresight: {
    id: 'foresight',
    name: 'Blessing of Foresight',
    subtitle: 'Perfect Information',
    description: 'Spend 1 reroll to preview next roll (3 charges)',
    icon: '🔮',
    benefits: [
      'See future roll before it happens',
      'Costs 1 reroll, 3 charges total',
      'Plan optimal lock strategies',
    ],
    bestFor: 'Strategic players who hate bad luck',
    charges: 3,
    implemented: true,
  },
  sanctuary: {
    id: 'sanctuary',
    name: 'Blessing of Sanctuary',
    subtitle: 'Clutch Saves',
    description: 'Bank current dice to restore later (1 use)',
    icon: '🛡️',
    benefits: [
      'Bank one promising hand',
      'Use later with fresh rerolls',
      'Perfect for clutch moments',
    ],
    bestFor: 'Players who like risk/reward timing',
    charges: 1,
    implemented: true,
  },
  sixth: {
    id: 'sixth',
    name: 'The Sixth Blessing',
    subtitle: 'Extra Die',
    description: 'Roll 6 dice, score with best 5 (3 charges)',
    icon: '🎲',
    benefits: [
      'Roll 6 dice instead of 5',
      'Keep the best 5 for scoring',
      '3 charges total',
    ],
    bestFor: 'Players who want raw statistical advantage',
    charges: 3,
    implemented: true,
  },
} as const;

export const BLESSING_IDS: readonly BlessingId[] = ['abundance', 'foresight', 'sanctuary', 'sixth'];

export function getBlessingConfig(id: BlessingId): BlessingConfig {
  return BLESSINGS[id];
}

export function getImplementedBlessings(): BlessingConfig[] {
  return BLESSING_IDS.map((id) => BLESSINGS[id]).filter((b) => b.implemented);
}

export function getAllBlessings(): BlessingConfig[] {
  return BLESSING_IDS.map((id) => BLESSINGS[id]);
}
