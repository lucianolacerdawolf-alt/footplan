import type { Team } from '../engine/types';
import { cloneTeam, getAvgOvr } from '../utils/teamUtils';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { fireClick } from '../utils/fireClick';
import { crestSrc } from '../utils/crest';
import { ScreenHeader, Button } from './ui';

export type GameMode = 'cpu' | 'player';

interface Props {
  teams: Team[];
  leagueName: string;
  onConfirm: (home: Team, away: Team, mode: GameMode) => void;
  onBack: () => void;
  onGoHome: () => void;
}

type Uniform = 'home' | 'away';

export default function TeamSelectionScreen({ teams, leagueName, onConfirm, onBack }: Props) {
  const [homeId, setHomeId] = useLocalStorage<string | null>('fp:homeId', null);
  const [awayId, setAwayId] = useLocalStorage<string | null>('fp:awayId', null);
  const [homeUniform, setHomeUniform] = useLocalStorage<Uniform>('fp:homeUniform', 'home');
  const [awayUniform, setAwayUniform] = useLocalStorage<Uniform>('fp:awayUniform', 'away');
  const [mode, setMode] = useLocalStorage<GameMode>('fp:mode', 'cpu');

  const homeTeam = teams.find(t => t.id === homeId) ?? null;
  const awayTeam = teams.find(t => t.id === awayId) ?? null;

  const displayColor = (team: Team, uniform: Uniform) =>
    uniform === 'home' ? team.color : team.secondaryColor;

  const handleTeamClick = (teamId: string) => {
    const homeIsValid = homeId ? teams.some(t => t.id === homeId) : false;
    const awayIsValid = awayId ? teams.some(t => t.id === awayId) : false;
    const effectiveHomeId = homeIsValid ? homeId : null;
    const effectiveAwayId = awayIsValid ? awayId : null;

    if (!homeIsValid && homeId) setHomeId(null);
    if (!awayIsValid && awayId) setAwayId(null);

    if (effectiveHomeId === teamId) { setHomeId(null); return; }
    if (effectiveAwayId === teamId) { setAwayId(null); return; }
    if (!effectiveHomeId) { setHomeId(teamId); setHomeUniform('home'); return; }
    if (!effectiveAwayId && teamId !== effectiveHomeId) { setAwayId(teamId); setAwayUniform('away'); return; }
  };

  const colorsConflict = !!(homeTeam && awayTeam &&
    displayColor(homeTeam, homeUniform).toLowerCase() === displayColor(awayTeam, awayUniform).toLowerCase());

  const fixColorConflict = () => {
    if (!homeTeam || !awayTeam) return;
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
           role={team ? 'button' : undefined}
           tabIndex={team ? 0 : undefined}
           onClick={team ? () => {
             if (side === 'home') setHomeId(null);
             else setAwayId(null);
           } : undefined}
           onKeyDown={e => fireClick(e)}
           style={team ? { borderColor: color, background: bg } : undefined}>
        {team ? (
          <>
            <img className="slot-crest" src={crestSrc(team.logoUrl)} alt={team.name} />
            <span className="slot-name">{team.name}</span>
            <span className="slot-ovr">{getAvgOvr(team)} OVR</span>
            <div className="uniform-toggle">
              <button
                className={`uni-btn ${uniform === 'home' ? 'active' : ''}`}
                style={uniform === 'home' ? { background: team.color, borderColor: team.color } : undefined}
                onClick={e => { e.stopPropagation(); setUniform('home'); }}
              >Camisa 1</button>
              <button
                className={`uni-btn ${uniform === 'away' ? 'active' : ''}`}
                style={uniform === 'away' ? { background: team.secondaryColor, borderColor: team.secondaryColor } : undefined}
                onClick={e => { e.stopPropagation(); setUniform('away'); }}
              >Camisa 2</button>
            </div>
          </>
        ) : (
          <span className="slot-empty">{label}</span>
        )}
      </div>
    );
  };

  return (
    <div className="team-select-screen fit-screen">
      <ScreenHeader onBack={onBack} kicker={leagueName} title="Escolha os times" />

      <div className="select-instruction">
        {!homeTeam && !awayTeam && 'Escolha o time da CASA'}
        {homeTeam && !awayTeam && 'Agora escolha o time VISITANTE'}
        {homeTeam && awayTeam && 'Confronto definido!'}
      </div>

      <div className="select-summary">
        {renderSlot(homeTeam, homeUniform, setHomeUniform, 'home', 'CASA')}
        <div className="select-vs">VS</div>
        {renderSlot(awayTeam, awayUniform, setAwayUniform, 'away', 'FORA')}
      </div>

      <div className="select-action">
        {homeTeam && awayTeam
          ? <Button glow onClick={handleConfirm}>Montar Táticas →</Button>
          : null
        }
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

      <div className="team-grid fit-scroll">
        {[...teams].sort((a, b) => a.name.localeCompare(b.name)).map(team => {
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
              aria-label={`${team.name}, força ${getAvgOvr(team)}${isHome ? ', mandante' : isAway ? ', visitante' : ''}`}
              aria-pressed={isSelected}
            >
              <img className="tile-crest" src={crestSrc(team.logoUrl)} alt="" />
              <span className="tile-name">{team.name}</span>
              <span className="tile-ovr">{getAvgOvr(team)}</span>
            </button>
          );
        })}
      </div>


    </div>
  );
}
