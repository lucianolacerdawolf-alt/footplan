import { useState, useCallback } from 'react';
import type { Team, MatchResult } from './engine/types';
import type { GameMode } from './components/TeamSelectionScreen';
import type { LeagueState, BracketState, BracketMatch, LeagueFixture } from './engine/tournament';
import { generateLeagueSchedule, createBracket, advanceBracket, simularBracketMatch, simularRodadaAuto } from './engine/tournament';
import { cloneTeam } from './utils/teamUtils';
import TeamSelectionScreen from './components/TeamSelectionScreen';
import SetupScreen from './components/SetupScreen';
import MatchScreen from './components/MatchScreen';
import MatchStatsScreen from './components/MatchStatsScreen';
import TournamentSetupScreen from './components/TournamentSetupScreen';
import LeagueScreen from './components/LeagueScreen';
import BracketScreen from './components/BracketScreen';
import { useMatchHistory } from './hooks/useMatchHistory';
import { premierLeagueTeams } from './data/premierLeague';
import './App.css';

type Screen = 'select' | 'setup' | 'match' | 'stats' | 'tournament-setup' | 'league' | 'bracket';
type MatchContext = 'regular' | 'league' | 'bracket';

function App() {
  const [screen, setScreen] = useState<Screen>('select');
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('cpu');
  const [lastResult, setLastResult] = useState<MatchResult | null>(null);
  const [matchContext, setMatchContext] = useState<MatchContext>('regular');
  const [isKnockout, setIsKnockout] = useState(false);
  const [leagueState, setLeagueState] = useState<LeagueState | null>(null);
  const [bracketState, setBracketState] = useState<BracketState | null>(null);
  const [pendingLeagueFixture, setPendingLeagueFixture] = useState<{ roundIdx: number; fixtureIdx: number } | null>(null);
  const [pendingBracketStage, setPendingBracketStage] = useState<'quarterfinals' | 'semifinals' | 'final' | null>(null);
  const [pendingBracketIdx, setPendingBracketIdx] = useState<number>(0);

  const { history, clearHistory } = useMatchHistory();

  // ── Partida normal ────────────────────────────────────────────────────────
  const handleTeamsSelected = useCallback((home: Team, away: Team, mode: GameMode) => {
    setHomeTeam(home); setAwayTeam(away); setGameMode(mode);
    setMatchContext('regular'); setIsKnockout(false);
    setScreen('setup');
  }, []);

  const handleStartMatch = useCallback((home: Team, away: Team) => {
    setHomeTeam(home); setAwayTeam(away);
    setScreen('match');
  }, []);

  const handleBackToSelect = useCallback(() => {
    setScreen('select'); setHomeTeam(null); setAwayTeam(null);
  }, []);

  const handleBackToSetup = useCallback(() => setScreen('setup'), []);

  const handleViewStats = useCallback((result: MatchResult) => {
    setLastResult(result);
    setScreen('stats');
  }, []);

  // ── Torneio ───────────────────────────────────────────────────────────────
  const handleStartLeague = useCallback((userTeam: Team) => {
    const allTeams = premierLeagueTeams.map(cloneTeam);
    // Put userTeam first (so schedule is built around it)
    const rest = allTeams.filter(t => t.id !== userTeam.id);
    const orderedTeams = [userTeam, ...rest];
    const fixtures = generateLeagueSchedule(orderedTeams);
    setLeagueState({ teams: orderedTeams, userTeamId: userTeam.id, fixtures, currentRound: 0, phase: 'playing' });
    setScreen('league');
  }, []);

  const handleStartBracket = useCallback((userTeam: Team, others: Team[]) => {
    const state = createBracket(userTeam, others);
    setBracketState(state);
    setScreen('bracket');
  }, []);

  // ── Liga: jogar ───────────────────────────────────────────────────────────
  const handlePlayLeagueMatch = useCallback((fixture: LeagueFixture, home: Team, away: Team) => {
    const roundIdx = fixture.roundIndex;
    const fixtureIdx = leagueState!.fixtures[roundIdx].findIndex(f => f.id === fixture.id);
    setPendingLeagueFixture({ roundIdx, fixtureIdx });
    setHomeTeam(cloneTeam(home)); setAwayTeam(cloneTeam(away));
    setMatchContext('league'); setIsKnockout(false);
    setScreen('setup');
  }, [leagueState]);

  const handleSimulateLeagueRound = useCallback((roundIndex: number) => {
    if (!leagueState) return;
    const newRound = simularRodadaAuto(leagueState.fixtures[roundIndex], leagueState.teams, leagueState.userTeamId);
    const newFixtures = leagueState.fixtures.map((r, i) => i === roundIndex ? newRound : r);
    setLeagueState({ ...leagueState, fixtures: newFixtures });
  }, [leagueState]);

  const handleNextLeagueRound = useCallback(() => {
    if (!leagueState) return;
    const next = leagueState.currentRound + 1;
    setLeagueState({ ...leagueState, currentRound: next, phase: next >= leagueState.fixtures.length ? 'done' : 'playing' });
  }, [leagueState]);

  const handleLeagueMatchResult = useCallback((result: MatchResult) => {
    if (!leagueState || !pendingLeagueFixture) return;
    const { roundIdx, fixtureIdx } = pendingLeagueFixture;
    const newFixtures = leagueState.fixtures.map((round, ri) =>
      ri === roundIdx
        ? round.map((f, fi) => fi === fixtureIdx ? { ...f, homeScore: result.homeScore, awayScore: result.awayScore, played: true } : f)
        : round
    );
    setLeagueState({ ...leagueState, fixtures: newFixtures });
    setLastResult(result);
    setScreen('stats');
  }, [leagueState, pendingLeagueFixture]);

  // ── Copa: jogar ───────────────────────────────────────────────────────────
  const handlePlayBracketMatch = useCallback((_match: BracketMatch, home: Team, away: Team, stage: 'quarterfinals' | 'semifinals' | 'final', matchIdx: number) => {
    setPendingBracketStage(stage);
    setPendingBracketIdx(matchIdx);
    setHomeTeam(cloneTeam(home)); setAwayTeam(cloneTeam(away));
    setMatchContext('bracket'); setIsKnockout(true);
    setScreen('setup');
  }, []);

  const handleSimulateBracketMatch = useCallback((stage: 'quarterfinals' | 'semifinals' | 'final', matchIdx: number) => {
    if (!bracketState) return;
    const stageMatches = stage === 'quarterfinals' ? bracketState.quarterFinals
      : stage === 'semifinals' ? bracketState.semiFinals
      : [bracketState.final];
    const match = stageMatches[matchIdx];
    const home = bracketState.teams.find(t => t.id === match.homeTeamId)!;
    const away = bracketState.teams.find(t => t.id === match.awayTeamId)!;
    const simResult = simularBracketMatch(home, away);
    const updatedMatch: BracketMatch = { ...match, ...simResult };
    let newState = { ...bracketState };
    if (stage === 'quarterfinals') {
      const qf = [...bracketState.quarterFinals]; qf[matchIdx] = updatedMatch; newState = { ...newState, quarterFinals: qf };
    } else if (stage === 'semifinals') {
      const sf = [...bracketState.semiFinals]; sf[matchIdx] = updatedMatch; newState = { ...newState, semiFinals: sf };
    } else {
      newState = { ...newState, final: updatedMatch };
    }
    setBracketState(advanceBracket(newState));
  }, [bracketState]);

  const handleBracketMatchResult = useCallback((result: MatchResult) => {
    if (!bracketState || !pendingBracketStage) return;
    const stageMatches = pendingBracketStage === 'quarterfinals' ? bracketState.quarterFinals
      : pendingBracketStage === 'semifinals' ? bracketState.semiFinals
      : [bracketState.final];
    const match = stageMatches[pendingBracketIdx];
    const home = bracketState.teams.find(t => t.id === match.homeTeamId)!;
    const away = bracketState.teams.find(t => t.id === match.awayTeamId)!;
    const winnerId = result.winner
      ? result.winner.id
      : result.penaltyResult
        ? (result.penaltyResult.winner === 'home' ? home.id : away.id)
        : result.homeScore >= result.awayScore ? home.id : away.id;
    const updatedMatch: BracketMatch = {
      ...match,
      homeScore: result.homeScore, awayScore: result.awayScore,
      wentToExtraTime: result.wentToExtraTime,
      extraTimeHomeScore: result.extraTimeHomeScore,
      extraTimeAwayScore: result.extraTimeAwayScore,
      penaltyHomeScore: result.penaltyResult?.homeScore,
      penaltyAwayScore: result.penaltyResult?.awayScore,
      winnerId, played: true,
    };
    let newState = { ...bracketState };
    if (pendingBracketStage === 'quarterfinals') {
      const qf = [...bracketState.quarterFinals]; qf[pendingBracketIdx] = updatedMatch; newState = { ...newState, quarterFinals: qf };
    } else if (pendingBracketStage === 'semifinals') {
      const sf = [...bracketState.semiFinals]; sf[pendingBracketIdx] = updatedMatch; newState = { ...newState, semiFinals: sf };
    } else {
      newState = { ...newState, final: updatedMatch };
    }
    const advanced = advanceBracket(newState);
    setBracketState(advanced);
    setLastResult(result);
    setScreen('stats');
  }, [bracketState, pendingBracketStage, pendingBracketIdx]);

  // ── Continuar depois dos stats ────────────────────────────────────────────
  const handleContinueTournament = useCallback(() => {
    if (matchContext === 'league') setScreen('league');
    else if (matchContext === 'bracket') setScreen('bracket');
  }, [matchContext]);

  const handleViewStatsFromMatch = useCallback((result: MatchResult) => {
    if (matchContext === 'league') { handleLeagueMatchResult(result); return; }
    if (matchContext === 'bracket') { handleBracketMatchResult(result); return; }
    handleViewStats(result);
  }, [matchContext, handleLeagueMatchResult, handleBracketMatchResult, handleViewStats]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (screen === 'tournament-setup') {
    return (
      <TournamentSetupScreen
        onBack={() => setScreen('select')}
        onStartLeague={handleStartLeague}
        onStartBracket={handleStartBracket}
      />
    );
  }

  if (screen === 'league' && leagueState) {
    return (
      <LeagueScreen
        state={leagueState}
        onPlayMatch={handlePlayLeagueMatch}
        onSimulateRound={handleSimulateLeagueRound}
        onNextRound={handleNextLeagueRound}
        onBack={handleBackToSelect}
      />
    );
  }

  if (screen === 'bracket' && bracketState) {
    return (
      <BracketScreen
        state={bracketState}
        onPlayMatch={(match, home, away) => {
          const stage = bracketState.stage as 'quarterfinals' | 'semifinals' | 'final';
          const matches = stage === 'quarterfinals' ? bracketState.quarterFinals
            : stage === 'semifinals' ? bracketState.semiFinals
            : [bracketState.final];
          const idx = matches.findIndex(m => m.id === match.id);
          handlePlayBracketMatch(match, home, away, stage, idx);
        }}
        onSimulateMatch={handleSimulateBracketMatch}
        onBack={handleBackToSelect}
      />
    );
  }

  if (screen === 'setup' && homeTeam && awayTeam) {
    return (
      <SetupScreen
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onStartMatch={handleStartMatch}
        onBack={() => {
          if (matchContext === 'league') setScreen('league');
          else if (matchContext === 'bracket') setScreen('bracket');
          else handleBackToSelect();
        }}
        lockAway={gameMode === 'cpu' && matchContext === 'regular'}
      />
    );
  }

  if (screen === 'match' && homeTeam && awayTeam) {
    return (
      <MatchScreen
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onBack={handleBackToSetup}
        onViewStats={handleViewStatsFromMatch}
        isKnockout={isKnockout}
      />
    );
  }

  if (screen === 'stats' && lastResult) {
    const isTournament = matchContext !== 'regular';
    return (
      <MatchStatsScreen
        result={lastResult}
        history={isTournament ? [] : history}
        onMenu={handleBackToSelect}
        onClearHistory={clearHistory}
        onContinue={isTournament ? handleContinueTournament : undefined}
        continueLabel={matchContext === 'league' ? 'Continuar Liga' : matchContext === 'bracket' ? 'Continuar Copa' : undefined}
      />
    );
  }

  return (
    <TeamSelectionScreen
      onConfirm={handleTeamsSelected}
      onTournament={() => setScreen('tournament-setup')}
    />
  );
}

export default App;
