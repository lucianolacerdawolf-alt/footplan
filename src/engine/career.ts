import type { Player, Team } from './types';
import type { LeagueState, BracketState } from './tournament';
import type { LeagueDefinition } from '../data/leagues/types';
import { createBracket, generateLeagueSchedule } from './tournament';
import { generatePlayer, generateRandomName } from '../data/leagues/generateTeam';
import { playerOvr } from '../utils/playerOvr';
import { cloneTeam } from '../utils/teamUtils';
import { shuffle } from './rng';

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

// =============================================================================
// TEMPORADA — construção conjunta de liga + copa (D-13)
// =============================================================================

/**
 * Cria a liga e a copa de uma nova temporada da carreira, no mesmo formato usado
 * por handleStartLeague/handleStartBracket — garante estruturalmente que liga e
 * copa nascem juntas toda temporada (D-13), nunca uma sem a outra.
 */
export function createCareerSeason(
  userTeam: Team,
  leagueTeams: Team[],
  leagueDef: LeagueDefinition,
  rng: () => number = Math.random
): { league: LeagueState; cup: BracketState } {
  const rest = leagueTeams.filter(t => t.id !== userTeam.id).map(t => cloneTeam(t));
  const teams = [cloneTeam(userTeam), ...rest];
  const fixtures = generateLeagueSchedule(teams);
  const league: LeagueState = { teams, userTeamId: userTeam.id, fixtures, currentRound: 0, phase: 'playing' };

  const others = shuffle(leagueTeams.filter(t => t.id !== userTeam.id), rng)
    .slice(0, 15)
    .map(t => cloneTeam(t));
  const cup = createBracket(cloneTeam(userTeam), others, leagueDef.cupName, leagueDef.id, rng);

  return { league, cup };
}

// =============================================================================
// TRANSFERÊNCIAS (D-05, D-06)
// =============================================================================

/** Avalia se um clube CPU aceita uma proposta de troca — considera valor da oferta, superávit na posição e reputação do manager. */
export function evaluateTradeOffer(
  offeredPlayer: Player,
  requestedPlayer: Player,
  cpuSquad: Player[],
  managerReputation: number,
  rng: () => number = Math.random
): { accepted: boolean; reason: string } {
  const offeredOvr = playerOvr(offeredPlayer);
  const requestedOvr = playerOvr(requestedPlayer);
  const ovrDelta = offeredOvr - requestedOvr;
  const samePositionCount = cpuSquad.filter(p => p.position === requestedPlayer.position).length;
  const surplus = samePositionCount > 3;
  let acceptChance = 0.5 + ovrDelta * 0.04;
  if (surplus) acceptChance += 0.15;
  acceptChance += Math.min(0.2, managerReputation * 0.002);
  acceptChance = Math.max(0.02, Math.min(0.95, acceptChance));
  return {
    accepted: rng() < acceptChance,
    reason: ovrDelta >= 0 ? 'value-favorable' : 'value-unfavorable',
  };
}

/** Limite de propostas de troca por temporada (D-06) — fonte única de verdade, nunca hardcoded em outro lugar. */
export function canProposeTrade(tradesUsedThisSeason: number): boolean {
  return tradesUsedThisSeason < 3;
}

// =============================================================================
// REPUTAÇÃO (D-08, D-09)
// =============================================================================

/** Delta de reputação ao fim de temporada — títulos dominam, posição na tabela ajusta a margem. */
export function computeReputationDelta(input: {
  leagueChampion: boolean;
  cupChampion: boolean;
  leaguePosition: number;
  totalTeams: number;
}): number {
  let delta = 0;
  if (input.leagueChampion) delta += 15;
  if (input.cupChampion) delta += 10;
  const third = Math.ceil(input.totalTeams / 3);
  const topThird = input.leaguePosition <= third;
  const bottomThird = input.leaguePosition > input.totalTeams - third;
  if (!input.leagueChampion && topThird) delta += 3;
  if (bottomThird) delta -= 3;
  return delta;
}

// =============================================================================
// COPA — derivação do resultado do usuário a partir do bracket final
// =============================================================================

/** Deriva o resultado do usuário na copa a partir do bracket resolvido — só chamado quando cup.stage === 'champion'. */
export function deriveCupResult(cup: BracketState, userTeamId: string): CareerSeasonHistoryEntry['cupResult'] {
  if (cup.stage !== 'champion') return 'not-played';
  if (cup.championId === userTeamId) return 'champion';
  if (cup.final.homeTeamId === userTeamId || cup.final.awayTeamId === userTeamId) return 'runner-up';
  if (cup.semiFinals.some(m => m.homeTeamId === userTeamId || m.awayTeamId === userTeamId)) return 'semifinal';
  if (cup.quarterFinals.some(m => m.homeTeamId === userTeamId || m.awayTeamId === userTeamId)) return 'quarterfinal';
  return 'roundOf16';
}
