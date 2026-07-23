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

import type { Team, Player, MatchEvent, MatchResult, PenaltyResult, RandomFn } from './types';
import {
  generateKickoff, generatePossession, generatePass, generateTackle,
  generateAttack, generateGoal, generateMiss, generatePost, generateSave,
  generateHalftime, generateFulltime, generateSecondHalf,
  generateCorner, generateFoul, generateOffside,
  generateYellowCard, generateRedCard, generateContextual,
  generateExtraTimeKickoff, generateExtraTimeMidpoint,
  generatePenaltyKick, generatePenaltyWin,
  generateInjury, generateMatchPenalty, generateCornerGoal, generateMomentumShift,
} from './commentary';
import { generateTacticalComment } from './tacticalCommentary';
import {
  CYCLE_MINUTES, FIRST_HALF_CYCLES, TOTAL_CYCLES, ET_HALF_CYCLE, ET_END_CYCLE,
  MAX_EVENTS_PER_CYCLE, ATK_CHANCE,
  INTENSITY_FOUL_MULT, INTENSITY_INJURY_MULT, DEFENSIVE_LINE_OFFSIDE,
} from './matchConfig';
import {
  effective, getPlayersByPosition, getGoalkeeper, pickRandom, getStarters,
  makeRng, computeStats, applyFatigue,
} from './matchHelpers';
import { calculatePossession } from './calculatePossession';
import { resolveAttack } from './resolveAttack';
import { resolveShot } from './resolveShot';

// ---------------------------------------------------------------------------
// Estado da partida
// ---------------------------------------------------------------------------
export interface MatchState {
  fatigueHome: Map<string, number>;
  fatigueAway: Map<string, number>;
  homeScore: number;
  awayScore: number;
  homePossessionWins: number;
  awayPossessionWins: number;
  events: MatchEvent[];
  cards: Map<string, 'yellow' | 'red'>;
  momentumHome: number;
  momentumAway: number;
  injured: Set<string>;
  consecutiveGoalTeam: string | null;
  gkFormHome: number;  // modificador de "dia" do GK mandante (0.75–1.25), gerado no apito
  gkFormAway: number;
}

export function createMatchState(home: Team, away: Team): MatchState {
  const fatigueHome = new Map<string, number>();
  const fatigueAway = new Map<string, number>();
  getStarters(home).forEach(p => fatigueHome.set(p.id, p.currentFatigue));
  getStarters(away).forEach(p => fatigueAway.set(p.id, p.currentFatigue));
  return {
    fatigueHome, fatigueAway,
    homeScore: 0, awayScore: 0,
    homePossessionWins: 0, awayPossessionWins: 0,
    events: [],
    cards: new Map(),
    momentumHome: 0,
    momentumAway: 0,
    injured: new Set(),
    consecutiveGoalTeam: null,
    gkFormHome: 1.0,
    gkFormAway: 1.0,
  };
}

