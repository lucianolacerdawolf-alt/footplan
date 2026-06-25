import { describe, it, expect } from 'vitest';
import { calculateRatings, manOfTheMatch, goalScorers, cardEvents } from '../playerRating';
import type { MatchResult, MatchEvent, Player, Team } from '../types';

function makePlayer(id: string, pos: Player['position'], name?: string): Player {
  return {
    id, name: name ?? `P-${id}`, number: 1, position: pos, currentFatigue: 0,
    attributes: { speed: 70, stamina: 70, passing: 70, finishing: 70, tackling: 70, dribbling: 70, vision: 70, positioning: 70 },
  };
}

function makeTeam(id: string): Team {
  const squad = [
    makePlayer(`${id}-gk`, 'GK'),
    ...Array.from({ length: 4 }, (_, i) => makePlayer(`${id}-d${i}`, 'DEF', `Def${id}${i}`)),
    ...Array.from({ length: 3 }, (_, i) => makePlayer(`${id}-m${i}`, 'MID', `Mid${id}${i}`)),
    ...Array.from({ length: 3 }, (_, i) => makePlayer(`${id}-f${i}`, 'FWD', `Fwd${id}${i}`)),
  ];
  return {
    id, name: `T-${id}`, abbreviation: id, color: '#000', secondaryColor: '#fff',
    logoUrl: '', squad,
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

function makeResult(home: Team, away: Team, homeScore: number, awayScore: number, events: MatchEvent[]): MatchResult {
  return {
    homeTeam: home, awayTeam: away, homeScore, awayScore,
    events, homePossession: 50, awayPossession: 50,
    homeStats: { shots: 0, shotsOnTarget: 0, fouls: 0, yellowCards: 0, redCards: 0 },
    awayStats: { shots: 0, shotsOnTarget: 0, fouls: 0, yellowCards: 0, redCards: 0 },
  };
}

describe('calculateRatings', () => {
  it('todos jogadores começam em ~6.5 base com empate', () => {
    const h = makeTeam('h'); const a = makeTeam('a');
    const ratings = calculateRatings(makeResult(h, a, 0, 0, []));
    expect(ratings.length).toBe(22);
    // Empate: nem bonus nem penalidade do resultado
    for (const r of ratings) {
      if (r.isGK) continue; // GK tem modificadores próprios
      expect(r.rating).toBeGreaterThanOrEqual(6.0);
      expect(r.rating).toBeLessThanOrEqual(7.0);
    }
  });

  it('artilheiro recebe bônus de 1.5 por gol', () => {
    const h = makeTeam('h'); const a = makeTeam('a');
    const scorer = h.squad.find(p => p.position === 'FWD')!;
    const events: MatchEvent[] = [
      { minute: 15, type: 'goal', description: '', teamId: h.id, scorer: scorer.name },
    ];
    const ratings = calculateRatings(makeResult(h, a, 1, 0, events));
    const r = ratings.find(x => x.player.id === scorer.id)!;
    expect(r.goals).toBe(1);
    // Base 6.5 + vitória 0.5 + gol 1.5 = 8.5
    expect(r.rating).toBeCloseTo(8.5, 1);
  });

  it('cartão amarelo subtrai 0.5 e vermelho subtrai 2.0', () => {
    const h = makeTeam('h'); const a = makeTeam('a');
    const def = h.squad.find(p => p.position === 'DEF')!;
    const mid = h.squad.find(p => p.position === 'MID')!;
    const events: MatchEvent[] = [
      { minute: 20, type: 'yellowCard', description: '', teamId: h.id, playerId: def.id },
      { minute: 40, type: 'redCard', description: '', teamId: h.id, playerId: mid.id },
    ];
    const ratings = calculateRatings(makeResult(h, a, 0, 0, events));
    const dRating = ratings.find(x => x.player.id === def.id)!;
    const mRating = ratings.find(x => x.player.id === mid.id)!;
    expect(dRating.yellow).toBe(1);
    expect(dRating.rating).toBeCloseTo(6.0, 1); // 6.5 - 0.5
    expect(mRating.red).toBe(1);
    expect(mRating.rating).toBeCloseTo(4.5, 1); // 6.5 - 2.0
  });

  it('vencedor leva +0.5 e perdedor -0.3', () => {
    const h = makeTeam('h'); const a = makeTeam('a');
    const ratings = calculateRatings(makeResult(h, a, 2, 1, []));
    const homeDef = ratings.find(x => x.player.id === 'h-d0')!;
    const awayDef = ratings.find(x => x.player.id === 'a-d0')!;
    expect(homeDef.rating).toBeCloseTo(7.0, 1); // 6.5 + 0.5
    expect(awayDef.rating).toBeCloseTo(6.2, 1); // 6.5 - 0.3
  });

  it('GK leva penalidade por gols sofridos', () => {
    const h = makeTeam('h'); const a = makeTeam('a');
    const ratings = calculateRatings(makeResult(h, a, 0, 3, []));
    const hGK = ratings.find(x => x.player.position === 'GK' && x.team.id === h.id)!;
    // Base 6.5 + derrota -0.3 - 3 gols × 0.4 = 5.0 (sem saves no exemplo)
    expect(hGK.rating).toBeCloseTo(5.0, 1);
  });

  it('rating é capado em [4.0, 10.0]', () => {
    const h = makeTeam('h'); const a = makeTeam('a');
    const scorer = h.squad.find(p => p.position === 'FWD')!;
    // Bombarda de gols pra um cara só
    const events: MatchEvent[] = Array.from({ length: 10 }, (_, i) => ({
      minute: 5 + i * 8, type: 'goal' as const, description: '', teamId: h.id, scorer: scorer.name,
    }));
    const ratings = calculateRatings(makeResult(h, a, 10, 0, events));
    const r = ratings.find(x => x.player.id === scorer.id)!;
    expect(r.rating).toBeLessThanOrEqual(10.0);
    expect(r.goals).toBe(10);
  });

  it('ordenado por rating decrescente', () => {
    const h = makeTeam('h'); const a = makeTeam('a');
    const ratings = calculateRatings(makeResult(h, a, 1, 0, [
      { minute: 1, type: 'goal', description: '', teamId: h.id, scorer: h.squad[10].name },
    ]));
    for (let i = 1; i < ratings.length; i++) {
      expect(ratings[i - 1].rating).toBeGreaterThanOrEqual(ratings[i].rating);
    }
  });
});

describe('manOfTheMatch', () => {
  it('retorna o de maior nota', () => {
    const h = makeTeam('h'); const a = makeTeam('a');
    const scorer = h.squad.find(p => p.position === 'FWD')!;
    const ratings = calculateRatings(makeResult(h, a, 1, 0, [
      { minute: 10, type: 'goal', description: '', teamId: h.id, scorer: scorer.name },
    ]));
    const motm = manOfTheMatch(ratings);
    expect(motm?.player.id).toBe(scorer.id);
  });

  it('retorna null se ratings vazio', () => {
    expect(manOfTheMatch([])).toBeNull();
  });
});

describe('goalScorers', () => {
  it('extrai todos os gols com minuto e nome do marcador', () => {
    const h = makeTeam('h'); const a = makeTeam('a');
    const events: MatchEvent[] = [
      { minute: 15, type: 'goal', description: '', teamId: h.id, scorer: 'Pelé' },
      { minute: 30, type: 'miss', description: '', teamId: h.id },
      { minute: 67, type: 'goal', description: '', teamId: a.id, scorer: 'Maradona' },
    ];
    const goals = goalScorers(makeResult(h, a, 1, 1, events));
    expect(goals).toHaveLength(2);
    expect(goals[0]).toMatchObject({ minute: 15, scorer: 'Pelé', team: h });
    expect(goals[1]).toMatchObject({ minute: 67, scorer: 'Maradona', team: a });
  });

  it('ignora gols sem scorer', () => {
    const h = makeTeam('h'); const a = makeTeam('a');
    const events: MatchEvent[] = [
      { minute: 15, type: 'goal', description: '', teamId: h.id }, // sem scorer
    ];
    expect(goalScorers(makeResult(h, a, 1, 0, events))).toHaveLength(0);
  });
});

describe('cardEvents', () => {
  it('mapeia cartões amarelos e vermelhos por jogador', () => {
    const h = makeTeam('h'); const a = makeTeam('a');
    const def = h.squad.find(p => p.position === 'DEF')!;
    const events: MatchEvent[] = [
      { minute: 20, type: 'yellowCard', description: '', teamId: h.id, playerId: def.id },
      { minute: 70, type: 'redCard', description: '', teamId: a.id, playerId: a.squad[3].id },
    ];
    const cards = cardEvents(makeResult(h, a, 0, 0, events));
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({ minute: 20, type: 'yellow', team: h });
    expect(cards[0].player?.id).toBe(def.id);
    expect(cards[1].type).toBe('red');
  });
});
