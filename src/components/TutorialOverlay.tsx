import { useState, useRef, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';


interface Props {
  onClose: () => void;
}

// Antes eram as 7 explicações táticas (até escanteio e falta, que nem aparecem nesta
// tela) antes do primeiro jogo. Agora: o essencial pra jogar, no que está na tela.
// O detalhe de cada ajuste continua no "?" ao lado de cada um (aba Estilo).
const STEPS = [
  { icon: '⚽', title: 'Escalação', body: 'Os botões no topo trocam a formação. Toque num titular no campinho pra trocar por um reserva da mesma posição.' },
  { icon: '🧠', title: 'Estilo', body: 'Na aba Estilo, Ofensivo, Equilibrado ou Defensivo já resolvem. Quer ajustar fino? Cada opção tem um "?" explicando.' },
  { icon: '⏱️', title: 'Durante o jogo', body: 'Jogando ao vivo, você muda a tática e faz substituições no intervalo e nas pausas. "Simular" pula direto pro resultado.' },
];

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
