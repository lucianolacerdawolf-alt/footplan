import { useEffect, useState } from 'react';

export type ThemeMode = 'auto' | 'light' | 'dark';

const KEY = 'fp:theme';

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch { /* noop */ }
  return 'auto';
}

function apply(mode: ThemeMode) {
  const html = document.documentElement;
  if (mode === 'auto') html.removeAttribute('data-theme');
  else html.setAttribute('data-theme', mode);
}

// Aplica tema sincronamente no carregamento (evita flash)
if (typeof document !== 'undefined') apply(readStored());

export function useTheme(): [ThemeMode, (m: ThemeMode) => void, () => void] {
  const [mode, setMode] = useState<ThemeMode>(readStored);

  useEffect(() => { apply(mode); }, [mode]);

  const set = (m: ThemeMode) => {
    setMode(m);
    try { localStorage.setItem(KEY, m); } catch { /* noop */ }
  };

  const cycle = () => {
    const order: ThemeMode[] = ['auto', 'light', 'dark'];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    set(next);
  };

  return [mode, set, cycle];
}
