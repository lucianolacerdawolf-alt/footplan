import type { Team } from './types';
import type { BracketMatch, BracketState, LeagueFixture, LeagueState, Standing } from './tournament';
import { computeStandings, generateLeagueSchedule } from './tournament';
import type { LeagueDefinition } from '../data/leagues/types';

// =============================================================================
// LIGA COM CONFERÊNCIAS (MLS) — calendário, tabela por conferência e playoff
// =============================================================================
// Temporada regular: cada conferência joga turno e returno entre si. As conferências têm
// número ÍMPAR de clubes (15), então a cada rodada sobra um de cada lado — esses dois se
// enfrentam (jogo entre conferências). Fechando com algumas rodadas extras só de jogos
// Leste × Oeste, todo mundo faz o mesmo número de jogos.
// Playoff: os `playoffSpots` melhores de cada conferência, chaveados 1×8, 4×5, 2×7, 3×6;
// o vencedor de cada lado decide a MLS Cup. Reaproveita o chaveamento das copas.

type Conf = { name: string; teamIds: string[] };

/** Rodízio (método do círculo) com folga para número ímpar: devolve, por rodada, os
 *  confrontos e quem folgou (null quando o número é par). */
function circleRounds(ids: string[]): { pairs: [string, string][]; bye: string | null }[] {
  const list = ids.length % 2 === 1 ? [...ids, '__BYE__'] : [...ids];
  const n = list.length;
  const fixed = list[0];
  const rot = list.slice(1);
  const out: { pairs: [string, string][]; bye: string | null }[] = [];
  for (let r = 0; r < n - 1; r++) {
    const all: [string, string][] = [];
    all.push(r % 2 === 0 ? [fixed, rot[0]] : [rot[0], fixed]);
    for (let i = 1; i < n / 2; i++) {
      all.push(r % 2 === 0 ? [rot[i], rot[n - 1 - i]] : [rot[n - 1 - i], rot[i]]);
    }
    let bye: string | null = null;
    const pairs = all.filter(([a, b]) => {
      if (a === '__BYE__') { bye = b; return false; }
      if (b === '__BYE__') { bye = a; return false; }
      return true;
    });
    out.push({ pairs, bye });
    rot.unshift(rot.pop()!);
  }
  return out;
}

/** Quantas rodadas extras só de jogos entre conferências (MLS: 4 → 34 jogos por clube). */
export const CROSS_CONFERENCE_EXTRA_ROUNDS = 4;

export function generateConferenceSchedule(teams: Team[], conferences: Conf[]): LeagueFixture[][] {
  const [a, b] = conferences;
  if (!a || !b) return generateLeagueSchedule(teams);
  const ra = circleRounds(a.teamIds);
  const rb = circleRounds(b.teamIds);
  const single = Math.max(ra.length, rb.length);
  const rounds: LeagueFixture[][] = [];
  const push = (pairs: [string, string][]) => {
    const r = rounds.length;
    rounds.push(pairs.map(([h, w], i) => ({ id: `r${r}-f${i}`, roundIndex: r, homeTeamId: h, awayTeamId: w, played: false })));
  };
  // Turno (leg 0) e returno (leg 1, mandos invertidos).
  for (let leg = 0; leg < 2; leg++) {
    for (let r = 0; r < single; r++) {
      const pa = ra[r] ?? { pairs: [], bye: null };
      const pb = rb[r] ?? { pairs: [], bye: null };
      const flip = (p: [string, string]): [string, string] => (leg === 0 ? p : [p[1], p[0]]);
      const pairs: [string, string][] = [...pa.pairs.map(flip), ...pb.pairs.map(flip)];
      // Os dois que folgaram se enfrentam (jogo entre conferências).
      if (pa.bye && pb.bye) pairs.push((r + leg) % 2 === 0 ? [pa.bye, pb.bye] : [pb.bye, pa.bye]);
      push(pairs);
    }
  }
  // Rodadas extras Leste × Oeste com deslocamento, pra variar os adversários.
  const n = Math.min(a.teamIds.length, b.teamIds.length);
  for (let k = 0; k < CROSS_CONFERENCE_EXTRA_ROUNDS; k++) {
    const shift = 1 + k * Math.max(1, Math.floor(n / CROSS_CONFERENCE_EXTRA_ROUNDS));
    const pairs: [string, string][] = [];
    for (let i = 0; i < n; i++) {
      const home = a.teamIds[i];
      const away = b.teamIds[(i + shift) % n];
      pairs.push(k % 2 === 0 ? [home, away] : [away, home]);
    }
    push(pairs);
  }
  return rounds;
}

