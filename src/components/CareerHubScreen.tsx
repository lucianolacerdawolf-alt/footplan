import type { CareerState, CareerSeasonHistoryEntry } from '../engine/career';
import type { LeagueDefinition } from '../data/leagues/types';
import { computeStandings } from '../engine/tournament';
import styles from './CareerHubScreen.module.css';

interface Props {
  state: CareerState;
  league: LeagueDefinition;
  onViewLeague: () => void;
  onViewCup: () => void;
  onProposeTrade: () => void;
  onAdvanceSeason: () => void;
  onBack: () => void;
}

const CUP_STAGE_LABELS: Record<string, string> = {
  roundOf16: 'Oitavas',
  quarterfinals: 'Quartas',
  semifinals: 'Semis',
  final: 'Final',
  champion: 'Campeão',
};

const CUP_RESULT_LABELS: Record<CareerSeasonHistoryEntry['cupResult'], string> = {
  champion: 'Campeão',
  'runner-up': 'Vice-campeão',
  semifinal: 'Semifinal',
  quarterfinal: 'Quartas de final',
  roundOf16: 'Oitavas de final',
  'not-played': 'Não disputada',
};

function reputationSign(delta: number): string {
  return delta > 0 ? '+' : '';
}

export default function CareerHubScreen({ state, league, onViewLeague, onViewCup, onProposeTrade, onAdvanceSeason, onBack }: Props) {
  const standings = computeStandings(state.season.league.teams, state.season.league.fixtures);
  const userPosition = standings.findIndex(s => s.teamId === state.season.league.userTeamId) + 1;
  const cupStageLabel = CUP_STAGE_LABELS[state.season.cup.stage] ?? state.season.cup.stage;
  const tradesUsed = state.season.tradesUsedThisSeason;
  const tradeLimitReached = tradesUsed >= 3;
  const seasonReady = state.season.league.phase === 'done' && state.season.cup.stage === 'champion';
  const history = [...state.history].reverse();

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Voltar">
          ← Voltar
        </button>
        <div className={styles.headerTitle}>
          <h1 className={styles.title}>{state.manager.name}</h1>
          <span className={styles.progress}>Reputação: {state.manager.reputation}</span>
        </div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Liga</span>
          <span className={styles.summaryValue}>{league.name}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Temporada</span>
          <span className={styles.summaryValue}>{state.currentSeasonYear}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Posição na liga</span>
          <span className={styles.summaryValue}>{userPosition}º</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>{league.cupName}</span>
          <span className={styles.summaryValue}>{cupStageLabel}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Trocas usadas</span>
          <span className={styles.summaryValue}>{tradesUsed}/3</span>
        </div>
      </div>

      <div className={styles.navRow}>
        <button className={styles.navBtn} onClick={onViewLeague}>Ver Liga →</button>
        <button className={styles.navBtn} onClick={onViewCup}>Ver Copa →</button>
        <button
          className={styles.navBtn}
          onClick={onProposeTrade}
          disabled={tradeLimitReached}
          title={tradeLimitReached ? 'Limite de trocas atingido' : undefined}
        >
          {tradeLimitReached ? 'Limite de trocas atingido' : 'Propor Troca'}
        </button>
      </div>

      {seasonReady ? (
        <div className={styles.advanceRow}>
          <button className={styles.advanceBtn} onClick={onAdvanceSeason}>Avançar Temporada →</button>
        </div>
      ) : (
        <div className={styles.advanceStatus}>Termine a liga e a copa pra avançar de temporada</div>
      )}

      <div className={styles.historySection}>
        <div className={styles.summaryLabel}>Histórico</div>
        <div className={styles.grid}>
          {history.map(entry => (
            <div key={entry.year} className={styles.card}>
              <div className={styles.cardYear}>{entry.year}</div>
              <div className={styles.cardInfo}>
                <span className={styles.cardLine}>{entry.userLeaguePosition}º na liga</span>
                <span className={styles.cardLine}>{CUP_RESULT_LABELS[entry.cupResult]}</span>
                <span className={styles.cardLine}>{entry.tradesUsed}/3 trocas</span>
              </div>
              <span className={entry.reputationDelta >= 0 ? styles.repPositive : styles.repNegative}>
                {reputationSign(entry.reputationDelta)}{entry.reputationDelta}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
