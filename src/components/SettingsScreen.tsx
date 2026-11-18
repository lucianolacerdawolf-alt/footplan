import { useState } from 'react';
import type { Difficulty } from '../engine/matchConfig';
import { getDifficultyLabel } from '../engine/matchConfig';
import { remindersSupported, remindersEnabled, setRemindersEnabled } from '../services/reminders';
import { ScreenHeader, Button } from './ui';
import { clearAllGameData } from '../utils/clearGameData';
import styles from './SettingsScreen.module.css';

// =============================================================================
// Configurações — tudo que é preferência do jogador num lugar só
// =============================================================================
// Antes a dificuldade ficava solta na tela inicial e o lembrete dentro do card de
// metas. Aqui: partidas (dificuldade, velocidade padrão), notificações, ajuda,
// dados e sobre.

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
const DIFFICULTY_HINT: Record<Difficulty, string> = {
  easy: 'Adversários mais fracos — bom pra aprender.',
  normal: 'Equilíbrio entre os times, como no futebol real.',
  hard: 'CPU mais forte e menos margem pra erro.',
};
const SPEEDS = [1, 2, 3, 4];
const SPEED_KEY = 'fp:replaySpeed';
const TUTORIAL_KEY = 'fp:tutorialSeen';

function readSpeed(): number {
  try { return Number(localStorage.getItem(SPEED_KEY)) || 1; } catch { return 1; }
}

interface Props {
  difficulty: Difficulty;
  onSetDifficulty: (d: Difficulty) => void;
  onBack: () => void;
}

export default function SettingsScreen({ difficulty, onSetDifficulty, onBack }: Props) {
  const [speed, setSpeed] = useState(readSpeed);
  const [reminderOn, setReminderOn] = useState(remindersEnabled);
  const [tutorialReset, setTutorialReset] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const pickDifficulty = (d: Difficulty) => {
    onSetDifficulty(d);
    try { localStorage.setItem('fp:difficulty', d); } catch { /* noop */ }
  };
  const pickSpeed = (s: number) => {
    setSpeed(s);
    try { localStorage.setItem(SPEED_KEY, String(s)); } catch { /* noop */ }
  };

  return (
    <div className={`${styles.screen} app-screen`}>
      <ScreenHeader onBack={onBack} title="Configurações" />

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Partidas</h2>
        <div className={styles.row}>
          <span className={styles.label}>Dificuldade</span>
          <div className={styles.segmented} role="radiogroup" aria-label="Dificuldade das partidas">
            {DIFFICULTIES.map(d => (
              <button key={d} type="button" role="radio" aria-checked={d === difficulty}
                className={`${styles.seg} ${d === difficulty ? styles.segOn : ''}`} onClick={() => pickDifficulty(d)}>
                {getDifficultyLabel(d)}
              </button>
            ))}
          </div>
          <p className={styles.hint}>{DIFFICULTY_HINT[difficulty]}</p>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Velocidade padrão da partida ao vivo</span>
          <div className={styles.segmented} role="radiogroup" aria-label="Velocidade padrão">
            {SPEEDS.map(s => (
              <button key={s} type="button" role="radio" aria-checked={s === speed}
                className={`${styles.seg} ${s === speed ? styles.segOn : ''}`} onClick={() => pickSpeed(s)}>
                {s}x
              </button>
            ))}
          </div>
        </div>
      </section>

      {remindersSupported() && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Notificações</h2>
          <label className={styles.toggleRow}>
            <span>
              <span className={styles.label}>Lembretes</span>
              <span className={styles.hint}>Metas do dia às 19h e rodada nova da Liga entre Amigos.</span>
            </span>
            <input type="checkbox" className={styles.switch} checked={reminderOn}
              onChange={e => { setReminderOn(e.target.checked); void setRemindersEnabled(e.target.checked); }} />
          </label>
        </section>
      )}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Ajuda</h2>
        <div className={styles.actionRow}>
          <span className={styles.hint}>
            {tutorialReset ? 'Pronto — o tutorial aparece na próxima tela de táticas.' : 'Mostra de novo as dicas da tela de táticas.'}
          </span>
          <Button size="sm" variant="secondary" disabled={tutorialReset}
            onClick={() => { try { localStorage.removeItem(TUTORIAL_KEY); } catch { /* noop */ } setTutorialReset(true); }}>
            Ver tutorial
          </Button>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Dados</h2>
        <p className={styles.hint}>
          Apaga carreira, campeonatos, conquistas, histórico e preferências salvos neste aparelho. Não dá pra desfazer.
        </p>
        {confirmWipe ? (
          <div className={styles.confirm}>
            <strong>Apagar tudo mesmo?</strong>
            <div className={styles.confirmBtns}>
              <Button size="sm" variant="secondary" onClick={() => setConfirmWipe(false)}>Cancelar</Button>
              <Button size="sm" variant="danger" onClick={() => { clearAllGameData(); window.location.reload(); }}>Apagar tudo</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="danger" onClick={() => setConfirmWipe(true)}>Apagar dados do jogo</Button>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Sobre</h2>
        <div className={styles.about}>
          <span>FootPlan v{__APP_VERSION__}</span>
          <nav className={styles.links}>
            <a href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noopener noreferrer">Privacidade</a>
            <a href={`${import.meta.env.BASE_URL}terms.html`} target="_blank" rel="noopener noreferrer">Termos</a>
          </nav>
        </div>
      </section>
    </div>
  );
}
