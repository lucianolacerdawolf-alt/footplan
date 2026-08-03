import type { Team } from './types';

// =============================================================================
// FASE 3a — TREINO PRÉ-JOGO
// =============================================================================
// Antes da partida o treinador escolhe como preparar o elenco: troca fadiga↔moral.
// Intenso sobe a moral mas cansa; Descanso recupera energia mas derruba a moral;
// Leve é o equilíbrio. Aplicado nos 3 espelhos do elenco (rosters + league + cup).

export type TrainingChoice = 'intense' | 'light' | 'rest';

export interface TrainingPreset {
  label: string;
  description: string;
  moraleDelta: number;
  fatigueDelta: number;
}

export const TRAINING_PRESETS: Record<TrainingChoice, TrainingPreset> = {
  intense: {
    label: 'Treino Intenso',
    description: 'Moral sobe, mas a fadiga aumenta.',
    moraleDelta: 3,
    fatigueDelta: 25,
  },
  light: {
    label: 'Treino Leve',
    description: 'Equilíbrio entre moral e fadiga.',
    moraleDelta: 1,
    fatigueDelta: -10,
  },
  rest: {
    label: 'Descanso',
    description: 'Recupera energia, mas a moral cai.',
    moraleDelta: -2,
    fatigueDelta: -30,
  },
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Aplica o treino a um time: moral clampada em [-10, 10], fadiga de cada jogador em [0, 100]. */
export function applyTrainingChoice(team: Team, choice: TrainingChoice): Team {
  const preset = TRAINING_PRESETS[choice];
  return {
    ...team,
    morale: clamp((team.morale ?? 0) + preset.moraleDelta, -10, 10),
    squad: team.squad.map(p => ({
      ...p,
      currentFatigue: clamp(p.currentFatigue + preset.fatigueDelta, 0, 100),
    })),
  };
}

/** Já fez o treino pré-jogo nesta rodada (evita repetir no mesmo round). */
export function isTrainingDone(doneRound: number | undefined, currentRound: number): boolean {
  return doneRound === currentRound;
}
