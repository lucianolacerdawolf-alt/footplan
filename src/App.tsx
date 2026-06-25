import { useState, useCallback } from 'react';
import type { Team, MatchResult } from './engine/types';
import type { GameMode } from './components/TeamSelectionScreen';
import type { TournamentMode } from './components/TournamentSetupScreen';
import type { LeagueState, BracketState, BracketMatch, LeagueFixture } from './engine/tournament';
import { generateLeagueSchedule, createBracket, advanceBracket, simularBracketMatch, simularRodadaAuto, simularFixtureAuto } from './engine/tournament';
import { cloneTeam } from './utils/teamUtils';
import HomeScreen from './components/HomeScreen';
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

type Screen = 'home' | 'select' | 'setup' | 'match' | 'stats' | 'tournament-setup' | 'league' | 'bracket';
type MatchContext = 'regular' | 'league' | 'bracket';
type PlayableStage = 'roundOf16' | 'quarterfinals' | 'semifinals' | 'final';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('cpu');
  const [lastResult, setLastResult] = useState<MatchResult | null>(null);
  const [matchContext, setMatchContext] = useState<MatchContext>('regular');
  const [isKnockout, setIsKnockout] = useState(false);
  const [tournamentMode, setTournamentMode] = useState<TournamentMode>('league');
  const [leagueState, setLeagueState] = useState<LeagueState | null>(null);
  const [bracketState, setBracketState] = useState<BracketState | null>(null);
  const [pendingLeagueFixture, setPendingLeagueFixture] = useState<{ roundIdx: number; fixtureIdx: number } | null>(null);
  const [isLeagueEntry, setIsLeagueEntry] = useState(false);
  const [pendingBracketStage, setPendingBracketStage] = useState<PlayableStage | null>(null);
  const [pendingBracketIdx, setPendingBracketIdx] = useState<number>(0);

  const { history, clearHistory } = useMatchHistory();

  // ── Partida única ─────────────────────────────────────────────────────────
  const handleTeamsSelected = useCallback((home: Team, away: Team, mode: GameMode) => {
    setHomeTeam(home); setAwayTeam(away); setGameMode(mode);
    setMatchContext('regular'); setIsKnockout(false);
    setScreen('setup');
  }, []);

  const handleStartMatch = useCallback((home: Team, away: Team) => {
    if (isLeagueEntry) {
      setIsLeagueEntry(false);
      setScreen('league');
      return;
    }
    setHomeTeam(home); setAwayTeam(away);
    setScreen('match');
  }, [isLeagueEntry]);

  const handleViewStats = useCallback((result: MatchResult) => {
    setLastResult(result);
    setScreen('stats');
  }, []);

  // ── Torneio: setup ────────────────────────────────────────────────────────
  const handleStartLeague = useCallback((userTeam: Team) => {
    const all = premierLeagueTeams.map(cloneTeam);
    const rest = all.filter(t => t.id !== userTeam.id);
    const teams = [userTeam, ...rest];
    const fixtures = generateLeagueSchedule(teams);
    setLeagueState({ teams, userTeamId: userTeam.id, fixtures, currentRound: 0, phase: 'playing' });
    const firstFixture = fixtures[0].find(f => f.homeTeamId === userTeam.id || f.awayTeamId === userTeam.id)!;
    setHomeTeam(cloneTeam(teams.find(t => t.id === firstFixture.homeTeamId)!));
    setAwayTeam(cloneTeam(teams.find(t => t.id === firstFixture.awayTeamId)!));
    setMatchContext('league'); setIsKnockout(false);
    setIsLeagueEntry(true);
    setScreen('setup');
  }, []);

  const handleStartBracket = useCallback((userTeam: Team) => {
    const others = premierLeagueTeams
      .filter(t => t.id !== userTeam.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 15)
      .map(cloneTeam);
    setBracketState(createBracket(userTeam, others));
    setScreen('bracket');
  }, []);

  const handleTournamentStart = useCallback((userTeam: Team) => {
    if (tournamentMode === 'league') handleStartLeague(userTeam);
    else handleStartBracket(userTeam);
  }, [tournamentMode, handleStartLeague, handleStartBracket]);

  // ── Liga ──────────────────────────────────────────────────────────────────
  const handlePlayLeagueMatch = useCallback((fixture: LeagueFixture, home: Team, away: Team) => {
    const roundIdx = fixture.roundIndex;
    const fixtureIdx = leagueState!.fixtures[roundIdx].findIndex(f => f.id === fixture.id);
    setPendingLeagueFixture({ roundIdx, fixtureIdx });
    setHomeTeam(cloneTeam(home)); setAwayTeam(cloneTeam(away));
    setMatchContext('league'); setIsKnockout(false);
    setScreen('setup');
  }, [leagueState]);

  const handleSimulateUserLeagueMatch = useCallback(() => {
    if (!leagueState) return;
    const roundIdx = leagueState.currentRound;
    const round = leagueState.fixtures[roundIdx];
    const fixtureIdx = round.findIndex(f => f.homeTeamId === leagueState.userTeamId || f.awayTeamId === leagueState.userTeamId);
    if (fixtureIdx === -1 || round[fixtureIdx].played) return;
    const simulated = simularFixtureAuto(round[fixtureIdx], leagueState.teams);
    const newFixtures = leagueState.fixtures.map((r, ri) =>
      ri === roundIdx ? r.map((f, fi) => fi === fixtureIdx ? simulated : f) : r
    );
    setLeagueState({ ...leagueState, fixtures: newFixtures });
  }, [leagueState]);

  const handleSimulateLeagueRound = useCallback((roundIndex: number) => {
    if (!leagueState) return;
    const newRound = simularRodadaAuto(leagueState.fixtures[roundIndex], leagueState.teams, leagueState.userTeamId);
    setLeagueState({ ...leagueState, fixtures: leagueState.fixtures.map((r, i) => i === roundIndex ? newRound : r) });
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

  // ── Copa ──────────────────────────────────────────────────────────────────
  const handlePlayBracketMatch = useCallback((_match: BracketMatch, home: Team, away: Team, stage: PlayableStage, matchIdx: number) => {
    setPendingBracketStage(stage);
    setPendingBracketIdx(matchIdx);
    setHomeTeam(cloneTeam(home)); setAwayTeam(cloneTeam(away));
    setMatchContext('bracket'); setIsKnockout(true);
    setScreen('setup');
  }, []);

  const handleSimulateBracketMatch = useCallback((stage: PlayableStage, matchIdx: number) => {
    if (!bracketState) return;
    const stageMatches = stage === 'roundOf16' ? bracketState.roundOf16
      : stage === 'quarterfinals' ? bracketState.quarterFinals
      : stage === 'semifinals' ? bracketState.semiFinals
      : [bracketState.final];
    const match = stageMatches[matchIdx];
    const home = bracketState.teams.find(t => t.id === match.homeTeamId)!;
    const away = bracketState.teams.find(t => t.id === match.awayTeamId)!;
    const sim = simularBracketMatch(home, away);
    const updated: BracketMatch = { ...match, ...sim };
    let s = { ...bracketState };
    if (stage === 'roundOf16') { const r16 = [...s.roundOf16]; r16[matchIdx] = updated; s = { ...s, roundOf16: r16 }; }
    else if (stage === 'quarterfinals') { const qf = [...s.quarterFinals]; qf[matchIdx] = updated; s = { ...s, quarterFinals: qf }; }
    else if (stage === 'semifinals') { const sf = [...s.semiFinals]; sf[matchIdx] = updated; s = { ...s, semiFinals: sf }; }
    else { s = { ...s, final: updated }; }
    setBracketState(advanceBracket(s));
  }, [bracketState]);

  const handleBracketMatchResult = useCallback((result: MatchResult) => {
    if (!bracketState || !pendingBracketStage) return;
    const stageMatches = pendingBracketStage === 'roundOf16' ? bracketState.roundOf16
      : pendingBracketStage === 'quarterfinals' ? bracketState.quarterFinals
      : pendingBracketStage === 'semifinals' ? bracketState.semiFinals
      : [bracketState.final];
    const match = stageMatches[pendingBracketIdx];
    const home = bracketState.teams.find(t => t.id === match.homeTeamId)!;
    const away = bracketState.teams.find(t => t.id === match.awayTeamId)!;
    const winnerId = result.winner?.id
      ?? (result.penaltyResult ? (result.penaltyResult.winner === 'home' ? home.id : away.id)
        : result.homeScore >= result.awayScore ? home.id : away.id);
    const updated: BracketMatch = {
      ...match,
      homeScore: result.homeScore, awayScore: result.awayScore,
      wentToExtraTime: result.wentToExtraTime,
      extraTimeHomeScore: result.extraTimeHomeScore,
      extraTimeAwayScore: result.extraTimeAwayScore,
      penaltyHomeScore: result.penaltyResult?.homeScore,
      penaltyAwayScore: result.penaltyResult?.awayScore,
      winnerId, played: true,
    };
    let s = { ...bracketState };
    if (pendingBracketStage === 'roundOf16') { const r16 = [...s.roundOf16]; r16[pendingBracketIdx] = updated; s = { ...s, roundOf16: r16 }; }
    else if (pendingBracketStage === 'quarterfinals') { const qf = [...s.quarterFinals]; qf[pendingBracketIdx] = updated; s = { ...s, quarterFinals: qf }; }
    else if (pendingBracketStage === 'semifinals') { const sf = [...s.semiFinals]; sf[pendingBracketIdx] = updated; s = { ...s, semiFinals: sf }; }
    else { s = { ...s, final: updated }; }
    setBracketState(advanceBracket(s));
    setLastResult(result);
    setScreen('stats');
  }, [bracketState, pendingBracketStage, pendingBracketIdx]);

  // ── Roteamento pós-stats ──────────────────────────────────────────────────
  const handleContinueTournament = useCallback(() => {
    setScreen(matchContext === 'league' ? 'league' : 'bracket');
  }, [matchContext]);

  const handleViewStatsFromMatch = useCallback((result: MatchResult) => {
    if (matchContext === 'league') { handleLeagueMatchResult(result); return; }
    if (matchContext === 'bracket') { handleBracketMatchResult(result); return; }
    handleViewStats(result);
  }, [matchContext, handleLeagueMatchResult, handleBracketMatchResult, handleViewStats]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <HomeScreen
        onSingleMatch={() => setScreen('select')}
        onLeague={() => { setTournamentMode('league'); setScreen('tournament-setup'); }}
        onCup={() => { setTournamentMode('bracket'); setScreen('tournament-setup'); }}
      />
    );
  }

  if (screen === 'select') {
    return (
      <TeamSelectionScreen
        onConfirm={handleTeamsSelected}
        onTournament={() => setScreen('home')}
      />
    );
  }

  if (screen === 'tournament-setup') {
    return (
      <TournamentSetupScreen
        mode={tournamentMode}
        onBack={() => setScreen('home')}
        onStart={handleTournamentStart}
      />
    );
  }

  if (screen === 'league' && leagueState) {
    return (
      <LeagueScreen
        state={leagueState}
        onPlayMatch={handlePlayLeagueMatch}
        onSimulateUserMatch={handleSimulateUserLeagueMatch}
        onSimulateRound={handleSimulateLeagueRound}
        onNextRound={handleNextLeagueRound}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'bracket' && bracketState) {
    return (
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
        onBack={() => setScreen('home')}
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
          else setScreen('select');
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
        onBack={() => setScreen('setup')}
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
        onMenu={() => setScreen('home')}
        onClearHistory={clearHistory}
        onContinue={isTournament ? handleContinueTournament : undefined}
        continueLabel={matchContext === 'league' ? 'Continuar Premier League' : matchContext === 'bracket' ? 'Continuar FA Cup' : undefined}
      />
    );
  }

  return <HomeScreen onSingleMatch={() => setScreen('select')} onLeague={() => { setTournamentMode('league'); setScreen('tournament-setup'); }} onCup={() => { setTournamentMode('bracket'); setScreen('tournament-setup'); }} />;
}

export default App;
