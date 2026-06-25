import { useState } from 'react';
import type { Team, Strategy, Mentality, Intensity, Formation, DefensiveLine, Width } from '../engine/types';
import { MENTALITY_LABELS, INTENSITY_LABELS, DEFENSIVE_LINE_LABELS, WIDTH_LABELS } from '../engine/types';
import { cloneTeam } from '../engine/mockData';
import { FORMATIONS, MENTALITIES, INTENSITIES, DEF_LINES, WIDTHS } from '../engine/constants';
import { useMatchSimulation } from '../hooks/useMatchSimulation';
import CommentaryFeed from './CommentaryFeed';
import Pitch from './Pitch';
import { playerOvr } from '../utils/playerOvr';

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

  const [htHomePick, setHtHomePick] = useState<string | null>(null);
  const [htAwayPick, setHtAwayPick] = useState<string | null>(null);

  const {
    result, simulating, replayEvents, currentEvent,
    homeScore, awayScore, showOverlay, phase, started, clockSeconds,
    fatigueMap,
    runFirstHalf, runSecondHalf,
  } = useMatchSimulation(initialHome.id);

  const swapSquad = (team: Team, setTeam: (t: Team) => void, benchIdx: number, starterIdx: number) => {
    const squad = [...team.squad];
    [squad[benchIdx], squad[starterIdx]] = [squad[starterIdx], squad[benchIdx]];
    setTeam({ ...team, squad });
  };

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
          />

          {/* Intervalo */}
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

                {/* Substituições */}
                <details className="ht-squad-details">
                  <summary>Substituições</summary>
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

                <button className="simulate-btn" onClick={() => runSecondHalf(home, away)}>
                  Iniciar 2º Tempo
                </button>
              </div>
            </div>
          )}
        </div>

        {phase !== 'halftime' && (
          <button className="simulate-btn" onClick={() => runFirstHalf(home, away)} disabled={simulating}>
            {simulating ? 'Simulando...' : started ? 'Simular Novamente' : 'Simular Partida'}
          </button>
        )}
      </div>

      <CommentaryFeed events={replayEvents} homeTeamId={initialHome.id} />
    </div>
  );
}
