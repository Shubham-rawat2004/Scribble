/**
 * SoundEffects Service
 * Web Audio API synthesizer for zero-latency, asset-free sound effects matching authentic Skribbl.io.
 * Includes countdown ticking, urgency pitch shifts, round announcement chimes, and timer expiration buzzer.
 */

class SoundEffectsService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private lastTickedSecond: number | null = null;

  constructor() {
    // Read persisted sound preference from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('skribbl_sound_enabled');
      this.soundEnabled = saved !== 'false';
    }
  }

  /**
   * Lazily initializes or resumes AudioContext upon user interaction
   * (conforms to browser autoplay policies).
   */
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('skribbl_sound_enabled', enabled ? 'true' : 'false');
    }
    if (!enabled) {
      this.stopClockTick();
    }
  }

  public toggleSound(): boolean {
    this.setEnabled(!this.soundEnabled);
    return this.soundEnabled;
  }

  /**
   * Plays an authentic mechanical clock tick during the last 10 seconds.
   * Shifts pitch higher during the final 3 seconds (3, 2, 1) for urgency.
   * Guaranteed: Never overlaps, never plays twice for the same second.
   */
  public playClockTick(secondsLeft: number): void {
    if (!this.soundEnabled) return;
    if (this.lastTickedSecond === secondsLeft) return; // Prevent duplicate triggers for the same second
    this.lastTickedSecond = secondsLeft;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Higher pitch for urgent final 3 seconds (authentic countdown urgency)
      let baseFreq = 850;
      if (secondsLeft === 3) baseFreq = 1100;
      else if (secondsLeft === 2) baseFreq = 1300;
      else if (secondsLeft === 1) baseFreq = 1500;

      // Oscillator for crisp clock click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      // Pitch drop creates a sharp physical "click"
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + 0.04);

      // Fast exponential decay envelope
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.055);
    } catch {
      // Audio playback fails gracefully if tab is not active
    }
  }

  /**
   * Immediately terminates clock ticking when the round/turn ends or all players guess.
   */
  public stopClockTick(): void {
    this.lastTickedSecond = null;
  }

  /**
   * Melodic 2-tone chime when a new Round announcement popup appears (e.g. Round 1, Round 2).
   */
  public playRoundStartChime(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Tone 1: C5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Tone 2: G5 (783.99 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.12);
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);
    } catch {
      // Safe fallback
    }
  }

  /**
   * Subtle buzzer sound when countdown timer hits 0.
   */
  public playTimeUpSound(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Safe fallback
    }
  }
}

export const soundEffects = new SoundEffectsService();
