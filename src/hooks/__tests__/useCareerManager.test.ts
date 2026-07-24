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
