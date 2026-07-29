// =============================================================================
// CONSTANTES DE TUNING DO MOTOR DE PARTIDA
// =============================================================================
// Centralizadas aqui pra facilitar ajustes de calibração sem precisar
// caçar pelos 500+ linhas do matchEngine.ts.

import type { Mentality, Intensity, DefensiveLine, Width, Formation, CornerTactic, FreeKickTactic } from './types';

export type Difficulty = 'easy' | 'normal' | 'hard';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Fácil',
  normal: 'Normal',
  hard: 'Difícil',
};

export function getDifficultyLabel(d: Difficulty): string {
  return DIFFICULTY_LABELS[d];
}

/** Multiplicador aplicado ao ataque do time do usuário conforme a dificuldade. */
export function getDifficultyAttackMultiplier(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 1.15;
    case 'hard': return 0.85;
    default: return 1.0;
  }
}

/** Multiplicador de defesa do CPU conforme a dificuldade. */
export function getDifficultyDefenseMultiplier(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 0.85;
    case 'hard': return 1.15;
    default: return 1.0;
  }
}

/** Estado global — definido pelo caller antes de simularPartida. */
export let CURRENT_DIFFICULTY: Difficulty = 'normal';
export let CURRENT_USER_TEAM_ID: string | null = null;

export function setMatchDifficulty(difficulty: Difficulty, userTeamId: string | null): void {
  CURRENT_DIFFICULTY = difficulty;
  CURRENT_USER_TEAM_ID = userTeamId;
}

// Probabilidade Elo: garante ao menos 12% de chance para o time mais fraco em cada ataque
export const MAX_WIN_PROBABILITY = 0.88;
export const ELO_SCALE_FACTOR = 0.25;

// Ciclos da partida (1 ciclo ≈ 2 minutos de jogo)
export const CYCLE_MINUTES = 2;
export const FIRST_HALF_CYCLES = 22;        // 0-21 → minutos 0-42 + intervalo
export const TOTAL_CYCLES = 45;
export const ET_HALF_CYCLE = TOTAL_CYCLES + 7;   // 52 → ~minuto 104 (prorrogação primeiro tempo)
export const ET_END_CYCLE = TOTAL_CYCLES + 14;   // 59 → ~minuto 118 (prorrogação segundo tempo)
export const MAX_EVENTS_PER_CYCLE = 6;

// Mando de campo: +8% no ataque do mandante
export const HOME_ADVANTAGE = 1.08;

// Piso defensivo: todo time tem defesa mínima, evitando goleadas irreais
export const BASE_DEFENSE = 10;
export const BASE_GK = 6;

// Fator de conversão de finalização: calibra a taxa de gol por chute
export const SHOT_CONVERSION = 1.04;

// Modificadores por mentalidade tática
export const MENTALITY_MODIFIERS: Record<Mentality, {
  passing: number; vision: number; speed: number; dribbling: number;
  tackling: number; positioning: number; finishing: number;
  staminaLossMultiplier: number;
}> = {
  // Controla bem a bola e cria chances por construção, gasta mais energia
  'possession':     { passing: 1.20, vision: 1.20, speed: 0.90, dribbling: 1.00, tackling: 0.90, positioning: 0.95, finishing: 1.05, staminaLossMultiplier: 1.10 },
  // Velocidade no contra-ataque é a arma; chute não é mais preciso, só mais rápido
  'counter-attack': { passing: 0.85, vision: 0.95, speed: 1.25, dribbling: 1.10, tackling: 0.85, positioning: 0.90, finishing: 0.95, staminaLossMultiplier: 0.90 },
  // Recupera bola com pressão alta e cansa muito; ataque normal
  'high-press':     { passing: 0.95, vision: 1.00, speed: 1.05, dribbling: 1.00, tackling: 1.20, positioning: 1.15, finishing: 0.95, staminaLossMultiplier: 1.35 },
  // Defesa sólida e compacta; raramente cria perigo no ataque
  'defensive':      { passing: 0.90, vision: 0.85, speed: 0.90, dribbling: 0.85, tackling: 1.30, positioning: 1.35, finishing: 0.80, staminaLossMultiplier: 0.70 },
};

// A intensidade "high" antiga (7) fazia a fadiga bater no teto de 100 (-50% nos
// atributos) já por volta do minuto 32 em times de pressão alta — bem antes do
// intervalo. Reduzida pra 5: agora o teto só é atingido perto do intervalo (~min 45).
// "low"/"medium" ficaram como estavam (já calibrados pela economia de gols em
// calibration.test.ts) — o alívio de "medium" vem só da recuperação no intervalo
// (ver HALFTIME_FATIGUE_RECOVERY em matchEngine.ts), não de mudar a taxa de ganho.
export const INTENSITY_FATIGUE: Record<Intensity, number> = { 'low': 2, 'medium': 4, 'high': 5 };

export const ATK_CHANCE: Record<Mentality, number> = {
  'possession':     0.82,  // mais ataques por ciclo de posse
  'high-press':     0.74,  // pressão gera oportunidades
  'counter-attack': 0.56,  // menos ataques, mais eficientes
  'defensive':      0.36,  // raramente arriscam o ataque
};

