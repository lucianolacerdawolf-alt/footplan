import { describe, it, expect } from 'vitest';
import { allLeagues, getLeague } from '@/data/leagues';
import { generateConferenceSchedule, buildConferencePlayoff, conferenceStandings, scheduleForLeague } from '../conferenceSeason';
import { createCareerSeason } from '../career';
import { leaguePriceFactor, veteranMarketBid, evaluateCashTransfer, calculateMarketValue, VETERAN_AGE } from '../transferMarket';
import { initialReputation } from '../reputation';
import { getContinentalCup, isLeaguePlayoff, MLS_PLAYOFF } from '../continentalCups';
import { isCupStageOpen } from '../cupSchedule';

const NEW = ['eredivisie', 'proLeague', 'saudiProLeague', 'mls'];

describe('ligas novas registradas', () => {
  it('16 ligas, ids únicos e todas as novas presentes', () => {
    expect(allLeagues).toHaveLength(16);
    expect(new Set(allLeagues.map(l => l.id)).size).toBe(16);
    for (const id of NEW) expect(getLeague(id)).toBeDefined();
  });

  it('times com ids únicos no jogo inteiro', () => {
    const ids = allLeagues.flatMap(l => l.teams.map(t => t.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('carreira nova funciona em cada liga nova (liga + copa nacional sem 2ª divisão)', () => {
    for (const id of NEW) {
      const def = getLeague(id)!;
      const { league, cup } = createCareerSeason(def.teams[0], def.teams, def, () => 0.42);
      expect(league.fixtures.length).toBeGreaterThan(0);
      expect(cup.roundOf16).toHaveLength(8);
      const rep = initialReputation(def.teams[0], def.teams, id);
      expect(rep).toBeGreaterThanOrEqual(20);
    }
  });
});

describe('MLS: calendário por conferência', () => {
  const mls = getLeague('mls')!;
  const fixtures = generateConferenceSchedule(mls.teams, mls.conferences!);

  it('34 rodadas, ninguém joga duas vezes na mesma rodada e todos fazem 34 jogos', () => {
    expect(fixtures).toHaveLength(34);
    const games = new Map<string, number>();
    for (const round of fixtures) {
      const seen = new Set<string>();
      for (const f of round) {
        expect(seen.has(f.homeTeamId) || seen.has(f.awayTeamId)).toBe(false);
        seen.add(f.homeTeamId); seen.add(f.awayTeamId);
        games.set(f.homeTeamId, (games.get(f.homeTeamId) ?? 0) + 1);
        games.set(f.awayTeamId, (games.get(f.awayTeamId) ?? 0) + 1);
      }
    }
    for (const t of mls.teams) expect(games.get(t.id)).toBe(34);
  });

  it('cada clube enfrenta os 14 da própria conferência duas vezes', () => {
    const east = mls.conferences![0].teamIds;
    const t = east[0];
    const vs = new Map<string, number>();
    for (const r of fixtures) for (const f of r) {
      if (f.homeTeamId === t && east.includes(f.awayTeamId)) vs.set(f.awayTeamId, (vs.get(f.awayTeamId) ?? 0) + 1);
      if (f.awayTeamId === t && east.includes(f.homeTeamId)) vs.set(f.homeTeamId, (vs.get(f.homeTeamId) ?? 0) + 1);
    }
    expect(vs.size).toBe(14);
    for (const n of vs.values()) expect(n).toBe(2);
  });

  it('scheduleForLeague usa conferências só na MLS', () => {
    expect(scheduleForLeague(mls, mls.teams)).toHaveLength(34);
    const ered = getLeague('eredivisie')!;
    expect(scheduleForLeague(ered, ered.teams)).toHaveLength(34); // 18 times, turno e returno
  });
});

describe('MLS: playoff', () => {
  const mls = getLeague('mls')!;
  // Todos os jogos com placar: quem tem índice menor na conferência ganha (tabela previsível).
  const confIdx = new Map(mls.conferences!.flatMap(c => c.teamIds.map((id, i) => [id, i] as const)));
  const fixtures = generateConferenceSchedule(mls.teams, mls.conferences!).map(r => r.map(f => {
    const h = confIdx.get(f.homeTeamId)!, a = confIdx.get(f.awayTeamId)!;
    return { ...f, played: true, homeScore: h <= a ? 2 : 0, awayScore: h <= a ? 0 : 2 };
  }));

  it('8 de cada conferência, 1×8 no primeiro jogo, conferências separadas até a final', () => {
    const east = mls.conferences![0].teamIds;
    const league = { teams: mls.teams, userTeamId: east[0], fixtures, currentRound: 34, phase: 'done' as const };
    const tables = conferenceStandings(mls.teams, fixtures, mls.conferences!);
    const bracket = buildConferencePlayoff(league, mls.conferences!, 8, MLS_PLAYOFF.name, 'mls')!;
    expect(bracket).not.toBeNull();
    expect(bracket.teams).toHaveLength(16);
    expect(bracket.roundOf16[0]).toMatchObject({ homeTeamId: tables[0].standings[0].teamId, awayTeamId: tables[0].standings[7].teamId });
    const eastSet = new Set(east);
    for (const m of bracket.roundOf16.slice(0, 4)) expect(eastSet.has(m.homeTeamId!) && eastSet.has(m.awayTeamId!)).toBe(true);
  });

  it('usuário fora dos 8 da conferência: sem playoff', () => {
    const east = mls.conferences![0].teamIds;
    const league = { teams: mls.teams, userTeamId: east[14], fixtures, currentRound: 34, phase: 'done' as const };
    expect(buildConferencePlayoff(league, mls.conferences!, 8, 'x', 'mls')).toBeNull();
  });

  it('playoff só abre com a temporada regular encerrada', () => {
    expect(isCupStageOpen('roundOf16', 20, 34, false, 'playoff')).toBe(false);
    expect(isCupStageOpen('roundOf16', 34, 34, true, 'playoff')).toBe(true);
    expect(isLeaguePlayoff('mlsPlayoff')).toBe(true);
    expect(getContinentalCup('mlsPlayoff')?.name).toBe('Playoffs da MLS');
  });
});

describe('mercados alternativos', () => {
  const player = getLeague('pl')!.teams[0].squad.find(p => p.position === 'MID')!;

  it('Holanda/Bélgica vendem mais barato, jovens ainda mais; outras ligas sem desconto', () => {
    expect(leaguePriceFactor('eredivisie', { ...player, age: 21 })).toBe(0.7);
    expect(leaguePriceFactor('proLeague', { ...player, age: 27 })).toBe(0.8);
    expect(leaguePriceFactor('pl', { ...player, age: 21 })).toBe(1);
    const v = calculateMarketValue(player);
    expect(evaluateCashTransfer(player, Math.round(v * 0.75), false).accepted).toBe(false);
    expect(evaluateCashTransfer(player, Math.round(v * 0.75), false, 0.8).accepted).toBe(true);
  });

  it('veterano à venda atrai Arábia (1,3–1,8×) ou MLS (1,1–1,3×); jovem não', () => {
    const vet = { ...player, age: VETERAN_AGE + 2 };
    const saudi = veteranMarketBid(vet, (() => { const xs = [0.1, 0.5]; return () => xs.shift() ?? 0.5; })())!;
    expect(saudi.leagueId).toBe('saudiProLeague');
    expect(saudi.multiplier).toBeGreaterThanOrEqual(1.3);
    expect(saudi.multiplier).toBeLessThanOrEqual(1.8);
    const mlsBid = veteranMarketBid(vet, (() => { const xs = [0.7, 0.5]; return () => xs.shift() ?? 0.5; })())!;
    expect(mlsBid.leagueId).toBe('mls');
    expect(veteranMarketBid(vet, () => 0.95)).toBeNull();
    expect(veteranMarketBid({ ...player, age: 24 }, () => 0.1)).toBeNull();
  });
});