// ---------------------------------------------------------------------------
// Simula um bloco de ciclos
// ---------------------------------------------------------------------------
function simularBloco(
  home: Team, away: Team,
  startCycle: number, endCycle: number,
  state: MatchState,
  includeKickoff: boolean,
  includeHalftime: boolean,
  includeSecondHalfKickoff: boolean,
  random: RandomFn
): void {
  const isHome = (team: Team) => team.id === home.id;
  const applyMomentum = (scoringSide: 'A' | 'B', teamId: string) => {
    // Retorno decrescente: 2º gol seguido dá apenas +10 (evita efeito bola de neve)
    const isConsecutive = state.consecutiveGoalTeam === teamId;
    const gain = isConsecutive ? 10 : 30;
    state.consecutiveGoalTeam = teamId;
    if (scoringSide === 'A') {
      state.momentumHome = Math.min(100, state.momentumHome + gain);
      state.momentumAway = Math.max(-100, state.momentumAway - gain);
    } else {
      state.momentumAway = Math.min(100, state.momentumAway + gain);
      state.momentumHome = Math.max(-100, state.momentumHome - gain);
    }
  };

  if (includeKickoff) {
    state.events.push({ minute: 0, type: 'kickoff', description: generateKickoff(home.name, away.name), teamId: null });
    // Tactical insight at kickoff
    state.events.push({
      minute: 1, type: 'possession',
      description: generateTacticalComment(
        home.name, away.name,
        home.strategy.formation, away.strategy.formation,
        home.strategy.mentality, away.strategy.mentality,
        home.strategy.defensiveLine, away.strategy.defensiveLine,
        random,
      ), teamId: null,
    });
  }

  for (let cycle = startCycle; cycle < endCycle; cycle++) {
    const minute = cycle * CYCLE_MINUTES;

    // Decay momentum toward 0
    // Fator casa: torcida empurra o mandante, recupera 1pt/ciclo mais rápido quando negativo
    state.momentumHome += state.momentumHome > 0 ? -8 : state.momentumHome < 0 ? 9 : 0;
    state.momentumAway += state.momentumAway > 0 ? -8 : state.momentumAway < 0 ? 8 : 0;
    if (Math.abs(state.momentumHome) < 9) state.momentumHome = 0;
    if (Math.abs(state.momentumAway) < 9) state.momentumAway = 0;

    applyFatigue(home, state.fatigueHome, state.cards);
    applyFatigue(away, state.fatigueAway, state.cards);

    let cycleEvents = 0;

    if (cycleEvents < MAX_EVENTS_PER_CYCLE) {
      const ctx = generateContextual(minute, state.homeScore - state.awayScore, home.name, away.name);
      if (ctx) { state.events.push({ minute, type: 'possession', description: ctx, teamId: null }); cycleEvents++; }
    }

    const possessionWinner = calculatePossession(home, away, state.fatigueHome, state.fatigueAway, state.cards, random);
    if (possessionWinner === 'A') state.homePossessionWins++;
    else state.awayPossessionWins++;

    let possTeam = possessionWinner === 'A' ? home : away;
    let defTeam  = possessionWinner === 'A' ? away : home;

    if (cycleEvents < MAX_EVENTS_PER_CYCLE) {
      state.events.push({ minute, type: 'possession', description: generatePossession(possTeam.name), teamId: possTeam.id });
      cycleEvents++;
    }

    const isLate = minute >= 75;

    // Passe
    if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < 0.6) {
      const eligible = [...getPlayersByPosition(getStarters(possTeam, state.cards, state.injured), 'MID'),
                        ...getPlayersByPosition(getStarters(possTeam, state.cards, state.injured), 'FWD')];
      if (eligible.length >= 2) {
        const [a, b] = pickRandom(eligible, 2, random);
        state.events.push({ minute, type: 'pass', description: generatePass(possTeam.name, a, b), teamId: possTeam.id, passerId: a.id, receiverId: b.id });
        cycleEvents++;
      }
    }

    // Desarme — o time defensor rouba a bola de verdade: assume o ataque pelo resto do ciclo
    // (antes o desarme era só narrativo e o ataque seguinte ainda era resolvido a favor do
    // time original, dando a impressão de "passou pro adversário e voltou")
    if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < 0.45) {
      const eligible = [...getPlayersByPosition(getStarters(defTeam, state.cards, state.injured), 'DEF'),
                        ...getPlayersByPosition(getStarters(defTeam, state.cards, state.injured), 'MID')];
      if (eligible.length > 0) {
        const tackler = pickRandom(eligible, 1, random)[0];
        state.events.push({ minute, type: 'tackle', description: generateTackle(defTeam.name, tackler), teamId: defTeam.id });
        cycleEvents++;
        [possTeam, defTeam] = [defTeam, possTeam];
      }
    }

    // Momentum bonus for trailing team in last 15 minutes (calculado depois do desarme,
    // pra refletir quem está de fato atacando neste ciclo)
    const trailing = (isHome(possTeam) && state.homeScore < state.awayScore) ||
                     (!isHome(possTeam) && state.awayScore < state.homeScore);

    // Desespero: time perdendo nos últimos 15min ataca mais mas expõe a defesa
    const desperationActive = trailing && isLate;

    // Ataque
    const atkFatigue = isHome(possTeam) ? state.fatigueHome : state.fatigueAway;
    const defFatigue = isHome(possTeam) ? state.fatigueAway : state.fatigueHome;
    const atkMomentum = isHome(possTeam) ? state.momentumHome : state.momentumAway;
    const momentumMod = 1 + (atkMomentum / 250) + (desperationActive ? 0.08 : 0);
    const urgencyMod = desperationActive ? 1.18 : 1;
    // Desespero expõe a defesa do time que está PERDENDO (empurrou jogadores pra frente)
    // Aplica ao defTeam quando ELE está desesperado — cria contra-ataques matadores
    const defTeamIsTrailing = (isHome(defTeam) && state.homeScore < state.awayScore) ||
                               (!isHome(defTeam) && state.awayScore < state.homeScore);
    const defPenaltyMod = (defTeamIsTrailing && isLate) ? 0.75 : 1.0;

    if (random() < ATK_CHANCE[possTeam.strategy.mentality] * urgencyMod) {
      const atkResult = resolveAttack(possTeam, defTeam, atkFatigue, defFatigue, state.cards, random, isHome(possTeam), momentumMod, state.injured, defPenaltyMod);

      if (atkResult.won && atkResult.attacker) {
        if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < DEFENSIVE_LINE_OFFSIDE[defTeam.strategy.defensiveLine] && defTeam.strategy.defensiveLine !== 'low') {
          state.events.push({ minute, type: 'offside', description: generateOffside(possTeam.name, atkResult.attacker), teamId: possTeam.id });
          cycleEvents++;
          continue;
        }

        if (cycleEvents < MAX_EVENTS_PER_CYCLE) {
          state.events.push({ minute, type: 'attack', description: generateAttack(possTeam.name, atkResult.attacker), teamId: possTeam.id });
          cycleEvents++;
        }

        const gkForm = defTeam.id === home.id ? state.gkFormHome : state.gkFormAway;
        const shot = resolveShot(atkResult.attacker, defTeam, possTeam.strategy.mentality, atkFatigue, defFatigue, state.cards, random, atkMomentum, gkForm);

        if (cycleEvents < MAX_EVENTS_PER_CYCLE) {
          const scoreStr = `${state.homeScore}-${state.awayScore}`;
          if (shot.result === 'goal') {
            // Timing distribution: suppress early goals, boost late
            if (random() < goalTimingMultiplier(minute)) {
              state.events.push({ minute, type: 'goal', description: generateGoal(possTeam.name, shot.scorer, minute, scoreStr), teamId: possTeam.id, scorer: shot.scorer.name });
              if (isHome(possTeam)) state.homeScore++; else state.awayScore++;
              applyMomentum(isHome(possTeam) ? 'A' : 'B', possTeam.id);
              if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < 0.3) {
                state.events.push({ minute, type: 'possession', description: generateMomentumShift(possTeam.name), teamId: possTeam.id });
                cycleEvents++;
              }
            } else {
              // Goal denied by timing — show as a save or miss instead
              state.events.push({ minute, type: 'save', description: generateSave(defTeam.name, shot.goalkeeper), teamId: defTeam.id });
            }
          } else if (shot.result === 'post') {
            state.events.push({ minute, type: 'post', description: generatePost(possTeam.name, shot.scorer), teamId: possTeam.id });
          } else if (shot.result === 'save') {
            state.events.push({ minute, type: 'save', description: generateSave(defTeam.name, shot.goalkeeper), teamId: defTeam.id });
          } else {
            state.events.push({ minute, type: 'miss', description: generateMiss(possTeam.name, shot.scorer), teamId: possTeam.id });
          }
          cycleEvents++;
        }

        // Corner (after save or miss)
        if (cycleEvents < MAX_EVENTS_PER_CYCLE && (shot.result === 'save' || shot.result === 'miss') && random() < 0.4) {
          state.events.push({ minute, type: 'corner', description: generateCorner(possTeam.name), teamId: possTeam.id });
          cycleEvents++;

          // Corner → goal: chance dinâmica 5–15% baseada em poder aéreo relativo (positioning)
          const eligible = [...getPlayersByPosition(getStarters(possTeam, state.cards, state.injured), 'DEF'),
                            ...getPlayersByPosition(getStarters(possTeam, state.cards, state.injured), 'FWD')];
          const defCornerEligible = getPlayersByPosition(getStarters(defTeam, state.cards, state.injured), 'DEF');
          const atkAerialPwr = eligible.reduce((s, p) => s + p.attributes.positioning, 0) / Math.max(1, eligible.length);
          const defAerialPwr = defCornerEligible.reduce((s, p) => s + p.attributes.positioning, 0) / Math.max(1, defCornerEligible.length);
          const cornerGoalChance = 0.05 + 0.10 * (atkAerialPwr / (atkAerialPwr + defAerialPwr));
          if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < cornerGoalChance) {
            if (eligible.length > 0) {
              const header = pickRandom(eligible, 1, random)[0];
              const gk = getGoalkeeper(getStarters(defTeam, state.cards, state.injured));
              const headerPower = effective(header.attributes.positioning, atkFatigue.get(header.id) ?? 0) * 1.2 +
                                  effective(header.attributes.finishing, atkFatigue.get(header.id) ?? 0) * 0.5;
              const gkPower = effective(gk.attributes.positioning, defFatigue.get(gk.id) ?? 0) * rngFallback(random, 0.8, 1.2);
              if (headerPower * rngFallback(random, 0.7, 1.3) > gkPower && random() < goalTimingMultiplier(minute)) {
                const newScore = `${state.homeScore}-${state.awayScore}`;
                state.events.push({ minute, type: 'goal', description: generateCornerGoal(possTeam.name, header, minute, newScore), teamId: possTeam.id, scorer: header.name });
                if (isHome(possTeam)) state.homeScore++; else state.awayScore++;
                applyMomentum(isHome(possTeam) ? 'A' : 'B', possTeam.id);
                cycleEvents++;
              }
            }
          }
        }
      }
    }

    // Faltas e cartões
    if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < 0.15) {
      // Fator casa: pressão da torcida — visitante comete faltas com 6% mais frequência
      // (P(home foul) ≈ 0.485, P(away foul) ≈ 0.515)
      const foulerTeam = random() < 0.485 ? home : away;
      const otherTeam  = foulerTeam.id === home.id ? away : home;
      // Intensity affects foul frequency
      const foulMult = INTENSITY_FOUL_MULT[foulerTeam.strategy.intensity];
      const eligible = getPlayersByPosition(getStarters(foulerTeam, state.cards, state.injured), 'DEF');
      if (eligible.length > 0) {
        const fouler = pickRandom(eligible, 1, random)[0];
        state.events.push({ minute, type: 'foul', description: generateFoul(foulerTeam.name, fouler), teamId: otherTeam.id });
        cycleEvents++;

        // Foul → penalty chance (3%)
        if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < 0.03) {
          const penaltyTakers = [...getPlayersByPosition(getStarters(otherTeam, state.cards, state.injured), 'FWD'),
                                  ...getPlayersByPosition(getStarters(otherTeam, state.cards, state.injured), 'MID')]
            .sort((a, b) => (b.attributes.finishing + b.attributes.positioning) - (a.attributes.finishing + a.attributes.positioning));
          if (penaltyTakers.length > 0) {
            const taker = penaltyTakers[0];
            const gk = getGoalkeeper(getStarters(foulerTeam, state.cards, state.injured));
            const shotPwr = effective(taker.attributes.finishing, state.fatigueHome.get(taker.id) ?? state.fatigueAway.get(taker.id) ?? 0) * rngFallback(random, 0.7, 1.3);
            const savePwr = effective(gk.attributes.positioning, state.fatigueHome.get(gk.id) ?? state.fatigueAway.get(gk.id) ?? 0) * rngFallback(random, 0.8, 1.2);
            const scored = shotPwr * 1.35 > savePwr;
            if (scored && random() < goalTimingMultiplier(minute)) {
              state.events.push({ minute, type: 'penalty', description: generateMatchPenalty(otherTeam.name, taker, true, gk), teamId: otherTeam.id, scorer: taker.name });
              if (isHome(otherTeam)) state.homeScore++; else state.awayScore++;
              applyMomentum(isHome(otherTeam) ? 'A' : 'B', otherTeam.id);
            } else {
              state.events.push({ minute, type: 'penalty', description: generateMatchPenalty(otherTeam.name, taker, false, gk), teamId: otherTeam.id, scorer: taker.name });
            }
            cycleEvents++;
          }
        }

        // Lesão por falta: risco gated pela fadiga da vítima
        // 1º tempo com estamina verde: risco ~0.6%; 2º tempo com estamina vermelha: risco ~18%
        if (cycleEvents < MAX_EVENTS_PER_CYCLE) {
          const vicTeam = foulerTeam.id === home.id ? away : home;
          const victims = getStarters(vicTeam, state.cards, state.injured).filter(p => p.position !== 'GK');
          if (victims.length > 0) {
            const victim = victims[Math.floor(random() * victims.length)];
            const vicFatigueMap = vicTeam.id === home.id ? state.fatigueHome : state.fatigueAway;
            const playerFatigue = vicFatigueMap.get(victim.id) ?? 0;
            const fatigueFactor = playerFatigue > 60 ? 1.5 : playerFatigue > 30 ? 0.4 : 0.05;
            const intensityMult = INTENSITY_INJURY_MULT[foulerTeam.strategy.intensity];
            if (random() < 0.08 * intensityMult * fatigueFactor) {
              state.injured.add(victim.id);
              state.events.push({ minute, type: 'injury', description: generateInjury(vicTeam.name, victim), teamId: vicTeam.id, playerId: victim.id });
              cycleEvents++;
            }
          }
        }

        // Cards: intensity increases card risk; árbitro caseiro reduz 15% a chance do mandante
        const existingCard = state.cards.get(fouler.id);
        const homeBias = foulerTeam.id === home.id ? 0.85 : 1.0;
        if (!existingCard && random() < 0.25 * foulMult * homeBias && cycleEvents < MAX_EVENTS_PER_CYCLE) {
          state.events.push({ minute, type: 'yellowCard', description: generateYellowCard(foulerTeam.name, fouler), teamId: foulerTeam.id, playerId: fouler.id });
          state.cards.set(fouler.id, 'yellow');
          cycleEvents++;
        } else if (existingCard === 'yellow' && random() < 0.3 * foulMult && cycleEvents < MAX_EVENTS_PER_CYCLE) {
          state.events.push({ minute, type: 'redCard', description: generateRedCard(foulerTeam.name, fouler), teamId: foulerTeam.id, playerId: fouler.id });
          state.cards.set(fouler.id, 'red');
          cycleEvents++;
        }
      }
    }

    // Random injury (affected by intensity)
    if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < 0.003) {
      const unlucky = random() < 0.5 ? home : away;
      const unluckyMult = INTENSITY_INJURY_MULT[unlucky.strategy.intensity];
      if (random() > unluckyMult * 0.8) continue;
      const victims = getStarters(unlucky, state.cards, state.injured).filter(p => p.position !== 'GK');
      if (victims.length > 0) {
        const victim = victims[Math.floor(random() * victims.length)];
        state.injured.add(victim.id);
        state.events.push({ minute, type: 'injury', description: generateInjury(unlucky.name, victim), teamId: unlucky.id, playerId: victim.id });
        cycleEvents++;
      }
    }
  }

  // Second-half kickoff inserted chronologically after minute-44 events
  if (includeSecondHalfKickoff) {
    const evt = { minute: 45, type: 'kickoff' as const, description: generateSecondHalf(), teamId: null };
    let idx = state.events.length;
    for (let i = 0; i < state.events.length; i++) {
      if (state.events[i].minute >= 46) { idx = i; break; }
    }
    state.events.splice(idx, 0, evt);
  }

  if (includeHalftime) {
    state.events.push({ minute: 45, type: 'halftime', description: generateHalftime(state.homeScore, state.awayScore), teamId: null });
  }
}

