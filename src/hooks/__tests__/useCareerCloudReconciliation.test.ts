// @vitest-environment jsdom
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCareerManager } from '../useCareerManager';
import { makeTeam } from '@/components/__tests__/testFixtures';
import { getLeague } from '@/data/leagues';
import type { CareerState } from '@/engine/career';

vi.mock('@/services/cloudSave', () => ({
  loadCareer: vi.fn(),
  saveCareer: vi.fn(),
}));
vi.mock('@/services/supabaseClient', () => ({
  getSupabaseClient: vi.fn(),
  resetAuth: vi.fn(),
}));

import { loadCareer } from '@/services/cloudSave';

// Node 22+'s built-in global `localStorage` shadows jsdom's — mesmo polyfill
// in-memory do useCareerManager.test.ts.
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
    setIsCareerMode: vi.fn(),
    recordH2H: vi.fn(),
    notifySave: vi.fn(),
    setToastMsg: vi.fn(),
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon');
  vi.mocked(loadCareer).mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** Cria uma carreira real, desmonta e deixa localStorage com fp:career + fp:career:savedAt. */
function startLocalCareer(): CareerState {
  const { result, unmount } = renderHook(() => useCareerManager(mockParams()));
  const leagueDef = getLeague('pl')!;
  const userTeam = makeTeam(leagueDef.teams[0].id, 'Meu Time', 'MYT');
  act(() => {
    result.current.handleStartCareer(userTeam, leagueDef, 'Local');
  });
  const state = result.current.careerState!;
  unmount();
  return state;
}

describe('reconciliação cloud × local (mount)', () => {
  it('cloud mais velho que o local NÃO sobrescreve o progresso local', async () => {
    const localState = startLocalCareer();
    const localSavedAt = Number(localStorage.getItem('fp:career:savedAt'));
    const cloudState: CareerState = { ...localState, manager: { name: 'Cloud', reputation: 0 } };
    vi.mocked(loadCareer).mockResolvedValue({
      state: cloudState,
      updatedAt: new Date(localSavedAt - 60_000).toISOString(),
    });

    const { result } = renderHook(() => useCareerManager(mockParams()));
    await waitFor(() => expect(result.current.careerState?.manager.name).toBe('Local'));
  });

  it('cloud mais novo que o local sobrescreve', async () => {
    const localState = startLocalCareer();
    const localSavedAt = Number(localStorage.getItem('fp:career:savedAt'));
    const cloudState: CareerState = { ...localState, manager: { name: 'Cloud', reputation: 0 } };
    vi.mocked(loadCareer).mockResolvedValue({
      state: cloudState,
      updatedAt: new Date(localSavedAt + 60_000).toISOString(),
    });

    const { result } = renderHook(() => useCareerManager(mockParams()));
    await waitFor(() => expect(result.current.careerState?.manager.name).toBe('Cloud'));
  });

  it('sem save local, o cloud é aplicado mesmo sendo antigo', async () => {
    const localState = startLocalCareer();
    localStorage.clear();
    const cloudState: CareerState = { ...localState, manager: { name: 'Cloud', reputation: 0 } };
    vi.mocked(loadCareer).mockResolvedValue({
      state: cloudState,
      updatedAt: new Date(Date.now() - 60_000).toISOString(),
    });

    const { result } = renderHook(() => useCareerManager(mockParams()));
    await waitFor(() => expect(result.current.careerState?.manager.name).toBe('Cloud'));
  });
});
