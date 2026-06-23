import { useState, useEffect, useRef, useCallback } from 'react';
import type { Team, MatchResult, MatchEvent as MatchEventType, Strategy, Mentality, Intensity, Formation, DefensiveLine, Width } from '../engine/types';
import { MENTALITY_LABELS, INTENSITY_LABELS, DEFENSIVE_LINE_LABELS, WIDTH_LABELS } from '../engine/types';
import { simularPrimeiroTempo, simularSegundoTempo, type MatchState } from '../engine/matchEngine';
import { cloneTeam } from '../engine/mockData';
import CommentaryFeed from './CommentaryFeed';
import Pitch from './Pitch';

const REPLAY_MS = 1000;

function playerOvr(p: { attributes: { speed: number; stamina: number; passing: number; finishing: number; tackling: number; dribbling: number; vision: number; positioning: number } }) {
  return Math.round((p.attributes.speed + p.attributes.stamina + p.attributes.passing +
    p.attributes.finishing + p.attributes.tackling + p.attributes.dribbling +
    p.attributes.vision + p.attributes.positioning) / 8);
}

const FORMATIONS: Formation[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2'];
const MENTALITIES: Mentality[] = ['possession', 'counter-attack', 'high-press', 'defensive'];
const INTENSITIES: Intensity[] = ['low', 'medium', 'high'];
const DEF_LINES: DefensiveLine[] = ['high', 'normal', 'low'];
const WIDTHS: Width[] = ['narrow', 'normal', 'wide'];

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

  // Swap no intervalo
  const [htHomePick, setHtHomePick] = useState<string | null>(null);
  const [htAwayPick, setHtAwayPick] = useState<string | null>(null);

  const swapSquad = (team: Team, setTeam: (t: Team) => void, benchIdx: number, starterIdx: number) => {
    const squad = [...team.squad];
    [squad[benchIdx], squad[starterIdx]] = [squad[starterIdx], squad[benchIdx]];
    setTeam({ ...team, squad });
  };

  const replayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventsRef = useRef<MatchEventType[]>([]);
  const hScoreRef = useRef(0);
  const aScoreRef = useRef(0);
  const idxRef = useRef(0);
  const engineStateRef = useRef<MatchState | null>(null);

  // Limpeza
  useEffect(() => () => { if (replayRef.current) clearInterval(replayRef.current); }, []);

  // --- Função de replay (genérica) ---
  const startReplay = useCallback((events: MatchEventType[], onHalftime: () => void, onDone: () => void) => {
    if (replayRef.current) clearInterval(replayRef.current);

    eventsRef.current = events;
    hScoreRef.current = 0;
    aScoreRef.current = 0;
    idxRef.current = 0;

    if (events.length > 0) {
      setCurrentEvent(events[0]);
      setReplayEvents([events[0]]);
      idxRef.current = 1;
    }

    replayRef.current = setInterval(() => {
      const idx = idxRef.current;
      if (idx >= eventsRef.current.length) {
        if (replayRef.current) { clearInterval(replayRef.current); replayRef.current = null; }
        onDone();
        return;
      }

      const evt = eventsRef.current[idx];
      setCurrentEvent(evt);
      setReplayEvents(prev => [...prev, evt]);

      if (evt.type === 'goal') {
        if (evt.teamId === initialHome.id) { hScoreRef.current++; setHomeScore(hScoreRef.current); }
        else { aScoreRef.current++; setAwayScore(aScoreRef.current); }
      }

      // Pausa no intervalo
      if (evt.type === 'halftime') {
        if (replayRef.current) { clearInterval(replayRef.current); replayRef.current = null; }
        setPhase('halftime');
        setSimulating(false);
        onHalftime();
        return;
      }

      idxRef.current = idx + 1;
    }, REPLAY_MS);
  }, [initialHome.id]);

  // --- Simular 1º tempo ---
  const runFirstHalf = () => {
    if (replayRef.current) clearInterval(replayRef.current);
    setSimulating(true);
    setStarted(true);
    setResult(null);
    setReplayEvents([]);
    setCurrentEvent(null);
    setHomeScore(0);
    setAwayScore(0);
    setShowOverlay(false);
    setPhase('simulating');

    setTimeout(() => {
      const { state } = simularPrimeiroTempo(
        cloneTeam(home),
        cloneTeam(away)
      );
      engineStateRef.current = state;

      startReplay(
        [...state.events],
        () => {}, // halftime callback (já tratado no setInterval)
        () => {}  // done callback (não deve acontecer no 1º tempo)
      );
    }, 150);
  };

  // --- Simular 2º tempo ---
  const runSecondHalf = () => {
    if (!engineStateRef.current) return;

    if (replayRef.current) clearInterval(replayRef.current);
    setSimulating(true);
    setPhase('simulating');

    setTimeout(() => {
      const matchResult = simularSegundoTempo(
        cloneTeam(home),
        cloneTeam(away),
        engineStateRef.current!
      );
      setResult(matchResult);

      // Pega só os eventos do 2º tempo (a partir do kickoff do 2º tempo)
      const halfIdx = matchResult.events.findIndex(e => e.type === 'kickoff' && e.minute === 45);
      const secondHalfEvents = halfIdx >= 0 ? matchResult.events.slice(halfIdx) : matchResult.events;

      // Reseta scores pro acumulado (primeiro tempo + segundo)
      hScoreRef.current = matchResult.homeScore;
      aScoreRef.current = matchResult.awayScore;
      setHomeScore(matchResult.homeScore);
      setAwayScore(matchResult.awayScore);

      startReplay(
        secondHalfEvents,
        () => {},
        () => {
          setSimulating(false);
          setPhase('done');
          setShowOverlay(true);
        }
      );
    }, 150);
  };

  // --- Altera estratégia durante o intervalo ---
  const updateHome = (s: Strategy) => setHome(prev => ({ ...prev, strategy: s }));
  const updateAway = (s: Strategy) => setAway(prev => ({ ...prev, strategy: s }));

  const currentMinute = currentEvent?.minute ?? 0;

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
          <span className="clock-num">{currentMinute}&apos;</span>
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
                      ['away', away, setAway, htAwayPick, setHtAwayPick] as const].map(([side, team, setTeam, pick, setPick]) => (
                      <div key={side} className="ht-squad-col">
                        <strong style={{ color: side === 'home' ? home.color : away.color, fontSize: 11 }}>
                          {side === 'home' ? home.abbreviation : away.abbreviation}
                        </strong>
                        {team.squad.slice(11).map((p) => {
                          const isPicked = p.id === pick;
                          return (
                            <div key={p.id}
                              className={`ht-squad-row ${isPicked ? 'picked' : ''}`}
                              onClick={() => {
                                if (isPicked) { setPick(null); return; }
                                setPick(p.id);
                              }}>
                              <span className="sq-num">#{p.number}</span>
                              <span className="sq-name">{p.name}</span>
                              <span className={`sq-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
                              <span className="sq-ovr">{playerOvr(p)}</span>
                            </div>
                          );
                        })}
                        {pick && (
                          <div className="ht-swap-targets">
                            <span style={{ fontSize: 10, opacity: 0.5 }}>Trocar com:</span>
                            {team.squad.slice(0, 11).map((p, i) => {
                              const benchPlayer = team.squad.find(sp => sp.id === pick);
                              if (!benchPlayer || benchPlayer.position !== p.position) return null;
                              return (
                                <div key={p.id} className="ht-squad-row clickable"
                                  onClick={() => {
                                    swapSquad(team, setTeam, team.squad.findIndex(sp => sp.id === pick), i);
                                    setPick(null);
                                  }}>
                                  <span className="sq-num">#{p.number}</span>
                                  <span className="sq-name">{p.name}</span>
                                  <span className={`sq-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
                                  <span className="sq-ovr">{playerOvr(p)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
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
