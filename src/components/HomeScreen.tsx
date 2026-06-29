import type { LeagueDefinition } from '../data/leagues/types';
import styles from './HomeScreen.module.css';

interface Props {
  onSingleMatch: () => void;
  onLeague: () => void;
  onCup: () => void;
  onAchievements: () => void;
  onOnline: () => void;
  selectedLeague: LeagueDefinition | null;
  onChangeLeague: () => void;
}

export default function HomeScreen({ onSingleMatch, onLeague, onCup, onAchievements, onOnline, selectedLeague, onChangeLeague }: Props) {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>FootPlan</h1>
        <p className={styles.subtitle}>
          Simulador Tático{selectedLeague ? ` · ${selectedLeague.flag} ${selectedLeague.name}` : ''}
        </p>
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

        {selectedLeague && (
          <button
            onClick={onChangeLeague}
            style={{
              margin: '6px auto 0', padding: '4px 12px', fontSize: '0.75rem',
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            {selectedLeague.flag} Trocar Liga
          </button>
        )}

        <button className={styles.modeCard} onClick={onLeague}>
          <span className={styles.modeIcon}>📅</span>
          <div className={styles.modeText}>
            <span className={styles.modeName}>{selectedLeague ? selectedLeague.name : 'Liga'}</span>
            <span className={styles.modeDesc}>
              {selectedLeague
                ? `Pontos corridos · ${selectedLeague.totalRounds} rodadas · ${selectedLeague.teams.length} times`
                : 'Escolha uma liga primeiro'}
            </span>
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
