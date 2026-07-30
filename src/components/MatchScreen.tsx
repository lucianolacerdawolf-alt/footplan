import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Team, Strategy, MatchResult, RandomFn, Player, PenaltyResult } from '../engine/types';
import type { GameMode } from './TeamSelectionScreen';
import { cloneTeam } from '../utils/teamUtils';
import TacticPresets from './shared/TacticPresets';
import TacticEditor from './shared/TacticEditor';
import type { SubWindow, LiveMatchSnapshot } from '../utils/liveMatchPersistence';
import { saveLiveMatch, clearLiveMatch, serializeMatchState, deserializeMatchState, loadLiveMatchMeta, clearLiveMatchMeta } from '../utils/liveMatchPersistence';
import { playGoal, playWhistle, playFullTime, playCard } from '../utils/gameAudio';
import LiveScoreTicker from './LiveScoreTicker';
import type { LeagueFixture } from '../engine/tournament';
import { generateStadium } from '../utils/stadiums';

// Janelas de parada em que substituições podem ser feitas — estruturalmente só existem 3
// (pausa no 1º tempo, intervalo, pausa no 2º tempo), então o limite de "até 3 pausas" já
// é garantido pela própria contagem de janelas disponíveis; o que rastreamos aqui é só
// quantas das 5 substituições totais foram usadas em cada uma, pra exibir ao usuário.
const ZERO_SUB_WINDOWS: Record<SubWindow, number> = { firstHalfPause: 0, halftime: 0, secondHalfPause: 0 };
const SUB_WINDOW_LABELS: Record<SubWindow, string> = { firstHalfPause: '1ºT', halftime: 'Intervalo', secondHalfPause: '2ºT' };
function formatSubWindows(w: Record<SubWindow, number>): string {
  return (['firstHalfPause', 'halftime', 'secondHalfPause'] as SubWindow[])
    .map(k => `${SUB_WINDOW_LABELS[k]} ${w[k]}`).join(' · ');
}

interface OnlineProps {
  isHost: boolean;
  send: (data: unknown) => void;
  setOnData: (handler: ((data: unknown) => void) | null) => void;
  peerConnected: boolean;
}

type MatchSyncMsg =
  | { type: 'strategy-update'; side: 'home' | 'away'; strategy: Strategy }
  | { type: 'squad-update'; side: 'home' | 'away'; squad: Player[]; subsUsed: number }
  | { type: 'ready-halftime' }
  | { type: 'pause-game' }
  | { type: 'ready-resume' }
  | { type: 'start-simulate' };

import { resolveKnockoutExtraTime, getShooters, buildMatchResult, type MatchState, simularPartida, simularPrimeiroTempo, simularSegundoTempo, resolveKnockoutTiebreak } from '../engine/matchEngine';
import { useMatchSimulation, getSubWindow } from '../hooks/useMatchSimulation';
import { useMatchHistory } from '../hooks/useMatchHistory';
import { getSubSuggestions } from '../engine/subSuggestions';
import CommentaryFeed from './CommentaryFeed';
import { playerOvr } from '../utils/playerOvr';
import { fireClick } from '../utils/fireClick';
import TopBar from './MatchScreen/TopBar';
import HalftimePanel from './MatchScreen/HalftimePanel';
import PenaltyShootoutOverlay from './MatchScreen/PenaltyShootoutOverlay';

interface Props {
  homeTeam: Team;
  awayTeam: Team;
  onBack: () => void;
  onViewStats: (result: MatchResult) => void;
  isKnockout?: boolean;
  rng?: RandomFn;
  online?: OnlineProps;
  continueLabel?: string;
  onContinue?: () => void;
  matchContext?: 'regular' | 'league' | 'bracket' | 'online';
  userSide?: 'home' | 'away';
  resumeSnapshot?: LiveMatchSnapshot | null;
  onResumeConsumed?: () => void;
  gameMode?: GameMode;
  /** Fixtures da rodada atual (outros jogos) — só usado em liga pra mostrar placar ao vivo */
  roundFixtures?: LeagueFixture[];
  teams?: Team[];
}

