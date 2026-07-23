import type { Mentality, Intensity, DefensiveLine, Width } from './types';

export interface TacticPreset {
  id: string;
  label: string;
  icon: string;
  mentality: Mentality;
  intensity: Intensity;
  defensiveLine: DefensiveLine;
  width: Width;
}

// Deixa a formação de fora do preset (não mexe no elenco/rebalanceamento) — só os 4
// parâmetros que afetam o comportamento tático.
export const TACTIC_PRESETS: TacticPreset[] = [
  { id: 'offensive', label: 'Ofensivo', icon: '🔥', mentality: 'high-press', intensity: 'high', defensiveLine: 'high', width: 'wide' },
  { id: 'balanced', label: 'Equilibrado', icon: '⚖️', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  { id: 'defensive', label: 'Defensivo', icon: '🛡️', mentality: 'defensive', intensity: 'low', defensiveLine: 'low', width: 'narrow' },
];