function rngFallback(random: RandomFn, min: number, max: number): number {
  return min + random() * (max - min);
}

// Recuperação parcial de fadiga no intervalo — sem isso a fadiga acumulada no 1º tempo
// nunca é aliviada, fazendo o 2º tempo começar já perto do teto em intensidades altas.
// Valor deliberadamente modesto: como só o atacante (nunca o goleiro) sofre a penalidade
// de fadiga na finalização, qualquer recuperação infla a conversão de chutes — acima de
// ~7 pontos a média de gols de calibration.test.ts passa de 3.0/partida (limite calibrado).
const HALFTIME_FATIGUE_RECOVERY = 6;

function recoverHalftimeFatigue(home: Team, away: Team, state: MatchState): void {
  for (const player of getStarters(home)) {
    const current = state.fatigueHome.get(player.id) ?? 0;
    state.fatigueHome.set(player.id, Math.max(0, current - HALFTIME_FATIGUE_RECOVERY));
  }
  for (const player of getStarters(away)) {
    const current = state.fatigueAway.get(player.id) ?? 0;
    state.fatigueAway.set(player.id, Math.max(0, current - HALFTIME_FATIGUE_RECOVERY));
  }
}

// Real football goal timing distribution: few early, peak near halftime + end
function goalTimingMultiplier(minute: number): number {
  if (minute <= 4) return 0.50;    // ritmo de estudo
  if (minute <= 15) return 0.72;   // poucos gols no início
  if (minute <= 30) return 0.90;
  if (minute <= 45) return 1.02;   // leve pico pré-intervalo
  if (minute <= 55) return 0.82;   // volta morna do intervalo
  if (minute <= 70) return 0.95;
  if (minute <= 80) return 1.12;   // começa a acelerar
  return 1.28;                      // pico: desespero tático + fadiga defensiva
}

