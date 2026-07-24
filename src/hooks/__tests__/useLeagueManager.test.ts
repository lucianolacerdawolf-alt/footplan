// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLeagueManager } from '../useLeagueManager';
import { makeTeam } from '@/components/__tests__/testFixtures';
import { getLeague } from '@/data/leagues';

function createUserTeamForPl(name: string, abbr: string) {
  return makeTeam(getLeague('pl')!.teams[0].id, name, abbr);
}

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

function mockParams(overrides: Partial<Parameters<typeof useLeagueManager>[0]> = {}) {
  return {
    leagueId: 'pl',
    setScreen: vi.fn(),
    setHomeTeam: vi.fn(),
    setAwayTeam: vi.fn(),
    setMatchContext: vi.fn(),
    setIsKnockout: vi.fn(),
    setIsTournamentEntry: vi.fn(),
    evaluateAchievements: vi.fn(),
    recordH2H: vi.fn(),
    notifySave: vi.fn(),
    setToastMsg: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('handleStartLeague', () => {
  it('creates a valid LeagueState with correct round count and fixture structure', () => {
    const params = mockParams();
    const { result } = renderHook(() => useLeagueManager(params));
    const userTeam = createUserTeamForPl('Meu Time', 'MYT');

    act(() => {
      result.current.handleStartLeague(userTeam);
    });

    const state = result.current.leagueState;
    expect(state).not.toBeNull();
    expect(state!.phase).toBe('playing');
    expect(state!.currentRound).toBe(0);
    expect(state!.userTeamId).toBe(userTeam.id);
    expect(state!.teams.length).toBe(20); // PL has 20 teams
    expect(state!.fixtures.length).toBe(38); // (20-1) * 2 = 38 rounds
    expect(state!.fixtures[0].length).toBe(10); // 20/2 = 10 fixtures per round
  });

  it('fixtures have correct structure (rounds, matches with played:false)', () => {
    const params = mockParams();
    const { result } = renderHook(() => useLeagueManager(params));
    const userTeam = createUserTeamForPl('Meu Time', 'MYT');

    act(() => {
      result.current.handleStartLeague(userTeam);
    });

    const state = result.current.leagueState!;

    // Check first round fixtures
    const firstRound = state.fixtures[0];
    for (const fixture of firstRound) {
      expect(fixture.played).toBe(false);
      expect(fixture.homeScore).toBeUndefined();
      expect(fixture.awayScore).toBeUndefined();
      expect(fixture.roundIndex).toBe(0);
      expect(typeof fixture.id).toBe('string');
      expect(typeof fixture.homeTeamId).toBe('string');
      expect(typeof fixture.awayTeamId).toBe('string');
    }

    // Check last round fixtures
    const lastRound = state.fixtures[37];
    for (const fixture of lastRound) {
      expect(fixture.played).toBe(false);
      expect(fixture.roundIndex).toBe(37);
    }
  });

  it('user team is included in the teams array', () => {
    const params = mockParams();
    const { result } = renderHook(() => useLeagueManager(params));
    const userTeam = createUserTeamForPl('Meu Time', 'MYT');

    act(() => {
      result.current.handleStartLeague(userTeam);
    });

    const state = result.current.leagueState!;
    const found = state.teams.find(t => t.id === userTeam.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('Meu Time');
  });

  it('navigates to league screen after starting', () => {
    const params = mockParams();
    const { result } = renderHook(() => useLeagueManager(params));
    const userTeam = createUserTeamForPl('Meu Time', 'MYT');

    act(() => {
      result.current.handleStartLeague(userTeam);
    });

    expect(params.setScreen).toHaveBeenCalledWith('league');
  });

  it('is a no-op when league is not found', () => {
    const params = mockParams({ leagueId: 'nonexistent' });
    const { result } = renderHook(() => useLeagueManager(params));
    const userTeam = createUserTeamForPl('Meu Time', 'MYT');

    act(() => {
      result.current.handleStartLeague(userTeam);
    });

    expect(result.current.leagueState).toBeNull();
    expect(params.setScreen).not.toHaveBeenCalled();
  });
});

describe('persistence', () => {
  it('persists league state to localStorage after start', () => {
    const params = mockParams();
    const { result } = renderHook(() => useLeagueManager(params));
    const userTeam = createUserTeamForPl('Meu Time', 'MYT');

    act(() => {
      result.current.handleStartLeague(userTeam);
    });

    const stored = localStorage.getItem('fp:leagueState:pl');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.userTeamId).toBe(userTeam.id);
    expect(parsed.phase).toBe('playing');
    expect(parsed.currentRound).toBe(0);
  });

  it('restores league state from localStorage on mount', () => {
    const userTeam = createUserTeamForPl('Meu Time', 'MYT');
    const savedState = {
      teams: [userTeam],
      userTeamId: 'user-1',
      fixtures: [[{ id: 'r0-f0', roundIndex: 0, homeTeamId: 'user-1', awayTeamId: 'cpu-1', played: false }]],
      currentRound: 0,
      phase: 'playing' as const,
    };
    localStorage.setItem('fp:leagueState:pl', JSON.stringify(savedState));

    const params = mockParams();
    const { result } = renderHook(() => useLeagueManager(params));

    // Allow useEffect to run
    act(() => {});

    // The state should be restored from localStorage, not null
    expect(result.current.leagueState).not.toBeNull();
    expect(result.current.leagueState!.userTeamId).toBe('user-1');
    expect(result.current.leagueState!.phase).toBe('playing');
  });

  it('starts with null when no saved state exists', () => {
    const params = mockParams();
    const { result } = renderHook(() => useLeagueManager(params));

    expect(result.current.leagueState).toBeNull();
  });
});

describe('handleNextLeagueRound', () => {
  it('advances currentRound by 1', () => {
    const params = mockParams();
    const { result } = renderHook(() => useLeagueManager(params));
    const userTeam = createUserTeamForPl('Meu Time', 'MYT');

    act(() => {
      result.current.handleStartLeague(userTeam);
    });
    expect(result.current.leagueState!.currentRound).toBe(0);

    act(() => {
      result.current.handleNextLeagueRound();
    });
    expect(result.current.leagueState!.currentRound).toBe(1);
  });

  it('sets phase to done when last round is completed', () => {
    const params = mockParams();
    const { result } = renderHook(() => useLeagueManager(params));
    const userTeam = createUserTeamForPl('Meu Time', 'MYT');

    act(() => {
      result.current.handleStartLeague(userTeam);
    });

    // Advance to the last round
    for (let i = 0; i < 37; i++) {
      act(() => {
        result.current.handleNextLeagueRound();
      });
    }
    expect(result.current.leagueState!.phase).toBe('playing');

    // One more advance should finish the league
    act(() => {
      result.current.handleNextLeagueRound();
    });
    expect(result.current.leagueState!.phase).toBe('done');
  });
});
