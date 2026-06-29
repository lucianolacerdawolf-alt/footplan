import React, { useState, useCallback } from 'react';
import type { Team, MatchResult, RandomFn } from './engine/types';
import type { GameMode } from './components/TeamSelectionScreen';
import type { PlayableStage } from './engine/tournament';
import HomeScreen from './components/HomeScreen';
import TeamSelectionScreen from './components/TeamSelectionScreen';
import SetupScreen from './components/SetupScreen';
import MatchScreen from './components/MatchScreen';
import MatchStatsScreen from './components/MatchStatsScreen';
import TournamentSetupScreen from './components/TournamentSetupScreen';
import LeagueScreen from './components/LeagueScreen';
import BracketScreen from './components/BracketScreen';
import AchievementsScreen from './components/AchievementsScreen';
import OnlineLobbyScreen from './components/OnlineLobbyScreen';
import LeagueSelectScreen from './components/LeagueSelectScreen';
import { useMatchHistory } from './hooks/useMatchHistory';
import { useH2H } from './hooks/useH2H';
import { useAchievements } from './hooks/useAchievements';
import { usePeerConnection } from './hooks/usePeerConnection';
import type { AchievementEvalInput } from './hooks/useAchievements';
import { useAppShell } from './hooks/useAppShell';
import { useLeagueManager } from './hooks/useLeagueManager';
import { useBracketManager } from './hooks/useBracketManager';
import { useGameFlow } from './hooks/useGameFlow';
import { useOnlineMatch } from './hooks/useOnlineMatch';
import { useResumePrompt } from './hooks/useResumePrompt';
import Toast from './components/Toast';
import './App.css';

