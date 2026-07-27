let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch { return null; }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.08): void {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function playWhistle(): void {
  playTone(800, 0.15, 'square', 0.06);
  setTimeout(() => playTone(1000, 0.1, 'square', 0.04), 150);
}

export function playGoal(): void {
  const ctx = getCtx();
  if (!ctx) return;
  // Short ascending arpeggio
  [523, 659, 784, 1047].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.12, 'square', 0.07), i * 80);
  });
}

export function playFullTime(): void {
  playTone(600, 0.2, 'triangle', 0.06);
  setTimeout(() => playTone(800, 0.25, 'triangle', 0.06), 200);
  setTimeout(() => playTone(600, 0.2, 'triangle', 0.06), 450);
}

export function playCard(): void {
  playTone(200, 0.08, 'square', 0.04);
}
