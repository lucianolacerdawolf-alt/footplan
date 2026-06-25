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
}

export function createMatchState(home: Team, away: Team): MatchState {
  const fatigueHome = new Map<string, number>();
  const fatigueAway = new Map<string, number>();
  getStarters(home).forEach(p => fatigueHome.set(p.id, 0));
  getStarters(away).forEach(p => fatigueAway.set(p.id, 0));
  return {
    fatigueHome, fatigueAway,
    homeScore: 0, awayScore: 0,
    homePossessionWins: 0, awayPossessionWins: 0,
    events: [],
    cards: new Map(),
    momentumHome: 0,
    momentumAway: 0,
    injured: new Set(),
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
  const applyMomentum = (scoringSide: 'A' | 'B') => {
    if (scoringSide === 'A') {
      state.momentumHome = Math.min(100, state.momentumHome + 30);
      state.momentumAway = Math.max(-100, state.momentumAway - 30);
    } else {
      state.momentumAway = Math.min(100, state.momentumAway + 30);
      state.momentumHome = Math.max(-100, state.momentumHome - 30);
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
      ), teamId: null,
    });
  }
  if (includeSecondHalfKickoff) {
    state.events.push({ minute: 45, type: 'kickoff', description: generateSecondHalf(), teamId: null });
  }

  for (let cycle = startCycle; cycle < endCycle; cycle++) {
    const minute = cycle * CYCLE_MINUTES;

    // Decay momentum toward 0
    state.momentumHome += state.momentumHome > 0 ? -8 : state.momentumHome < 0 ? 8 : 0;
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

    const possTeam = possessionWinner === 'A' ? home : away;
    const defTeam  = possessionWinner === 'A' ? away : home;

    if (cycleEvents < MAX_EVENTS_PER_CYCLE) {
      state.events.push({ minute, type: 'possession', description: generatePossession(possTeam.name), teamId: possTeam.id });
      cycleEvents++;
    }

    // Momentum bonus for trailing team in last 15 minutes
    const isLate = minute >= 75;
    const trailing = (isHome(possTeam) && state.homeScore < state.awayScore) ||
                     (!isHome(possTeam) && state.awayScore < state.homeScore);

    // Passe
    if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < 0.6) {
      const eligible = [...getPlayersByPosition(getStarters(possTeam, state.cards, state.injured), 'MID'),
                        ...getPlayersByPosition(getStarters(possTeam, state.cards, state.injured), 'FWD')];
      if (eligible.length >= 2) {
        const [a, b] = pickRandom(eligible, 2, random);
        state.events.push({ minute, type: 'pass', description: generatePass(possTeam.name, a, b), teamId: possTeam.id });
        cycleEvents++;
      }
    }

    // Desarme
    if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < 0.45) {
      const eligible = [...getPlayersByPosition(getStarters(defTeam, state.cards, state.injured), 'DEF'),
                        ...getPlayersByPosition(getStarters(defTeam, state.cards, state.injured), 'MID')];
      if (eligible.length > 0) {
        const tackler = pickRandom(eligible, 1, random)[0];
        state.events.push({ minute, type: 'tackle', description: generateTackle(defTeam.name, tackler), teamId: defTeam.id });
        cycleEvents++;
      }
    }

    // Ataque
    const atkFatigue = possessionWinner === 'A' ? state.fatigueHome : state.fatigueAway;
    const defFatigue = possessionWinner === 'A' ? state.fatigueAway : state.fatigueHome;
    const atkMomentum = isHome(possTeam) ? state.momentumHome : state.momentumAway;
    const momentumMod = 1 + (atkMomentum / 250) + (trailing && isLate ? 0.08 : 0);
    const urgencyMod = trailing && isLate ? 1.18 : 1;

    if (random() < ATK_CHANCE[possTeam.strategy.mentality] * urgencyMod) {
      const atkResult = resolveAttack(possTeam, defTeam, atkFatigue, defFatigue, state.cards, random, possessionWinner === 'A', momentumMod, state.injured);

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

        const shot = resolveShot(atkResult.attacker, defTeam, possTeam.strategy.mentality, atkFatigue, defFatigue, state.cards, random);

        if (cycleEvents < MAX_EVENTS_PER_CYCLE) {
          const scoreStr = `${state.homeScore}-${state.awayScore}`;
          if (shot.result === 'goal') {
            state.events.push({ minute, type: 'goal', description: generateGoal(possTeam.name, shot.scorer, minute, scoreStr), teamId: possTeam.id, scorer: shot.scorer.name });
            if (isHome(possTeam)) state.homeScore++; else state.awayScore++;
            applyMomentum(possessionWinner);
            // Momentum narration (30% chance)
            if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < 0.3) {
              state.events.push({ minute, type: 'possession', description: generateMomentumShift(possTeam.name), teamId: possTeam.id });
              cycleEvents++;
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

          // Corner → goal chance (10%)
          if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < 0.10) {
            const eligible = [...getPlayersByPosition(getStarters(possTeam, state.cards, state.injured), 'DEF'),
                              ...getPlayersByPosition(getStarters(possTeam, state.cards, state.injured), 'FWD')];
            if (eligible.length > 0) {
              const header = pickRandom(eligible, 1, random)[0];
              const gk = getGoalkeeper(getStarters(defTeam, state.cards, state.injured));
              const headerPower = effective(header.attributes.positioning, atkFatigue.get(header.id) ?? 0) * 1.2 +
                                  effective(header.attributes.finishing, atkFatigue.get(header.id) ?? 0) * 0.5;
              const gkPower = effective(gk.attributes.positioning, defFatigue.get(gk.id) ?? 0) * rngFallback(random, 0.8, 1.2);
              if (headerPower * rngFallback(random, 0.7, 1.3) > gkPower) {
                const newScore = `${state.homeScore}-${state.awayScore}`;
                state.events.push({ minute, type: 'goal', description: generateCornerGoal(possTeam.name, header, minute, newScore), teamId: possTeam.id, scorer: header.name });
                if (isHome(possTeam)) state.homeScore++; else state.awayScore++;
                applyMomentum(possessionWinner);
                cycleEvents++;
              }
            }
          }
        }
      }
    }

    // Faltas e cartões
    if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < 0.15) {
      const foulerTeam = random() < 0.5 ? home : away;
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
            state.events.push({ minute, type: 'penalty', description: generateMatchPenalty(otherTeam.name, taker, scored, gk), teamId: otherTeam.id, scorer: taker.name });
            if (scored) {
              if (isHome(otherTeam)) state.homeScore++; else state.awayScore++;
              applyMomentum(isHome(otherTeam) ? 'A' : 'B');
            }
            cycleEvents++;
          }
        }

        // Injury chance after foul (affected by intensity of BOTH teams)
        const injMult = INTENSITY_INJURY_MULT[foulerTeam.strategy.intensity];
        if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < 0.08 * injMult) {
          const vicTeam = foulerTeam.id === home.id ? away : home;
          const victims = getStarters(vicTeam, state.cards, state.injured).filter(p => p.position !== 'GK');
          if (victims.length > 0) {
            const victim = victims[Math.floor(random() * victims.length)];
            state.injured.add(victim.id);
            state.events.push({ minute, type: 'injury', description: generateInjury(vicTeam.name, victim), teamId: vicTeam.id, playerId: victim.id });
            cycleEvents++;
          }
        }

        // Cards: intensity increases card risk
        const existingCard = state.cards.get(fouler.id);
        if (!existingCard && random() < 0.25 * foulMult && cycleEvents < MAX_EVENTS_PER_CYCLE) {
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

  if (includeHalftime) {
    state.events.push({ minute: 45, type: 'halftime', description: generateHalftime(state.homeScore, state.awayScore), teamId: null });
  }
}

