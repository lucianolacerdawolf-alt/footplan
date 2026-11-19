import { describe, it, expect } from 'vitest';
import { baseWeeklyRevenue, clubInitialBudget, sponsorTvPerRound, ticketPerHomeMatch, operatingCostPerRound, wageCap, withWage, exceedsWageCap, projectedRoundBalance, WAGE_SHARE } from '../clubEconomy';
import type { Player, Team } from '../types';

const P = (id: string, weeklyWage: number): Player => ({
  id, name: id, number: 1, position: 'MID', currentFatigue: 0, weeklyWage, marketValue: weeklyWage * 100,
  attributes: { speed: 70, stamina: 70, passing: 70, finishing: 70, tackling: 70, dribbling: 70, vision: 70, positioning: 70 },
});
const team = (id: string, wagePerPlayer: number): Team => ({
  id, name: id, abbreviation: id, color: '#000', secondaryColor: '#fff', logoUrl: '',
  strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  squad: Array.from({ length: 20 }, (_, i) => P(`${id}${i}`, wagePerPlayer)),
});

describe('economia por tamanho de clube', () => {
  it('receita base faz os salários ocuparem ~60% e o clube equilibrado sobra pouco', () => {
    const t = team('mid', 30_000); // folha 600k
    const base = baseWeeklyRevenue(t, 'pl');
    expect(Math.round(600_000 / base * 100) / 100).toBe(WAGE_SHARE);
    // rodada fora / em casa: receitas − salários − estrutura
    const fora = projectedRoundBalance({ base, leagueId: 'pl', wageBill: 600_000, homeMatch: false });
    const casa = projectedRoundBalance({ base, leagueId: 'pl', wageBill: 600_000, homeMatch: true });
    expect(fora).toBeLessThan(0);           // fora de casa o clube perde dinheiro
    expect((fora + casa) / 2).toBeGreaterThan(0); // na média da temporada sobra um pouco
    expect((fora + casa) / 2).toBeLessThan(base * 0.2);
  });

  it('clube grande fatura mais que pequeno na mesma liga; caixa inicial também', () => {
    const big = team('big', 75_000), small = team('small', 15_000), mid = team('mid', 30_000);
    const league = [big, mid, small];
    expect(sponsorTvPerRound(baseWeeklyRevenue(big, 'pl'), 'pl')).toBeGreaterThan(sponsorTvPerRound(baseWeeklyRevenue(small, 'pl'), 'pl'));
    expect(clubInitialBudget(big, league, 'pl')).toBeGreaterThan(clubInitialBudget(small, league, 'pl'));
    expect(clubInitialBudget(big, league, 'pl')).toBeLessThanOrEqual(45_000_000 * 2.5);
    expect(clubInitialBudget(small, league, 'pl')).toBeGreaterThanOrEqual(45_000_000 * 0.4);
  });

  it('teto salarial cresce com o patrocínio e bloqueia só acima dele', () => {
    const base = 1_000_000;
    expect(wageCap(base, 'pl', 'global')).toBeGreaterThan(wageCap(base, 'pl', 'national'));
    const fin = { wageCap: wageCap(base, 'pl') };
    expect(exceedsWageCap(fin, fin.wageCap)).toBe(false);
    expect(exceedsWageCap(fin, fin.wageCap + 1)).toBe(true);
    expect(exceedsWageCap({}, 99_999_999)).toBe(false); // save antigo sem teto
    expect(ticketPerHomeMatch(base)).toBe(500_000);
    expect(operatingCostPerRound(base)).toBe(250_000);
  });

  it('jogador sem salário (veio de outra liga) ganha salário ao entrar', () => {
    const semSalario = { ...P('x', 0), weeklyWage: undefined, marketValue: 20_000_000 };
    expect(withWage(semSalario).weeklyWage).toBeGreaterThan(0);
    const comSalario = P('y', 50_000);
    expect(withWage(comSalario)).toBe(comSalario);
  });
});

describe('ensureEconomy (saves antigos)', () => {
  it('preenche receita/estrutura/teto e devolve patrocínio acima da reputação ao nível inicial', async () => {
    const { ensureEconomy } = await import('../career');
    const t = team('cp', 30_000);
    const state = {
      leagueId: 'pl', sponsorTier: 'global', manager: { name: 'x', reputation: 0 },
      rosters: { pl: [t] }, season: { league: { userTeamId: 'cp' } },
      finances: { budget: 50_000_000, wageBill: 600_000, weeklyIncome: 1_100_000 },
    } as never;
    const out = ensureEconomy(state) as unknown as { sponsorTier: string; finances: { baseRevenue: number; operatingCost: number; wageCap: number; budget: number } };
    expect(out.sponsorTier).toBe('national');
    expect(out.finances.baseRevenue).toBe(1_000_000);
    expect(out.finances.operatingCost).toBe(250_000);
    expect(out.finances.wageCap).toBe(750_000);
    expect(out.finances.budget).toBe(50_000_000); // caixa mantido
    expect(ensureEconomy(out as never)).toBe(out); // idempotente
  });
});
