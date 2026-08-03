import type { Team } from './types';
import {
  createCareerSeason, isValidCareerState,
  type CareerState, type JobOffer,
} from './career';
import { getAvgOvr } from '../utils/teamUtils';
import { initialBudget, computeWeeklyIncome, computeWageBill } from './transferMarket';
import { getStartingTier, generateSponsor } from './sponsors';
import { generateBoardObjectives } from './boardObjectives';
import { getLeague } from '../data/leagues';
import { shuffle } from './rng';

/**
 * Reputação mínima do manager pra ser sondado por um clube, dado o prestígio dele
 * (OVR médio do elenco). Elites (≥80) só se interessam por técnicos consagrados.
 */
export function repRequiredForPrestige(prestige: number): number {
  if (prestige >= 80) return 60;
  if (prestige >= 76) return 45;
  if (prestige >= 72) return 30;
  if (prestige >= 68) return 15;
  return 0;
}

/**
 * Rola 0-3 ofertas de emprego no fechamento de temporada, com base na reputação do
 * manager. Todo clube (exceto o atual) cujo prestígio esteja dentro do alcance da
 * reputação é candidato; mais reputação → mais sondagens e clubes maiores.
 */
export function generateJobOffers(
  input: {
    rosters: Record<string, Team[]>;
    currentClubId: string;
    reputation: number;
    currentSeasonYear: number;
  },
  rng: () => number = Math.random,
): JobOffer[] {
  const { rosters, currentClubId, reputation, currentSeasonYear } = input;

  const eligible: Array<{ clubId: string; leagueId: string; clubName: string; prestige: number }> = [];
  for (const [leagueId, teams] of Object.entries(rosters)) {
    for (const team of teams) {
      if (team.id === currentClubId) continue;
      const prestige = getAvgOvr(team);
      if (reputation < repRequiredForPrestige(prestige)) continue;
      eligible.push({ clubId: team.id, leagueId, clubName: team.name, prestige });
    }
  }
  if (eligible.length === 0) return [];

  // Reputação baixa pode render zero sondagens; alta, até 3.
  const maxOffers = reputation >= 75 ? 3 : reputation >= 40 ? 2 : 1;
  const count = Math.min(
    maxOffers,
    Math.max(0, Math.floor(reputation / 25) + (rng() < 0.45 ? 1 : 0)),
  );
  if (count === 0) return [];

  return shuffle(eligible, rng).slice(0, count).map(c => ({
    id: `job-${c.clubId}`,
    clubId: c.clubId,
    leagueId: c.leagueId,
    clubName: c.clubName,
    reputationRequired: repRequiredForPrestige(c.prestige),
    offeredSeasonYear: currentSeasonYear,
  }));
}

/**
 * Aplica a troca de clube: reconstrói a carreira no novo clube. Preserva `manager`
 * (nome + reputação), `history`, `rosters`, `currentSeasonYear`, `freeAgentPool` e
 * `transferHistory`; reseta `leagueId`, `finances`, patrocínio, objetivos da diretoria,
 * lista de venda, `season` e limpa as `jobOffers`. Retorna null se a oferta for inválida
 * ou o estado resultante não passar em `isValidCareerState`.
 */
export function applyClubChange(state: CareerState, offer: JobOffer): CareerState | null {
  const leagueDef = getLeague(offer.leagueId);
  const roster = state.rosters[offer.leagueId];
  const newUserTeam = roster?.find(t => t.id === offer.clubId);
  if (!leagueDef || !newUserTeam) return null;

  const { league, cup } = createCareerSeason(newUserTeam, roster, leagueDef);
  const budget = initialBudget(offer.leagueId);
  const startingTier = getStartingTier(offer.leagueId);
  const sponsor = generateSponsor(offer.leagueId, offer.clubId, startingTier);
  const boardObj = generateBoardObjectives(league, state.manager.reputation, state.currentSeasonYear);

  const next: CareerState = {
    version: 1,
    leagueId: offer.leagueId,
    manager: { ...state.manager },
    currentSeasonYear: state.currentSeasonYear,
    season: { league, cup, tradesUsedThisSeason: 0, budgetAtSeasonStart: budget, userGoalScorers: {} },
    rosters: state.rosters,
    history: state.history,
    finances: { budget, wageBill: computeWageBill(newUserTeam), weeklyIncome: computeWeeklyIncome(offer.leagueId) },
    // Ofertas de transferência eram do clube antigo — descartar evita um botão
    // "Aceitar" apontando pra um jogador que já não está no elenco.
    inbox: (state.inbox ?? []).filter(m => m.type !== 'TRANSFER_OFFER'),
    freeAgentPool: state.freeAgentPool,
    transferHistory: state.transferHistory,
    sponsorTier: startingTier,
    sponsorName: sponsor.name,
    boardObjectives: boardObj,
    transferListPlayerIds: undefined,
    jobOffers: undefined,
  };

  return isValidCareerState(next) ? next : null;
}
