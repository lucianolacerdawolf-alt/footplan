import { useState, useEffect, useRef, useCallback } from 'react';
import type { Team, MatchResult, MatchEvent as MatchEventType, Strategy, Mentality, Intensity, Formation, DefensiveLine, Width } from '../engine/types';
import { MENTALITY_LABELS, INTENSITY_LABELS, DEFENSIVE_LINE_LABELS, WIDTH_LABELS } from '../engine/types';
import { simularPrimeiroTempo, simularSegundoTempo, type MatchState } from '../engine/matchEngine';
import { cloneTeam } from '../engine/mockData';
import { FORMATIONS, MENTALITIES, INTENSITIES, DEF_LINES, WIDTHS } from '../engine/constants';
import CommentaryFeed from './CommentaryFeed';
import Pitch from './Pitch';
import { playerOvr } from '../utils/playerOvr';

const HALF_DURATION_MS = 120000; // 2 minutos reais = 45 min de jogo (2700s)
const CLOCK_TICK_MS = 50;       // relógio de segundos rápidos
const HALF_SECONDS = 45 * 60;   // 2700 segundos em jogo por tempo

interface Props {
  homeTeam: Team;
  awayTeam: Team;
  onBack: () => void;
}

export default function MatchScreen({ homeTeam: initialHome, awayTeam: initialAway, onBack }: Props) {
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

  const [result, setResult] = useState<MatchResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [replayEvents, setReplayEvents] = useState<MatchEventType[]>([]);
  const [currentEvent, setCurrentEvent] = useState<MatchEventType | null>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'simulating' | 'halftime' | 'done'>('idle');
  const [started, setStarted] = useState(false);
  const [clockSeconds, setClockSeconds] = useState(0);

  // Swap no intervalo
  const [htHomePick, setHtHomePick] = useState<string | null>(null);
  const [htAwayPick, setHtAwayPick] = useState<string | null>(null);

  const swapSquad = (team: Team, setTeam: (t: Team) => void, benchIdx: number, starterIdx: number) => {
    const squad = [...team.squad];
    [squad[benchIdx], squad[starterIdx]] = [squad[starterIdx], squad[benchIdx]];
    setTeam({ ...team, squad });
  };

  const replayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hScoreRef = useRef(0);
  const aScoreRef = useRef(0);
  const engineStateRef = useRef<MatchState | null>(null);

  useEffect(() => () => {
    if (replayRef.current) clearInterval(replayRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // --- Função de replay com relógio MM:SS contínuo ---
  const startReplay = useCallback((
    events: MatchEventType[],
    halfOffsetSec: number,
    initialHomeScore: number,
    initialAwayScore: number,
    onHalftime: () => void,
    onDone: () => void
  ) => {
    if (replayRef.current) clearInterval(replayRef.current);

    const queue = [...events];
    const startTime = Date.now();
    const maxSec = halfOffsetSec + HALF_SECONDS;

    hScoreRef.current = initialHomeScore;
    aScoreRef.current = initialAwayScore;
    setHomeScore(initialHomeScore);
    setAwayScore(initialAwayScore);
    setReplayEvents([]);
    setClockSeconds(halfOffsetSec);

    // Exibe kickoff imediatamente
    if (queue.length > 0 && queue[0].minute * 60 <= halfOffsetSec + 1) {
      const kickoff = queue.shift()!;
      setCurrentEvent(kickoff);
      setReplayEvents([kickoff]);
    }

    replayRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const inGameSec = Math.min(HALF_SECONDS, Math.floor(elapsed / HALF_DURATION_MS * HALF_SECONDS));
      const effectiveSec = halfOffsetSec + inGameSec;

      setClockSeconds(effectiveSec);

      // Processa UM evento por tick (espaça as mensagens na cronologia)
      if (queue.length > 0 && queue[0].minute * 60 <= effectiveSec) {
        const evt = queue.shift()!;

        if (evt.type === 'halftime') {
          setCurrentEvent(evt);
          setReplayEvents(prev => [...prev, evt]);
          if (replayRef.current) { clearInterval(replayRef.current); replayRef.current = null; }
          setPhase('halftime');
          setSimulating(false);
          setClockSeconds(maxSec);
          onHalftime();
          return;
        }

        if (evt.type === 'fulltime') {
          setCurrentEvent(evt);
          setReplayEvents(prev => [...prev, evt]);
          if (replayRef.current) { clearInterval(replayRef.current); replayRef.current = null; }
          setClockSeconds(maxSec);
          onDone();
          return;
        }

        if (evt.type === 'goal') {
          if (evt.teamId === initialHome.id) { hScoreRef.current++; setHomeScore(hScoreRef.current); }
          else { aScoreRef.current++; setAwayScore(aScoreRef.current); }
        }

        setCurrentEvent(evt);
        setReplayEvents(prev => [...prev, evt]);
      }

      if (elapsed >= HALF_DURATION_MS) {
        if (replayRef.current) { clearInterval(replayRef.current); replayRef.current = null; }
        setClockSeconds(maxSec);
        onDone();
      }
    }, CLOCK_TICK_MS);
  }, [initialHome.id]);

  // --- Simular 1º tempo ---
  const runFirstHalf = () => {
    if (replayRef.current) clearInterval(replayRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSimulating(true);
    setStarted(true);
    setResult(null);
    setReplayEvents([]);
    setCurrentEvent(null);
    setHomeScore(0);
    setAwayScore(0);
    setShowOverlay(false);
    setPhase('simulating');
    setClockSeconds(0);

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const { state } = simularPrimeiroTempo(
        cloneTeam(home),
        cloneTeam(away)
      );
      engineStateRef.current = state;

      startReplay(
        [...state.events],
        0,
        state.homeScore,
        state.awayScore,
        () => {},
        () => {}
      );
    }, 150);
  };

  // --- Simular 2º tempo ---
  const runSecondHalf = () => {
    if (!engineStateRef.current) return;

    const firstHalfHome = engineStateRef.current.homeScore;
    const firstHalfAway = engineStateRef.current.awayScore;

    if (replayRef.current) clearInterval(replayRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSimulating(true);
    setPhase('simulating');
    setClockSeconds(HALF_SECONDS);

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const matchResult = simularSegundoTempo(
        cloneTeam(home),
        cloneTeam(away),
        engineStateRef.current!
      );
      setResult(matchResult);

      // Pega só os eventos do 2º tempo (a partir do último kickoff no minuto 45)
      const halfIdx = matchResult.events.findLastIndex(e => e.type === 'kickoff' && e.minute === 45);
      const secondHalfEvents = halfIdx >= 0 ? matchResult.events.slice(halfIdx) : matchResult.events;

      startReplay(
        secondHalfEvents,
        HALF_SECONDS,
        firstHalfHome,
        firstHalfAway,
        () => {},
        () => {
          setSimulating(false);
          setPhase('done');
          setShowOverlay(true);
          setHomeScore(matchResult.homeScore);
          setAwayScore(matchResult.awayScore);
        }
      );
    }, 150);
  };

  // --- Altera estratégia durante o intervalo ---
  const updateHome = (s: Strategy) => setHome(prev => ({ ...prev, strategy: s }));
  const updateAway = (s: Strategy) => setAway(prev => ({ ...prev, strategy: s }));

  // Removido: currentMinute agora é clockMinute

  const pitchResult = (showOverlay && result) ? {
    homeScore: result.homeScore, awayScore: result.awayScore,
    homePossession: result.homePossession, awayPossession: result.awayPossession,
    shots: result.events.filter(e => ['goal','miss','post','save'].includes(e.type)).length,
    goals: result.events.filter(e => e.type === 'goal').length,
  } : null;

  return (
    <div className="match-screen">
      {/* Topbar */}
      <header className="match-topbar">
        <button className="back-btn" onClick={onBack} disabled={simulating}>
          &larr; Voltar
        </button>
        <span className="match-title">{home.abbreviation} vs {away.abbreviation}</span>
        <span className="match-formations">{home.strategy.formation} x {away.strategy.formation}</span>
      </header>

      {/* Placar + Tempo */}
      <div className="match-scorebar">
        <div className="score-side home" style={{ borderLeftColor: home.color }}>
          <span className="score-label" style={{ color: home.color }}>{home.abbreviation}</span>
          <span className="score-num">{started ? homeScore : '\u2013'}</span>
        </div>
        <div className="score-clock">
          <span className="clock-num">{String(Math.floor(clockSeconds / 60)).padStart(2, '0')}:{String(clockSeconds % 60).padStart(2, '0')}</span>
          <span className="clock-label">MIN</span>
        </div>
        <div className="score-side away" style={{ borderRightColor: away.color }}>
          <span className="score-num">{started ? awayScore : '\u2013'}</span>
          <span className="score-label" style={{ color: away.color }}>{away.abbreviation}</span>
        </div>
      </div>

      {/* Campinho */}
      <div className="match-pitch-area">
        <div className="pitch-container">
          <Pitch
            homeTeam={home} awayTeam={away}
            currentEvent={currentEvent}
            phase={phase === 'halftime' || phase === 'done' ? 'done' : simulating || phase === 'simulating' ? 'simulating' : 'idle'}
            result={pitchResult}
            halftime={phase === 'halftime' ? { homeScore, awayScore } : null}
          />

          {/* Intervalo: painel sobreposto ao campo */}
          {phase === 'halftime' && (
            <div className="halftime-overlay">
              <div className="halftime-inner">
                <div className="halftime-title">Intervalo</div>

                <div className="halftime-teams">
                  <div className="halftime-team">
                    <strong style={{ color: home.color }}>{home.abbreviation}</strong>
                    <select value={home.strategy.formation} onChange={e => updateHome({ ...home.strategy, formation: e.target.value as Formation })}>
                      {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={home.strategy.mentality} onChange={e => updateHome({ ...home.strategy, mentality: e.target.value as Mentality })}>
                      {MENTALITIES.map(m => <option key={m} value={m}>{MENTALITY_LABELS[m]}</option>)}
                    </select>
                    <select value={home.strategy.intensity} onChange={e => updateHome({ ...home.strategy, intensity: e.target.value as Intensity })}>
                      {INTENSITIES.map(i => <option key={i} value={i}>{INTENSITY_LABELS[i]}</option>)}
                    </select>
                    <select value={home.strategy.defensiveLine} onChange={e => updateHome({ ...home.strategy, defensiveLine: e.target.value as DefensiveLine })}>
                      {DEF_LINES.map(d => <option key={d} value={d}>{DEFENSIVE_LINE_LABELS[d]}</option>)}
                    </select>
                    <select value={home.strategy.width} onChange={e => updateHome({ ...home.strategy, width: e.target.value as Width })}>
                      {WIDTHS.map(w => <option key={w} value={w}>{WIDTH_LABELS[w]}</option>)}
                    </select>
                  </div>
                  <span className="halftime-vs">vs</span>
                  <div className="halftime-team">
                    <strong style={{ color: away.secondaryColor }}>{away.abbreviation}</strong>
                    <select value={away.strategy.formation} onChange={e => updateAway({ ...away.strategy, formation: e.target.value as Formation })}>
                      {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={away.strategy.mentality} onChange={e => updateAway({ ...away.strategy, mentality: e.target.value as Mentality })}>
                      {MENTALITIES.map(m => <option key={m} value={m}>{MENTALITY_LABELS[m]}</option>)}
                    </select>
                    <select value={away.strategy.intensity} onChange={e => updateAway({ ...away.strategy, intensity: e.target.value as Intensity })}>
                      {INTENSITIES.map(i => <option key={i} value={i}>{INTENSITY_LABELS[i]}</option>)}
                    </select>
                    <select value={away.strategy.defensiveLine} onChange={e => updateAway({ ...away.strategy, defensiveLine: e.target.value as DefensiveLine })}>
                      {DEF_LINES.map(d => <option key={d} value={d}>{DEFENSIVE_LINE_LABELS[d]}</option>)}
                    </select>
                    <select value={away.strategy.width} onChange={e => updateAway({ ...away.strategy, width: e.target.value as Width })}>
                      {WIDTHS.map(w => <option key={w} value={w}>{WIDTH_LABELS[w]}</option>)}
                    </select>
                  </div>
                </div>

                {/* Squad swaps */}
                <details className="ht-squad-details">
                  <summary>Substituições</summary>
                  <div className="ht-squad-grid">
                    {[['home', home, setHome, htHomePick, setHtHomePick] as const,
                      ['away', away, setAway, htAwayPick, setHtAwayPick] as const].map(([side, team, setTeam, pick, setPick]) => {
                        const benchPlayers = team.squad.slice(11);
                        const starters = team.squad.slice(0, 11);
                        const pickIdx = team.squad.findIndex(sp => sp.id === pick);
                        const pickIsBench = pickIdx >= 11;
                        const pickPlayer = pickIdx >= 0 ? team.squad[pickIdx] : null;
                        return (
                      <div key={side} className="ht-squad-col">
                        <strong style={{ color: side === 'home' ? home.color : away.color, fontSize: 11 }}>
                          {side === 'home' ? home.abbreviation : away.abbreviation}
                        </strong>
                        <div className="ht-sub-group-label">Titulares</div>
                        {starters.map((p, i) => {
                          const isPicked = p.id === pick;
                          const canSwap = pick && !pickIsBench && pickPlayer && pickPlayer.position === p.position && pickIdx !== i;
                          return (
                            <div key={p.id}
                              className={`ht-squad-row ${isPicked ? 'picked' : ''} ${canSwap ? 'clickable' : ''}`}
                              onClick={() => {
                                if (pick && pickIsBench && team.squad[pickIdx].position === p.position) {
                                  swapSquad(team, setTeam, pickIdx, i);
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
                                  swapSquad(team, setTeam, pickIdx, bi);
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

                <button className="simulate-btn" onClick={runSecondHalf}>
                  Iniciar 2º Tempo
                </button>
              </div>
            </div>
          )}
        </div>

        {phase !== 'halftime' && (
          <button className="simulate-btn" onClick={started ? runFirstHalf : runFirstHalf} disabled={simulating}>
            {simulating ? 'Simulando...' : started ? 'Simular Novamente' : 'Simular Partida'}
          </button>
        )}
      </div>

      <CommentaryFeed events={replayEvents} homeTeamId={initialHome.id} />
    </div>
  );
}
