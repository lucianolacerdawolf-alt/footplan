import { useCallback, useState } from 'react';
import { safeSetItem } from '../utils/storage';

export function useLocalStorage<T>(key: string, initial: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initial;
    } catch {
      return initial;
    }
  });

  // Identidade estável (como o setter do useState). Antes era recriado a cada render,
  // o que mudava a identidade de quem dependia dele (ex: useMatchHistory.addMatch) e
  // fazia o effect de fim de partida do MatchScreen rodar em loop — dezenas de
  // "Maximum update depth exceeded" e o histórico enchendo de cópias da mesma partida.
  const setStored = useCallback((val: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof val === 'function' ? (val as (prev: T) => T)(prev) : val;
      safeSetItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  return [value, setStored];
}
