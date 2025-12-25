/**
 * SFX Manager
 * Procedural sound effects using Web Audio API
 * Lightweight - no audio files needed
 */

import { createLogger } from './logger';

const log = createLogger('SFXManager');

// Singleton audio context (shared with Phaser's WebAudio)
let audioContext: AudioContext | null = null;

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
// White noise burst with low frequency thud
// =============================================================================

export function playDiceRollSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Create white noise for the "rattle" effect
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * 0.3;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  // Bandpass filter to make it sound more like dice
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.Q.value = 1;

  // Envelope for noise
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.25, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

  noiseSource.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  // Low thud oscillator
  const thud = ctx.createOscillator();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(150, now);
  thud.frequency.exponentialRampToValueAtTime(60, now + 0.08);

  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(0.2, now);
  thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

  thud.connect(thudGain);
  thudGain.connect(ctx.destination);

  // Play
  noiseSource.start(now);
  thud.start(now);
  noiseSource.stop(now + 0.15);
  thud.stop(now + 0.1);
}

// =============================================================================
// SCORE CONFIRM SOUND
// Quick ascending two-note "success" chime
// =============================================================================

export function playScoreConfirmSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Two ascending notes (C5 -> E5)
  const notes = [523.25, 659.25]; // C5, E5
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
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // C major chord arpeggio (C4 -> E4 -> G4 -> C5)
  const notes = [261.63, 329.63, 392.00, 523.25];
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
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Triumphant fanfare: ascending then resolving chord
  // G4 -> C5 -> E5 -> G5 (hold) + final C major chord
  const fanfareNotes = [
    { freq: 392.00, start: 0, duration: 0.15 },     // G4
    { freq: 523.25, start: 0.12, duration: 0.15 },  // C5
    { freq: 659.25, start: 0.24, duration: 0.15 },  // E5
    { freq: 783.99, start: 0.36, duration: 0.4 },   // G5 (hold)
  ];

  // Final chord (C major) - plays with the held G5
  const chordNotes = [
    { freq: 261.63, start: 0.5, duration: 0.5 },  // C4
    { freq: 329.63, start: 0.5, duration: 0.5 },  // E4
    { freq: 523.25, start: 0.5, duration: 0.5 },  // C5
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
