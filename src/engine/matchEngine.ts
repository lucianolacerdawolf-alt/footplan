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

import type { Team, Player, MatchEvent, MatchResult, TeamStats, PenaltyResult, Mentality, Intensity, Position, DefensiveLine, Width, RandomFn } from './types';
import {
  generateKickoff, generatePossession, generatePass, generateTackle,
  generateAttack, generateGoal, generateMiss, generatePost, generateSave,
  generateHalftime, generateFulltime, generateSecondHalf,
  generateCorner, generateFoul, generateOffside,
  generateYellowCard, generateRedCard, generateContextual,
  generateExtraTimeKickoff, generateExtraTimeMidpoint,
  generatePenaltyKick, generatePenaltyWin,
} from './commentary';
import { FORMATION_COUNTS } from './constants';

const CYCLE_MINUTES = 2;
const FIRST_HALF_CYCLES = 22;  // ciclos 0-21 → minutos 0-42 + evento intervalo
const TOTAL_CYCLES = 45;
const ET_HALF_CYCLE  = TOTAL_CYCLES + 7;   // 52 → ~minuto 104
const ET_END_CYCLE   = TOTAL_CYCLES + 14;  // 59 → ~minuto 118
const MAX_EVENTS_PER_CYCLE = 6;

const makeRng = (random: RandomFn) => (min: number, max: number) => min + random() * (max - min);