// ---------------------------------------------------------------------------
// API PÚBLICA
// ---------------------------------------------------------------------------

/** Cria o MatchState e sorteia o "dia" dos goleiros (0.75-1.25) — chamado uma vez no apito. */
export function beginMatchState(home: Team, away: Team, random: RandomFn = Math.random): MatchState {
  const state = createMatchState(home, away);
  const rng = makeRng(random);
  state.gkFormHome = rng(0.75, 1.25);
  state.gkFormAway = rng(0.75, 1.25);
  return state;
}

/** Monta o MatchResult final a partir do state acumulado — reaproveitável pelo fluxo em blocos. */
export function buildMatchResult(home: Team, away: Team, state: MatchState): MatchResult {
  const totalCycles = state.homePossessionWins + state.awayPossessionWins;
  return {
    homeTeam: home, awayTeam: away,
    homeScore: state.homeScore, awayScore: state.awayScore,
    events: state.events,
    homePossession: totalCycles > 0 ? Math.round((state.homePossessionWins / totalCycles) * 100) : 50,
    awayPossession: totalCycles > 0 ? Math.round((state.awayPossessionWins / totalCycles) * 100) : 50,
    homeStats: computeStats(state.events, home.id, away.id),
    awayStats: computeStats(state.events, away.id, home.id),
  };
}

