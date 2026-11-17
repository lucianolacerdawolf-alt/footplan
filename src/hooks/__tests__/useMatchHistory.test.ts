// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMatchHistory } from '../useMatchHistory';
import { useLocalStorage } from '../useLocalStorage';

// Regressão: o setter do useLocalStorage era recriado a cada render, então addMatch
// mudava de identidade a cada render e o effect de fim de partida do MatchScreen
// (que depende de addMatch) rodava em loop — "Maximum update depth exceeded" e
// histórico cheio de cópias da mesma partida.
describe('identidade estável dos setters', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() { return store.size; },
    });
  });

  it('useLocalStorage devolve o mesmo setter entre renders', () => {
    const { result, rerender } = renderHook(() => useLocalStorage('fp:test', 0));
    const first = result.current[1];
    act(() => first(1));
    rerender();
    expect(result.current[1]).toBe(first);
    expect(result.current[0]).toBe(1);
  });

  it('useMatchHistory devolve o mesmo addMatch depois de gravar', () => {
    const { result } = renderHook(() => useMatchHistory());
    const first = result.current.addMatch;
    const team = { name: 'A', abbreviation: 'AAA', color: '#000', logoUrl: '' };
    act(() => first({ homeTeam: team, awayTeam: team, homeScore: 1, awayScore: 0, homePossession: 50, awayPossession: 50 } as never));
    expect(result.current.addMatch).toBe(first);
    expect(result.current.history).toHaveLength(1);
  });
});
