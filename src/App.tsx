import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Team, MatchResult } from './engine/types';
import type { GameMode } from './components/TeamSelectionScreen';
import type { LeagueState, BracketState } from './engine/tournament';
import type { PlayableStage } from './engine/tournament';
import type { CareerNav } from './types/navigation';
import { loadLiveMatch, clearLiveMatch, type LiveMatchSnapshot } from './utils/liveMatchPersistence';
import { useMatchHistory } from './hooks/useMatchHistory';
import { useH2H } from './hooks/useH2H';
import { useAchievements } from './hooks/useAchievements';
import { usePeerConnection } from './hooks/usePeerConnection';
import { allLeagues } from './data/leagues';
import type { AchievementEvalInput } from './hooks/useAchievements';
import type { Difficulty } from './engine/matchConfig';
import { useAppShell } from './hooks/useAppShell';
import { useAndroidBackButton } from './hooks/useAndroidBackButton';
import { useLeagueManager } from './hooks/useLeagueManager';
import { useBracketManager } from './hooks/useBracketManager';
import { useCareerManager } from './hooks/useCareerManager';
import { useGameFlow } from './hooks/useGameFlow';
import { useOnlineMatch } from './hooks/useOnlineMatch';
import { useResumePrompt } from './hooks/useResumePrompt';
import { renderScreen, type AppScreensProps } from './components/AppScreens';
import Toast from './components/Toast';
import CareerTabBar from './components/CareerTabBar';
import { CAREER_TAB_SCREENS, getCareerTabForScreen } from './utils/careerTabs';
import { onStorageFailure } from './utils/storage';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  const screenWrapperRef = React.useRef<HTMLDivElement>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('cpu');
  const [lastResult, setLastResult] = useState<MatchResult | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const notifySave = useCallback(() => setToastMsg('✓ Progresso salvo'), []);
  const dismissToast = useCallback(() => setToastMsg(null), []);

  // Falha de persistência (quota cheia/modo privado) não pode ser silenciosa: o
  // usuário perderia o progresso no reload sem nunca saber por quê. Throttle no util.
  useEffect(() => onStorageFailure(() => {
    setToastMsg('⚠ Não foi possível salvar o progresso neste dispositivo');
  }), []);
  const [pendingResumeSnapshot, setPendingResumeSnapshot] = useState<LiveMatchSnapshot | null>(null);
  const [pendingCareerStart, setPendingCareerStart] = useState<{ userTeam: Team; managerName: string } | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    try {
      const stored = localStorage.getItem('fp:difficulty');
      if (stored === 'easy' || stored === 'normal' || stored === 'hard') return stored;
    } catch {}
    return 'normal';
  });

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

  const unlockAchievement = useCallback((id: string) => {
    const ach = achievements.unlockById(id);
    if (ach) setToastMsg(`🏆 Conquista desbloqueada: ${ach.name}`);
  }, [achievements]);

  const {
    leagueState, setLeagueState,
    handleStartLeague, handlePlayLeagueMatch, handleSimulateUserLeagueMatch,
    handleSimulateLeagueRound, handleNextLeagueRound, handleLeagueMatchResult,
    handleEditLeagueTactics,
    handleRestorePendingLeagueFixture,
  } = useLeagueManager({
    league: selectedLeague,
    setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry,
    evaluateAchievements, recordH2H, notifySave, setToastMsg,
  });

  const {
    bracketState, setBracketState,
    handleStartBracket, handlePlayBracketMatch, handleSimulateOtherBracketMatches,
    handleSimulateBracketMatch, handleBracketMatchResult,
    handleEditBracketTactics,
    handleRestorePendingBracketMatch,
  } = useBracketManager({
    league: selectedLeague,
    setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry,
    evaluateAchievements, recordH2H, notifySave, setToastMsg,
  });

  // Bundle inteiro do gerenciador de carreira. Antes eram ~50 campos
  // desestruturados e re-listados manualmente em screenProps (o pior ponto de
  // prop drilling do App). Agora vai como um único objeto `career` — telas de
  // carreira leem p.career.<campo>. Novo handler = mexer só no hook + interface,
  // não mais em três lugares.
  const career = useCareerManager({
    setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout, setIsTournamentEntry, setIsCareerMode,
    recordH2H, notifySave, setToastMsg, evaluateAchievements, unlockAchievement,
  });
  // `career` é um objeto novo a cada render; para os callbacks memoizados que
  // alimentam o useGameFlow, dependemos do setter do useState (identidade estável)
  // em vez do bundle inteiro — senão careerLeagueSetter/careerBracketSetter
  // recriariam a cada render e furariam a memoização.
  const { setCareerState } = career;

  // Pattern 2 (RESEARCH.md/PATTERNS.md): deixa useGameFlow's handleStartMatch operar
  // sobre career.careerState.season.league/cup através dos MESMOS setLeagueState/setBracketState
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
    leagueState: isCareerMode ? (career.careerState?.season.league ?? null) : leagueState,
    bracketState: isCareerMode ? (career.careerState?.season.cup ?? null) : bracketState,
    homeTeam, recordH2H, evaluateAchievements, difficulty,
  });

  const { onlineRngRef, handleStartOnlineMatch, handleOnlineMatchResult } = useOnlineMatch({
    setScreen, setHomeTeam, setAwayTeam, setMatchContext, setIsKnockout,
    setLastResult, recordH2H, evaluateAchievements, homeTeam,
  });

  // ── Restaura partida ao vivo salva (F5) ──────────────────────────────────────
  // Funciona pra todos os modos (regular, league, bracket, career) desde que o
  // MatchScreen tenha salvado o snapshot com o contexto da partida.
  useEffect(() => {
    const snap = loadLiveMatch();
    if (!snap) return;

    // Partida online nunca é restaurada — depende de conexão WebRTC viva
    if (snap.matchContext === 'online') { clearLiveMatch(); return; }

    const isCareerSnap = snap.isCareer === true;
    if (isCareerSnap) setIsCareerMode(true);
    setMatchContext(snap.matchContext);
    setIsKnockout(snap.isKnockout || snap.matchContext === 'bracket');

    // Restaura o estado pendente (fixture/bracket) pra que o resultado da partida
    // seja gravado corretamente no estado da liga/copa/carreira ao final do jogo.
    if (snap.matchContext === 'league' && isCareerSnap && snap.matchRoundIdx != null && snap.matchFixtureIdx != null) {
      career.handleRestorePendingCareerLeagueFixture(snap.matchRoundIdx, snap.matchFixtureIdx);
    } else if (snap.matchContext === 'bracket' && isCareerSnap && snap.matchBracketStage != null && snap.matchBracketIdx != null) {
      career.handleRestorePendingCareerBracketMatch(snap.matchBracketStage as PlayableStage, snap.matchBracketIdx, snap.matchBracketKind ?? 'cup');
    } else if (snap.matchContext === 'league' && snap.matchRoundIdx != null && snap.matchFixtureIdx != null) {
      handleRestorePendingLeagueFixture(snap.matchRoundIdx, snap.matchFixtureIdx);
    } else if (snap.matchContext === 'bracket' && snap.matchBracketStage != null && snap.matchBracketIdx != null) {
      handleRestorePendingBracketMatch(snap.matchBracketStage as PlayableStage, snap.matchBracketIdx);
    }

    setHomeTeam(snap.initialHome);
    setAwayTeam(snap.initialAway);
    setPendingResumeSnapshot(snap);
    setScreen('match');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Restaura modo carreira após F5 ───────────────────────────────────────
  // Se o usuário estava no modo carreira e não tem partida ao vivo salva,
  // redireciona direto pro hub em vez de largar na home.
  useEffect(() => {
    const snap = loadLiveMatch();
    if (snap) return; // partida ao vivo tem prioridade
    if (!career.careerState) return;
    if (localStorage.getItem('fp:isCareerMode') !== '1') return;
    setIsCareerMode(true);
    setScreen('career-hub');
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
    if (isCareerMode && matchContext === 'league') { career.handleCareerLeagueMatchResult(result); }
    else if (isCareerMode && matchContext === 'bracket') { career.handleCareerBracketMatchResult(result); }
    else if (matchContext === 'league') { handleLeagueMatchResult(result); }
    else if (matchContext === 'bracket') { handleBracketMatchResult(result); }
    else { handleViewStats(result); return; }
    setLastResult(result);
    setScreen('stats');
  }, [matchContext, isCareerMode, career, handleLeagueMatchResult, handleBracketMatchResult, handleViewStats, setLastResult, setScreen]);

  // ── Resume prompt ─────────────────────────────────────────────────────────
  const { resumePrompt, setResumePrompt, handleResumeContinue, handleResumeNew } = useResumePrompt({
    setScreen, setTournamentMode,
    setLeagueState: () => setLeagueState(null),
    setBracketState: () => setBracketState(null),
  });

  const closeResumePrompt = useCallback(() => setResumePrompt(null), [setResumePrompt]);

  const handleLeagueFromHome = useCallback(() => {
    setTournamentMode('league');
    setReturnScreen('tournament-setup');
    setScreen('league-select');
  }, [setTournamentMode, setReturnScreen, setScreen]);

  const handleCupFromHome = useCallback(() => {
    setTournamentMode('bracket');
    setScreen('cup-select');
  }, [setTournamentMode, setScreen]);

  // ── Jogo Rápido ──────────────────────────────────────────────────────────
  const handleQuickPlay = useCallback(() => {
    const league = allLeagues[Math.floor(Math.random() * allLeagues.length)];
    const shuffled = [...league.teams].sort(() => Math.random() - 0.5);
    const home = shuffled[0];
    const away = shuffled[1];
    setSelectedLeague(league);
    setMatchContext('regular');
    setIsKnockout(false);
    setHomeTeam(home);
    setAwayTeam(away);
    setReturnScreen('home');
    setScreen('match');
  }, [setSelectedLeague, setMatchContext, setIsKnockout, setHomeTeam, setAwayTeam, setReturnScreen, setScreen]);

  // ── Modo Carreira: entrada ────────────────────────────────────────────────
  const handleCareerFromHome = useCallback(() => {
    if (career.careerState) { setIsCareerMode(true); setScreen('career-hub'); return; }
    setIsCareerMode(true);
    setTournamentMode('league');
    setReturnScreen('tournament-setup');
    setScreen('league-select');
  }, [career.careerState, setIsCareerMode, setTournamentMode, setReturnScreen, setScreen]);

  // D-14: entry point CareerHubScreen uses to start a career in a different league —
  // does NOT clear career.careerState here; handleCareerTournamentStart's existing
  // pendingCareerStart overwrite-confirmation gate (already built, was previously
  // unreachable) fires when the user picks a team on the screen this routes to.
  const handleNewCareerFromHub = useCallback(() => {
    setTournamentMode('league');
    setReturnScreen('tournament-setup');
    setScreen('league-select');
  }, [setTournamentMode, setReturnScreen, setScreen]);

  // Navegação da carreira com identidade estável, num único objeto. As telas de
  // carreira são React.memo; se estes fossem arrows inline no screenMap, mudariam
  // a cada render do App e furariam o memo (a tela re-renderizaria em qualquer
  // toast/save). Setters do useAppShell já são estáveis, então `nav` nunca muda.
  const nav: CareerNav = useMemo(() => ({
    exitCareer: () => { setIsCareerMode(false); goHome(); },
    toHub: () => setScreen('career-hub'),
    toCareerLeague: () => setScreen('career-league'),
    toCareerLeagueTable: () => setScreen('career-league-table'),
    toCareerBracket: () => setScreen('career-bracket'),
    toCareerContinental: () => setScreen('career-continental'),
    toCareerJobMarket: () => setScreen('career-job-market'),
    toTransferMarket: () => setScreen('transfer-market'),
    toTradePropose: () => setScreen('trade-propose'),
  }), [setScreen, setIsCareerMode, goHome]);

  const handleCareerTournamentStart = useCallback((userTeam: Team, managerName?: string) => {
    const name = managerName ?? '';
    if (career.careerState) { setPendingCareerStart({ userTeam, managerName: name }); return; }
    career.handleStartCareer(userTeam, selectedLeague!, name);
  }, [career, selectedLeague]);

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
    career,
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
    handleQuickPlay,
    handleNewCareerFromHub,
    nav,
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
    clearHistory,
    setIsTournamentEntry,
    difficulty,
    setDifficulty,
  };

  const content = renderScreen(screen, screenProps);

  // "Elenco" não tem tela de repouso própria — é um atalho direto pro editor de
  // táticas/escalação (mesma tela 'setup' usada pra iniciar uma partida de verdade).
  // isTournamentEntry (true só quando entrou via career.handleEditCareerLeagueTactics/
  // handleEditCareerBracketTactics, nunca quando vai realmente jogar) distingue os
  // dois casos — assim a barra fica visível editando escalação, mas some de novo
  // assim que uma partida real começa (setup pra jogar, match, stats).
  const onElencoScreen = screen === 'setup' && isTournamentEntry;
  const showCareerTabs = isCareerMode && !!career.careerState && (CAREER_TAB_SCREENS.has(screen) || onElencoScreen);
  const activeCareerTab = onElencoScreen ? 'elenco' : getCareerTabForScreen(screen);

  // Botão físico de voltar do Android. No navegador o hook não registra nada.
  useAndroidBackButton({
    screen, setScreen, goHome,
    isCareerMode, hasCareerState: !!career.careerState,
    tournamentMode, matchContext, isTournamentEntry, returnScreen,
    overlayOpen: !!resumePrompt,
    onCloseOverlay: closeResumePrompt,
  });

  // Acessibilidade de navegação por teclado (WCAG 2.4.3): ao trocar de tela num SPA,
  // move o foco para o topo do novo conteúdo (container tabindex=-1). Isso garante
  // que leitores de tela e usuários de teclado comecem do início da tela, em vez de
  // ficarem presos num elemento que já não existe. Não interfere com toque (a
  // navegação por gesto desloca o foco naturalmente para o elemento tocado).
  useEffect(() => {
    screenWrapperRef.current?.focus();
  }, [screen]);

  return (
    <>
      <a href="#main-content" className="skip-link">Pular para o conteúdo</a>
      <div style={showCareerTabs ? { paddingBottom: 64 } : undefined}>
        <React.Suspense fallback={<div className="lazy-loading">Carregando…</div>}>
          <ErrorBoundary>
            <div ref={screenWrapperRef} tabIndex={-1} id="main-content" className="screen-fade" key={screen}>{content}</div>
          </ErrorBoundary>
        </React.Suspense>
      </div>
      {showCareerTabs && (
        <CareerTabBar
          active={activeCareerTab}
          onCentral={() => setScreen('career-hub')}
          onElenco={() => { setReturnScreen(screen); career.handleEditCareerLeagueTactics(); }}
          onTransferencias={() => setScreen('transfer-market')}
          onMeuClube={() => setScreen('career-trophy-room')}
          onEscritorio={() => setScreen('career-league')}
        />
      )}
      <Toast message={toastMsg} duration={toastMsg?.startsWith('⚠') ? 6000 : 2000} onDismiss={dismissToast} />
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
              {`Você já tem uma carreira como ${career.careerState?.manager.name} (Temporada ${career.careerState?.currentSeasonYear}). Iniciar uma nova carreira vai substituir esse save.`}
            </div>
            <div className="resume-actions">
              <button
                className="resume-btn-primary"
                onClick={() => { career.handleStartCareer(pendingCareerStart!.userTeam, selectedLeague!, pendingCareerStart!.managerName); setPendingCareerStart(null); }}
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
