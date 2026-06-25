// =============================================================================
// CONSTANTES DE TUNING DO MOTOR DE PARTIDA
// =============================================================================
// Centralizadas aqui pra facilitar ajustes de calibração sem precisar
// caçar pelos 500+ linhas do matchEngine.ts.

import type { Mentality, Intensity, DefensiveLine, Width, Formation } from './types';

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
export const BASE_DEFENSE = 22;
export const BASE_GK = 12;

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

export const INTENSITY_FATIGUE: Record<Intensity, number> = { 'low': 2, 'medium': 4, 'high': 7 };

export const ATK_CHANCE: Record<Mentality, number> = {
  'possession': 1.22, 'counter-attack': 0.96, 'high-press': 1.18, 'defensive': 0.62,
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
};

// Intensidade afeta desarme, faltas e cartões (além da fadiga já existente)
export const INTENSITY_TACKLE_BONUS: Record<Intensity, number> = {
  'low': 0.92, 'medium': 1.00, 'high': 1.06,
};
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
