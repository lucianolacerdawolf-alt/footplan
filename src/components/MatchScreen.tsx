import { useState, useEffect, useRef } from 'react';
import type { Team, Strategy, Mentality, Intensity, Formation, DefensiveLine, Width, MatchResult } from '../engine/types';
import { MENTALITY_LABELS, INTENSITY_LABELS, DEFENSIVE_LINE_LABELS, WIDTH_LABELS } from '../engine/types';
import { cloneTeam } from '../utils/teamUtils';
import { FORMATIONS, MENTALITIES, INTENSITIES, DEF_LINES, WIDTHS } from '../engine/constants';
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
}

export default function MatchScreen({ homeTeam: initialHome, awayTeam: initialAway, onBack, onViewStats, isKnockout }: Props) {
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
  const MAX_SUBS = 3;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { addMatch } = useMatchHistory();

  const {
    result, simulating, replayEvents, currentEvent,
    homeScore, awayScore, showOverlay, phase, started, clockSeconds,
    fatigueMap, expelledIds, engineStateRef,
    runFirstHalf, runSecondHalf,
  } = useMatchSimulation(initialHome.id);

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
    setTeam({ ...team, squad });
    if (side === 'home') setSubsHome(n => n + 1); else setSubsAway(n => n + 1);
    showSubToast(outPlayer, inPlayer);
  };

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const knockoutResolvedRef = useRef(false);
  const [knockoutResult, setKnockoutResult] = useState<MatchResult | null>(null);

  useEffect(() => {
    if (phase !== 'done' || !result) return;
    if (!isKnockout) { addMatch(result); return; }
    if (knockoutResolvedRef.current) return;
    knockoutResolvedRef.current = true;

    if (result.homeScore !== result.awayScore) {
      const enriched: MatchResult = { ...result, wentToExtraTime: false, winner: result.homeScore > result.awayScore ? home : away };
      addMatch(enriched);
      setKnockoutResult(enriched);
      return;
    }

    const state = engineStateRef.current!;
    const tiebreak = resolveKnockoutTiebreak(cloneTeam(home), cloneTeam(away), state);
    const winner = tiebreak.penaltyResult
      ? (tiebreak.penaltyResult.winner === 'home' ? home : away)
      : (state.homeScore > state.awayScore ? home : away);
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
  }, [phase, result]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateHome = (s: Strategy) => setHome(prev => ({ ...prev, strategy: s }));
  const updateAway = (s: Strategy) => setAway(prev => ({ ...prev, strategy: s }));

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

                {/* Substituições */}
                <details className="ht-squad-details">
                  <summary>Substituições · <span style={{ color: home.color }}>{home.abbreviation} {subsHome}/{MAX_SUBS}</span> · <span style={{ color: away.color }}>{away.abbreviation} {subsAway}/{MAX_SUBS}</span></summary>
                  <div className="ht-squad-grid">
                    {([
                      ['home', home, setHome, htHomePick, setHtHomePick],
                      ['away', away, setAway, htAwayPick, setHtAwayPick],
                    ] as const).map(([side, team, setTeam, pick, setPick]) => {
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

                <button className="simulate-btn" onClick={() => runSecondHalf(home, away)}>
                  Iniciar 2º Tempo
                </button>
              </div>
            </div>
          )}
        </div>

        {phase !== 'halftime' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="simulate-btn" onClick={() => { knockoutResolvedRef.current = false; setKnockoutResult(null); runFirstHalf(home, away); }} disabled={simulating}>
              {simulating ? 'Simulando...' : started ? 'Simular Novamente' : 'Simular Partida'}
            </button>
            {phase === 'done' && (isKnockout ? knockoutResult : result) && (
              <button className="stats-btn" onClick={() => onViewStats((isKnockout ? knockoutResult : result)!)}>
                {isKnockout && !knockoutResult ? '⏳ Calculando...' : '📊 Estatísticas'}
              </button>
            )}
          </div>
        )}
      </div>

      <CommentaryFeed events={replayEvents} homeTeamId={initialHome.id} />
    </div>
  );
}
