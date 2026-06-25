import type { Team, Player, Mentality, RandomFn } from './types';
import { MENTALITY_MODIFIERS } from './matchConfig';
import {
  effective, getGoalkeeper, getStarters,
  makeRng,
} from './matchHelpers';

export function resolveShot(
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