/**
 * Simula um trecho (bloco de ciclos) de um dos tempos, pra uso incremental — permite que
 * substituições/táticas feitas numa pausa afetem os ciclos AINDA NÃO simulados, em vez de
 * calcular o tempo inteiro de uma vez só antes da pausa existir (ver useMatchSimulation.ts).
 * `home`/`away` devem refletir o elenco/tática mais recentes no momento da chamada.
 */
export function simularProximoBloco(
  home: Team, away: Team, state: MatchState,
  fromCycle: number, toCycle: number,
  isFirstHalf: boolean,
  random: RandomFn = Math.random,
): MatchEvent[] {
  const halfEnd = isFirstHalf ? FIRST_HALF_CYCLES : TOTAL_CYCLES;
  const clampedTo = Math.min(toCycle, halfEnd);
  const includeKickoff = isFirstHalf && fromCycle === 0;
  const includeSecondHalfKickoff = !isFirstHalf && fromCycle === FIRST_HALF_CYCLES;
  const reachedHalfEnd = clampedTo >= halfEnd;
  const includeHalftime = isFirstHalf && reachedHalfEnd;

  if (includeSecondHalfKickoff) recoverHalftimeFatigue(home, away, state);

  const before = state.events.length;
  simularBloco(home, away, fromCycle, clampedTo, state, includeKickoff, includeHalftime, includeSecondHalfKickoff, random);

  if (!isFirstHalf && reachedHalfEnd) {
    state.events.push({
      minute: 90, type: 'fulltime',
      description: generateFulltime(home.name, away.name, state.homeScore, state.awayScore),
      teamId: null,
    });
  }
  return state.events.slice(before);
}

