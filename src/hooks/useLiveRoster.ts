import { useCallback, useState } from 'react';
import type { LeagueDefinition } from '../data/leagues/types';
import { syncLeagueRoster, type RosterSource, type MergeStats } from '../services/rosterSync';
import { hasApiKey } from '../services/footballApi';

export interface UseLiveRosterReturn {
  syncing: boolean;
  lastSource: RosterSource | null;
  lastStats: MergeStats[];
  lastError: string | null;
  apiKeyConfigured: boolean;
  sync: (league: LeagueDefinition, opts?: { force?: boolean }) => Promise<LeagueDefinition>;
}

/** Sincroniza o elenco de uma liga com dados ao vivo (football-data.org), com cache e
 *  fallback pros dados estáticos — ver src/services/rosterSync.ts pros detalhes. */
export function useLiveRoster(): UseLiveRosterReturn {
  const [syncing, setSyncing] = useState(false);
  const [lastSource, setLastSource] = useState<RosterSource | null>(null);
  const [lastStats, setLastStats] = useState<MergeStats[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const sync = useCallback(async (league: LeagueDefinition, opts?: { force?: boolean }) => {
    setSyncing(true);
    try {
      const result = await syncLeagueRoster(league, opts);
      setLastSource(result.source);
      setLastStats(result.stats);
      setLastError(result.error ?? null);
      return result.league;
    } finally {
      setSyncing(false);
    }
  }, []);

  return { syncing, lastSource, lastStats, lastError, apiKeyConfigured: hasApiKey(), sync };
}
