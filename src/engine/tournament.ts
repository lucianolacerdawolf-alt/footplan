import type { Team } from './types';
import { simularPartidaRapida, simularKnockout } from './matchEngine';
import { cloneTeam } from '../utils/teamUtils';

// =============================================================================
// TIPOS DE TORNEIO
// =============================================================================

export interface LeagueFixture {
  id: string;
  roundIndex: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  played: boolean;
}

export interface Standing {
  teamId: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface LeagueState {
  teams: Team[];
  userTeamId: string;
  fixtures: LeagueFixture[][];   // 38 rounds × 10 fixtures
  currentRound: number;          // 0-37
  phase: 'playing' | 'done';
}

export interface BracketMatch {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore?: number;
  awayScore?: number;
  wentToExtraTime?: boolean;
  extraTimeHomeScore?: number;
  extraTimeAwayScore?: number;
  penaltyHomeScore?: number;
  penaltyAwayScore?: number;
  winnerId?: string;
  played: boolean;
}

export type BracketStage = 'roundOf16' | 'quarterfinals' | 'semifinals' | 'final' | 'champion';

export interface BracketState {
  teams: Team[];
  userTeamId: string;
  roundOf16: BracketMatch[];
  quarterFinals: BracketMatch[];
  semiFinals: BracketMatch[];
  final: BracketMatch;
  stage: BracketStage;
  championId?: string;
}

// =============================================================================
// LIGA — geração de calendário (método círculo)
// =============================================================================

export function generateLeagueSchedule(teams: Team[]): LeagueFixture[][] {
  const n = teams.length;
  const ids = teams.map(t => t.id);
  const rounds: LeagueFixture[][] = [];

  const fixed = ids[0];
  const rotating = ids.slice(1);

  for (let round = 0; round < n - 1; round++) {
    const fixtures: LeagueFixture[] = [];

    const [ha, hb] = round % 2 === 0 ? [fixed, rotating[0]] : [rotating[0], fixed];
    fixtures.push({ id: `r${round}-f0`, roundIndex: round, homeTeamId: ha, awayTeamId: hb, played: false });

    for (let i = 1; i < n / 2; i++) {
      const [a, b] = round % 2 === 0
        ? [rotating[i], rotating[n - 1 - i]]
        : [rotating[n - 1 - i], rotating[i]];
      fixtures.push({ id: `r${round}-f${i}`, roundIndex: round, homeTeamId: a, awayTeamId: b, played: false });
    }

    rounds.push(fixtures);
    rotating.unshift(rotating.pop()!);
  }

  const returnRounds = rounds.map((round, ri) =>
    round.map((f, fi) => ({
      id: `r${ri + n - 1}-f${fi}`,
      roundIndex: ri + n - 1,
      homeTeamId: f.awayTeamId,
      awayTeamId: f.homeTeamId,
      played: false,
    }))
  );

  return [...rounds, ...returnRounds];
}

// =============================================================================
// LIGA — classificação
// =============================================================================

export function computeStandings(teams: Team[], fixtures: LeagueFixture[][]): Standing[] {
  const map = new Map<string, Standing>();
  for (const t of teams) {
    map.set(t.id, { teamId: t.id, points: 0, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 });
  }

  for (const round of fixtures) {
    for (const f of round) {
      if (!f.played || f.homeScore == null || f.awayScore == null) continue;
      const h = map.get(f.homeTeamId)!;
      const a = map.get(f.awayTeamId)!;
      h.played++; a.played++;
      h.goalsFor += f.homeScore; h.goalsAgainst += f.awayScore;
      a.goalsFor += f.awayScore; a.goalsAgainst += f.homeScore;
      if (f.homeScore > f.awayScore) { h.won++; h.points += 3; a.lost++; }
      else if (f.homeScore === f.awayScore) { h.drawn++; h.points++; a.drawn++; a.points++; }
      else { a.won++; a.points += 3; h.lost++; }
    }
  }

  return [...map.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
}

// =============================================================================
// COPA — criação do chaveamento (16 times)
// =============================================================================

export function createBracket(userTeam: Team, otherTeams: Team[]): BracketState {
  const shuffled = [...otherTeams].sort(() => Math.random() - 0.5);
  const teams = [userTeam, ...shuffled.slice(0, 15)];

  const roundOf16: BracketMatch[] = [
    { id: 'r16-1', homeTeamId: teams[0].id,  awayTeamId: teams[15].id, played: false },
    { id: 'r16-2', homeTeamId: teams[1].id,  awayTeamId: teams[14].id, played: false },
    { id: 'r16-3', homeTeamId: teams[2].id,  awayTeamId: teams[13].id, played: false },
    { id: 'r16-4', homeTeamId: teams[3].id,  awayTeamId: teams[12].id, played: false },
    { id: 'r16-5', homeTeamId: teams[4].id,  awayTeamId: teams[11].id, played: false },
    { id: 'r16-6', homeTeamId: teams[5].id,  awayTeamId: teams[10].id, played: false },
    { id: 'r16-7', homeTeamId: teams[6].id,  awayTeamId: teams[9].id,  played: false },
    { id: 'r16-8', homeTeamId: teams[7].id,  awayTeamId: teams[8].id,  played: false },
  ];

  return {
    teams,
    userTeamId: userTeam.id,
    roundOf16,
    quarterFinals: [
      { id: 'qf1', homeTeamId: null, awayTeamId: null, played: false },
      { id: 'qf2', homeTeamId: null, awayTeamId: null, played: false },
      { id: 'qf3', homeTeamId: null, awayTeamId: null, played: false },
      { id: 'qf4', homeTeamId: null, awayTeamId: null, played: false },
    ],
    semiFinals: [
      { id: 'sf1', homeTeamId: null, awayTeamId: null, played: false },
      { id: 'sf2', homeTeamId: null, awayTeamId: null, played: false },
    ],
    final: { id: 'final', homeTeamId: null, awayTeamId: null, played: false },
    stage: 'roundOf16',
  };
}

// =============================================================================
// COPA — avança fase quando todos os jogos de uma etapa estão disputados
// =============================================================================

export function advanceBracket(state: BracketState): BracketState {
  const { roundOf16, quarterFinals, semiFinals, stage } = state;

  if (stage === 'roundOf16' && roundOf16.every(m => m.played)) {
    return {
      ...state,
      quarterFinals: [
        { id: 'qf1', homeTeamId: roundOf16[0].winnerId!, awayTeamId: roundOf16[1].winnerId!, played: false },
        { id: 'qf2', homeTeamId: roundOf16[2].winnerId!, awayTeamId: roundOf16[3].winnerId!, played: false },
        { id: 'qf3', homeTeamId: roundOf16[4].winnerId!, awayTeamId: roundOf16[5].winnerId!, played: false },
        { id: 'qf4', homeTeamId: roundOf16[6].winnerId!, awayTeamId: roundOf16[7].winnerId!, played: false },
      ],
      stage: 'quarterfinals',
    };
  }

  if (stage === 'quarterfinals' && quarterFinals.every(m => m.played)) {
    return {
      ...state,
      semiFinals: [
        { id: 'sf1', homeTeamId: quarterFinals[0].winnerId!, awayTeamId: quarterFinals[1].winnerId!, played: false },
        { id: 'sf2', homeTeamId: quarterFinals[2].winnerId!, awayTeamId: quarterFinals[3].winnerId!, played: false },
      ],
      stage: 'semifinals',
    };
  }

  if (stage === 'semifinals' && semiFinals.every(m => m.played)) {
    return {
      ...state,
      final: { id: 'final', homeTeamId: semiFinals[0].winnerId!, awayTeamId: semiFinals[1].winnerId!, played: false },
      stage: 'final',
    };
  }

  if (stage === 'final' && state.final.played) {
    return { ...state, championId: state.final.winnerId!, stage: 'champion' };
  }

  return state;
}

// =============================================================================
// COPA — simula uma partida de mata-mata (automático)
// =============================================================================

export function simularBracketMatch(home: Team, away: Team): Omit<BracketMatch, 'id' | 'homeTeamId' | 'awayTeamId'> {
  const r = simularKnockout(cloneTeam(home), cloneTeam(away));
  return {
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    wentToExtraTime: r.wentToExtraTime,
    extraTimeHomeScore: r.extraTimeHomeScore,
    extraTimeAwayScore: r.extraTimeAwayScore,
    penaltyHomeScore: r.penaltyResult?.homeScore,
    penaltyAwayScore: r.penaltyResult?.awayScore,
    winnerId: r.winner === 'home' ? home.id : away.id,
    played: true,
  };
}

// =============================================================================
// LIGA — simula todos os jogos não-usuário de uma rodada
// =============================================================================

export function simularRodadaAuto(
  fixtures: LeagueFixture[],
  teams: Team[],
  userTeamId: string
): LeagueFixture[] {
  const teamMap = new Map(teams.map(t => [t.id, t]));
  return fixtures.map(f => {
    if (f.played) return f;
    if (f.homeTeamId === userTeamId || f.awayTeamId === userTeamId) return f;
    const home = teamMap.get(f.homeTeamId)!;
    const away = teamMap.get(f.awayTeamId)!;
    const result = simularPartidaRapida(cloneTeam(home), cloneTeam(away));
    return { ...f, ...result, played: true };
  });
}

// =============================================================================
// LIGA — simula o jogo do usuário de uma rodada (sem ir à tela de stats)
// =============================================================================

export function simularFixtureAuto(fixture: LeagueFixture, teams: Team[]): LeagueFixture {
  const teamMap = new Map(teams.map(t => [t.id, t]));
  const home = teamMap.get(fixture.homeTeamId)!;
  const away = teamMap.get(fixture.awayTeamId)!;
  const result = simularPartidaRapida(cloneTeam(home), cloneTeam(away));
  return { ...fixture, ...result, played: true };
}
