import { useState } from 'react';
import type { Team } from '../engine/types';
import type { LeagueDefinition } from '../data/leagues/types';
import { cloneTeam } from '../utils/teamUtils';
import { playerOvr } from '../utils/playerOvr';

export type TournamentMode = 'league' | 'bracket';

interface Props {
  mode: TournamentMode;
  league: LeagueDefinition;
  onBack: () => void;
  onGoHome: () => void;
  onStart: (userTeam: Team) => void;
}

const MODE_BTN: Record<TournamentMode, string> = {
  league: 'Iniciar Temporada →',
  bracket: 'Sortear Copa →',
};

export default function TournamentSetupScreen({ mode, league, onBack, onGoHome, onStart }: Props) {
  const [userTeamId, setUserTeamId] = useState<string | null>(null);

  const getAvgOvr = (team: Team) => {
    const starters = team.squad.slice(0, 11);
    return Math.round(starters.reduce((acc, p) => acc + playerOvr(p), 0) / starters.length);
  };

  const handleStart = () => {
    if (!userTeamId) return;
    onStart(cloneTeam(league.teams.find(t => t.id === userTeamId)!));
  };

  const selectedTeam = league.teams.find(t => t.id === userTeamId) ?? null;

  const isCup = mode === 'bracket';
  const title = isCup ? league.cupName : league.name;

  return (
    <div className="team-select-screen">
      <div className="top-nav">
        <button className="slot-nav-btn" onClick={onBack}>← Voltar</button>
        <header className="app-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {isCup && league.cupLogo ? (
            <img src={league.cupLogo} alt={league.cupName} style={{ width: 52, height: 52, objectFit: 'contain' }} />
          ) : (
            <h1>FootPlan</h1>
          )}
          <p className="subtitle">{title}</p>
        </header>
        <button className="slot-nav-btn" onClick={onGoHome}>Menu Principal</button>
      </div>

      <div className="select-instruction">
        {userTeamId ? 'Time selecionado! Pode começar.' : 'Escolha seu time'}
      </div>

      <div className="select-summary" style={{ justifyContent: 'center' }}>
        <div
          className={`select-slot home-slot ${selectedTeam ? 'filled' : ''}`}
          onClick={selectedTeam ? () => setUserTeamId(null) : undefined}
          style={selectedTeam ? { borderColor: selectedTeam.color, background: selectedTeam.color + '12' } : undefined}
        >
          {selectedTeam ? (
            <>
              <img className="slot-crest" src={selectedTeam.logoUrl} alt={selectedTeam.name} />
              <span className="slot-name">{selectedTeam.name}</span>
              <span className="slot-ovr">{getAvgOvr(selectedTeam)} OVR</span>
            </>
          ) : (
            <span className="slot-empty">SEU TIME</span>
          )}
        </div>
      </div>

      <div className="select-action">
        {selectedTeam && (
          <button className="slot-nav-btn slot-nav-btn-primary" onClick={handleStart}>{MODE_BTN[mode]}</button>
        )}
      </div>

      <div className="team-grid">
        {[...league.teams].sort((a, b) => a.name.localeCompare(b.name)).map(team => {
          const isSelected = team.id === userTeamId;
          return (
            <button
              key={team.id}
              className={`team-tile ${isSelected ? 'picked-home selected' : ''}`}
              style={isSelected ? { borderColor: team.color, background: team.color + '10' } : undefined}
              onClick={() => setUserTeamId(isSelected ? null : team.id)}
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
