import type { Player, Position, Team } from './types';
import type { LeagueState, BracketState } from './tournament';
import type { LeagueDefinition } from '../data/leagues/types';
// type-only: boardObjectives importa CareerState de volta, mas imports de tipo
// s├úo apagados na compila├º├úo ÔÇö n├úo h├í ciclo em runtime.
import type { BoardObjectivesState } from './boardObjectives';
import { createBracket, generateLeagueSchedule } from './tournament';
import { generatePlayer, generateRandomName } from '../data/leagues/generateTeam';
import { playerOvr } from '../utils/playerOvr';
import { calculateMarketValue, computeWageBill } from './transferMarket';
import { cloneTeam } from '../utils/teamUtils';
import { shuffle } from './rng';
import { getStartingTier, generateSponsor } from './sponsors';

// =============================================================================
// TIPOS ÔÇö Modo Carreira
// =============================================================================

export interface CareerManagerProfile {
  name: string;
  reputation: number;
}

export interface CareerSeasonHistoryEntry {
  year: number;
  leagueId: string;
  leagueChampionId: string;
  userLeaguePosition: number;
  cupResult: 'champion' | 'runner-up' | 'semifinal' | 'quarterfinal' | 'roundOf16' | 'not-played';
  tradesUsed: number;
  reputationDelta: number;
  // Campos abaixo s├úo opcionais ÔÇö temporadas fechadas antes da Fase 4.5 n├úo os t├¬m.
  // leagueTopScorer/cupTopScorer/userTopAssister ficaram de fora desta vers├úo:
  // partidas simuladas automaticamente (CPU x CPU) n├úo geram eventos de gol
  // individuais hoje, s├│ placar agregado ÔÇö e n├úo existe rastreio de assist├¬ncia
  // no motor. Rastrear isso exigiria mudar o motor de simula├º├úo r├ípida, fora do
  // escopo desta feature.
  userTopScorer?: { name: string; goals: number };
  userWins?: number;
  userDraws?: number;
  userLosses?: number;
  userGoalsFor?: number;
  userGoalsAgainst?: number;
  managerOfSeason?: boolean;
  budgetDelta?: number;
}

export interface ClubFinances {
  budget: number;
  wageBill: number;
  weeklyIncome: number;
  merchRevenue?: number; // renda semanal de merchandising (camisas, etc.)
}

export interface InboxMessage {
  id: string;
  date: string;
  isRead: boolean;
  isMandatory: boolean; // precisa ser lida pra liberar "Avan├ºar Rodada"
  type: 'TRANSFER_OFFER' | 'BOARD_UPDATE' | 'INJURY_REPORT' | 'MATCH_PREVIEW';
  subject: string;
  body: string;
  // Payload estruturado ÔÇö s├│ populado em TRANSFER_OFFER, ├® o que permite os bot├Áes
  // Aceitar/Recusar saberem qual jogador/time/valor a mensagem se refere sem ter
  // que fazer parsing do texto de `body`.
  meta?: { playerId: string; offeringTeamId: string; amount: number };
}

export type TransferRecordType = 'BUY' | 'SELL' | 'SIGN_FREE_AGENT' | 'TRADE';

export interface TransferRecord {
  id: string;
  date: string;
  seasonYear: number;
  type: TransferRecordType;
  playerName: string;
  playerPosition: Position;
  fromTeam: string; // 'Free Agent' pra SIGN_FREE_AGENT
  toTeam: string;
  amount: number;   // parte em dinheiro; 0 numa TRADE sem compensa├º├úo
}

