import type { Player, Team } from '../engine/types';

/** 0 = número desconhecido. A fonte principal dos elencos (football-data.org) não manda o
 *  número da camisa; antes o sync inventava "90 + posição" (#109 pro Gyökeres) e depois
 *  uma correção trocava isso pelo 1º número livre (Konsa com a 1). Os dois estavam
 *  errados — agora o jogo só mostra número quando ele é real. */
export const UNKNOWN_SHIRT = 0;

export function hasShirtNumber(p: Pick<Player, 'number'>): boolean {
  return Number.isInteger(p.number) && p.number >= 1 && p.number <= 99;
}

/** "#7" quando o número é conhecido; "" quando não é. */
export function shirtTag(p: Pick<Player, 'number'>): string {
  return hasShirtNumber(p) ? `#${p.number}` : '';
}

/** Rótulo pra bolinha do campinho: o número ou, sem ele, a inicial do sobrenome. */
export function shirtBadge(p: Pick<Player, 'number' | 'name'>): string {
  if (hasShirtNumber(p)) return String(p.number);
  const parts = p.name.trim().split(/\s+/);
  return (parts[parts.length - 1]?.[0] ?? '?').toUpperCase();
}

/**
 * Números de camisa reais e sem repetição. Fora de 1–99, repetido, ou da faixa 90–99
 * gerada pelo sync antigo (3+ no mesmo elenco = "90 + posição") vira desconhecido (0).
 */
export function normalizeShirtNumbers(squad: Player[]): Player[] {
  const used = new Set<number>();
  const generated = squad.filter(p => p.number >= 90).length >= 3;
  return squad.map(p => {
    const ok = hasShirtNumber(p) && (!generated || p.number < 90) && !used.has(p.number);
    if (ok) { used.add(p.number); return p; }
    return p.number === UNKNOWN_SHIRT ? p : { ...p, number: UNKNOWN_SHIRT };
  });
}

/** Aplica normalizeShirtNumbers em cada time; devolve o MESMO array se nada mudou. */
export function normalizeTeamsShirtNumbers(teams: Team[]): Team[] {
  let changed = false;
  const out = teams.map(t => {
    const squad = normalizeShirtNumbers(t.squad);
    if (squad.some((p, i) => p !== t.squad[i])) { changed = true; return { ...t, squad }; }
    return t;
  });
  return changed ? out : teams;
}

/** Copia os números dos elencos atualizados pros mesmos jogadores (mesmo id) de outra
 *  lista de times — conserta carreiras salvas que ficaram com números inventados. */
export function copyShirtNumbers(teams: Team[], source: Team[]): Team[] {
  const byId = new Map<string, number>();
  for (const t of source) for (const p of t.squad) byId.set(p.id, p.number);
  let changed = false;
  const out = teams.map(t => {
    let teamChanged = false;
    const squad = t.squad.map(p => {
      const n = byId.get(p.id);
      if (n === undefined || n === p.number) return p;
      teamChanged = true;
      return { ...p, number: n };
    });
    if (!teamChanged) return t;
    changed = true;
    return { ...t, squad };
  });
  return changed ? out : teams;
}
