// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCareerManager } from '../useCareerManager';
import { makeTeam } from '@/components/__tests__/testFixtures';
import { getLeague } from '@/data/leagues';
import type { MatchResult, MatchEvent } from '@/engine/types';

// Node 22+'s built-in global `localStorage` shadows jsdom's window.localStorage
// in vitest's jsdom environment (it's excluded from vitest's window-key copy
// allowlist) and returns undefined without a `--localstorage-file` CLI flag —
// so this hook's usePersistedState('fp:career', ...) reads/writes silently no-op
// under test. Polyfill an in-memory Storage on globalThis so the hook's real
// localStorage calls (and this file's `localStorage.clear()`/`.setItem()`) work.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}
Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true });

function mockParams() {
  return {
    setScreen: vi.fn(),
    setHomeTeam: vi.fn(),
    setAwayTeam: vi.fn(),
    setMatchContext: vi.fn(),
    setIsKnockout: vi.fn(),
    setIsTournamentEntry: vi.fn(),
    recordH2H: vi.fn(),
    notifySave: vi.fn(),
    setToastMsg: vi.fn(),
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('handleStartCareer (D-01, D-13)', () => {
  it('seeds all 6 real leagues and creates season 1 league+cup together', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    // leagueDef must be one of the real allLeagues entries — handleStartCareer
    // indexes rosters by leagueDef.id against the real allLeagues import (D-01),
    // so a standalone test-fixture league id (not in allLeagues) would leave
    // rosters[leagueDef.id] unset. userTeam.id matches an existing static PL
    // team's id, simulating the TournamentSetupScreen flow where the user
    // picks one of the league's own teams (replace-by-id path in handleStartCareer).
    const leagueDef = getLeague('pl')!;
    const chosenStaticTeam = leagueDef.teams[0];
    const userTeam = makeTeam(chosenStaticTeam.id, 'Meu Time', 'MYT');
    act(() => {
      result.current.handleStartCareer(userTeam, leagueDef, 'Alex');
    });

    expect(result.current.careerState).not.toBeNull();
    expect(Object.keys(result.current.careerState!.rosters).length).toBe(6);
    expect(result.current.careerState!.season.cup.roundOf16.length).toBe(8);
    expect(result.current.careerState!.season.league.phase).toBe('playing');
    // .age is only populated by assignInitialAges on the seeded/aged clone path —
    // proves the replace-by-id branch ran on the passed-in userTeam, not a fresh
    // clone of the static league data's same-id team.
    expect(result.current.careerState!.rosters['pl'].find(t => t.id === userTeam.id)?.squad[0].age).toBeTypeOf('number');
  });
});

describe('D-14: single save slot', () => {
  it('overwrites the previous career on a second handleStartCareer call', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const firstTeam = makeTeam('first-team', 'Primeiro Time', 'FST');
    const secondTeam = makeTeam('second-team', 'Segundo Time', 'SCT');
    const firstLeagueDef = getLeague('pl')!;
    const secondLeagueDef = getLeague('laliga')!;

    act(() => {
      result.current.handleStartCareer(firstTeam, firstLeagueDef, 'Alex');
    });
    const firstLeagueId = result.current.careerState!.leagueId;
    expect(firstLeagueId).toBe(firstLeagueDef.id);

    act(() => {
      result.current.handleStartCareer(secondTeam, secondLeagueDef, 'Sam');
    });

    expect(result.current.careerState!.leagueId).toBe(secondLeagueDef.id);
    expect(result.current.careerState!.leagueId).not.toBe(firstLeagueId);
  });
});

describe('T-04.4-02: malformed fp:career recovery', () => {
  it('discards a syntactically valid but wrongly-shaped fp:career value on mount', async () => {
    localStorage.setItem('fp:career', JSON.stringify({ version: 1 }));

    const { result } = renderHook(() => useCareerManager(mockParams()));

    await act(async () => {});

    expect(result.current.careerState).toBeNull();
  });
});

function startPlCareer(result: { current: ReturnType<typeof useCareerManager> }) {
  const leagueDef = getLeague('pl')!;
  const chosenStaticTeam = leagueDef.teams[0];
  const userTeam = makeTeam(chosenStaticTeam.id, 'Meu Time', 'MYT');
  act(() => {
    result.current.handleStartCareer(userTeam, leagueDef, 'Alex');
  });
  const leagueId = result.current.careerState!.leagueId;
  const userTeamId = result.current.careerState!.season.league.userTeamId;
  const opponentTeamId = result.current.careerState!.rosters[leagueId].find(t => t.id !== userTeamId)!.id;
  return { leagueId, userTeamId, opponentTeamId };
}

