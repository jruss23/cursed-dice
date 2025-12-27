/**
 * Difficulty Configuration
 * Game timing and difficulty settings
 */

import { PALETTE } from '@/config/theme';

export type Difficulty = 'chill' | 'normal' | 'intense';

export interface DifficultyConfig {
  key: Difficulty;
  label: string;
  subtitle: string;
  timeMs: number;
  timeDisplay: string;
  color: string;
  hoverColor: number;
  bgColor: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  chill: {
    key: 'chill',
    label: 'CREEPING DREAD',
    subtitle: 'A gentle haunting awaits',
    timeMs: 4 * 60 * 1000,
    timeDisplay: '4 min',
    color: '#44aa44',
    hoverColor: PALETTE.green[400],
    bgColor: PALETTE.green[600],
  },
  normal: {
    key: 'normal',
    label: 'PRESSING FATE',
    subtitle: 'The curse tightens its grip',
    timeMs: 3 * 60 * 1000,
    timeDisplay: '3 min',
    color: '#4488ff',
    hoverColor: PALETTE.blue[400],
    bgColor: PALETTE.blue[600],
  },
  intense: {
    key: 'intense',
    label: 'IMMINENT DOOM',
    subtitle: 'No mercy, no escape',
    timeMs: 2 * 60 * 1000,
    timeDisplay: '2 min',
    color: '#ff4444',
    hoverColor: PALETTE.red[400],
    bgColor: PALETTE.red[600],
  },
} as const;

export const DIFFICULTY_LIST: readonly Difficulty[] = ['chill', 'normal', 'intense'];

export function getDifficultyConfig(key: Difficulty): DifficultyConfig {
  return DIFFICULTIES[key];
}

export function getDifficultyTime(key: Difficulty): number {
  return DIFFICULTIES[key].timeMs;
}

export function getDifficultyLabel(key: Difficulty): string {
  return DIFFICULTIES[key].label;
}
