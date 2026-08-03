import type { TrainingChoice } from '../engine/training';
import { TRAINING_PRESETS } from '../engine/training';
import type { PressConferenceQuestion } from '../engine/pressConference';
import styles from './PreMatchPrepCard.module.css';

interface Props {
  trainingDone: boolean;
  pressDone: boolean;
  opponentName: string;
  onTraining: (choice: TrainingChoice) => void;
  onOpenPress: () => void;
  pressQuestion: PressConferenceQuestion | null;
  onAnswerPress: (choiceIdx: number) => void;
  onClosePress: () => void;
}

const CHOICES: TrainingChoice[] = ['intense', 'light', 'rest'];

export default function PreMatchPrepCard({
  trainingDone, pressDone, opponentName,
  onTraining, onOpenPress, pressQuestion, onAnswerPress, onClosePress,
}: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.title}>🎙️ Preparação Pré-Jogo</div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>
          Treino · {trainingDone ? '✓ Feito' : 'Escolha como preparar o elenco'}
        </div>
        <div className={styles.trainRow}>
          {CHOICES.map(choice => {
            const preset = TRAINING_PRESETS[choice];
            const selected = trainingDone && choice === 'intense' ? false : false;
            void selected;
            return (
              <button
                key={choice}
                className={styles.trainBtn}
                disabled={trainingDone}
                onClick={() => onTraining(choice)}
                title={`${preset.description} (moral ${preset.moraleDelta > 0 ? '+' : ''}${preset.moraleDelta}, fadiga ${preset.fatigueDelta > 0 ? '+' : ''}${preset.fatigueDelta})`}
              >
                <span className={styles.trainLabel}>{preset.label}</span>
                <span className={styles.trainEffect}>
                  ⚡{preset.fatigueDelta > 0 ? '+' : ''}{preset.fatigueDelta} · 😊{preset.moraleDelta > 0 ? '+' : ''}{preset.moraleDelta}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>
          Coletiva de Imprensa · {pressDone ? '✓ Feita' : `Fale com a imprensa antes de enfrentar ${opponentName}`}
        </div>
        <button className={styles.pressBtn} disabled={pressDone} onClick={onOpenPress}>
          🎤 Conceder Coletiva {pressDone ? '(já feita)' : '→'}
        </button>
      </div>

      {pressQuestion && (
        <div className={styles.overlay} onClick={onClosePress} role="presentation">
          <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="press-title">
            <button className={styles.closeBtn} onClick={onClosePress} aria-label="Fechar coletiva">Pular ✕</button>
            <div className={styles.modalIcon} aria-hidden="true">🎤</div>
            <div className={styles.modalTitle} id="press-title">Coletiva de Imprensa</div>
            <div className={styles.modalQuestion}>{pressQuestion.question}</div>
            <div className={styles.modalOptions}>
              {pressQuestion.responses.map((r, idx) => (
                <button key={idx} className={styles.modalOption} onClick={() => onAnswerPress(idx)}>
                  {r.label}
                  <span className={styles.modalDelta}>
                    {r.moraleDelta > 0 ? '+' : ''}{r.moraleDelta} moral
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