/** Calendário certo para a liga: por conferência quando houver, senão todos contra todos. */
export function scheduleForLeague(league: Pick<LeagueDefinition, 'conferences'> | undefined, teams: Team[]): LeagueFixture[][] {
  if (league?.conferences && league.conferences.length >= 2) {
    const ids = new Set(teams.map(t => t.id));
    // Só usa as conferências se elas cobrem exatamente os times da liga (o sync pode trocar clubes).
    const covered = league.conferences.flatMap(c => c.teamIds);
    if (covered.length === teams.length && covered.every(id => ids.has(id))) {
      return generateConferenceSchedule(teams, league.conferences);
    }
    // Times mudaram: divide ao meio pela força, mantendo o formato de conferências.
    const half = Math.ceil(teams.length / 2);
    return generateConferenceSchedule(teams, [
      { name: league.conferences[0].name, teamIds: teams.slice(0, half).map(t => t.id) },
      { name: league.conferences[1].name, teamIds: teams.slice(half).map(t => t.id) },
    ]);
  }
  return generateLeagueSchedule(teams);
}

/** Conferências efetivas da temporada (lidas do calendário quando o sync trocou clubes). */
export function effectiveConferences(league: Pick<LeagueDefinition, 'conferences'> | undefined, teams: Team[]): Conf[] | null {
  if (!league?.conferences || league.conferences.length < 2) return null;
  const ids = new Set(teams.map(t => t.id));
  const covered = league.conferences.flatMap(c => c.teamIds);
  if (covered.length === teams.length && covered.every(id => ids.has(id))) return league.conferences;
  const half = Math.ceil(teams.length / 2);
  return [
    { name: league.conferences[0].name, teamIds: teams.slice(0, half).map(t => t.id) },
    { name: league.conferences[1].name, teamIds: teams.slice(half).map(t => t.id) },
  ];
}

/** Tabela separada por conferência (mesma ordenação da tabela geral). */
export function conferenceStandings(teams: Team[], fixtures: LeagueFixture[][], conferences: Conf[]): { name: string; standings: Standing[] }[] {
  const all = computeStandings(teams, fixtures);
  return conferences.map(c => ({ name: c.name, standings: all.filter(s => c.teamIds.includes(s.teamId)) }));
}

/**
 * Playoff ao fim da temporada regular. Devolve null se o time do usuário não se
 * classificou (o playoff só existe pra ser jogado por ele — mesma regra das copas
 * continentais, que só são criadas pra quem se classifica).
 */
export function buildConferencePlayoff(league: LeagueState, conferences: Conf[], spots: number, cupName: string, leagueId: string): BracketState | null {
  const per = Math.min(8, spots);
  const tables = conferenceStandings(league.teams, league.fixtures, conferences);
  const seeds = tables.map(t => t.standings.slice(0, per).map(s => s.teamId));
  if (seeds.some(s => s.length < 8)) return null;
  if (!seeds.flat().includes(league.userTeamId)) return null;
  const byId = new Map(league.teams.map(t => [t.id, t]));
  const order = [[0, 7], [3, 4], [1, 6], [2, 5]]; // 1×8, 4×5, 2×7, 3×6 (o 1 e o 2 só se cruzam na final da conferência)
  const roundOf16: BracketMatch[] = [];
  seeds.forEach((s, ci) => order.forEach(([h, a], i) => {
    roundOf16.push({ id: `r16-${ci * 4 + i + 1}`, homeTeamId: s[h], awayTeamId: s[a], played: false });
  }));
  return {
    teams: seeds.flat().map(id => byId.get(id)!).filter(Boolean),
    userTeamId: league.userTeamId,
    roundOf16,
    quarterFinals: [1, 2, 3, 4].map(i => ({ id: `qf${i}`, homeTeamId: null, awayTeamId: null, played: false })),
    semiFinals: [1, 2].map(i => ({ id: `sf${i}`, homeTeamId: null, awayTeamId: null, played: false })),
    final: { id: 'final', homeTeamId: null, awayTeamId: null, played: false },
    stage: 'roundOf16',
    cupName,
    leagueId,
  };
}
