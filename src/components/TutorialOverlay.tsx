import { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface Props {
  onClose: () => void;
}

const STEPS = [
  {
    icon: '⚽',
    title: 'Formação',
    body: 'Distribuição dos 10 jogadores de linha: 4-3-3 ataca mais, 5-3-2 defende mais. Mudar formação reorganiza o time automaticamente.',
  },
  {
    icon: '🧠',
    title: 'Mentalidade',
    body: 'Posse de bola controla o ritmo. Pressão alta força erros. Contra-ataque espera o adversário. Retranca segura o resultado.',
  },
  {
    icon: '🔥',
    title: 'Intensidade',
    body: 'Alta cansa rápido mas pressiona mais. Baixa preserva o físico pra reta final. Média é equilibrada.',
  },
  {
    icon: '🛡️',
    title: 'Linha Defensiva',
    body: 'Alta encurta o campo e cria impedimentos, mas deixa espaço atrás. Baixa fecha a área mas convida pressão.',
  },
  {
    icon: '↔️',
    title: 'Amplitude',
    body: 'Estreito concentra jogadores no meio. Amplo usa as pontas. Normal é equilibrado.',
  },
];

export default function TutorialOverlay({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const [, setSeen] = useLocalStorage<string>('fp:tutorialSeen', '');
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

  const handleSkip = () => {
    setSeen('1');
    onClose();
  };

  return (
    <div className="tutorial-overlay" onClick={handleSkip}>
      <div className="tutorial-card" onClick={e => e.stopPropagation()}>
        <button className="tutorial-skip" onClick={handleSkip}>Pular ✕</button>
        <div className="tutorial-icon">{current.icon}</div>
        <div className="tutorial-title">{current.title}</div>
        <div className="tutorial-body">{current.body}</div>
        <div className="tutorial-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`tutorial-dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>
        <button className="tutorial-next" onClick={handleNext}>
          {isLast ? 'Começar a jogar' : 'Próximo →'}
        </button>
      </div>
    </div>
  );
}
