// =============================================================================
// CARREIRA — resumo do clube do usuário na liga (posição e forma recente)
// =============================================================================
// Usado pelo card "Modo carreira" da Home. Função pura: só lê o estado da liga.

import { computeStandings, type LeagueState } from './tournament';

export type FormResult = 'W' | 'D' | 'L';

export interface UserLeagueSummary {
  /** Posição na tabela (1-based). `null` enquanto o clube ainda não jogou. */
  position: number | null;
  /** Últimos resultados do clube, do mais antigo para o mais recente. */
  form: FormResult[];
}

const FORM_LENGTH = 5;

export function userLeagueSummary(lg: LeagueState): UserLeagueSummary {
  const fixtures = lg.fixtures ?? [];
  const results: FormResult[] = [];

  for (const round of fixtures) {
    for (const f of round) {
      if (!f.played || f.homeScore == null || f.awayScore == null) continue;
      const isHome = f.homeTeamId === lg.userTeamId;
      if (!isHome && f.awayTeamId !== lg.userTeamId) continue;
      const mine = isHome ? f.homeScore : f.awayScore;
      const theirs = isHome ? f.awayScore : f.homeScore;
      results.push(mine > theirs ? 'W' : mine === theirs ? 'D' : 'L');
    }
  }

  if (results.length === 0) return { position: null, form: [] };

  const table = computeStandings(lg.teams, fixtures);
  const index = table.findIndex(s => s.teamId === lg.userTeamId);
  return {
    position: index >= 0 ? index + 1 : null,
    form: results.slice(-FORM_LENGTH),
  };
}
