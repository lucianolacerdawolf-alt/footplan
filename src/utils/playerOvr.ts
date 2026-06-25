import type { Player } from '../engine/types';

const WEIGHTS: Record<string, Record<string, number>> = {
  GK:  { speed: 0, stamina: 1.0, passing: 1.5, finishing: 0, tackling: 0, dribbling: 0, vision: 2.0, positioning: 4.0 },
  DEF: { speed: 1.8, stamina: 1.2, passing: 1.0, finishing: 0, tackling: 3.0, dribbling: 0, vision: 0, positioning: 2.5 },
  MID: { speed: 1.0, stamina: 1.2, passing: 2.5, finishing: 0, tackling: 0.8, dribbling: 1.8, vision: 2.5, positioning: 0 },
  FWD: { speed: 2.5, stamina: 0, passing: 0.8, finishing: 3.5, dribbling: 2.2, vision: 0, tackling: 0, positioning: 1.2 },
};

const TOTALS: Record<string, number> = {};
for (const [pos, w] of Object.entries(WEIGHTS)) {
  TOTALS[pos] = Object.values(w).reduce((s, v) => s + v, 0);
}

export function playerOvr(p: Player): number {
  const w = WEIGHTS[p.position] ?? WEIGHTS['MID'];
  const total = TOTALS[p.position] ?? TOTALS['MID'];
  const a = p.attributes;
  const sum =
    a.speed * (w.speed ?? 0) +
    a.stamina * (w.stamina ?? 0) +
    a.passing * (w.passing ?? 0) +
    a.finishing * (w.finishing ?? 0) +
    a.tackling * (w.tackling ?? 0) +
    a.dribbling * (w.dribbling ?? 0) +
    a.vision * (w.vision ?? 0) +
    a.positioning * (w.positioning ?? 0);
  return Math.round(sum / total);
}