export function simularPrimeiroTempo(home: Team, away: Team, random: RandomFn = Math.random): { state: MatchState } {
  const state = beginMatchState(home, away, random);
  simularBloco(home, away, 0, FIRST_HALF_CYCLES, state, true, true, false, random);
  return { state };
}

export function simularSegundoTempo(home: Team, away: Team, prevState: MatchState, random: RandomFn = Math.random): MatchResult {
  recoverHalftimeFatigue(home, away, prevState);
  simularBloco(home, away, FIRST_HALF_CYCLES, TOTAL_CYCLES, prevState, false, false, true, random);

  prevState.events.push({
    minute: 90, type: 'fulltime',
    description: generateFulltime(home.name, away.name, prevState.homeScore, prevState.awayScore),
    teamId: null,
  });

  return buildMatchResult(home, away, prevState);
}

export function simularPartida(home: Team, away: Team, random: RandomFn = Math.random): MatchResult {
  const { state } = simularPrimeiroTempo(home, away, random);
  return simularSegundoTempo(home, away, state, random);
}

// ---------------------------------------------------------------------------
// Pênaltis
// ---------------------------------------------------------------------------
function simularPenaltisInterno(home: Team, away: Team, cards: Map<string, 'yellow' | 'red'>, injured: Set<string>, random: RandomFn): PenaltyResult {
  const rng = makeRng(random);
  const getShooters = (team: Team): Player[] =>
    [...getStarters(team, cards, injured)]
      .filter(p => p.position !== 'GK')
      .sort((a, b) => b.attributes.finishing - a.attributes.finishing);

  const homeShooters = getShooters(home);
  const awayShooters = getShooters(away);
  const homeGK = getGoalkeeper(getStarters(home, cards, injured));
  const awayGK = getGoalkeeper(getStarters(away, cards, injured));

  const kicks: Array<{ teamId: string; scored: boolean }> = [];
  let homeScore = 0, awayScore = 0;

  const takePenalty = (shooter: Player, gk: Player, teamId: string): boolean => {
    const shot = effective(shooter.attributes.finishing, 0) * rng(0.7, 1.3);
    const save = effective(gk.attributes.positioning, 0) * rng(0.8, 1.2);
    const scored = shot * 1.35 > save; // ~75% base conversion
    if (teamId === home.id) homeScore += scored ? 1 : 0;
    else awayScore += scored ? 1 : 0;
    kicks.push({ teamId, scored });
    return scored;
  };

  for (let i = 0; i < 5; i++) {
    takePenalty(homeShooters[i % homeShooters.length], awayGK, home.id);
    const remaining = 4 - i;
    if (homeScore - awayScore > remaining) break;
    takePenalty(awayShooters[i % awayShooters.length], homeGK, away.id);
    if (awayScore - homeScore > remaining) break;
  }

  let sdRound = 0;
  while (homeScore === awayScore && sdRound < 20) {
    const hScored = takePenalty(homeShooters[sdRound % homeShooters.length], awayGK, home.id);
    const aScored = takePenalty(awayShooters[sdRound % awayShooters.length], homeGK, away.id);
    sdRound++;
    if (hScored !== aScored) break;
  }

  return { homeScore, awayScore, winner: homeScore > awayScore ? 'home' : 'away', kicks };
}

