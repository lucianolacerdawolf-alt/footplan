import React, { useState, useCallback, useEffect } from 'react';
import type { Team, MatchResult } from './engine/types';
import type { GameMode } from './components/TeamSelectionScreen';
import type { LeagueState, BracketState } from './engine/tournament';
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
import { renderScreen, type AppScreensProps } from './components/AppScreens';
import Toast from './components/Toast';
import './App.css';

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
    cloudStatus, retryCloudSave,
    handleStartCareer,
    handleEditCareerLeagueTactics,
    handlePlayCareerLeagueMatch,
    handlePlayNextCareerMatch,
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
    handleBuyPlayer,
    handleSignFreeAgent,
    handleAcceptTransferOffer,
    handleRejectTransferOffer,
    handleAdvanceSeason,
    handleMarkInboxRead,
    handleMarkAllInboxRead,
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
    if (isCareerMode && matchContext === 'league') { handleCareerLeagueMatchResult(result); }
    else if (isCareerMode && matchContext === 'bracket') { handleCareerBracketMatchResult(result); }
    else if (matchContext === 'league') { handleLeagueMatchResult(result); }
    else if (matchContext === 'bracket') { handleBracketMatchResult(result); }
    else { handleViewStats(result); return; }
    setLastResult(result);
    setScreen('stats');
  }, [matchContext, isCareerMode, handleCareerLeagueMatchResult, handleCareerBracketMatchResult, handleLeagueMatchResult, handleBracketMatchResult, handleViewStats, setLastResult, setScreen]);

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
  const screenProps: AppScreensProps = {
    homeTeam,
    awayTeam,
    gameMode,
    lastResult,
    pendingResumeSnapshot,
    matchContext,
    isKnockout,
    tournamentMode,
    isTournamentEntry,
    isCareerMode,
    selectedLeague,
    returnScreen,
    leagueState,
    bracketState,
    careerState,
    cloudStatus,
    retryCloudSave,
    history,
    achievements,
    peer,
    onlineRngRef,
    setScreen,
    setSelectedLeague,
    setTournamentMode,
    setReturnScreen,
    setPendingResumeSnapshot,
    setResumePrompt,
    setIsCareerMode,
    goHome,
    handleContinueTournament,
    handleTeamsSelected,
    handleStartMatch,
    handleViewStats,
    handleViewStatsFromMatch,
    handleLeagueFromHome,
    handleCupFromHome,
    handleCareerFromHome,
    handleNewCareerFromHub,
    handleCareerTournamentStart,
    handleTournamentStart,
    handleStartOnlineMatch,
    handleOnlineMatchResult,
    handlePlayLeagueMatch,
    handleSimulateUserLeagueMatch,
    handleSimulateLeagueRound,
    handleNextLeagueRound,
    handleEditLeagueTactics,
    handlePlayBracketMatch,
    handleSimulateOtherBracketMatches,
    handleSimulateBracketMatch,
    handleEditBracketTactics,
    handleEditCareerLeagueTactics,
    handlePlayCareerLeagueMatch,
    handlePlayNextCareerMatch,
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
    handleBuyPlayer,
    handleSignFreeAgent,
    handleAcceptTransferOffer,
    handleRejectTransferOffer,
    handleAdvanceSeason,
    handleMarkInboxRead,
    handleMarkAllInboxRead,
    clearHistory,
    setIsTournamentEntry,
  };

  const content = renderScreen(screen, screenProps);

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
