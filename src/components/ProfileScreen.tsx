import { ScreenHeader, Icon, StatTile } from './ui';
import { crestSrc } from '../utils/crest';
import styles from './ProfileScreen.module.css';

// =============================================================================
// Perfil — quem é o técnico e o que ele já fez
// =============================================================================
// Junta números que estavam espalhados (carreira, conquistas, histórico de partidas,
// sequência das metas do dia) numa tela só, aberta pelo bonequinho da tela inicial.

export interface ProfileCareer {
  managerName: string;
  reputation: number;
  teamName: string;
  teamCrest?: string;
  leagueName: string;
  seasonYear: number;
  seasonsDone: number;
  leagueTitles: number;
  cupTitles: number;
  bestFinish: number | null;
}

interface Props {
  onBack: () => void;
  career: ProfileCareer | null;
  matchesPlayed: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  dailyStreak: number;
  cloudBackup: boolean;
  onAchievements: () => void;
}

export default function ProfileScreen({ onBack, career, matchesPlayed, achievementsUnlocked, achievementsTotal, dailyStreak, cloudBackup, onAchievements }: Props) {
  const name = career?.managerName || 'Técnico';
  return (
    <div className={`${styles.screen} app-screen`}>
      <ScreenHeader onBack={onBack} title="Perfil" />

      <section className={styles.hero}>
        <span className={styles.avatar} aria-hidden="true"><Icon name="user" size={40} /></span>
        <div className={styles.heroText}>
          <h2 className={styles.name}>{name}</h2>
          {career ? (
            <span className={styles.sub}>
              <Icon name="star" size={13} /> Reputação {career.reputation}
            </span>
          ) : (
            <span className={styles.sub}>Comece uma carreira pra ganhar reputação.</span>
          )}
        </div>
      </section>

      {career && (
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Carreira</h3>
          <div className={styles.club}>
            <img src={crestSrc(career.teamCrest)} alt="" className={styles.crest} />
            <div className={styles.clubText}>
              <strong>{career.teamName}</strong>
              <span>{career.leagueName} · Temporada {career.seasonYear}</span>
            </div>
          </div>
          <div className={styles.grid}>
            <StatTile label="Temporadas" value={career.seasonsDone} />
            <StatTile label="Títulos da liga" value={career.leagueTitles} />
            <StatTile label="Copas" value={career.cupTitles} />
            <StatTile label="Melhor posição" value={career.bestFinish != null ? `${career.bestFinish}º` : '—'} />
          </div>
        </section>
      )}

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Geral</h3>
        <div className={styles.grid}>
          <StatTile label="Partidas" value={matchesPlayed} />
          <StatTile label="Sequência de metas" value={`${dailyStreak} ${dailyStreak === 1 ? 'dia' : 'dias'}`} />
        </div>
        <button type="button" className={styles.linkRow} onClick={onAchievements}>
          <Icon name="medal" size={18} />
          <span className={styles.linkText}>Conquistas</span>
          <span className={styles.linkValue}>{achievementsUnlocked}/{achievementsTotal}</span>
          <Icon name="chevron-right" size={16} />
        </button>
      </section>

      <p className={styles.note}>
        {cloudBackup
          ? 'Seu progresso fica salvo neste aparelho, com uma cópia anônima na nuvem.'
          : 'Seu progresso fica salvo neste aparelho.'}
      </p>
    </div>
  );
}
