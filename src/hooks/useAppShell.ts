import { useState, useCallback } from 'react';
import type { LeagueDefinition } from '../data/leagues/types';
import { getLeague } from '../data/leagues';

type Screen = 'league-select' | 'home' | 'select' | 'setup' | 'match' | 'stats' | 'tournament-setup' | 'league' | 'bracket' | 'achievements' | 'online-lobby';
type MatchContext = 'regular' | 'league' | 'bracket' | 'online';
type TournamentMode = 'league' | 'bracket';

export function useAppShell() {
  // Primeira tela é sempre league-select
  const [screen, setScreen] = useState<Screen>('league-select');
  const [matchContext, setMatchContext] = useState<MatchContext>('regular');
  const [isKnockout, setIsKnockout] = useState(false);
  const [tournamentMode, setTournamentMode] = useState<TournamentMode>('league');
  const [isTournamentEntry, setIsTournamentEntry] = useState(false);

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

  // Voltar = ir para league-select (ela é a tela raiz)
  const goHome = useCallback(() => setScreen('league-select'), []);

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
