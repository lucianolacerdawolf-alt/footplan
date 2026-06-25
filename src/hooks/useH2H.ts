import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface H2HMatchLog {
  date: string;        // ISO yyyy-mm-dd
  gf: number;
  ga: number;
  result: 'W' | 'D' | 'L';
}

export interface H2HRecord {
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  last: ('W' | 'D' | 'L')[];      // mantém pra compatibilidade (UI rápida)
  log?: H2HMatchLog[];             // últimos 5 jogos detalhados (mais recente primeiro)
}

type H2HMap = Record<string, Record<string, H2HRecord>>;

const empty = (): H2HRecord => ({ wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, last: [], log: [] });

export function useH2H() {
  const [map, setMap] = useLocalStorage<H2HMap>('fp:h2h', {});

  const record = useCallback((aId: string, bId: string, aScore: number, bScore: number) => {
    const date = new Date().toISOString().slice(0, 10);
    setMap(prev => {
      const next: H2HMap = { ...prev };
      const apply = (from: string, to: string, gf: number, ga: number) => {
        const fromMap = { ...(next[from] ?? {}) };
        const cur = { ...(fromMap[to] ?? empty()) };
        cur.gf += gf;
        cur.ga += ga;
        let res: 'W' | 'D' | 'L';
        if (gf > ga) { cur.wins++; res = 'W'; }
        else if (gf === ga) { cur.draws++; res = 'D'; }
        else { cur.losses++; res = 'L'; }
        cur.last = [res, ...cur.last].slice(0, 5);
        cur.log = [{ date, gf, ga, result: res }, ...(cur.log ?? [])].slice(0, 5);
        fromMap[to] = cur;
        next[from] = fromMap;
      };
      apply(aId, bId, aScore, bScore);
      apply(bId, aId, bScore, aScore);
      return next;
    });
  }, [setMap]);

  const get = useCallback((aId: string, bId: string): H2HRecord | null => map[aId]?.[bId] ?? null, [map]);

  return { record, get };
}