describe('D-06: trade cap', () => {
  it('rejects the 4th trade proposal once the 3-trade cap is hit, even with a guaranteed-favorable offer', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId, opponentTeamId } = startPlCareer(result);

    // Math.random defaults evaluateTradeOffer's rng — mocking it to 0.01 guarantees
    // rng() < acceptChance on every call, since 0.01 is below even the clamp's floor
    // of 0.02, independent of the offer's actual favorability. This makes the first
    // 3 proposals deterministically accepted, no retry loop or flake risk.
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);

    let lastResult: { accepted: boolean; reason: string } | undefined;
    for (let i = 0; i < 4; i++) {
      const state = result.current.careerState!;
      const userSquad = state.rosters[leagueId].find(t => t.id === userTeamId)!.squad;
      const oppSquad = state.rosters[leagueId].find(t => t.id === opponentTeamId)!.squad;
      const offeredPlayerId = userSquad[0].id;
      const requestedPlayerId = oppSquad[0].id;
      act(() => {
        lastResult = result.current.handleProposeTrade(offeredPlayerId, opponentTeamId, requestedPlayerId);
      });
    }

    expect(lastResult).toEqual({ accepted: false, reason: 'trade-limit-reached' });
    expect(result.current.careerState!.season.tradesUsedThisSeason).toBe(3);

    randomSpy.mockRestore();
  });
});

describe('D-07: trade persistence', () => {
  it('permanently moves the traded players in both rosters and season.league.teams', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId, opponentTeamId } = startPlCareer(result);

    const before = result.current.careerState!;
    const userSquad = before.rosters[leagueId].find(t => t.id === userTeamId)!.squad;
    const oppSquad = before.rosters[leagueId].find(t => t.id === opponentTeamId)!.squad;
    const offeredPlayerId = userSquad[0].id;
    const requestedPlayerId = oppSquad[0].id;

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    act(() => {
      result.current.handleProposeTrade(offeredPlayerId, opponentTeamId, requestedPlayerId);
    });
    randomSpy.mockRestore();

    const after = result.current.careerState!;
    const afterUserRoster = after.rosters[leagueId].find(t => t.id === userTeamId)!.squad;
    const afterOppRoster = after.rosters[leagueId].find(t => t.id === opponentTeamId)!.squad;
    expect(afterUserRoster.some(p => p.id === requestedPlayerId)).toBe(true);
    expect(afterUserRoster.some(p => p.id === offeredPlayerId)).toBe(false);
    expect(afterOppRoster.some(p => p.id === offeredPlayerId)).toBe(true);
    expect(afterOppRoster.some(p => p.id === requestedPlayerId)).toBe(false);

    const afterUserLeagueTeam = after.season.league.teams.find(t => t.id === userTeamId)!.squad;
    const afterOppLeagueTeam = after.season.league.teams.find(t => t.id === opponentTeamId)!.squad;
    expect(afterUserLeagueTeam.some(p => p.id === requestedPlayerId)).toBe(true);
    expect(afterUserLeagueTeam.some(p => p.id === offeredPlayerId)).toBe(false);
    expect(afterOppLeagueTeam.some(p => p.id === offeredPlayerId)).toBe(true);
    expect(afterOppLeagueTeam.some(p => p.id === requestedPlayerId)).toBe(false);
  });
});

function forceTerminalSeason(result: { current: ReturnType<typeof useCareerManager> }) {
  act(() => {
    result.current.setCareerState(prev => prev && ({
      ...prev,
      season: {
        ...prev.season,
        league: { ...prev.season.league, phase: 'done' as const },
        cup: { ...prev.season.cup, stage: 'champion' as const, championId: prev.season.league.userTeamId },
      },
    }));
  });
}

describe('D-13: season-advance gate', () => {
  it('is a no-op unless both league and cup are terminal, then advances once both are', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);

    act(() => {
      result.current.handleAdvanceSeason();
    });
    expect(result.current.careerState!.currentSeasonYear).toBe(1);

    forceTerminalSeason(result);

    act(() => {
      result.current.handleAdvanceSeason();
    });

    expect(result.current.careerState!.currentSeasonYear).toBe(2);
    expect(result.current.careerState!.history.length).toBe(1);
    expect(result.current.careerState!.season.tradesUsedThisSeason).toBe(0);
  });
});

describe('D-08, D-09: reputation', () => {
  it('increases manager reputation by the computed delta on a league+cup double', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);

    const reputationBefore = result.current.careerState!.manager.reputation;

    forceTerminalSeason(result);

    act(() => {
      result.current.handleAdvanceSeason();
    });

    const entry = result.current.careerState!.history[0];
    expect(entry.reputationDelta).toBeGreaterThan(0);
    expect(result.current.careerState!.manager.reputation).toBe(
      Math.max(0, Math.min(100, reputationBefore + entry.reputationDelta))
    );
  });
});

