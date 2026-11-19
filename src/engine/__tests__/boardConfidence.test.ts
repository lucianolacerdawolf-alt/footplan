import { describe, it, expect } from 'vitest';
import {
  matchConfidenceDelta, roundConfidenceDelta, seasonEndConfidence, crossedThreshold, shouldSack, confidenceLabel,
} from '../boardConfidence';
import { ovrRange, ovrText, scoutPlayer, refreshScouting, visibleOvr } from '../scouting';
import { addMatchToTotals, EMPTY_TOTALS, newlyReachedMilestones, getCareerTotals } from '../careerMilestones';
import type { CareerState } from '../career';
import type { Player } from '../types';

describe('confiança da diretoria', () => {
  it('vitória contra time mais forte vale mais; derrota como favorito pesa mais', () => {
    const winUnderdog = matchConfidenceDelta({ userScore: 1, oppScore: 0, userOvr: 70, oppOvr: 80 });
    const winFavorite = matchConfidenceDelta({ userScore: 1, oppScore: 0, userOvr: 80, oppOvr: 70 });
    expect(winUnderdog).toBeGreaterThan(winFavorite);
    const lossFavorite = matchConfidenceDelta({ userScore: 0, oppScore: 1, userOvr: 80, oppOvr: 70 });
    const lossUnderdog = matchConfidenceDelta({ userScore: 0, oppScore: 1, userOvr: 70, oppOvr: 80 });
    expect(lossFavorite).toBeLessThan(lossUnderdog);
    expect(lossUnderdog).toBeLessThan(0);
  });

  it('promessa de vitória cobra no resultado; tirar a pressão amortece a derrota', () => {
    const base = { userOvr: 75, oppOvr: 75 };
    expect(matchConfidenceDelta({ ...base, userScore: 2, oppScore: 0, stance: 'bold' }))
      .toBeGreaterThan(matchConfidenceDelta({ ...base, userScore: 2, oppScore: 0 }));
    expect(matchConfidenceDelta({ ...base, userScore: 0, oppScore: 2, stance: 'bold' }))
      .toBeLessThan(matchConfidenceDelta({ ...base, userScore: 0, oppScore: 2 }));
    expect(matchConfidenceDelta({ ...base, userScore: 0, oppScore: 2, stance: 'shield' }))
      .toBeGreaterThan(matchConfidenceDelta({ ...base, userScore: 0, oppScore: 2 }));
  });

  it('meta fora da tabela só conta depois de 1/4 da liga; caixa negativo sempre', () => {
    expect(roundConfidenceDelta({ leagueObjectiveOff: true, budgetNegative: false, round: 3, totalRounds: 38 })).toBe(0);
    expect(roundConfidenceDelta({ leagueObjectiveOff: true, budgetNegative: false, round: 10, totalRounds: 38 })).toBe(-1);
    expect(roundConfidenceDelta({ leagueObjectiveOff: false, budgetNegative: true, round: 1, totalRounds: 38 })).toBe(-2);
  });

  it('fim de temporada: objetivos pesam e metade da distância até 60 é perdoada', () => {
    expect(seasonEndConfidence(40, 10)).toEqual({ final: 50, carried: 55 });
    expect(seasonEndConfidence(90, 20)).toEqual({ final: 100, carried: 80 });
  });

  it('limiares, demissão e rótulos', () => {
    expect(crossedThreshold(40, 34)).toBe('warn');
    expect(crossedThreshold(25, 19)).toBe('ultimatum');
    expect(crossedThreshold(30, 28)).toBeNull();
    expect(shouldSack(10, 6)).toBe(true);
    expect(shouldSack(10, 5)).toBe(false); // carência das primeiras rodadas
    expect(shouldSack(11, 20)).toBe(false);
    expect(confidenceLabel(80).tone).toBe('good');
    expect(confidenceLabel(15).tone).toBe('danger');
  });
});

describe('olheiros', () => {
  const player = {
    id: 'abc', name: 'X', position: 'MID',
    attributes: { speed: 70, finishing: 70, passing: 70, dribbling: 70, tackling: 70, positioning: 70, vision: 70, stamina: 70 },
  } as unknown as Player;

  it('a faixa de OVR contém o valor real e é estável', () => {
    const r = ovrRange(player);
    expect(r.hi - r.lo).toBe(8);
    expect(ovrRange(player)).toEqual(r);
    const real = Number(ovrText(player, true));
    expect(real).toBeGreaterThanOrEqual(r.lo);
    expect(real).toBeLessThanOrEqual(r.hi);
    expect(ovrText(player, false)).toBe(`${r.lo}-${r.hi}`);
    expect(visibleOvr(player, false)).toBe(Math.round((r.lo + r.hi) / 2));
  });

  it('relatórios acabam e recarregam na rodada seguinte', () => {
    let s = { scoutedIds: [] as string[], reportsLeft: 1 };
    s = scoutPlayer(s, 'a')!;
    expect(s).toEqual({ scoutedIds: ['a'], reportsLeft: 0 });
    expect(scoutPlayer(s, 'a')).toBe(s); // já observado: não gasta
    expect(scoutPlayer(s, 'b')).toBeNull();
    expect(refreshScouting(s)).toEqual({ scoutedIds: ['a'], reportsLeft: 3 });
  });
});

describe('marcos da carreira', () => {
  it('soma jogos e detecta os marcos novos uma vez', () => {
    let t = EMPTY_TOTALS;
    for (let i = 0; i < 50; i++) t = addMatchToTotals(t, 2, 0);
    expect(t).toMatchObject({ games: 50, wins: 50, goalsFor: 100, cleanSheets: 50, biggestWinMargin: 2 });
    const state = { history: [], careerTotals: t } as unknown as CareerState;
    const ids = newlyReachedMilestones(state).map(m => m.id);
    expect(ids).toEqual(expect.arrayContaining(['games_50', 'wins_25', 'goals_100', 'clean_25']));
    expect(newlyReachedMilestones({ ...state, milestonesReached: ids })).toEqual([]);
  });

  it('save antigo sem contadores parte do histórico das temporadas', () => {
    const state = { history: [{ userWins: 20, userDraws: 10, userLosses: 8, userGoalsFor: 60, userGoalsAgainst: 40 }] } as unknown as CareerState;
    expect(getCareerTotals(state)).toMatchObject({ games: 38, wins: 20, goalsFor: 60 });
  });
});
