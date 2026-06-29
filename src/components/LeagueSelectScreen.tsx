import type { LeagueDefinition } from '../data/leagues/types';
import { allLeagues } from '../data/leagues';
import { crestSvg } from '../data/leagues/generateTeam';
import styles from './LeagueSelectScreen.module.css';

interface Props {
  onSelect: (league: LeagueDefinition) => void;
  onBack: () => void;
}

function leagueBadge(league: LeagueDefinition): string {
  const initials = league.name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
  return crestSvg(league.color, initials);
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
            onClick={() => onSelect(league)}
          >
            <img src={leagueBadge(league)} alt={league.name} className={styles.badge} />
            <div className={styles.info}>
              <div className={styles.leagueName}>
                <span className={styles.flag}>{league.flag}</span> {league.name}
              </div>
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
