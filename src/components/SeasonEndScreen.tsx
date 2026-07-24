import type { CareerSeasonHistoryEntry } from '../engine/career';
import type { LeagueDefinition } from '../data/leagues/types';
import styles from './SeasonEndScreen.module.css';

interface Props {
  entry: CareerSeasonHistoryEntry;
  league: LeagueDefinition;
  newReputation: number;
  onContinue: () => void;
}

const CUP_RESULT_LABELS: Record<CareerSeasonHistoryEntry['cupResult'], string> = {
  champion: 'Campeão',
  'runner-up': 'Vice-campeão',
  semifinal: 'Semifinal',
  quarterfinal: 'Quartas de final',
  roundOf16: 'Oitavas de final',
  'not-played': 'Não disputada',
};

export default function SeasonEndScreen({ entry, league, newReputation, onContinue }: Props) {
  const champion = league.teams.find(t => t.id === entry.leagueChampionId) ?? null;
  const reputationSign = entry.reputationDelta >= 0 ? '+' : '';

  return (
    <div className={`${styles.screen} app-screen`}>
      <h1 className={styles.headerTitle}>Temporada {entry.year} encerrada</h1>

      <div className={styles.champion}>
        <div className={styles.championCrown}>🏆</div>
        {champion ? (
          <>
            <img src={champion.logoUrl} alt={champion.name} className={styles.championCrest} />
            <div className={styles.championName} style={{ color: champion.color }}>{champion.name}</div>
          </>
        ) : (
          <div className={styles.championName}>Campeão desconhecido</div>
        )}
        <div className={styles.championSub}>Campeão da {league.name}</div>
      </div>

      <div className={styles.userResult}>
        Você terminou em <strong>{entry.userLeaguePosition}º lugar</strong>
      </div>

      <div className={styles.statsCard}>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>{league.cupName}</span>
          <span className={styles.statValue}>{CUP_RESULT_LABELS[entry.cupResult]}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Trocas usadas</span>
          <span className={styles.statValue}>{entry.tradesUsed}/3</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Reputação</span>
          <span className={entry.reputationDelta >= 0 ? styles.repPositive : styles.repNegative}>
            {newReputation} ({reputationSign}{entry.reputationDelta})
          </span>
        </div>
      </div>

      <div className={styles.action}>
        <button className="start-btn" onClick={onContinue}>Começar Temporada {entry.year + 1} →</button>
      </div>
    </div>
  );
}
