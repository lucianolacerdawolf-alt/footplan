import { useState, useCallback } from 'react';
import type { Team } from './engine/types';
import type { GameMode } from './components/TeamSelectionScreen';
import TeamSelectionScreen from './components/TeamSelectionScreen';
import SetupScreen from './components/SetupScreen';
import MatchScreen from './components/MatchScreen';
import './App.css';

type Screen = 'select' | 'setup' | 'match';

function App() {
  const [screen, setScreen] = useState<Screen>('select');
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('cpu');

  const handleTeamsSelected = useCallback((home: Team, away: Team, mode: GameMode) => {
    setHomeTeam(home);
    setAwayTeam(away);
    setGameMode(mode);
    setScreen('setup');
  }, []);

  const handleStartMatch = useCallback((home: Team, away: Team) => {
    setHomeTeam(home);
    setAwayTeam(away);
    setScreen('match');
  }, []);

  const handleBackToSelect = useCallback(() => {
    setScreen('select');
    setHomeTeam(null);
    setAwayTeam(null);
  }, []);

  const handleBackToSetup = useCallback(() => {
    setScreen('setup');
  }, []);

  if (screen === 'setup' && homeTeam && awayTeam) {
    return (
      <SetupScreen
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onStartMatch={handleStartMatch}
        onBack={handleBackToSelect}
        lockAway={gameMode === 'cpu'}
      />
    );
  }

  if (screen === 'match' && homeTeam && awayTeam) {
    return <MatchScreen homeTeam={homeTeam} awayTeam={awayTeam} onBack={handleBackToSetup} />;
  }

  return <TeamSelectionScreen onConfirm={handleTeamsSelected} />;
}

export default App;
