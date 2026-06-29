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
        <p className={styles.subtitle}>Selecione uma liga para disputar a temporada</p>
      </header>

      <div className={styles.grid}>
        {allLeagues.map(league => (
          <button
            key={league.id}
            className={styles.card}
            onClick={() => onSelect(league)}
          >
            <span className={styles.flag}>{league.flag}</span>
            <div className={styles.info}>
              <div className={styles.leagueName}>{league.name}</div>
              <div className={styles.leagueMeta}>
                {league.country}
                <span className={styles.pill}>{league.totalRounds} rodadas</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onBack}
        style={{
          marginTop: 28, padding: '10px 28px', fontSize: '0.9rem',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer',
        }}
      >
        Voltar
      </button>
    </div>
  );
}
