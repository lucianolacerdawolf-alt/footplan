// =============================================================================
// CLIENTE — SportAPI7 (Sofascore, via proxy Cloudflare Worker)
// =============================================================================
// Dados muito mais ricos que football-data.org: valor de mercado real (EUR),
// data de nascimento, posições detalhadas, pé preferido, cores do time.
// Cache de 24h em localStorage. Usa standings → team IDs → players.
//
// Sempre passa pelo mesmo Worker proxy do football-data.org (worker/football-proxy.js,
// rota /api/rapidapi/sportapi7/...) — nunca chama a RapidAPI direto do navegador. A chave
// (RAPIDAPI_KEY) fica só no ambiente do Worker; sem proxy configurado, essa fonte simplesmente
// não fica disponível (não existe modo "direto com chave" aqui, ao contrário do
// football-data.org — RapidAPI não tem motivo legítimo pra ser chamada do cliente).

import type { RemoteTeam, RemotePlayer } from './footballApi';
import type { Position } from '../engine/types';
import { fetchWithTimeout } from './http';
import { mapRemotePosition } from './positionMapping';

const CACHE_PREFIX = 'fp:sportapi:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// Versão do schema do cache — caches gravados por builds antigos são descartados
// por readCache (ver CACHE_VERSION em rosterSync.ts pra lógica equivalente).
const CACHE_VERSION = 1;

/** Pausa entre requisições por time — evita rajada contra o rate limit da RapidAPI ao
 *  buscar o elenco de 18-24 times em sequência. */
const PER_TEAM_DELAY_MS = 150;

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

function getProxyBase(): string | null {
  const url = import.meta.env.VITE_FOOTBALL_PROXY_URL as string | undefined;
  if (!url || url.trim().length === 0) return null;
  return url.trim().replace(/\/$/, '');
}

/** Essa fonte só funciona através do proxy (ver cabeçalho do arquivo) — "disponível" aqui
 *  significa "o proxy está configurado", não "existe uma chave client-side". */
export function hasSportApiAccess(): boolean {
  return getProxyBase() !== null;
}

export function isSportApiLeagueMapped(leagueId: string): boolean {
  return leagueId in LEAGUE_MAP;
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
  version?: number;
}

function readCache(key: string): CachedTeams | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedTeams;
    if (!parsed.fetchedAt || Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    if (parsed.version !== CACHE_VERSION) return null;
    if (!Array.isArray(parsed.data) || parsed.data.length === 0) return null;
    return parsed;
  } catch { return null; }
}

function writeCache(key: string, data: RemoteTeam[]): void {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ fetchedAt: Date.now(), data, version: CACHE_VERSION })); } catch { /* noop */ }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function spFetch(path: string, proxyBase: string): Promise<unknown> {
  const res = await fetchWithTimeout(`${proxyBase}/api/rapidapi/sportapi7/${path}`);
  if (res.status === 429) throw new Error('Limite de requisições da SportAPI7 atingido.');
  if (!res.ok) throw new Error(`SportAPI7 respondeu ${res.status}.`);
  return res.json();
}

/** Posição da SportAPI7 (letra G/D/M/F + posições detalhadas) → Position do jogo.
 *  A letra resolve direto; as detalhadas caem na keyword-mapping compartilhada
 *  (mapRemotePosition), e o fallback é MID — igual ao comportamento antigo. */
function mapPosition(pos: string, detailed: string[]): Position {
  const p = pos.toUpperCase();
  if (p === 'G') return 'GK';
  if (p === 'D') return 'DEF';
  if (p === 'M') return 'MID';
  if (p === 'F') return 'FWD';
  if (detailed.length > 0) {
    const d = detailed[0];
    if (['CB', 'LB', 'RB', 'LCB', 'RCB'].some(x => d.includes(x))) return 'DEF';
    if (['CM', 'CDM', 'CAM', 'LM', 'RM'].some(x => d.includes(x))) return 'MID';
    if (['ST', 'CF', 'LW', 'RW', 'SS'].some(x => d.includes(x))) return 'FWD';
  }
  return mapRemotePosition(pos);
}

/** `force`: ignora o cache de 24h desta fonte (mas ainda grava um novo no final) — usado
 *  quando o chamador (rosterSync) pediu um refresh explícito, não só o automático de rotina. */
export async function fetchSportApiLeague(leagueId: string, force = false): Promise<RemoteTeam[]> {
  const proxyBase = getProxyBase();
  if (!proxyBase) throw new Error('Proxy não configurado (VITE_FOOTBALL_PROXY_URL) — SportAPI7 não funciona sem ele.');

  const mapping = LEAGUE_MAP[leagueId];
  if (!mapping) throw new Error(`Liga "${leagueId}" não mapeada na SportAPI7.`);

  const cacheKey = `${leagueId}-${mapping.season}`;
  if (!force) {
    const cached = readCache(cacheKey);
    if (cached) return cached.data;
  }

  // Step 1: Get standings → team list
  const standingsData = await spFetch(`unique-tournament/${mapping.ut}/season/${mapping.season}/standings/total`, proxyBase) as { standings: Array<{ rows: StandingsRow[] }> };
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

  // Step 2: Get players for each team (com pausa entre chamadas — ver PER_TEAM_DELAY_MS)
  const teams: RemoteTeam[] = [];
  let firstTeamFetchError: string | null = null;
  let skipped = 0;
  let first = true;
  for (const [teamId, info] of teamMap) {
    if (!first) await sleep(PER_TEAM_DELAY_MS);
    first = false;
    try {
      const playersData = await spFetch(`team/${teamId}/players`, proxyBase) as { players: ApiPlayer[] };
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
    } catch (err) {
      skipped++;
      firstTeamFetchError ??= err instanceof Error ? err.message : String(err);
    }
  }

  // Times demais sem elenco (ex: toda a liga rate-limitada no meio do loop) — mais confiável
  // reportar erro e deixar o chamador cair pra próxima fonte/estático do que devolver um
  // elenco pela metade sem avisar por quê.
  if (teams.length === 0 || skipped > teamMap.size / 2) {
    throw new Error(firstTeamFetchError ?? 'Não foi possível buscar os elencos dos times.');
  }

  writeCache(cacheKey, teams);
  return teams;
}
