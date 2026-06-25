let ctx: AudioContext | null = null;
let enabled = true;
let murmurGain: GainNode | null = null;
let murmurSource: AudioBufferSourceNode | null = null;

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

function noiseBuffer(durationSec: number): AudioBuffer | null {
  const ac = getCtx();
  if (!ac) return null;
  const sr = ac.sampleRate;
  const len = Math.floor(sr * durationSec);
  const buf = ac.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function playNoise(
  duration: number, volume: number,
  filterType: BiquadFilterType, filterFreq: number, filterQ = 1,
  rampUp = 0.3, rampDown = 0.5
) {
  const ac = getCtx();
  if (!ac || !enabled) return;
  const buf = noiseBuffer(duration);
  if (!buf) return;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const gain = ac.createGain();
  const filter = ac.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreq, ac.currentTime);
  filter.Q.setValueAtTime(filterQ, ac.currentTime);
  const t0 = ac.currentTime;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + rampUp);
  gain.gain.setValueAtTime(volume, t0 + duration - rampDown);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.05);
}

function startMurmur() {
  const ac = getCtx();
  if (!ac || !enabled) return;
  if (murmurSource) return; // already playing
  const buf = noiseBuffer(4);
  if (!buf) return;
  murmurSource = ac.createBufferSource();
  murmurSource.buffer = buf;
  murmurSource.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(500, ac.currentTime);
  murmurGain = ac.createGain();
  murmurGain.gain.setValueAtTime(0.03, ac.currentTime);
  murmurSource.connect(filter).connect(murmurGain).connect(ac.destination);
  murmurSource.start();
}

function stopMurmur() {
  if (murmurSource) {
    try { murmurSource.stop(); } catch { /* noop */ }
    murmurSource.disconnect();
    murmurSource = null;
  }
  murmurGain = null;
}

function ensureMurmur() {
  if (!murmurSource) startMurmur();
}

export const sfx = {
  whistleStart() {
    tone(1800, 0.25, 'square', 0.18);
    tone(1800, 0.15, 'square', 0.15, 0.3);
  },
  whistleEnd() {
    stopMurmur();
    tone(1800, 0.2, 'square', 0.18);
    tone(1800, 0.2, 'square', 0.18, 0.25);
    tone(1800, 0.6, 'square', 0.2, 0.5);
  },
  goal() {
    tone(523, 0.12, 'triangle', 0.18);
    tone(659, 0.12, 'triangle', 0.18, 0.13);
    tone(784, 0.25, 'triangle', 0.2, 0.26);
    playNoise(1.2, 0.20, 'bandpass', 800, 0.8, 0.05, 0.6);
  },
  crowdMurmur() {
    ensureMurmur();
  },
  nearMiss() {
    playNoise(0.35, 0.08, 'highpass', 1500, 2, 0.02, 0.15);
  },
  foulWhistle() {
    tone(1600, 0.12, 'square', 0.14);
  },
  cardReaction() {
    playNoise(0.5, 0.06, 'bandpass', 600, 1.5, 0.03, 0.3);
  },
  postHit() {
    tone(200, 0.1, 'triangle', 0.12);
    playNoise(0.3, 0.05, 'highpass', 2000, 3, 0.01, 0.15);
  },
  toast() {
    tone(880, 0.08, 'sine', 0.1);
  },
  setEnabled(v: boolean) { enabled = v; },
  isEnabled() { return enabled; },
};
