import { describe, it, expect } from 'vitest';
import { createCareerSeason, pairedDivisionId, CUP_OTHER_DIVISION_SLOTS } from '../career';
import { getLeague } from '@/data/leagues';

describe('copa nacional com as duas divisões', () => {
  it('Premier League: 10 da PL + 5 da Championship, sem repetir clube', () => {
    const pl = getLeague('pl')!;
    const ch = getLeague(pairedDivisionId('pl')!)!;
    const user = pl.teams[0];
    const { cup } = createCareerSeason(user, pl.teams, pl, () => 0.42, ch.teams);
    const plIds = new Set(pl.teams.map(t => t.id));
    const fromCh = cup.teams.filter(t => !plIds.has(t.id));
    expect(cup.teams).toHaveLength(16);
    expect(fromCh).toHaveLength(CUP_OTHER_DIVISION_SLOTS);
    expect(new Set(cup.teams.map(t => t.id)).size).toBe(16);
    expect(cup.teams[0].id).toBe(user.id);
  });

  it('sem a outra divisão disponível, continua com 16 da própria liga', () => {
    const pl = getLeague('pl')!;
    const { cup } = createCareerSeason(pl.teams[0], pl.teams, pl, () => 0.42);
    const plIds = new Set(pl.teams.map(t => t.id));
    expect(cup.teams.every(t => plIds.has(t.id))).toBe(true);
    expect(cup.teams).toHaveLength(16);
  });

  it('todas as ligas têm par', () => {
    for (const id of ['pl', 'championship', 'laliga', 'laliga2', 'bundesliga', 'bundesliga2', 'serieA', 'serieB', 'ligue1', 'ligue2', 'ligaPortugal', 'ligaPortugal2']) {
      expect(getLeague(pairedDivisionId(id)!), id).toBeDefined();
    }
  });
});
