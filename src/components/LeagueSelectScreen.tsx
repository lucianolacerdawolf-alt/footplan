import type { LeagueDefinition } from '../data/leagues/types';
import { allLeagues } from '../data/leagues';
import styles from './LeagueSelectScreen.module.css';

interface Props {
  onSelect: (league: LeagueDefinition) => void;
  onBack: () => void;
}

export default function LeagueSelectScreen({ onSelect, onBack }: Props) {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Escolher Campeonato</h1>
        <p className={styles.subtitle}>Selecione uma liga para jogar</p>
      </header>

      <div className={styles.grid}>
        {allLeagues.map(league => (
          <button
            key={league.id}
            className={styles.card}
            style={{ borderLeftColor: league.color }}
            onClick={() => onSelect(league)}
          >
            <div className={styles.flagBox} style={{ background: league.color + '18' }}>
              <span className={styles.flag}>{league.flag}</span>
            </div>
            <div className={styles.info}>
              <div className={styles.leagueName}>{league.name}</div>
              <div className={styles.country}>{league.country}</div>
              <div className={styles.metaRow}>
                <span className={styles.pill}>{league.teams.length} times</span>
                <span className={styles.pill}>{league.totalRounds} rodadas</span>
              </div>
            </div>
            <span className={styles.arrow}>→</span>
          </button>
        ))}
      </div>

      <button className={styles.backBtn} onClick={onBack}>
        ← Voltar
      </button>
    </div>
  );
}
