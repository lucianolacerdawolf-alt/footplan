// =============================================================================
// MARCOS DA CARREIRA — números do técnico somados de todos os clubes
// =============================================================================
// As conquistas (achievements.ts) são do app inteiro e por partida. Os marcos são da
// trajetória do técnico na carreira: jogos no comando, vitórias, títulos, jovens
// revelados. Os contadores vivem em `careerTotals` (somados jogo a jogo, então
// sobrevivem à troca de clube no meio da temporada); títulos vêm do `history`.

import type { CareerState } from './career';
import { computeUserSeasonRecord } from './seasonClosure';

export interface CareerTotals {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  biggestWinMargin: number;
  continentalTitles: number;
  youthPromoted: number;
}

export const EMPTY_TOTALS: CareerTotals = {
  games: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0,
  cleanSheets: 0, biggestWinMargin: 0, continentalTitles: 0, youthPromoted: 0,
};

export function getCareerTotals(state: CareerState): CareerTotals {
  if (state.careerTotals) return { ...EMPTY_TOTALS, ...state.careerTotals };
  // Saves de antes dos marcos: parte do que o histórico das temporadas já registrou (liga).
  const t = { ...EMPTY_TOTALS };
  for (const h of state.history ?? []) {
    const w = h.userWins ?? 0, d = h.userDraws ?? 0, l = h.userLosses ?? 0;
    t.games += w + d + l; t.wins += w; t.draws += d; t.losses += l;
    t.goalsFor += h.userGoalsFor ?? 0; t.goalsAgainst += h.userGoalsAgainst ?? 0;
  }
  // + as rodadas da temporada atual antes da corrente (a corrente entra ao avançar).
  const league = state.season?.league;
  if (league?.fixtures) {
    const r = computeUserSeasonRecord({ ...league, fixtures: league.fixtures.slice(0, league.currentRound) });
    t.games += r.wins + r.draws + r.losses; t.wins += r.wins; t.draws += r.draws; t.losses += r.losses;
    t.goalsFor += r.goalsFor; t.goalsAgainst += r.goalsAgainst;
  }
  return t;
}

/** Soma um jogo do usuário (liga, copa ou continental). */
export function addMatchToTotals(t: CareerTotals, userScore: number, oppScore: number): CareerTotals {
  const win = userScore > oppScore;
  return {
    ...t,
    games: t.games + 1,
    wins: t.wins + (win ? 1 : 0),
    draws: t.draws + (userScore === oppScore ? 1 : 0),
    losses: t.losses + (userScore < oppScore ? 1 : 0),
    goalsFor: t.goalsFor + userScore,
    goalsAgainst: t.goalsAgainst + oppScore,
    cleanSheets: t.cleanSheets + (oppScore === 0 ? 1 : 0),
    biggestWinMargin: win ? Math.max(t.biggestWinMargin, userScore - oppScore) : t.biggestWinMargin,
  };
}

export interface MilestoneDef {
  id: string;
  icon: string;
  title: string;
  /** Valor atual e alvo — a tela mostra o progresso dos que faltam. */
  progress: (s: MilestoneSource) => number;
  target: number;
}

export interface MilestoneSource {
  totals: CareerTotals;
  seasons: number;
  leagueTitles: number;
  cupTitles: number;
}

export function milestoneSource(state: CareerState): MilestoneSource {
  return {
    totals: getCareerTotals(state),
    seasons: state.history.length,
    leagueTitles: state.history.filter(h => h.userLeaguePosition === 1).length,
    cupTitles: state.history.filter(h => h.cupResult === 'champion').length,
  };
}

const m = (id: string, icon: string, title: string, target: number, progress: (s: MilestoneSource) => number): MilestoneDef =>
  ({ id, icon, title, target, progress });

export const MILESTONES: MilestoneDef[] = [
  m('games_50', '📋', '50 jogos no comando', 50, s => s.totals.games),
  m('games_100', '📋', '100 jogos no comando', 100, s => s.totals.games),
  m('games_250', '📋', '250 jogos no comando', 250, s => s.totals.games),
  m('games_500', '🏛️', '500 jogos no comando', 500, s => s.totals.games),
  m('wins_25', '✅', '25 vitórias', 25, s => s.totals.wins),
  m('wins_100', '✅', '100 vitórias', 100, s => s.totals.wins),
  m('wins_250', '🏅', '250 vitórias', 250, s => s.totals.wins),
  m('goals_100', '⚽', '100 gols marcados', 100, s => s.totals.goalsFor),
  m('goals_500', '⚽', '500 gols marcados', 500, s => s.totals.goalsFor),
  m('clean_25', '🧤', '25 jogos sem sofrer gol', 25, s => s.totals.cleanSheets),
  m('clean_100', '🧤', '100 jogos sem sofrer gol', 100, s => s.totals.cleanSheets),
  m('rout_5', '💥', 'Vencer por 5 gols de diferença', 5, s => s.totals.biggestWinMargin),
  m('league_1', '🏆', 'Primeiro título da liga', 1, s => s.leagueTitles),
  m('league_3', '🏆', '3 títulos da liga', 3, s => s.leagueTitles),
  m('cup_1', '🥇', 'Primeira copa nacional', 1, s => s.cupTitles),
  m('continental_1', '🌍', 'Primeiro título continental', 1, s => s.totals.continentalTitles),
  m('youth_1', '🌱', 'Revelar um jogador da base', 1, s => s.totals.youthPromoted),
  m('youth_5', '🌱', 'Revelar 5 jogadores da base', 5, s => s.totals.youthPromoted),
  m('seasons_5', '📅', '5 temporadas de carreira', 5, s => s.seasons),
  m('seasons_10', '📅', '10 temporadas de carreira', 10, s => s.seasons),
];

/** Marcos atingidos agora que ainda não estavam registrados. */
export function newlyReachedMilestones(state: CareerState): MilestoneDef[] {
  const reached = new Set(state.milestonesReached ?? []);
  const src = milestoneSource(state);
  return MILESTONES.filter(d => !reached.has(d.id) && d.progress(src) >= d.target);
}
