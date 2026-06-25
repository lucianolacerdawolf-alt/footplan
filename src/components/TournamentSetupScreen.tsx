import { useState } from 'react';
import type { Team } from '../engine/types';
import { premierLeagueTeams } from '../data/premierLeague';
import { cloneTeam } from '../utils/teamUtils';
import { playerOvr } from '../utils/playerOvr';
import styles from './TournamentSetupScreen.module.css';

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
const MODE_DESC: Record<TournamentMode, string> = {
  league: 'Escolha seu time — todos os 20 da Premier League participam.',
  bracket: 'Escolha seu time — os outros 7 são sorteados automaticamente.',
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

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className="back-btn-secondary" onClick={onBack}>← Voltar</button>
        <h1 className={styles.title}>{MODE_TITLE[mode]}</h1>
      </header>

      <p className={styles.instruction}>{MODE_DESC[mode]}</p>

      <div className={styles.grid}>
        {premierLeagueTeams.map(team => {
          const selected = team.id === userTeamId;
          return (
            <button
              key={team.id}
              className={`${styles.tile} ${selected ? styles.tileSelected : ''}`}
              style={selected ? { borderColor: team.color, background: team.color + '18' } : undefined}
              onClick={() => setUserTeamId(selected ? null : team.id)}
            >
              <img src={team.logoUrl} alt={team.name} className={styles.tileCrest} />
              <span className={styles.tileName}>{team.abbreviation}</span>
              <span className={styles.tileOvr}>{getAvgOvr(team)}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.footer}>
        <button className="start-btn" disabled={!userTeamId} onClick={handleStart}>
          {MODE_BTN[mode]}
        </button>
      </div>
    </div>
  );
}
