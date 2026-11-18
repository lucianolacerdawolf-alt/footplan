import type { LeagueDefinition } from '../data/leagues/types';
import { allLeagues } from '../data/leagues';
import { crestSrc } from '../utils/crest';
import styles from './CupSelectScreen.module.css';
import { ScreenHeader } from './ui';

interface Props {
  onSelect: (league: LeagueDefinition) => void;
  onBack: () => void;
}

export default function CupSelectScreen({ onSelect, onBack }: Props) {
  return (
    <div className={`${styles.screen} app-screen`}>
      <ScreenHeader onBack={onBack} kicker="Copas" title="Escolha a copa" />

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
                src={crestSrc(league.cupLogo)}
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
