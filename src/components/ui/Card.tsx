import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** Borda de acento pra cartões de ação principal. */
  accent?: boolean;
  /** Menos padding, pra listas densas. */
  compact?: boolean;
}

/** Superfície/cartão base do app. Ver Card.module.css. */
export default function Card({ accent = false, compact = false, className = '', children, ...rest }: Props) {
  const cls = [styles.card, accent ? styles.accent : '', compact ? styles.compact : '', className]
    .filter(Boolean).join(' ');
  return <div className={cls} {...rest}>{children}</div>;
}
