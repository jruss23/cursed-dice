/**
 * Audio Manager
 * Handles background music for different difficulty levels
 */

import Phaser from 'phaser';
import { type Difficulty, DIFFICULTIES } from '@/config';

// Re-export Difficulty type for convenience
export type { Difficulty };

interface TrackConfig {
  key: string;
  path: string;
}

// Track configurations derived from difficulty config
function getTrackConfig(difficulty: Difficulty): TrackConfig {
  return {
    key: `music-${difficulty}`,
    path: `sounds/${difficulty}.mp3`,
  };
}

// Debug logging
const DEBUG = true;
function log(...args: unknown[]): void {
  if (DEBUG) console.log('[AudioManager]', ...args);
}

export class AudioManager {
  private scene: Phaser.Scene;
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  private musicEnabled: boolean = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Preload music for a specific difficulty
   */
  static preload(scene: Phaser.Scene, difficulty: Difficulty): void {
    const track = getTrackConfig(difficulty);
    log('Preloading track:', track.key, track.path);
    scene.load.audio(track.key, track.path);

    scene.load.on('filecomplete-audio-' + track.key, () => {
      log('Track loaded successfully:', track.key);
    });

    scene.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error('[AudioManager] Failed to load:', file.key, file.url);
    });
  }

  /**
   * Preload all music tracks
   */
  static preloadAll(scene: Phaser.Scene): void {
    const difficulties: Difficulty[] = ['chill', 'normal', 'intense'];
    for (const difficulty of difficulties) {
      const track = getTrackConfig(difficulty);
      scene.load.audio(track.key, track.path);
    }
  }

  /**
   * Play music for the selected difficulty
   */
  play(difficulty: Difficulty): void {
    log('play() called, difficulty:', difficulty, 'enabled:', this.musicEnabled);

    if (!this.musicEnabled) {
      log('Music disabled, skipping');
      return;
    }

    const track = getTrackConfig(difficulty);
    log('Track config:', track);

    // Stop any current music
    this.stop();

    // Check if the audio was loaded successfully
    const exists = this.scene.cache.audio.exists(track.key);
    log('Track in cache:', exists);
    log('Sound manager locked:', this.scene.sound.locked);

    if (exists) {
      this.currentMusic = this.scene.sound.add(track.key, {
        loop: true,
        volume: 0.5,
      });
      log('Sound added, attempting play...');
      this.currentMusic.play();
      log('Is playing:', this.currentMusic.isPlaying);

      // Handle locked audio context
      if (this.scene.sound.locked) {
        log('Audio locked, waiting for unlock...');
        this.scene.sound.once('unlocked', () => {
          log('Audio unlocked, playing now');
          if (this.currentMusic && !this.currentMusic.isPlaying) {
            this.currentMusic.play();
          }
        });
      }
    } else {
      console.warn(`[AudioManager] Music track not found in cache: ${track.key}`);
      console.warn('[AudioManager] Expected path:', track.path);
    }
  }

  /**
   * Stop current music
   */
  stop(): void {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic.destroy();
      this.currentMusic = null;
    }
  }

  /**
   * Pause music
   */
  pause(): void {
    if (this.currentMusic && this.currentMusic.isPlaying) {
      this.currentMusic.pause();
    }
  }

  /**
   * Resume music
   */
  resume(): void {
    if (this.currentMusic && this.currentMusic.isPaused) {
      this.currentMusic.resume();
    }
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    if (this.currentMusic) {
      (this.currentMusic as Phaser.Sound.WebAudioSound).setVolume(volume);
    }
  }

  /**
   * Set playback rate (1.0 = normal, 1.3 = 30% faster, etc.)
   */
  setRate(rate: number): void {
    if (this.currentMusic) {
      (this.currentMusic as Phaser.Sound.WebAudioSound).setRate(rate);
      log('Playback rate set to:', rate);
    }
  }

  /**
   * Get current playback rate
   */
  getRate(): number {
    if (this.currentMusic) {
      return (this.currentMusic as Phaser.Sound.WebAudioSound).rate;
    }
    return 1.0;
  }

  /**
   * Fade out music
   */
  fadeOut(duration: number = 1000): void {
    if (this.currentMusic && this.scene.tweens) {
      this.scene.tweens.add({
        targets: this.currentMusic,
        volume: 0,
        duration,
        onComplete: () => {
          this.stop();
        },
      });
    }
  }

  /**
   * Toggle music on/off
   */
  toggle(): boolean {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) {
      this.stop();
    }
    return this.musicEnabled;
  }

  /**
   * Check if music is enabled
   */
  isEnabled(): boolean {
    return this.musicEnabled;
  }

  /**
   * Get track duration for a difficulty (from config)
   */
  static getTrackDuration(difficulty: Difficulty): number {
    return DIFFICULTIES[difficulty].timeMs;
  }
}
