// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeSetItem, onStorageFailure, isQuotaError } from '../storage';

// Mesma convenção de rosterSync.test.ts: Node 26 expõe um localStorage experimental
// quebrado e o jsdom do vitest não o sobrescreve — stuba sempre com memory storage.
function makeMemoryStorage(): Storage {
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

function quotaError(): DOMException {
  return new DOMException('quota exceeded', 'QuotaExceededError');
}

describe('isQuotaError', () => {
  it('reconhece QuotaExceededError e ignora outros erros', () => {
    expect(isQuotaError(quotaError())).toBe(true);
    expect(isQuotaError(new Error('x'))).toBe(false);
    expect(isQuotaError(null)).toBe(false);
  });
});

describe('safeSetItem', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('persiste e retorna true com storage saudável', () => {
    expect(safeSetItem('fp:x', 'v')).toBe(true);
    expect(localStorage.getItem('fp:x')).toBe('v');
  });

  it('com quota cheia, evicta caches de roster e retrya uma vez', () => {
    localStorage.setItem('fp:rosterCache:pl', 'x'.repeat(100));
    const spy = vi.spyOn(localStorage, 'setItem')
      .mockImplementationOnce(() => { throw quotaError(); });

    expect(safeSetItem('fp:career', 'ok')).toBe(true);

    expect(spy).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('fp:rosterCache:pl')).toBeNull();
    expect(localStorage.getItem('fp:career')).toBe('ok');
  });

  it('falha persistente retorna false e notifica a UI uma única vez (throttle)', () => {
    const handler = vi.fn();
    const off = onStorageFailure(handler);
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw quotaError(); });

    expect(safeSetItem('fp:career', 'x')).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);

    expect(safeSetItem('fp:career', 'x')).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    off();
  });
});
