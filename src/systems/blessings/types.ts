/**
 * Blessing System Types
 * Defines interfaces for the blessing choice system
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
}

// Base interface for blessing state
export interface BlessingModeState {
  readonly type: BlessingId;
}

// Abundance blessing state (passive - 4 bonus categories)
export interface AbundanceModeState extends BlessingModeState {
  readonly type: 'abundance';
  enabled: boolean;
}

// Foresight blessing state (3 charges total - preview next roll)
export interface ForesightModeState extends BlessingModeState {
  readonly type: 'foresight';
  chargesRemaining: number;
  maxCharges: number;
  isPreviewActive: boolean;
  previewedValues: number[] | null;
}

// Sanctuary blessing state (bank/restore once per run)
export interface SanctuaryModeState extends BlessingModeState {
  readonly type: 'sanctuary';
  bankedDice: number[] | null;
  canBank: boolean;
  canRestore: boolean;
}

// Sixth Blessing state (3 charges - roll 6 dice, keep best 5)
export interface SixthModeState extends BlessingModeState {
  readonly type: 'sixth';
  chargesRemaining: number;
  maxCharges: number;
}

/**
 * Base Blessing interface
 * All blessings must implement this
 */
export interface Blessing<T extends BlessingModeState = BlessingModeState> {
  readonly config: BlessingConfig;

  /** Called when a new curse round starts */
  onModeStart(): void;

  /** Called when curse round ends */
  onModeEnd(): void;

  /** Called when a new hand starts (after scoring) */
  onNewHand(): void;

  /** Check if blessing can currently be used */
  canUse(): boolean;

  /** Get current state for UI display */
  getState(): T;

  /** Clean up resources (optional) */
  destroy?(): void;
}

/**
 * Configuration for all available blessings
 */
export const BLESSING_CONFIGS: Record<BlessingId, BlessingConfig> = {
  abundance: {
    id: 'abundance',
    name: 'Blessing of Abundance',
    subtitle: 'More Options',
    description: 'Unlocks 4 bonus categories worth 45 pts each',
    icon: '✨',
    benefits: [
      'Gain 4 new high-value categories',
      'Fill any 13 of 17 total categories',
      'Skip your worst rolls, capitalize on lucky ones',
    ],
    bestFor: 'Players who want flexibility and backup options',
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
  },
};
