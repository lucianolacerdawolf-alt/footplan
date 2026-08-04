import { describe, it, expect } from 'vitest';
import type { Team } from '../types';
import { makeTeam } from '@/components/__tests__/testFixtures';
import { allLeagues, getLeague } from '@/data/leagues';
import type { LeagueDefinition } from '@/data/leagues/types';
import {
  CONTINENTAL_CUPS, getContinentalCup, determineUserContinentalCup,
  getQualifiedTeams, createContinentalBracket, getContinentalPrizeMoney,
} from '../continentalCups';

/** Time com OVR controlado (todos os atributos no mesmo valor) — quanto maior
 *  `attr`, maior o OVR médio, o que dá ordem determinística no proxy de posição. */
function ovrTeam(id: string, attr: number): Team {
  const t = makeTeam(id, id, 'XXX');
  const attrs = { speed: attr, stamina: attr, passing: attr, finishing: attr, tackling: attr, dribbling: attr, vision: attr, positioning: attr };
  return { ...t, squad: t.squad.map(p => ({ ...p, attributes: { ...attrs } })) };
}

describe('CONTINENTAL_CUPS', () => {
  it('define exatamente 3 copas com ids ucl/uel/uecl', () => {
    expect(CONTINENTAL_CUPS.map(c => c.id)).toEqual(['ucl', 'uel', 'uecl']);
    expect(getContinentalCup('ucl')?.shortName).toBe('UCL');
    expect(getContinentalCup('inexistente')).toBeUndefined();
  });

  it('todas as copas exigem 16 times (formato mata-mata do createBracket)', () => {
    for (const cup of CONTINENTAL_CUPS) expect(cup.totalTeams).toBe(16);
  });
});

describe('determineUserContinentalCup', () => {
  const pl = getLeague('pl')!; // slots 4 / 2 / 1

  it('mapeia posição → copa conforme os europeanSlots (PL 4/2/1)', () => {
    expect(determineUserContinentalCup(pl, 1)?.id).toBe('ucl');
    expect(determineUserContinentalCup(pl, 4)?.id).toBe('ucl');
    expect(determineUserContinentalCup(pl, 5)?.id).toBe('uel');
    expect(determineUserContinentalCup(pl, 6)?.id).toBe('uel');
    expect(determineUserContinentalCup(pl, 7)?.id).toBe('uecl');
    expect(determineUserContinentalCup(pl, 8)).toBeNull();
  });

  it('segunda divisão (slots 0/0/0) nunca classifica', () => {
    const champ = getLeague('championship')!;
    expect(determineUserContinentalCup(champ, 1)).toBeNull();
    expect(determineUserContinentalCup(champ, 4)).toBeNull();
  });
});

describe('getQualifiedTeams', () => {
  const uclDef = getContinentalCup('ucl')!;
  const uelDef = getContinentalCup('uel')!;

  it('retorna exatamente 16 times mesmo quando as vagas somam menos (backfill)', () => {
    // UEL: europaLeague=2 em 6 ligas top = 12 vagas < 16 → precisa completar.
    const teams = getQualifiedTeams({}, allLeagues, uelDef);
    expect(teams).toHaveLength(16);
  });

  it('UCL também retorna 16 (24 vagas → corta pra 16)', () => {
    const teams = getQualifiedTeams({}, allLeagues, uclDef);
    expect(teams).toHaveLength(16);
    const ids = teams.map(t => t.id);
    expect(new Set(ids).size).toBe(16); // sem duplicatas
  });

  it('exclui o excludeTeamId e nunca o traz de volta no backfill', () => {
    const excluded = allLeagues[0].teams[0].id;
    const teams = getQualifiedTeams({}, allLeagues, uclDef, excluded);
    expect(teams.some(t => t.id === excluded)).toBe(false);
    expect(teams).toHaveLength(16);
  });

  it('escolhe os times de maior OVR de cada liga como proxy da posição', () => {
    // Liga sintética com slots ucl=2: os 2 de maior OVR devem entrar.
    const league: LeagueDefinition = {
      ...allLeagues[0],
      id: 'synthetic',
      teams: [ovrTeam('low', 40), ovrTeam('mid', 60), ovrTeam('high', 90), ovrTeam('top', 95)],
      europeanSlots: { championsLeague: 2, europaLeague: 0, conferenceLeague: 0 },
    };
    const teams = getQualifiedTeams({ synthetic: league.teams }, [league], uclDef);
    // Só 4 times na liga, backfill não tem de onde tirar mais → 4 no total.
    const idsInSlotOrder = teams.slice(0, 2).map(t => t.id);
    expect(idsInSlotOrder).toEqual(['top', 'high']);
  });
});

describe('createContinentalBracket', () => {
  const uclDef = getContinentalCup('ucl')!;
  const pool = Array.from({ length: 20 }, (_, i) => ovrTeam(`pool-${i}`, 70 + (i % 10)));

  it('inclui o time do usuário e monta um bracket válido de 16', () => {
    const user = ovrTeam('user', 80);
    const bracket = createContinentalBracket(user, pool, uclDef, 'pl', () => 0.5);
    expect(bracket.teams).toHaveLength(16);
    expect(bracket.teams.some(t => t.id === 'user')).toBe(true);
    expect(bracket.teams[0].id).toBe('user'); // createBracket coloca o usuário em teams[0]
    expect(bracket.stage).toBe('roundOf16');
    expect(bracket.roundOf16).toHaveLength(8);
    expect(bracket.userTeamId).toBe('user');
  });

  it('não duplica o usuário se ele também estiver no pool', () => {
    const user = ovrTeam('user', 80);
    const bracket = createContinentalBracket(user, [user, ...pool], uclDef, 'pl', () => 0.5);
    const userCount = bracket.teams.filter(t => t.id === 'user').length;
    expect(userCount).toBe(1);
    expect(bracket.teams).toHaveLength(16);
  });
});

describe('getContinentalPrizeMoney', () => {
  it('retorna o prêmio por estágio, mapeando runner-up → runnerUp', () => {
    expect(getContinentalPrizeMoney('ucl', 'champion')).toBe(15_000_000);
    expect(getContinentalPrizeMoney('ucl', 'runner-up')).toBe(8_000_000);
    expect(getContinentalPrizeMoney('ucl', 'roundOf16')).toBe(1_000_000);
    expect(getContinentalPrizeMoney('uel', 'champion')).toBe(8_000_000);
    expect(getContinentalPrizeMoney('uecl', 'champion')).toBe(4_000_000);
  });

  it('not-played e id inválido rendem 0', () => {
    expect(getContinentalPrizeMoney('ucl', 'not-played')).toBe(0);
    expect(getContinentalPrizeMoney('inexistente', 'champion')).toBe(0);
  });
});
