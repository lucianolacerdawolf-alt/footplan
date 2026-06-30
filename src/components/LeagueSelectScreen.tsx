import type { LeagueDefinition } from '../data/leagues/types';
import { allLeagues } from '../data/leagues';
import styles from './LeagueSelectScreen.module.css';

interface Props {
  onSelect: (league: LeagueDefinition) => void;
  selectedLeague?: LeagueDefinition | null;
  onBack?: () => void;
}

export default function LeagueSelectScreen({ onSelect, selectedLeague, onBack }: Props) {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          {onBack && (
            <button className={styles.backBtn} onClick={onBack}>←</button>
          )}
          <div className={styles.logo}>FootPlan</div>
        </div>
        <p className={styles.subtitle}>Escolha seu campeonato</p>
      </header>

      <div className={styles.grid}>
        {[...allLeagues].sort((a, b) => b.teams.length - a.teams.length).map(league => {
          const isSelected = selectedLeague?.id === league.id;
          return (
            <button
              key={league.id}
              className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
              style={{ '--lc': league.color } as React.CSSProperties}
              onClick={() => onSelect(league)}
            >
              <div className={styles.cardStripe}>
                {isSelected && <span className={styles.check}>✓ Ativo</span>}
              </div>
              <div className={styles.cardBody}>
                <img
                  src={league.logo}
                  alt={league.name}
                  className={styles.badge}
                />
                <div className={styles.leagueName}>{league.name}</div>
                <div className={styles.meta}>
                  <span className={styles.flag}>{league.flag}</span>
                </div>
                <div className={styles.stats}>
                  <span className={styles.pill}>{league.teams.length} times</span>
                  <span className={styles.pill}>{league.totalRounds} rodadas</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
