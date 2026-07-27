import styles from './TopScorersTable.module.css';

interface ScorerEntry {
  name: string;
  goals: number;
  team: string;
}

interface Props {
  scorers: ScorerEntry[];
}

export default function TopScorersTable({ scorers }: Props) {
  if (scorers.length === 0) return null;

  return (
    <div className={styles.block}>
      <div className={styles.title}>👑 Artilheiros</div>
      <div className={styles.list}>
        {scorers.map((s, i) => (
          <div key={i} className={`${styles.row} ${i === 0 ? styles.leader : ''}`}>
            <span className={styles.rank}>{i + 1}</span>
            <span className={styles.name}>{s.name}</span>
            <span className={styles.teamName}>{s.team}</span>
            <span className={styles.goals}>{s.goals}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
