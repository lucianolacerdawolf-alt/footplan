export type TacticKey = 'formation' | 'mentality' | 'intensity' | 'defensiveLine' | 'width' | 'cornerTactic' | 'freeKickTactic';

export interface TacticExplanation {
  icon: string;
  title: string;
  body: string;
}

// Fonte única de verdade pro texto explicativo de cada tática — usado tanto pelo
// TutorialOverlay quanto pelos tooltips "?" ao lado de cada label.
export const TACTIC_EXPLANATIONS: Record<TacticKey, TacticExplanation> = {
  formation: {
    icon: '⚽',
    title: 'Formação',
    body: 'Distribuição dos 10 jogadores de linha: 4-3-3 ataca mais, 5-3-2 defende mais. Mudar formação reorganiza o time automaticamente.',
  },
  mentality: {
    icon: '🧠',
    title: 'Mentalidade',
    body: 'Posse de bola controla o ritmo. Pressão alta força erros. Contra-ataque espera o adversário. Retranca segura o resultado.',
  },
  intensity: {
    icon: '🔥',
    title: 'Intensidade',
    body: 'Alta cansa rápido mas pressiona mais. Baixa preserva o físico pra reta final. Média é equilibrada.',
  },
  defensiveLine: {
    icon: '🛡️',
    title: 'Linha Defensiva',
    body: 'Alta encurta o campo e cria impedimentos, mas deixa espaço atrás. Baixa fecha a área mas convida pressão.',
  },
  width: {
    icon: '↔️',
    title: 'Amplitude',
    body: 'Estreito concentra jogadores no meio. Amplo usa as pontas. Normal é equilibrado.',
  },
  cornerTactic: {
    icon: '🚩',
    title: 'Escanteio',
    body: 'Misto alterna entre 1º e 2º poste. 1º Poste privilegia cabeceio rápido. 2º Poste busca o alto. Curto prioriza jogada trabalhada.',
  },
  freeKickTactic: {
    icon: '🎯',
    title: 'Falta',
    body: 'Chute direto tenta o gol de longe. Cruzamento joga na área. Jogada curta mantém a posse com passes rápidos.',
  },
};