function playUserFixtureWithEvents(
  result: { current: ReturnType<typeof useCareerManager> },
  userTeamId: string,
  events: MatchEvent[]
) {
  const league = result.current.careerState!.season.league;
  const fixture = league.fixtures[league.currentRound].find(
    f => f.homeTeamId === userTeamId || f.awayTeamId === userTeamId
  )!;
  const home = league.teams.find(t => t.id === fixture.homeTeamId)!;
  const away = league.teams.find(t => t.id === fixture.awayTeamId)!;

  act(() => {
    result.current.handlePlayCareerLeagueMatch(fixture, home, away);
  });

  const matchResult: MatchResult = {
    homeTeam: home, awayTeam: away, homeScore: 1, awayScore: 0,
    events,
    homePossession: 55, awayPossession: 45,
    homeStats: { shots: 5, shotsOnTarget: 2, fouls: 3, yellowCards: 0, redCards: 0 },
    awayStats: { shots: 3, shotsOnTarget: 1, fouls: 2, yellowCards: 0, redCards: 0 },
  };

  act(() => {
    result.current.handleCareerLeagueMatchResult(matchResult);
  });
}

describe('Fadiga e cartões pós-partida (Modo Carreira)', () => {
  it('aplica fadiga aos titulares e acumula 1 amarelo sem suspender', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);

    const userTeamBefore = result.current.careerState!.season.league.teams.find(t => t.id === userTeamId)!;
    const starter = userTeamBefore.squad.find(p => p.position !== 'GK')!;

    playUserFixtureWithEvents(result, userTeamId, [
      { minute: 10, type: 'yellowCard', description: 'Cartão', teamId: userTeamId, playerId: starter.id },
    ]);

    const userTeamAfter = result.current.careerState!.season.league.teams.find(t => t.id === userTeamId)!;
    const starterAfter = userTeamAfter.squad.find(p => p.id === starter.id)!;
    expect(starterAfter.yellowCardsThisSeason).toBe(1);
    expect(starterAfter.isSuspended).toBeFalsy();
    expect(starterAfter.currentFatigue).toBeGreaterThan(starter.currentFatigue);

    // goleiro titular não cansa
    const gkAfter = userTeamAfter.squad.find(p => p.position === 'GK')!;
    expect(gkAfter.currentFatigue).toBe(0);
  });

  it('suspende ao acumular 3 amarelos e libera ao avançar a rodada', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);

    const starterId = result.current.careerState!.season.league.teams
      .find(t => t.id === userTeamId)!.squad.find(p => p.position !== 'GK')!.id;

    for (let i = 0; i < 3; i++) {
      playUserFixtureWithEvents(result, userTeamId, [
        { minute: 20, type: 'yellowCard', description: 'Cartão', teamId: userTeamId, playerId: starterId },
      ]);
    }

    const suspendedTeam = result.current.careerState!.season.league.teams.find(t => t.id === userTeamId)!;
    const suspendedPlayer = suspendedTeam.squad.find(p => p.id === starterId)!;
    expect(suspendedPlayer.yellowCardsThisSeason).toBe(0); // reseta ao suspender
    expect(suspendedPlayer.isSuspended).toBe(true);
    expect(suspendedPlayer.suspendedRounds).toBe(1);

    // applyPostMatchInjuries tem chance aleatória de gerar mensagem obrigatória
    // (relatório de lesão) nas 3 partidas acima — marca tudo como lido antes de
    // avançar pra não depender de sorte pra este teste passar.
    act(() => {
      result.current.handleMarkAllInboxRead();
    });
    act(() => {
      result.current.handleNextCareerLeagueRound();
    });

    const releasedTeam = result.current.careerState!.season.league.teams.find(t => t.id === userTeamId)!;
    const releasedPlayer = releasedTeam.squad.find(p => p.id === starterId)!;
    expect(releasedPlayer.isSuspended).toBe(false);
    expect(releasedPlayer.suspendedRounds).toBeUndefined();
  });

  it('vermelho direto suspende por 1 jogo mesmo sem 3 amarelos', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);

    const starterId = result.current.careerState!.season.league.teams
      .find(t => t.id === userTeamId)!.squad.find(p => p.position !== 'GK')!.id;

    playUserFixtureWithEvents(result, userTeamId, [
      { minute: 60, type: 'redCard', description: 'Vermelho', teamId: userTeamId, playerId: starterId },
    ]);

    const team = result.current.careerState!.season.league.teams.find(t => t.id === userTeamId)!;
    const player = team.squad.find(p => p.id === starterId)!;
    expect(player.isSuspended).toBe(true);
    expect(player.suspendedRounds).toBe(1);
  });
});

