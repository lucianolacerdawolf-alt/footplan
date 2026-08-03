import type { CareerSeasonHistoryEntry, TransferRecord } from './career';

// =============================================================================
// PAINEL "MINHA CARREIRA" — agregados read-only da jornada do técnico.
// Tudo aqui deriva de `history` + `transferHistory` que já existem no CareerState;
// nenhum estado novo é persistido.
// =============================================================================

export interface CareerSummary {
  seasonsPlayed: number;
  leagueTitles: number;          // temporadas terminadas em 1º na liga
  cupTitles: number;             // copas vencidas
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  winPct: number;                // 0-100, arredondado (0 se nenhum jogo registrado)
  managerOfSeasonCount: number;
  bestLeaguePosition: number | null; // menor (melhor) posição na liga; null sem temporadas
  reputationNow: number;
}

export interface CareerHighlights {
  /** Artilheiro de carreira: soma dos artilheiros de cada temporada por nome. */
  topScorer: { name: string; goals: number } | null;
  /** Maior compra (TransferRecord tipo BUY com maior valor). */
  biggestSigning: { playerName: string; amount: number; toTeam: string } | null;
  /** Temporada de maior saldo financeiro. */
  bestFinancialSeason: { year: number; budgetDelta: number } | null;
}

export function computeCareerSummary(
  history: CareerSeasonHistoryEntry[],
  reputationNow: number,
): CareerSummary {
  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
  let leagueTitles = 0, cupTitles = 0, managerOfSeasonCount = 0;
  let bestLeaguePosition: number | null = null;

  for (const h of history) {
    wins += h.userWins ?? 0;
    draws += h.userDraws ?? 0;
    losses += h.userLosses ?? 0;
    goalsFor += h.userGoalsFor ?? 0;
    goalsAgainst += h.userGoalsAgainst ?? 0;
    if (h.userLeaguePosition === 1) leagueTitles++;
    if (h.cupResult === 'champion') cupTitles++;
    if (h.managerOfSeason) managerOfSeasonCount++;
    if (bestLeaguePosition == null || h.userLeaguePosition < bestLeaguePosition) {
      bestLeaguePosition = h.userLeaguePosition;
    }
  }

  const totalGames = wins + draws + losses;
  const winPct = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  return {
    seasonsPlayed: history.length,
    leagueTitles,
    cupTitles,
    wins, draws, losses,
    goalsFor, goalsAgainst,
    winPct,
    managerOfSeasonCount,
    bestLeaguePosition,
    reputationNow,
  };
}

export function careerHighlights(
  history: CareerSeasonHistoryEntry[],
  transfers: TransferRecord[],
): CareerHighlights {
  // Artilheiro de carreira — soma os artilheiros de cada temporada por nome.
  const scorerTotals = new Map<string, number>();
  for (const h of history) {
    if (!h.userTopScorer) continue;
    scorerTotals.set(h.userTopScorer.name, (scorerTotals.get(h.userTopScorer.name) ?? 0) + h.userTopScorer.goals);
  }
  let topScorer: CareerHighlights['topScorer'] = null;
  for (const [name, goals] of scorerTotals) {
    if (!topScorer || goals > topScorer.goals) topScorer = { name, goals };
  }

  // Maior compra.
  let biggestSigning: CareerHighlights['biggestSigning'] = null;
  for (const t of transfers) {
    if (t.type !== 'BUY') continue;
    if (!biggestSigning || t.amount > biggestSigning.amount) {
      biggestSigning = { playerName: t.playerName, amount: t.amount, toTeam: t.toTeam };
    }
  }

  // Melhor temporada financeira.
  let bestFinancialSeason: CareerHighlights['bestFinancialSeason'] = null;
  for (const h of history) {
    if (h.budgetDelta == null) continue;
    if (!bestFinancialSeason || h.budgetDelta > bestFinancialSeason.budgetDelta) {
      bestFinancialSeason = { year: h.year, budgetDelta: h.budgetDelta };
    }
  }

  return { topScorer, biggestSigning, bestFinancialSeason };
}
