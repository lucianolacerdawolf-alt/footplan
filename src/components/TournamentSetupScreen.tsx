import { useState } from 'react';
import type { Team } from '../engine/types';
import { premierLeagueTeams } from '../data/premierLeague';
import { cloneTeam } from '../utils/teamUtils';
import { playerOvr } from '../utils/playerOvr';

export type TournamentMode = 'league' | 'bracket';

interface Props {
  mode: TournamentMode;
  onBack: () => void;
  onStart: (userTeam: Team) => void;
}

const MODE_TITLE: Record<TournamentMode, string> = {
  league: 'Premier League',
  bracket: 'FA Cup',
};
const MODE_BTN: Record<TournamentMode, string> = {
  league: 'Iniciar Temporada →',
  bracket: 'Sortear Copa →',
};

export default function TournamentSetupScreen({ mode, onBack, onStart }: Props) {
  const [userTeamId, setUserTeamId] = useState<string | null>(null);

  const getAvgOvr = (team: Team) => {
    const starters = team.squad.slice(0, 11);
    return Math.round(starters.reduce((acc, p) => acc + playerOvr(p), 0) / starters.length);
  };

  const handleStart = () => {
    if (!userTeamId) return;
    onStart(cloneTeam(premierLeagueTeams.find(t => t.id === userTeamId)!));
  };

  const selectedTeam = premierLeagueTeams.find(t => t.id === userTeamId) ?? null;

  return (
    <div className="team-select-screen">
      <header className="app-header">
        <h1>FootPlan</h1>
        <p className="subtitle">{MODE_TITLE[mode]}</p>
      </header>

      <div className="select-instruction">
        {userTeamId ? 'Time selecionado! Pode começar.' : 'Escolha seu time'}
      </div>

      {/* Linha central: botão voltar | slot | botão iniciar */}
      <div className="slot-nav-row">
        <button className="slot-nav-btn" onClick={onBack}>← Menu Principal</button>

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

        {selectedTeam
          ? <button className="slot-nav-btn slot-nav-btn-primary" onClick={handleStart}>{MODE_BTN[mode]}</button>
          : <div className="slot-nav-spacer" />
        }
      </div>

      <div className="team-grid">
        {premierLeagueTeams.map(team => {
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
