// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCareerManager } from '../useCareerManager';
import { makeTeam } from '../../components/__tests__/testFixtures';
import { getLeague } from '../../data/leagues';

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
