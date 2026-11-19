import type { RoundSummary } from '../engine/career';
import { confidenceLabel } from '../engine/boardConfidence';
import { formatMoney } from '../utils/formatMoney';
import { useModalFocus } from '../hooks/useModalFocus';
import styles from './RoundSummaryModal.module.css';

interface Props {
  summary: RoundSummary;
  onClose: () => void;
}

const signed = (n: number) => `${n > 0 ? '+' : ''}${formatMoney(n)}`;

/** Resumo da rodada que acabou: resultado, tabela, dinheiro e diretoria — uma tela,
 *  mostrada uma vez ao avançar (estilo "fim de semana" dos jogos de técnico). */
export default function RoundSummaryModal({ summary, onClose }: Props) {
  const ref = useModalFocus<HTMLDivElement>(true, onClose);
  const { user, money, confidence } = summary;
  const us = user ? (user.userHome ? user.homeScore : user.awayScore) : 0;
  const them = user ? (user.userHome ? user.awayScore : user.homeScore) : 0;
  const result = !user ? null : us > them ? 'win' : us === them ? 'draw' : 'loss';
  const moved = summary.positionBefore ? summary.positionBefore - summary.positionAfter : 0;
  const confDelta = confidence.after - confidence.before;
  const conf = confidenceLabel(confidence.after);

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div ref={ref} className={styles.card} role="dialog" aria-modal="true" aria-labelledby="round-summary-title" onClick={e => e.stopPropagation()}>
        <div className={styles.kicker} id="round-summary-title">Resumo · Rodada {summary.round}</div>

        {user && (
          <div className={`${styles.result} ${result ? styles[result] : ''}`}>
            <span className={styles.team}>{user.homeName}</span>
            <span className={styles.score}>{user.homeScore} – {user.awayScore}</span>
            <span className={styles.team}>{user.awayName}</span>
          </div>
        )}
        {user && user.scorers.length > 0 && <div className={styles.scorers}>⚽ {user.scorers.join(', ')}</div>}

        <div className={styles.grid}>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>Tabela</span>
            <span className={styles.tileValue}>{summary.positionAfter}º</span>
            <span className={moved > 0 ? styles.up : moved < 0 ? styles.down : styles.muted}>
              {summary.positionBefore === null ? `de ${summary.totalTeams}` : moved > 0 ? `▲ subiu ${moved}` : moved < 0 ? `▼ caiu ${-moved}` : '= manteve'}
            </span>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>Caixa</span>
            <span className={styles.tileValue}>{formatMoney(money.budget)}</span>
            <span className={money.net >= 0 ? styles.up : styles.down}>{signed(money.net)} na rodada</span>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>Diretoria</span>
            <span className={`${styles.tileValue} ${styles[conf.tone]}`}>{confidence.after}%</span>
            <span className={confDelta > 0 ? styles.up : confDelta < 0 ? styles.down : styles.muted}>
              {confDelta === 0 ? conf.label : `${confDelta > 0 ? '▲' : '▼'} ${Math.abs(confDelta)} · ${conf.label}`}
            </span>
          </div>
        </div>

        <div className={`${styles.scroll}`}>
          {confidence.reasons.length > 0 && (
            <ul className={styles.reasons}>
              {confidence.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}

          <div className={styles.money}>
            <span>Patrocínio e TV</span><span className={styles.up}>{signed(money.sponsor)}</span>
            {money.tickets > 0 && <><span>Bilheteria</span><span className={styles.up}>{signed(money.tickets)}</span></>}
            {money.merch > 0 && <><span>Produtos</span><span className={styles.up}>{signed(money.merch)}</span></>}
            {money.events !== 0 && <><span>Eventos</span><span className={money.events > 0 ? styles.up : styles.down}>{signed(money.events)}</span></>}
            <span>Salários</span><span className={styles.down}>{signed(-money.wages)}</span>
            {money.opex > 0 && <><span>Estrutura</span><span className={styles.down}>{signed(-money.opex)}</span></>}
          </div>

          {summary.others.length > 0 && (
            <>
              <div className={styles.sectionTitle}>Outros jogos</div>
              <div className={styles.others}>
                {summary.others.map((o, i) => (
                  <div key={i} className={styles.otherRow}>
                    <span className={styles.otherHome}>{o.home}</span>
                    <span className={styles.otherScore}>{o.homeScore}–{o.awayScore}</span>
                    <span className={styles.otherAway}>{o.away}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <button className={styles.continue} onClick={onClose} autoFocus>Continuar</button>
      </div>
    </div>
  );
}
