// =============================================================================
// SINCRONIZAÇÃO DE ELENCO — mescla dados ao vivo do football-data.org com os
// times estáticos hardcoded (src/data/leagues), sem nunca deixar o app sem dados.
// =============================================================================
//
// Como funciona:
// 1. Cache local (7 dias) evita bater na API toda vez e respeita o limite de 10 req/min
//    do tier gratuito.
// 2. Sem chave configurada, API fora do ar, ou qualquer erro → cai de volta pros dados
//    estáticos atuais (offline-first — o PWA precisa funcionar sem rede).
// 3. Times são casados por nome (não há um id em comum entre as duas fontes). Jogadores
//    já conhecidos mantêm os atributos calibrados; jogadores novos (transferências) ganham
//    atributos sintéticos calibrados pro OVR médio do time (generateTeam.ts, Fase 1.3).
// 4. Jogadores que saíram do elenco ao vivo (aposentadoria, transferência, ou— o caso que
//    motivou isso — o falecimento do Diogo Jota) simplesmente não aparecem mais: a lista
//    de partida é o próprio elenco ao vivo, não precisa de nenhum caso especial.

import type { Team, Player, Position } from '../engine/types';
import type { LeagueDefinition } from '../data/leagues/types';
import { fetchCompetitionTeams, hasApiKey, FootballApiError, type RemoteTeam, type RemotePlayer } from './footballApi';
import { generatePlayer } from '../data/leagues/generateTeam';
import { playerOvr } from '../utils/playerOvr';

const CACHE_PREFIX = 'fp:rosterCache:';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

interface CachedRoster {
  fetchedAt: number;
  teams: Team[];
}

/** Remove acentos (via decomposição NFD + filtro de marcas combinantes U+0300-U+036F) e
 *  qualquer caractere que não seja letra/número, pra comparar nomes vindos de fontes
 *  diferentes ("São Paulo" vs "Sao Paulo") sem falso-negativo. */
function normalizeName(name: string): string {
  const decomposed = name.toLowerCase().normalize('NFD');
  let stripped = '';
  for (const ch of decomposed) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x0300 && code <= 0x036f) continue; // marca combinante (acento)
    stripped += ch;
  }
  return stripped.replace(/[^a-z0-9]/g, '');
}

function mapPosition(remote: string | null): Position {
  if (!remote) return 'MID';
  const p = remote.toLowerCase();
  if (p.includes('keeper')) return 'GK';
  if (p.includes('defen') || p.includes('back')) return 'DEF';
  if (p.includes('midfield')) return 'MID';
  return 'FWD';
}

function ageFromDob(dateOfBirth: string | null): number | undefined {
  if (!dateOfBirth) return undefined;
  try {
    const birth = new Date(dateOfBirth);
    if (isNaN(birth.getTime())) return undefined;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  } catch { return undefined; }
}

/**
 * Pontua o quão confiável é casar um time estático com um time remoto — não é booleano
 * porque nome curto de clube (ex: "Barcelona") pode aparecer como SUBSTRING do nome
 * oficial completo de um clube TOTALMENTE diferente (ex: "RCD Espanyol de Barcelona",
 * que contém a cidade "Barcelona" no nome) — testado e confirmado esse falso positivo
 * contra dados reais da API antes dessa função existir. Pontuação maior = mais confiável;
 * a montagem final (buildRosterAssignments) resolve os casos de maior confiança primeiro
 * e "reserva" o time remoto, então um match fraco não pode roubar um time já resolvido
 * por um match forte de outro time estático.
 */
function scoreMatch(t: Team, remote: RemoteTeam): number {
  const tKey = normalizeName(t.name);
  const tAbbr = normalizeName(t.abbreviation);
  const rName = normalizeName(remote.name);
  const rShort = normalizeName(remote.shortName ?? '');
  const rTla = normalizeName(remote.tla ?? '');

  if (tKey === rName) return 100;
  if (tKey === rShort) return 95;

  // Sigla batendo sozinha não basta — siglas de 3 letras colidem por coincidência entre
  // clubes diferentes (ex: "MAL" = Mallorca pra gente, mas = Málaga pra API numa
  // temporada em que o Mallorca nem está mais na 1ª divisão). Exige também alguma
  // sobreposição de nome pra confirmar.
  const abbrMatches = !!tAbbr && !!rTla && tAbbr === rTla;
  const nameOverlaps = rName.includes(tKey) || tKey.includes(rName) || rShort.includes(tKey) || tKey.includes(rShort);
  if (abbrMatches && nameOverlaps) return 85;

  // Fallback por substring, em ambas direções, contra nome completo E nome curto —
  // pontuação maior quanto mais "apertada" (próxima em tamanho) a correspondência, pra
  // preferir o candidato mais específico quando várias opções contêm a mesma palavra.
  let best = 0;
  const pairs: Array<[string, string]> = [[rName, tKey], [tKey, rName], [rShort, tKey], [tKey, rShort]];
  for (const [container, needle] of pairs) {
    if (needle.length > 3 && container.length > 3 && container.includes(needle)) {
      const tightness = 60 - Math.abs(container.length - needle.length);
      best = Math.max(best, tightness);
    }
  }
  return best;
}

/**
 * Resolve qual time remoto vai pra cada time estático — processa os pares em ordem de
 * confiança decrescente e "reserva" cada time remoto assim que usado, pra um match fraco
 * não roubar um time já corretamente identificado por um match forte (ver scoreMatch).
 */