export default function MatchScreen({ homeTeam: initialHome, awayTeam: initialAway, onBack, onViewStats, isKnockout, rng, online, continueLabel, onContinue, matchContext, userSide, resumeSnapshot, onResumeConsumed, gameMode, roundFixtures, teams }: Props) {
  const [home, setHome] = useState<Team>(() => {
    if (resumeSnapshot) return resumeSnapshot.home;
    const t = cloneTeam(initialHome);
    t.strategy = { ...initialHome.strategy };
    return t;
  });
  const [away, setAway] = useState<Team>(() => {
    if (resumeSnapshot) return resumeSnapshot.away;
    const t = cloneTeam(initialAway);
    t.strategy = { ...initialAway.strategy };
    return t;
  });

  const [htHomePick, setHtHomePick] = useState<string | null>(null);
  const [htAwayPick, setHtAwayPick] = useState<string | null>(null);
  const [subToast, setSubToast] = useState<string | null>(null);
  const [subsHome, setSubsHome] = useState(() => resumeSnapshot?.subsHome ?? 0);
  const [subsAway, setSubsAway] = useState(() => resumeSnapshot?.subsAway ?? 0);
  const [subWindowsHome, setSubWindowsHome] = useState<Record<SubWindow, number>>(() => resumeSnapshot?.subWindowsHome ?? ZERO_SUB_WINDOWS);
  const [subWindowsAway, setSubWindowsAway] = useState<Record<SubWindow, number>>(() => resumeSnapshot?.subWindowsAway ?? ZERO_SUB_WINDOWS);
  const MAX_SUBS = 5;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showOpponent, setShowOpponent] = useState(false);
  const [pauseTab, setPauseTab] = useState<'tactics' | 'squad'>('tactics');
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Online coordination state
  const [hostReady, setHostReady] = useState(false);
  const [guestReady, setGuestReady] = useState(false);

  const [speed, setSpeed] = useState<number>(() => {
    try { return Number(localStorage.getItem('fp:replaySpeed')) || 1; } catch { return 1; }
  });
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
    try { localStorage.setItem('fp:replaySpeed', String(speed)); } catch { /* noop */ }
  }, [speed]);

  const { addMatch } = useMatchHistory();

  const {
    result, simulating, replayEvents, currentEvent,
    homeScore, awayScore, phase, started, clockSeconds,
    fatigueMap, expelledIds, engineStateRef, isFirstHalfRef, nextCycleRef,
    runFirstHalf, runSecondHalf, updateLiveTeams, restoreSnapshot,
    paused, isGoalPause, pauseReplay, resumeReplay, consumePause, pausesRemaining, setInjuryCallback, skipToEnd,
  } = useMatchSimulation(initialHome.id, speedRef, rng);

  const [injuredIds, setInjuredIds] = useState<string[]>(() => resumeSnapshot?.injuredIds ?? []);
  const [injuryToast, setInjuryToast] = useState<string | null>(null);
  const injuryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // O mapa de cartões do motor vive num ref, que não dispara render. Reconstruí-lo
  // a partir dos eventos já exibidos mantém as sugestões reagindo a cada cartão —
  // o vermelho sempre sobrescreve o amarelo porque vem depois na lista.
  const liveCards = useMemo(() => {
    const map = new Map<string, 'yellow' | 'red'>();
    for (const e of replayEvents) {
      if (!e.playerId) continue;
      if (e.type === 'yellowCard') map.set(e.playerId, 'yellow');
      else if (e.type === 'redCard') map.set(e.playerId, 'red');
    }
    return map;
  }, [replayEvents]);

  const subSuggestions = useMemo(() => {
    if (!userSide) return [];
    const userTeam = userSide === 'home' ? home : away;
    const userScore = userSide === 'home' ? homeScore : awayScore;
    const opponentScore = userSide === 'home' ? awayScore : homeScore;
    return getSubSuggestions(userTeam, userScore, opponentScore, {
      fatigueMap,
      cards: liveCards,
      injuredIds: [...injuredIds, ...expelledIds],
    });
  }, [userSide, home, away, homeScore, awayScore, fatigueMap, injuredIds, expelledIds, liveCards]);

  // Audio feedback — trigger sounds on new replay events (goal, cards, kickoff)
  const audioEventIdxRef = useRef(0);
  const [goalAnimKey, setGoalAnimKey] = useState(0);
  useEffect(() => {
    for (let i = audioEventIdxRef.current; i < replayEvents.length; i++) {
      const e = replayEvents[i];
      if (e.type === 'goal') { playGoal(); setGoalAnimKey(k => k + 1); }
      else if (e.type === 'kickoff') playWhistle();
      else if (e.type === 'yellowCard' || e.type === 'redCard') playCard();
    }
    audioEventIdxRef.current = replayEvents.length;
    if (phase === 'done') playFullTime();
  }, [replayEvents, phase]);

  const handleInjury = useCallback((playerId: string) => {
    setInjuredIds(prev => prev.includes(playerId) ? prev : [...prev, playerId]);
    const homep = home.squad.find(p => p.id === playerId);
    const awayp = away.squad.find(p => p.id === playerId);
    const player = homep ?? awayp;
    if (player) {
      if (injuryTimerRef.current) clearTimeout(injuryTimerRef.current);
      setInjuryToast(`🤕 ${player.name} lesionado! Pausa para substituir.`);
      injuryTimerRef.current = setTimeout(() => setInjuryToast(null), 5000);
      pauseReplay();
    }
  }, [home.squad, away.squad, pauseReplay]);

  // Restaura uma partida salva (F5) — só roda uma vez, no mount. Sempre aterrissa em
  // estado pausado (ver restoreSnapshot no hook); o usuário retoma clicando "Retomar".
  useEffect(() => {
    if (!resumeSnapshot) return;
    restoreSnapshot({
      phase: resumeSnapshot.phase,
      isFirstHalf: resumeSnapshot.isFirstHalf,
      nextCycle: resumeSnapshot.nextCycle,
      clockSeconds: resumeSnapshot.clockSeconds,
      homeScore: resumeSnapshot.homeScore,
      awayScore: resumeSnapshot.awayScore,
      replayEvents: resumeSnapshot.replayEvents,
      fatigueMap: resumeSnapshot.fatigueMap,
      expelledIds: resumeSnapshot.expelledIds,
      pausesRemaining: resumeSnapshot.pausesRemaining,
      engineState: resumeSnapshot.engineState ? deserializeMatchState(resumeSnapshot.engineState) : null,
    });
    updateLiveTeams(resumeSnapshot.home, resumeSnapshot.away);
    onResumeConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setInjuryCallback(handleInjury);
    return () => setInjuryCallback(null);
  }, [setInjuryCallback, handleInjury]);

  // ── Online sync helpers ──────────────────────────────────────────────────
  const syncStrategy = useCallback((side: 'home' | 'away', strategy: Strategy) => {
    online?.send({ type: 'strategy-update', side, strategy } satisfies MatchSyncMsg);
  }, [online]);

  const syncSquad = useCallback((side: 'home' | 'away', squad: Player[], subsUsed: number) => {
    online?.send({ type: 'squad-update', side, squad, subsUsed } satisfies MatchSyncMsg);
  }, [online]);

  const sendReadyHalftime = useCallback(() => {
    if (online?.isHost) setHostReady(true);
    else setGuestReady(true);
    online?.send({ type: 'ready-halftime' } satisfies MatchSyncMsg);
  }, [online]);

  const sendPauseGame = useCallback(() => {
    online?.send({ type: 'pause-game' } satisfies MatchSyncMsg);
  }, [online]);

  const sendReadyResume = useCallback(() => {
    if (online?.isHost) setHostReady(true);
    else setGuestReady(true);
    online?.send({ type: 'ready-resume' } satisfies MatchSyncMsg);
  }, [online]);

  // Handle incoming peer data during match
  useEffect(() => {
    if (!online) return;
    const handler = (data: unknown) => {
      const msg = data as MatchSyncMsg;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'strategy-update') {
        if (msg.side === 'home') setHome(prev => ({ ...prev, strategy: msg.strategy }));
        else setAway(prev => ({ ...prev, strategy: msg.strategy }));
      }
      if (msg.type === 'squad-update') {
        if (msg.side === 'home') { setHome(prev => ({ ...prev, squad: msg.squad })); setSubsHome(msg.subsUsed); }
        else { setAway(prev => ({ ...prev, squad: msg.squad })); setSubsAway(msg.subsUsed); }
      }
      if (msg.type === 'ready-halftime') {
        if (online.isHost) { setGuestReady(true); }
        else { setHostReady(true); }
      }
      if (msg.type === 'pause-game') {
        setHostReady(false);
        setGuestReady(false);
        pauseReplay();
      }
      if (msg.type === 'ready-resume') {
        if (online.isHost) { setGuestReady(true); }
        else { setHostReady(true); }
      }
      if (msg.type === 'start-simulate' && !online.isHost) {
        knockoutResolvedRef.current = false;
        setKnockoutResult(null);
        setSubsHome(0); setSubsAway(0); setSubWindowsHome(ZERO_SUB_WINDOWS); setSubWindowsAway(ZERO_SUB_WINDOWS); setInjuredIds([]);
        runFirstHalf(home, away);
      }
    };
    online.setOnData(handler);
    return () => online.setOnData(null);
  }, [online, pauseReplay, home, away, runFirstHalf]);

  // Reset ready states when entering halftime
  useEffect(() => {
    if (phase === 'halftime') {
      setHostReady(false);
      setGuestReady(false);
    }
  }, [phase]);

  // Auto-start second half when both ready in online mode
  useEffect(() => {
    if (!online || phase !== 'halftime') return;
    if ((online.isHost && hostReady && guestReady) || (!online.isHost && hostReady && guestReady)) {
      runSecondHalf(home, away);
    }
  }, [online, phase, hostReady, guestReady, home, away, runSecondHalf]);

  // Auto-resume when both ready in online pause
  useEffect(() => {
    if (!online || !paused) return;
    if ((online.isHost && hostReady && guestReady) || (!online.isHost && hostReady && guestReady)) {
      setHostReady(false);
      setGuestReady(false);
      resumeReplay();
    }
  }, [online, paused, hostReady, guestReady, resumeReplay]);

  const handleFastSim = useCallback(() => {
    const h = cloneTeam(home);
    const a = cloneTeam(away);
    const rngFn = rng ?? (() => Math.random());

    if (isKnockout) {
      const { state } = simularPrimeiroTempo(h, a, rngFn);
      const regulationResult = simularSegundoTempo(h, a, state, rngFn);
      if (regulationResult.homeScore !== regulationResult.awayScore) {
        const winner = regulationResult.homeScore > regulationResult.awayScore ? h : a;
        addMatch({ ...regulationResult, wentToExtraTime: false, winner });
        onViewStats({ ...regulationResult, wentToExtraTime: false, winner });
        return;
      }
      resolveKnockoutTiebreak(h, a, state, rngFn);
      const enriched = buildMatchResult(h, a, state);
      const winner = enriched.homeScore > enriched.awayScore ? h : a;
      const final: MatchResult = { ...enriched, winner };
      addMatch(final);
      onViewStats(final);
    } else {
      const result = simularPartida(h, a, rngFn);
      addMatch(result);
      onViewStats(result);
    }
  }, [home, away, isKnockout, rng, addMatch, onViewStats]);

  const handleOnlinePause = useCallback(() => {
    if (pausesRemaining <= 0) return;
    if (consumePause()) {
      if (online) {
        sendPauseGame();
      }
    }
  }, [pausesRemaining, consumePause, online, sendPauseGame]);

  const handleBack = useCallback(() => {
    clearLiveMatch();
    clearLiveMatchMeta();
    onBack();
  }, [onBack]);

  const handlePenaltyComplete = useCallback((penaltyResult: PenaltyResult) => {
    setShowPenaltyShootout(false);
    const { home: h, away: a, state, result: storedResult } = penaltyStateRef.current;
    if (!h || !a || !state || !storedResult) return;
    const winner = penaltyResult.winner === 'home' ? h : a;
    const enriched: MatchResult = {
      ...storedResult,
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      wentToExtraTime: true,
      extraTimeHomeScore: state.homeScore - storedResult.homeScore,
      extraTimeAwayScore: state.awayScore - storedResult.awayScore,
      penaltyResult,
      winner,
    };
    addMatch(enriched);
    setKnockoutResult(enriched);
  }, [addMatch]);

  const handleTopBarResumeReplay = useCallback(() => {
    resumeReplay(home, away);
  }, [resumeReplay, home, away]);

  const handleTopBarConsumePause = useCallback(() => { consumePause(); }, [consumePause]);

  const showSubToast = (outName: string, inName: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setSubToast(`↕ ${inName} entra · ${outName} sai`);
    toastTimerRef.current = setTimeout(() => setSubToast(null), 2500);
  };

  const currentSubWindow = (): SubWindow => getSubWindow(phase, clockSeconds);

  const swapSquad = (team: Team, setTeam: (t: Team) => void, benchIdx: number, starterIdx: number, side: 'home' | 'away') => {
    const used = side === 'home' ? subsHome : subsAway;
    if (used >= MAX_SUBS) {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setSubToast(`⛔ Limite de ${MAX_SUBS} substituições atingido`);
      toastTimerRef.current = setTimeout(() => setSubToast(null), 2200);
      return;
    }
    const squad = [...team.squad];
    const outPlayer = squad[starterIdx].name;
    const inPlayer = squad[benchIdx].name;
    [squad[benchIdx], squad[starterIdx]] = [squad[starterIdx], squad[benchIdx]];
    const updatedTeam = { ...team, squad };
    setTeam(updatedTeam);
    const win = currentSubWindow();
    if (side === 'home') {
      setSubsHome(n => n + 1);
      setSubWindowsHome(w => ({ ...w, [win]: w[win] + 1 }));
      updateLiveTeams(updatedTeam, away);
    } else {
      setSubsAway(n => n + 1);
      setSubWindowsAway(w => ({ ...w, [win]: w[win] + 1 }));
      updateLiveTeams(home, updatedTeam);
    }
    showSubToast(outPlayer, inPlayer);
    if (online) syncSquad(side, squad, (side === 'home' ? subsHome : subsAway) + 1);
  };

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const knockoutResolvedRef = useRef(false);
  const [knockoutResult, setKnockoutResult] = useState<MatchResult | null>(null);
  const [showPenaltyShootout, setShowPenaltyShootout] = useState(false);
  const penaltyStateRef = useRef<{
    home: Team; away: Team; state: MatchState | null; result: MatchResult | null;
  }>({ home: initialHome, away: initialAway, state: null, result: null });

  // Refs pra capturar estado atual sem disparar o effect quando mudam
  const homeRef = useRef(home);
  const awayRef = useRef(away);
  const isKnockoutRef = useRef(isKnockout);
  homeRef.current = home;
  awayRef.current = away;
  isKnockoutRef.current = isKnockout;

  useEffect(() => {
    if (phase !== 'done' || !result) return;
    const h = homeRef.current;
    const a = awayRef.current;
    if (!isKnockoutRef.current) { addMatch(result); return; }
    if (knockoutResolvedRef.current) return;
    knockoutResolvedRef.current = true;

    if (result.homeScore !== result.awayScore) {
      const enriched: MatchResult = { ...result, wentToExtraTime: false, winner: result.homeScore > result.awayScore ? h : a };
      addMatch(enriched);
      setKnockoutResult(enriched);
      return;
    }

    const state = engineStateRef.current!;
    const clonedHome = cloneTeam(h);
    const clonedAway = cloneTeam(a);
    const extraTimeResult = resolveKnockoutExtraTime(clonedHome, clonedAway, state);

    if (!extraTimeResult.tiedAfterET) {
      const winner = state.homeScore > state.awayScore ? h : a;
      const enriched: MatchResult = {
        ...result,
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        wentToExtraTime: extraTimeResult.wentToExtraTime,
        extraTimeHomeScore: extraTimeResult.extraTimeHomeScore,
        extraTimeAwayScore: extraTimeResult.extraTimeAwayScore,
        winner,
      };
      addMatch(enriched);
      setKnockoutResult(enriched);
      return;
    }

    penaltyStateRef.current = { home: clonedHome, away: clonedAway, state, result };
    setShowPenaltyShootout(true);
  }, [phase, result, addMatch, engineStateRef]);

  // Persistência de sessão — salva a partida ao vivo pra sobreviver a um F5.
  // Funciona pra todos os modos: Partida Única, Liga, Copa, e Modo Carreira.
  // Partidas online são salvas mas só restauram se o peer WebRTC continuar ativo.
  useEffect(() => {
    if (matchContext === 'online') return;
    if (phase === 'done') { clearLiveMatch(); clearLiveMatchMeta(); return; }
    if (!started || phase === 'idle' || !engineStateRef.current) return;

    const meta = loadLiveMatchMeta();
    const snapshot: LiveMatchSnapshot = {
      version: 3,
      savedAt: Date.now(),
      matchContext: matchContext ?? 'regular',
      isKnockout: !!isKnockout,
      initialHome, initialAway,
      continueLabel,
      home, away,
      subsHome, subsAway, subWindowsHome, subWindowsAway,
      injuredIds,
      speed,
      phase, isFirstHalf: isFirstHalfRef.current, nextCycle: nextCycleRef.current,
      clockSeconds, homeScore, awayScore, replayEvents,
      fatigueMap, expelledIds, pausesRemaining,
      engineState: serializeMatchState(engineStateRef.current),
      matchRoundIdx: meta?.roundIdx,
      matchFixtureIdx: meta?.fixtureIdx,
      matchBracketStage: meta?.bracketStage,
      matchBracketIdx: meta?.bracketIdx,
      isCareer: meta?.isCareer,
    };
    saveLiveMatch(snapshot);
  }, [
    matchContext, started, phase, replayEvents, subsHome, subsAway, subWindowsHome, subWindowsAway,
    injuredIds, home, away, clockSeconds, pausesRemaining, isKnockout, initialHome, initialAway,
    continueLabel, speed, homeScore, awayScore, fatigueMap, expelledIds,
    engineStateRef, isFirstHalfRef, nextCycleRef,
  ]);

  const updateHome = (s: Strategy) => {
    const next = { ...home, strategy: s };
    setHome(next);
    updateLiveTeams(next, away);
    if (online) syncStrategy('home', s);
  };
  const updateAway = (s: Strategy) => {
    const next = { ...away, strategy: s };
    setAway(next);
    updateLiveTeams(home, next);
    if (online) syncStrategy('away', s);
  };

  return (
    <div className="match-screen">
      {/* Topbar */}
      <TopBar
        home={home}
        away={away}
        onBack={handleBack}
        simulating={simulating}
        paused={paused}
        phase={phase}
        started={started}
        online={!!online}
        speed={speed}
        setSpeed={setSpeed}
        pausesRemaining={pausesRemaining}
        onConsumePause={handleTopBarConsumePause}
        onResumeReplay={handleTopBarResumeReplay}
        onOnlinePause={handleOnlinePause}
      />

      {/* Placar + Tempo */}
      <div className="match-scorebar">
        <div className="score-side home" style={{ borderLeftColor: home.color }}>
          <span className="score-label">{home.abbreviation}</span>
          <span className="score-num" key={`h-${goalAnimKey}`}>{started ? homeScore : '–'}</span>
        </div>
        <div className="score-clock">
          <span className="clock-num">{String(Math.floor(clockSeconds / 60)).padStart(2, '0')}:{String(clockSeconds % 60).padStart(2, '0')}</span>
          <span className="clock-label">MIN</span>
        </div>
        <div className="score-side away" style={{ borderRightColor: away.color }}>
          <span className="score-num" key={`a-${goalAnimKey}`}>{started ? awayScore : '–'}</span>
          <span className="score-label">{away.abbreviation}</span>
        </div>
      </div>

      {roundFixtures && teams && matchContext === 'league' && (
        <LiveScoreTicker fixtures={roundFixtures} teams={teams} userFixtureId="" />
      )}

      {/* Momentum indicator */}
      {started && engineStateRef.current && (
        <div className="momentum-indicator">
          <div className="momentum-track">
            <div className="momentum-bar" style={{
              width: `${Math.min(100, Math.max(0, engineStateRef.current.momentumHome))}%`,
              background: home.color,
              boxShadow: `0 0 ${4 + engineStateRef.current.momentumHome * 0.08}px ${home.color}`,
            }} />
          </div>
          <div className="momentum-track momentum-track-away">
            <div className="momentum-bar" style={{
              width: `${Math.min(100, Math.max(0, engineStateRef.current.momentumAway))}%`,
              background: away.color,
              boxShadow: `0 0 ${4 + engineStateRef.current.momentumAway * 0.08}px ${away.color}`,
            }} />
          </div>
        </div>
      )}

      {/* Barra de posse ao vivo */}
      {started && (() => {
        const totalPoss = replayEvents.filter(e => e.type === 'possession').length;
        const homePoss = replayEvents.filter(e => e.type === 'possession' && e.teamId === initialHome.id).length;
        const homePct = totalPoss > 0 ? Math.round((homePoss / totalPoss) * 100) : 50;
        const awayPct = 100 - homePct;
        return (
          <div className="possession-section">
            <div className="poss-label-row">Posse de Bola</div>
            <div className="possession-bar-wrap">
              <span className="poss-pct poss-home">{homePct}%</span>
              <div className="possession-bar">
                <div className="possession-fill home-fill" style={{ width: `${homePct}%`, background: home.color }} />
              </div>
              <span className="poss-pct poss-away">{awayPct}%</span>
            </div>
          </div>
        );
      })()}

      {/* Timeline de gols */}
      {started && replayEvents.some(e => e.type === 'goal') && (
        <div className="goal-timeline">
          {replayEvents.filter(e => e.type === 'goal').map((e, idx) => {
            const isHome = e.teamId === initialHome.id;
            return (
              <span key={idx} className={`goal-entry ${isHome ? 'goal-home' : 'goal-away'}`} style={{ color: isHome ? home.color : away.color }}>
                {e.minute}&apos; · {e.scorer ?? '?'} ({isHome ? home.abbreviation : away.abbreviation})
              </span>
            );
          })}
        </div>
      )}

      {/* Status da partida (texto apenas — sem campo visual) */}
      <div className="match-pitch-area">
        <div className="match-status-area">
          {/* Formações antes do início */}
          {!started && (
            <>
            <div className="formation-text-preview">
              <span className="formation-text-team" style={{ color: home.color }}>{home.abbreviation}</span>
              <span className="formation-text-value">{home.strategy.formation}</span>
              <span className="formation-text-vs">vs</span>
              <span className="formation-text-value">{away.strategy.formation}</span>
              <span className="formation-text-team" style={{ color: away.color }}>{away.abbreviation}</span>
            </div>
            {(() => { const raw = home.stadium as string | undefined; const s = raw ? { name: raw, capacity: home.capacity ?? 30000 } : generateStadium(home.name, home.id.split('').reduce((a,c) => a + c.charCodeAt(0), 0)); return <div className="formation-text-preview" style={{ fontSize: 12, opacity: 0.5, fontFamily: 'var(--mono)', gap: 4 }}>🏟️ {s.name} · {s.capacity.toLocaleString()} lugares</div>; })()}
            </>
          )}

          {/* Intervalo */}
          {phase === 'halftime' && (
            <HalftimePanel
              home={home}
              away={away}
              setHome={setHome}
              setAway={setAway}
              updateHome={updateHome}
              updateAway={updateAway}
              replayEvents={replayEvents}
              initialHome={initialHome}
              initialAway={initialAway}
              online={online ? { isHost: online.isHost } : undefined}
              hostReady={hostReady}
              guestReady={guestReady}
              sendReadyHalftime={sendReadyHalftime}
              subsHome={subsHome}
              subsAway={subsAway}
              subWindowsHome={subWindowsHome}
              subWindowsAway={subWindowsAway}
              htHomePick={htHomePick}
              htAwayPick={htAwayPick}
              setHtHomePick={setHtHomePick}
              setHtAwayPick={setHtAwayPick}
              swapSquad={swapSquad}
              fatigueMap={fatigueMap}
              MAX_SUBS={MAX_SUBS}
              runSecondHalf={runSecondHalf}
              subToast={subToast}
              matchContext={matchContext}
              userSide={userSide}
              gameMode={gameMode}
            />
          )}

          {/* Goal celebration overlay */}
          {paused && isGoalPause && (
            <div className="halftime-overlay" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div className="halftime-inner" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 8 }}>⚽</div>
                <div className="halftime-title" style={{ fontSize: 22 }}>
                  {currentEvent?.description || 'GOL!'}
                </div>
              </div>
            </div>
          )}

          {/* Substitution modal on pause */}
          {paused && !isGoalPause && (
            <div className="halftime-overlay">
              <div className="halftime-inner">
                <div className="halftime-title">
                  {injuryToast ? injuryToast : 'Jogo Pausado'}
                </div>

                {online ? (
                  <>
                    <div style={{ fontSize: 12, opacity: 0.6, textAlign: 'center', marginBottom: 4 }}>
                      Substituições · <span style={{ color: home.color }}>{home.abbreviation} {subsHome}/{MAX_SUBS}</span> · <span style={{ color: away.color }}>{away.abbreviation} {subsAway}/{MAX_SUBS}</span>
                      <span className="sub-window-breakdown"> ({formatSubWindows(subWindowsHome)} / {formatSubWindows(subWindowsAway)})</span>
                    </div>
                    <div className="ht-squad-grid">
                      {(() => {
                        const side = online.isHost ? 'home' : 'away';
                        const team = online.isHost ? home : away;
                        const setTeam = online.isHost ? setHome : setAway;
                        const pick = online.isHost ? htHomePick : htAwayPick;
                        const setPick = online.isHost ? setHtHomePick : setHtAwayPick;
                        const benchPlayers = team.squad.slice(11);
                        const starters = team.squad.slice(0, 11);
                        const pickIdx = team.squad.findIndex(sp => sp.id === pick);
                        const pickIsBench = pickIdx >= 11;
                        const pickPlayer = pickIdx >= 0 ? team.squad[pickIdx] : null;
                        return (
                          <div className="ht-squad-col">
                            <strong style={{ color: online.isHost ? home.color : away.color, fontSize: 11 }}>
                              Seu Time ({online.isHost ? home.abbreviation : away.abbreviation})
                            </strong>
                            <div className="ht-sub-group-label">Titulares</div>
                            {starters.map((p, i) => {
                              const isPicked = p.id === pick;
                              const canSwap = pick && !pickIsBench && pickPlayer && pickPlayer.position === p.position && pickIdx !== i;
                              const isInjured = injuredIds.includes(p.id);
                              return (
                                <div key={p.id}
                                  className={`ht-squad-row ${isPicked ? 'picked' : ''} ${canSwap ? 'clickable' : ''} ${isInjured ? 'injured' : ''}`}
                                  style={isInjured ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    if (isInjured && pick && pickIsBench && team.squad[pickIdx].position === p.position) {
                                      swapSquad(team, setTeam, pickIdx, i, side);
                                      setPick(null);
                                      setInjuredIds(prev => prev.filter(id => id !== p.id));
                                    } else if (pick && pickIsBench && team.squad[pickIdx].position === p.position && !isInjured) {
                                      swapSquad(team, setTeam, pickIdx, i, side);
                                      setPick(null);
                                    } else {
                                      setPick(isPicked ? null : p.id);
                                    }
                                  }}
                                  onKeyDown={e => fireClick(e)}>
                                  <span className="sq-num">#{p.number}</span>
                                  <span className="sq-name">{p.name}</span>
                                  <span className={`sq-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
                                  <span className="sq-ovr">{playerOvr(p)}</span>
                                </div>
                              );
                            })}
                            <div className="ht-sub-group-label">Reservas</div>
                            {benchPlayers.map((p) => {
                              const isPicked = p.id === pick;
                              const bi = team.squad.findIndex(sp => sp.id === p.id);
                              return (
                                <div key={p.id}
                                  className={`ht-squad-row ${isPicked ? 'picked' : ''}`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    if (pick && !pickIsBench && pickPlayer && pickPlayer.position === p.position) {
                                      swapSquad(team, setTeam, pickIdx, bi, side);
                                      setPick(null);
                                    } else {
                                      setPick(isPicked ? null : p.id);
                                    }
                                  }}
                                  onKeyDown={e => fireClick(e)}>
                                  <span className="sq-num">#{p.number}</span>
                                  <span className="sq-name">{p.name}</span>
                                  <span className={`sq-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
                                  <span className="sq-ovr">{playerOvr(p)}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {subToast && (
                      <div className="sub-toast">{subToast}</div>
                    )}

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
                      <button className="simulate-btn" onClick={sendReadyResume} disabled={online.isHost ? hostReady : guestReady}>
                        {online.isHost
                          ? (hostReady ? (guestReady ? 'Retomando...' : 'Aguardando oponente...') : 'Pronto')
                          : (guestReady ? (hostReady ? 'Retomando...' : 'Aguardando oponente...') : 'Pronto')}
                      </button>
                      <span style={{ fontSize: 11, opacity: 0.6 }}>
                        {online.isHost
                          ? (hostReady ? (guestReady ? '✓ Ambos prontos' : '✓ Você · Aguardando visitante') : 'Clique em Pronto')
                          : (guestReady ? (hostReady ? '✓ Ambos prontos' : '✓ Você · Aguardando host') : 'Clique em Pronto')}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {gameMode !== 'cpu' && (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 4 }}>
                        <button
                          className={`speed-btn ${!showOpponent ? 'active' : ''}`}
                          onClick={() => setShowOpponent(false)}
                          style={{ fontSize: 12, padding: '4px 14px' }}
                        >
                          Seu Time ({home.abbreviation})
                        </button>
                        <button
                          className={`speed-btn ${showOpponent ? 'active' : ''}`}
                          onClick={() => setShowOpponent(true)}
                          style={{ fontSize: 12, padding: '4px 14px' }}
                        >
                          Adversário ({away.abbreviation})
                        </button>
                      </div>
                    )}

                    {subSuggestions.length > 0 && showSuggestions && (
                      <div className="sub-suggestions-banner">
                        <div className="sub-suggestions-header">
                          <span>💡 Sugestões do Técnico</span>
                          <button className="sub-suggestions-close" onClick={() => setShowSuggestions(false)}>✕</button>
                        </div>
                        {subSuggestions.slice(0, 2).map((sug, si) => (
                          <div key={si} className="sub-suggestion-item">
                            <span className="sub-suggestion-type">
                              {sug.type === 'fatigue' ? '🔋' : sug.type === 'card_risk' ? '🟨' : '📊'}
                            </span>
                            <div className="sub-suggestion-body">
                              <span className="sub-suggestion-reason">{sug.reason}</span>
                              {sug.candidates.map((c, ci) => (
                                <span key={ci} className="sub-suggestion-candidate">
                                  → {c.player.name} (OVR {playerOvr(c.player)}) · {c.reason}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="ht-tabs">
                      <button
                        className={`ht-tab ${pauseTab === 'tactics' ? 'active' : ''}`}
                        onClick={() => setPauseTab('tactics')}
                      >
                        Táticas
                      </button>
                      <button
                        className={`ht-tab ${pauseTab === 'squad' ? 'active' : ''}`}
                        onClick={() => setPauseTab('squad')}
                      >
                        Gerenciar Elenco
                      </button>
                    </div>

                    {/* Antes havia aqui um formulário inline duplicando o TacticEditor,
                      * mas com 5 campos em vez de 7: Escanteio e Falta foram adicionados
                      * ao editor compartilhado e esta cópia ficou atrás, então a pausa no
                      * meio do jogo não oferecia bola parada e o intervalo sim. */}
                    {pauseTab === 'tactics' ? (
                      <div className="halftime-team" style={{ marginBottom: 8 }}>
                        <TacticPresets
                          onApply={showOpponent ? updateAway : updateHome}
                          currentStrategy={showOpponent ? away.strategy : home.strategy}
                        />
                        <TacticEditor
                          strategy={showOpponent ? away.strategy : home.strategy}
                          onChange={showOpponent ? updateAway : updateHome}
                        />
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 12, opacity: 0.6, textAlign: 'center', marginBottom: 2 }}>
                          Substituições · <span style={{ color: showOpponent ? away.color : home.color }}>{showOpponent ? away.abbreviation : home.abbreviation} {showOpponent ? subsAway : subsHome}/{MAX_SUBS}</span>
                          <span className="sub-window-breakdown"> ({formatSubWindows(showOpponent ? subWindowsAway : subWindowsHome)})</span>
                        </div>
                        <div className="ht-squad-grid" style={{ maxHeight: '50dvh', overflowY: 'auto' }}>
                          {(() => {
                            const side = showOpponent ? 'away' : 'home';
                            const team = showOpponent ? away : home;
                            const setTeam = showOpponent ? setAway : setHome;
                            const pick = showOpponent ? htAwayPick : htHomePick;
                            const setPick = showOpponent ? setHtAwayPick : setHtHomePick;
                            const benchPlayers = team.squad.slice(11);
                            const starters = team.squad.slice(0, 11);
                            const pickIdx = team.squad.findIndex(sp => sp.id === pick);
                            const pickIsBench = pickIdx >= 11;
                            const pickPlayer = pickIdx >= 0 ? team.squad[pickIdx] : null;
                            return (
                              <div className="ht-squad-col">
                                <strong style={{ color: showOpponent ? away.color : home.color, fontSize: 11 }}>
                                  {showOpponent ? away.abbreviation : home.abbreviation}
                                </strong>
                                <div className="ht-sub-group-label">Titulares</div>
                                {starters.map((p, i) => {
                                  const isPicked = p.id === pick;
                                  const canSwap = pick && !pickIsBench && pickPlayer && pickPlayer.position === p.position && pickIdx !== i;
                                  const isInjured = injuredIds.includes(p.id);
                                  const fatigue = fatigueMap?.[p.id] ?? p.currentFatigue;
                                  const effOvr = Math.round(playerOvr(p) * (1 - fatigue / 200));
                                  const fatigueColor = fatigue > 70 ? '#ef4444' : fatigue > 45 ? '#f59e0b' : '#22c55e';
                                  return (
                                    <div key={p.id}
                                      className={`ht-squad-row ${isPicked ? 'picked' : ''} ${canSwap ? 'clickable' : ''} ${isInjured ? 'injured' : ''}`}
                                      style={isInjured ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => {
                                        if (isInjured && pick && pickIsBench && team.squad[pickIdx].position === p.position) {
                                          swapSquad(team, setTeam, pickIdx, i, side);
                                          setPick(null);
                                          setInjuredIds(prev => prev.filter(id => id !== p.id));
                                        } else if (pick && pickIsBench && team.squad[pickIdx].position === p.position && !isInjured) {
                                          swapSquad(team, setTeam, pickIdx, i, side);
                                          setPick(null);
                                        } else {
                                          setPick(isPicked ? null : p.id);
                                        }
                                      }}
                                      onKeyDown={e => fireClick(e)}>
                                      <span className="sq-num">#{p.number}</span>
                                      <span className="sq-name">{p.name}</span>
                                      <span className={`sq-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
                                      <span className="sq-ovr">
                                        {playerOvr(p)}
                                        {fatigue > 20 && <span style={{ color: fatigueColor, fontSize: 9, marginLeft: 3 }}>▶{effOvr}</span>}
                                      </span>
                                    </div>
                                  );
                                })}
                                <div className="ht-sub-group-label">Reservas</div>
                                {benchPlayers.map((p) => {
                                  const isPicked = p.id === pick;
                                  const bi = team.squad.findIndex(sp => sp.id === p.id);
                                  const benchFatigue = p.currentFatigue;
                                  const benchEffOvr = Math.round(playerOvr(p) * (1 - benchFatigue / 200));
                                  return (
                                    <div key={p.id}
                                      className={`ht-squad-row ${isPicked ? 'picked' : ''}`}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => {
                                        if (pick && !pickIsBench && pickPlayer && pickPlayer.position === p.position) {
                                          swapSquad(team, setTeam, pickIdx, bi, side);
                                          setPick(null);
                                        } else {
                                          setPick(isPicked ? null : p.id);
                                        }
                                      }}
                                      onKeyDown={e => fireClick(e)}>
                                      <span className="sq-num">#{p.number}</span>
                                      <span className="sq-name">{p.name}</span>
                                      <span className={`sq-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
                                      <span className="sq-ovr">
                                        {playerOvr(p)}
                                        {benchFatigue > 20 && <span style={{ color: '#22c55e', fontSize: 9, marginLeft: 3 }}>▶{benchEffOvr}</span>}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    )}

                    {() => {
                      const side: 'home' | 'away' = (userSide ?? 'home') as 'home' | 'away';
                      const team = side === 'home' ? home : away;
                      const starters = team.squad.slice(0, 11);
                      const mostTired = starters.filter(p => (p.currentFatigue ?? 0) > 70 && p.position !== 'GK').sort((a, b) => (b.currentFatigue ?? 0) - (a.currentFatigue ?? 0))[0];
                      if (!mostTired) return null;
                      const benchSamePos = team.squad.slice(11).filter(p => p.position === mostTired.position && (p.currentFatigue ?? 0) < 50);
                      const bestBench = benchSamePos.sort((a, b) => playerOvr(b) - playerOvr(a))[0];
                      if (!bestBench) return null;
                      return (
                        <div className="sub-toast" style={{ background: 'color-mix(in srgb, var(--accent-2) 10%, var(--surface))', border: '1px solid var(--accent-2)', padding: 8, borderRadius: 8, marginBottom: 8, fontSize: 12, fontWeight: 600, opacity: 0.9, textAlign: 'center', cursor: 'pointer' }}
                          onClick={() => {
                            const teamSquad = [...team.squad];
                            const starterIdx = teamSquad.findIndex(p => p.id === mostTired.id);
                            const benchIdx = teamSquad.findIndex(p => p.id === bestBench.id);
                            [teamSquad[starterIdx], teamSquad[benchIdx]] = [teamSquad[benchIdx], teamSquad[starterIdx]];
                            if (side === 'home') setHome({ ...team, squad: teamSquad }); else setAway({ ...team, squad: teamSquad });
                            const subCount = side === 'home' ? subsHome : subsAway;
                            const setSubs = side === 'home' ? setSubsHome : setSubsAway;
                            if (subCount < MAX_SUBS) { setSubs(subCount + 1); showSubToast(mostTired.name, bestBench.name); }
                          }}
                        >
                          🔁 {mostTired.name} exausto ({(mostTired.currentFatigue ?? 0)}%) → {bestBench.name} ({playerOvr(bestBench)})? <strong>Clique pra substituir</strong>
                        </div>
                      );
                    }}

                    {subToast && (
                      <div className="sub-toast">{subToast}</div>
                    )}

                    <button className="simulate-btn" onClick={() => resumeReplay(home, away)}>
                      ▶ Retomar Jogo
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {phase !== 'halftime' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!started ? (
              online && !online.isHost
                ? <span style={{ fontSize: 12, opacity: 0.55, fontFamily: 'var(--mono)' }}>Aguardando host simular...</span>
                : <>
                    <button className="simulate-btn" onClick={() => { if (online?.isHost) online.send({ type: 'start-simulate' }); knockoutResolvedRef.current = false; setKnockoutResult(null); setSubsHome(0); setSubsAway(0); setSubWindowsHome(ZERO_SUB_WINDOWS); setSubWindowsAway(ZERO_SUB_WINDOWS); setInjuredIds([]); runFirstHalf(home, away); }} disabled={simulating}>
                      JOGAR
                    </button>
                    <button className="simulate-btn" onClick={handleFastSim} disabled={simulating}>
                      SIMULAR
                    </button>
                  </>
            ) : phase === 'done' && (isKnockout ? knockoutResult : result) ? (
              <>
                <button className="stats-btn" onClick={() => onViewStats((isKnockout ? knockoutResult : result)!)}>
                  {isKnockout && !knockoutResult ? '⏳ Calculando...' : '📊 Estatísticas'}
                </button>
                {onContinue && (
                  <button className="simulate-btn" onClick={onContinue}>
                    {continueLabel ?? 'Continuar'}
                  </button>
                )}
              </>
            ) : (
              started && phase === 'simulating' && (
                <button className="simulate-btn" onClick={skipToEnd} style={pausesRemaining > 0 ? { fontSize: 11, opacity: 0.7 } : undefined}>
                  ⚡ Simular até o fim
                </button>
              )
            )}
          </div>
        )}
      </div>

      <CommentaryFeed events={replayEvents} homeTeamId={initialHome.id} />

      {online && !online.peerConnected && started && phase !== 'done' && (
        <div className="penalty-overlay">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔌</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-h)', marginBottom: 8 }}>
              Adversário desconectou
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Vitória por W.O. — o resultado atual será mantido
            </div>
            <button
              className="simulate-btn"
              onClick={() => {
                if (engineStateRef.current) {
                  const result = buildMatchResult(home, away, engineStateRef.current);
                  addMatch(result);
                  onViewStats(result);
                }
              }}
            >
              Continuar →
            </button>
          </div>
        </div>
      )}

      {online && !online.peerConnected && !started && (
        <div className="penalty-overlay">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔌</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-h)', marginBottom: 8 }}>
              Adversário desconectou
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              A partida ainda não havia começado
            </div>
            <button className="start-btn" onClick={handleBack}>
              Voltar ao Lobby
            </button>
          </div>
        </div>
      )}

      {showPenaltyShootout && penaltyStateRef.current.state && (() => {
        const { home: pHome, away: pAway, state: pState } = penaltyStateRef.current;
        if (!pState) return null;
        const homeShooters = getShooters(pHome, pState.cards, pState.injured);
        const awayShooters = getShooters(pAway, pState.cards, pState.injured);
        return (
          <PenaltyShootoutOverlay
            homeTeam={pHome}
            awayTeam={pAway}
            userIsHome
            homeShooters={homeShooters}
            awayShooters={awayShooters}
            onComplete={handlePenaltyComplete}
          />
        );
      })()}
    </div>
  );
}
