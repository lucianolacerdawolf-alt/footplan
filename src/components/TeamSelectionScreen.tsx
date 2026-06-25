import type { Team } from '../engine/types';
import { premierLeagueTeams } from '../data/premierLeague';
import { cloneTeam } from '../utils/teamUtils';
import { playerOvr } from '../utils/playerOvr';
import { useLocalStorage } from '../hooks/useLocalStorage';

export type GameMode = 'cpu' | 'player';

interface Props {
  onConfirm: (home: Team, away: Team, mode: GameMode) => void;
  onTournament: () => void;
}

type Uniform = 'home' | 'away';

export default function TeamSelectionScreen({ onConfirm, onTournament }: Props) {
  const [homeId, setHomeId] = useLocalStorage<string | null>('fp:homeId', null);
  const [awayId, setAwayId] = useLocalStorage<string | null>('fp:awayId', null);
  const [homeUniform, setHomeUniform] = useLocalStorage<Uniform>('fp:homeUniform', 'home');
  const [awayUniform, setAwayUniform] = useLocalStorage<Uniform>('fp:awayUniform', 'away');
  const [mode, setMode] = useLocalStorage<GameMode>('fp:mode', 'cpu');

  const homeTeam = premierLeagueTeams.find(t => t.id === homeId) ?? null;
  const awayTeam = premierLeagueTeams.find(t => t.id === awayId) ?? null;

  const displayColor = (team: Team, uniform: Uniform) =>
    uniform === 'home' ? team.color : team.secondaryColor;

  const handleTeamClick = (teamId: string) => {
    if (homeId === teamId) { setHomeId(null); return; }
    if (awayId === teamId) { setAwayId(null); return; }
    if (!homeId) { setHomeId(teamId); setHomeUniform('home'); return; }
    if (!awayId && teamId !== homeId) { setAwayId(teamId); setAwayUniform('away'); return; }
  };

  const colorsConflict = !!(homeTeam && awayTeam &&
    displayColor(homeTeam, homeUniform).toLowerCase() === displayColor(awayTeam, awayUniform).toLowerCase());

  const fixColorConflict = () => {
    if (!homeTeam || !awayTeam) return;
    // Tenta trocar o kit do visitante; se ainda conflitar, troca o mandante
    const awayAlt: Uniform = awayUniform === 'home' ? 'away' : 'home';
    if (displayColor(homeTeam, homeUniform).toLowerCase() !== displayColor(awayTeam, awayAlt).toLowerCase()) {
      setAwayUniform(awayAlt);
    } else {
      setHomeUniform(homeUniform === 'home' ? 'away' : 'home');
    }
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
    onConfirm(h, a, mode);
  };

  const getAvgOvr = (team: Team) => {
    const starters = team.squad.slice(0, 11);
    return Math.round(starters.reduce((acc, p) => acc + playerOvr(p), 0) / starters.length);
  };

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
            <img className="slot-crest" src={team.logoUrl} alt={team.name} />
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
      <div className="top-nav">
        <button className="back-btn-secondary" onClick={onTournament}>← Menu Principal</button>
        {homeTeam && awayTeam && (
          <button className="start-btn" onClick={handleConfirm}>Montar Táticas &rarr;</button>
        )}
      </div>
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

      {colorsConflict && (
        <div className="color-conflict-warning">
          <span>Ambos os times estão com a mesma cor!</span>
          <button className="conflict-fix-btn" onClick={fixColorConflict}>
            Corrigir kit automaticamente
          </button>
        </div>
      )}

      <div className="mode-selector">
        <span className="mode-label">Modo:</span>
        <button className={`mode-btn ${mode === 'cpu' ? 'active' : ''}`} onClick={() => setMode('cpu')}>
          🎮 vs CPU
        </button>
        <button className={`mode-btn ${mode === 'player' ? 'active' : ''}`} onClick={() => setMode('player')}>
          👥 2 Jogadores
        </button>
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
              <img className="tile-crest" src={team.logoUrl} alt={team.name} />
              <span className="tile-name">{team.name}</span>
              <span className="tile-ovr">{getAvgOvr(team)}</span>
            </button>
          );
        })}
      </div>


    </div>
  );
}
