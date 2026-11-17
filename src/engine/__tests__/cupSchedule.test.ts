import { describe, it, expect } from 'vitest';
import { cupStageOpensAtRound, isCupStageOpen } from '../cupSchedule';

describe('calendário das copas', () => {
  it('liga de 38 rodadas: fases espalhadas, oitavas não abrem na rodada 1', () => {
    const rounds = (['roundOf16', 'quarterfinals', 'semifinals', 'final'] as const)
      .map(s => cupStageOpensAtRound(s, 38));
    expect(rounds).toEqual([7, 15, 22, 30]);
    expect(isCupStageOpen('roundOf16', 0, 38, false)).toBe(false);
    expect(isCupStageOpen('roundOf16', 7, 38, false)).toBe(true);
  });

  it('continental anda meio passo defasada da doméstica', () => {
    for (const s of ['roundOf16', 'quarterfinals', 'semifinals', 'final'] as const) {
      expect(cupStageOpensAtRound(s, 38, 'continental')).toBeLessThan(cupStageOpensAtRound(s, 38));
    }
  });

  it('toda fase abre antes do fim da liga, em qualquer tamanho de liga', () => {
    for (const total of [34, 38, 42, 46]) {
      expect(cupStageOpensAtRound('final', total)).toBeLessThan(total);
    }
  });

  it('liga encerrada libera qualquer fase', () => {
    expect(isCupStageOpen('final', 0, 38, true)).toBe(true);
  });
});
