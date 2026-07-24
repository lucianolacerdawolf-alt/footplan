import type { Player, Team } from './types';
import type { LeagueState, BracketState } from './tournament';
import { generatePlayer, generateRandomName } from '../data/leagues/generateTeam';
import { playerOvr } from '../utils/playerOvr';

// =============================================================================
// TIPOS — Modo Carreira
// =============================================================================

export interface CareerManagerProfile {
  name: string;
  reputation: number;
}

export interface CareerSeasonHistoryEntry {
  year: number;
  leagueId: string;
  leagueChampionId: string;
  userLeaguePosition: number;
  cupResult: 'champion' | 'runner-up' | 'semifinal' | 'quarterfinal' | 'roundOf16' | 'not-played';
  tradesUsed: number;
  reputationDelta: number;
}

export interface CareerState {
  version: 1;
  leagueId: string;
  manager: CareerManagerProfile;
  currentSeasonYear: number;
  season: { league: LeagueState; cup: BracketState; tradesUsedThisSeason: number };
  rosters: Record<string, Team[]>;
  history: CareerSeasonHistoryEntry[];
}

/**
 * Type guard defensivo para o valor persistido em localStorage `fp:career` —
 * JSON pode ser editado manualmente no DevTools, então nunca confiamos no shape
 * sem checar. Nunca lança, sempre retorna boolean.
 */
export function isValidCareerState(x: unknown): x is CareerState {
  if (x === null || typeof x !== 'object') return false;
  const obj = x as Record<string, unknown>;
  if (obj.version !== 1) return false;
  if (typeof obj.leagueId !== 'string') return false;
  if (obj.manager === null || typeof obj.manager !== 'object') return false;
  const manager = obj.manager as Record<string, unknown>;
  if (typeof manager.name !== 'string') return false;
  if (typeof manager.reputation !== 'number') return false;
  if (typeof obj.currentSeasonYear !== 'number') return false;
  if (obj.season === null || typeof obj.season !== 'object') return false;
  const season = obj.season as Record<string, unknown>;
  if (season.league === null || typeof season.league !== 'object') return false;
  if (season.cup === null || typeof season.cup !== 'object') return false;
  if (typeof season.tradesUsedThisSeason !== 'number') return false;
  if (obj.rosters === null || typeof obj.rosters !== 'object') return false;
  if (!Array.isArray(obj.history)) return false;
  return true;
}

// =============================================================================
// PROGRESSÃO — envelhecimento e evolução de OVR
// =============================================================================

/** Curva de evolução de OVR por idade (D-02): crescimento até 23, pico 28-30, declínio após 31. */
export function ageOvrDelta(age: number): number {
  if (age <= 23) return 2;
  if (age <= 27) return 1;
  if (age <= 30) return 0;
  if (age <= 33) return -2;
  return -4;
}

/** Atribui idade inicial a jogadores sem `.age` — goleiros tendem a ser mais velhos. Idempotente. */
export function assignInitialAges(teams: Team[], rng: () => number = Math.random): Team[] {
  return teams.map(team => ({
    ...team,
    squad: team.squad.map(player => {
      if (player.age != null) return player;
      const age = player.position === 'GK'
        ? 22 + Math.floor(rng() * 15)
        : 18 + Math.floor(rng() * 17);
      return { ...player, age };
    }),
  }));
}

/**
 * Evolui um jogador uma temporada: recalcula OVR alvo com base na curva de idade
 * + variação de "desempenho recente" (-2..+2), reaplica generatePlayer() pra
 * regenerar atributos, preservando id/name/number (identidade do jogador).
 */
export function progressPlayer(player: Player, rng: () => number = Math.random): Player {
  const age = player.age ?? 26;
  const currentOvr = playerOvr(player);
  const delta = ageOvrDelta(age) + (Math.floor(rng() * 5) - 2);
  const newTargetOvr = Math.max(40, Math.min(95, currentOvr + delta));
  return {
    ...generatePlayer(player.id, player.name, player.number, player.position, newTargetOvr),
    age: age + 1,
  };
}

/** Chance de aposentadoria cresce a partir dos 34 anos, clampada em 90%. */
export function shouldRetire(age: number, rng: () => number = Math.random): boolean {
  if (age < 34) return false;
  const chance = Math.min(0.9, (age - 33) * 0.15);
  return rng() < chance;
}

/** Gera um jovem substituto (18-20 anos) pra ocupar a vaga de um jogador aposentado. */
export function generateReplacementPlayer(retiring: Player, rng: () => number = Math.random): Player {
  const youngAge = 18 + Math.floor(rng() * 3);
  const targetOvr = Math.max(45, Math.min(70, playerOvr(retiring) - 10 + Math.floor(rng() * 10)));
  const id = `${retiring.id}-yng-${Math.floor(rng() * 1e6)}`;
  const name = generateRandomName(rng);
  return {
    ...generatePlayer(id, name, retiring.number, retiring.position, targetOvr),
    age: youngAge,
  };
}

/** Evolui todo o elenco de um time: aposenta jogadores 34+ (probabilístico) e progride os demais. */
export function progressTeamRoster(team: Team, rng: () => number = Math.random): Team {
  return {
    ...team,
    squad: team.squad.map(player =>
      shouldRetire(player.age ?? 26, rng)
        ? generateReplacementPlayer(player, rng)
        : progressPlayer(player, rng)
    ),
  };
}

/** Evolui os elencos de TODAS as ligas de uma vez (D-01) — sem filtro de "liga aberta pelo usuário". */
export function progressAllLeagues(rosters: Record<string, Team[]>, rng: () => number = Math.random): Record<string, Team[]> {
  const result: Record<string, Team[]> = {};
  for (const [leagueId, teams] of Object.entries(rosters)) {
    result[leagueId] = teams.map(t => progressTeamRoster(t, rng));
  }
  return result;
}
