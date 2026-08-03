import type { Team, Player, RandomFn } from './types';
import { FORMATION_COUNTS } from './constants';
import {
  MENTALITY_MODIFIERS, HOME_ADVANTAGE,
  DEFENSIVE_LINE_MOD, WIDTH_MOD, BASE_DEFENSE,
  FORMATION_BONUS, DEFENSIVE_LINE_COUNTER_RISK,
  WIDTH_ATTACK_BONUS, getTacticalHardCounter,
  MAX_WIN_PROBABILITY, ELO_SCALE_FACTOR,
  CURRENT_DIFFICULTY, CURRENT_USER_TEAM_ID,
  getDifficultyAttackMultiplier, getDifficultyDefenseMultiplier,
} from './matchConfig';
import {
  effective, getPlayersByPosition, getActiveStarters,
  pickRandom, makeRng, compressAttr,
} from './matchHelpers';

export function resolveAttack(
  attackingTeam: Team, defendingTeam: Team,
  fatigueAtk: Map<string, number>, fatigueDef: Map<string, number>,
  cards: Map<string, 'yellow' | 'red'>, random: RandomFn,
  isHomeAttack: boolean = false,
  momentumMod: number = 1,
  injured: Set<string> = new Set(),
  defPenaltyMod: number = 1.0,
): { won: boolean; attacker: Player | null } {
  const rng = makeRng(random);
  const modAtk = MENTALITY_MODIFIERS[attackingTeam.strategy.mentality];
  const modDef = MENTALITY_MODIFIERS[defendingTeam.strategy.mentality];
  const atkForm = FORMATION_BONUS[attackingTeam.strategy.formation];
  const defForm = FORMATION_BONUS[defendingTeam.strategy.formation];
  const fwdCount = FORMATION_COUNTS[attackingTeam.strategy.formation]?.FWD ?? 3;
  const midCount = FORMATION_COUNTS[attackingTeam.strategy.formation]?.MID ?? 3;
  const defCount = FORMATION_COUNTS[defendingTeam.strategy.formation]?.DEF ?? 4;
  const atkFormMult = (fwdCount / 3) * 0.7 + (midCount / 3) * 0.3;
  const defFormMult = defCount / 4;
  const defLineMult = DEFENSIVE_LINE_MOD[defendingTeam.strategy.defensiveLine].defenseCompact;
  const defWidthMult = WIDTH_MOD[defendingTeam.strategy.width].defenseNarrow;
  const moraleMod = 1 + ((attackingTeam.morale ?? 0) / 100);
  const homeMod = isHomeAttack ? HOME_ADVANTAGE : 1;
  const counterRisk = DEFENSIVE_LINE_COUNTER_RISK[defendingTeam.strategy.defensiveLine];
  const atkWidthBonus = WIDTH_ATTACK_BONUS[attackingTeam.strategy.width];
  const hardCounter = getTacticalHardCounter(
    attackingTeam.strategy.mentality, attackingTeam.strategy.defensiveLine,
    defendingTeam.strategy.mentality, defendingTeam.strategy.defensiveLine,
  );

  const fwds = getPlayersByPosition(getActiveStarters(attackingTeam, cards, injured), 'FWD');
  const mids = getPlayersByPosition(getActiveStarters(attackingTeam, cards, injured), 'MID');
  const attackers = pickRandom([...fwds, ...mids], 3, random);
  const defenders = getPlayersByPosition(getActiveStarters(defendingTeam, cards, injured), 'DEF');
  const chosenDef = pickRandom(defenders, 3, random);

  // Attack power: attributes × mentality × formation × width × momentum × hard counter × RNG
  const attackPower = attackers.reduce((sum, p) => {
    const f = fatigueAtk.get(p.id) ?? 0;
    return sum + effective(compressAttr(p.attributes.speed), f) * modAtk.speed
               + effective(compressAttr(p.attributes.dribbling), f) * modAtk.dribbling;
  }, 0) * atkFormMult * moraleMod * homeMod * momentumMod
    * atkForm.atk * counterRisk * atkWidthBonus * hardCounter.atkBonus * rng(0.65, 1.35);

  // Defense power: attributes × formation × defensive line × width × hard counter × RNG + floor
  // Yellow card: defensor "tira o pé da dividida" → -25% desarme
  const defensePower = chosenDef.reduce((sum, p) => {
    const f = fatigueDef.get(p.id) ?? 0;
    const yellowPenalty = cards.get(p.id) === 'yellow' ? 0.75 : 1.0;
    return sum + effective(compressAttr(p.attributes.tackling), f) * modDef.tackling * yellowPenalty
               + effective(compressAttr(p.attributes.positioning), f) * modDef.positioning * defPenaltyMod;
  }, 0) * defFormMult * defLineMult * defWidthMult
    * defForm.def * hardCounter.defBonus * rng(0.65, 1.35) + BASE_DEFENSE;

  // Dificuldade: ajusta o balanço ataque/defesa conforme o nível escolhido
  let difficultyMod = 1.0;
  if (CURRENT_USER_TEAM_ID) {
    if (attackingTeam.id === CURRENT_USER_TEAM_ID) {
      difficultyMod = getDifficultyAttackMultiplier(CURRENT_DIFFICULTY);
    } else if (defendingTeam.id === CURRENT_USER_TEAM_ID) {
      difficultyMod = getDifficultyDefenseMultiplier(CURRENT_DIFFICULTY);
    }
  }

  // Probabilidade Elo: evita dominância absoluta, garante 12% de chance ao time mais fraco
  const diff = (attackPower * difficultyMod) - defensePower;
  const scale = Math.max(1, (attackPower + defensePower) / 2) * ELO_SCALE_FACTOR;
  const rawProb = 1 / (1 + Math.exp(-diff / scale));
  const winProb = Math.min(MAX_WIN_PROBABILITY, Math.max(1 - MAX_WIN_PROBABILITY, rawProb));
  const won = random() < winProb;
  return { won, attacker: won ? attackers[0] : null };
}
