import { useState, useEffect, useRef, useCallback } from 'react';
import type { Team, Strategy, Mentality, Intensity, Formation, DefensiveLine, Width, MatchResult, RandomFn, Player } from '../engine/types';
import { MENTALITY_LABELS, INTENSITY_LABELS, DEFENSIVE_LINE_LABELS, WIDTH_LABELS } from '../engine/types';
import { cloneTeam } from '../utils/teamUtils';
import { FORMATIONS, MENTALITIES, INTENSITIES, DEF_LINES, WIDTHS, FORMATION_COUNTS } from '../engine/constants';

interface OnlineProps {
  isHost: boolean;
  send: (data: unknown) => void;
  setOnData: (handler: ((data: unknown) => void) | null) => void;
}

type MatchSyncMsg =
  | { type: 'strategy-update'; side: 'home' | 'away'; strategy: Strategy }
  | { type: 'squad-update'; side: 'home' | 'away'; squad: Player[]; subsUsed: number }
  | { type: 'ready-halftime' }
  | { type: 'pause-game' }
  | { type: 'ready-resume' };

const Y_SLOTS: Record<number, number[]> = {
  1: [50], 2: [20, 80], 3: [10, 50, 90], 4: [5, 32, 68, 95], 5: [3, 22, 50, 78, 97],
};

function renderFormationDots(formation: string, side: 'home' | 'away', color: string) {
  const counts = FORMATION_COUNTS[formation as keyof typeof FORMATION_COUNTS] ?? FORMATION_COUNTS['4-4-2'];
  const positions: Array<{ x: number; y: number; pos: string }> = [];

  if (side === 'home') {
    positions.push({ x: 8, y: 50, pos: 'GK' }); // GK
    for (let i = 0; i < (counts.DEF ?? 4); i++) positions.push({ x: 25, y: Y_SLOTS[counts.DEF][i], pos: 'DEF' });
    for (let i = 0; i < (counts.MID ?? 3); i++) positions.push({ x: 48, y: Y_SLOTS[counts.MID][i], pos: 'MID' });
    for (let i = 0; i < (counts.FWD ?? 3); i++) positions.push({ x: 70, y: Y_SLOTS[counts.FWD][i], pos: 'FWD' });
  } else {
    for (let i = 0; i < (counts.FWD ?? 3); i++) positions.push({ x: 30, y: Y_SLOTS[counts.FWD][i], pos: 'FWD' });
    for (let i = 0; i < (counts.MID ?? 3); i++) positions.push({ x: 52, y: Y_SLOTS[counts.MID][i], pos: 'MID' });
    for (let i = 0; i < (counts.DEF ?? 4); i++) positions.push({ x: 75, y: Y_SLOTS[counts.DEF][i], pos: 'DEF' });
    positions.push({ x: 92, y: 50, pos: 'GK' });
  }

  return positions.map((p, i) => (
    <circle key={i} cx={p.x} cy={p.y} r={p.pos === 'GK' ? 3.5 : 3}
      fill={p.pos === 'GK' ? '#facc15' : color} opacity={0.85} />
  ));
}
import { resolveKnockoutTiebreak } from '../engine/matchEngine';
import { useMatchSimulation } from '../hooks/useMatchSimulation';
import { useMatchHistory } from '../hooks/useMatchHistory';
import CommentaryFeed from './CommentaryFeed';
import Pitch from './Pitch';
import { playerOvr } from '../utils/playerOvr';

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
}

