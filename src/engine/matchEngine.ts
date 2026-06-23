// =============================================================================
// MOTOR DE SIMULAÇÃO (MATCH ENGINE) — Suporte a 1º e 2º tempo
// =============================================================================
//
// COMO A PROBABILIDADE DE GOL É CALCULADA:
// ──────────────────────────────────────
// 1. EMBATE ATAQUE vs DEFESA:
//    Ataque = Σ(Velocidade + Drible) × modMentalidade × RNG(0.7~1.3)
//    Defesa = Σ(Desarme + Posicionamento) + PosicionamentoGoleiro × RNG(0.7~1.3)
//    Se Ataque > Defesa → finalização criada
//
// 2. FINALIZAÇÃO vs GOLEIRO:
//    Chute = Finalização × modMentalidade × RNG(0.8~1.2)
//    DefesaGK = Posicionamento × RNG(0.8~1.2)
//    Chute > DefesaGK → GOL
//    Perde ≤ 20% → trave | ≤ 50% → defesa | > 50% → fora
//
// O cansaço reduz atributos em até 50%. RNG garante imprevisibilidade.
// =============================================================================

import type { Team, Player, MatchEvent, MatchResult, Mentality, Intensity, Position, Formation, DefensiveLine, Width } from './types';
import {
  generateKickoff, generatePossession, generateAttack, generateGoal,
  generateMiss, generatePost, generateSave, generateHalftime,
  generateFulltime, generateSecondHalf,
} from './commentary';

const CYCLE_MINUTES = 5;
const FIRST_HALF_CYCLES = 9;   // ciclos 0-8 → minutos 0-40 + evento intervalo
const TOTAL_CYCLES = 18;
const MAX_EVENTS_PER_CYCLE = 3;