// ---------------------------------------------------------------------------
// Prorrogação (modifica state in-place)
// ---------------------------------------------------------------------------
function simularProrrogacaoInterno(home: Team, away: Team, state: MatchState, random: RandomFn): void {
  state.events.push({
    minute: 90, type: 'extraTimeKickoff',
    description: generateExtraTimeKickoff(), teamId: null,
  });
  simularBloco(home, away, TOTAL_CYCLES, ET_HALF_CYCLE, state, false, false, false, random);
  state.events.push({
    minute: 105, type: 'kickoff',
    description: generateExtraTimeMidpoint(), teamId: null,
  });
  simularBloco(home, away, ET_HALF_CYCLE, ET_END_CYCLE, state, false, false, false, random);
}

// ---------------------------------------------------------------------------
// API: resolve empate em mata-mata (modifica state in-place, exportada para MatchScreen)
// ---------------------------------------------------------------------------
export function resolveKnockoutTiebreak(
  home: Team, away: Team, state: MatchState, random: RandomFn = Math.random
): { wentToExtraTime: boolean; extraTimeHomeScore?: number; extraTimeAwayScore?: number; penaltyResult?: PenaltyResult } {
  if (state.homeScore !== state.awayScore) return { wentToExtraTime: false };

  const preHome = state.homeScore;
  const preAway = state.awayScore;
  simularProrrogacaoInterno(home, away, state, random);
  const extraTimeHomeScore = state.homeScore - preHome;
  const extraTimeAwayScore = state.awayScore - preAway;

  if (state.homeScore !== state.awayScore) return { wentToExtraTime: true, extraTimeHomeScore, extraTimeAwayScore };

  const penaltyResult = simularPenaltisInterno(home, away, state.cards, state.injured, random);
  const winner = penaltyResult.winner === 'home' ? home : away;
  const loser = penaltyResult.winner === 'home' ? away : home;
  state.events.push({
    minute: 120, type: 'penaltyWin',
    description: generatePenaltyWin(winner.name, penaltyResult.homeScore, penaltyResult.awayScore),
    teamId: winner.id,
  });
  penaltyResult.kicks.forEach((kick, idx) => {
    const teamObj = kick.teamId === home.id ? home : away;
    const shooters = [...getStarters(teamObj, state.cards, state.injured)]
      .filter(p => p.position !== 'GK')
      .sort((a, b) => b.attributes.finishing - a.attributes.finishing);
    const shooter = shooters[Math.floor(idx / 2) % shooters.length];
    if (shooter) {
      state.events.push({
        minute: 120, type: 'penaltyKick',
        description: generatePenaltyKick(teamObj.name, shooter.name, kick.scored),
        teamId: kick.teamId,
      });
    }
  });
  void loser;
  return { wentToExtraTime: true, extraTimeHomeScore, extraTimeAwayScore, penaltyResult };
}

