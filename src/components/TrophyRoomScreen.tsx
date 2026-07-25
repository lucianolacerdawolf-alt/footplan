import { useState } from 'react';
import type { CareerSeasonHistoryEntry } from '../engine/career';
import { CUP_RESULT_LABELS } from '../engine/careerLabels';
import { formatMoney } from '../utils/formatMoney';
import styles from './TrophyRoomScreen.module.css';

interface Props {
  history: CareerSeasonHistoryEntry[];
  onBack: () => void;
}

function trophyIcon(entry: CareerSeasonHistoryEntry): string {
  if (entry.userLeaguePosition === 1) return '🥇';
  if (entry.cupResult === 'champion') return '🏆';
  if (entry.userLeaguePosition <= 3) return '🥈';
  return '📋';
}

export default function TrophyRoomScreen({ history, onBack }: Props) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const ordered = [...history].sort((a, b) => a.year - b.year);

  return (
    <div className={`${styles.screen} app-screen`}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Voltar">← Voltar</button>
        <h1 className={styles.title}>🏆 Sala de Troféus</h1>
      </div>

      {ordered.length === 0 ? (
        <div className={styles.empty}>Nenhuma temporada concluída ainda.</div>
      ) : (
        <>
          <div className={styles.grid}>
            {ordered.map(entry => {
              const isExpanded = expandedYear === entry.year;
              const wdl = entry.userWins != null
                ? `${entry.userWins}V ${entry.userDraws}E ${entry.userLosses}D`
                : null;
              return (
                <button
                  key={entry.year}
                  className={`${styles.card} ${isExpanded ? styles.expanded : ''}`}
                  onClick={() => setExpandedYear(prev => (prev === entry.year ? null : entry.year))}
                  aria-expanded={isExpanded}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.cardIcon} aria-hidden="true">{trophyIcon(entry)}</span>
                    <span className={styles.cardYear}>{entry.year}</span>
                  </div>
                  <div className={styles.cardLine}>{entry.userLeaguePosition}º na liga</div>
                  <div className={styles.cardLine}>{CUP_RESULT_LABELS[entry.cupResult]}</div>
                  {entry.managerOfSeason && <div className={styles.motsTag}>⭐ Técnico da Temporada</div>}

                  {isExpanded && (
                    <div className={styles.details}>
                      {entry.userTopScorer && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Artilheiro</span>
                          <span className={styles.detailValue}>{entry.userTopScorer.name} ({entry.userTopScorer.goals})</span>
                        </div>
                      )}
                      {wdl && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Campanha</span>
                          <span className={styles.detailValue}>{wdl}</span>
                        </div>
                      )}
                      {entry.userGoalsFor != null && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Gols</span>
                          <span className={styles.detailValue}>{entry.userGoalsFor} pró · {entry.userGoalsAgainst} contra</span>
                        </div>
                      )}
                      {entry.budgetDelta != null && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Finanças</span>
                          <span className={styles.detailValue} style={{ color: entry.budgetDelta >= 0 ? '#22c55e' : '#ef4444' }}>
                            {entry.budgetDelta >= 0 ? '+' : ''}{formatMoney(entry.budgetDelta)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className={styles.repSection}>
            <div className={styles.repLabel}>Reputação por temporada</div>
            <div className={styles.repRow}>
              {ordered.map(entry => (
                <span
                  key={entry.year}
                  className={styles.repChip}
                  style={{ color: entry.reputationDelta >= 0 ? '#22c55e' : '#ef4444' }}
                  title={`Temporada ${entry.year}`}
                >
                  {entry.reputationDelta >= 0 ? '+' : ''}{entry.reputationDelta}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
