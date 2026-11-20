import type { TrainingChoice } from '../engine/training';
import { TRAINING_PRESETS } from '../engine/training';
import { responseEffectLabel, type PressConferenceQuestion } from '../engine/pressConference';
import { useModalFocus } from '../hooks/useModalFocus';
import styles from './PreMatchPrepCard.module.css';

interface Props {
  trainingDone: boolean;
  pressDone: boolean;
  opponentName: string;
  onTraining: (choice: TrainingChoice) => void;
  onOpenPress: () => void;
  pressQuestion: PressConferenceQuestion | null;
  /** Jogo grande: a coletiva tem 2 perguntas. */
  bigGame?: boolean;
  pressStep?: { index: number; total: number } | null;
  onAnswerPress: (choiceIdx: number) => void;
  onClosePress: () => void;
}

const CHOICES: TrainingChoice[] = ['intense', 'light', 'rest'];

export default function PreMatchPrepCard({
  trainingDone, pressDone, opponentName, bigGame, pressStep,
  onTraining, onOpenPress, pressQuestion, onAnswerPress, onClosePress,
}: Props) {
  const pressModalRef = useModalFocus<HTMLDivElement>(!!pressQuestion, onClosePress);

  // Tudo feito: vira uma linha só, liberando a altura da tela pras mensagens.
  if (trainingDone && pressDone && !pressQuestion) {
    return (
      <div className={`${styles.card} ${styles.cardDone}`} role="status">
        <div className={styles.title}>
          <span>Preparação</span>
          <span className={styles.status}>✓ Treino · ✓ Coletiva — pronto pro jogo</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.title}>
        <span>Preparação</span>
        <span className={styles.status}>
          {trainingDone ? '✓ Treino' : 'Treino pendente'} · {pressDone ? '✓ Coletiva' : 'Coletiva pendente'}
        </span>
      </div>
      <div className={styles.trainRow}>
        {CHOICES.map(choice => {
          const preset = TRAINING_PRESETS[choice];
          return (
            <button
              key={choice}
              className={styles.trainBtn}
              disabled={trainingDone}
              onClick={() => onTraining(choice)}
              title={`${preset.description} (moral ${preset.moraleDelta > 0 ? '+' : ''}${preset.moraleDelta}, fadiga ${preset.fatigueDelta > 0 ? '+' : ''}${preset.fatigueDelta})`}
            >
              <span className={styles.trainLabel}>{preset.label}</span>
              {/* Por extenso e com cor de bom/ruim: "⚡+25" lia como energia, mas é fadiga. */}
              <span className={preset.fatigueDelta > 0 ? styles.effectBad : styles.effectGood}>
                Fadiga {preset.fatigueDelta > 0 ? '+' : ''}{preset.fatigueDelta}
              </span>
              <span className={preset.moraleDelta >= 0 ? styles.effectGood : styles.effectBad}>
                Moral {preset.moraleDelta > 0 ? '+' : ''}{preset.moraleDelta}
              </span>
            </button>
          );
        })}
        <button
          className={`${styles.trainBtn} ${styles.pressBtn}`}
          disabled={pressDone}
          onClick={onOpenPress}
          title={`Fale com a imprensa antes de enfrentar ${opponentName}`}
        >
          <span className={styles.trainLabel}>🎤 Coletiva</span>
          <span className={styles.effectNeutral}>{pressDone ? 'Feita' : bigGame ? 'Jogo grande' : 'Moral ±'}</span>
        </button>
      </div>

      {pressQuestion && (
        <div className={styles.overlay} onClick={onClosePress} role="presentation">
          <div ref={pressModalRef} className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="press-title">
            <button className={styles.closeBtn} onClick={onClosePress} aria-label="Fechar coletiva">Pular ✕</button>
            <div className={styles.modalIcon} aria-hidden="true">🎤</div>
            <div className={styles.modalTitle} id="press-title">Coletiva de Imprensa</div>
            {pressStep && pressStep.total > 1 && (
              <div className={styles.modalStep}>Jogo grande · pergunta {pressStep.index} de {pressStep.total}</div>
            )}
            <div className={styles.modalQuestion}>{pressQuestion.question}</div>
            <div className={styles.modalOptions}>
              {pressQuestion.responses.map((r, idx) => (
                <button key={idx} className={styles.modalOption} onClick={() => onAnswerPress(idx)}>
                  {r.label}
                  <span className={styles.modalDelta}>{responseEffectLabel(r)}</span>
                </button>
              ))}
            </div>
            <div className={styles.modalHint}>Prometer vitória cobra no resultado: ganhar sobe a confiança da diretoria, perder derruba.</div>
          </div>
        </div>
      )}
    </div>
  );
}
