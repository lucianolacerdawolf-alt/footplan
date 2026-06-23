import { useState, useCallback } from 'react';
import type { Team, Strategy, Mentality, Intensity, Formation, DefensiveLine, Width } from '../engine/types';
import { MENTALITY_LABELS, INTENSITY_LABELS, DEFENSIVE_LINE_LABELS, WIDTH_LABELS } from '../engine/types';
import { cloneTeam } from '../engine/mockData';

interface Props {
  homeTeam: Team;
  awayTeam: Team;
  onStartMatch: (home: Team, away: Team) => void;
  onBack: () => void;
  lockAway?: boolean;
}

const FORMATIONS: Formation[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2'];
const MENTALITIES: Mentality[] = ['possession', 'counter-attack', 'high-press', 'defensive'];
const INTENSITIES: Intensity[] = ['low', 'medium', 'high'];
const DEF_LINES: DefensiveLine[] = ['high', 'normal', 'low'];
const WIDTHS: Width[] = ['narrow', 'normal', 'wide'];

function playerOvr(p: { attributes: { speed: number; stamina: number; passing: number; finishing: number; tackling: number; dribbling: number; vision: number; positioning: number } }) {
  return Math.round((p.attributes.speed + p.attributes.stamina + p.attributes.passing +
    p.attributes.finishing + p.attributes.tackling + p.attributes.dribbling +
    p.attributes.vision + p.attributes.positioning) / 8);
}

export default function SetupScreen({ homeTeam: initialHome, awayTeam: initialAway, onStartMatch, onBack, lockAway }: Props) {
  const [homeTeam, setHomeTeam] = useState<Team>(() => {
    const t = cloneTeam(initialHome);
    if (!t.strategy) t.strategy = { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' };
    return t;
  });
  const [awayTeam, setAwayTeam] = useState<Team>(() => {
    const t = cloneTeam(initialAway);
    if (!t.strategy) t.strategy = { formation: '4-4-2', mentality: 'counter-attack', intensity: 'medium', defensiveLine: 'normal', width: 'normal' };
    return t;
  });

  const [homeSelected, setHomeSelected] = useState<string | null>(null);
  const [awaySelected, setAwaySelected] = useState<string | null>(null);

  const updateHome = useCallback((s: Strategy) => setHomeTeam(prev => ({ ...prev, strategy: s })), []);
  const updateAway = useCallback((s: Strategy) => setAwayTeam(prev => ({ ...prev, strategy: s })), []);

  // Swap: troca um reserva (idx >= 11) com um titular (idx < 11) da mesma posição
  const swapPlayers = (team: Team, setTeam: (t: Team) => void, benchIdx: number, starterIdx: number) => {
    const squad = [...team.squad];
    [squad[benchIdx], squad[starterIdx]] = [squad[starterIdx], squad[benchIdx]];
    setTeam({ ...team, squad });
  };

  const handleSwapHome = (benchIdx: number, starterIdx: number) => {
    swapPlayers(homeTeam, setHomeTeam, benchIdx, starterIdx);
    setHomeSelected(null);
  };
  const handleSwapAway = (benchIdx: number, starterIdx: number) => {
    swapPlayers(awayTeam, setAwayTeam, benchIdx, starterIdx);
    setAwaySelected(null);
  };

  const renderSquad = (
    team: Team,
    selected: string | null,
    setSelected: (id: string | null) => void,
    handleSwap: (benchIdx: number, starterIdx: number) => void,
    locked: boolean
  ) => {
    const starters = team.squad.slice(0, 11);
    const bench = team.squad.slice(11);
    return (
      <div className="squad-panel">
        <div className="squad-section">
          <div className="squad-section-title">Titulares</div>
          {starters.map((p, i) => (
            <div
              key={p.id}
              className={`squad-row starter ${selected && !locked ? 'clickable' : ''}`}
              onClick={() => {
                if (locked) return;
                if (selected) {
                  const benchIdx = team.squad.findIndex(sp => sp.id === selected);
                  if (benchIdx >= 11 && team.squad[benchIdx].position === p.position) {
                    handleSwap(benchIdx, i);
                  }
                }
              }}
            >
              <span className="sq-num">#{p.number}</span>
              <span className="sq-name">{p.name}</span>
              <span className={`sq-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
              <span className="sq-ovr">{playerOvr(p)}</span>
            </div>
          ))}
        </div>
        {bench.length > 0 && (
          <div className="squad-section bench-section">
            <div className="squad-section-title">Reservas</div>
            {bench.map((p) => {
              const isSelected = p.id === selected;
              return (
                <div
                  key={p.id}
                  className={`squad-row bench ${isSelected ? 'selected' : ''} ${!locked ? 'clickable' : ''}`}
                  onClick={() => {
                    if (locked) return;
                    setSelected(isSelected ? null : p.id);
                  }}
                >
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
    );
  };

  const countByPos = (team: Team, pos: string) => team.squad.slice(0, 11).filter(p => p.position === pos).length;

  const renderCard = (team: Team, onStrategy: (s: Strategy) => void, side: 'home' | 'away', disabled = false) => (
    <div className={`setup-team-card ${side} ${disabled ? 'locked' : ''}`} style={{ borderTopColor: team.color }}>
      <div className="setup-team-header">
        <div className="setup-team-crest" style={{ background: team.color }}>{team.abbreviation}</div>
        <div>
          <h2>{team.name}</h2>
          <span className="setup-team-sub">{team.strategy.formation} · {playerOvr(team.squad[0])} - {playerOvr(team.squad[10])} OVR {disabled ? '🔒 CPU' : ''}</span>
        </div>
      </div>

      <div className="setup-squad-badges">
        <span className="squad-badge gk">GK {countByPos(team, 'GK')}</span>
        <span className="squad-badge def">DEF {countByPos(team, 'DEF')}</span>
        <span className="squad-badge mid">MID {countByPos(team, 'MID')}</span>
        <span className="squad-badge fwd">FWD {countByPos(team, 'FWD')}</span>
      </div>

      <div className="setup-controls">
        <div className="setup-select">
          <label>Formação</label>
          <select value={team.strategy.formation} disabled={disabled} onChange={e => onStrategy({ ...team.strategy, formation: e.target.value as Formation })}>
            {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="setup-select">
          <label>Mentalidade</label>
          <select value={team.strategy.mentality} disabled={disabled} onChange={e => onStrategy({ ...team.strategy, mentality: e.target.value as Mentality })}>
            {MENTALITIES.map(m => <option key={m} value={m}>{MENTALITY_LABELS[m]}</option>)}
          </select>
        </div>
        <div className="setup-select">
          <label>Intensidade</label>
          <select value={team.strategy.intensity} disabled={disabled} onChange={e => onStrategy({ ...team.strategy, intensity: e.target.value as Intensity })}>
            {INTENSITIES.map(i => <option key={i} value={i}>{INTENSITY_LABELS[i]}</option>)}
          </select>
        </div>
        <div className="setup-select">
          <label>Linha Defensiva</label>
          <select value={team.strategy.defensiveLine} disabled={disabled} onChange={e => onStrategy({ ...team.strategy, defensiveLine: e.target.value as DefensiveLine })}>
            {DEF_LINES.map(d => <option key={d} value={d}>{DEFENSIVE_LINE_LABELS[d]}</option>)}
          </select>
        </div>
        <div className="setup-select">
          <label>Amplitude</label>
          <select value={team.strategy.width} disabled={disabled} onChange={e => onStrategy({ ...team.strategy, width: e.target.value as Width })}>
            {WIDTHS.map(w => <option key={w} value={w}>{WIDTH_LABELS[w]}</option>)}
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="setup-screen">
      <header className="app-header">
        <h1>FootPlan</h1>
        <p className="subtitle">Configuração Tática</p>
      </header>

      <div className="setup-layout">
        <div className="setup-left">
          {renderCard(homeTeam, updateHome, 'home')}
          {renderSquad(homeTeam, homeSelected, setHomeSelected, handleSwapHome, false)}
        </div>

        <div className="setup-center">
          <div className="setup-vs-col">
            <div className="setup-vs-circle">VS</div>
          </div>
        </div>

        <div className="setup-right">
          {renderCard(awayTeam, updateAway, 'away', lockAway)}
          {renderSquad(awayTeam, awaySelected, setAwaySelected, handleSwapAway, !!lockAway)}
        </div>
      </div>

      <div className="setup-action">
        <button className="back-btn-secondary" onClick={onBack} style={{ marginRight: 12 }}>Voltar</button>
        <button className="start-btn" onClick={() => onStartMatch(homeTeam, awayTeam)}>
          Iniciar Partida
        </button>
      </div>
    </div>
  );
}
