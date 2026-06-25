import type { Team, Player, RandomFn } from './types';
import { FORMATION_COUNTS } from './constants';
import {
  MENTALITY_MODIFIERS, HOME_ADVANTAGE,
  DEFENSIVE_LINE_MOD, WIDTH_MOD,
} from './matchConfig';
import {
  effective, getPlayersByPosition, getStarters,
  pickRandom, makeRng,
} from './matchHelpers';

export function resolveAttack(
  attackingTeam: Team, defendingTeam: Team,
  fatigueAtk: Map<string, number>, fatigueDef: Map<string, number>,
  cards: Map<string, 'yellow' | 'red'>, random: RandomFn,
  isHomeAttack: boolean = false
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
  const homeMod = isHomeAttack ? HOME_ADVANTAGE : 1;

  const fwds = getPlayersByPosition(getStarters(attackingTeam, cards), 'FWD');
  const mids = getPlayersByPosition(getStarters(attackingTeam, cards), 'MID');
  const attackers = pickRandom([...fwds, ...mids], 3, random);
  const defenders = getPlayersByPosition(getStarters(defendingTeam, cards), 'DEF');
  const chosenDef = pickRandom(defenders, 3, random);

  const attackPower = attackers.reduce((sum, p) => {
    const f = fatigueAtk.get(p.id) ?? 0;
    return sum + effective(p.attributes.speed, f) * modAtk.speed
               + effective(p.attributes.dribbling, f) * modAtk.dribbling;
  }, 0) * atkFormMult * moraleMod * homeMod * rng(0.7, 1.3);

  const defensePower = chosenDef.reduce((sum, p) => {
    const f = fatigueDef.get(p.id) ?? 0;
    return sum + effective(p.attributes.tackling, f) * modDef.tackling
               + effective(p.attributes.positioning, f) * modDef.positioning;
  }, 0) * defFormMult * defLineMult * defWidthMult * rng(0.7, 1.3);

  return { won: attackPower > defensePower, attacker: attackPower > defensePower ? attackers[0] : null };
}