export interface CareerState {
  version: 1;
  leagueId: string;
  manager: CareerManagerProfile;
  currentSeasonYear: number;
  season: {
    league: LeagueState; cup: BracketState; tradesUsedThisSeason: number;
    // Opcionais pelo mesmo motivo dos campos de n├¡vel CareerState (compat com saves antigos).
    budgetAtSeasonStart?: number;       // pra calcular o budgetDelta no fechamento da temporada
    userGoalScorers?: Record<string, number>; // nome do jogador ÔåÆ gols na temporada (liga + copa)
  };
  rosters: Record<string, Team[]>;
  history: CareerSeasonHistoryEntry[];
  // Opcionais: carreiras salvas antes da Fase 4.5 n├úo t├¬m esses campos ÔÇö todo
  // ponto de leitura usa getFinances/getInbox (nunca acessa direto), e toda
  // escrita parte do valor lido por elas, ent├úo uma carreira antiga se
  // "autopreenche" na primeira rodada avan├ºada/partida jogada depois do update.
  finances?: ClubFinances;
  inbox?: InboxMessage[];
  freeAgentPool?: Player[];
  transferHistory?: TransferRecord[];
  // Jogadores que o usu├írio colocou ├á venda ÔÇö a cada rodada com a janela aberta,
  // qualquer time do jogo pode fazer uma oferta (ver handleNextCareerLeagueRound).
  // O usu├írio n├úo escolhe o comprador nem o pre├ºo, s├│ decide aceitar/recusar a
  // oferta que chegar na caixa de entrada.
  transferListPlayerIds?: string[];
  sponsorTier?: string;   // 'local' | 'regional' | 'national' | 'global'
  sponsorName?: string;   // nome da marca na camisa
  boardObjectives?: BoardObjectivesState;
}

export const DEFAULT_FINANCES: ClubFinances = { budget: 20_000_000, wageBill: 0, weeklyIncome: 400_000 };

export function getFreeAgentPool(state: CareerState): Player[] {
  return state.freeAgentPool ?? [];
}

export function getTransferHistory(state: CareerState): TransferRecord[] {
  return state.transferHistory ?? [];
}

export function getTransferList(state: CareerState): string[] {
  return state.transferListPlayerIds ?? [];
}

/** Janela de transfer├¬ncias: rounds 1-5 e 19-24 (0-indexed: <=4 e 18-23). Fonte ├║nica ÔÇö
 *  antes duplicada em 3 lugares (CareerHubScreen, 2x em useCareerManager). */
export function isTransferWindowOpen(round: number): boolean {
  return round <= 4 || (round >= 18 && round <= 23);
}

export function getFinances(state: CareerState): ClubFinances {
  if (state.finances) return state.finances;
  const userTeam = state.rosters[state.leagueId]?.find(t => t.id === state.season.league.userTeamId);
  const wageBill = userTeam ? computeWageBill(userTeam) : 0;
  return { ...DEFAULT_FINANCES, wageBill };
}

export function getSponsorTier(state: CareerState): string {
  return state.sponsorTier ?? getStartingTier(state.leagueId);
}

export function getSponsorName(state: CareerState): string {
  return state.sponsorName ?? generateSponsor(state.leagueId, state.season.league.userTeamId, getStartingTier(state.leagueId)).name;
}

export function getInbox(state: CareerState): InboxMessage[] {
  return state.inbox ?? [];
}

/**
 * Type guard defensivo para o valor persistido em localStorage `fp:career` ÔÇö
 * JSON pode ser editado manualmente no DevTools, ent├úo nunca confiamos no shape
 * sem checar. Nunca lan├ºa, sempre retorna boolean.
 */
export function isValidCareerState(x: unknown): x is CareerState {
  if (x === null || typeof x !== 'object') return false;
  const obj = x as Record<string, unknown>;
  if (obj.version !== 1) return false;
  if (typeof obj.leagueId !== 'string') return false;
  if (obj.manager === null || typeof obj.manager !== 'object') return false;
  const manager = obj.manager as Record<string, unknown>;
  if (typeof manager.name !== 'string') return false;
  if (typeof manager.reputation !== 'number') return false;
  if (typeof obj.currentSeasonYear !== 'number') return false;
  if (obj.season === null || typeof obj.season !== 'object') return false;
  const season = obj.season as Record<string, unknown>;
  if (season.league === null || typeof season.league !== 'object') return false;
  if (season.cup === null || typeof season.cup !== 'object') return false;
  if (typeof season.tradesUsedThisSeason !== 'number') return false;
  if (obj.rosters === null || typeof obj.rosters !== 'object') return false;
  if (!Array.isArray(obj.history)) return false;
  return true;
}

// =============================================================================
// PROGRESS├âO ÔÇö envelhecimento e evolu├º├úo de OVR
// =============================================================================

/** Curva de evolu├º├úo de OVR por idade (D-02): crescimento at├® 23, pico 28-30, decl├¡nio ap├│s 31. */
export function ageOvrDelta(age: number): number {
  if (age <= 23) return 2;
  if (age <= 27) return 1;
  if (age <= 30) return 0;
  if (age <= 33) return -2;
  return -4;
}

