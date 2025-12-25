/**
 * SFX Manager
 * Procedural sound effects using Web Audio API
 * Lightweight - no audio files needed
 */

import { createLogger } from './logger';

const log = createLogger('SFXManager');

// Persist SFX enabled state across sessions
const STORAGE_KEY = 'cursed-dice-sfx-enabled';

function loadSFXEnabled(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

function saveSFXEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage errors
  }
}

// Singleton audio context (shared with Phaser's WebAudio)
let audioContext: AudioContext | null = null;

// Global SFX enabled state (loaded from localStorage)
let sfxEnabled = loadSFXEnabled();

export function isSFXEnabled(): boolean {
  return sfxEnabled;
}

export function setSFXEnabled(enabled: boolean): void {
  sfxEnabled = enabled;
  saveSFXEnabled(enabled);
  log.log(`SFX ${enabled ? 'enabled' : 'disabled'}`);
}

export function toggleSFX(): boolean {
  sfxEnabled = !sfxEnabled;
  saveSFXEnabled(sfxEnabled);
  log.log(`SFX ${sfxEnabled ? 'enabled' : 'disabled'}`);
  return sfxEnabled;
}

function getAudioContext(): AudioContext | null {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch (e) {
      log.error('Failed to create AudioContext:', e);
      return null;
    }
  }
  // Resume if suspended (iOS Safari requires user gesture)
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

// =============================================================================
// DICE ROLL SOUND
// "Bone Bounce" - Skeletal dice bouncing (dark/cursed theme, 200% volume)
// =============================================================================

export function playDiceRollSound(): void {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const vol = 2.0; // 200% volume

  const bounces = [
    { time: 0, freq: 196, duration: 0.07 },     // G3
    { time: 0.09, freq: 175, duration: 0.06 },  // F3
    { time: 0.16, freq: 156, duration: 0.05 },  // Eb3
    { time: 0.22, freq: 147, duration: 0.04 },  // D3
    { time: 0.27, freq: 131, duration: 0.035 }, // C3
  ];

  bounces.forEach(({ time, freq, duration }, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + time + duration);

    const gain = ctx.createGain();
    const baseVol = (0.18 - i * 0.025) * vol;
    gain.gain.setValueAtTime(baseVol, now + time);
    gain.gain.exponentialRampToValueAtTime(0.001, now + time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + time);
    osc.stop(now + time + duration);
  });

  // Base thud
  const thud = ctx.createOscillator();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(65, now);
  thud.frequency.exponentialRampToValueAtTime(35, now + 0.1);

  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(0.15 * vol, now);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  thud.connect(thudGain);
  thudGain.connect(ctx.destination);
  thud.start(now);
  thud.stop(now + 0.12);
}

// =============================================================================
// SCORE CONFIRM SOUND
// Quick ascending two-note "success" chime
// =============================================================================

export function playScoreConfirmSound(): void {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Two ascending notes (C4 -> E4) - lowered 1 octave for warmer tone
  const notes = [261.63, 329.63]; // C4, E4
  const duration = 0.08;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const startTime = now + i * 0.06;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

// =============================================================================
// MODE COMPLETE SOUND
// Triumphant major chord arpeggio
// =============================================================================

export function playModeCompleteSound(): void {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // C major chord arpeggio (C3 -> E3 -> G3 -> C4) - lowered 1 octave
  const notes = [130.81, 164.81, 196.00, 261.63];
  const duration = 0.2;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle'; // Softer than sine
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const startTime = now + i * 0.08;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
    gain.gain.setValueAtTime(0.12, startTime + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

// =============================================================================
// VICTORY FANFARE
// Extended triumphant sound for beating all 4 curses
// =============================================================================

export function playVictoryFanfare(): void {
  if (!sfxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Extended 5-second triumphant fanfare (dark/cursed theme)
  const fanfareNotes = [
    // Opening phrase (0-0.5s)
    { freq: 130.81, start: 0, duration: 0.15 },      // C3
    { freq: 164.81, start: 0.12, duration: 0.15 },   // E3
    { freq: 196.00, start: 0.24, duration: 0.15 },   // G3
    { freq: 261.63, start: 0.36, duration: 0.2 },    // C4

    // Second phrase (0.5-1.1s)
    { freq: 196.00, start: 0.52, duration: 0.12 },   // G3
    { freq: 220.00, start: 0.62, duration: 0.12 },   // A3
    { freq: 246.94, start: 0.72, duration: 0.12 },   // B3
    { freq: 261.63, start: 0.82, duration: 0.25 },   // C4

    // Climax phrase (1.1-1.7s)
    { freq: 196.00, start: 1.04, duration: 0.1 },    // G3
    { freq: 261.63, start: 1.12, duration: 0.1 },    // C4
    { freq: 329.63, start: 1.2, duration: 0.1 },     // E4
    { freq: 392.00, start: 1.28, duration: 0.4 },    // G4 (hold)

    // Triumphant repeat - higher octave (1.8-2.5s)
    { freq: 261.63, start: 1.8, duration: 0.12 },    // C4
    { freq: 329.63, start: 1.9, duration: 0.12 },    // E4
    { freq: 392.00, start: 2.0, duration: 0.12 },    // G4
    { freq: 523.25, start: 2.1, duration: 0.35 },    // C5 (hold)

    // Descending flourish (2.5-3.2s)
    { freq: 493.88, start: 2.5, duration: 0.1 },     // B4
    { freq: 440.00, start: 2.6, duration: 0.1 },     // A4
    { freq: 392.00, start: 2.7, duration: 0.1 },     // G4
    { freq: 329.63, start: 2.8, duration: 0.1 },     // E4
    { freq: 261.63, start: 2.9, duration: 0.25 },    // C4

    // Final ascending run (3.2-3.8s)
    { freq: 196.00, start: 3.2, duration: 0.1 },     // G3
    { freq: 261.63, start: 3.3, duration: 0.1 },     // C4
    { freq: 329.63, start: 3.4, duration: 0.1 },     // E4
    { freq: 392.00, start: 3.5, duration: 0.1 },     // G4
    { freq: 523.25, start: 3.6, duration: 0.3 },     // C5
  ];

  // Grand final chord (3.9-5s)
  const chordNotes = [
    { freq: 130.81, start: 3.9, duration: 1.1 },  // C3
    { freq: 196.00, start: 3.9, duration: 1.1 },  // G3
    { freq: 261.63, start: 3.9, duration: 1.1 },  // C4
    { freq: 329.63, start: 3.9, duration: 1.1 },  // E4
    { freq: 392.00, start: 3.9, duration: 1.1 },  // G4
  ];

  [...fanfareNotes, ...chordNotes].forEach(({ freq, start, duration }) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const startTime = now + start;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
    gain.gain.setValueAtTime(0.1, startTime + duration * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

// =============================================================================
// CLEANUP
// =============================================================================

export function disposeSFX(): void {
  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
}
