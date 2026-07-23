// =============================================================================
// CLIENTE — football-data.org (v4)
// =============================================================================
// Provedor escolhido pelo usuário: tier gratuito (10 req/min), cobre as 6 ligas que o
// FootPlan já tem hardcoded (Premier League, La Liga, Bundesliga, Serie A, Ligue 1,
// Primeira Liga).
//
// IMPORTANTE — CORS: testado e confirmado que a API da football-data.org devolve
// `Access-Control-Allow-Origin: http://localhost` (sem porta) pra essa conta, o que o
// navegador rejeita tanto em localhost:5173 quanto em produção. Por isso existe um modo
// "proxy" (recomendado, ver worker/football-proxy.js) que faz a chamada servidor-a-servidor
// e devolve pro FootPlan já com CORS liberado — além de manter a chave fora do bundle
// público. O modo "direto" fica disponível como alternativa, caso a conta na
// football-data.org libere os domínios corretos nas configurações dela no futuro.
//
// Docs: https://docs.football-data.org/general/v4/

const DIRECT_API_BASE = 'https://api.football-data.org/v4';

/** Código de competição do football-data.org por id interno de liga (ver src/data/leagues). */
export const COMPETITION_CODES: Record<string, string> = {
  pl: 'PL',
  laliga: 'PD',
  bundesliga: 'BL1',
  serieA: 'SA',
  ligue1: 'FL1',
  ligaPortugal: 'PPL',
};

export interface RemotePlayer {
  id: number;
  name: string;
  position: string | null; // "Goalkeeper" | "Defence" | "Midfield" | "Offence" | null
  dateOfBirth: string | null;
  nationality: string | null;
  shirtNumber: number | null;
}

export interface RemoteTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  squad: RemotePlayer[];
}

interface CompetitionTeamsResponse {
  count: number;
  teams: RemoteTeam[];
}

export class FootballApiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'FootballApiError';
    this.status = status;
  }
}

function getApiKey(): string | null {
  const key = import.meta.env.VITE_FOOTBALL_API_KEY as string | undefined;
  return key && key.trim().length > 0 ? key.trim() : null;
}

function getProxyBase(): string | null {
  const url = import.meta.env.VITE_FOOTBALL_PROXY_URL as string | undefined;
  if (!url || url.trim().length === 0) return null;
  return url.trim().replace(/\/$/, '');
}

/** Existe alguma forma configurada de buscar dados ao vivo — proxy OU chamada direta. */
export function hasApiKey(): boolean {
  return getProxyBase() !== null || getApiKey() !== null;
}

export function usingProxy(): boolean {
  return getProxyBase() !== null;
}

async function parseTeamsResponse(res: Response, context: string): Promise<RemoteTeam[]> {
  if (!res.ok) {
    if (res.status === 429) throw new FootballApiError('Limite de requisições da API atingido (10/min no tier gratuito). Tente de novo em instantes.', 429);
    if (res.status === 401 || res.status === 403) throw new FootballApiError('Chave de API inválida ou sem permissão pra essa competição.', res.status);
    throw new FootballApiError(`${context} respondeu ${res.status}.`, res.status);
  }
  const data = (await res.json()) as CompetitionTeamsResponse;
  return data.teams ?? [];
}

/**
 * Busca os times (com elenco) de uma competição inteira. Usa o proxy (Worker) quando
 * `VITE_FOOTBALL_PROXY_URL` está configurada — caminho recomendado, sem problema de CORS.
 * Sem proxy configurada, tenta a chamada direta (só funciona se a conta football-data.org
 * liberar o domínio de origem nas configurações dela).
 * Lança FootballApiError em qualquer falha — quem chama decide o fallback (ver rosterSync.ts).
 */
export async function fetchCompetitionTeams(leagueId: string): Promise<RemoteTeam[]> {
  const code = COMPETITION_CODES[leagueId];
  if (!code) throw new FootballApiError(`Liga "${leagueId}" não tem código de competição mapeado.`);

  const proxyBase = getProxyBase();
  if (proxyBase) {
    let res: Response;
    try {
      res = await fetch(`${proxyBase}/api/football/competitions/${code}/teams`);
    } catch (err) {
      throw new FootballApiError(`Falha de rede ao contatar o proxy (${proxyBase}): ${(err as Error).message}`);
    }
    return parseTeamsResponse(res, 'Proxy');
  }

  const apiKey = getApiKey();
  if (!apiKey) throw new FootballApiError('Nenhuma chave/proxy configurado (VITE_FOOTBALL_PROXY_URL ou VITE_FOOTBALL_API_KEY).');

  let res: Response;
  try {
    res = await fetch(`${DIRECT_API_BASE}/competitions/${code}/teams`, {
      headers: { 'X-Auth-Token': apiKey },
    });
  } catch (err) {
    throw new FootballApiError(`Falha de rede ao contatar football-data.org diretamente (provavelmente CORS — veja worker/football-proxy.js): ${(err as Error).message}`);
  }
  return parseTeamsResponse(res, 'football-data.org');
}
