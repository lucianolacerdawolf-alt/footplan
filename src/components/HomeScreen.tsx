import styles from './HomeScreen.module.css';

interface Props {
  onSingleMatch: () => void;
  onLeague: () => void;
  onCareer: () => void;
  onCup: () => void;
  onAchievements: () => void;
  onOnline: () => void;
}

export default function HomeScreen({ onSingleMatch, onLeague, onCareer, onCup, onAchievements, onOnline }: Props) {
  return (
    <div className={`${styles.screen} app-screen`}>
      <header className={styles.header}>
        <h1 className={styles.title}>FootPlan</h1>
        <span className={styles.titleLine} />
        <p className={styles.subtitle}>Simulador Tático</p>
      </header>

      <div className={styles.modes}>
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
    </div>
  );
}
