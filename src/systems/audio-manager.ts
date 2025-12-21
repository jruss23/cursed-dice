/**
 * Audio Manager
 *
 * Self-contained audio system using pre-stitched audio files.
 * Each difficulty has a single audio file with built-in song progression.
 *
 * External API:
 * - init() - initialize the system
 * - play(difficulty) - start music for a difficulty mode
 * - syncToGameTime(timeRemainingMs) - sync to game timer (optional rate boost)
 * - stop/pause/resume/fadeOut - playback control
 * - setVolume/toggle - volume control
 * - dispose() - cleanup
 */

import * as Tone from 'tone';
import { type Difficulty, DIFFICULTIES } from '@/config';
import { createLogger } from './logger';

export type { Difficulty };

const log = createLogger('AudioManager');

// ============================================================================
// AUDIO CONFIGURATION - Edit these to change audio behavior
// ============================================================================

type Song = 'chill' | 'normal' | 'intense';

/** Audio file paths */
const SONGS: Record<Song, string> = {
  chill: '/sounds/chill.mp3',
  normal: '/sounds/normal.mp3',
  intense: '/sounds/intense.mp3',
};

/**
 * Each difficulty has its own pre-stitched audio file with built-in song progression:
 * - chill.mp3: 4 min (Keep + Beware + Battling, pitch shifted)
 * - normal.mp3: 3 min (same songs, 15% faster)
 * - intense.mp3: 2 min (same songs, 30% faster)
 *
 * No runtime crossfading needed - transitions are baked into the files.
 */
const DIFFICULTY_SONGS: Record<Difficulty, Song> = {
  chill: 'chill',
  normal: 'normal',
  intense: 'intense',
};

/**
 * Time-based rate multipliers (optional intensity boost as time runs out)
 * Set all to 1.0 to disable speed changes
 */
const TIME_RATE_MULTIPLIERS = {
  above60s: 1.0,   // > 1 minute remaining
  under60s: 1.0,   // ≤ 1 minute
  under30s: 1.0,   // ≤ 30 seconds
  under10s: 1.0,   // ≤ 10 seconds (critical)
};

/**
 * Audio effects applied to all songs
 */
const EFFECTS_CONFIG = {
  filter: {
    frequency: 2000,
    Q: 1.0,
    type: 'lowpass' as BiquadFilterType,
  },
  reverb: {
    decay: 3,
    wet: 0.35,
  },
  delay: {
    time: 0.3,
    feedback: 0.3,
    wet: 0.2,
  },
  stereo: {
    width: 0.8,
  },
  compressor: {
    threshold: -15,
    ratio: 3,
    attack: 0.05,
    release: 0.2,
  },
};


// ============================================================================
// AUDIO MANAGER CLASS
// ============================================================================

export class AudioManager {
  // Players
  private players: Map<Song, Tone.Player> = new Map();
  private currentPlayer: Tone.Player | null = null;

  // State
  private currentMode: Difficulty | null = null;
  private totalDurationMs: number = 0;
  private lastTimeRemainingMs: number = 0;

  // Effects
  private filter: Tone.Filter | null = null;
  private reverb: Tone.Reverb | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private stereoWidener: Tone.StereoWidener | null = null;
  private compressor: Tone.Compressor | null = null;
  private limiter: Tone.Limiter | null = null;

  // Flags
  private isInitialized: boolean = false;
  private musicEnabled: boolean = true;
  private currentVolume: number = 0.5;

  constructor() {}

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /** Initialize the audio system (call once at game start) */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    log.log('Initializing...');

