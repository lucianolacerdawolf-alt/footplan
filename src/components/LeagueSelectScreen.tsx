import type { LeagueDefinition } from '../data/leagues/types';
import { allLeagues } from '../data/leagues';
import styles from './LeagueSelectScreen.module.css';

const LEAGUE_ORDER: Record<string, number> = {
  pl: 0, championship: 1,
  laliga: 2, laliga2: 3,
  bundesliga: 4, bundesliga2: 5,
  serieA: 6, serieB: 7,
  ligue1: 8, ligue2: 9,
  ligaPortugal: 10, ligaPortugal2: 11,
};

export interface ResumableSave {
  type: 'league' | 'bracket';
  league: LeagueDefinition;
  label: string;
}

interface Props {
  onSelect: (league: LeagueDefinition) => void;
  selectedLeague?: LeagueDefinition | null;
  onBack?: () => void;
  /** Jogos salvos (liga/copa) prontos pra retomar, em qualquer liga — independente de
   *  como o usuário chegou nessa tela ou de qual card ele vai clicar em seguida. */
  resumable?: ResumableSave[];
  onResume?: (save: ResumableSave) => void;
  /** Quando true, exibe subtítulo específico do Modo Carreira em vez de "Escolha seu campeonato". */
  isCareer?: boolean;
}

export default function LeagueSelectScreen({ onSelect, selectedLeague, onBack, resumable, onResume, isCareer = false }: Props) {
  return (
    <div className={`${styles.screen} app-screen`}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          {onBack && (
            <button className={styles.backBtn} onClick={onBack}>←</button>
          )}
          <div className={styles.logo}>FootPlan</div>
        </div>
        <p className={styles.subtitle}>{isCareer ? 'Escolha a liga da sua carreira' : 'Escolha seu campeonato'}</p>
      </header>

      {resumable && resumable.length > 0 && onResume && (
        <div className={styles.resumeBanner}>
          {resumable.map((save) => (
            <button
              key={`${save.type}-${save.league.id}`}
              className={styles.resumeBannerBtn}
              style={{ '--lc': save.league.color } as React.CSSProperties}
              onClick={() => onResume(save)}
            >
              <span className={styles.resumeBannerIcon} aria-hidden="true">{save.type === 'league' ? '📅' : '🏆'}</span>
              <span className={styles.resumeBannerText}>Continuar · {save.label}</span>
              <span className={styles.resumeBannerArrow} aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.grid}>
        {[...allLeagues].sort((a, b) => (LEAGUE_ORDER[a.id] ?? 99) - (LEAGUE_ORDER[b.id] ?? 99)).map(league => {
          const isSelected = selectedLeague?.id === league.id;
          return (
            <button
              key={league.id}
              className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
              style={{ '--lc': league.color } as React.CSSProperties}
              onClick={() => onSelect(league)}
            >
              <div className={styles.cardStripe}>
                {isSelected && <span className={styles.check}>✓ Ativo</span>}
              </div>
              <div className={styles.cardBody}>
                <img
                  src={league.logo}
                  alt={league.name}
                  className={styles.badge}
                />
                <div className={styles.leagueName}>{league.name}</div>
                <div className={styles.stats}>
                  <span className={styles.pill}>{league.teams.length} times</span>
                  <span className={styles.pill}>{league.totalRounds} rodadas</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
