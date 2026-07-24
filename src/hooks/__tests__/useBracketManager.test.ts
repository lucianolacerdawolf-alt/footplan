// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBracketManager } from '../useBracketManager';
import { makeTeam } from '@/components/__tests__/testFixtures';
import { getLeague } from '@/data/leagues';

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

function mockParams(overrides: Partial<Parameters<typeof useBracketManager>[0]> = {}) {
  return {
    league: getLeague('pl')!,
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

describe('handleStartBracket', () => {
  it('creates a valid BracketState with correct stage and structure', () => {
    const params = mockParams();
    const { result } = renderHook(() => useBracketManager(params));
    const userTeam = makeTeam('user-1', 'Meu Time', 'MYT');

    act(() => {
      result.current.handleStartBracket(userTeam);
    });

    const state = result.current.bracketState;
    expect(state).not.toBeNull();
    expect(state!.stage).toBe('roundOf16');
    expect(state!.userTeamId).toBe(userTeam.id);
    expect(state!.cupName).toBe('FA Cup');
    expect(state!.leagueId).toBe('pl');
    expect(state!.teams.length).toBe(16);
  });

  it('roundOf16 has exactly 8 matches', () => {
    const params = mockParams();
    const { result } = renderHook(() => useBracketManager(params));
    const userTeam = makeTeam('user-1', 'Meu Time', 'MYT');

    act(() => {
      result.current.handleStartBracket(userTeam);
    });

    const state = result.current.bracketState!;
    expect(state.roundOf16.length).toBe(8);
    for (const match of state.roundOf16) {
      expect(match.played).toBe(false);
      expect(match.homeTeamId).not.toBeNull();
      expect(match.awayTeamId).not.toBeNull();
      expect(typeof match.id).toBe('string');
    }
  });

  it('quarterFinals, semiFinals, and final are empty (unplayed)', () => {
    const params = mockParams();
    const { result } = renderHook(() => useBracketManager(params));
    const userTeam = makeTeam('user-1', 'Meu Time', 'MYT');

    act(() => {
      result.current.handleStartBracket(userTeam);
    });

    const state = result.current.bracketState!;
    expect(state.quarterFinals.length).toBe(4);
    expect(state.semiFinals.length).toBe(2);
    expect(state.final.id).toBe('final');
    for (const match of state.quarterFinals) {
      expect(match.homeTeamId).toBeNull();
      expect(match.awayTeamId).toBeNull();
      expect(match.played).toBe(false);
    }
    for (const match of state.semiFinals) {
      expect(match.homeTeamId).toBeNull();
      expect(match.awayTeamId).toBeNull();
      expect(match.played).toBe(false);
    }
    expect(state.final.homeTeamId).toBeNull();
    expect(state.final.awayTeamId).toBeNull();
    expect(state.final.played).toBe(false);
  });

  it('user team is assigned to a roundOf16 slot', () => {
    const params = mockParams();
    const { result } = renderHook(() => useBracketManager(params));
    const userTeam = makeTeam('user-1', 'Meu Time', 'MYT');

    act(() => {
      result.current.handleStartBracket(userTeam);
    });

    const state = result.current.bracketState!;
    const userInRoundOf16 = state.roundOf16.some(
      m => m.homeTeamId === userTeam.id || m.awayTeamId === userTeam.id
    );
    expect(userInRoundOf16).toBe(true);

    const userInTeams = state.teams.find(t => t.id === userTeam.id);
    expect(userInTeams).toBeDefined();
  });

  it('navigates to bracket screen after starting', () => {
    const params = mockParams();
    const { result } = renderHook(() => useBracketManager(params));
    const userTeam = makeTeam('user-1', 'Meu Time', 'MYT');

    act(() => {
      result.current.handleStartBracket(userTeam);
    });

    expect(params.setScreen).toHaveBeenCalledWith('bracket');
  });

  it('falls back to PL teams when league is null', () => {
    const params = mockParams({ league: null });
    const { result } = renderHook(() => useBracketManager(params));
    const userTeam = makeTeam('user-1', 'Meu Time', 'MYT');

    act(() => {
      result.current.handleStartBracket(userTeam);
    });

    const state = result.current.bracketState!;
    expect(state).not.toBeNull();
    expect(state.teams.length).toBe(16);
    expect(state.leagueId).toBe('pl');
  });
});

describe('persistence', () => {
  it('persists bracket state to localStorage after start', () => {
    const params = mockParams();
    const { result } = renderHook(() => useBracketManager(params));
    const userTeam = makeTeam('user-1', 'Meu Time', 'MYT');

    act(() => {
      result.current.handleStartBracket(userTeam);
    });

    const stored = localStorage.getItem('fp:bracketState');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.userTeamId).toBe(userTeam.id);
    expect(parsed.stage).toBe('roundOf16');
    expect(parsed.roundOf16.length).toBe(8);
    expect(parsed.cupName).toBe('FA Cup');
  });

  it('restores bracket state from localStorage on mount', () => {
    const userTeam = makeTeam('user-1', 'Meu Time', 'MYT');
    const savedState = {
      teams: [userTeam],
      userTeamId: 'user-1',
      roundOf16: [{ id: 'r16-1', homeTeamId: 'user-1', awayTeamId: 'cpu-1', played: false }],
      quarterFinals: [],
      semiFinals: [],
      final: { id: 'final', homeTeamId: null, awayTeamId: null, played: false },
      stage: 'roundOf16' as const,
      cupName: 'Test Cup',
      leagueId: 'pl',
    };
    localStorage.setItem('fp:bracketState', JSON.stringify(savedState));

    const params = mockParams();
    const { result } = renderHook(() => useBracketManager(params));

    act(() => {});

    expect(result.current.bracketState).not.toBeNull();
    expect(result.current.bracketState!.userTeamId).toBe('user-1');
    expect(result.current.bracketState!.cupName).toBe('Test Cup');
  });

  it('starts with null when no saved state exists', () => {
    const params = mockParams();
    const { result } = renderHook(() => useBracketManager(params));

    expect(result.current.bracketState).toBeNull();
  });
});