function assignRemoteTeams(staticTeams: Team[], remoteTeams: RemoteTeam[]): Map<string, RemoteTeam> {
  const candidates: Array<{ staticId: string; remote: RemoteTeam; score: number }> = [];
  for (const t of staticTeams) {
    for (const rt of remoteTeams) {
      const score = scoreMatch(t, rt);
      if (score > 0) candidates.push({ staticId: t.id, remote: rt, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const assignments = new Map<string, RemoteTeam>();
  const usedRemoteIds = new Set<number>();
  for (const c of candidates) {
    if (assignments.has(c.staticId) || usedRemoteIds.has(c.remote.id)) continue;
    assignments.set(c.staticId, c.remote);
    usedRemoteIds.add(c.remote.id);
  }
  return assignments;
}

export interface MergeStats {
  teamId: string;
  teamName: string;
  matched: number;
  added: number;
  removed: number;
}

function mergeTeamRoster(staticTeam: Team, remoteSquad: RemotePlayer[]): { team: Team; stats: MergeStats } {
  const byName = new Map(staticTeam.squad.map(p => [normalizeName(p.name), p]));
  let matched = 0;
  let added = 0;

  const starterSample = staticTeam.squad.slice(0, Math.min(11, staticTeam.squad.length));
  const targetOvr = starterSample.length > 0
    ? Math.round(starterSample.reduce((s, p) => s + playerOvr(p), 0) / starterSample.length)
    : 70;

  const grouped: Record<Position, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  remoteSquad.forEach((rp, i) => {
    const position = mapPosition(rp.position);
    const age = ageFromDob(rp.dateOfBirth);
    const existing = byName.get(normalizeName(rp.name));
    if (existing) {
      matched++;
      const updated = { ...existing, name: rp.name, position, number: rp.shirtNumber ?? existing.number };
      if (age !== undefined) updated.age = age;
      if (rp.nationality) updated.nationality = rp.nationality;
      grouped[position].push(updated);
    } else {
      added++;
      const generated = generatePlayer(`${staticTeam.id}-live-${rp.id}`, rp.name, rp.shirtNumber ?? (90 + i), position, targetOvr, age);
      if (rp.nationality) generated.nationality = rp.nationality;
      grouped[position].push(generated);
    }
  });

  const remoteNames = new Set(remoteSquad.map(rp => normalizeName(rp.name)));
  const removed = staticTeam.squad.filter(p => !remoteNames.has(normalizeName(p.name))).length;

  const squad = [...grouped.GK, ...grouped.DEF, ...grouped.MID, ...grouped.FWD];

  return {
    // Só substitui o elenco se a API realmente devolveu jogadores pra esse time — um
    // elenco vazio nunca deve sobrescrever o estático.
    team: squad.length > 0 ? { ...staticTeam, squad } : staticTeam,
    stats: { teamId: staticTeam.id, teamName: staticTeam.name, matched, added, removed },
  };
}

function readCache(leagueId: string): CachedRoster | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + leagueId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRoster;
    if (!parsed.fetchedAt || Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    if (!Array.isArray(parsed.teams) || parsed.teams.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(leagueId: string, teams: Team[]): void {
  try {
    const payload: CachedRoster = { fetchedAt: Date.now(), teams };
    localStorage.setItem(CACHE_PREFIX + leagueId, JSON.stringify(payload));
  } catch { /* noop — quota cheia ou storage indisponível, não é crítico */ }
}

export type RosterSource = 'cache' | 'live' | 'static' | 'error';

export interface RosterSyncResult {
  league: LeagueDefinition;
  source: RosterSource;
  stats: MergeStats[];
  error?: string;
}

/**
 * Sincroniza o elenco de uma liga com dados ao vivo. SEMPRE retorna uma LeagueDefinition
 * utilizável — na pior das hipóteses (sem chave, API fora, sem rede), retorna a `league`
 * estática recebida sem modificação nenhuma.
 */
export async function syncLeagueRoster(league: LeagueDefinition, opts?: { force?: boolean }): Promise<RosterSyncResult> {
  if (!opts?.force) {
    const cached = readCache(league.id);
    if (cached) {
      return { league: { ...league, teams: cached.teams }, source: 'cache', stats: [] };
    }
  }

  if (!hasApiKey()) {
    return { league, source: 'static', stats: [], error: 'Nenhuma chave de API configurada (defina VITE_FOOTBALL_API_KEY no .env).' };
  }

  let remoteTeams: RemoteTeam[];
  try {
    remoteTeams = await fetchCompetitionTeams(league.id);
  } catch (err) {
    const message = err instanceof FootballApiError ? err.message : (err as Error).message;
    return { league, source: 'error', stats: [], error: message };
  }

  const assignments = assignRemoteTeams(league.teams, remoteTeams);
  const stats: MergeStats[] = [];
  const mergedTeams = league.teams.map(staticTeam => {
    const remote = assignments.get(staticTeam.id);
    if (!remote) return staticTeam;
    const { team, stats: teamStats } = mergeTeamRoster(staticTeam, remote.squad);
    stats.push(teamStats);
    // Fill logoUrl from API if the static team has no logo
    if (!team.logoUrl && remote.crest) {
      team.logoUrl = remote.crest;
    }
    return team;
  });

  writeCache(league.id, mergedTeams);
  return { league: { ...league, teams: mergedTeams }, source: 'live', stats };
}

export function clearRosterCache(leagueId?: string): void {
  try {
    if (leagueId) { localStorage.removeItem(CACHE_PREFIX + leagueId); return; }
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
    }
  } catch { /* noop */ }
}
