import type { ClubFinances } from '../engine/career';
import { formatMoney } from '../utils/formatMoney';
import styles from './FinancePanel.module.css';

interface Props {
  finances: ClubFinances;
  sponsorLabel?: string;
  sponsorName?: string;
  /** Renda de bilheteria por jogo em casa (valor fixo da liga) — exibida como
   *  informação, não entra no saldo semanal (é por partida, não semanal). */
  ticketRevenue?: number;
}

export default function FinancePanel({ finances, sponsorLabel, sponsorName, ticketRevenue }: Props) {
  const net = finances.weeklyIncome - finances.wageBill + (finances.merchRevenue ?? 0);

  return (
    <div className={styles.panel}>
      <div className={styles.topRow}>
        <div className={styles.item}>
          <span className={styles.label}>💰 Orçamento</span>
          <span className={styles.value}>{formatMoney(finances.budget)}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>👔 Salários</span>
          <span className={styles.value}>{formatMoney(finances.wageBill)}/sem</span>
        </div>
      </div>

      <div className={styles.breakdown}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>📋 Patrocínio{sponsorLabel ? ` (${sponsorLabel})` : ''}</span>
          <span className={styles.rowValue} style={{ color: '#0ea5e9' }}>+{formatMoney(finances.weeklyIncome)}</span>
        </div>
        {sponsorName && (
          <div className={styles.rowSub}>👕 {sponsorName}</div>
        )}
        {ticketRevenue != null && ticketRevenue > 0 && (
          <div className={styles.row}>
            <span className={styles.rowLabel}>🎟️ Bilheteria</span>
            <span className={styles.rowValue} style={{ color: '#22c55e' }}>+{formatMoney(ticketRevenue)}/jogo em casa</span>
          </div>
        )}
        {finances.merchRevenue != null && finances.merchRevenue > 0 && (
          <div className={styles.row}>
            <span className={styles.rowLabel}>👕 Merchandising</span>
            <span className={styles.rowValue} style={{ color: '#22c55e' }}>+{formatMoney(finances.merchRevenue)}</span>
          </div>
        )}
        <div className={styles.row}>
          <span className={styles.rowLabel}>👔 Salários</span>
          <span className={styles.rowValue} style={{ color: '#ef4444' }}>-{formatMoney(finances.wageBill)}</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.row}>
          <span className={styles.rowLabel}>📈 Saldo Semanal</span>
          <span className={styles.rowValue} style={{ color: net >= 0 ? '#22c55e' : '#ef4444', fontWeight: 800 }}>
            {net >= 0 ? '+' : ''}{formatMoney(net)}
          </span>
        </div>
      </div>
    </div>
  );
}
