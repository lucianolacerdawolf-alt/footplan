import type { Player } from '../engine/types';

const WEIGHTS: Record<string, Record<string, number>> = {
  GK:  { speed: 0, stamina: 0, passing: 1.5, finishing: 0, tackling: 0, dribbling: 0, vision: 2.0, positioning: 4.0 },
  DEF: { speed: 1.8, stamina: 1.2, passing: 1.0, finishing: 0, tackling: 3.0, dribbling: 0, vision: 0, positioning: 2.5 },
  MID: { speed: 1.0, stamina: 1.2, passing: 2.5, finishing: 0, tackling: 0.8, dribbling: 1.8, vision: 2.5, positioning: 0 },
  FWD: { speed: 2.5, stamina: 0, passing: 0.8, finishing: 3.5, dribbling: 2.2, vision: 0, tackling: 0, positioning: 1.2 },
};

const SUBTYPE_WEIGHTS: Record<string, Record<string, number>> = {
  CB:  { speed: 1.2, stamina: 1.4, passing: 0.8, finishing: 0, tackling: 3.5, dribbling: 0, vision: 0, positioning: 3.0 },
  FB:  { speed: 2.8, stamina: 2.0, passing: 1.8, finishing: 0, tackling: 1.8, dribbling: 1.2, vision: 0, positioning: 1.0 },
  CDM: { speed: 0.8, stamina: 2.0, passing: 2.0, finishing: 0, tackling: 2.5, dribbling: 1.0, vision: 1.8, positioning: 1.5 },
  CM:  { speed: 1.0, stamina: 1.5, passing: 2.5, finishing: 0.5, tackling: 0.8, dribbling: 1.5, vision: 2.5, positioning: 0 },
  CAM: { speed: 1.2, stamina: 1.0, passing: 2.5, finishing: 1.5, dribbling: 2.0, vision: 3.0, tackling: 0, positioning: 0 },
  W:   { speed: 3.5, stamina: 1.0, passing: 1.5, finishing: 1.5, dribbling: 3.0, vision: 0, tackling: 0, positioning: 0 },
  ST:  { speed: 2.0, stamina: 0.8, passing: 0.5, finishing: 4.0, dribbling: 1.8, vision: 0, tackling: 0, positioning: 2.5 },
};

const TOTALS: Record<string, number> = {};
for (const [pos, w] of Object.entries({ ...WEIGHTS, ...SUBTYPE_WEIGHTS })) {
  TOTALS[pos] = Object.values(w).reduce((s, v) => s + v, 0);
}

// Bônus adicional pra jogadores de elite (inspirado na Reputação Internacional da EA):
// abaixo do limiar, o boost é o de sempre (*1.15+3) — não muda nada pra maioria dos
// jogadores, então não exige recalibrar generatePlayer()/calculateMarketValue(). Só quem
// já tem uma média ponderada muito alta (base > 78) ganha um extra, criando mais separação
// entre "muito bom" e "referência mundial" sem inflar ninguém no meio da tabela.
const ELITE_THRESHOLD = 78;
const ELITE_RATE = 0.4;
const ELITE_CAP = 6;

function eliteBonus(base: number): number {
  const excess = Math.max(0, base - ELITE_THRESHOLD);
  return Math.min(ELITE_CAP, excess * ELITE_RATE);
}

function computeOvr(a: Player['attributes'], weights: Record<string, number>, total: number): number {
  const sum =
    a.speed * (weights.speed ?? 0) +
    a.stamina * (weights.stamina ?? 0) +
    a.passing * (weights.passing ?? 0) +
    a.finishing * (weights.finishing ?? 0) +
    a.tackling * (weights.tackling ?? 0) +
    a.dribbling * (weights.dribbling ?? 0) +
    a.vision * (weights.vision ?? 0) +
    a.positioning * (weights.positioning ?? 0);
  const maxAttr = Math.max(
    a.speed, a.stamina, a.passing, a.finishing, a.tackling, a.dribbling, a.vision, a.positioning,
  );
  const base = sum / total;
  const boosted = base * 1.15 + 3 + eliteBonus(base);
  return Math.min(99, maxAttr, Math.round(boosted));
}

export function playerOvr(p: Player): number {
  const subtype = detectSubtype(p);
  const w = subtype ? (SUBTYPE_WEIGHTS[subtype] ?? WEIGHTS[p.position]) : (WEIGHTS[p.position] ?? WEIGHTS['MID']);
  const total = subtype ? (TOTALS[subtype] ?? TOTALS[p.position]) : (TOTALS[p.position] ?? TOTALS['MID']);
  return computeOvr(p.attributes, w, total);
}

/** Auto-detect the most likely subtype from the player's attributes.
 *  Uses FIFA-style heuristics: speed+dribbling → winger/fullback, tackling+positioning → CB/CDM, etc. */
function detectSubtype(p: Player): string | null {
  const { speed: sp, stamina: st, passing: pa, finishing: fi, tackling: ta, dribbling: dr, vision: vi, positioning: po } = p.attributes;

  switch (p.position) {
    case 'GK':
      return null;

    case 'DEF': {
      const fullbackScore = sp * 1.5 + dr * 1.2 + pa * 0.8 - ta * 0.5;
      const cbScore = ta * 1.5 + po * 1.2 - sp * 0.5;
      return fullbackScore > cbScore ? 'FB' : 'CB';
    }

    case 'MID': {
      const cdmScore = ta * 1.5 + po * 1.2 + st * 1.0 - (dr + fi) * 0.5;
      const camScore = vi * 1.5 + fi * 1.2 + dr * 1.0 - ta * 0.5;
      // Use thresholds: clearly defensive = CDM, clearly attacking = CAM, balanced = CM
      if (cdmScore > camScore + 5) return 'CDM';
      if (camScore > cdmScore + 5) return 'CAM';
      return 'CM';
    }

    case 'FWD': {
      const wingerScore = sp * 1.5 + dr * 1.3 + pa * 0.5 - po * 0.3;
      const strikerScore = fi * 1.5 + po * 1.3 - sp * 0.3;
      return wingerScore > strikerScore ? 'W' : 'ST';
    }

    default:
      return null;
  }
}

/** Calcula OVR usando pesos específicos do subtipo de posição (CB, FB, CDM, CM, CAM, W, ST).
 *  Fallback para os pesos padrão da posição se o subtipo não for reconhecido. */
export function playerOvrBySubtype(p: Player, subtype: string): number {
  const w = SUBTYPE_WEIGHTS[subtype] ?? WEIGHTS[p.position] ?? WEIGHTS['MID'];
  const total = TOTALS[subtype] ?? TOTALS[p.position] ?? TOTALS['MID'];
  return computeOvr(p.attributes, w, total);
}
