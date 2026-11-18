import type { Player, Team } from '../engine/types';

/**
 * Números de camisa válidos (1–99) e sem repetição. Jogador sem número na API ganhava
 * "90 + posição na lista" (#116, #117…); repetidos também acontecem entre fontes. Quem
 * já tem número válido e único mantém; o resto pega o primeiro livre.
 */
export function normalizeShirtNumbers(squad: Player[]): Player[] {
  const used = new Set<number>();
  // O sync antigo numerava "90 + posição" — 3+ jogadores na faixa 90–99 no mesmo
  // elenco é sinal disso (no futebol real é raríssimo); esses também são renumerados.
  const generated = squad.filter(p => p.number >= 90).length >= 3;
  const keep = squad.map(p => {
    const ok = Number.isInteger(p.number) && p.number >= 1 && p.number <= (generated ? 89 : 99) && !used.has(p.number);
    if (ok) used.add(p.number);
    return ok;
  });
  let next = 1;
  return squad.map((p, i) => {
    if (keep[i]) return p;
    while (used.has(next) && next < 99) next++;
    used.add(next);
    return { ...p, number: next };
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
