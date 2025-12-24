/**
 * Blessing System Types
 * Defines interfaces for the blessing choice system
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

// Mercy blessing state (1 use per curse - reset hand completely)
export interface MercyModeState extends BlessingModeState {
  readonly type: 'mercy';
  used: boolean;
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
  },
};