function App() {
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('cpu');
  const [lastResult, setLastResult] = useState<MatchResult | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const notifySave = useCallback(() => setToastMsg('✓ Progresso salvo'), []);

  const {
    screen, setScreen,
    matchContext, setMatchContext,
    isKnockout, setIsKnockout,
    tournamentMode, setTournamentMode,
    isTournamentEntry, setIsTournamentEntry,
    selectedLeague, setSelectedLeague,
    goHome, handleContinueTournament,
  } = useAppShell();

  const { history, clearHistory } = useMatchHistory();
  const { record: recordH2H } = useH2H();
  const achievements = useAchievements();

  const evaluateAchievements = useCallback((input: AchievementEvalInput) => {
    const newlyUnlocked = achievements.evaluate(input);
    for (const ach of newlyUnlocked) {
      setToastMsg(`🏆 Conquista desbloqueada: ${ach.name}`);
    }
  }, [achievements]);

  const {
    leagueState, setLeagueState,
    handleStartLeague, handlePlayLeagueMatch, handleSimulateUserLeagueMatch,
    handleSimulateLeagueRound, handleNextLeagueRound, handleLeagueMatchResult,
    handleEditLeagueTactics,
  } = useLeagueManager({
    leagueId: selectedLeague?.id ?? 'pl',
    setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry,
    evaluateAchievements, recordH2H, notifySave, setToastMsg,
  });

  const {
    bracketState, setBracketState,
    handleStartBracket, handlePlayBracketMatch, handleSimulateOtherBracketMatches,
    handleSimulateBracketMatch, handleBracketMatchResult,
    handleEditBracketTactics,
  } = useBracketManager({
    setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry,
    evaluateAchievements, recordH2H, notifySave, setToastMsg,
  });

  const peer = usePeerConnection();

  const {
    handleTeamsSelected, handleStartMatch, handleViewStats,
  } = useGameFlow({
    setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout,
    setGameMode, setIsTournamentEntry, setLeagueState, setBracketState,
    setLastResult, matchContext, isTournamentEntry, leagueState, bracketState,
    homeTeam, recordH2H, evaluateAchievements,
  });

  const { onlineRngRef, handleStartOnlineMatch, handleOnlineMatchResult } = useOnlineMatch({
    setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout,
    setLastResult, recordH2H, evaluateAchievements, homeTeam,
  });

  // ── Torneio: setup ────────────────────────────────────────────────────────
  const handleTournamentStart = useCallback((userTeam: Team) => {
    if (tournamentMode === 'league') handleStartLeague(userTeam);
    else handleStartBracket(userTeam);
  }, [tournamentMode, handleStartLeague, handleStartBracket]);

  // ── Roteamento pós-stats ──────────────────────────────────────────────────
  const handleViewStatsFromMatch = useCallback((result: MatchResult) => {
    if (matchContext === 'league') { handleLeagueMatchResult(result); return; }
    if (matchContext === 'bracket') { handleBracketMatchResult(result); return; }
    handleViewStats(result);
  }, [matchContext, handleLeagueMatchResult, handleBracketMatchResult, handleViewStats]);

  // ── Resume prompt ─────────────────────────────────────────────────────────
  const { resumePrompt, setResumePrompt, handleResumeContinue, handleResumeNew } = useResumePrompt({
    setScreen, setTournamentMode,
    setLeagueState: () => setLeagueState(null),
    setBracketState: () => setBracketState(null),
  });

  const handleLeagueFromHome = useCallback(() => {
    if (!selectedLeague) { setScreen('league-select'); return; }
    if (leagueState && leagueState.phase !== 'done') setResumePrompt('league');
    else { setTournamentMode('league'); setScreen('tournament-setup'); }
  }, [leagueState, setTournamentMode, setScreen, setResumePrompt, selectedLeague]);

  const handleCupFromHome = useCallback(() => {
    if (bracketState && bracketState.stage !== 'champion') setResumePrompt('bracket');
    else { setTournamentMode('bracket'); setScreen('tournament-setup'); }
  }, [bracketState, setTournamentMode, setScreen, setResumePrompt]);

  // ── Render ────────────────────────────────────────────────────────────────
  let content: React.ReactNode;
  if (screen === 'league-select') {
    content = (
      <LeagueSelectScreen
        onSelect={(league) => {
          localStorage.setItem('fp:selectedLeague', JSON.stringify(league.id));
          setSelectedLeague(league);
          setScreen('home');
        }}
        onBack={() => setScreen('home')}
      />
    );
  } else if (screen === 'home') {
    content = (
      <HomeScreen
        onSingleMatch={() => setScreen('select')}
        onLeague={handleLeagueFromHome}
        onCup={handleCupFromHome}
        onAchievements={() => setScreen('achievements')}
        onOnline={() => setScreen('online-lobby')}
        selectedLeague={selectedLeague}
        onChangeLeague={() => { setSelectedLeague(null); setScreen('league-select'); }}
      />
    );
  } else if (screen === 'select') {
    content = <TeamSelectionScreen onConfirm={handleTeamsSelected} onTournament={() => setScreen('home')} />;
  } else if (screen === 'online-lobby') {
    content = <OnlineLobbyScreen peer={peer} onStartMatch={handleStartOnlineMatch} onBack={goHome} />;
  } else if (screen === 'tournament-setup') {
    if (!selectedLeague) {
      content = (
        <LeagueSelectScreen
          onSelect={(league) => {
            localStorage.setItem('fp:selectedLeague', JSON.stringify(league.id));
            setSelectedLeague(league);
            setScreen('home');
          }}
          onBack={() => setScreen('home')}
        />
      );
    } else {
      content = <TournamentSetupScreen mode={tournamentMode} league={selectedLeague} onBack={() => setScreen('home')} onStart={handleTournamentStart} />;
    }
  } else if (screen === 'league' && leagueState) {
    content = (
      <LeagueScreen
        state={leagueState}
        league={selectedLeague!}
        onPlayMatch={handlePlayLeagueMatch}
        onSimulateUserMatch={handleSimulateUserLeagueMatch}
        onSimulateRound={handleSimulateLeagueRound}
        onNextRound={handleNextLeagueRound}
        onEditTactics={handleEditLeagueTactics}
        onBack={goHome}
      />
    );
  } else if (screen === 'bracket' && bracketState) {
    content = (
      <BracketScreen
        state={bracketState}
        onPlayMatch={(match, home, away) => {
          const stage = bracketState.stage as PlayableStage;
          const matches = stage === 'roundOf16' ? bracketState.roundOf16
            : stage === 'quarterfinals' ? bracketState.quarterFinals
            : stage === 'semifinals' ? bracketState.semiFinals
            : [bracketState.final];
          handlePlayBracketMatch(match, home, away, stage, matches.findIndex(m => m.id === match.id));
        }}
        onSimulateMatch={handleSimulateBracketMatch}
        onSimulateOthers={handleSimulateOtherBracketMatches}
        onEditTactics={handleEditBracketTactics}
        onBack={goHome}
      />
    );
  } else if (screen === 'setup' && homeTeam && awayTeam) {
    content = (
      <SetupScreen
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onStartMatch={handleStartMatch}
        onBack={() => {
          if (isTournamentEntry) { setIsTournamentEntry(false); setScreen('tournament-setup'); return; }
          if (matchContext === 'league') setScreen('league');
          else if (matchContext === 'bracket') setScreen('bracket');
          else setScreen('select');
        }}
        lockAway={matchContext !== 'regular' || gameMode === 'cpu'}
      />
    );
  } else if (screen === 'match' && homeTeam && awayTeam) {
    const onlineRngFn: RandomFn | undefined = matchContext === 'online' && onlineRngRef.current
      ? () => onlineRngRef.current!.next()
      : undefined;
    const onlineProps = matchContext === 'online' && peer.state === 'connected' ? {
      isHost: peer.isHost,
      send: peer.send,
      setOnData: peer.setOnData,
    } : undefined;
    const isTournament = matchContext === 'league' || matchContext === 'bracket';
    content = (
      <MatchScreen
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onBack={() => setScreen(matchContext === 'online' ? 'online-lobby' : 'setup')}
        onViewStats={matchContext === 'online' ? handleOnlineMatchResult : handleViewStatsFromMatch}
        isKnockout={isKnockout}
        rng={onlineRngFn}
        online={onlineProps}
        onContinue={isTournament ? handleContinueTournament : undefined}
        continueLabel={matchContext === 'league' ? (selectedLeague ? `Continuar ${selectedLeague.name}` : 'Continuar Liga') : matchContext === 'bracket' ? 'Continuar FA Cup' : undefined}
      />
    );
  } else if (screen === 'stats' && lastResult) {
    const isTournament = matchContext !== 'regular' && matchContext !== 'online';
    content = (
      <MatchStatsScreen
        result={lastResult}
        history={isTournament ? [] : history}
        onMenu={goHome}
        onClearHistory={clearHistory}
        onContinue={isTournament ? handleContinueTournament : undefined}
        continueLabel={matchContext === 'league' ? (selectedLeague ? `Continuar ${selectedLeague.name}` : 'Continuar Liga') : matchContext === 'bracket' ? 'Continuar FA Cup' : undefined}
      />
    );
  } else if (screen === 'achievements') {
    content = (
      <AchievementsScreen
        achievements={achievements.getAll()}
        onBack={goHome}
      />
    );
  } else {
    content = (
      <HomeScreen
        onSingleMatch={() => setScreen('select')}
        onLeague={handleLeagueFromHome}
        onCup={handleCupFromHome}
        onAchievements={() => setScreen('achievements')}
        onOnline={() => setScreen('online-lobby')}
        selectedLeague={selectedLeague}
        onChangeLeague={() => { setSelectedLeague(null); setScreen('league-select'); }}
      />
    );
  }

  return (
    <>
      <div className="screen-fade" key={screen}>{content}</div>
      <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
      {resumePrompt && (
        <div className="resume-overlay" onClick={() => setResumePrompt(null)} role="presentation">
          <div className="resume-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="resume-title">
            <div className="resume-icon" aria-hidden="true">{resumePrompt === 'league' ? '📅' : '🏆'}</div>
            <div className="resume-title" id="resume-title">
              {resumePrompt === 'league' ? (selectedLeague ? `${selectedLeague.name} em andamento` : 'Liga em andamento') : 'FA Cup em andamento'}
            </div>
            <div className="resume-body">
              {resumePrompt === 'league' && leagueState
                ? `Você está na rodada ${leagueState.currentRound + 1} de ${leagueState.fixtures.length}.`
                : resumePrompt === 'bracket' && bracketState
                ? `Você está em ${bracketState.stage === 'roundOf16' ? 'Oitavas' : bracketState.stage === 'quarterfinals' ? 'Quartas' : bracketState.stage === 'semifinals' ? 'Semifinais' : 'Final'}.`
                : ''}
            </div>
            <div className="resume-actions">
              <button className="resume-btn-primary" onClick={handleResumeContinue}>
                Continuar de onde parei
              </button>
              <button className="resume-btn-secondary" onClick={handleResumeNew}>
                Nova temporada
              </button>
              <button className="resume-btn-cancel" onClick={() => setResumePrompt(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