/** Atribui idade inicial a jogadores sem `.age` ÔÇö goleiros tendem a ser mais velhos. Idempotente. */
export function assignInitialAges(teams: Team[], rng: () => number = Math.random): Team[] {
  return teams.map(team => ({
    ...team,
    squad: team.squad.map(player => {
      if (player.age != null) return player;
      const age = player.position === 'GK'
        ? 22 + Math.floor(rng() * 15)
        : 18 + Math.floor(rng() * 17);
      return { ...player, age };
    }),
  }));
}

/**
 * Evolui um jogador uma temporada: recalcula OVR alvo com base na curva de idade
 * + varia├º├úo de "desempenho recente" (-2..+2), escala os atributos existentes
 * proporcionalmente ao novo OVR em vez de regener├í-los do zero.
 * Preserva id, name, number (identidade do jogador).
 */
export function progressPlayer(player: Player, rng: () => number = Math.random): Player {
  const age = player.age ?? 26;
  const currentOvr = playerOvr(player);
  const delta = ageOvrDelta(age) + (Math.floor(rng() * 5) - 2);
  const newTargetOvr = Math.max(40, Math.min(95, currentOvr + delta));
  const scale = newTargetOvr / currentOvr;
  const scaleAttr = (v: number) => Math.max(1, Math.min(99, Math.round(v * scale)));
  return {
    id: player.id,
    name: player.name,
    number: player.number,
    position: player.position,
    currentFatigue: 0,
    attributes: {
      speed: scaleAttr(player.attributes.speed),
      stamina: scaleAttr(player.attributes.stamina),
      passing: scaleAttr(player.attributes.passing),
      finishing: scaleAttr(player.attributes.finishing),
      tackling: scaleAttr(player.attributes.tackling),
      dribbling: scaleAttr(player.attributes.dribbling),
      vision: scaleAttr(player.attributes.vision),
      positioning: scaleAttr(player.attributes.positioning),
    },
    age: age + 1,
  };
}

/** Chance de aposentadoria cresce a partir dos 34 anos, clampada em 90%. */
export function shouldRetire(age: number, rng: () => number = Math.random): boolean {
  if (age < 34) return false;
  const chance = Math.min(0.9, (age - 33) * 0.15);
  return rng() < chance;
}

/** Gera um jovem substituto (18-20 anos) pra ocupar a vaga de um jogador aposentado. */
export function generateReplacementPlayer(retiring: Player, rng: () => number = Math.random): Player {
  const youngAge = 18 + Math.floor(rng() * 3);
  const targetOvr = Math.max(45, Math.min(70, playerOvr(retiring) - 10 + Math.floor(rng() * 10)));
  const id = `${retiring.id}-yng-${Math.floor(rng() * 1e6)}`;
  const name = generateRandomName(rng);
  return {
    ...generatePlayer(id, name, retiring.number, retiring.position, targetOvr),
    age: youngAge,
  };
}

/** Evolui todo o elenco de um time: aposenta jogadores 34+ (probabil├¡stico) e progride os demais. */
export function progressTeamRoster(team: Team, rng: () => number = Math.random): Team {
  return {
    ...team,
    squad: team.squad.map(player =>
      shouldRetire(player.age ?? 26, rng)
        ? generateReplacementPlayer(player, rng)
        : progressPlayer(player, rng)
    ),
  };
}

/** Evolui os elencos de TODAS as ligas de uma vez (D-01) ÔÇö sem filtro de "liga aberta pelo usu├írio". */
export function progressAllLeagues(rosters: Record<string, Team[]>, rng: () => number = Math.random): Record<string, Team[]> {
  const result: Record<string, Team[]> = {};
  for (const [leagueId, teams] of Object.entries(rosters)) {
    result[leagueId] = teams.map(t => progressTeamRoster(t, rng));
  }
  return result;
}

// =============================================================================
// TEMPORADA ÔÇö constru├º├úo conjunta de liga + copa (D-13)
// =============================================================================

/**
 * Cria a liga e a copa de uma nova temporada da carreira, no mesmo formato usado
 * por handleStartLeague/handleStartBracket ÔÇö garante estruturalmente que liga e
 * copa nascem juntas toda temporada (D-13), nunca uma sem a outra.
 */
