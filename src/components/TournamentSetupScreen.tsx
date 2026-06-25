import { useState } from 'react';
import type { Team } from '../engine/types';
import { premierLeagueTeams } from '../data/premierLeague';
import { cloneTeam } from '../utils/teamUtils';
import { playerOvr } from '../utils/playerOvr';
import styles from './TournamentSetupScreen.module.css';

export type TournamentMode = 'league' | 'bracket';

interface Props {
  onBack: () => void;
  onStartLeague: (userTeam: Team) => void;
  onStartBracket: (userTeam: Team, otherTeams: Team[]) => void;
}

export default function TournamentSetupScreen({ onBack, onStartLeague, onStartBracket }: Props) {
  const [mode, setMode] = useState<TournamentMode>('league');
  const [userTeamId, setUserTeamId] = useState<string | null>(null);

  const getAvgOvr = (team: Team) => {
    const starters = team.squad.slice(0, 11);
    return Math.round(starters.reduce((acc, p) => acc + playerOvr(p), 0) / starters.length);
  };

  const handleStart = () => {
    if (!userTeamId) return;
    const userTeam = cloneTeam(premierLeagueTeams.find(t => t.id === userTeamId)!);

    if (mode === 'league') {
      onStartLeague(userTeam);
    } else {
      const others = premierLeagueTeams
        .filter(t => t.id !== userTeamId)
        .sort(() => Math.random() - 0.5)
        .slice(0, 7)
        .map(cloneTeam);
      onStartBracket(userTeam, others);
    }
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className="back-btn-secondary" onClick={onBack}>← Voltar</button>
        <h1 className={styles.title}>Modo Torneio</h1>
      </header>

      {/* Mode picker */}
      <div className={styles.modePicker}>
        <button
          className={`${styles.modeBtn} ${mode === 'league' ? styles.modeBtnActive : ''}`}
          onClick={() => setMode('league')}
        >
          <span className={styles.modeIcon}>📅</span>
          <span className={styles.modeName}>Liga</span>
          <span className={styles.modeDesc}>Pontos Corridos · 38 rodadas</span>
        </button>
        <button
          className={`${styles.modeBtn} ${mode === 'bracket' ? styles.modeBtnActive : ''}`}
          onClick={() => setMode('bracket')}
        >
          <span className={styles.modeIcon}>🏆</span>
          <span className={styles.modeName}>Copa</span>
          <span className={styles.modeDesc}>Mata-mata · 8 times</span>
        </button>
      </div>

      <p className={styles.instruction}>
        {mode === 'league'
          ? 'Escolha seu time — todos os 20 da Premier League participam.'
          : 'Escolha seu time — os outros 7 são sorteados automaticamente.'}
      </p>

      {/* Team grid */}
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
        <button
          className="start-btn"
          disabled={!userTeamId}
          onClick={handleStart}
        >
          {mode === 'league' ? 'Iniciar Temporada →' : 'Sortear Copa →'}
        </button>
      </div>
    </div>
  );
}
