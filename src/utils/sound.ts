let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playTone(freq: number, duration = 0.14, type: OscillatorType = 'sine', volume = 0.05, delay = 0): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playDiscoverChime(): void {
  playTone(587.33, 0.16, 'triangle', 0.055, 0);
  playTone(880, 0.22, 'sine', 0.045, 0.06);
}

export function playSnapSound(): void {
  playTone(392, 0.12, 'triangle', 0.06, 0);
  playTone(523.25, 0.18, 'sine', 0.05, 0.05);
}

export function playCompletionChord(): void {
  playTone(392.0, 0.45, 'sine', 0.05, 0);
  playTone(493.88, 0.45, 'sine', 0.045, 0.09);
  playTone(587.33, 0.55, 'sine', 0.05, 0.18);
  playTone(783.99, 0.75, 'triangle', 0.05, 0.28);
}

export function playEnvelopeOpenSound(): void {
  playTone(440, 0.25, 'sine', 0.045, 0);
  playTone(554.37, 0.3, 'sine', 0.045, 0.08);
  playTone(659.25, 0.45, 'triangle', 0.045, 0.16);
}
