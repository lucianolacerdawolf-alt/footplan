import styles from './AchievementsScreen.module.css';

interface AchievementItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  hint: string;
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

export default function AchievementsScreen({ achievements, onBack }: Props) {
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const total = achievements.length;

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

      <div className={styles.grid}>
        {achievements.map(ach => (
          <div
            key={ach.id}
            className={`${styles.card} ${ach.unlocked ? styles.unlocked : styles.locked}`}
          >
            <span className={styles.icon} aria-hidden="true">{ach.icon}</span>
            <div className={styles.info}>
              <span className={styles.name}>{ach.name}</span>
              <span className={styles.desc}>
                {ach.unlocked ? ach.description : '???'}
              </span>
              {ach.unlocked && ach.unlockedAt && (
                <span className={styles.date}>{formatDate(ach.unlockedAt)}</span>
              )}
            </div>
            {ach.unlocked && <span className={styles.check} aria-label="Desbloqueado">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
