import { useMemo } from 'react';
import { goalsFor, loadDaily, isComplete } from '../engine/dailyGoals';
import styles from './DailyGoalsCard.module.css';

/** Metas do dia na tela inicial — lê do localStorage a cada render da Home. */
export default function DailyGoalsCard() {
  const state = useMemo(() => loadDaily(), []);
  const goals = goalsFor(state.date);
  const done = isComplete(state);
  return (
    <section className={styles.card} aria-label="Metas de hoje">
      <div className={styles.head}>
        <span className={styles.title}>🎯 Metas de hoje</span>
        {state.streak > 0 && <span className={styles.streak} title="Dias seguidos com as 3 metas completas">🔥 {state.streak} {state.streak === 1 ? 'dia' : 'dias'}</span>}
      </div>
      <ul className={styles.list}>
        {goals.map(g => {
          const value = Math.min(g.target, state.progress[g.metric] ?? 0);
          const ok = value >= g.target;
          return (
            <li key={g.id} className={ok ? styles.done : undefined}>
              <span className={styles.check} aria-hidden="true">{ok ? '✓' : '○'}</span>
              <span className={styles.label}>{g.label}</span>
              <span className={styles.count}>{value}/{g.target}</span>
            </li>
          );
        })}
      </ul>
      {done && <p className={styles.footer}>Tudo feito hoje! Volte amanhã pra manter a sequência.</p>}
    </section>
  );
}
