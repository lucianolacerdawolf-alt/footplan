import type { ClubFinances } from '../engine/career';
import { formatMoney } from '../utils/formatMoney';
import styles from './FinancePanel.module.css';

interface Props {
  finances: ClubFinances;
}

export default function FinancePanel({ finances }: Props) {
  const net = finances.weeklyIncome - finances.wageBill;
  return (
    <div className={styles.panel}>
      <div className={styles.item}>
        <span className={styles.label}>💰 Orçamento</span>
        <span className={styles.value}>{formatMoney(finances.budget)}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>👔 Folha Salarial</span>
        <span className={styles.value}>{formatMoney(finances.wageBill)}/sem</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>📈 Saldo Semanal</span>
        <span className={styles.value} style={{ color: net >= 0 ? '#22c55e' : '#ef4444' }}>
          {net >= 0 ? '+' : ''}{formatMoney(net)}
        </span>
      </div>
    </div>
  );
}
