import React, { useState, useCallback, useEffect } from 'react';
import type { Team, MatchResult, RandomFn } from './engine/types';
import type { GameMode } from './components/TeamSelectionScreen';
import type { PlayableStage, LeagueState, BracketState } from './engine/tournament';
import HomeScreen from './components/HomeScreen';
import TeamSelectionScreen from './components/TeamSelectionScreen';
import SetupScreen from './components/SetupScreen';
import TournamentSetupScreen from './components/TournamentSetupScreen';
import LeagueScreen from './components/LeagueScreen';
import BracketScreen from './components/BracketScreen';
import OnlineLobbyScreen from './components/OnlineLobbyScreen';
import LeagueSelectScreen, { type ResumableSave } from './components/LeagueSelectScreen';
import CupSelectScreen from './components/CupSelectScreen';
import CareerHubScreen from './components/CareerHubScreen';
import TradeProposalScreen from './components/TradeProposalScreen';
import SeasonEndScreen from './components/SeasonEndScreen';
import { getLeague } from './data/leagues';
import { loadLiveMatch, type LiveMatchSnapshot } from './utils/liveMatchPersistence';
import { useMatchHistory } from './hooks/useMatchHistory';
import { useH2H } from './hooks/useH2H';
import { useAchievements } from './hooks/useAchievements';
import { usePeerConnection } from './hooks/usePeerConnection';
import type { AchievementEvalInput } from './hooks/useAchievements';
import { useAppShell } from './hooks/useAppShell';
import { useLeagueManager } from './hooks/useLeagueManager';
import { useBracketManager } from './hooks/useBracketManager';
import { useCareerManager } from './hooks/useCareerManager';
import { useGameFlow } from './hooks/useGameFlow';
import { useOnlineMatch } from './hooks/useOnlineMatch';
import { useResumePrompt } from './hooks/useResumePrompt';
import Toast from './components/Toast';
import './App.css';

// Lazy: telas que só aparecem depois de fluxos específicos (partida em andamento,
// pós-jogo, conquistas) — não fazem parte do primeiro carregamento da Home/menu.
// Reduz o bundle inicial, relevante em conexão de dados móvel.
const MatchScreen = React.lazy(() => import('./components/MatchScreen'));
const MatchStatsScreen = React.lazy(() => import('./components/MatchStatsScreen'));
const AchievementsScreen = React.lazy(() => import('./components/AchievementsScreen'));

/**
 * Varre TODAS as ligas/copas salvas no localStorage (não só a liga selecionada no
 * momento) — é o que permite mostrar "Continuar" na tela de seleção de liga
 * independente de como o usuário chegou ali ou de qual card ele vai clicar depois.
 */
function getResumableSaves(): ResumableSave[] {
  const results: ResumableSave[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('fp:leagueState:')) continue;
      const leagueId = k.slice('fp:leagueState:'.length);
      const league = getLeague(leagueId);
      if (!league) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const ls = JSON.parse(raw) as { phase?: string; currentRound?: number; fixtures?: unknown[] };
      if (ls.phase && ls.phase !== 'done') {
        results.push({ type: 'league', league, label: `${league.name} — rodada ${(ls.currentRound ?? 0) + 1}` });
      }
    }
    const bsRaw = localStorage.getItem('fp:bracketState');
    if (bsRaw) {
      const bs = JSON.parse(bsRaw) as { stage?: string; leagueId?: string };
      if (bs.stage && bs.stage !== 'champion' && bs.leagueId) {
        const league = getLeague(bs.leagueId);
        if (league) results.push({ type: 'bracket', league, label: `Copa ${league.name}` });
      }
    }
  } catch { /* noop */ }
  return results;
}

