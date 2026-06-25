import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { MatchResult, TeamStats } from '../engine/types';

export interface MatchRecord {
  id: string;
  date: string;
  homeTeam: { name: string; abbreviation: string; color: string; logoUrl: string };
  awayTeam: { name: string; abbreviation: string; color: string; logoUrl: string };
  homeScore: number;
  awayScore: number;
  homePossession: number;
  awayPossession: number;
  homeStats: TeamStats;
  awayStats: TeamStats;
}

const MAX_HISTORY = 20;

export function useMatchHistory() {
  const [history, setHistory] = useLocalStorage<MatchRecord[]>('fp:history', []);

  const addMatch = useCallback((result: MatchResult) => {
    const record: MatchRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
      homeTeam: { name: result.homeTeam.name, abbreviation: result.homeTeam.abbreviation, color: result.homeTeam.color, logoUrl: result.homeTeam.logoUrl },
      awayTeam: { name: result.awayTeam.name, abbreviation: result.awayTeam.abbreviation, color: result.awayTeam.color, logoUrl: result.awayTeam.logoUrl },
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      homePossession: result.homePossession,
      awayPossession: result.awayPossession,
      homeStats: result.homeStats,
      awayStats: result.awayStats,
    };
    setHistory(prev => [record, ...prev].slice(0, MAX_HISTORY));
  }, [setHistory]);

  const clearHistory = useCallback(() => setHistory([]), [setHistory]);

  return { history, addMatch, clearHistory };
}
