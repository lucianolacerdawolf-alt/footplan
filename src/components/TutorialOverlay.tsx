import { useState, useRef, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { TACTIC_EXPLANATIONS } from '../engine/tacticExplanations';

interface Props {
  onClose: () => void;
}

const STEPS = Object.values(TACTIC_EXPLANATIONS);

export default function TutorialOverlay({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const [, setSeen] = useLocalStorage<string>('fp:tutorialSeen', '');
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const handleNext = () => {
    if (isLast) {
      setSeen('1');
      onClose();
    } else {
      setStep(s => s + 1);
    }
  };

  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement;
    skipRef.current?.focus();
    return () => {
      prevFocusRef.current?.focus();
    };
  }, []);

  const handleSkip = () => {
    setSeen('1');
    onClose();
  };

  return (
    <div className="tutorial-overlay" onClick={handleSkip} role="presentation">
      <div className="tutorial-card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
        <button ref={skipRef} className="tutorial-skip" onClick={handleSkip} aria-label="Pular tutorial">Pular ✕</button>
        <div className="tutorial-icon" aria-hidden="true">{current.icon}</div>
        <div className="tutorial-title" id="tutorial-title">{current.title}</div>
        <div className="tutorial-body">{current.body}</div>
        <div className="tutorial-dots" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length} aria-label={`Passo ${step + 1} de ${STEPS.length}`}>
          {STEPS.map((_, i) => (
            <span key={i} className={`tutorial-dot ${i === step ? 'active' : ''}`} aria-hidden="true" />
          ))}
        </div>
        <button className="tutorial-next" onClick={handleNext}>
          {isLast ? 'Começar a jogar' : 'Próximo →'}
        </button>
      </div>
    </div>
  );
}
