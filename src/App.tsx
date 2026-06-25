import { useState, useCallback } from 'react';
import type { Team, MatchResult } from './engine/types';
import type { GameMode } from './components/TeamSelectionScreen';
import TeamSelectionScreen from './components/TeamSelectionScreen';
import SetupScreen from './components/SetupScreen';
import MatchScreen from './components/MatchScreen';
import MatchStatsScreen from './components/MatchStatsScreen';
import { useMatchHistory } from './hooks/useMatchHistory';
import './App.css';

type Screen = 'select' | 'setup' | 'match' | 'stats';

function App() {
  const [screen, setScreen] = useState<Screen>('select');
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('cpu');
  const [lastResult, setLastResult] = useState<MatchResult | null>(null);
  const { history, clearHistory } = useMatchHistory();

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

  const handleViewStats = useCallback((result: MatchResult) => {
    setLastResult(result);
    setScreen('stats');
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
    return (
      <MatchScreen
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onBack={handleBackToSetup}
        onViewStats={handleViewStats}
      />
    );
  }

  if (screen === 'stats' && lastResult) {
    return (
      <MatchStatsScreen
        result={lastResult}
        history={history}
        onPlayAgain={() => setScreen('match')}
        onMenu={handleBackToSelect}
        onClearHistory={clearHistory}
      />
    );
  }

  return <TeamSelectionScreen onConfirm={handleTeamsSelected} />;
}

export default App;
