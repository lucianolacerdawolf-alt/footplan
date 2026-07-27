import { useState, useCallback } from 'react';
import type { LeagueDefinition } from '../data/leagues/types';
import type { Screen, MatchContext, TournamentMode } from '../types/navigation';
import { getLeague } from '../data/leagues';

export function useAppShell() {
  const [screen, setScreen] = useState<Screen>('home');
  const [matchContext, setMatchContext] = useState<MatchContext>('regular');
  const [isKnockout, setIsKnockout] = useState(false);
  const [tournamentMode, setTournamentMode] = useState<TournamentMode>('league');
  const [isTournamentEntry, setIsTournamentEntry] = useState(false);
  const [isCareerMode, setIsCareerModeRaw] = useState<boolean>(() => {
    try {
      return localStorage.getItem('fp:isCareerMode') === '1';
    } catch { return false; }
  });

  const setIsCareerMode = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setIsCareerModeRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      try { localStorage.setItem('fp:isCareerMode', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  // Carrega a liga salva na inicialização para destacar no LeagueSelectScreen
  const [selectedLeague, setSelectedLeague] = useState<LeagueDefinition | null>(() => {
    try {
      const stored = localStorage.getItem('fp:selectedLeague');
      if (!stored) return null;
      const id = JSON.parse(stored) as string;
      return getLeague(id) ?? null;
    } catch {
      return null;
    }
  });

  const [returnScreen, setReturnScreen] = useState<Screen | null>(null);

  const goHome = useCallback(() => {
    setSelectedLeague(null);
    try { localStorage.removeItem('fp:selectedLeague'); } catch {}
    try { localStorage.removeItem('fp:homeId'); } catch {}
    try { localStorage.removeItem('fp:awayId'); } catch {}
    try { localStorage.removeItem('fp:homeUniform'); } catch {}
    try { localStorage.removeItem('fp:awayUniform'); } catch {}
    try { localStorage.removeItem('fp:mode'); } catch {}
    try { localStorage.removeItem('fp:isCareerMode'); } catch {}
    setMatchContext('regular');
    setIsKnockout(false);
    setIsTournamentEntry(false);
    setIsCareerMode(false);
    setScreen('home');
  }, [setIsCareerMode]);

  const handleContinueTournament = useCallback(() => {
    setScreen(isCareerMode
      ? (matchContext === 'league' ? 'career-league' : 'career-bracket')
      : (matchContext === 'league' ? 'league' : 'bracket'));
  }, [matchContext, isCareerMode]);

  return {
    screen, setScreen,
    matchContext, setMatchContext,
    isKnockout, setIsKnockout,
    tournamentMode, setTournamentMode,
    isTournamentEntry, setIsTournamentEntry,
    isCareerMode, setIsCareerMode,
    selectedLeague, setSelectedLeague,
    returnScreen, setReturnScreen,
    goHome, handleContinueTournament,
  };
}