function App() {
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('cpu');
  const [lastResult, setLastResult] = useState<MatchResult | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const notifySave = useCallback(() => setToastMsg('✓ Progresso salvo'), []);
  const dismissToast = useCallback(() => setToastMsg(null), []);
  const [pendingResumeSnapshot, setPendingResumeSnapshot] = useState<LiveMatchSnapshot | null>(null);
  const [pendingCareerStart, setPendingCareerStart] = useState<{ userTeam: Team; managerName: string } | null>(null);

  const {
    screen, setScreen,
    matchContext, setMatchContext,
    isKnockout, setIsKnockout,
    tournamentMode, setTournamentMode,
    isTournamentEntry, setIsTournamentEntry,
    isCareerMode, setIsCareerMode,
    selectedLeague, setSelectedLeague,
    returnScreen, setReturnScreen,
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
    league: selectedLeague,
    setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry,
    evaluateAchievements, recordH2H, notifySave, setToastMsg,
  });

  const {
    careerState, setCareerState,
    handleStartCareer,
    handleEditCareerLeagueTactics,
    handlePlayCareerLeagueMatch,
    handleSimulateUserCareerLeagueMatch,
    handleSimulateCareerLeagueRound,
    handleNextCareerLeagueRound,
    handleCareerLeagueMatchResult,
    handleEditCareerBracketTactics,
    handlePlayCareerBracketMatch,
    handleSimulateOtherCareerBracketMatches,
    handleSimulateCareerBracketMatch,
    handleCareerBracketMatchResult,
    handleProposeTrade,
    handleAdvanceSeason,
  } = useCareerManager({
    setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry,
    recordH2H, notifySave, setToastMsg,
  });

  // Pattern 2 (RESEARCH.md/PATTERNS.md): deixa useGameFlow's handleStartMatch operar
  // sobre careerState.season.league/cup através dos MESMOS setLeagueState/setBracketState
  // Dispatch<SetStateAction<...>> shapes que já usa pra Campeonatos — sem isso, teríamos
  // que duplicar handleStartMatch inteiro só pra trocar onde o resultado é gravado.
  const careerLeagueSetter: React.Dispatch<React.SetStateAction<LeagueState | null>> = useCallback(updater => setCareerState(prev => {
    if (!prev) return prev;
    const nextLeague = typeof updater === 'function' ? (updater as (p: LeagueState | null) => LeagueState | null)(prev.season.league) : updater;
    return nextLeague ? { ...prev, season: { ...prev.season, league: nextLeague } } : prev;
  }), [setCareerState]);

  const careerBracketSetter: React.Dispatch<React.SetStateAction<BracketState | null>> = useCallback(updater => setCareerState(prev => {
    if (!prev) return prev;
    const nextBracket = typeof updater === 'function' ? (updater as (p: BracketState | null) => BracketState | null)(prev.season.cup) : updater;
    return nextBracket ? { ...prev, season: { ...prev.season, cup: nextBracket } } : prev;
  }), [setCareerState]);

  const peer = usePeerConnection();

  const {
    handleTeamsSelected, handleStartMatch, handleViewStats,
  } = useGameFlow({
    setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout,
    setGameMode, setIsTournamentEntry,
    setLeagueState: isCareerMode ? careerLeagueSetter : setLeagueState,
    setBracketState: isCareerMode ? careerBracketSetter : setBracketState,
    setLastResult, matchContext, isTournamentEntry, isCareerMode,
    leagueState: isCareerMode ? (careerState?.season.league ?? null) : leagueState,
    bracketState: isCareerMode ? (careerState?.season.cup ?? null) : bracketState,
    homeTeam, recordH2H, evaluateAchievements,
  });

  const { onlineRngRef, handleStartOnlineMatch, handleOnlineMatchResult } = useOnlineMatch({
    setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout,
    setLastResult, recordH2H, evaluateAchievements, homeTeam,
  });

  // ── Restaura partida ao vivo salva (F5) ──────────────────────────────────────
  // Só existe save pra partidas 'regular' (ver MatchScreen.tsx) — roda uma vez, no
  // mount do App inteiro.
  useEffect(() => {
    const snap = loadLiveMatch();
    if (!snap || snap.matchContext !== 'regular') return;
    setHomeTeam(snap.initialHome);
    setAwayTeam(snap.initialAway);
    setMatchContext('regular');
    setIsKnockout(false);
    setPendingResumeSnapshot(snap);
    setScreen('match');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Torneio: setup ────────────────────────────────────────────────────────
  const handleTournamentStart = useCallback((userTeam: Team) => {
    if (tournamentMode === 'league') handleStartLeague(userTeam);
    else handleStartBracket(userTeam);
  }, [tournamentMode, handleStartLeague, handleStartBracket]);

  // ── Roteamento pós-stats ──────────────────────────────────────────────────
  // matchContext sozinho não distingue Campeonatos de Modo Carreira (Anti-Pattern 3
  // do RESEARCH.md) — isCareerMode resolve a ambiguidade, checado ANTES dos branches
  // regulares de liga/copa.
  const handleViewStatsFromMatch = useCallback((result: MatchResult) => {
    if (isCareerMode && matchContext === 'league') { handleCareerLeagueMatchResult(result); return; }
    if (isCareerMode && matchContext === 'bracket') { handleCareerBracketMatchResult(result); return; }
    if (matchContext === 'league') { handleLeagueMatchResult(result); return; }
    if (matchContext === 'bracket') { handleBracketMatchResult(result); return; }
    handleViewStats(result);
  }, [matchContext, isCareerMode, handleCareerLeagueMatchResult, handleCareerBracketMatchResult, handleLeagueMatchResult, handleBracketMatchResult, handleViewStats]);

  // ── Resume prompt ─────────────────────────────────────────────────────────
  const { resumePrompt, setResumePrompt, handleResumeContinue, handleResumeNew } = useResumePrompt({
    setScreen, setTournamentMode,
    setLeagueState: () => setLeagueState(null),
    setBracketState: () => setBracketState(null),
  });

  const handleLeagueFromHome = useCallback(() => {
    setTournamentMode('league');
    setReturnScreen('tournament-setup');
    setScreen('league-select');
  }, [setTournamentMode, setReturnScreen, setScreen]);

  const handleCupFromHome = useCallback(() => {
    setTournamentMode('bracket');
    setScreen('cup-select');
  }, [setTournamentMode, setScreen]);

  // ── Modo Carreira: entrada ────────────────────────────────────────────────
  const handleCareerFromHome = useCallback(() => {
    setIsCareerMode(true);
    if (careerState) { setScreen('career-hub'); return; }
    setTournamentMode('league');
    setReturnScreen('tournament-setup');
    setScreen('league-select');
  }, [careerState, setIsCareerMode, setTournamentMode, setReturnScreen, setScreen]);

  // D-14: entry point CareerHubScreen uses to start a career in a different league —
  // does NOT clear careerState here; handleCareerTournamentStart's existing
  // pendingCareerStart overwrite-confirmation gate (already built, was previously
  // unreachable) fires when the user picks a team on the screen this routes to.
  const handleNewCareerFromHub = useCallback(() => {
    setTournamentMode('league');
    setReturnScreen('tournament-setup');
    setScreen('league-select');
  }, [setTournamentMode, setReturnScreen, setScreen]);

  const handleCareerTournamentStart = useCallback((userTeam: Team, managerName?: string) => {
    const name = managerName ?? '';
    if (careerState) { setPendingCareerStart({ userTeam, managerName: name }); return; }
    handleStartCareer(userTeam, selectedLeague!, name);
  }, [careerState, selectedLeague, handleStartCareer]);

  // ── Render ────────────────────────────────────────────────────────────────
  let content: React.ReactNode;
  if (screen === 'cup-select') {
    content = (
      <CupSelectScreen
        onBack={() => setScreen('home')}
        onSelect={(league) => {
          localStorage.setItem('fp:selectedLeague', JSON.stringify(league.id));
          setSelectedLeague(league);
          try {
            const raw = localStorage.getItem('fp:bracketState');
            const bs = raw ? (JSON.parse(raw) as { stage?: string; leagueId?: string }) : null;
            if (bs && bs.leagueId === league.id && bs.stage !== 'champion') { setResumePrompt('bracket'); return; }
          } catch { /**/ }
          setScreen('tournament-setup');
        }}
      />
    );
  } else if (screen === 'league-select') {
    content = (
      <LeagueSelectScreen
        selectedLeague={selectedLeague}
        isCareer={isCareerMode}
        resumable={isCareerMode ? [] : getResumableSaves()}
        onResume={(save) => {
          localStorage.setItem('fp:selectedLeague', JSON.stringify(save.league.id));
          setSelectedLeague(save.league);
          setTournamentMode(save.type);
          setReturnScreen(null);
          setScreen(save.type === 'league' ? 'league' : 'bracket');
        }}
        onBack={() => { setReturnScreen(null); setScreen('home'); }}
        onSelect={(league) => {
          localStorage.setItem('fp:selectedLeague', JSON.stringify(league.id));
          setSelectedLeague(league);
          if (isCareerMode) {
            setReturnScreen(null);
            setScreen('tournament-setup');
            return;
          }
          const target = returnScreen ?? 'home';
          setReturnScreen(null);
          if (target === 'tournament-setup') {
            if (tournamentMode === 'league') {
              try {
                const raw = localStorage.getItem(`fp:leagueState:${league.id}`);
                const ls = raw ? (JSON.parse(raw) as { phase?: string }) : null;
                if (ls && ls.phase !== 'done') { setResumePrompt('league'); return; }
              } catch { /**/ }
            } else if (tournamentMode === 'bracket') {
              try {
                const raw = localStorage.getItem('fp:bracketState');
                const bs = raw ? (JSON.parse(raw) as { stage?: string; leagueId?: string }) : null;
                if (bs && bs.leagueId === league.id && bs.stage !== 'champion') { setResumePrompt('bracket'); return; }
              } catch { /**/ }
            }
          }
          setScreen(target);
        }}
      />
    );
  } else if (screen === 'home') {
    content = (
      <HomeScreen
        onSingleMatch={() => { setReturnScreen('select'); setScreen('league-select'); }}
        onLeague={handleLeagueFromHome}
        onCareer={handleCareerFromHome}
        onCup={handleCupFromHome}
        onAchievements={() => setScreen('achievements')}
        onOnline={() => setScreen('online-lobby')}
      />
    );
  } else if (screen === 'select') {
    content = (
      <TeamSelectionScreen
        teams={selectedLeague?.teams ?? getLeague('pl')!.teams}
        leagueName={selectedLeague?.name ?? 'Premier League'}
        onConfirm={handleTeamsSelected}
        onBack={() => { setReturnScreen('select'); setScreen('league-select'); }}
        onGoHome={goHome}
      />
    );
  } else if (screen === 'online-lobby') {
    content = <OnlineLobbyScreen peer={peer} onStartMatch={handleStartOnlineMatch} onBack={() => setScreen('home')} onGoHome={goHome} />;
  } else if (screen === 'tournament-setup') {
    content = <TournamentSetupScreen mode={isCareerMode ? 'career' : tournamentMode} league={selectedLeague!} onBack={() => { setScreen(tournamentMode === 'bracket' ? 'cup-select' : 'league-select'); }} onGoHome={goHome} onStart={isCareerMode ? handleCareerTournamentStart : handleTournamentStart} onRosterSynced={setSelectedLeague} />;
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
          setIsTournamentEntry(false);
          if (isCareerMode && matchContext === 'league') { setScreen('career-league'); return; }
          if (isCareerMode && matchContext === 'bracket') { setScreen('career-bracket'); return; }
          if (matchContext === 'league') setScreen('league');
          else if (matchContext === 'bracket') setScreen('bracket');
          else setScreen('select');
        }}
        isTacticsOnly={isTournamentEntry}
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
        continueLabel={matchContext === 'league' ? (selectedLeague ? `Continuar ${selectedLeague.name}` : 'Continuar Liga') : matchContext === 'bracket' ? `Continuar ${bracketState?.cupName ?? 'Copa'}` : undefined}
        matchContext={matchContext}
        resumeSnapshot={pendingResumeSnapshot}
        onResumeConsumed={() => setPendingResumeSnapshot(null)}
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
        continueLabel={matchContext === 'league' ? (selectedLeague ? `Continuar ${selectedLeague.name}` : 'Continuar Liga') : matchContext === 'bracket' ? `Continuar ${bracketState?.cupName ?? 'Copa'}` : undefined}
      />
    );
  } else if (screen === 'achievements') {
    content = (
      <AchievementsScreen
        achievements={achievements.getAll()}
        onBack={goHome}
      />
    );
  } else if (screen === 'career-hub' && careerState) {
    content = (
      <CareerHubScreen
        state={careerState}
        league={getLeague(careerState.leagueId)!}
        onViewLeague={() => setScreen('career-league')}
        onViewCup={() => setScreen('career-bracket')}
        onProposeTrade={() => setScreen('trade-propose')}
        onAdvanceSeason={handleAdvanceSeason}
        onNewCareer={handleNewCareerFromHub}
        onBack={() => { setIsCareerMode(false); goHome(); }}
      />
    );
  } else if (screen === 'career-league' && careerState) {
    content = (
      <LeagueScreen
        state={careerState.season.league}
        league={getLeague(careerState.leagueId)!}
        onPlayMatch={handlePlayCareerLeagueMatch}
        onSimulateUserMatch={handleSimulateUserCareerLeagueMatch}
        onSimulateRound={handleSimulateCareerLeagueRound}
        onNextRound={handleNextCareerLeagueRound}
        onEditTactics={handleEditCareerLeagueTactics}
        onBack={() => setScreen('career-hub')}
      />
    );
  } else if (screen === 'career-bracket' && careerState) {
    content = (
      <BracketScreen
        state={careerState.season.cup}
        onPlayMatch={(match, home, away) => {
          const stage = careerState.season.cup.stage as PlayableStage;
          const matches = stage === 'roundOf16' ? careerState.season.cup.roundOf16
            : stage === 'quarterfinals' ? careerState.season.cup.quarterFinals
            : stage === 'semifinals' ? careerState.season.cup.semiFinals
            : [careerState.season.cup.final];
          handlePlayCareerBracketMatch(match, home, away, stage, matches.findIndex(m => m.id === match.id));
        }}
        onSimulateMatch={handleSimulateCareerBracketMatch}
        onSimulateOthers={handleSimulateOtherCareerBracketMatches}
        onEditTactics={handleEditCareerBracketTactics}
        onBack={() => setScreen('career-hub')}
      />
    );
  } else if (screen === 'trade-propose' && careerState) {
    content = (
      <TradeProposalScreen
        userTeam={careerState.season.league.teams.find(t => t.id === careerState.season.league.userTeamId)!}
        opponentTeams={careerState.rosters[careerState.leagueId].filter(t => t.id !== careerState.season.league.userTeamId)}
        tradesRemaining={Math.max(0, 3 - careerState.season.tradesUsedThisSeason)}
        onBack={() => setScreen('career-hub')}
        onPropose={handleProposeTrade}
      />
    );
  } else if (screen === 'season-end' && careerState && careerState.history.length > 0) {
    content = (
      <SeasonEndScreen
        entry={careerState.history[careerState.history.length - 1]}
        league={getLeague(careerState.leagueId)!}
        newReputation={careerState.manager.reputation}
        onContinue={() => setScreen('career-hub')}
      />
    );
  } else {
    content = (
      <HomeScreen
        onSingleMatch={() => { setReturnScreen('select'); setScreen('league-select'); }}
        onLeague={handleLeagueFromHome}
        onCareer={handleCareerFromHome}
        onCup={handleCupFromHome}
        onAchievements={() => setScreen('achievements')}
        onOnline={() => setScreen('online-lobby')}
      />
    );
  }

  return (
    <>
      <React.Suspense fallback={<div className="lazy-loading">Carregando…</div>}>
        <div className="screen-fade" key={screen}>{content}</div>
      </React.Suspense>
      <Toast message={toastMsg} onDismiss={dismissToast} />
      {resumePrompt && (
        <div className="resume-overlay" onClick={() => setResumePrompt(null)} role="presentation">
          <div className="resume-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="resume-title">
            <div className="resume-icon" aria-hidden="true">{resumePrompt === 'league' ? '📅' : '🏆'}</div>
            <div className="resume-title" id="resume-title">
              {resumePrompt === 'league' ? (selectedLeague ? `${selectedLeague.name} em andamento` : 'Liga em andamento') : `${bracketState?.cupName ?? 'Copa'} em andamento`}
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
      {pendingCareerStart && (
        <div className="resume-overlay" onClick={() => setPendingCareerStart(null)} role="presentation">
          <div className="resume-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="career-overwrite-title">
            <div className="resume-icon" aria-hidden="true">👔</div>
            <div className="resume-title" id="career-overwrite-title">
              Carreira em andamento
            </div>
            <div className="resume-body">
              {`Você já tem uma carreira como ${careerState?.manager.name} (Temporada ${careerState?.currentSeasonYear}). Iniciar uma nova carreira vai substituir esse save.`}
            </div>
            <div className="resume-actions">
              <button
                className="resume-btn-primary"
                onClick={() => { handleStartCareer(pendingCareerStart!.userTeam, selectedLeague!, pendingCareerStart!.managerName); setPendingCareerStart(null); }}
              >
                Sim, substituir
              </button>
              <button className="resume-btn-cancel" onClick={() => setPendingCareerStart(null)}>
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