function rng(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

const MENTALITY_MODIFIERS: Record<Mentality, {
  passing: number; vision: number; speed: number; dribbling: number;
  tackling: number; positioning: number; finishing: number;
  staminaLossMultiplier: number;
}> = {
  'possession':     { passing: 1.20, vision: 1.20, speed: 0.90, dribbling: 1.05, tackling: 0.90, positioning: 0.95, finishing: 1.00, staminaLossMultiplier: 1.0 },
  'counter-attack': { passing: 0.85, vision: 1.00, speed: 1.20, dribbling: 1.15, tackling: 0.90, positioning: 0.90, finishing: 1.10, staminaLossMultiplier: 1.0 },
  'high-press':     { passing: 0.95, vision: 1.00, speed: 1.05, dribbling: 1.00, tackling: 1.15, positioning: 1.15, finishing: 0.95, staminaLossMultiplier: 1.30 },
  'defensive':      { passing: 0.90, vision: 0.90, speed: 0.85, dribbling: 0.85, tackling: 1.25, positioning: 1.25, finishing: 0.85, staminaLossMultiplier: 0.80 },
};

const INTENSITY_FATIGUE: Record<Intensity, number> = { 'low': 2, 'medium': 4, 'high': 7 };

const ATK_CHANCE: Record<Mentality, number> = {
  'possession': 0.70, 'counter-attack': 0.55, 'high-press': 0.75, 'defensive': 0.35,
};

// --- Formação: quantos jogadores por linha ---
const FORMATION_COUNTS: Record<Formation, Record<string, number>> = {
  '4-3-3':   { DEF: 4, MID: 3, FWD: 3 },
  '4-4-2':   { DEF: 4, MID: 4, FWD: 2 },
  '3-5-2':   { DEF: 3, MID: 5, FWD: 2 },
  '4-2-3-1': { DEF: 4, MID: 5, FWD: 1 },
  '5-3-2':   { DEF: 5, MID: 3, FWD: 2 },
};

// --- Linha defensiva: ajusta a altura base do time ---
const DEFENSIVE_LINE_MOD: Record<DefensiveLine, { possessionBias: number; defenseCompact: number }> = {
  'high':   { possessionBias: 1.10, defenseCompact: 0.90 },
  'normal': { possessionBias: 1.00, defenseCompact: 1.00 },
  'low':    { possessionBias: 0.90, defenseCompact: 1.10 },
};

// --- Amplitude: ajusta o espalhamento ---
const WIDTH_MOD: Record<Width, { possessionSpread: number; defenseNarrow: number }> = {
  'wide':   { possessionSpread: 1.10, defenseNarrow: 0.90 },
  'normal': { possessionSpread: 1.00, defenseNarrow: 1.00 },
  'narrow': { possessionSpread: 0.90, defenseNarrow: 1.10 },
};

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function effective(attr: number, fatigue: number): number {
  return attr * (1 - fatigue / 200);
}

function getPlayersByPosition(players: Player[], pos: Position): Player[] {
  return players.filter(p => p.position === pos);
}

function getGoalkeeper(players: Player[]): Player {
  return players.find(p => p.position === 'GK')!;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function calculatePossession(
  teamA: Team, teamB: Team,
  fatigueA: Map<string, number>, fatigueB: Map<string, number>
): 'A' | 'B' {
  const midsA = getPlayersByPosition(teamA.squad, 'MID');
  const midsB = getPlayersByPosition(teamB.squad, 'MID');
  const modA = MENTALITY_MODIFIERS[teamA.strategy.mentality];
  const modB = MENTALITY_MODIFIERS[teamB.strategy.mentality];

  // Formação: mais meias = mais poder de posse
  const countA = FORMATION_COUNTS[teamA.strategy.formation]?.MID ?? 3;
  const countB = FORMATION_COUNTS[teamB.strategy.formation]?.MID ?? 3;
  const formMultA = countA / 3;
  const formMultB = countB / 3;

  // Linha defensiva e amplitude
  const dlA = DEFENSIVE_LINE_MOD[teamA.strategy.defensiveLine].possessionBias;
  const dlB = DEFENSIVE_LINE_MOD[teamB.strategy.defensiveLine].possessionBias;

  const powerA = midsA.reduce((sum, p) => {
    const f = fatigueA.get(p.id) ?? 0;
    return sum + effective(p.attributes.passing, f) * modA.passing
               + effective(p.attributes.vision, f) * modA.vision;
  }, 0) * formMultA * dlA * rng(0.7, 1.3);

  const powerB = midsB.reduce((sum, p) => {
    const f = fatigueB.get(p.id) ?? 0;
    return sum + effective(p.attributes.passing, f) * modB.passing
               + effective(p.attributes.vision, f) * modB.vision;
  }, 0) * formMultB * dlB * rng(0.7, 1.3);

  return powerA >= powerB ? 'A' : 'B';
}

function resolveAttack(
  attackingTeam: Team, defendingTeam: Team,
  fatigueAtk: Map<string, number>, fatigueDef: Map<string, number>
): { won: boolean; attacker: Player | null } {
  const modAtk = MENTALITY_MODIFIERS[attackingTeam.strategy.mentality];
  const modDef = MENTALITY_MODIFIERS[defendingTeam.strategy.mentality];

  // Formação: mais atacantes = mais poder ofensivo, mais defensores = mais poder defensivo
  const fwdCount = FORMATION_COUNTS[attackingTeam.strategy.formation]?.FWD ?? 3;
  const midCount = FORMATION_COUNTS[attackingTeam.strategy.formation]?.MID ?? 3;
  const defCount = FORMATION_COUNTS[defendingTeam.strategy.formation]?.DEF ?? 4;
  const atkFormMult = (fwdCount / 3) * 0.7 + (midCount / 3) * 0.3; // ataque pesa FWD 70%, MID 30%
  const defFormMult = defCount / 4;

  // Linha defensiva e amplitude
  const defLineMult = DEFENSIVE_LINE_MOD[defendingTeam.strategy.defensiveLine].defenseCompact;
  const defWidthMult = WIDTH_MOD[defendingTeam.strategy.width].defenseNarrow;

  const fwds = getPlayersByPosition(attackingTeam.squad, 'FWD');
  const mids = getPlayersByPosition(attackingTeam.squad, 'MID');
  const attackers = pickRandom([...fwds, ...mids], 3);

  const defenders = getPlayersByPosition(defendingTeam.squad, 'DEF');
  const chosenDef = pickRandom(defenders, 3);
  const gk = getGoalkeeper(defendingTeam.squad);
  const gkFatigue = fatigueDef.get(gk.id) ?? 0;

  const attackPower = attackers.reduce((sum, p) => {
    const f = fatigueAtk.get(p.id) ?? 0;
    return sum + effective(p.attributes.speed, f) * modAtk.speed
               + effective(p.attributes.dribbling, f) * modAtk.dribbling;
  }, 0) * atkFormMult * rng(0.7, 1.3);

  const defensePower = (
    chosenDef.reduce((sum, p) => {
      const f = fatigueDef.get(p.id) ?? 0;
      return sum + effective(p.attributes.tackling, f) * modDef.tackling
                 + effective(p.attributes.positioning, f) * modDef.positioning;
    }, 0) + effective(gk.attributes.positioning, gkFatigue) * modDef.positioning
  ) * defFormMult * defLineMult * defWidthMult * rng(0.7, 1.3);

  return { won: attackPower > defensePower, attacker: attackPower > defensePower ? attackers[0] : null };
}

function resolveShot(
  attacker: Player, defendingTeam: Team, attackingStrategy: Mentality,
  fatigueAtk: Map<string, number>, fatigueDef: Map<string, number>
): { result: 'goal' | 'post' | 'save' | 'miss'; scorer: Player; goalkeeper: Player } {
  const modAtk = MENTALITY_MODIFIERS[attackingStrategy];
  const gk = getGoalkeeper(defendingTeam.squad);
  const gkFatigue = fatigueDef.get(gk.id) ?? 0;
  const atkFatigue = fatigueAtk.get(attacker.id) ?? 0;

  const shotPower = effective(attacker.attributes.finishing, atkFatigue) * modAtk.finishing * rng(0.8, 1.2);
  const gkPower = effective(gk.attributes.positioning, gkFatigue) * rng(0.8, 1.2);

  if (shotPower > gkPower) return { result: 'goal', scorer: attacker, goalkeeper: gk };
  const ratio = shotPower / gkPower;
  if (ratio > 0.80) return { result: 'post', scorer: attacker, goalkeeper: gk };
  if (ratio > 0.50) return { result: 'save', scorer: attacker, goalkeeper: gk };
  return { result: 'miss', scorer: attacker, goalkeeper: gk };
}

function applyFatigue(team: Team, fatigueMap: Map<string, number>): void {
  const baseFatigue = INTENSITY_FATIGUE[team.strategy.intensity];
  const mod = MENTALITY_MODIFIERS[team.strategy.mentality];

  for (const player of team.squad) {
    if (player.position === 'GK') continue;
    const fatigueGain = baseFatigue * mod.staminaLossMultiplier * (1 - player.attributes.stamina / 200);
    const current = fatigueMap.get(player.id) ?? 0;
    fatigueMap.set(player.id, Math.min(100, current + fatigueGain));
  }
}

// ---------------------------------------------------------------------------
// Estado da partida (compartilhado entre 1º e 2º tempo)
// ---------------------------------------------------------------------------
export interface MatchState {
  fatigueHome: Map<string, number>;
  fatigueAway: Map<string, number>;
  homeScore: number;
  awayScore: number;
  homePossessionWins: number;
  awayPossessionWins: number;
  events: MatchEvent[];
}

/** Cria estado inicial zerado */
export function createMatchState(home: Team, away: Team): MatchState {
  const fatigueHome = new Map<string, number>();
  const fatigueAway = new Map<string, number>();
  home.squad.forEach(p => fatigueHome.set(p.id, 0));
  away.squad.forEach(p => fatigueAway.set(p.id, 0));
  return {
    fatigueHome, fatigueAway,
    homeScore: 0, awayScore: 0,
    homePossessionWins: 0, awayPossessionWins: 0,
    events: [],
  };
}

// ---------------------------------------------------------------------------
// Simula um bloco de ciclos (interno)
// ---------------------------------------------------------------------------
function simularBloco(
  home: Team, away: Team,
  startCycle: number, endCycle: number,
  state: MatchState,
  includeKickoff: boolean,
  includeHalftime: boolean,
  includeSecondHalfKickoff: boolean
): void {
  const isHome = (team: Team) => team.id === home.id;

  if (includeKickoff) {
    state.events.push({
      minute: 0, type: 'kickoff',
      description: generateKickoff(home.name, away.name),
      teamId: null,
    });
  }

  if (includeSecondHalfKickoff) {
    state.events.push({
      minute: 45, type: 'kickoff',
      description: generateSecondHalf(),
      teamId: null,
    });
  }

  for (let cycle = startCycle; cycle < endCycle; cycle++) {
    const minute = cycle * CYCLE_MINUTES;

    applyFatigue(home, state.fatigueHome);
    applyFatigue(away, state.fatigueAway);

    let cycleEvents = 0;

    // Posse
    const possessionWinner = calculatePossession(home, away, state.fatigueHome, state.fatigueAway);
    if (possessionWinner === 'A') state.homePossessionWins++;
    else state.awayPossessionWins++;

    if (cycle % 2 === 0 && cycleEvents < MAX_EVENTS_PER_CYCLE) {
      const teamName = possessionWinner === 'A' ? home.name : away.name;
      state.events.push({
        minute, type: 'possession',
        description: generatePossession(teamName),
        teamId: possessionWinner === 'A' ? home.id : away.id,
      });
      cycleEvents++;
    }

    // Ataque
    const atkTeam = possessionWinner === 'A' ? home : away;
    const defTeam = possessionWinner === 'A' ? away : home;
    const atkFatigue = possessionWinner === 'A' ? state.fatigueHome : state.fatigueAway;
    const defFatigue = possessionWinner === 'A' ? state.fatigueAway : state.fatigueHome;

    if (Math.random() < ATK_CHANCE[atkTeam.strategy.mentality]) {
      const { won, attacker } = resolveAttack(atkTeam, defTeam, atkFatigue, defFatigue);

      if (won && attacker) {
        if (cycleEvents < MAX_EVENTS_PER_CYCLE) {
          state.events.push({
            minute, type: 'attack',
            description: generateAttack(atkTeam.name, attacker),
            teamId: atkTeam.id,
          });
          cycleEvents++;
        }

        const { result, scorer, goalkeeper } = resolveShot(attacker, defTeam, atkTeam.strategy.mentality, atkFatigue, defFatigue);

        if (cycleEvents < MAX_EVENTS_PER_CYCLE) {
          if (result === 'goal') {
            state.events.push({ minute, type: 'goal', description: generateGoal(atkTeam.name, scorer), teamId: atkTeam.id });
            if (isHome(atkTeam)) state.homeScore++;
            else state.awayScore++;
          } else if (result === 'post') {
            state.events.push({ minute, type: 'post', description: generatePost(atkTeam.name, scorer), teamId: atkTeam.id });
          } else if (result === 'save') {
            state.events.push({ minute, type: 'save', description: generateSave(defTeam.name, goalkeeper), teamId: defTeam.id });
          } else {
            state.events.push({ minute, type: 'miss', description: generateMiss(atkTeam.name, scorer), teamId: atkTeam.id });
          }
          cycleEvents++;
        }
      }
    }
  }

  if (includeHalftime) {
    state.events.push({
      minute: 45, type: 'halftime',
      description: generateHalftime(state.homeScore, state.awayScore),
      teamId: null,
    });
  }
}

// ---------------------------------------------------------------------------
// API PÚBLICA
// ---------------------------------------------------------------------------

/** Simula apenas o 1º tempo (0-45 min). Retorna estado para o 2º tempo. */
export function simularPrimeiroTempo(home: Team, away: Team): { state: MatchState } {
  const state = createMatchState(home, away);
  simularBloco(home, away, 0, FIRST_HALF_CYCLES, state, true, true, false);
  return { state };
}

/** Simula o 2º tempo (45-90 min) continuando do estado do 1º tempo. */
export function simularSegundoTempo(home: Team, away: Team, prevState: MatchState): MatchResult {
  simularBloco(home, away, FIRST_HALF_CYCLES, TOTAL_CYCLES, prevState, false, false, true);

  const totalCycles = prevState.homePossessionWins + prevState.awayPossessionWins;

  prevState.events.push({
    minute: 90, type: 'fulltime',
    description: generateFulltime(home.name, away.name, prevState.homeScore, prevState.awayScore),
    teamId: null,
  });

  return {
    homeTeam: home, awayTeam: away,
    homeScore: prevState.homeScore, awayScore: prevState.awayScore,
    events: prevState.events,
    homePossession: totalCycles > 0 ? Math.round((prevState.homePossessionWins / totalCycles) * 100) : 50,
    awayPossession: totalCycles > 0 ? Math.round((prevState.awayPossessionWins / totalCycles) * 100) : 50,
  };
}

/** Simula partida completa (90 min) — conveniência */
export function simularPartida(home: Team, away: Team): MatchResult {
  const { state } = simularPrimeiroTempo(home, away);
  return simularSegundoTempo(home, away, state);
}
