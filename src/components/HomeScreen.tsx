import type { Difficulty } from '../engine/matchConfig';
import { getDifficultyLabel } from '../engine/matchConfig';
import styles from './HomeScreen.module.css';

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

interface Props {
  onSingleMatch: () => void;
  onQuickPlay: () => void;
  onLeague: () => void;
  onCareer: () => void;
  onCup: () => void;
  onAchievements: () => void;
  onOnline: () => void;
  difficulty: Difficulty;
  onSetDifficulty: (d: Difficulty) => void;
}

export default function HomeScreen({ onSingleMatch, onQuickPlay, onLeague, onCareer, onCup, onAchievements, onOnline, difficulty, onSetDifficulty }: Props) {
  return (
    <div className={`${styles.screen} app-screen`}>
      <header className={styles.header}>
        <h1 className={styles.title}>FootPlan</h1>
        <span className={styles.titleLine} />
        <p className={styles.subtitle}>Simulador Tático</p>
      </header>

      <div className={styles.modes}>
        <button className={`${styles.modeCard} ${styles.quickPlayCard}`} onClick={onQuickPlay}>
          <span className={styles.modeIcon}>⚡</span>
          <div className={styles.modeText}>
            <span className={styles.modeName}>Jogo Rápido</span>
            <span className={styles.modeDesc}>Times aleatórios, táticas padrão — vai direto pro jogo</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>

        <button className={styles.modeCard} onClick={onOnline}>
          <span className={styles.modeIcon}>🌐</span>
          <div className={styles.modeText}>
            <span className={styles.modeName}>Jogar Online</span>
            <span className={styles.modeDesc}>Convide um amigo e joguem P2P via WebRTC</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>

        <button className={styles.modeCard} onClick={onSingleMatch}>
          <span className={styles.modeIcon}>⚽</span>
          <div className={styles.modeText}>
            <span className={styles.modeName}>Partida Única</span>
            <span className={styles.modeDesc}>Escolha dois times e simule uma partida amistosa</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>

        <button className={styles.modeCard} onClick={onLeague}>
          <span className={styles.modeIcon}>📅</span>
          <div className={styles.modeText}>
            <span className={styles.modeName}>Campeonatos</span>
            <span className={styles.modeDesc}>Pontos corridos com o campeonato que você escolher</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>

        <button className={styles.modeCard} onClick={onCareer}>
          <span className={styles.modeIcon}>👔</span>
          <div className={styles.modeText}>
            <span className={styles.modeName}>Modo Carreira</span>
            <span className={styles.modeDesc}>Progrida por temporadas com seu elenco, transferências e reputação de técnico</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>

        <button className={styles.modeCard} onClick={onCup}>
          <span className={styles.modeIcon}>🏆</span>
          <div className={styles.modeText}>
            <span className={styles.modeName}>Copas</span>
            <span className={styles.modeDesc}>Mata-mata · prorrogação e pênaltis</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>

        <button className={styles.modeCard} onClick={onAchievements}>
          <span className={styles.modeIcon}>🏅</span>
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
