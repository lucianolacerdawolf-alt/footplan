import { describe, it, expect } from 'vitest';
import {
  friendSchedule, dueRoundCount, simulateFriendRound, friendStandings, newLeagueCode, msToNextRound,
  type FriendMember,
} from '../friendLeague';
import { getLeague } from '@/data/leagues';

const teams = getLeague('pl')!.teams;

describe('liga entre amigos', () => {
  it('calendário igual pra todo mundo, independente da ordem de chegada dos clubes', () => {
    const a = friendSchedule(teams);
    const b = friendSchedule([...teams].reverse());
    expect(a).toEqual(b);
    expect(a.length).toBe((teams.length - 1) * 2);
  });

  it('rodadas devidas: dia da criação = 0, um por dia depois, nunca passa do total', () => {
    expect(dueRoundCount('2026-11-17', '2026-11-17', 38)).toBe(0);
    expect(dueRoundCount('2026-11-17', '2026-11-18', 38)).toBe(1);
    expect(dueRoundCount('2026-11-17', '2026-12-30', 38)).toBe(38);
  });

  it('simulação reprodutível: mesma liga/rodada/táticas → mesmo placar', () => {
    const schedule = friendSchedule(teams);
    const members: FriendMember[] = [{ userId: 'u1', teamId: teams[0].id, managerName: 'Ana', strategy: { ...teams[0].strategy, mentality: 'counter-attack' } }];
    const r1 = simulateFriendRound(teams, members, schedule, 3, 12345);
    const r2 = simulateFriendRound(teams, members, schedule, 3, 12345);
    expect(r1).toEqual(r2);
    expect(r1).toHaveLength(teams.length / 2);
    expect(simulateFriendRound(teams, members, schedule, 3, 999)).not.toEqual(r1);
  });

  it('tabela soma os resultados gravados', () => {
    const schedule = friendSchedule(teams);
    const round0 = simulateFriendRound(teams, [], schedule, 0, 1);
    const { standings } = friendStandings(teams, schedule, new Map([[0, round0]]));
    expect(standings.reduce((s, x) => s + x.played, 0)).toBe(teams.length);
  });

  it('código de 6 caracteres sem 0/O/1/I; próxima rodada em até 24h', () => {
    const code = newLeagueCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const ms = msToNextRound(new Date('2026-11-17T23:30:00Z'));
    expect(ms).toBe(30 * 60 * 1000);
  });
});