function rngFallback(random: RandomFn, min: number, max: number): number {
  return min + random() * (max - min);
}

// ---------------------------------------------------------------------------
// API PÚBLICA
// ---------------------------------------------------------------------------

export function simularPrimeiroTempo(home: Team, away: Team, random: RandomFn = Math.random): { state: MatchState } {
  const state = createMatchState(home, away);
  simularBloco(home, away, 0, FIRST_HALF_CYCLES, state, true, true, false, random);
  return { state };
}

export function simularSegundoTempo(home: Team, away: Team, prevState: MatchState, random: RandomFn = Math.random): MatchResult {
  simularBloco(home, away, FIRST_HALF_CYCLES, TOTAL_CYCLES, prevState, false, false, true, random);

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
    homeStats: computeStats(prevState.events, home.id, away.id),
    awayStats: computeStats(prevState.events, away.id, home.id),
  };
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
  simularBloco(home, away, 0, FIRST_HALF_CYCLES, state, false, false, false, random);
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
  simularBloco(home, away, 0, FIRST_HALF_CYCLES, state, false, false, false, random);
  simularBloco(home, away, FIRST_HALF_CYCLES, TOTAL_CYCLES, state, false, false, false, random);
  const tiebreak = resolveKnockoutTiebreak(home, away, state, random);
  const winner = tiebreak.penaltyResult
    ? tiebreak.penaltyResult.winner
    : state.homeScore > state.awayScore ? 'home' : 'away';
  return { homeScore: state.homeScore, awayScore: state.awayScore, ...tiebreak, winner };
}
