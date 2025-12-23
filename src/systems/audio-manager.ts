/**
 * Audio Manager
 *
 * Uses Phaser's built-in audio system for gameplay music.
 * Each difficulty has a single pre-processed audio file with built-in song progression.
 *
 * External API:
 * - init(scene) - initialize with Phaser scene
 * - play(difficulty) - start music for a difficulty mode
 * - syncToGameTime(timeRemainingMs) - sync to game timer (for seeking on time skip)
 * - stop/pause/resume/fadeOut - playback control
 * - setVolume - volume control
 * - dispose() - cleanup
 */

import Phaser from 'phaser';
import { type Difficulty, DIFFICULTIES } from '@/config';
import { createLogger } from './logger';

export type { Difficulty };

const log = createLogger('AudioManager');

// ============================================================================
// AUDIO CONFIGURATION
// ============================================================================

type Song = 'chill' | 'normal' | 'intense';

/** Audio file paths (relative to assets/sounds/) */
const SONGS: Record<Song, string> = {
  chill: 'sounds/chill.ogg',
  normal: 'sounds/normal.ogg',
  intense: 'sounds/intense.ogg',
};

/** Map difficulty to song file */
const DIFFICULTY_SONGS: Record<Difficulty, Song> = {
  chill: 'chill',
  normal: 'normal',
  intense: 'intense',
};

// ============================================================================
// AUDIO MANAGER CLASS
// ============================================================================

export class AudioManager {
  private scene: Phaser.Scene | null = null;
  private sounds: Map<Song, Phaser.Sound.BaseSound> = new Map();
  private currentSound: Phaser.Sound.BaseSound | null = null;

  // State
  private currentMode: Difficulty | null = null;
  private totalDurationMs: number = 0;
  private lastTimeRemainingMs: number = 0;

  // Flags
  private isInitialized: boolean = false;
  private musicEnabled: boolean = true;
  private currentVolume: number = 0.5;

  constructor() {}

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /** Initialize the audio system with a Phaser scene */
  async init(scene?: Phaser.Scene): Promise<void> {
    if (this.isInitialized) return;

    if (!scene) {
      log.error('No scene provided to AudioManager.init()');
      return;
    }

    this.scene = scene;
    log.log('Initializing...');

    try {
      await this.loadSongs();
      this.isInitialized = true;
      log.log('Ready');
    } catch (err) {
      log.error('Init failed:', err);
    }
  }

  /** Start playing music for a difficulty mode (lazy loads the track) */
  async play(difficulty: Difficulty): Promise<void> {
    if (!this.scene) {
      log.error('AudioManager not initialized with scene');
      return;
    }

    if (!this.isInitialized) {
      await this.init(this.scene);
    }

    if (!this.musicEnabled) {
      this.currentMode = difficulty;
      return;
    }

    this.stopAll();
    this.currentMode = difficulty;
    this.totalDurationMs = DIFFICULTIES[difficulty].timeMs;
    this.lastTimeRemainingMs = this.totalDurationMs;

    const songName = DIFFICULTY_SONGS[difficulty];

    // Lazy load the song for this difficulty
    const sound = await this.loadSong(songName);
    if (!sound) {
      log.error(`Failed to load song for: ${songName}`);
      return;
    }

    log.log(`Playing: ${difficulty} mode → "${songName}" (${this.totalDurationMs / 1000}s)`);

    sound.play({ loop: true, volume: this.currentVolume });
    this.currentSound = sound;
  }

  /** Sync audio to game time - handle time skips */
  syncToGameTime(timeRemainingMs: number): void {
    if (!this.currentMode || !this.musicEnabled || !this.currentSound) return;

    // Detect time jumps (e.g., debug skip) - if time jumped more than 2 seconds, seek audio
    const timeDelta = this.lastTimeRemainingMs - timeRemainingMs;
    if (timeDelta > 2000) {
      const elapsedMs = this.totalDurationMs - timeRemainingMs;
      const seekPositionSec = elapsedMs / 1000;

      // Phaser's WebAudioSound has seek property (getter/setter)
      if ('seek' in this.currentSound) {
        log.log(`Time skip detected: seeking to ${seekPositionSec.toFixed(1)}s`);
        (this.currentSound as Phaser.Sound.WebAudioSound).seek = seekPositionSec;
      }
    }

    this.lastTimeRemainingMs = timeRemainingMs;
  }

  /** Stop all music */
  stop(): void {
    this.stopAll();
    this.currentMode = null;
    log.log('Stopped');
  }

  /** Pause current music */
  pause(): void {
    if (this.currentSound?.isPlaying) {
      this.currentSound.pause();
      log.log('Paused');
    }
  }

  /** Resume current music */
  resume(): void {
    if (this.currentSound?.isPaused) {
      this.currentSound.resume();
      log.log('Resumed');
    }
  }

  /** Fade out and stop */
  fadeOut(durationMs: number = 1000): void {
    if (!this.currentSound || !this.scene) return;

    const startVol = this.currentVolume;

    this.scene.tweens.add({
      targets: this.currentSound,
      volume: 0,
      duration: durationMs,
      onComplete: () => {
        this.stop();
        this.currentVolume = startVol; // Restore for next play
      },
    });
  }

  /** Set volume (0-1) */
  setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.currentSound && 'setVolume' in this.currentSound) {
      (this.currentSound as Phaser.Sound.WebAudioSound).setVolume(this.currentVolume);
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

  /** Clean up all resources */
  dispose(): void {
    this.stopAll();
    this.sounds.forEach(sound => sound.destroy());
    this.sounds.clear();
    this.isInitialized = false;
    this.scene = null;
    log.log('Disposed');
  }

  // ==========================================================================
  // INTERNAL METHODS
  // ==========================================================================

  /** Load a single song on demand (lazy loading) */
  private async loadSong(songName: Song): Promise<Phaser.Sound.BaseSound | null> {
    if (!this.scene) return null;

    // Already loaded?
    if (this.sounds.has(songName)) {
      return this.sounds.get(songName)!;
    }

    const key = `music-${songName}`;
    log.log(`Lazy loading: ${songName}`);

    // Load if not in cache
    if (!this.scene.cache.audio.exists(key)) {
      this.scene.load.audio(key, SONGS[songName]);

      // Wait for this song to load
      await new Promise<void>((resolve) => {
        this.scene!.load.once('complete', () => resolve());
        this.scene!.load.start();
      });
    }

    // Create sound object
    if (this.scene.cache.audio.exists(key)) {
      const sound = this.scene.sound.add(key, { loop: true, volume: this.currentVolume });
      this.sounds.set(songName, sound);
      log.log(`Loaded: ${songName}`);
      return sound;
    } else {
      log.error(`Failed to load: ${songName}`);
      return null;
    }
  }

  /** @deprecated No longer preloads all songs - uses lazy loading instead */
  private async loadSongs(): Promise<void> {
    // Now a no-op - songs are loaded on demand in play()
    log.log('AudioManager ready (lazy loading enabled)');
  }

  private stopAll(): void {
    this.sounds.forEach(sound => {
      if (sound.isPlaying) sound.stop();
    });
    this.currentSound = null;
  }
}
