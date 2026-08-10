import styles from './StatTile.module.css';

export type StatTone = 'default' | 'win' | 'draw' | 'loss' | 'positive' | 'negative';

interface Props {
  value: React.ReactNode;
  label: string;
  tone?: StatTone;
  className?: string;
}

/** Célula de estatística (valor grande + rótulo). Ver StatTile.module.css. */
export default function StatTile({ value, label, tone = 'default', className = '' }: Props) {
  const toneCls = tone !== 'default' ? styles[tone] : '';
  return (
    <div className={[styles.tile, className].filter(Boolean).join(' ')}>
      <span className={[styles.value, toneCls].filter(Boolean).join(' ')}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
