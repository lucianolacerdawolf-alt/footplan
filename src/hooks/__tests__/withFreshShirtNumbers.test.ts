import { describe, it, expect } from 'vitest';
import { withFreshShirtNumbers } from '../useCareerManager';
import type { CareerState } from '../../engine/career';

const P = (id: string, number: number) => ({ id, name: id, number, position: 'MID', currentFatigue: 0, attributes: {} });

describe('withFreshShirtNumbers (save local e da nuvem)', () => {
  it('tira números inventados (#90+ em série) e repetidos', () => {
    const team = { id: 't', name: 'T', squad: [P('a', 7), P('b', 90), P('c', 94), P('d', 97), P('e', 7)] };
    const state = { leagueId: 'pl', rosters: { pl: [team] }, season: { league: { teams: [team] } } } as unknown as CareerState;
    const out = withFreshShirtNumbers(state);
    expect(out.season.league.teams[0].squad.map(p => p.number)).toEqual([7, 0, 0, 0, 0]);
    expect(out.rosters.pl[0].squad.map(p => p.number)).toEqual([7, 0, 0, 0, 0]);
  });
  it('sem nada pra corrigir devolve o mesmo objeto', () => {
    const team = { id: 't', name: 'T', squad: [P('a', 7), P('b', 10)] };
    const state = { leagueId: 'pl', rosters: { pl: [team] }, season: { league: { teams: [team] } } } as unknown as CareerState;
    expect(withFreshShirtNumbers(state)).toBe(state);
  });
});
