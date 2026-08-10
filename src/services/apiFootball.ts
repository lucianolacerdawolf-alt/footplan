// =============================================================================
// CLIENTE — API-Football (v3, via proxy Cloudflare Worker)
// =============================================================================
// Plano gratuito: 100 req/dia. Usado como fallback pra ligas que o football-data.org
// não cobre no tier gratuito (2ª divisões de Espanha, Alemanha, Itália, França, Portugal).
// Cache de 24h em localStorage pra não estourar o limite diário.
//
// Sempre passa pelo mesmo Worker proxy do football-data.org (worker/football-proxy.js,
// rota /api/rapidapi/apifootball/...) — nunca chama a RapidAPI direto do navegador. A chave
// (RAPIDAPI_KEY, a mesma da SportAPI7 — mesma conta RapidAPI) fica só no ambiente do Worker;
// sem proxy configurado, essa fonte simplesmente não fica disponível.

import type { RemoteTeam, RemotePlayer } from './footballApi';
import { fetchWithTimeout } from './http';
import { mapRemotePosition } from './positionMapping';

const CACHE_PREFIX = 'fp:apifootball:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// Versão do schema do cache — caches gravados por builds antigos são descartados
// por readCache (ver CACHE_VERSION em rosterSync.ts pra lógica equivalente).
const CACHE_VERSION = 1;

/** Liga interna → ID da liga na API-Football */
export const APIF_LEAGUE_IDS: Record<string, number> = {
  laliga2: 141,
  bundesliga2: 79,
  serieB: 136,
  ligue2: 62,
  ligaPortugal2: 95,
};

function getProxyBase(): string | null {
  const url = import.meta.env.VITE_FOOTBALL_PROXY_URL as string | undefined;
  if (!url || url.trim().length === 0) return null;
  return url.trim().replace(/\/$/, '');
}

/** Essa fonte só funciona através do proxy (ver cabeçalho do arquivo). */
export function hasApiFootballAccess(): boolean {
  return getProxyBase() !== null;
}

export function isApiFootballLeagueMapped(leagueId: string): boolean {
  return leagueId in APIF_LEAGUE_IDS;
}

/** Temporada europeia atual no formato que a API-Football espera (o ano em que ela COMEÇA —
 *  ex: temporada 2025/26 = 2025). Julho é aproximadamente quando o mercado de transferências
 *  e as pré-temporadas já apontam pro ano seguinte; antes disso, a temporada em andamento
 *  ainda é a do ano anterior. */
function currentSeasonYear(): number {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 6 ? year : year - 1; // getMonth() 0-indexado — 6 = julho
}

interface ApiPlayer {
  player: { id: number; name: string; age: number; nationality: string };
  statistics: Array<{
    team: { id: number; name: string };
    games: { position: string; number: number | null };
  }>;
}

interface ApiTeam {
  team: { id: number; name: string; code: string; logo: string };
  venue: { name: string; city: string };
}

interface CachedData {
  fetchedAt: number;
  teams: RemoteTeam[];
  version?: number;
}

function readCache(leagueId: string): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + leagueId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedData;
    if (!parsed.fetchedAt || Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    if (parsed.version !== CACHE_VERSION) return null;
    if (!Array.isArray(parsed.teams) || parsed.teams.length === 0) return null;
    return parsed;
  } catch { return null; }
}

function writeCache(leagueId: string, teams: RemoteTeam[]): void {
  try {
    localStorage.setItem(CACHE_PREFIX + leagueId, JSON.stringify({ fetchedAt: Date.now(), teams, version: CACHE_VERSION }));
  } catch { /* noop */ }
}

async function fetchAllPages(pathAndQuery: string, proxyBase: string): Promise<unknown[]> {
  const results: unknown[] = [];
  let page = 1;
  let totalPages = 1;
  const sep = pathAndQuery.includes('?') ? '&' : '?';

  while (page <= totalPages) {
    const res = await fetchWithTimeout(`${proxyBase}/api/rapidapi/apifootball/${pathAndQuery}${sep}page=${page}`);
    if (res.status === 429) throw new Error('Limite diário de requisições da API-Football atingido (100/dia).');
    if (!res.ok) throw new Error(`API-Football respondeu ${res.status}.`);
    const data = await res.json() as { paging: { current: number; total: number }; response: unknown[] };
    results.push(...data.response);
    totalPages = data.paging.total;
    page++;
  }
  return results;
}

/**
 * Busca times + jogadores de uma liga da API-Football.
 * Faz 1 chamada pra buscar os times + 1 chamada paginada pra buscar jogadores.
 * Retorna no mesmo formato RemoteTeam[] do football-data.org pra ser compatível com rosterSync.
 * `force`: ignora o cache de 24h desta fonte (mas ainda grava um novo no final).
 */
export async function fetchApiFootballLeague(leagueId: string, force = false): Promise<RemoteTeam[]> {
  const proxyBase = getProxyBase();
  if (!proxyBase) throw new Error('Proxy não configurado (VITE_FOOTBALL_PROXY_URL) — API-Football não funciona sem ele.');

  const leagueNum = APIF_LEAGUE_IDS[leagueId];
  if (!leagueNum) throw new Error(`Liga "${leagueId}" não mapeada na API-Football.`);

  if (!force) {
    const cached = readCache(leagueId);
    if (cached) return cached.teams;
  }

  const season = currentSeasonYear();

  // 1. Fetch teams
  const teamsData = await fetchAllPages(`teams?league=${leagueNum}&season=${season}`, proxyBase) as ApiTeam[];
  const teamMap = new Map<number, ApiTeam>();
  for (const t of teamsData) {
    teamMap.set(t.team.id, t);
  }

  // 2. Fetch players for the league (paginated)
  const playersData = await fetchAllPages(`players?league=${leagueNum}&season=${season}`, proxyBase) as ApiPlayer[];

  // 3. Group players by team
  const byTeam = new Map<number, RemotePlayer[]>();
  for (const ap of playersData) {
    // A API-Football retorna `statistics` como array — um jogador transferido no
    // meio da temporada tem múltiplas entradas (uma por clube). Pegar `[0]`
    // atribui ao clube ANTERIOR; o último entry é o clube mais recente (atual).
    // Ver repro-apifootball-stat0.test.ts.
    const stat = ap.statistics[ap.statistics.length - 1];
    if (!stat) continue;
    const teamId = stat.team.id;
    if (!byTeam.has(teamId)) byTeam.set(teamId, []);
    const rp: RemotePlayer = {
      id: ap.player.id,
      name: ap.player.name,
      position: mapRemotePosition(stat.games.position),
      dateOfBirth: null,
      nationality: ap.player.nationality ?? null,
      shirtNumber: stat.games.number ?? null,
    };
    byTeam.get(teamId)?.push(rp);
  }

  // 4. Build RemoteTeam[]
  const teams: RemoteTeam[] = [];
  for (const [teamId, squad] of byTeam) {
    const t = teamMap.get(teamId);
    if (!t) continue;
    teams.push({
      id: teamId,
      name: t.team.name,
      shortName: t.team.code ?? t.team.name.substring(0, 3).toUpperCase(),
      tla: t.team.code ?? '',
      crest: t.team.logo,
      squad,
    });
  }

  if (teams.length === 0) throw new Error('Nenhum time/jogador retornado pela API-Football pra essa liga/temporada.');

  writeCache(leagueId, teams);
  return teams;
}
