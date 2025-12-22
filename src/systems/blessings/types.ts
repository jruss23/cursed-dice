/**
 * Blessing System Types
 * Defines interfaces for the blessing choice system
 */

export type BlessingId = 'expansion' | 'sacrifice' | 'insurance';

export interface BlessingConfig {
  id: BlessingId;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  benefits: string[];
  bestFor: string;
}

// Base interface for per-mode state
export interface BlessingModeState {
  readonly type: BlessingId;
}

// Expansion blessing state (passive - always enabled once chosen)
export interface ExpansionModeState extends BlessingModeState {
  readonly type: 'expansion';
  enabled: boolean;
}

// Sacrifice blessing state (3 charges per mode)
export interface SacrificeModeState extends BlessingModeState {
  readonly type: 'sacrifice';
  chargesRemaining: number;
  maxCharges: number;
  isPreviewActive: boolean;
  previewedValues: number[] | null;
}

// Insurance blessing state (bank/restore once per mode)
export interface InsuranceModeState extends BlessingModeState {
  readonly type: 'insurance';
  bankedDice: number[] | null;
  canBank: boolean;
  canRestore: boolean;
}

/**
 * Base Blessing interface
 * All blessings must implement this
 */
export interface Blessing<T extends BlessingModeState = BlessingModeState> {
  readonly config: BlessingConfig;

  /** Called when a new mode starts - reset per-mode state */
  onModeStart(): void;

  /** Called when mode ends */
  onModeEnd(): void;

  /** Called when a new hand starts (after scoring) */
  onNewHand(): void;

  /** Check if blessing can currently be used */
  canUse(): boolean;

  /** Get current state for UI display */
  getState(): T;
}

/**
 * Configuration for all available blessings
 */
export const BLESSING_CONFIGS: Record<BlessingId, BlessingConfig> = {
  expansion: {
    id: 'expansion',
    name: 'Blessing of Expansion',
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
  sacrifice: {
    id: 'sacrifice',
    name: 'Blessing of Sacrifice',
    subtitle: 'Perfect Information',
    description: 'Spend 1 reroll to preview next roll (3 uses per mode)',
    icon: '🔮',
    benefits: [
      'See future roll before it happens',
      'Costs 1 reroll, 3 charges per mode',
      'Plan optimal lock strategies',
    ],
    bestFor: 'Strategic players who hate bad luck',
  },
  insurance: {
    id: 'insurance',
    name: 'Blessing of Insurance',
    subtitle: 'Clutch Saves',
    description: 'Bank current dice to restore later (once per mode)',
    icon: '🛡️',
    benefits: [
      'Bank one promising hand per mode',
      'Use later with fresh rerolls',
      'Perfect for clutch moments',
    ],
    bestFor: 'Players who like risk/reward timing',
  },
};
