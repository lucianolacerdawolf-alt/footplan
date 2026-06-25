import { useEffect, useRef, useState } from 'react';

/**
 * useState que persiste em localStorage e dispara onChange a partir
 * do segundo render (evita toast no mount).
 */
export function usePersistedState<T>(
  key: string,
  initial: T | (() => T),
  opts?: { onPersist?: (value: T) => void }
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch { /* noop */ }
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });

  const didMount = useRef(false);
  const onPersist = opts?.onPersist;

  useEffect(() => {
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch { /* noop */ }
    if (didMount.current && onPersist && value !== null && value !== undefined) {
      onPersist(value);
    }
    didMount.current = true;
  }, [key, value, onPersist]);

  return [value, setValue];
}
