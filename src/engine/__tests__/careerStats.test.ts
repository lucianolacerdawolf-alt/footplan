import { describe, it, expect } from 'vitest';
import { computeCareerSummary, careerHighlights } from '../careerStats';
import type { CareerSeasonHistoryEntry, TransferRecord } from '../career';

function season(overrides: Partial<CareerSeasonHistoryEntry>): CareerSeasonHistoryEntry {
  return {
    year: 1,
    leagueId: 'pl',
    leagueChampionId: 'man-city',
    userLeaguePosition: 5,
    cupResult: 'not-played',
    tradesUsed: 0,
    reputationDelta: 0,
    ...overrides,
  };
}

function transfer(overrides: Partial<TransferRecord>): TransferRecord {
  return {
    id: `t-${Math.random()}`,
    date: 'Temporada 1',
    seasonYear: 1,
    type: 'BUY',
    playerName: 'Fulano',
    playerPosition: 'MID',
    fromTeam: 'CPU FC',
    toTeam: 'Meu Time',
    amount: 10_000_000,
    ...overrides,
  };
}

describe('computeCareerSummary', () => {
  it('histórico vazio: tudo zerado, melhor posição null', () => {
    const s = computeCareerSummary([], 42);
    expect(s.seasonsPlayed).toBe(0);
    expect(s.leagueTitles).toBe(0);
    expect(s.cupTitles).toBe(0);
    expect(s.wins).toBe(0);
    expect(s.winPct).toBe(0);
    expect(s.bestLeaguePosition).toBeNull();
    expect(s.reputationNow).toBe(42);
  });

  it('agrega títulos, campanha, %vitória, melhor posição e Técnico da Temporada', () => {
    const history = [
      season({ year: 1, userLeaguePosition: 1, cupResult: 'champion', userWins: 25, userDraws: 8, userLosses: 5, userGoalsFor: 80, userGoalsAgainst: 30, managerOfSeason: true }),
      season({ year: 2, userLeaguePosition: 3, cupResult: 'semifinal', userWins: 20, userDraws: 10, userLosses: 8, userGoalsFor: 65, userGoalsAgainst: 40 }),
    ];
    const s = computeCareerSummary(history, 70);
    expect(s.seasonsPlayed).toBe(2);
    expect(s.leagueTitles).toBe(1);
    expect(s.cupTitles).toBe(1);
    expect(s.wins).toBe(45);
    expect(s.draws).toBe(18);
    expect(s.losses).toBe(13);
    expect(s.goalsFor).toBe(145);
    expect(s.goalsAgainst).toBe(70);
    expect(s.managerOfSeasonCount).toBe(1);
    expect(s.bestLeaguePosition).toBe(1);
    // 45 vitórias de 76 jogos = 59.2% → 59
    expect(s.winPct).toBe(59);
  });

  it('trata campos opcionais ausentes (saves antigos) como 0', () => {
    const history = [season({ userLeaguePosition: 2 })]; // sem userWins/Draws/Losses/Goals
    const s = computeCareerSummary(history, 10);
    expect(s.wins).toBe(0);
    expect(s.draws).toBe(0);
    expect(s.losses).toBe(0);
    expect(s.goalsFor).toBe(0);
    expect(s.winPct).toBe(0);
    expect(s.bestLeaguePosition).toBe(2);
  });
});

describe('careerHighlights', () => {
  it('histórico e transferências vazios: tudo null', () => {
    const h = careerHighlights([], []);
    expect(h.topScorer).toBeNull();
    expect(h.biggestSigning).toBeNull();
    expect(h.bestFinancialSeason).toBeNull();
  });

  it('artilheiro de carreira soma por nome ao longo das temporadas', () => {
    const history = [
      season({ year: 1, userTopScorer: { name: 'Haaland', goals: 30 } }),
      season({ year: 2, userTopScorer: { name: 'Haaland', goals: 28 } }),
      season({ year: 3, userTopScorer: { name: 'Foden', goals: 20 } }),
    ];
    const h = careerHighlights(history, []);
    expect(h.topScorer).toEqual({ name: 'Haaland', goals: 58 });
  });

  it('maior contratação é o BUY de maior valor (ignora vendas/livres)', () => {
    const transfers = [
      transfer({ type: 'BUY', playerName: 'Barato', amount: 5_000_000 }),
      transfer({ type: 'SELL', playerName: 'Vendido', amount: 90_000_000 }),
      transfer({ type: 'BUY', playerName: 'Estrela', amount: 66_000_000 }),
      transfer({ type: 'SIGN_FREE_AGENT', playerName: 'Livre', amount: 0 }),
    ];
    const h = careerHighlights([], transfers);
    expect(h.biggestSigning).toEqual({ playerName: 'Estrela', amount: 66_000_000, toTeam: 'Meu Time' });
  });

  it('melhor temporada financeira é o maior budgetDelta', () => {
    const history = [
      season({ year: 1, budgetDelta: -20_000_000 }),
      season({ year: 2, budgetDelta: 35_000_000 }),
      season({ year: 3, budgetDelta: 10_000_000 }),
    ];
    const h = careerHighlights(history, []);
    expect(h.bestFinancialSeason).toEqual({ year: 2, budgetDelta: 35_000_000 });
  });
});
