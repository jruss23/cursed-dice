/**
 * Music Manager
 *
 * Handles background music playback using Phaser's audio system.
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

const log = createLogger('MusicManager');

// Persist music enabled state across scene restarts
const STORAGE_KEY = 'cursed-dice-music-enabled';

function loadMusicEnabled(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

function saveMusicEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage errors
  }
}

/** Check if music is enabled (for scenes not using MusicManager) */
export function isMusicEnabled(): boolean {
  return loadMusicEnabled();
}

// ============================================================================
// MUSIC CONFIGURATION
// ============================================================================

type Song = 'chill' | 'normal' | 'intense';

/**
 * Audio file paths - provide both OGG and MP3 for browser compatibility
 * Phaser will use the first supported format (OGG for Chrome/Firefox, MP3 for Safari/iOS)
 */
const SONGS: Record<Song, string[]> = {
  // MP3 first for web compatibility, OGG as fallback for Capacitor
  chill: ['sounds/chill.mp3', 'sounds/chill.ogg'],
  normal: ['sounds/normal.mp3', 'sounds/normal.ogg'],
  intense: ['sounds/intense.mp3', 'sounds/intense.ogg'],
};

/** Map difficulty to song file */
const DIFFICULTY_SONGS: Record<Difficulty, Song> = {
  chill: 'chill',
  normal: 'normal',
  intense: 'intense',
};

/** Time skip detection threshold - if time jumps by more than this, seek audio */
const TIME_SKIP_THRESHOLD_MS = 2000;

// ============================================================================
// MUSIC MANAGER CLASS
// ============================================================================

export class MusicManager {
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

  // Active tweens (for cleanup)
  private fadeTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    // Load persisted music setting
    this.musicEnabled = loadMusicEnabled();
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /** Initialize the music system with a Phaser scene */
  async init(scene?: Phaser.Scene): Promise<void> {
    if (this.isInitialized) return;

    if (!scene) {
      log.error('No scene provided to MusicManager.init()');
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
      log.error('MusicManager not initialized with scene');
      return;
    }

    if (!this.isInitialized) {
      await this.init(this.scene);
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

    // Always play to keep timing in sync - use volume 0 if muted
    const vol = this.musicEnabled ? this.currentVolume : 0;
    log.log(`Playing: ${difficulty} mode → "${songName}" (vol=${vol}, ${this.totalDurationMs / 1000}s)`);

    // Try to resume audio context first (helps with iOS Safari)
    // Phaser's WebAudioSoundManager handles unlock queue internally
    try {
      const ctx = (this.scene.sound as Phaser.Sound.WebAudioSoundManager).context;
      if (ctx && ctx.state === 'suspended') {
        log.log('Audio context suspended, attempting resume...');
        await ctx.resume();
      }
    } catch (e) {
      // Not WebAudio or context not available - that's fine
    }

    sound.play({ loop: true, volume: vol });
    this.currentSound = sound;
  }

  /** Sync audio to game time - handle time skips (works even when muted) */
  syncToGameTime(timeRemainingMs: number): void {
    if (!this.currentMode || !this.currentSound) return;

    // Detect time jumps (e.g., debug skip) - if time jumped more than threshold, seek audio
    const timeDelta = this.lastTimeRemainingMs - timeRemainingMs;
    if (timeDelta > TIME_SKIP_THRESHOLD_MS) {
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
    // Kill any active fade tween
    if (this.fadeTween) {
      this.fadeTween.stop();
      this.fadeTween = null;
    }

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

    // Kill any existing fade tween
    if (this.fadeTween) {
      this.fadeTween.stop();
      this.fadeTween = null;
    }

    const startVol = this.currentVolume;

    this.fadeTween = this.scene.tweens.add({
      targets: this.currentSound,
      volume: 0,
      duration: durationMs,
      onComplete: () => {
        this.fadeTween = null;
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

  /** Toggle music on/off - mutes/unmutes to keep timing in sync */
  toggle(): boolean {
    this.musicEnabled = !this.musicEnabled;
    saveMusicEnabled(this.musicEnabled);

    // Mute/unmute to keep timing in sync
    if (this.currentSound && 'setVolume' in this.currentSound) {
      const vol = this.musicEnabled ? this.currentVolume : 0;
      (this.currentSound as Phaser.Sound.WebAudioSound).setVolume(vol);
      log.log(`Music ${this.musicEnabled ? 'unmuted' : 'muted'} (vol=${vol})`);
    }

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
    // Kill any active fade tween first
    if (this.fadeTween) {
      this.fadeTween.stop();
      this.fadeTween = null;
    }

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

      // Wait for this song to load (with null check for race condition)
      await new Promise<void>((resolve) => {
        if (!this.scene) {
          resolve();
          return;
        }
        this.scene.load.once('complete', () => resolve());
        this.scene.load.start();
      });

      // Scene may have been destroyed during load
      if (!this.scene) return null;
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
    log.log('MusicManager ready (lazy loading enabled)');
  }

  private stopAll(): void {
    this.sounds.forEach(sound => {
      if (sound.isPlaying) sound.stop();
    });
    this.currentSound = null;
  }
}
