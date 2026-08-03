import { describe, it, expect } from 'vitest';
import {
  generateJobOffers,
  applyClubChange,
  repRequiredForPrestige,
} from '../jobMarket';
import { getStartingTier } from '../sponsors';
import {
  createCareerSeason, isValidCareerState, getJobOffers,
  type CareerState, type JobOffer,
} from '../career';
import type { Player, Team } from '../types';
import type { LeagueDefinition } from '@/data/leagues/types';

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    return s / 0x100000000;
  };
}

function makePlayer(id: string, pos: Player['position'], num: number, ovr: number): Player {
  const attr = (v: number) => Math.max(1, Math.min(99, v));
  return {
    id, name: `P-${id}`, number: num, position: pos, currentFatigue: 0, age: 25,
    attributes: {
      speed: attr(ovr), stamina: attr(ovr), passing: attr(ovr), finishing: attr(ovr),
      tackling: attr(ovr), dribbling: attr(ovr), vision: attr(ovr), positioning: attr(ovr),
    },
  };
}

function makeTeam(id: string, ovr: number): Team {
  const squad = [
    makePlayer(`${id}-gk1`, 'GK', 1, ovr), makePlayer(`${id}-gk2`, 'GK', 21, ovr),
    makePlayer(`${id}-def1`, 'DEF', 2, ovr), makePlayer(`${id}-def2`, 'DEF', 3, ovr),
    makePlayer(`${id}-def3`, 'DEF', 4, ovr), makePlayer(`${id}-def4`, 'DEF', 5, ovr),
    makePlayer(`${id}-mid1`, 'MID', 6, ovr), makePlayer(`${id}-mid2`, 'MID', 7, ovr),
    makePlayer(`${id}-mid3`, 'MID', 8, ovr), makePlayer(`${id}-mid4`, 'MID', 23, ovr),
    makePlayer(`${id}-fwd1`, 'FWD', 9, ovr), makePlayer(`${id}-fwd2`, 'FWD', 10, ovr),
    makePlayer(`${id}-fwd3`, 'FWD', 11, ovr), makePlayer(`${id}-fwd4`, 'FWD', 25, ovr),
  ];
  return {
    id, name: `T-${id}`, abbreviation: id.toUpperCase(), color: '#000', secondaryColor: '#fff',
    logoUrl: '', squad,
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

function makeLeagueTeams(leagueId: string, count: number, ovr: number): Team[] {
  return Array.from({ length: count }, (_, i) => makeTeam(`${leagueId}-t${i}`, ovr));
}

function makeLeagueDef(id: string, teams: Team[]): LeagueDefinition {
  return {
    id, name: `League-${id}`, country: 'X', flag: '', color: '#000', logo: '',
    totalRounds: (teams.length - 1) * 2, teams, cupName: `Cup-${id}`, cupLogo: '',
    europeanSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
    cpuProfile: { pressingMod: 1, defensiveLineMod: 1, tempoMod: 1, passingFocusMod: 1 },
    relegationSpots: 3,
  };
}

describe('repRequiredForPrestige', () => {
  it('sobe com o prestígio do clube', () => {
    expect(repRequiredForPrestige(60)).toBe(0);
    expect(repRequiredForPrestige(70)).toBe(15);
    expect(repRequiredForPrestige(78)).toBe(45);
    expect(repRequiredForPrestige(85)).toBe(60);
  });
});

describe('generateJobOffers', () => {
  const rng = seededRng(1);

  it('exclui o clube atual e nunca gera mais que 3 ofertas', () => {
    const rosters = {
      pl: makeLeagueTeams('pl', 20, 70),
      laliga: makeLeagueTeams('laliga', 20, 70),
    };
    const currentClubId = rosters.pl[0].id;
    const offers = generateJobOffers({ rosters, currentClubId, reputation: 90, currentSeasonYear: 2 }, rng);
    expect(offers.length).toBeGreaterThanOrEqual(1);
    expect(offers.length).toBeLessThanOrEqual(3);
    for (const o of offers) {
      expect(o.clubId).not.toBe(currentClubId);
      expect(o.offeredSeasonYear).toBe(2);
    }
  });

  it('manager de baixa reputação não é sondado por clubes de elite (prestígio alto)', () => {
    const rosters = {
      pl: [...makeLeagueTeams('pl', 10, 65), makeTeam('elite', 88)],
    };
    const offers = generateJobOffers({ rosters, currentClubId: rosters.pl[0].id, reputation: 10, currentSeasonYear: 2 }, seededRng(9));
    expect(offers.some(o => o.clubId === 'elite')).toBe(false);
  });

  it('reputação zero pode não renderar nenhuma oferta', () => {
    const rosters = { pl: makeLeagueTeams('pl', 20, 65) };
    // rng que nunca ativa o bônus (>= 0.45): floor(0/25)=0 → count 0.
    const noOffers = generateJobOffers({ rosters, currentClubId: rosters.pl[0].id, reputation: 0, currentSeasonYear: 1 }, () => 0.9);
    expect(noOffers).toEqual([]);
  });

  it('sem clubes elegíveis, retorna vazio', () => {
    // Só o clube atual → nenhum candidato.
    const rosters = { pl: [makeTeam('only', 70)] };
    const offers = generateJobOffers({ rosters, currentClubId: 'only', reputation: 100, currentSeasonYear: 1 }, rng);
    expect(offers).toEqual([]);
  });
});

function makeCareerState(): { state: CareerState; laligaTeamId: string } {
  const userTeam = makeTeam('pl-user', 70);
  const plTeams = [userTeam, ...makeLeagueTeams('pl', 19, 70)];
  const laligaTeams = makeLeagueTeams('laliga', 20, 75);
  const leagueDef = makeLeagueDef('pl', plTeams);
  const { league, cup } = createCareerSeason(userTeam, plTeams, leagueDef, seededRng(3));
  const laligaTeamId = laligaTeams[0].id;
  const state: CareerState = {
    version: 1,
    leagueId: 'pl',
    manager: { name: 'Manager', reputation: 30 },
    currentSeasonYear: 2,
    season: { league, cup, tradesUsedThisSeason: 0, budgetAtSeasonStart: 45_000_000, userGoalScorers: {} },
    rosters: { pl: plTeams, laliga: laligaTeams },
    history: [{
      year: 1, leagueId: 'pl', leagueChampionId: 'pl-t0', userLeaguePosition: 5, cupResult: 'quarterfinal',
      tradesUsed: 0, reputationDelta: 0,
    }],
    finances: { budget: 30_000_000, wageBill: 1_000_000, weeklyIncome: 400_000 },
    inbox: [
      { id: 'transfer', date: 'T2', isRead: false, isMandatory: true, type: 'TRANSFER_OFFER', subject: 'X', body: 'Y', meta: { playerId: 'p', offeringTeamId: 'o', amount: 1 } },
      { id: 'update', date: 'T2', isRead: false, isMandatory: false, type: 'BOARD_UPDATE', subject: 'S', body: 'B' },
    ],
    freeAgentPool: [],
    transferHistory: [],
    sponsorTier: 'regional',
    sponsorName: 'Patrocinador',
    boardObjectives: { objectives: [], streakBad: 0 },
    transferListPlayerIds: ['pl-user-fwd1'],
    jobOffers: [{ id: 'old', clubId: 'laliga-t0', leagueId: 'laliga', clubName: 'Velho', reputationRequired: 15, offeredSeasonYear: 2 }],
  };
  return { state, laligaTeamId };
}

describe('applyClubChange', () => {
  it('troca de clube: novo time/liga, reseta finanças/patrocínio/objetivos, preserva identidade e histórico', () => {
    const { state, laligaTeamId } = makeCareerState();
    const offer: JobOffer = { id: 'job-1', clubId: laligaTeamId, leagueId: 'laliga', clubName: 'Novo Clube', reputationRequired: 30, offeredSeasonYear: 2 };

    const next = applyClubChange(state, offer)!;
    expect(next).not.toBeNull();
    expect(next.leagueId).toBe('laliga');
    expect(next.season.league.userTeamId).toBe(laligaTeamId);
    // Preservados
    expect(next.manager).toEqual(state.manager);
    expect(next.manager.reputation).toBe(30);
    expect(next.history).toBe(state.history);
    expect(next.rosters).toBe(state.rosters);
    expect(next.currentSeasonYear).toBe(2);
    expect(next.freeAgentPool).toBe(state.freeAgentPool);
    // Resetados
    expect(next.finances!.budget).toBeGreaterThan(0);
    expect(next.finances!.budget).not.toBe(state.finances!.budget);
    expect(next.sponsorTier).toBe(getStartingTier('laliga')); // patrocínio reinicia no tier da liga nova
    expect(next.sponsorName).toBeDefined();
    expect(next.boardObjectives).toBeDefined();
    expect(next.transferListPlayerIds).toBeUndefined();
    expect(getJobOffers(next)).toEqual([]);
    // Inbox: oferta de transferência do clube antigo sai, o resto permanece.
    expect(next.inbox!.some(m => m.type === 'TRANSFER_OFFER')).toBe(false);
    expect(next.inbox!.some(m => m.id === 'update')).toBe(true);
    // Estado resultante é válido (aceito pelo isValidCareerState).
    expect(isValidCareerState(next)).toBe(true);
  });

  it('oferta inválida (clube/liga inexistente) retorna null', () => {
    const { state } = makeCareerState();
    expect(applyClubChange(state, { id: 'x', clubId: 'nao-existe', leagueId: 'pl', clubName: 'X', reputationRequired: 0, offeredSeasonYear: 2 })).toBeNull();
  });
});