export function createCareerSeason(
  userTeam: Team,
  leagueTeams: Team[],
  leagueDef: LeagueDefinition,
  rng: () => number = Math.random
): { league: LeagueState; cup: BracketState } {
  const rest = leagueTeams.filter(t => t.id !== userTeam.id).map(t => cloneTeam(t));
  const teams = [cloneTeam(userTeam), ...rest];
  const fixtures = generateLeagueSchedule(teams);
  const league: LeagueState = { teams, userTeamId: userTeam.id, fixtures, currentRound: 0, phase: 'playing' };

  const others = shuffle(leagueTeams.filter(t => t.id !== userTeam.id), rng)
    .slice(0, 15)
    .map(t => cloneTeam(t));
  const cup = createBracket(cloneTeam(userTeam), others, leagueDef.cupName, leagueDef.id, rng);

  return { league, cup };
}

// =============================================================================
// TRANSFER├èNCIAS (D-05, D-06)
// =============================================================================

/** Avalia se um clube CPU aceita uma proposta de troca ÔÇö considera valor da oferta, super├ívit na posi├º├úo, reputa├º├úo do manager e um eventual valor em dinheiro somado ├á troca. */
export function evaluateTradeOffer(
  offeredPlayer: Player,
  requestedPlayer: Player,
  cpuSquad: Player[],
  managerReputation: number,
  rng: () => number = Math.random,
  cashOffered: number = 0,
): { accepted: boolean; reason: string } {
  const offeredOvr = playerOvr(offeredPlayer);
  const requestedOvr = playerOvr(requestedPlayer);
  const ovrDelta = offeredOvr - requestedOvr;
  const samePositionCount = cpuSquad.filter(p => p.position === requestedPlayer.position).length;
  const surplus = samePositionCount > 3;
  let acceptChance = 0.5 + ovrDelta * 0.04;
  if (surplus) acceptChance += 0.15;
  acceptChance += Math.min(0.2, managerReputation * 0.002);
  // Dinheiro s├│ empurra a chance pra cima em cima da avalia├º├úo por OVR j├í existente ÔÇö
  // n├úo substitui (mant├®m TradeProposalScreen coexistindo com o mercado, por decis├úo
  // registrada em PLANO_CLOUD_MERCADO.md).
  if (cashOffered > 0) {
    const requestedValue = calculateMarketValue(requestedPlayer);
    if (requestedValue > 0) acceptChance += Math.min(0.3, (cashOffered / requestedValue) * 0.6);
  }
  acceptChance = Math.max(0.02, Math.min(0.95, acceptChance));
  return {
    accepted: rng() < acceptChance,
    reason: ovrDelta >= 0 ? 'value-favorable' : 'value-unfavorable',
  };
}

// =============================================================================
// REPUTA├ç├âO (D-08, D-09)
// =============================================================================

/** Delta de reputa├º├úo ao fim de temporada ÔÇö t├¡tulos dominam, posi├º├úo na tabela ajusta a margem. */
export function computeReputationDelta(input: {
  leagueChampion: boolean;
  cupChampion: boolean;
  leaguePosition: number;
  totalTeams: number;
}): number {
  let delta = 0;
  if (input.leagueChampion) delta += 15;
  if (input.cupChampion) delta += 10;
  const third = Math.ceil(input.totalTeams / 3);
  const topThird = input.leaguePosition <= third;
  const bottomThird = input.leaguePosition > input.totalTeams - third;
  if (!input.leagueChampion && topThird) delta += 3;
  if (bottomThird) delta -= 3;
  return delta;
}

// =============================================================================
// COPA ÔÇö deriva├º├úo do resultado do usu├írio a partir do bracket final
// =============================================================================

/** Deriva o resultado do usu├írio na copa a partir do bracket resolvido ÔÇö s├│ chamado quando cup.stage === 'champion'. */
export function deriveCupResult(cup: BracketState, userTeamId: string): CareerSeasonHistoryEntry['cupResult'] {
  if (cup.stage !== 'champion') return 'not-played';
  if (cup.championId === userTeamId) return 'champion';
  if (cup.final.homeTeamId === userTeamId || cup.final.awayTeamId === userTeamId) return 'runner-up';
  if (cup.semiFinals.some(m => m.homeTeamId === userTeamId || m.awayTeamId === userTeamId)) return 'semifinal';
  if (cup.quarterFinals.some(m => m.homeTeamId === userTeamId || m.awayTeamId === userTeamId)) return 'quarterfinal';
  return 'roundOf16';
}
