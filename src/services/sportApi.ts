// =============================================================================
// CLIENTE — SportAPI7 (Sofascore via RapidAPI)
// =============================================================================
// Dados muito mais ricos que football-data.org: valor de mercado real (EUR),
// data de nascimento, posições detalhadas, pé preferido, cores do time.
// Cache de 24h em localStorage. Usa standings → team IDs → players.

import type { RemoteTeam, RemotePlayer } from './footballApi';

const API_BASE = 'https://sportapi7.p.rapidapi.com/api/v1';
const CACHE_PREFIX = 'fp:sportapi:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Liga interna → { uniqueTournamentId, seasonId }
 *  Para descobrir novos IDs quando a cota resetar:
 *  1. Fetch events: GET /category/{countryCat}/scheduled-events/YYYY-MM-DD
 *  2. Procure pelo torneio desejado nos eventos
 *  3. Extraia: tournament.uniqueTournament.id e season.id */
const LEAGUE_MAP: Record<string, { ut: number; season: number }> = {
  championship: { ut: 18, season: 77347 },   // cat 1: England
  ligue2: { ut: 182, season: 77357 },        // cat 7: France
  // TODO: descobrir IDs quando cota resetar
  // laliga2: { ut: ?, season: ? },          // provavelmente cat ?: Spain
  // bundesliga2: { ut: ?, season: ? },       // provavelmente cat ?: Germany
  // serieB: { ut: ?, season: ? },            // provavelmente cat ?: Italy
  // ligaPortugal2: { ut: ?, season: ? },     // provavelmente cat ?: Portugal
};

function getApiKey(): string | null {
  const key = import.meta.env.VITE_RAPIDAPI_KEY as string | undefined;
  return key && key.trim().length > 0 ? key.trim() : null;
}

export function hasSportApiKey(): boolean {
  return getApiKey() !== null;
}

interface StandingsRow {
  team: { id: number; name: string; shortName: string; nameCode: string; teamColors: { primary: string; secondary: string }; country: { name: string } };
}

interface ApiPlayer {
  player: {
    id: number; name: string; shortName: string; position: string;
    positionsDetailed: string[]; jerseyNumber: string; shirtNumber: number;
    dateOfBirthTimestamp: number; preferredFoot: string;
    proposedMarketValue: number;
    country: { name: string };
  };
}

interface CachedTeams {
  fetchedAt: number;
  data: RemoteTeam[];
}

function readCache(key: string): CachedTeams | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedTeams;
    if (!parsed.fetchedAt || Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    if (!Array.isArray(parsed.data) || parsed.data.length === 0) return null;
    return parsed;
  } catch { return null; }
}

function writeCache(key: string, data: RemoteTeam[]): void {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ fetchedAt: Date.now(), data })); } catch {}
}

async function spFetch(path: string, apiKey: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'sportapi7.p.rapidapi.com' },
  });
  if (res.status === 429) throw new Error('Limite de requisições da SportAPI7 atingido.');
  if (!res.ok) throw new Error(`SportAPI7 respondeu ${res.status}.`);
  return res.json();
}

function mapPosition(pos: string, detailed: string[]): string {
  const p = pos.toUpperCase();
  if (p === 'G') return 'Goalkeeper';
  if (p === 'D') return 'Defence';
  if (p === 'M') return 'Midfield';
  if (p === 'F') return 'Offence';
  if (detailed.length > 0) {
    const d = detailed[0];
    if (['CB', 'LB', 'RB', 'LCB', 'RCB'].some(x => d.includes(x))) return 'Defence';
    if (['CM', 'CDM', 'CAM', 'LM', 'RM'].some(x => d.includes(x))) return 'Midfield';
    if (['ST', 'CF', 'LW', 'RW', 'SS'].some(x => d.includes(x))) return 'Offence';
  }
  return 'Midfield';
}

export async function fetchSportApiLeague(leagueId: string): Promise<RemoteTeam[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('VITE_RAPIDAPI_KEY não configurada.');

  const mapping = LEAGUE_MAP[leagueId];
  if (!mapping) throw new Error(`Liga "${leagueId}" não mapeada na SportAPI7.`);

  const cacheKey = `${leagueId}-${mapping.season}`;
  const cached = readCache(cacheKey);
  if (cached) return cached.data;

  // Step 1: Get standings → team list
  const standingsData = await spFetch(`/unique-tournament/${mapping.ut}/season/${mapping.season}/standings/total`, apiKey) as { standings: Array<{ rows: StandingsRow[] }> };
  const rows = standingsData.standings?.[0]?.rows ?? [];
  if (rows.length === 0) throw new Error('Nenhum time encontrado nas classificações.');

  const teamMap = new Map<number, { name: string; tla: string; crest: string }>();
  for (const row of rows) {
    const t = row.team;
    teamMap.set(t.id, {
      name: t.name,
      tla: t.nameCode ?? t.shortName?.substring(0, 3).toUpperCase() ?? '',
      crest: '', // We'll get from team endpoint later if needed
    });
  }

  // Step 2: Get players for each team
  const teams: RemoteTeam[] = [];
  for (const [teamId, info] of teamMap) {
    try {
      const playersData = await spFetch(`/team/${teamId}/players`, apiKey) as { players: ApiPlayer[] };
      const squad: RemotePlayer[] = (playersData.players ?? []).map(ap => ({
        id: ap.player.id,
        name: ap.player.name,
        position: mapPosition(ap.player.position, ap.player.positionsDetailed ?? []),
        dateOfBirth: ap.player.dateOfBirthTimestamp
          ? new Date(ap.player.dateOfBirthTimestamp * 1000).toISOString().split('T')[0]
          : null,
        nationality: ap.player.country?.name ?? null,
        shirtNumber: ap.player.shirtNumber ?? (ap.player.jerseyNumber ? parseInt(ap.player.jerseyNumber) : null),
      }));
      if (squad.length > 0) {
        teams.push({
          id: teamId,
          name: info.name,
          shortName: info.name,
          tla: info.tla,
          crest: info.crest,
          squad,
        });
      }
    } catch {
      // Skip teams we can't fetch players for
    }
  }

  writeCache(cacheKey, teams);
  return teams;
}
