import { useState, useCallback } from 'react';
import type { Team, Strategy, Mentality, Intensity, Formation } from '../engine/types';
import { MENTALITY_LABELS, INTENSITY_LABELS } from '../engine/types';
import { cloneTeam } from '../engine/mockData';

interface Props {
  homeTeam: Team;
  awayTeam: Team;
  onStartMatch: (home: Team, away: Team) => void;
  onBack: () => void;
}

const FORMATIONS: Formation[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2'];
const MENTALITIES: Mentality[] = ['possession', 'counter-attack', 'high-press', 'defensive'];
const INTENSITIES: Intensity[] = ['low', 'medium', 'high'];

export default function SetupScreen({ homeTeam: initialHome, awayTeam: initialAway, onStartMatch, onBack }: Props) {
  const [homeTeam, setHomeTeam] = useState<Team>(() => {
    const t = cloneTeam(initialHome);
    if (!t.strategy) t.strategy = { formation: '4-3-3', mentality: 'possession', intensity: 'medium' };
    return t;
  });
  const [awayTeam, setAwayTeam] = useState<Team>(() => {
    const t = cloneTeam(initialAway);
    if (!t.strategy) t.strategy = { formation: '4-4-2', mentality: 'counter-attack', intensity: 'medium' };
    return t;
  });

  const updateHome = useCallback((s: Strategy) => setHomeTeam(prev => ({ ...prev, strategy: s })), []);
  const updateAway = useCallback((s: Strategy) => setAwayTeam(prev => ({ ...prev, strategy: s })), []);

  const countByPos = (team: Team, pos: string) => team.squad.filter(p => p.position === pos).length;
  const avgOvr = (team: Team) => Math.round(
    team.squad.reduce((acc, p) => acc + (p.attributes.speed + p.attributes.stamina + p.attributes.passing +
      p.attributes.finishing + p.attributes.tackling + p.attributes.dribbling +
      p.attributes.vision + p.attributes.positioning) / 8, 0) / team.squad.length
  );

  const renderCard = (team: Team, onStrategy: (s: Strategy) => void, side: 'home' | 'away') => (
    <div className={`setup-team-card ${side}`} style={{ borderTopColor: team.color }}>
      <div className="setup-team-header">
        <div className="setup-team-crest" style={{ background: team.color }}>{team.abbreviation}</div>
        <div>
          <h2>{team.name}</h2>
          <span className="setup-team-sub">{team.strategy.formation} · {avgOvr(team)} OVR</span>
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
          <select value={team.strategy.formation} onChange={e => onStrategy({ ...team.strategy, formation: e.target.value as Formation })}>
            {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="setup-select">
          <label>Mentalidade</label>
          <select value={team.strategy.mentality} onChange={e => onStrategy({ ...team.strategy, mentality: e.target.value as Mentality })}>
            {MENTALITIES.map(m => <option key={m} value={m}>{MENTALITY_LABELS[m]}</option>)}
          </select>
        </div>
        <div className="setup-select">
          <label>Intensidade</label>
          <select value={team.strategy.intensity} onChange={e => onStrategy({ ...team.strategy, intensity: e.target.value as Intensity })}>
            {INTENSITIES.map(i => <option key={i} value={i}>{INTENSITY_LABELS[i]}</option>)}
          </select>
        </div>
      </div>

      <details className="setup-players">
        <summary>Ver elenco ({team.squad.length} jogadores)</summary>
        <div className="setup-players-grid">
          {team.squad.map(p => (
            <div key={p.id} className="setup-player-row">
              <span className="p-num">#{p.number}</span>
              <span className="p-name">{p.name}</span>
              <span className={`p-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
              <span className="p-ovr">
                {Math.round((p.attributes.speed + p.attributes.stamina + p.attributes.passing +
                  p.attributes.finishing + p.attributes.tackling + p.attributes.dribbling +
                  p.attributes.vision + p.attributes.positioning) / 8)}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );

  return (
    <div className="setup-screen">
      <header className="app-header">
        <h1>FootPlan</h1>
        <p className="subtitle">Configuração Tática</p>
      </header>

      <div className="setup-teams">
        {renderCard(homeTeam, updateHome, 'home')}
        <div className="setup-vs"><div className="setup-vs-circle">VS</div></div>
        {renderCard(awayTeam, updateAway, 'away')}
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
