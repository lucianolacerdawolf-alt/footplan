import { describe, it, expect } from 'vitest';
import {
  recoverFatigue,
  applyPostMatchInjuries,
  randomizeCPUTactics,
  generateLeagueSchedule,
  createBracket,
  computeStandings,
  advanceBracket,
  type LeagueFixture,
} from '../tournament';
import type { Team, Player } from '../types';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

function makePlayer(id: string, pos: Player['position'], num: number, fatigue = 0, injuredRounds?: number): Player {
  return {
    id, name: `P-${id}`, number: num, position: pos, currentFatigue: fatigue,
    injuredRounds,
    attributes: { speed: 70, stamina: 70, passing: 70, finishing: 70, tackling: 70, dribbling: 70, vision: 70, positioning: 70 },
  };
}

function makeTeam(id: string, players?: Player[]): Team {
  const squad = players ?? [
    makePlayer(`${id}-gk1`, 'GK', 1),
    makePlayer(`${id}-gk2`, 'GK', 21),
    makePlayer(`${id}-def1`, 'DEF', 2), makePlayer(`${id}-def2`, 'DEF', 3),
    makePlayer(`${id}-def3`, 'DEF', 4), makePlayer(`${id}-def4`, 'DEF', 5),
    makePlayer(`${id}-def5`, 'DEF', 22),
    makePlayer(`${id}-mid1`, 'MID', 6), makePlayer(`${id}-mid2`, 'MID', 7), makePlayer(`${id}-mid3`, 'MID', 8),
    makePlayer(`${id}-mid4`, 'MID', 23), makePlayer(`${id}-mid5`, 'MID', 24),
    makePlayer(`${id}-fwd1`, 'FWD', 9), makePlayer(`${id}-fwd2`, 'FWD', 10), makePlayer(`${id}-fwd3`, 'FWD', 11),
    makePlayer(`${id}-fwd4`, 'FWD', 25),
  ];
  return {
    id, name: `T-${id}`, abbreviation: id.toUpperCase(), color: '#000', secondaryColor: '#fff',
    logoUrl: '', squad,
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

describe('recoverFatigue', () => {
  it('reduz fadiga em 60 e clampa em 0', () => {
    const team = makeTeam('t', [
      makePlayer('p1', 'GK', 1, 80),
      makePlayer('p2', 'DEF', 2, 50),
      makePlayer('p3', 'MID', 3, 20),
    ]);
    const [out] = recoverFatigue([team]);
    expect(out.squad[0].currentFatigue).toBe(20);
    expect(out.squad[1].currentFatigue).toBe(0);
    expect(out.squad[2].currentFatigue).toBe(0);
  });

  it('decrementa injuredRounds e zera quando chega em 0', () => {
    const team = makeTeam('t', [
      makePlayer('p1', 'GK', 1, 0, 3),
      makePlayer('p2', 'DEF', 2, 0, 1),
      makePlayer('p3', 'MID', 3, 0),
    ]);
    const [out] = recoverFatigue([team]);
    expect(out.squad[0].injuredRounds).toBe(2);
    expect(out.squad[1].injuredRounds).toBeUndefined();
    expect(out.squad[2].injuredRounds).toBeUndefined();
  });
});

describe('applyPostMatchInjuries', () => {
  it('com chance 0 nunca lesiona', () => {
    const team = makeTeam('t');
    for (let i = 0; i < 50; i++) {
      const { team: out, injuries } = applyPostMatchInjuries(team, 0);
      expect(injuries.length).toBe(0);
      expect(out).toBe(team); // referência preservada
    }
  });

  it('com chance 1 sempre lesiona um titular não-lesionado', () => {
    const team = makeTeam('t');
    const { team: out, injuries } = applyPostMatchInjuries(team, 1, seededRng(7));
    expect(injuries).toHaveLength(1);
    expect(injuries[0].rounds).toBeGreaterThanOrEqual(1);
    expect(injuries[0].rounds).toBeLessThanOrEqual(3);
    const injured = out.squad.find(p => p.injuredRounds && p.injuredRounds > 0);
    expect(injured).toBeDefined();
    expect(injured!.id).toBe(injuries[0].player.id);
  });

  it('não lesiona quem já está lesionado', () => {
    const players = [
      makePlayer('gk', 'GK', 1, 0, 2),
      makePlayer('d1', 'DEF', 2, 0, 1),
      makePlayer('d2', 'DEF', 3, 0, 3),
      makePlayer('d3', 'DEF', 4, 0, 2),
      makePlayer('d4', 'DEF', 5, 0, 1),
      makePlayer('m1', 'MID', 6, 0, 3),
      makePlayer('m2', 'MID', 7, 0, 2),
      makePlayer('m3', 'MID', 8, 0, 1),
      makePlayer('f1', 'FWD', 9, 0, 2),
      makePlayer('f2', 'FWD', 10, 0, 1),
      // único saudável dos 11 titulares
      makePlayer('f3', 'FWD', 11, 0),
    ];
    const team = makeTeam('t', players);
    const { injuries } = applyPostMatchInjuries(team, 1, seededRng(3));
    expect(injuries).toHaveLength(1);
    expect(injuries[0].player.id).toBe('f3');
  });
});

describe('randomizeCPUTactics', () => {
  it('não muda o time do usuário', () => {
    const teams = [makeTeam('a'), makeTeam('b')];
    const before = JSON.stringify(teams[0].strategy);
    const out = randomizeCPUTactics(teams, teams[0].id, seededRng(1));
    expect(JSON.stringify(out[0].strategy)).toBe(before);
  });

  it('altera estratégia dos CPU ao longo de várias chamadas', () => {
    const teams = Array.from({ length: 5 }, (_, i) => makeTeam(`t${i}`));
    let changedCount = 0;
    for (let seed = 0; seed < 20; seed++) {
      const out = randomizeCPUTactics(teams, teams[0].id, seededRng(seed));
      out.slice(1).forEach((t, i) => {
        if (JSON.stringify(t.strategy) !== JSON.stringify(teams[i + 1].strategy)) changedCount++;
      });
    }
    expect(changedCount).toBeGreaterThan(20); // pelo menos algumas mudanças
  });
});

describe('generateLeagueSchedule', () => {
  it('gera 2(N-1) rodadas para N times (turno + returno)', () => {
    const teams = Array.from({ length: 6 }, (_, i) => makeTeam(`t${i}`));
    const schedule = generateLeagueSchedule(teams);
    expect(schedule.length).toBe(10);
  });

  it('cada rodada tem N/2 jogos', () => {
    const teams = Array.from({ length: 6 }, (_, i) => makeTeam(`t${i}`));
    const schedule = generateLeagueSchedule(teams);
    for (const round of schedule) {
      expect(round.length).toBe(3);
    }
  });

  it('cada time joga exatamente uma vez por rodada', () => {
    const teams = Array.from({ length: 8 }, (_, i) => makeTeam(`t${i}`));
    const schedule = generateLeagueSchedule(teams);
    for (const round of schedule) {
      const ids = new Set<string>();
      for (const f of round) {
        expect(ids.has(f.homeTeamId)).toBe(false);
        expect(ids.has(f.awayTeamId)).toBe(false);
        ids.add(f.homeTeamId); ids.add(f.awayTeamId);
      }
      expect(ids.size).toBe(8);
    }
  });

  it('cada par de times se enfrenta exatamente duas vezes (turno+returno)', () => {
    const teams = Array.from({ length: 6 }, (_, i) => makeTeam(`t${i}`));
    const schedule = generateLeagueSchedule(teams);
    const pairCounts = new Map<string, number>();
    for (const round of schedule) {
      for (const f of round) {
        const key = [f.homeTeamId, f.awayTeamId].sort().join('|');
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
    expect(pairCounts.size).toBe((6 * 5) / 2);
    for (const count of pairCounts.values()) expect(count).toBe(2);
  });
});

describe('createBracket', () => {
  it('cria 8 jogos nas oitavas com user incluído', () => {
    const user = makeTeam('user');
    const others = Array.from({ length: 20 }, (_, i) => makeTeam(`o${i}`));
    const b = createBracket(user, others, 'Copa', 'pl', seededRng(42));
    expect(b.roundOf16.length).toBe(8);
    expect(b.teams.length).toBe(16);
    expect(b.teams[0].id).toBe('user');
    expect(b.userTeamId).toBe('user');
    expect(b.stage).toBe('roundOf16');
  });

  it('é determinístico com mesma seed', () => {
    const user = makeTeam('user');
    const others = Array.from({ length: 20 }, (_, i) => makeTeam(`o${i}`));
    const b1 = createBracket(user, others, 'Copa', 'pl', seededRng(7));
    const b2 = createBracket(user, others, 'Copa', 'pl', seededRng(7));
    expect(b1.teams.map(t => t.id)).toEqual(b2.teams.map(t => t.id));
  });
});

describe('computeStandings', () => {
  it('pontua corretamente vitórias, empates e derrotas', () => {
    const teams = [makeTeam('a'), makeTeam('b'), makeTeam('c')];
    const fixtures: LeagueFixture[][] = [[
      { id: 'f1', roundIndex: 0, homeTeamId: 'a', awayTeamId: 'b', homeScore: 2, awayScore: 1, played: true },
      { id: 'f2', roundIndex: 0, homeTeamId: 'c', awayTeamId: 'a', homeScore: 0, awayScore: 0, played: true },
    ]];
    const s = computeStandings(teams, fixtures);
    const a = s.find(x => x.teamId === 'a')!;
    expect(a.points).toBe(4); // 1V + 1E
    expect(a.won).toBe(1);
    expect(a.drawn).toBe(1);
    expect(a.goalsFor).toBe(2);
    expect(a.goalsAgainst).toBe(1);
  });

  it('ordena por pontos > saldo > gols pró', () => {
    const teams = [makeTeam('a'), makeTeam('b'), makeTeam('c')];
    const fixtures: LeagueFixture[][] = [[
      { id: 'f1', roundIndex: 0, homeTeamId: 'a', awayTeamId: 'b', homeScore: 3, awayScore: 0, played: true },
      { id: 'f2', roundIndex: 0, homeTeamId: 'c', awayTeamId: 'b', homeScore: 1, awayScore: 0, played: true },
    ]];
    const s = computeStandings(teams, fixtures);
    expect(s[0].teamId).toBe('a'); // 3 pts, +3
    expect(s[1].teamId).toBe('c'); // 3 pts, +1
    expect(s[2].teamId).toBe('b'); // 0 pts
  });
});

describe('advanceBracket', () => {
  it('avança para quartas quando todas as oitavas terminam', () => {
    const user = makeTeam('user');
    const others = Array.from({ length: 20 }, (_, i) => makeTeam(`o${i}`));
    const b = createBracket(user, others, seededRng(1));
    // Marca todos os jogos das oitavas como concluídos
    b.roundOf16.forEach((m, i) => {
      m.played = true;
      m.homeScore = i % 2;
      m.awayScore = (i + 1) % 2;
      m.winnerId = m.homeScore > m.awayScore ? m.homeTeamId! : m.awayTeamId!;
    });
    const next = advanceBracket(b);
    expect(next.stage).toBe('quarterfinals');
    expect(next.quarterFinals.every(m => m.homeTeamId && m.awayTeamId)).toBe(true);
  });
});