// ---------------------------------------------------------------------------
// Simula partida rapidamente (sem eventos, apenas placar) — para torneio
// ---------------------------------------------------------------------------
export function simularPartidaRapida(home: Team, away: Team, random: RandomFn = Math.random): { homeScore: number; awayScore: number } {
  const state = createMatchState(home, away);
  const rng = makeRng(random);
  state.gkFormHome = rng(0.75, 1.25);
  state.gkFormAway = rng(0.75, 1.25);
  simularBloco(home, away, 0, FIRST_HALF_CYCLES, state, false, false, false, random);
  recoverHalftimeFatigue(home, away, state);
  simularBloco(home, away, FIRST_HALF_CYCLES, TOTAL_CYCLES, state, false, false, false, random);
  return { homeScore: state.homeScore, awayScore: state.awayScore };
}

// ---------------------------------------------------------------------------
// Simula mata-mata completo (90min + prorrogação + pênaltis se necessário)
// ---------------------------------------------------------------------------
export function simularKnockout(home: Team, away: Team, random: RandomFn = Math.random): {
  homeScore: number; awayScore: number;
  wentToExtraTime: boolean;
  extraTimeHomeScore?: number; extraTimeAwayScore?: number;
  penaltyResult?: PenaltyResult;
  winner: 'home' | 'away';
} {
  const state = createMatchState(home, away);
  const rng = makeRng(random);
  state.gkFormHome = rng(0.75, 1.25);
  state.gkFormAway = rng(0.75, 1.25);
  simularBloco(home, away, 0, FIRST_HALF_CYCLES, state, false, false, false, random);
  recoverHalftimeFatigue(home, away, state);
  simularBloco(home, away, FIRST_HALF_CYCLES, TOTAL_CYCLES, state, false, false, false, random);
  const tiebreak = resolveKnockoutTiebreak(home, away, state, random);
  const winner = tiebreak.penaltyResult
    ? tiebreak.penaltyResult.winner
    : state.homeScore > state.awayScore ? 'home' : 'away';
  return { homeScore: state.homeScore, awayScore: state.awayScore, ...tiebreak, winner };
}
