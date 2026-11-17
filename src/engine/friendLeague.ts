import type { Strategy, Team } from './types';
import { generateLeagueSchedule, computeStandings, type LeagueFixture, type Standing } from './tournament';
import { simularPartida } from './matchEngine';
import { SeededRng } from './rng';
import { cloneTeam } from '../utils/teamUtils';

// =============================================================================
// LIGA ENTRE AMIGOS (assíncrona) — lógica pura, sem rede
// =============================================================================
// Uma rodada por dia (UTC). A rodada N fica "devida" no dia start_date + N + 1 (o dia
// da criação é pra todo mundo entrar e acertar a tática). Quem abrir a liga depois do
// prazo simula as rodadas pendentes e grava; como a semente é fixa por liga+rodada+jogo,
// qualquer um chegaria no mesmo placar com as mesmas táticas. Clubes sem dono = CPU.

export interface FriendMember {
  userId: string;
  teamId: string;
  managerName: string;
  strategy: Strategy | null;
}

export interface FriendRoundResult {
  fixtureId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
}

/** Ordem estável dos clubes (por id) — o calendário tem que ser igual pra todo mundo. */
export function leagueTeamsInOrder(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => a.id.localeCompare(b.id));
}

export function friendSchedule(teams: Team[]): LeagueFixture[][] {
  return generateLeagueSchedule(leagueTeamsInOrder(teams));
}

function daysBetween(startDate: string, today: string): number {
  const a = Date.parse(`${startDate}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  return Math.floor((b - a) / 86_400_000);
}

/** Quantas rodadas já deveriam ter sido disputadas até hoje (UTC). */
export function dueRoundCount(startDate: string, today: string, totalRounds: number): number {
  return Math.max(0, Math.min(totalRounds, daysBetween(startDate, today)));
}

/** Data UTC de hoje no formato AAAA-MM-DD. */
export function utcToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Milissegundos até a próxima rodada (meia-noite UTC). */
export function msToNextRound(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
}

function hashSeed(...parts: Array<string | number>): number {
  let h = 2166136261;
  for (const ch of parts.join(':')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h | 0;
}

/** Aplica as táticas dos membros nos clubes deles. */
export function withMemberStrategies(teams: Team[], members: FriendMember[]): Team[] {
  const byTeam = new Map(members.map(m => [m.teamId, m]));
  return teams.map(t => {
    const m = byTeam.get(t.id);
    return m?.strategy ? { ...t, strategy: m.strategy } : t;
  });
}

/** Simula uma rodada de forma reprodutível (semente fixa por liga + rodada + jogo). */
export function simulateFriendRound(
  teams: Team[], members: FriendMember[], schedule: LeagueFixture[][], round: number, leagueSeed: number,
): FriendRoundResult[] {
  const byId = new Map(withMemberStrategies(teams, members).map(t => [t.id, t]));
  return (schedule[round] ?? []).map(f => {
    const rng = new SeededRng(hashSeed(leagueSeed, round, f.id));
    const r = simularPartida(cloneTeam(byId.get(f.homeTeamId)!), cloneTeam(byId.get(f.awayTeamId)!), () => rng.next());
    return { fixtureId: f.id, homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId, homeScore: r.homeScore, awayScore: r.awayScore };
  });
}

/** Junta os resultados gravados no calendário e calcula a tabela. */
export function friendStandings(teams: Team[], schedule: LeagueFixture[][], rounds: Map<number, FriendRoundResult[]>): { fixtures: LeagueFixture[][]; standings: Standing[] } {
  const fixtures = schedule.map((roundFx, r) => {
    const res = rounds.get(r);
    if (!res) return roundFx;
    const byId = new Map(res.map(x => [x.fixtureId, x]));
    return roundFx.map(f => {
      const x = byId.get(f.id);
      return x ? { ...f, homeScore: x.homeScore, awayScore: x.awayScore, played: true } : f;
    });
  });
  return { fixtures, standings: computeStandings(leagueTeamsInOrder(teams), fixtures) };
}

/** Código de 6 caracteres sem letras ambíguas (0/O, 1/I). */
export function newLeagueCode(rand: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(rand() * alphabet.length)]).join('');
}
