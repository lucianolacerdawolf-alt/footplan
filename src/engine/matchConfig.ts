// =============================================================================
// CONSTANTES DE TUNING DO MOTOR DE PARTIDA
// =============================================================================
// Centralizadas aqui pra facilitar ajustes de calibração sem precisar
// caçar pelos 500+ linhas do matchEngine.ts.

import type { Mentality, Intensity, DefensiveLine, Width } from './types';

// Ciclos da partida (1 ciclo ≈ 2 minutos de jogo)
export const CYCLE_MINUTES = 2;
export const FIRST_HALF_CYCLES = 22;        // 0-21 → minutos 0-42 + intervalo
export const TOTAL_CYCLES = 45;
export const ET_HALF_CYCLE = TOTAL_CYCLES + 7;   // 52 → ~minuto 104 (prorrogação primeiro tempo)
export const ET_END_CYCLE = TOTAL_CYCLES + 14;   // 59 → ~minuto 118 (prorrogação segundo tempo)
export const MAX_EVENTS_PER_CYCLE = 6;

// Mando de campo: +8% no ataque do mandante (real ~+0.3 gols vantagem casa)
export const HOME_ADVANTAGE = 1.08;

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
  'possession': 0.90, 'counter-attack': 0.65, 'high-press': 0.88, 'defensive': 0.38,
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
