import type { Team, RandomFn } from './types';
import { FORMATION_COUNTS } from './constants';
import {
  MENTALITY_MODIFIERS,
  DEFENSIVE_LINE_MOD,
} from './matchConfig';
import {
  effective, getPlayersByPosition, getStarters,
  makeRng,
} from './matchHelpers';

export function calculatePossession(
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
