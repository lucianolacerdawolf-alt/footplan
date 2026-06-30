import type { LeagueDefinition } from '../data/leagues/types';
import { allLeagues } from '../data/leagues';
import styles from './CupSelectScreen.module.css';

interface Props {
  onSelect: (league: LeagueDefinition) => void;
  onBack: () => void;
}

export default function CupSelectScreen({ onSelect, onBack }: Props) {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <button className={styles.backBtn} onClick={onBack}>←</button>
          <div className={styles.logo}>FootPlan</div>
        </div>
        <p className={styles.subtitle}>Escolha sua copa</p>
      </header>

      <div className={styles.grid}>
        {allLeagues.map(league => (
          <button
            key={league.id}
            className={styles.card}
            style={{ '--lc': league.color } as React.CSSProperties}
            onClick={() => onSelect(league)}
          >
            <div className={styles.cardStripe} />
            <div className={styles.cardBody}>
              <img
                src={league.cupLogo}
                alt={league.cupName}
                className={styles.badge}
              />
              <div className={styles.cupName}>{league.cupName}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
