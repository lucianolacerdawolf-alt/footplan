import type { Difficulty } from '../engine/matchConfig';
import { getDifficultyLabel } from '../engine/matchConfig';
import styles from './HomeScreen.module.css';
import DailyGoalsCard from './DailyGoalsCard';
import { crestSrc } from '../utils/crest';
import { Icon } from './ui';

export interface CareerResume {
  teamName: string;
  crest?: string;
  /** Ex.: "Premier League · Temporada 1 · Rodada 4" */
  detail: string;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

interface Props {
  onSingleMatch: () => void;
  onQuickPlay: () => void;
  onLeague: () => void;
  onCareer: () => void;
  onCup: () => void;
  onAchievements: () => void;
  onOnline: () => void;
  onFriendLeague?: () => void;
  difficulty: Difficulty;
  onSetDifficulty: (d: Difficulty) => void;
  /** Carreira salva: vira o card de destaque no topo. */
  careerResume?: CareerResume | null;
}

export default function HomeScreen({ onSingleMatch, onQuickPlay, onLeague, onCareer, onCup, onAchievements, onOnline, onFriendLeague, difficulty, onSetDifficulty, careerResume }: Props) {
  return (
    <div className={`${styles.screen} app-screen`}>
      <header className={styles.header}>
        <h1 className={styles.title}>FootPlan</h1>
        <span className={styles.titleLine} />
        <p className={styles.subtitle}>Simulador Tático</p>
      </header>

      {careerResume && (
        <button className={styles.resumeCard} onClick={onCareer}>
          <img src={crestSrc(careerResume.crest)} alt="" className={styles.resumeCrest} />
          <div className={styles.modeText}>
            <span className={styles.resumeKicker}>Continuar carreira</span>
            <span className={styles.resumeTeam}>{careerResume.teamName}</span>
            <span className={styles.modeDesc}>{careerResume.detail}</span>
          </div>
          <span className={styles.resumePlay} aria-hidden="true">▶</span>
        </button>
      )}

      <DailyGoalsCard />

      <div className={styles.modes}>
        <button className={`${styles.modeCard} ${styles.quickPlayCard}`} onClick={onQuickPlay}>
          <span className={styles.modeIcon} aria-hidden="true"><Icon name="bolt" size={26} /></span>
          <div className={styles.modeText}>
            <span className={styles.modeName}>Jogo Rápido</span>
            <span className={styles.modeDesc}>Times aleatórios, táticas padrão — vai direto pro jogo</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>

        <button className={styles.modeCard} onClick={onOnline}>
          <span className={styles.modeIcon} aria-hidden="true"><Icon name="globe" size={26} /></span>
          <div className={styles.modeText}>
            <span className={styles.modeName}>Jogar Online</span>
            <span className={styles.modeDesc}>Jogue ao vivo com um amigo pelo código da sala</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>

        {onFriendLeague && (
          <button className={styles.modeCard} onClick={onFriendLeague}>
            <span className={styles.modeIcon} aria-hidden="true"><Icon name="users" size={26} /></span>
            <div className={styles.modeText}>
              <span className={styles.modeName}>Liga entre Amigos</span>
              <span className={styles.modeDesc}>Cada um comanda um clube · uma rodada por dia</span>
            </div>
            <span className={styles.modeArrow}>›</span>
          </button>
        )}

        <button className={styles.modeCard} onClick={onSingleMatch}>
          <span className={styles.modeIcon} aria-hidden="true"><Icon name="ball" size={26} /></span>
          <div className={styles.modeText}>
            <span className={styles.modeName}>Partida Única</span>
            <span className={styles.modeDesc}>Escolha dois times e simule uma partida amistosa</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>

        <button className={styles.modeCard} onClick={onLeague}>
          <span className={styles.modeIcon} aria-hidden="true"><Icon name="calendar" size={26} /></span>
          <div className={styles.modeText}>
            <span className={styles.modeName}>Campeonatos</span>
            <span className={styles.modeDesc}>Pontos corridos com o campeonato que você escolher</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>

        <button className={styles.modeCard} onClick={onCareer}>
          <span className={styles.modeIcon} aria-hidden="true"><Icon name="manager" size={26} /></span>
          <div className={styles.modeText}>
            <span className={styles.modeName}>Modo Carreira</span>
            <span className={styles.modeDesc}>{careerResume ? `Sua carreira com o ${careerResume.teamName}` : 'Progrida por temporadas com seu elenco, transferências e reputação de técnico'}</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>

        <button className={styles.modeCard} onClick={onCup}>
          <span className={styles.modeIcon} aria-hidden="true"><Icon name="trophy" size={26} /></span>
          <div className={styles.modeText}>
            <span className={styles.modeName}>Copas</span>
            <span className={styles.modeDesc}>Mata-mata · prorrogação e pênaltis</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>

        <button className={styles.modeCard} onClick={onAchievements}>
          <span className={styles.modeIcon} aria-hidden="true"><Icon name="medal" size={26} /></span>
          <div className={styles.modeText}>
            <span className={styles.modeName}>Conquistas</span>
            <span className={styles.modeDesc}>Veja as conquistas desbloqueadas e as que faltam</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>
      </div>

      <div className={styles.difficultyBar}>
        <span className={styles.difficultyLabel}>Dificuldade</span>
        <div className={styles.difficultyBtns}>
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              className={`${styles.diffBtn} ${d === difficulty ? styles.diffActive : ''}`}
              onClick={() => {
                onSetDifficulty(d);
                try { localStorage.setItem('fp:difficulty', d); } catch {}
              }}
            >
              {getDifficultyLabel(d)}
            </button>
          ))}
        </div>
      </div>

      <footer className={styles.footer}>
        <span className={styles.version}>v{__APP_VERSION__}</span>
        <nav className={styles.legalLinks}>
          <a href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noopener noreferrer">Privacidade</a>
          <span className={styles.legalSep}>·</span>
          <a href={`${import.meta.env.BASE_URL}terms.html`} target="_blank" rel="noopener noreferrer">Termos</a>
        </nav>
      </footer>
    </div>
  );
}
