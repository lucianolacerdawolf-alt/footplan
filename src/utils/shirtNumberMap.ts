import type { Team } from '../engine/types';

// =============================================================================
// Números de camisa vindos da Wikipedia
// =============================================================================
// A fonte principal dos elencos (football-data.org) não manda o número da camisa e as
// fontes que mandam (SportAPI7, API-Football) estão sem cota/assinatura. As páginas dos
// clubes na Wikipedia trazem o elenco atual com os números ({{Fs player|no=…}}).
// `npm run shirts:fetch` gera src/data/shirtNumbers.json; o `rosters:sync` aplica ao
// publicar o snapshot. Casamento por nome normalizado (sem acento/pontuação).

export interface ShirtNumberTeam {
  /** Título do artigo da Wikipedia usado (pra auditoria). */
  source: string;
  /** nome normalizado → número */
  players: Record<string, number>;
}

export interface ShirtNumberMap {
  updatedAt: string;
  /** leagueId → teamId → números */
  leagues: Record<string, Record<string, ShirtNumberTeam>>;
}

const SPECIAL: Record<string, string> = { 'ø': 'o', 'æ': 'ae', 'å': 'a', 'ß': 'ss', 'ł': 'l', 'đ': 'd', 'ð': 'd', 'þ': 'th', 'ı': 'i', 'œ': 'oe' };

export function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[øæåßłđðþıœ]/g, c => SPECIAL[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Número do jogador no mapa do time: nome completo, depois sobrenome único, depois
 *  "primeiro + último" (nomes do meio somem entre fontes). */
export function lookupShirtNumber(team: ShirtNumberTeam, playerName: string): number | null {
  const n = normalizePlayerName(playerName);
  if (team.players[n] != null) return team.players[n];
  const parts = n.split(' ');
  const first = parts[0];
  const last = parts[parts.length - 1];
  const entries = Object.entries(team.players);
  const fl = entries.filter(([k]) => { const p = k.split(' '); return p[0] === first && p[p.length - 1] === last; });
  if (fl.length === 1) return fl[0][1];
  const byLast = entries.filter(([k]) => k.split(' ').pop() === last);
  if (byLast.length === 1 && last.length >= 3) return byLast[0][1];
  // Nome único (ex.: "Rodri", "Pedri") contra "Rodrigo Hernández" não casa — melhor
  // ficar sem número do que errar.
  const single = entries.filter(([k]) => k === last || k.split(' ').includes(n));
  return single.length === 1 && n.length >= 4 ? single[0][1] : null;
}

/** Aplica os números conhecidos aos times de uma liga. Quem não casar mantém o que tinha
 *  (número real de outra fonte ou 0 = desconhecido). Repetido dentro do time fica 0. */
export function applyShirtNumberMap(teams: Team[], league: Record<string, ShirtNumberTeam> | undefined): Team[] {
  if (!league) return teams;
  return teams.map(t => {
    const map = league[t.id];
    if (!map) return t;
    // Número vindo da Wikipedia tem prioridade; quem não casou só mantém o seu se não
    // bater com um número já confirmado (senão vira 0 = desconhecido).
    const matched = t.squad.map(p => lookupShirtNumber(map, p.name));
    const confirmed = new Set(matched.filter((n): n is number => n != null));
    const used = new Set<number>();
    const squad = t.squad.map((p, i) => {
      const n = matched[i];
      if (n != null && !used.has(n)) { used.add(n); return n === p.number ? p : { ...p, number: n }; }
      const keep = p.number >= 1 && p.number <= 99 && !confirmed.has(p.number) && !used.has(p.number);
      if (keep) { used.add(p.number); return p; }
      return p.number === 0 ? p : { ...p, number: 0 };
    });
    return { ...t, squad };
  });
}

/** Tira [[link|texto]] → texto e {{templates}} simples. */
function cleanName(raw: string): string {
  return raw
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/** Extrai { nome normalizado → número } dos {{Fs player}} do wikitext. */
export function parseSquad(wikitext: string): Record<string, number> {
  const players: Record<string, number> = {};
  const re = /\{\{\s*(?:[Ff]s player|[Ff]ootball squad player)\s*\|((?:[^{}]|\{\{[^{}]*\}\})*)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(wikitext))) {
    const body = m[1];
    const no = /(?:^|\|)\s*no\s*=\s*(\d{1,2})\s*(?=\||$)/.exec(body)?.[1];
    const name = /(?:^|\|)\s*name\s*=\s*((?:\[\[[^\]]*\]\]|[^|])*)/.exec(body)?.[1];
    if (!no || !name) continue;
    const key = normalizePlayerName(cleanName(name));
    if (key && players[key] == null) players[key] = Number(no);
  }
  return players;
}
