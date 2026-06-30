import type { Team, Player, Mentality, RandomFn } from './types';
import { MENTALITY_MODIFIERS, BASE_GK } from './matchConfig';
import {
  effective, getGoalkeeper, getStarters,
  makeRng, compressAttr,
} from './matchHelpers';

export function resolveShot(
  attacker: Player, defendingTeam: Team, attackingStrategy: Mentality,
  fatigueAtk: Map<string, number>, fatigueDef: Map<string, number>,
  cards: Map<string, 'yellow' | 'red'>, random: RandomFn,
  atkMomentum: number = 0,
  gkForm: number = 1.0,
): { result: 'goal' | 'post' | 'save' | 'miss'; scorer: Player; goalkeeper: Player } {
  const rng = makeRng(random);
  const modAtk = MENTALITY_MODIFIERS[attackingStrategy];
  const gk = getGoalkeeper(getStarters(defendingTeam, cards));
  const gkFatigue = fatigueDef.get(gk.id) ?? 0;
  const atkFatigue = fatigueAtk.get(attacker.id) ?? 0;

  // Confiança: momentum positivo melhora a precisão do chute (até +20% em momentum máximo)
  const confidenceBonus = 1 + Math.max(0, atkMomentum / 500);
  const shotPower = effective(compressAttr(attacker.attributes.finishing), atkFatigue) * modAtk.finishing * confidenceBonus * rng(0.65, 1.35);
  // Dia de herói do goleiro: gkForm 0.75–1.25, gerado no apito inicial
  const gkPower = effective(compressAttr(gk.attributes.positioning), gkFatigue) * gkForm * rng(0.65, 1.35) + BASE_GK;

  if (shotPower > gkPower) return { result: 'goal', scorer: attacker, goalkeeper: gk };
  const ratio = shotPower / gkPower;
  if (ratio > 0.80) return { result: 'post', scorer: attacker, goalkeeper: gk };
  if (ratio > 0.50) return { result: 'save', scorer: attacker, goalkeeper: gk };
  return { result: 'miss', scorer: attacker, goalkeeper: gk };
}
