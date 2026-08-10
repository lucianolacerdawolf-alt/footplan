import { useCallback, useEffect, useRef, useState } from 'react';
import type { LeagueDefinition } from '../data/leagues/types';
import { syncLeagueRoster, syncAllLeagueRosters, getRosterSyncInfo, type RosterSource, type MergeStats, type AllRostersResult } from '../services/rosterSync';
import { hasApiKey } from '../services/footballApi';

export interface UseLiveRosterReturn {
  syncing: boolean;
  lastSource: RosterSource | null;
  lastStats: MergeStats[];
  lastError: string | null;
  apiKeyConfigured: boolean;
  lastUpdatedAt: string | null;
  /** Busca de uma liga — sem force, NUNCA chama a API (cache → cloud → estático). */
  sync: (league: LeagueDefinition, opts?: { force?: boolean }) => Promise<LeagueDefinition>;
  /** Sincroniza as 12 ligas de uma vez. Com force, busca ao vivo na API e grava no Supabase. */
  syncAll: (opts?: { force?: boolean }) => Promise<AllRostersResult | null>;
  /** Carrega a data da última atualização (pra exibir "última atualização em…"). */
  loadSyncInfo: () => Promise<void>;
}

/** Sincroniza elencos com dados ao vivo (football-data.org), com cache + snapshot no Supabase e
 *  fallback pros dados estáticos — ver src/services/rosterSync.ts pros detalhes. */
export function useLiveRoster(): UseLiveRosterReturn {
  const [syncing, setSyncing] = useState(false);
  const [lastSource, setLastSource] = useState<RosterSource | null>(null);
  const [lastStats, setLastStats] = useState<MergeStats[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  // Token de sequência: se o usuário disparar 2 syncs concorrentes, o resultado do
  // MAIS NOVO vence (antes era last-write-wins por ordem de chegada — o mais velho
  // podia sobrescrever o estado do mais novo ao resolver depois).
  const seqRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const sync = useCallback(async (league: LeagueDefinition, opts?: { force?: boolean }) => {
    const seq = ++seqRef.current;
    setSyncing(true);
    setLastError(null);
    try {
      const result = await syncLeagueRoster(league, opts);
      if (!mountedRef.current || seq !== seqRef.current) return league;
      setLastSource(result.source);
      setLastStats(result.stats);
      setLastError(result.error ?? null);
      if (opts?.force && result.source === 'live') setLastUpdatedAt(new Date().toISOString());
      return result.league;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido ao sincronizar';
      if (mountedRef.current && seq === seqRef.current) setLastError(msg);
      return league;
    } finally {
      if (mountedRef.current && seq === seqRef.current) setSyncing(false);
    }
  }, []);

  const syncAll = useCallback(async (opts?: { force?: boolean }): Promise<AllRostersResult | null> => {
    const seq = ++seqRef.current;
    setSyncing(true);
    setLastError(null);
    try {
      const result = await syncAllLeagueRosters(opts);
      if (!mountedRef.current || seq !== seqRef.current) return null;
      setLastSource(opts?.force ? 'live' : (result.liveCount > 0 ? 'live' : 'cloud'));
      setLastStats([]);
      setLastUpdatedAt(result.updatedAt);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido ao sincronizar';
      if (mountedRef.current && seq === seqRef.current) setLastError(msg);
      return null;
    } finally {
      if (mountedRef.current && seq === seqRef.current) setSyncing(false);
    }
  }, []);

  const loadSyncInfo = useCallback(async () => {
    const info = await getRosterSyncInfo();
    if (mountedRef.current) setLastUpdatedAt(info.updatedAt);
  }, []);

  return { syncing, lastSource, lastStats, lastError, apiKeyConfigured: hasApiKey(), lastUpdatedAt, sync, syncAll, loadSyncInfo };
}