export default function MatchScreen({ homeTeam: initialHome, awayTeam: initialAway, onBack, onViewStats, isKnockout, rng, online, continueLabel, onContinue }: Props) {
  const [home, setHome] = useState<Team>(() => {
    const t = cloneTeam(initialHome);
    t.strategy = { ...initialHome.strategy };
    return t;
  });
  const [away, setAway] = useState<Team>(() => {
    const t = cloneTeam(initialAway);
    t.strategy = { ...initialAway.strategy };
    return t;
  });

  const [htHomePick, setHtHomePick] = useState<string | null>(null);
  const [htAwayPick, setHtAwayPick] = useState<string | null>(null);
  const [subToast, setSubToast] = useState<string | null>(null);
  const [subsHome, setSubsHome] = useState(0);
  const [subsAway, setSubsAway] = useState(0);
  const MAX_SUBS = 5;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showOpponent, setShowOpponent] = useState(false);

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
    homeScore, awayScore, showOverlay, phase, started, clockSeconds,
    fatigueMap, expelledIds, engineStateRef,
    runFirstHalf, runSecondHalf,
    paused, pauseReplay, resumeReplay, consumePause, pausesRemaining, setInjuryCallback,
  } = useMatchSimulation(initialHome.id, speedRef, rng);

  const [injuredIds, setInjuredIds] = useState<string[]>([]);
  const [injuryToast, setInjuryToast] = useState<string | null>(null);
  const injuryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    };
    online.setOnData(handler);
    return () => online.setOnData(null);
  }, [online, pauseReplay]);

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

  const handleOnlinePause = useCallback(() => {
    if (pausesRemaining <= 0) return;
    if (consumePause()) {
      if (online) {
        sendPauseGame();
      }
    }
  }, [pausesRemaining, consumePause, online, sendPauseGame]);

  const showSubToast = (outName: string, inName: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setSubToast(`↕ ${inName} entra · ${outName} sai`);
    toastTimerRef.current = setTimeout(() => setSubToast(null), 2500);
  };

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
    if (side === 'home') setSubsHome(n => n + 1); else setSubsAway(n => n + 1);
    showSubToast(outPlayer, inPlayer);
    if (online) syncSquad(side, squad, (side === 'home' ? subsHome : subsAway) + 1);
  };

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const knockoutResolvedRef = useRef(false);
  const [knockoutResult, setKnockoutResult] = useState<MatchResult | null>(null);

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
    const tiebreak = resolveKnockoutTiebreak(cloneTeam(h), cloneTeam(a), state);
    const winner = tiebreak.penaltyResult
      ? (tiebreak.penaltyResult.winner === 'home' ? h : a)
      : (state.homeScore > state.awayScore ? h : a);
    const enriched: MatchResult = {
      ...result,
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      wentToExtraTime: tiebreak.wentToExtraTime,
      extraTimeHomeScore: tiebreak.extraTimeHomeScore,
      extraTimeAwayScore: tiebreak.extraTimeAwayScore,
      penaltyResult: tiebreak.penaltyResult,
      winner,
    };
    addMatch(enriched);
    setKnockoutResult(enriched);
  }, [phase, result, addMatch, engineStateRef]);

  const updateHome = (s: Strategy) => {
    setHome(prev => ({ ...prev, strategy: s }));
    if (online) syncStrategy('home', s);
  };
  const updateAway = (s: Strategy) => {
    setAway(prev => ({ ...prev, strategy: s }));
    if (online) syncStrategy('away', s);
  };

  const pitchResult = (showOverlay && result) ? {
    homeScore: result.homeScore, awayScore: result.awayScore,
    homePossession: result.homePossession, awayPossession: result.awayPossession,
    shots: result.events.filter(e => ['goal', 'miss', 'post', 'save'].includes(e.type)).length,
    goals: result.events.filter(e => e.type === 'goal').length,
  } : null;

  return (
    <div className="match-screen">
      {/* Topbar */}
      <header className="match-topbar">
        <button className="back-btn" onClick={onBack} disabled={simulating && !paused}>
          &larr; Voltar
        </button>
        <span className="match-title">{home.abbreviation} vs {away.abbreviation}</span>
        <span className="match-formations">{home.strategy.formation} x {away.strategy.formation}</span>
        <div className="speed-control" role="group" aria-label="Velocidade do replay">
          {phase === 'simulating' && started && !online && (
            <button
              className="speed-btn"
              onClick={paused ? resumeReplay : (pausesRemaining > 0 ? () => { consumePause(); } : undefined)}
              disabled={pausesRemaining <= 0 && !paused}
              title={paused ? 'Retomar' : pausesRemaining > 0 ? `Pausar (${pausesRemaining} restante${pausesRemaining > 1 ? 's' : ''})` : 'Pausas esgotadas'}
              aria-label={paused ? 'Retomar replay' : 'Pausar replay'}
            >{paused ? '▶' : `⏸ ${pausesRemaining}`}</button>
          )}
          {phase === 'simulating' && started && online && (
            <button
              className="speed-btn"
              onClick={paused ? undefined : handleOnlinePause}
              disabled={pausesRemaining <= 0 && !paused}
              title={pausesRemaining > 0 ? `Pausar (${pausesRemaining} restante${pausesRemaining > 1 ? 's' : ''})` : 'Pausas esgotadas'}
              aria-label={pausesRemaining > 0 ? 'Pausar jogo' : 'Pausas esgotadas'}
            >⏸ {pausesRemaining}</button>
          )}
          {[1, 2, 3, 4].map(s => (
            <button
              key={s}
              className={`speed-btn ${speed === s ? 'active' : ''}`}
              onClick={() => setSpeed(s)}
              title={`Velocidade ${s}x`}
              aria-label={`Velocidade ${s}x`}
              aria-pressed={speed === s}
            >{s}x</button>
          ))}
        </div>
      </header>

      {/* Placar + Tempo */}
      <div className="match-scorebar">
        <div className="score-side home" style={{ borderLeftColor: home.color }}>
          <span className="score-label" style={{ color: home.color }}>{home.abbreviation}</span>
          <span className="score-num">{started ? homeScore : '–'}</span>
        </div>
        <div className="score-clock">
          <span className="clock-num">{String(Math.floor(clockSeconds / 60)).padStart(2, '0')}:{String(clockSeconds % 60).padStart(2, '0')}</span>
          <span className="clock-label">MIN</span>
        </div>
        <div className="score-side away" style={{ borderRightColor: away.color }}>
          <span className="score-num">{started ? awayScore : '–'}</span>
          <span className="score-label" style={{ color: away.color }}>{away.abbreviation}</span>
        </div>
      </div>

      {/* Barra de posse ao vivo */}
      {started && (() => {
        const totalPoss = replayEvents.filter(e => e.type === 'possession').length;
        const homePoss = replayEvents.filter(e => e.type === 'possession' && e.teamId === initialHome.id).length;
        const homePct = totalPoss > 0 ? Math.round((homePoss / totalPoss) * 100) : 50;
        const awayPct = 100 - homePct;
        return (
          <div className="possession-bar-wrap">
            <span className="poss-pct poss-home" style={{ color: home.color }}>{homePct}%</span>
            <div className="possession-bar">
              <div className="possession-fill home-fill" style={{ width: `${homePct}%`, background: home.color }} />
            </div>
            <span className="poss-pct poss-away" style={{ color: away.color }}>{awayPct}%</span>
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

      {/* Campinho */}
      <div className="match-pitch-area">
        <div className="pitch-container">
          {/* Formation preview before match */}
          {!started && (
            <div className="formation-preview">
              <div className="formation-preview-title">Formações</div>
              <div className="formation-preview-row">
                <div className="formation-preview-team">
                  <span style={{ color: home.color, fontWeight: 800, fontSize: 13 }}>{home.abbreviation}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, fontFamily: 'var(--mono)', color: 'var(--text-h)' }}>{home.strategy.formation}</span>
                  <div className="formation-mini-pitch formation-mini-home">
                    <svg viewBox="0 0 100 100">
                      <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
                      <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
                      <rect x="0" y="20" width="18" height="60" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                      <rect x="82" y="20" width="18" height="60" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                      {renderFormationDots(home.strategy.formation, 'home', home.color)}
                    </svg>
                  </div>
                </div>
                <div className="formation-preview-vs">VS</div>
                <div className="formation-preview-team">
                  <span style={{ color: away.color, fontWeight: 800, fontSize: 13 }}>{away.abbreviation}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, fontFamily: 'var(--mono)', color: 'var(--text-h)' }}>{away.strategy.formation}</span>
                  <div className="formation-mini-pitch formation-mini-away">
                    <svg viewBox="0 0 100 100">
                      <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
                      <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
                      <rect x="0" y="20" width="18" height="60" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                      <rect x="82" y="20" width="18" height="60" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                      {renderFormationDots(away.strategy.formation, 'away', away.color)}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}
          <Pitch
            homeTeam={home} awayTeam={away}
            currentEvent={currentEvent}
            phase={phase === 'halftime' || phase === 'done' ? 'done' : simulating || phase === 'simulating' ? 'simulating' : 'idle'}
            result={pitchResult}
            halftime={phase === 'halftime' ? { homeScore, awayScore } : null}
            fatigueMap={fatigueMap}
            expelledIds={expelledIds}
          />

          {/* Intervalo */}
          {phase === 'halftime' && (
            <div className="halftime-overlay">
              <div className="halftime-inner">
                <div className="halftime-title">Intervalo</div>

                {/* Mini-stats do 1º tempo */}
                {(() => {
                  const htEvents = replayEvents;
                  const hShots = htEvents.filter(e => ['goal','miss','post','save'].includes(e.type) && (e.type === 'save' ? e.teamId !== initialHome.id : e.teamId === initialHome.id)).length;
                  const aShots = htEvents.filter(e => ['goal','miss','post','save'].includes(e.type) && (e.type === 'save' ? e.teamId !== initialAway.id : e.teamId === initialAway.id)).length;
                  const hSoT = htEvents.filter(e => (e.type === 'goal' && e.teamId === initialHome.id) || (e.type === 'save' && e.teamId !== initialHome.id)).length;
                  const aSoT = htEvents.filter(e => (e.type === 'goal' && e.teamId === initialAway.id) || (e.type === 'save' && e.teamId !== initialAway.id)).length;
                  const totalPoss = htEvents.filter(e => e.type === 'possession').length;
                  const homePoss = htEvents.filter(e => e.type === 'possession' && e.teamId === initialHome.id).length;
                  const homePct = totalPoss > 0 ? Math.round((homePoss / totalPoss) * 100) : 50;
                  return (
                    <div className="ht-mini-stats">
                      <div className="ht-stat-row"><span style={{ color: home.color }}>{hShots}</span><span className="ht-stat-label">Finalizações</span><span style={{ color: away.color }}>{aShots}</span></div>
                      <div className="ht-stat-row"><span style={{ color: home.color }}>{hSoT}</span><span className="ht-stat-label">No Alvo</span><span style={{ color: away.color }}>{aSoT}</span></div>
                      <div className="ht-stat-row"><span style={{ color: home.color }}>{homePct}%</span><span className="ht-stat-label">Posse</span><span style={{ color: away.color }}>{100 - homePct}%</span></div>
                    </div>
                  );
                })()}

                <div className="halftime-teams">
                  <div className="halftime-team">
                    <strong style={{ color: home.color }}>{home.abbreviation} {online && online.isHost ? '(Você)' : ''}</strong>
                    <select value={home.strategy.formation} onChange={e => updateHome({ ...home.strategy, formation: e.target.value as Formation })} disabled={online && !online.isHost}>
                      {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={home.strategy.mentality} onChange={e => updateHome({ ...home.strategy, mentality: e.target.value as Mentality })} disabled={online && !online.isHost}>
                      {MENTALITIES.map(m => <option key={m} value={m}>{MENTALITY_LABELS[m]}</option>)}
                    </select>
                    <select value={home.strategy.intensity} onChange={e => updateHome({ ...home.strategy, intensity: e.target.value as Intensity })} disabled={online && !online.isHost}>
                      {INTENSITIES.map(i => <option key={i} value={i}>{INTENSITY_LABELS[i]}</option>)}
                    </select>
                    <select value={home.strategy.defensiveLine} onChange={e => updateHome({ ...home.strategy, defensiveLine: e.target.value as DefensiveLine })} disabled={online && !online.isHost}>
                      {DEF_LINES.map(d => <option key={d} value={d}>{DEFENSIVE_LINE_LABELS[d]}</option>)}
                    </select>
                    <select value={home.strategy.width} onChange={e => updateHome({ ...home.strategy, width: e.target.value as Width })} disabled={online && !online.isHost}>
                      {WIDTHS.map(w => <option key={w} value={w}>{WIDTH_LABELS[w]}</option>)}
                    </select>
                  </div>
                  <span className="halftime-vs">vs</span>
                  <div className="halftime-team">
                    <strong style={{ color: away.secondaryColor }}>{away.abbreviation} {online && !online.isHost ? '(Você)' : ''}</strong>
                    <select value={away.strategy.formation} onChange={e => updateAway({ ...away.strategy, formation: e.target.value as Formation })} disabled={online && online.isHost}>
                      {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={away.strategy.mentality} onChange={e => updateAway({ ...away.strategy, mentality: e.target.value as Mentality })} disabled={online && online.isHost}>
                      {MENTALITIES.map(m => <option key={m} value={m}>{MENTALITY_LABELS[m]}</option>)}
                    </select>
                    <select value={away.strategy.intensity} onChange={e => updateAway({ ...away.strategy, intensity: e.target.value as Intensity })} disabled={online && online.isHost}>
                      {INTENSITIES.map(i => <option key={i} value={i}>{INTENSITY_LABELS[i]}</option>)}
                    </select>
                    <select value={away.strategy.defensiveLine} onChange={e => updateAway({ ...away.strategy, defensiveLine: e.target.value as DefensiveLine })} disabled={online && online.isHost}>
                      {DEF_LINES.map(d => <option key={d} value={d}>{DEFENSIVE_LINE_LABELS[d]}</option>)}
                    </select>
                    <select value={away.strategy.width} onChange={e => updateAway({ ...away.strategy, width: e.target.value as Width })} disabled={online && online.isHost}>
                      {WIDTHS.map(w => <option key={w} value={w}>{WIDTH_LABELS[w]}</option>)}
                    </select>
                  </div>
                </div>

                {/* Substituições */}
                <details className="ht-squad-details">
                  <summary>Substituições · <span style={{ color: home.color }}>{home.abbreviation} {subsHome}/{MAX_SUBS}</span> · <span style={{ color: away.color }}>{away.abbreviation} {subsAway}/{MAX_SUBS}</span></summary>
                  <div className="ht-squad-grid">
                    {([
                      ['home', home, setHome, htHomePick, setHtHomePick, online?.isHost ?? true],
                      ['away', away, setAway, htAwayPick, setHtAwayPick, online ? !online.isHost : true],
                    ] as const).map(([side, team, setTeam, pick, setPick, canEdit]) => {
                      const benchPlayers = team.squad.slice(11);
                      const starters = team.squad.slice(0, 11);
                      const pickIdx = team.squad.findIndex(sp => sp.id === pick);
                      const pickIsBench = pickIdx >= 11;
                      const pickPlayer = pickIdx >= 0 ? team.squad[pickIdx] : null;
                      return (
                        <div key={side} className="ht-squad-col">
                          <strong style={{ color: side === 'home' ? home.color : away.color, fontSize: 11 }}>
                            {side === 'home' ? home.abbreviation : away.abbreviation} {!canEdit ? '(adversário)' : ''}
                          </strong>
                          <div className="ht-sub-group-label">Titulares</div>
                          {starters.map((p, i) => {
                            const isPicked = p.id === pick;
                            const canSwap = pick && !pickIsBench && pickPlayer && pickPlayer.position === p.position && pickIdx !== i;
                            return (
                              <div key={p.id}
                                className={`ht-squad-row ${isPicked ? 'picked' : ''} ${canSwap && canEdit ? 'clickable' : ''}`}
                                onClick={() => {
                                  if (!canEdit) return;
                                  if (pick && pickIsBench && team.squad[pickIdx].position === p.position) {
                                    swapSquad(team, setTeam, pickIdx, i, side);
                                    setPick(null);
                                  } else {
                                    setPick(isPicked ? null : p.id);
                                  }
                                }}>
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
                                onClick={() => {
                                  if (pick && !pickIsBench && pickPlayer && pickPlayer.position === p.position) {
                                    swapSquad(team, setTeam, pickIdx, bi, side);
                                    setPick(null);
                                  } else {
                                    setPick(isPicked ? null : p.id);
                                  }
                                }}>
                                <span className="sq-num">#{p.number}</span>
                                <span className="sq-name">{p.name}</span>
                                <span className={`sq-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
                                <span className="sq-ovr">{playerOvr(p)}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </details>

                {subToast && (
                  <div className="sub-toast">{subToast}</div>
                )}

                {online ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <button className="simulate-btn" onClick={sendReadyHalftime} disabled={online.isHost ? hostReady : guestReady}>
                      {online.isHost
                        ? (hostReady ? (guestReady ? 'Iniciar 2º Tempo...' : 'Aguardando oponente...') : 'Pronto')
                        : (guestReady ? (hostReady ? 'Iniciar 2º Tempo...' : 'Aguardando oponente...') : 'Pronto')}
                    </button>
                    <span style={{ fontSize: 11, opacity: 0.6 }}>
                      {online.isHost
                        ? (hostReady ? (guestReady ? '✓ Ambos prontos' : '✓ Você · Aguardando visitante') : 'Clique em Pronto')
                        : (guestReady ? (hostReady ? '✓ Ambos prontos' : '✓ Você · Aguardando host') : 'Clique em Pronto')}
                    </span>
                  </div>
                ) : (
                  <button className="simulate-btn" onClick={() => runSecondHalf(home, away)}>
                    Iniciar 2º Tempo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Substitution modal on pause */}
          {paused && (
            <div className="halftime-overlay">
              <div className="halftime-inner">
                <div className="halftime-title">
                  {injuryToast ? injuryToast : 'Jogo Pausado'}
                </div>

                {online ? (
                  <>
                    <div style={{ fontSize: 12, opacity: 0.6, textAlign: 'center', marginBottom: 4 }}>
                      Substituições · <span style={{ color: home.color }}>{home.abbreviation} {subsHome}/{MAX_SUBS}</span> · <span style={{ color: away.color }}>{away.abbreviation} {subsAway}/{MAX_SUBS}</span>
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
                                  }}>
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
                                  onClick={() => {
                                    if (pick && !pickIsBench && pickPlayer && pickPlayer.position === p.position) {
                                      swapSquad(team, setTeam, pickIdx, bi, side);
                                      setPick(null);
                                    } else {
                                      setPick(isPicked ? null : p.id);
                                    }
                                  }}>
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

                    <details className="ht-squad-details" open>
                      <summary>Substituições · <span style={{ color: showOpponent ? away.color : home.color }}>{showOpponent ? away.abbreviation : home.abbreviation} {showOpponent ? subsAway : subsHome}/{MAX_SUBS}</span></summary>
                      <div className="ht-squad-grid">
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
                                return (
                                  <div key={p.id}
                                    className={`ht-squad-row ${isPicked ? 'picked' : ''} ${canSwap ? 'clickable' : ''} ${isInjured ? 'injured' : ''}`}
                                    style={isInjured ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}
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
                                    }}>
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
                                    onClick={() => {
                                      if (pick && !pickIsBench && pickPlayer && pickPlayer.position === p.position) {
                                        swapSquad(team, setTeam, pickIdx, bi, side);
                                        setPick(null);
                                      } else {
                                        setPick(isPicked ? null : p.id);
                                      }
                                    }}>
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
                    </details>

                    {subToast && (
                      <div className="sub-toast">{subToast}</div>
                    )}

                    <button className="simulate-btn" onClick={resumeReplay}>
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
              <button className="simulate-btn" onClick={() => { knockoutResolvedRef.current = false; setKnockoutResult(null); setSubsHome(0); setSubsAway(0); setInjuredIds([]); runFirstHalf(home, away); }} disabled={simulating}>
                Simular Partida
              </button>
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
            ) : null}
          </div>
        )}
      </div>

      <CommentaryFeed events={replayEvents} homeTeamId={initialHome.id} />
    </div>
  );
}
