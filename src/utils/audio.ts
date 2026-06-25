/**
 * Geração de sons via Web Audio API (sem arquivos externos).
 * Toques curtos pra apito, gol e fim de jogo.
 */

let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15, startDelay = 0) {
  const ac = getCtx();
  if (!ac || !enabled) return;
  const t0 = ac.currentTime + startDelay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sfx = {
  whistleStart() {
    tone(1800, 0.25, 'square', 0.18);
    tone(1800, 0.15, 'square', 0.15, 0.3);
  },
  whistleEnd() {
    tone(1800, 0.2, 'square', 0.18);
    tone(1800, 0.2, 'square', 0.18, 0.25);
    tone(1800, 0.6, 'square', 0.2, 0.5);
  },
  goal() {
    tone(523, 0.12, 'triangle', 0.18);
    tone(659, 0.12, 'triangle', 0.18, 0.13);
    tone(784, 0.25, 'triangle', 0.2, 0.26);
  },
  toast() {
    tone(880, 0.08, 'sine', 0.1);
  },
  setEnabled(v: boolean) { enabled = v; },
  isEnabled() { return enabled; },
};
