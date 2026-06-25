import styles from './HomeScreen.module.css';

interface Props {
  onSingleMatch: () => void;
  onLeague: () => void;
  onCup: () => void;
}

export default function HomeScreen({ onSingleMatch, onLeague, onCup }: Props) {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>FootPlan</h1>
        <p className={styles.subtitle}>Simulador Tático · Premier League 2025/26</p>
      </header>

      <div className={styles.modes}>
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
            <span className={styles.modeName}>Premier League</span>
            <span className={styles.modeDesc}>Pontos corridos · 38 rodadas · todos os 20 times</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>

        <button className={styles.modeCard} onClick={onCup}>
          <span className={styles.modeIcon}>🏆</span>
          <div className={styles.modeText}>
            <span className={styles.modeName}>FA Cup</span>
            <span className={styles.modeDesc}>Mata-mata · 8 times · prorrogação e pênaltis</span>
          </div>
          <span className={styles.modeArrow}>›</span>
        </button>
      </div>
    </div>
  );
}
