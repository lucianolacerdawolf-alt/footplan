import React, { useState, useCallback } from 'react';
import type { Team, MatchResult } from './engine/types';
import type { GameMode } from './components/TeamSelectionScreen';
import type { TournamentMode } from './components/TournamentSetupScreen';
import type { LeagueState, BracketState, BracketMatch, LeagueFixture, PlayableStage } from './engine/tournament';
import { generateLeagueSchedule, createBracket, advanceBracket, simularBracketMatch, simularRodadaAuto, simularFixtureAuto, recoverFatigue, applyPostMatchInjuries } from './engine/tournament';
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
import { useH2H } from './hooks/useH2H';
import { usePersistedState } from './hooks/usePersistedState';
import Toast from './components/Toast';
import { premierLeagueTeams } from './data/premierLeague';
import './App.css';

type Screen = 'home' | 'select' | 'setup' | 'match' | 'stats' | 'tournament-setup' | 'league' | 'bracket';
type MatchContext = 'regular' | 'league' | 'bracket';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('cpu');
  const [lastResult, setLastResult] = useState<MatchResult | null>(null);
  const [matchContext, setMatchContext] = useState<MatchContext>('regular');
  const [isKnockout, setIsKnockout] = useState(false);
  const [tournamentMode, setTournamentMode] = useState<TournamentMode>('league');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const notifySave = useCallback(() => setToastMsg('✓ Progresso salvo'), []);
  const [leagueState, setLeagueState] = usePersistedState<LeagueState | null>('fp:leagueState', null, { onPersist: notifySave });
  const [bracketState, setBracketState] = usePersistedState<BracketState | null>('fp:bracketState', null, { onPersist: notifySave });
  const [pendingLeagueFixture, setPendingLeagueFixture] = useState<{ roundIdx: number; fixtureIdx: number } | null>(null);
  const [isTournamentEntry, setIsTournamentEntry] = useState(false);
  const [pendingBracketStage, setPendingBracketStage] = useState<PlayableStage | null>(null);
  const [pendingBracketIdx, setPendingBracketIdx] = useState<number>(0);

  const { history, clearHistory } = useMatchHistory();
  const { record: recordH2H } = useH2H();

  // ── Partida única ─────────────────────────────────────────────────────────
  const handleTeamsSelected = useCallback((home: Team, away: Team, mode: GameMode) => {
    setHomeTeam(home); setAwayTeam(away); setGameMode(mode);
    setMatchContext('regular'); setIsKnockout(false);
    setScreen('setup');
  }, []);

  const handleStartMatch = useCallback((home: Team, away: Team) => {
    // Persist user team strategy into league state (também na entrada/edição)
    if (matchContext === 'league' && leagueState) {
      const userIsHome = home.id === leagueState.userTeamId;
      const userTeamConfigured = userIsHome ? home : away;
      setLeagueState(prev => prev ? {
        ...prev,
        teams: prev.teams.map(t => t.id === prev.userTeamId
          ? { ...t, strategy: userTeamConfigured.strategy, squad: userTeamConfigured.squad }
          : t),
      } : prev);
    }
    if (isTournamentEntry) {
      setIsTournamentEntry(false);
      setScreen(matchContext === 'league' ? 'league' : 'bracket');
      return;
    }
    setHomeTeam(home); setAwayTeam(away);
    setScreen('match');
  }, [isTournamentEntry, matchContext, leagueState, setLeagueState]);

  const handleViewStats = useCallback((result: MatchResult) => {
    recordH2H(result.homeTeam.id, result.awayTeam.id, result.homeScore, result.awayScore);
    setLastResult(result);
    setScreen('stats');
  }, [recordH2H]);

  // ── Torneio: setup ────────────────────────────────────────────────────────
  const handleEditLeagueTactics = useCallback(() => {
    if (!leagueState) return;
    const userTeam = leagueState.teams.find(t => t.id === leagueState.userTeamId);
    if (!userTeam) return;
    setHomeTeam(cloneTeam(userTeam));
    setAwayTeam(cloneTeam(userTeam));
    setMatchContext('league'); setIsKnockout(false);
    setIsTournamentEntry(true);
    setScreen('setup');
  }, [leagueState]);

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
    setIsTournamentEntry(true);
    setScreen('setup');
  }, []);

  const handleStartBracket = useCallback((userTeam: Team) => {
    const others = premierLeagueTeams
      .filter(t => t.id !== userTeam.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 15)
      .map(cloneTeam);
    const bracket = createBracket(userTeam, others);
    setBracketState(bracket);
    const allTeams = [userTeam, ...others];
    const userMatch = bracket.roundOf16.find(m => m.homeTeamId === userTeam.id || m.awayTeamId === userTeam.id)!;
    setHomeTeam(cloneTeam(allTeams.find(t => t.id === userMatch.homeTeamId)!));
    setAwayTeam(cloneTeam(allTeams.find(t => t.id === userMatch.awayTeamId)!));
    setMatchContext('bracket'); setIsKnockout(true);
    setIsTournamentEntry(true);
    setScreen('setup');
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
    // Update morale for all teams based on round results
    const moraleMap = new Map<string, number>();
    for (const f of newRound) {
      if (!f.played || f.homeScore == null || f.awayScore == null) continue;
      const hWon = f.homeScore > f.awayScore;
      const draw = f.homeScore === f.awayScore;
      const delta = draw ? 0 : 2;
      const hDelta = hWon ? delta : -delta;
      const aDelta = hWon ? -delta : delta;
      moraleMap.set(f.homeTeamId, (moraleMap.get(f.homeTeamId) ?? 0) + hDelta);
      moraleMap.set(f.awayTeamId, (moraleMap.get(f.awayTeamId) ?? 0) + aDelta);
    }
    const newTeams = leagueState.teams.map(t => {
      const delta = moraleMap.get(t.id) ?? 0;
      if (delta === 0) return t;
      return { ...t, morale: Math.max(-10, Math.min(10, (t.morale ?? 0) + delta)) };
    });
    setLeagueState({ ...leagueState, fixtures: leagueState.fixtures.map((r, i) => i === roundIndex ? newRound : r), teams: newTeams });
  }, [leagueState]);

  const handleNextLeagueRound = useCallback(() => {
    if (!leagueState) return;
    const next = leagueState.currentRound + 1;
    const recoveredTeams = recoverFatigue(leagueState.teams);
    setLeagueState({ ...leagueState, teams: recoveredTeams, currentRound: next, phase: next >= leagueState.fixtures.length ? 'done' : 'playing' });
  }, [leagueState]);

  const handleLeagueMatchResult = useCallback((result: MatchResult) => {
    if (!leagueState || !pendingLeagueFixture) return;
    const { roundIdx, fixtureIdx } = pendingLeagueFixture;
    const fixture = leagueState.fixtures[roundIdx][fixtureIdx];
    const userIsHome = fixture.homeTeamId === leagueState.userTeamId;
    const userScore = userIsHome ? result.homeScore : result.awayScore;
    const oppScore = userIsHome ? result.awayScore : result.homeScore;
    const moraleDelta = userScore > oppScore ? 2 : userScore === oppScore ? 0 : -2;
    const newFixtures = leagueState.fixtures.map((round, ri) =>
      ri === roundIdx
        ? round.map((f, fi) => fi === fixtureIdx ? { ...f, homeScore: result.homeScore, awayScore: result.awayScore, played: true } : f)
        : round
    );
    const newTeams = leagueState.teams.map(t => {
      if (t.id !== leagueState.userTeamId) return t;
      const current = t.morale ?? 0;
      const withMorale = { ...t, morale: Math.max(-10, Math.min(10, current + moraleDelta)) };
      const { team: injured, injuries } = applyPostMatchInjuries(withMorale);
      if (injuries.length > 0) {
        const inj = injuries[0];
        setToastMsg(`🤕 ${inj.player.name} lesionado · ${inj.rounds} rodada${inj.rounds > 1 ? 's' : ''}`);
      }
      return injured;
    });
    setLeagueState({ ...leagueState, fixtures: newFixtures, teams: newTeams });
    recordH2H(result.homeTeam.id, result.awayTeam.id, result.homeScore, result.awayScore);
    setLastResult(result);
    setScreen('stats');
  }, [leagueState, pendingLeagueFixture, recordH2H]);

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
    const advanced = advanceBracket(s);
    const finalState = { ...advanced, teams: advanced.teams.map(t => {
      if (t.id !== advanced.userTeamId) return t;
      const { team: injured, injuries } = applyPostMatchInjuries(t);
      if (injuries.length > 0) {
        const inj = injuries[0];
        setToastMsg(`🤕 ${inj.player.name} lesionado · ${inj.rounds} jogo${inj.rounds > 1 ? 's' : ''}`);
      }
      return injured;
    }) };
    setBracketState(finalState);
    recordH2H(result.homeTeam.id, result.awayTeam.id, result.homeScore, result.awayScore);
    setLastResult(result);
    setScreen('stats');
  }, [bracketState, pendingBracketStage, pendingBracketIdx, recordH2H]);

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
  const goHome = useCallback(() => {
    setLeagueState(null);
    setBracketState(null);
    setScreen('home');
  }, []);

  let content: React.ReactNode;
  if (screen === 'home') {
    content = (
      <HomeScreen
        onSingleMatch={() => setScreen('select')}
        onLeague={() => { setTournamentMode('league'); setScreen('tournament-setup'); }}
        onCup={() => { setTournamentMode('bracket'); setScreen('tournament-setup'); }}
      />
    );
  } else if (screen === 'select') {
    content = <TeamSelectionScreen onConfirm={handleTeamsSelected} onTournament={() => setScreen('home')} />;
  } else if (screen === 'tournament-setup') {
    content = <TournamentSetupScreen mode={tournamentMode} onBack={() => setScreen('home')} onStart={handleTournamentStart} />;
  } else if (screen === 'league' && leagueState) {
    content = (
      <LeagueScreen
        state={leagueState}
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
    content = (
      <MatchScreen
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onBack={() => setScreen('setup')}
        onViewStats={handleViewStatsFromMatch}
        isKnockout={isKnockout}
      />
    );
  } else if (screen === 'stats' && lastResult) {
    const isTournament = matchContext !== 'regular';
    content = (
      <MatchStatsScreen
        result={lastResult}
        history={isTournament ? [] : history}
        onMenu={goHome}
        onClearHistory={clearHistory}
        onContinue={isTournament ? handleContinueTournament : undefined}
        continueLabel={matchContext === 'league' ? 'Continuar Premier League' : matchContext === 'bracket' ? 'Continuar FA Cup' : undefined}
      />
    );
  } else {
    content = (
      <HomeScreen
        onSingleMatch={() => setScreen('select')}
        onLeague={() => { setTournamentMode('league'); setScreen('tournament-setup'); }}
        onCup={() => { setTournamentMode('bracket'); setScreen('tournament-setup'); }}
      />
    );
  }

  return (
    <>
      <div className="screen-fade" key={screen}>{content}</div>
      <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
    </>
  );
}

export default App;
