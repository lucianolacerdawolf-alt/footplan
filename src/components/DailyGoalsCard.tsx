import { useId, useMemo, useState } from 'react';
import { remindersSupported, remindersEnabled, setRemindersEnabled } from '../services/reminders';
import { goalsFor, loadDaily, isComplete, nextStreakReward } from '../engine/dailyGoals';
import { Icon } from './ui';
import styles from './DailyGoalsCard.module.css';

/**
 * Metas do dia na tela inicial — lê do localStorage a cada render da Home.
 * Começa recolhido numa linha de resumo (progresso + sequência) pra não poluir a
 * Home; ao tocar, abre a lista completa.
 */
export default function DailyGoalsCard() {
  const state = useMemo(() => loadDaily(), []);
  const goals = goalsFor(state.date);
  const done = isComplete(state);
  const [reminderOn, setReminderOn] = useState(remindersEnabled);
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const completed = goals.filter(g => (state.progress[g.metric] ?? 0) >= g.target).length;
  const pct = goals.length === 0
    ? 0
    : Math.round((goals.reduce((sum, g) => sum + Math.min(g.target, state.progress[g.metric] ?? 0) / g.target, 0) / goals.length) * 100);
  const next = nextStreakReward(state.streak);

  return (
    <section className={styles.card} aria-label="Metas de hoje">
      <button className={styles.summary} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={panelId}>
        <span className={styles.title}>🎯 Metas de hoje</span>
        <span className={`${styles.bar} ${done ? styles.barDone : ''}`} aria-hidden="true">
          <span className={styles.barFill} style={{ width: `${pct}%` }} />
        </span>
        <span className={`${styles.total} ${done ? styles.totalDone : ''}`}>{completed}/{goals.length}</span>
        {state.streak > 0 && (
          <span className={styles.streak} title="Dias seguidos com as 3 metas completas">🔥 {state.streak}</span>
        )}
        <Icon name="chevron-right" size={16} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
      </button>

      {open && (
        <div id={panelId} className={styles.panel}>
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
          {next && <p className={styles.reward}>Próxima conquista: {next.days} dias seguidos ({state.streak}/{next.days})</p>}
          {remindersSupported() && (
            <label className={styles.reminder}>
              <input type="checkbox" checked={reminderOn}
                onChange={e => { setReminderOn(e.target.checked); void setRemindersEnabled(e.target.checked); }} />
              Lembrete diário às 19h
            </label>
          )}
        </div>
      )}
    </section>
  );
}
