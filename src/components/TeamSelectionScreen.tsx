import { useState } from 'react';
import type { Team } from '../engine/types';
import { premierLeagueTeams } from '../data/premierLeague';
import { cloneTeam } from '../engine/mockData';

interface Props {
  onConfirm: (home: Team, away: Team) => void;
}

type Uniform = 'home' | 'away';

export default function TeamSelectionScreen({ onConfirm }: Props) {
  const [homeId, setHomeId] = useState<string | null>(null);
  const [awayId, setAwayId] = useState<string | null>(null);
  const [homeUniform, setHomeUniform] = useState<Uniform>('home');
  const [awayUniform, setAwayUniform] = useState<Uniform>('away');

  const homeTeam = premierLeagueTeams.find(t => t.id === homeId) ?? null;
  const awayTeam = premierLeagueTeams.find(t => t.id === awayId) ?? null;

  const handleTeamClick = (teamId: string) => {
    if (homeId === teamId) { setHomeId(null); return; }
    if (awayId === teamId) { setAwayId(null); return; }
    if (!homeId) { setHomeId(teamId); setHomeUniform('home'); return; }
    if (!awayId && teamId !== homeId) { setAwayId(teamId); setAwayUniform('away'); return; }
  };

  const handleConfirm = () => {
    if (!homeTeam || !awayTeam) return;
    const h = cloneTeam(homeTeam);
    const a = cloneTeam(awayTeam);
    if (homeUniform === 'away') {
      [h.color, h.secondaryColor] = [h.secondaryColor, h.color];
    }
    if (awayUniform === 'away') {
      [a.color, a.secondaryColor] = [a.secondaryColor, a.color];
    }
    onConfirm(h, a);
  };

  const getAvgOvr = (team: Team) => {
    const sum = team.squad.reduce((acc, p) =>
      acc + (p.attributes.speed + p.attributes.stamina + p.attributes.passing +
        p.attributes.finishing + p.attributes.tackling + p.attributes.dribbling +
        p.attributes.vision + p.attributes.positioning) / 8, 0
    );
    return Math.round(sum / team.squad.length);
  };

  const displayColor = (team: Team, uniform: Uniform) =>
    uniform === 'home' ? team.color : team.secondaryColor;

  const renderSlot = (
    team: Team | null,
    uniform: Uniform,
    setUniform: (u: Uniform) => void,
    side: 'home' | 'away',
    label: string
  ) => {
    const color = team ? displayColor(team, uniform) : undefined;
    const bg = team ? color + '12' : undefined;
    return (
      <div className={`select-slot ${side}-slot ${team ? 'filled' : ''}`}
           onClick={team ? () => {
             if (side === 'home') setHomeId(null);
             else setAwayId(null);
           } : undefined}
           style={team ? { borderColor: color, background: bg } : undefined}>
        {team ? (
          <>
            <span className="slot-abbr" style={{ color }}>{team.abbreviation}</span>
            <span className="slot-name">{team.name}</span>
            <span className="slot-ovr">{getAvgOvr(team)} OVR</span>
            <div className="uniform-toggle">
              <button
                className={`uni-btn ${uniform === 'home' ? 'active' : ''}`}
                style={uniform === 'home' ? { background: team.color, borderColor: team.color } : undefined}
                onClick={e => { e.stopPropagation(); setUniform('home'); }}
              >HOME</button>
              <button
                className={`uni-btn ${uniform === 'away' ? 'active' : ''}`}
                style={uniform === 'away' ? { background: team.secondaryColor, borderColor: team.secondaryColor } : undefined}
                onClick={e => { e.stopPropagation(); setUniform('away'); }}
              >AWAY</button>
            </div>
          </>
        ) : (
          <span className="slot-empty">{label}</span>
        )}
      </div>
    );
  };

  return (
    <div className="team-select-screen">
      <header className="app-header">
        <h1>FootPlan</h1>
        <p className="subtitle">Premier League</p>
      </header>

      <div className="select-instruction">
        {!homeId && !awayId && 'Escolha o time da CASA'}
        {homeId && !awayId && 'Agora escolha o time VISITANTE'}
        {homeId && awayId && 'Confronto definido!'}
      </div>

      <div className="select-summary">
        {renderSlot(homeTeam, homeUniform, setHomeUniform, 'home', 'CASA')}
        <div className="select-vs">VS</div>
        {renderSlot(awayTeam, awayUniform, setAwayUniform, 'away', 'FORA')}
      </div>

      <div className="team-grid">
        {premierLeagueTeams.map(team => {
          const isHome = team.id === homeId;
          const isAway = team.id === awayId;
          const isSelected = isHome || isAway;
          const color = team.color;
          return (
            <button
              key={team.id}
              className={`team-tile ${isHome ? 'picked-home' : ''} ${isAway ? 'picked-away' : ''} ${isSelected ? 'selected' : ''}`}
              style={isSelected ? { borderColor: color, background: color + '10' } : undefined}
              onClick={() => handleTeamClick(team.id)}
              disabled={!!homeId && !!awayId && !isSelected}
            >
              <span className="tile-abbr" style={isSelected ? { color } : undefined}>{team.abbreviation}</span>
              <span className="tile-name">{team.name}</span>
              <span className="tile-ovr">{getAvgOvr(team)}</span>
            </button>
          );
        })}
      </div>

      {homeTeam && awayTeam && (
        <div className="select-action">
          <button className="start-btn" onClick={handleConfirm}>
            Montar Táticas &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
