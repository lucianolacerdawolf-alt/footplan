// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import IntroSplash, { shouldShowIntro, INTRO_SEEN_KEY } from '../IntroSplash';

// Mesma convenção dos outros testes: storage em memória (o localStorage do Node é instável).
function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  } as Storage;
}

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduce && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }));
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  mockReducedMotion(false);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Abertura (primeira vez)', () => {
  it('aparece só enquanto não foi vista', () => {
    expect(shouldShowIntro()).toBe(true);
    localStorage.setItem(INTRO_SEEN_KEY, '1');
    expect(shouldShowIntro()).toBe(false);
  });

  it('não aparece pra quem pediu menos movimento no aparelho', () => {
    mockReducedMotion(true);
    expect(shouldShowIntro()).toBe(false);
  });

  it('termina sozinha em ~3s e marca como vista', () => {
    const onDone = vi.fn();
    render(<IntroSplash onDone={onDone} />);
    expect(screen.getByText('Plan')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3400); });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(INTRO_SEEN_KEY)).toBe('1');
  });

  it('Pular (ou tocar na tela) encerra na hora, uma vez só', () => {
    const onDone = vi.fn();
    render(<IntroSplash onDone={onDone} />);
    fireEvent.click(screen.getByText('Pular'));
    fireEvent.click(screen.getByLabelText('Abertura do FootPlan'));
    act(() => { vi.advanceTimersByTime(300); });
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(4000); });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(INTRO_SEEN_KEY)).toBe('1');
  });
});