    try {
      await Tone.start();
      await this.createEffects();
      await this.loadSongs();
      this.isInitialized = true;
      log.log('Ready');
    } catch (err) {
      log.error('Init failed:', err);
    }
  }

  /** Start playing music for a difficulty mode */
  async play(difficulty: Difficulty): Promise<void> {
    if (!this.isInitialized) await this.init();
    if (!this.musicEnabled) {
      this.currentMode = difficulty;
      return;
    }

    this.stopAll();
    this.currentMode = difficulty;
    this.totalDurationMs = DIFFICULTIES[difficulty].timeMs;
    this.lastTimeRemainingMs = this.totalDurationMs;

    // Each difficulty has a pre-stitched audio file with built-in progression
    const songName = DIFFICULTY_SONGS[difficulty];
    const player = this.players.get(songName);
    if (!player) {
      log.error(`No player for: ${songName}`);
      return;
    }

    log.log(`Playing: ${difficulty} mode → "${songName}" (${this.totalDurationMs / 1000}s)`);

    this.connectPlayer(player);
    player.volume.value = Tone.gainToDb(this.currentVolume);
    player.playbackRate = 1.0;
    player.start();
    this.currentPlayer = player;
  }

  /** Sync audio to game time - call this every timer tick */
  syncToGameTime(timeRemainingMs: number): void {
    if (!this.currentMode || !this.musicEnabled || !this.currentPlayer) return;

    // Detect time jumps (e.g., debug skip) - if time jumped more than 2 seconds, seek audio
    const timeDelta = this.lastTimeRemainingMs - timeRemainingMs;
    if (timeDelta > 2000) {
      // Time jumped forward - seek audio to match
      const elapsedMs = this.totalDurationMs - timeRemainingMs;
      const seekPositionSec = elapsedMs / 1000;
      const duration = this.currentPlayer.buffer?.duration ?? 0;

      if (seekPositionSec < duration && seekPositionSec >= 0) {
        log.log(`Time skip detected: seeking to ${seekPositionSec.toFixed(1)}s`);
        this.currentPlayer.seek(seekPositionSec);
      }
    }

    this.lastTimeRemainingMs = timeRemainingMs;
    this.updatePlaybackRate(timeRemainingMs);
  }

  /** Stop all music */
  stop(): void {
    this.stopAll();
    this.currentMode = null;
    log.log('Stopped');
  }

  /** Pause current music */
  pause(): void {
    if (this.currentPlayer?.state === 'started') {
      this.currentPlayer.stop();
      log.log('Paused');
    }
  }

  /** Resume current music */
  resume(): void {
    if (this.currentMode && this.currentPlayer?.state === 'stopped') {
      this.currentPlayer.start();
      log.log('Resumed');
    }
  }

  /** Fade out and stop */
  fadeOut(durationMs: number = 1000): void {
    if (!this.currentPlayer) return;

    const steps = 20;
    const stepMs = durationMs / steps;
    const startVol = this.currentVolume;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      this.setVolume(startVol * (1 - step / steps));
      if (step >= steps) {
        clearInterval(interval);
        this.stop();
        this.currentVolume = startVol; // Restore for next play
      }
    }, stepMs);
  }

  /** Set volume (0-1) */
  setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.currentPlayer) {
      this.currentPlayer.volume.value = Tone.gainToDb(this.currentVolume);
    }
  }

  /** Toggle music on/off */
  toggle(): boolean {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) this.stop();
    return this.musicEnabled;
  }

  /** Check if music is enabled */
  isEnabled(): boolean {
    return this.musicEnabled;
  }

  /** Get current difficulty mode */
  getCurrentDifficulty(): Difficulty | null {
    return this.currentMode;
  }

  /** Get current playback rate */
  getRate(): number {
    return this.currentPlayer?.playbackRate ?? 1;
  }

  /** Get base rate (always 1.0 since audio files are pre-stitched) */
  getBaseRate(): number {
    return 1.0;
  }

  /** Clean up all resources */
  dispose(): void {
    this.stopAll();
    this.players.forEach(p => p.dispose());
    this.players.clear();
    this.filter?.dispose();
    this.reverb?.dispose();
    this.delay?.dispose();
    this.stereoWidener?.dispose();
    this.compressor?.dispose();
    this.limiter?.dispose();
    this.isInitialized = false;
    log.log('Disposed');
  }

  // ==========================================================================
  // INTERNAL METHODS
  // ==========================================================================

  private async createEffects(): Promise<void> {
    this.filter = new Tone.Filter({
      frequency: EFFECTS_CONFIG.filter.frequency,
      type: EFFECTS_CONFIG.filter.type,
      Q: EFFECTS_CONFIG.filter.Q,
      rolloff: -24,
    });

    this.reverb = new Tone.Reverb({
      decay: EFFECTS_CONFIG.reverb.decay,
      wet: EFFECTS_CONFIG.reverb.wet,
    });
    await this.reverb.generate();

    this.delay = new Tone.FeedbackDelay({
      delayTime: EFFECTS_CONFIG.delay.time,
      feedback: EFFECTS_CONFIG.delay.feedback,
      wet: EFFECTS_CONFIG.delay.wet,
    });

    this.stereoWidener = new Tone.StereoWidener({
      width: EFFECTS_CONFIG.stereo.width,
    });

    this.compressor = new Tone.Compressor({
      threshold: EFFECTS_CONFIG.compressor.threshold,
      ratio: EFFECTS_CONFIG.compressor.ratio,
      attack: EFFECTS_CONFIG.compressor.attack,
      release: EFFECTS_CONFIG.compressor.release,
    });

    this.limiter = new Tone.Limiter(-1);
  }

  private async loadSongs(): Promise<void> {
    const songNames = Object.keys(SONGS) as Song[];
    log.log(`Loading ${songNames.length} songs: ${songNames.join(', ')}`);

    for (const name of songNames) {
      const player = new Tone.Player({
        url: SONGS[name],
        loop: true,
        onload: () => log.log(`Loaded: ${name}`),
        onerror: (err) => log.error(`Failed to load ${name}:`, err),
      });
      this.players.set(name, player);
    }

    await Tone.loaded();
    log.log(`All songs loaded. Players: ${Array.from(this.players.keys()).join(', ')}`);
  }

  private connectPlayer(player: Tone.Player): void {
    if (!this.filter || !this.delay || !this.reverb ||
        !this.stereoWidener || !this.compressor || !this.limiter) return;

    player.disconnect();
    player.chain(
      this.filter,
      this.delay,
      this.reverb,
      this.stereoWidener,
      this.compressor,
      this.limiter,
      Tone.Destination
    );
  }

  private updatePlaybackRate(timeRemainingMs: number): void {
    if (!this.currentPlayer || !this.currentMode) return;

    const baseRate = this.getBaseRate();
    let multiplier = TIME_RATE_MULTIPLIERS.above60s;

    if (timeRemainingMs <= 10000) {
      multiplier = TIME_RATE_MULTIPLIERS.under10s;
    } else if (timeRemainingMs <= 30000) {
      multiplier = TIME_RATE_MULTIPLIERS.under30s;
    } else if (timeRemainingMs <= 60000) {
      multiplier = TIME_RATE_MULTIPLIERS.under60s;
    }

    const targetRate = baseRate * multiplier;
    if (Math.abs(this.currentPlayer.playbackRate - targetRate) > 0.01) {
      this.currentPlayer.playbackRate = targetRate;
    }
  }

  private stopAll(): void {
    this.players.forEach(player => {
      if (player.state === 'started') player.stop();
    });
    this.currentPlayer = null;
  }

  // Legacy API (no-op for compatibility)
  static preload(): void {}
  static preloadAll(): void {}
}
