import type { CareerSummary, CareerHighlights } from '../engine/careerStats';
import { formatMoney } from '../utils/formatMoney';
import styles from './CareerSummaryPanel.module.css';

interface Props {
  summary: CareerSummary;
  highlights: CareerHighlights;
}

/** Painel de retrospectiva "Minha Carreira" — agregados da jornada do técnico.
 *  Renderizado no topo da Sala de Troféus quando há ao menos 1 temporada concluída. */
export default function CareerSummaryPanel({ summary, highlights }: Props) {
  const tiles: Array<{ value: string; label: string }> = [
    { value: String(summary.seasonsPlayed), label: 'Temporadas' },
    { value: `🥇 ${summary.leagueTitles}`, label: 'Títulos de Liga' },
    { value: `🏆 ${summary.cupTitles}`, label: 'Copas' },
    { value: `${summary.wins}V ${summary.draws}E ${summary.losses}D`, label: 'Campanha' },
    { value: `${summary.winPct}%`, label: 'Aproveit. em V' },
    { value: `⭐ ${summary.managerOfSeasonCount}`, label: 'Téc. da Temporada' },
    { value: summary.bestLeaguePosition != null ? `${summary.bestLeaguePosition}º` : '—', label: 'Melhor posição' },
    { value: String(summary.reputationNow), label: 'Reputação' },
  ];

  const { topScorer, biggestSigning, bestFinancialSeason } = highlights;
  const hasHighlights = topScorer || biggestSigning || bestFinancialSeason;

  return (
    <section className={styles.panel} aria-label="Resumo da carreira">
      <div className={styles.heading}>📊 Minha Carreira</div>

      <div className={styles.tiles}>
        {tiles.map(t => (
          <div key={t.label} className={styles.tile}>
            <span className={styles.tileValue}>{t.value}</span>
            <span className={styles.tileLabel}>{t.label}</span>
          </div>
        ))}
      </div>

      {hasHighlights && (
        <div className={styles.highlights}>
          {topScorer && (
            <div className={styles.highlightRow}>
              <span className={styles.highlightLabel}>⚽ Artilheiro de carreira</span>
              <span className={styles.highlightValue}>{topScorer.name} ({topScorer.goals})</span>
            </div>
          )}
          {biggestSigning && (
            <div className={styles.highlightRow}>
              <span className={styles.highlightLabel}>🛒 Maior contratação</span>
              <span className={styles.highlightValue}>{biggestSigning.playerName} · {formatMoney(biggestSigning.amount)}</span>
            </div>
          )}
          {bestFinancialSeason && (
            <div className={styles.highlightRow}>
              <span className={styles.highlightLabel}>💰 Melhor saldo (Temp. {bestFinancialSeason.year})</span>
              <span className={styles.highlightValue} style={{ color: bestFinancialSeason.budgetDelta >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                {bestFinancialSeason.budgetDelta >= 0 ? '+' : ''}{formatMoney(bestFinancialSeason.budgetDelta)}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