describe('Finanças e Inbox (Modo Carreira)', () => {
  it('handleStartCareer define orçamento inicial, folha salarial e mensagem de boas-vindas', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);

    const state = result.current.careerState!;
    expect(state.finances).toBeDefined();
    expect(state.finances!.budget).toBeGreaterThan(0);
    expect(state.finances!.wageBill).toBeGreaterThan(0); // elenco já tem weeklyWage atribuído
    expect(state.finances!.weeklyIncome).toBeGreaterThan(0);

    expect(state.inbox).toHaveLength(1);
    expect(state.inbox![0].type).toBe('BOARD_UPDATE');
    expect(state.inbox![0].isRead).toBe(false);
    expect(state.inbox![0].isMandatory).toBe(false);

    // valuation aplicada ao elenco do usuário
    const userTeam = state.season.league.teams.find(t => t.id === state.season.league.userTeamId)!;
    expect(userTeam.squad.every(p => typeof p.marketValue === 'number')).toBe(true);
    expect(userTeam.squad.every(p => typeof p.weeklyWage === 'number')).toBe(true);
  });

  it('handleNextCareerLeagueRound credita a renda semanal e debita a folha salarial do orçamento', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);

    const before = result.current.careerState!.finances!;
    act(() => {
      result.current.handleNextCareerLeagueRound();
    });
    const after = result.current.careerState!.finances!;

    expect(after.budget).toBe(before.budget + before.weeklyIncome - after.wageBill);
  });

  it('bloqueia handleNextCareerLeagueRound enquanto houver mensagem obrigatória não lida', () => {
    const params = mockParams();
    const { result } = renderHook(() => useCareerManager(params));
    const { userTeamId } = startPlCareer(result);

    // Força uma lesão determinística (rng mockado): applyPostMatchInjuries usa
    // Math.random() < 0.15 pra decidir se ocorre, então 0 sempre lesiona.
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    playUserFixtureWithEvents(result, userTeamId, []);
    randomSpy.mockRestore();

    const inboxAfterMatch = result.current.careerState!.inbox!;
    expect(inboxAfterMatch.some(m => m.type === 'INJURY_REPORT' && m.isMandatory && !m.isRead)).toBe(true);

    const roundBefore = result.current.careerState!.season.league.currentRound;
    act(() => {
      result.current.handleNextCareerLeagueRound();
    });
    // bloqueado: a rodada não avançou
    expect(result.current.careerState!.season.league.currentRound).toBe(roundBefore);
    expect(params.setToastMsg).toHaveBeenCalledWith(expect.stringContaining('mensagens obrigatórias'));

    act(() => {
      result.current.handleMarkAllInboxRead();
    });
    act(() => {
      result.current.handleNextCareerLeagueRound();
    });
    expect(result.current.careerState!.season.league.currentRound).toBe(roundBefore + 1);
  });

  it('handleMarkInboxRead marca só a mensagem indicada', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);
    const messageId = result.current.careerState!.inbox![0].id;

    act(() => {
      result.current.handleMarkInboxRead(messageId);
    });

    expect(result.current.careerState!.inbox![0].isRead).toBe(true);
  });
});

describe('Hall of Fame — fechamento de temporada (handleAdvanceSeason)', () => {
  it('registra artilheiro do usuário, aproveitamento e variação de orçamento no histórico', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);

    const starterId = result.current.careerState!.season.league.teams
      .find(t => t.id === userTeamId)!.squad.find(p => p.position !== 'GK')!.id;
    const starterName = result.current.careerState!.season.league.teams
      .find(t => t.id === userTeamId)!.squad.find(p => p.id === starterId)!.name;

    playUserFixtureWithEvents(result, userTeamId, [
      { minute: 15, type: 'goal', description: 'Gol!', teamId: userTeamId, scorer: starterName },
    ]);

    forceTerminalSeason(result);
    act(() => {
      result.current.handleAdvanceSeason();
    });

    const entry = result.current.careerState!.history[0];
    expect(entry.userTopScorer).toEqual({ name: starterName, goals: 1 });
    expect(entry.userWins).toBeTypeOf('number');
    expect(entry.userDraws).toBeTypeOf('number');
    expect(entry.userLosses).toBeTypeOf('number');
    expect((entry.userWins ?? 0) + (entry.userDraws ?? 0) + (entry.userLosses ?? 0)).toBeGreaterThanOrEqual(1);
    expect(entry.budgetDelta).toBeTypeOf('number');
    expect(entry.managerOfSeason).toBeTypeOf('boolean');

    // artilheiro reseta pra próxima temporada — não deve "vazar" gol da temporada anterior
    expect(result.current.careerState!.season.userGoalScorers).toEqual({});
  });

  it('sem gols do usuário na temporada, userTopScorer fica undefined', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);

    forceTerminalSeason(result);
    act(() => {
      result.current.handleAdvanceSeason();
    });

    expect(result.current.careerState!.history[0].userTopScorer).toBeUndefined();
  });
});
