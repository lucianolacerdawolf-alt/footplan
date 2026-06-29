import { useState, useCallback } from 'react';
import type { LeagueDefinition } from '../data/leagues/types';

type Screen = 'league-select' | 'home' | 'select' | 'setup' | 'match' | 'stats' | 'tournament-setup' | 'league' | 'bracket' | 'achievements' | 'online-lobby';
type MatchContext = 'regular' | 'league' | 'bracket' | 'online';
type TournamentMode = 'league' | 'bracket';

export function useAppShell() {
  const [screen, setScreen] = useState<Screen>(() => {
    const stored = localStorage.getItem('fp:selectedLeague');
    return stored ? 'home' : 'league-select';
  });
  const [matchContext, setMatchContext] = useState<MatchContext>('regular');
  const [isKnockout, setIsKnockout] = useState(false);
  const [tournamentMode, setTournamentMode] = useState<TournamentMode>('league');
  const [isTournamentEntry, setIsTournamentEntry] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<LeagueDefinition | null>(null);
  const [returnScreen, setReturnScreen] = useState<Screen | null>(null);

  const goHome = useCallback(() => setScreen('home'), []);

  const handleContinueTournament = useCallback(() => {
    setScreen(matchContext === 'league' ? 'league' : 'bracket');
  }, [matchContext]);

  return {
    screen, setScreen,
    matchContext, setMatchContext,
    isKnockout, setIsKnockout,
    tournamentMode, setTournamentMode,
    isTournamentEntry, setIsTournamentEntry,
    selectedLeague, setSelectedLeague,
    returnScreen, setReturnScreen,
    goHome, handleContinueTournament,
  };
}
