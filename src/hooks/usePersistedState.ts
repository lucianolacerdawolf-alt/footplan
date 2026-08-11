import { useEffect, useRef, useState } from 'react';
import { safeSetItem } from '../utils/storage';

/**
 * useState que persiste em localStorage e dispara onChange a partir
 * do segundo render (evita toast no mount).
 */
export function usePersistedState<T>(
  key: string,
  initial: T | (() => T),
  opts?: { onPersist?: (value: T) => void }
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const readFromStorage = (k: string): T => {
    try {
      const stored = localStorage.getItem(k);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch { /* noop */ }
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  };

  const [value, setValue] = useState<T>(() => readFromStorage(key));
  const keyRef = useRef(key);
  const didMount = useRef(false);

  // A key muda quando o "dono" do estado persistido troca (ex: usuário troca de liga
  // sem remontar o componente) — sem isso, o valor antigo ficava preso em memória e a
  // nova chave herdava dados da liga errada. Ajuste de estado durante o render é o
  // padrão recomendado pelo React pra resetar estado quando um "prop" (aqui, a key) muda.
  if (keyRef.current !== key) {
    keyRef.current = key;
    didMount.current = false;
    setValue(readFromStorage(key));
  }

  const onPersist = opts?.onPersist;

  useEffect(() => {
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        safeSetItem(key, JSON.stringify(value));
      }
    } catch { /* noop */ }
    if (didMount.current && onPersist && value !== null && value !== undefined) {
      onPersist(value);
    }
    didMount.current = true;
  }, [key, value, onPersist]);

  return [value, setValue];
}
