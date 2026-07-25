// =============================================================================
// CLIENTE — API-Football (v3 via RapidAPI)
// =============================================================================
// Plano gratuito: 100 req/dia. Usado como fallback pra ligas que o football-data.org
// não cobre no tier gratuito (2ª divisões de Espanha, Alemanha, Itália, França, Portugal).
// Cache de 24h em localStorage pra não estourar o limite diário.

import type { RemoteTeam, RemotePlayer } from './footballApi';
import type { Position } from '../engine/types';

const API_BASE = 'https://api-football-v1.p.rapidapi.com/v3';
const CACHE_PREFIX = 'fp:apifootball:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Liga interna → ID da liga na API-Football */
export const APIF_LEAGUE_IDS: Record<string, number> = {
  laliga2: 141,
  bundesliga2: 79,
  serieB: 136,
  ligue2: 62,
  ligaPortugal2: 95,
};

function getApiKey(): string | null {
  const key = import.meta.env.VITE_RAPIDAPI_KEY as string | undefined;
  return key && key.trim().length > 0 ? key.trim() : null;
}

export function hasRapidApiKey(): boolean {
  return getApiKey() !== null;
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

function mapPosition(apiPos: string): Position {
  const p = apiPos.toLowerCase();
  if (p.includes('goalkeeper')) return 'GK';
  if (p.includes('defender')) return 'DEF';
  if (p.includes('midfielder')) return 'MID';
  return 'FWD';
}

interface CachedData {
  fetchedAt: number;
  teams: RemoteTeam[];
}

function readCache(leagueId: string): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + leagueId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedData;
    if (!parsed.fetchedAt || Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    if (!Array.isArray(parsed.teams) || parsed.teams.length === 0) return null;
    return parsed;
  } catch { return null; }
}

function writeCache(leagueId: string, teams: RemoteTeam[]): void {
  try {
    localStorage.setItem(CACHE_PREFIX + leagueId, JSON.stringify({ fetchedAt: Date.now(), teams }));
  } catch { /* noop */ }
}

async function fetchAllPages(url: string, apiKey: string): Promise<unknown[]> {
  const results: unknown[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const res = await fetch(`${url}&page=${page}`, {
      headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'api-football-v1.p.rapidapi.com' },
    });
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
 */
export async function fetchApiFootballLeague(leagueId: string): Promise<RemoteTeam[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('VITE_RAPIDAPI_KEY não configurada.');

  const leagueNum = APIF_LEAGUE_IDS[leagueId];
  if (!leagueNum) throw new Error(`Liga "${leagueId}" não mapeada na API-Football.`);

  // Check cache first
  const cached = readCache(leagueId);
  if (cached) return cached.teams;

  const season = 2024;

  // 1. Fetch teams
  const teamsData = await fetchAllPages(`${API_BASE}/teams?league=${leagueNum}&season=${season}`, apiKey) as ApiTeam[];
  const teamMap = new Map<number, ApiTeam>();
  for (const t of teamsData) {
    teamMap.set(t.team.id, t);
  }

  // 2. Fetch players for the league (paginated)
  const playersData = await fetchAllPages(`${API_BASE}/players?league=${leagueNum}&season=${season}`, apiKey) as ApiPlayer[];

  // 3. Group players by team
  const byTeam = new Map<number, RemotePlayer[]>();
  for (const ap of playersData) {
    const stat = ap.statistics[0];
    if (!stat) continue;
    const teamId = stat.team.id;
    if (!byTeam.has(teamId)) byTeam.set(teamId, []);
    const rp: RemotePlayer = {
      id: ap.player.id,
      name: ap.player.name,
      position: mapPosition(stat.games.position),
      dateOfBirth: null,
      nationality: ap.player.nationality ?? null,
      shirtNumber: stat.games.number ?? null,
    };
    byTeam.get(teamId)!.push(rp);
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

  // Cache for 24h
  writeCache(leagueId, teams);
  return teams;
}