const MENTALITY_MODIFIERS: Record<Mentality, {
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

const INTENSITY_FATIGUE: Record<Intensity, number> = { 'low': 2, 'medium': 4, 'high': 7 };

const ATK_CHANCE: Record<Mentality, number> = {
  'possession': 0.90, 'counter-attack': 0.65, 'high-press': 0.88, 'defensive': 0.38,
};

const DEFENSIVE_LINE_MOD: Record<DefensiveLine, { possessionBias: number; defenseCompact: number }> = {
  'high':   { possessionBias: 1.10, defenseCompact: 0.90 },
  'normal': { possessionBias: 1.00, defenseCompact: 1.00 },
  'low':    { possessionBias: 0.90, defenseCompact: 1.10 },
};

const WIDTH_MOD: Record<Width, { possessionSpread: number; defenseNarrow: number }> = {
  'wide':   { possessionSpread: 1.10, defenseNarrow: 0.90 },
  'normal': { possessionSpread: 1.00, defenseNarrow: 1.00 },
  'narrow': { possessionSpread: 0.90, defenseNarrow: 1.10 },
};

function effective(attr: number, fatigue: number): number {
  return attr * (1 - fatigue / 200);
}

function getPlayersByPosition(players: Player[], pos: Position): Player[] {
  return players.filter(p => p.position === pos);
}


function getGoalkeeper(players: Player[]): Player {
  return players.find(p => p.position === 'GK')!;
}

function pickRandom<T>(arr: T[], count: number, random: RandomFn): T[] {
  const shuffled = [...arr].sort(() => random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function getStarters(team: Team, cards?: Map<string, 'yellow' | 'red'>): Player[] {
  const counts = FORMATION_COUNTS[team.strategy.formation] ?? { DEF: 4, MID: 3, FWD: 3 };
  const starters: Player[] = [];
  const active = (p: Player) => !cards || cards.get(p.id) !== 'red';
  const gk = getPlayersByPosition(team.squad, 'GK').filter(active);
  starters.push(...gk.slice(0, 1));
  for (const pos of ['DEF', 'MID', 'FWD'] as const) {
    const players = getPlayersByPosition(team.squad, pos).filter(active);
    starters.push(...players.slice(0, counts[pos] ?? 3));
  }
  return starters;
}

function calculatePossession(
  teamA: Team, teamB: Team,
  fatigueA: Map<string, number>, fatigueB: Map<string, number>,
  cards: Map<string, 'yellow' | 'red'>, random: RandomFn
): 'A' | 'B' {
  const rng = makeRng(random);
  const midsA = getPlayersByPosition(getStarters(teamA, cards), 'MID');
  const midsB = getPlayersByPosition(getStarters(teamB, cards), 'MID');
  const modA = MENTALITY_MODIFIERS[teamA.strategy.mentality];
  const modB = MENTALITY_MODIFIERS[teamB.strategy.mentality];
  const countA = FORMATION_COUNTS[teamA.strategy.formation]?.MID ?? 3;
  const countB = FORMATION_COUNTS[teamB.strategy.formation]?.MID ?? 3;
  const formMultA = countA / 3;
  const formMultB = countB / 3;
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
  fatigueAtk: Map<string, number>, fatigueDef: Map<string, number>,
  cards: Map<string, 'yellow' | 'red'>, random: RandomFn
): { won: boolean; attacker: Player | null } {
  const rng = makeRng(random);
  const modAtk = MENTALITY_MODIFIERS[attackingTeam.strategy.mentality];
  const modDef = MENTALITY_MODIFIERS[defendingTeam.strategy.mentality];
  const fwdCount = FORMATION_COUNTS[attackingTeam.strategy.formation]?.FWD ?? 3;
  const midCount = FORMATION_COUNTS[attackingTeam.strategy.formation]?.MID ?? 3;
  const defCount = FORMATION_COUNTS[defendingTeam.strategy.formation]?.DEF ?? 4;
  const atkFormMult = (fwdCount / 3) * 0.7 + (midCount / 3) * 0.3;
  const defFormMult = defCount / 4;
  const defLineMult = DEFENSIVE_LINE_MOD[defendingTeam.strategy.defensiveLine].defenseCompact;
  const defWidthMult = WIDTH_MOD[defendingTeam.strategy.width].defenseNarrow;
  const moraleMod = 1 + ((attackingTeam.morale ?? 0) / 100);

  const fwds = getPlayersByPosition(getStarters(attackingTeam, cards), 'FWD');
  const mids = getPlayersByPosition(getStarters(attackingTeam, cards), 'MID');
  const attackers = pickRandom([...fwds, ...mids], 3, random);
  const defenders = getPlayersByPosition(getStarters(defendingTeam, cards), 'DEF');
  const chosenDef = pickRandom(defenders, 3, random);
  const gk = getGoalkeeper(getStarters(defendingTeam, cards));
  const gkFatigue = fatigueDef.get(gk.id) ?? 0;

  const attackPower = attackers.reduce((sum, p) => {
    const f = fatigueAtk.get(p.id) ?? 0;
    return sum + effective(p.attributes.speed, f) * modAtk.speed
               + effective(p.attributes.dribbling, f) * modAtk.dribbling;
  }, 0) * atkFormMult * moraleMod * rng(0.7, 1.3);

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
  fatigueAtk: Map<string, number>, fatigueDef: Map<string, number>,
  cards: Map<string, 'yellow' | 'red'>, random: RandomFn
): { result: 'goal' | 'post' | 'save' | 'miss'; scorer: Player; goalkeeper: Player } {
  const rng = makeRng(random);
  const modAtk = MENTALITY_MODIFIERS[attackingStrategy];
  const gk = getGoalkeeper(getStarters(defendingTeam, cards));
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

function applyFatigue(team: Team, fatigueMap: Map<string, number>, cards: Map<string, 'yellow' | 'red'>): void {
  const baseFatigue = INTENSITY_FATIGUE[team.strategy.intensity];
  const mod = MENTALITY_MODIFIERS[team.strategy.mentality];
  for (const player of getStarters(team, cards)) {
    if (player.position === 'GK') continue;
    const fatigueGain = baseFatigue * mod.staminaLossMultiplier * (1 - player.attributes.stamina / 200);
    const current = fatigueMap.get(player.id) ?? 0;
    fatigueMap.set(player.id, Math.min(100, current + fatigueGain));
  }
}

// ---------------------------------------------------------------------------
// Computa estatísticas de um time a partir dos eventos
// ---------------------------------------------------------------------------
function computeStats(events: MatchEvent[], teamId: string, opponentId: string): TeamStats {
  let shots = 0, shotsOnTarget = 0, fouls = 0, yellowCards = 0, redCards = 0;
  for (const e of events) {
    if ((e.type === 'goal' || e.type === 'miss' || e.type === 'post') && e.teamId === teamId) shots++;
    if (e.type === 'save' && e.teamId === opponentId) { shots++; shotsOnTarget++; }
    if (e.type === 'goal' && e.teamId === teamId) shotsOnTarget++;
    if (e.type === 'foul' && e.teamId === opponentId) fouls++;
    if (e.type === 'yellowCard' && e.teamId === teamId) yellowCards++;
    if (e.type === 'redCard' && e.teamId === teamId) redCards++;
  }
  return { shots, shotsOnTarget, fouls, yellowCards, redCards };
}

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

  if (includeKickoff) {
    state.events.push({ minute: 0, type: 'kickoff', description: generateKickoff(home.name, away.name), teamId: null });
  }
  if (includeSecondHalfKickoff) {
    state.events.push({ minute: 45, type: 'kickoff', description: generateSecondHalf(), teamId: null });
  }

  for (let cycle = startCycle; cycle < endCycle; cycle++) {
    const minute = cycle * CYCLE_MINUTES;

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

    // Passe
    if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < 0.6) {
      const eligible = [...getPlayersByPosition(getStarters(possTeam, state.cards), 'MID'),
                        ...getPlayersByPosition(getStarters(possTeam, state.cards), 'FWD')];
      if (eligible.length >= 2) {
        const [a, b] = pickRandom(eligible, 2, random);
        state.events.push({ minute, type: 'pass', description: generatePass(possTeam.name, a, b), teamId: possTeam.id });
        cycleEvents++;
      }
    }

    // Desarme
    if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < 0.45) {
      const eligible = [...getPlayersByPosition(getStarters(defTeam, state.cards), 'DEF'),
                        ...getPlayersByPosition(getStarters(defTeam, state.cards), 'MID')];
      if (eligible.length > 0) {
        const tackler = pickRandom(eligible, 1, random)[0];
        state.events.push({ minute, type: 'tackle', description: generateTackle(defTeam.name, tackler), teamId: defTeam.id });
        cycleEvents++;
      }
    }

    // Ataque
    const atkFatigue = possessionWinner === 'A' ? state.fatigueHome : state.fatigueAway;
    const defFatigue = possessionWinner === 'A' ? state.fatigueAway : state.fatigueHome;

    if (random() < ATK_CHANCE[possTeam.strategy.mentality]) {
      const atkResult = resolveAttack(possTeam, defTeam, atkFatigue, defFatigue, state.cards, random);

      if (atkResult.won && atkResult.attacker) {
        if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < 0.18 && defTeam.strategy.defensiveLine === 'high') {
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
          } else if (shot.result === 'post') {
            state.events.push({ minute, type: 'post', description: generatePost(possTeam.name, shot.scorer), teamId: possTeam.id });
          } else if (shot.result === 'save') {
            state.events.push({ minute, type: 'save', description: generateSave(defTeam.name, shot.goalkeeper), teamId: defTeam.id });
          } else {
            state.events.push({ minute, type: 'miss', description: generateMiss(possTeam.name, shot.scorer), teamId: possTeam.id });
          }
          cycleEvents++;
        }

        if (cycleEvents < MAX_EVENTS_PER_CYCLE && (shot.result === 'save' || shot.result === 'miss') && random() < 0.4) {
          state.events.push({ minute, type: 'corner', description: generateCorner(possTeam.name), teamId: possTeam.id });
          cycleEvents++;
        }
      }
    }

    // Faltas e cartões
    if (cycleEvents < MAX_EVENTS_PER_CYCLE && random() < 0.15) {
      const foulerTeam = random() < 0.5 ? home : away;
      const otherTeam  = foulerTeam.id === home.id ? away : home;
      const eligible = getPlayersByPosition(getStarters(foulerTeam, state.cards), 'DEF');
      if (eligible.length > 0) {
        const fouler = pickRandom(eligible, 1, random)[0];
        state.events.push({ minute, type: 'foul', description: generateFoul(foulerTeam.name, fouler), teamId: otherTeam.id });
        cycleEvents++;

        const existingCard = state.cards.get(fouler.id);
        if (!existingCard && random() < 0.25 && cycleEvents < MAX_EVENTS_PER_CYCLE) {
          state.events.push({ minute, type: 'yellowCard', description: generateYellowCard(foulerTeam.name, fouler), teamId: foulerTeam.id, playerId: fouler.id });
          state.cards.set(fouler.id, 'yellow');
          cycleEvents++;
        } else if (existingCard === 'yellow' && random() < 0.3 && cycleEvents < MAX_EVENTS_PER_CYCLE) {
          state.events.push({ minute, type: 'redCard', description: generateRedCard(foulerTeam.name, fouler), teamId: foulerTeam.id, playerId: fouler.id });
          state.cards.set(fouler.id, 'red');
          cycleEvents++;
        }
      }
    }
  }

  if (includeHalftime) {
    state.events.push({ minute: 45, type: 'halftime', description: generateHalftime(state.homeScore, state.awayScore), teamId: null });
  }
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
function simularPenaltisInterno(home: Team, away: Team, cards: Map<string, 'yellow' | 'red'>, random: RandomFn): PenaltyResult {
  const rng = makeRng(random);
  const getShooters = (team: Team): Player[] =>
    [...getStarters(team, cards)]
      .filter(p => p.position !== 'GK')
      .sort((a, b) => b.attributes.finishing - a.attributes.finishing);

  const homeShooters = getShooters(home);
  const awayShooters = getShooters(away);
  const homeGK = getGoalkeeper(getStarters(home, cards));
  const awayGK = getGoalkeeper(getStarters(away, cards));

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

  const penaltyResult = simularPenaltisInterno(home, away, state.cards, random);
  const winner = penaltyResult.winner === 'home' ? home : away;
  const loser = penaltyResult.winner === 'home' ? away : home;
  state.events.push({
    minute: 120, type: 'penaltyWin',
    description: generatePenaltyWin(winner.name, penaltyResult.homeScore, penaltyResult.awayScore),
    teamId: winner.id,
  });
  penaltyResult.kicks.forEach((kick, idx) => {
    const teamObj = kick.teamId === home.id ? home : away;
    const shooters = [...getStarters(teamObj, state.cards)]
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