export const DEFENSIVE_LINE_MOD: Record<DefensiveLine, { possessionBias: number; defenseCompact: number }> = {
  'high':   { possessionBias: 1.10, defenseCompact: 0.90 },
  'normal': { possessionBias: 1.00, defenseCompact: 1.00 },
  'low':    { possessionBias: 0.90, defenseCompact: 1.10 },
};

export const WIDTH_MOD: Record<Width, { possessionSpread: number; defenseNarrow: number }> = {
  'wide':   { possessionSpread: 1.10, defenseNarrow: 0.90 },
  'normal': { possessionSpread: 1.00, defenseNarrow: 1.00 },
  'narrow': { possessionSpread: 0.90, defenseNarrow: 1.10 },
};

// =============================================================================
// IMPACTO TÁTICO — o jogador precisa sentir que suas escolhas importam
// =============================================================================

// Bônus por formação: ataque, defesa, posse
export const FORMATION_BONUS: Record<Formation, { atk: number; def: number; possession: number }> = {
  '4-3-3':   { atk: 1.10, def: 1.00, possession: 1.00 },
  '4-4-2':   { atk: 1.00, def: 1.05, possession: 1.00 },
  '3-5-2':   { atk: 1.00, def: 0.95, possession: 1.10 },
  '4-2-3-1': { atk: 1.15, def: 0.95, possession: 1.05 },
  '5-3-2':   { atk: 0.90, def: 1.15, possession: 0.90 },
  '3-4-3':   { atk: 1.15, def: 0.85, possession: 1.05 },
  '4-1-4-1': { atk: 0.90, def: 1.10, possession: 1.10 },
  '4-4-1-1': { atk: 1.05, def: 1.00, possession: 1.05 },
  '3-4-2-1': { atk: 0.95, def: 0.90, possession: 1.15 },
  '4-3-1-2': { atk: 1.10, def: 1.00, possession: 0.95 },
  '5-4-1':   { atk: 0.80, def: 1.20, possession: 0.85 },
};

// Intensidade afeta desarme, faltas e cartões (além da fadiga já existente)
export const INTENSITY_FOUL_MULT: Record<Intensity, number> = {
  'low': 0.60, 'medium': 1.00, 'high': 1.40,
};
export const INTENSITY_INJURY_MULT: Record<Intensity, number> = {
  'low': 0.50, 'medium': 1.00, 'high': 1.50,
};

// Linha defensiva: chance de impedimento e vulnerabilidade a contra-ataque
export const DEFENSIVE_LINE_OFFSIDE: Record<DefensiveLine, number> = {
  'high': 0.30, 'normal': 0.18, 'low': 0.06,
};
export const DEFENSIVE_LINE_COUNTER_RISK: Record<DefensiveLine, number> = {
  'high': 1.12, 'normal': 1.00, 'low': 0.92,
};

// Largura: bônus contra defesas estreitas e penalidade contra times abertos
export const WIDTH_ATTACK_BONUS: Record<Width, number> = {
  'wide': 1.08, 'normal': 1.00, 'narrow': 0.94,
};

// Pedra-Papel-Tesoura tático: hard counters entre estilos
export function getTacticalHardCounter(
  atkMentality: Mentality, _atkLine: DefensiveLine,
  defMentality: Mentality, defLine: DefensiveLine,
): { defBonus: number; atkBonus: number } {
  // Retranca (defensivo + linha baixa) compacta contra posse/pressão alta
  if (defMentality === 'defensive' && defLine === 'low') {
    if (atkMentality === 'possession' || atkMentality === 'high-press') {
      return { defBonus: 1.28, atkBonus: 1.0 };
    }
  }
  // Counter-attack explora espaço atrás de linha alta (checado antes de high-press
  // para evitar shadowing quando o defensor tem ambos)
  if (atkMentality === 'counter-attack' && defLine === 'high') {
    return { defBonus: 1.0, atkBonus: 1.22 };
  }
  // Counter-attack explora espaço que pressão alta deixa atrás da linha defensiva
  if (atkMentality === 'counter-attack' && defMentality === 'high-press') {
    return { defBonus: 1.0, atkBonus: 1.18 };
  }
  return { defBonus: 1.0, atkBonus: 1.0 };
}

// =============================================================================
// Bola parada: escanteio e falta
// =============================================================================

export const CORNER_TACTIC_MOD: Record<CornerTactic, { headerBonus: number; shortPassBonus: number }> = {
  'mixed':     { headerBonus: 1.00, shortPassBonus: 1.00 },
  'nearPost':  { headerBonus: 1.25, shortPassBonus: 0.85 },
  'farPost':   { headerBonus: 1.15, shortPassBonus: 0.90 },
  'short':     { headerBonus: 0.70, shortPassBonus: 1.30 },
};

export const FREEKICK_TACTIC_MOD: Record<FreeKickTactic, { shotBonus: number; headerBonus: number }> = {
  'shoot':  { shotBonus: 1.30, headerBonus: 0.70 },
  'cross':  { shotBonus: 0.75, headerBonus: 1.20 },
  'short':  { shotBonus: 0.85, headerBonus: 0.90 },
};
