import { useState, useCallback } from 'react';

type Screen = 'home' | 'select' | 'setup' | 'match' | 'stats' | 'tournament-setup' | 'league' | 'bracket' | 'achievements' | 'online-lobby';
type MatchContext = 'regular' | 'league' | 'bracket' | 'online';
type TournamentMode = 'league' | 'bracket';

export function useAppShell() {
  const [screen, setScreen] = useState<Screen>('home');
  const [matchContext, setMatchContext] = useState<MatchContext>('regular');
  const [isKnockout, setIsKnockout] = useState(false);
  const [tournamentMode, setTournamentMode] = useState<TournamentMode>('league');
  const [isTournamentEntry, setIsTournamentEntry] = useState(false);

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
    goHome, handleContinueTournament,
  };
}
