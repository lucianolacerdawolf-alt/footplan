import { useMemo } from 'react';
import type { AchievementCategory } from '../engine/achievements';
import { ACHIEVEMENT_CATEGORY_LABELS } from '../engine/achievements';
import styles from './AchievementsScreen.module.css';

interface AchievementItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  hint: string;
  category: AchievementCategory;
  unlocked: boolean;
  unlockedAt?: number;
}

interface Props {
  achievements: AchievementItem[];
  onBack: () => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Do mais imediato ao mais longo de conquistar. */
const CATEGORY_ORDER: AchievementCategory[] = ['partida', 'campanha', 'disciplina', 'marcos'];

export default function AchievementsScreen({ achievements, onBack }: Props) {
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const total = achievements.length;
  const pct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  const grupos = useMemo(() => CATEGORY_ORDER
    .map(cat => ({ cat, itens: achievements.filter(a => a.category === cat) }))
    .filter(g => g.itens.length > 0), [achievements]);

  return (
    <div className={`${styles.screen} app-screen`}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Voltar">
          ← Voltar
        </button>
        <div className={styles.headerTitle}>
          <h1 className={styles.title}>Conquistas</h1>
          <span className={styles.progress}>{unlockedCount}/{total}</span>
        </div>
      </div>

      {/* A contagem sozinha não dava noção de quanto falta. */}
      <div
        className={styles.overallBar}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% das conquistas desbloqueadas`}
      >
        <div className={styles.overallFill} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.overallLabel}>{pct}% concluído</div>

      {grupos.map(({ cat, itens }) => {
        const feitas = itens.filter(a => a.unlocked).length;
        return (
          <section key={cat} className={styles.categorySection}>
            <h2 className={styles.categoryTitle}>
              {ACHIEVEMENT_CATEGORY_LABELS[cat]}
              <span className={styles.categoryCount}>{feitas}/{itens.length}</span>
            </h2>
            <div className={styles.grid}>
              {itens.map(ach => (
                <div
                  key={ach.id}
                  className={`${styles.card} ${ach.unlocked ? styles.unlocked : styles.locked}`}
                >
                  <span className={styles.icon} aria-hidden="true">{ach.icon}</span>
                  <div className={styles.info}>
                    <span className={styles.name}>{ach.name}</span>
                    {/* Bloqueada mostrava '???', escondendo o que fazer. O campo
                      * `hint` existe justamente pra isso e nunca era usado. */}
                    <span className={styles.desc}>
                      {ach.unlocked ? ach.description : ach.hint}
                    </span>
                    {ach.unlocked && ach.unlockedAt && (
                      <span className={styles.date}>{formatDate(ach.unlockedAt)}</span>
                    )}
                  </div>
                  {ach.unlocked && <span className={styles.check} aria-label="Desbloqueado">✓</span>}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
