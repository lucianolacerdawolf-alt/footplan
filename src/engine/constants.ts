import type { Formation, Mentality, Intensity, DefensiveLine, Width } from './types';

export const FORMATIONS: Formation[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2', '3-4-3', '4-1-4-1', '4-4-1-1', '3-4-2-1', '4-3-1-2', '5-4-1'];
export const MENTALITIES: Mentality[] = ['possession', 'counter-attack', 'high-press', 'defensive'];
export const INTENSITIES: Intensity[] = ['low', 'medium', 'high'];
export const DEF_LINES: DefensiveLine[] = ['high', 'normal', 'low'];
export const WIDTHS: Width[] = ['narrow', 'normal', 'wide'];

export const FORMATION_COUNTS: Record<Formation, { GK: number; DEF: number; MID: number; FWD: number }> = {
  '4-3-3':   { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  '4-4-2':   { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  '3-5-2':   { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  '4-2-3-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  '5-3-2':   { GK: 1, DEF: 5, MID: 3, FWD: 2 },
  '3-4-3':   { GK: 1, DEF: 3, MID: 4, FWD: 3 },
  '4-1-4-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  '4-4-1-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  '3-4-2-1': { GK: 1, DEF: 3, MID: 6, FWD: 1 },
  '4-3-1-2': { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  '5-4-1':   { GK: 1, DEF: 5, MID: 4, FWD: 1 },
};
