import { allLeagues } from '../src/data/leagues';
import { cloneTeam } from '../src/utils/teamUtils';
import { assignInitialAges, assignInitialContracts, createCareerSeason } from '../src/engine/career';
import { assignMarketValues, computeWageBill, initialBudget, computeWeeklyIncome } from '../src/engine/transferMarket';
import { generateFreeAgentPool } from '../src/engine/freeAgentPool';
import { generateBoardObjectives, createBoardObjectivesInboxMessage } from '../src/engine/boardObjectives';
import { generateSponsor, getStartingTier, getSponsorMultiplier } from '../src/engine/sponsors';
import { createWelcomeMessage } from '../src/engine/inbox';

const leagueDef = allLeagues[0];
const rosters: Record<string, ReturnType<typeof cloneTeam>[]> = {};
for (const l of allLeagues) {
  rosters[l.id] = l.id === leagueDef.id
    ? assignInitialContracts(assignInitialAges(l.teams.map(t => cloneTeam(t))).map(assignMarketValues))
    : assignInitialContracts(assignInitialAges(l.teams.map(t => cloneTeam(t))));
}
const userTeam = rosters[leagueDef.id][0];
const { league, cup } = createCareerSeason(userTeam, rosters[leagueDef.id], leagueDef);
const startingTier = getStartingTier(leagueDef.id);
const boardObj = generateBoardObjectives(league, 0, 1);
const state = {
  version: 1,
  leagueId: leagueDef.id,
  manager: { name: 'Teste', reputation: 0 },
  currentSeasonYear: 1,
  season: { league, cup, tradesUsedThisSeason: 0, budgetAtSeasonStart: initialBudget(leagueDef.id), userGoalScorers: {} },
  rosters,
  history: [],
  finances: { budget: initialBudget(leagueDef.id), wageBill: computeWageBill(userTeam), weeklyIncome: Math.round(computeWeeklyIncome(leagueDef.id) * getSponsorMultiplier(startingTier)) },
  inbox: [createWelcomeMessage('Teste', initialBudget(leagueDef.id), 'Temporada 1'), createBoardObjectivesInboxMessage(boardObj)],
  freeAgentPool: generateFreeAgentPool(),
  sponsorTier: startingTier,
  sponsorName: generateSponsor(leagueDef.id, userTeam.id, startingTier).name,
  boardObjectives: boardObj,
};

const json = JSON.stringify(state);
const bytes = Buffer.byteLength(json, 'utf8');
console.log(`fp:career (temporada 1): ${(bytes / 1024).toFixed(0)} KB (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
console.log(`só rosters 12 ligas: ${(Buffer.byteLength(JSON.stringify(rosters)) / 1024).toFixed(0)} KB`);
console.log('localStorage típico: ~5 MB por origem');
