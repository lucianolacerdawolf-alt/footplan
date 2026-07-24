import { useState, useCallback } from 'react';
import type { LeagueDefinition } from '../data/leagues/types';
import type { Screen, MatchContext, TournamentMode } from '../types/navigation';
import { getLeague } from '../data/leagues';

export function useAppShell() {
  // Primeira tela é sempre home (tipo de jogo primeiro, depois liga)
  const [screen, setScreen] = useState<Screen>('home');
  const [matchContext, setMatchContext] = useState<MatchContext>('regular');
  const [isKnockout, setIsKnockout] = useState(false);
  const [tournamentMode, setTournamentMode] = useState<TournamentMode>('league');
  const [isTournamentEntry, setIsTournamentEntry] = useState(false);
  const [isCareerMode, setIsCareerMode] = useState(false);

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

  const goHome = useCallback(() => setScreen('home'), []);

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
