import type { Player, Position, Team } from './types';
import type { LeagueState, BracketState, BracketMatch } from './tournament';
import type { LeagueDefinition } from '../data/leagues/types';
// type-only: boardObjectives importa CareerState de volta, mas imports de tipo
// são apagados na compilação — não há ciclo em runtime.
import type { BoardObjectivesState } from './boardObjectives';
import { createBracket, generateLeagueSchedule } from './tournament';
import { generatePlayer, generateRandomName } from '../data/leagues/generateTeam';
import { playerOvr } from '../utils/playerOvr';
import { calculateMarketValue, calculateWeeklyWage, computeWageBill, renewalCost } from './transferMarket';
import { cloneTeam } from '../utils/teamUtils';
import { shuffle } from './rng';
import { getStartingTier, generateSponsor } from './sponsors';

// =============================================================================
// TIPOS — Modo Carreira
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
  // Campos abaixo são opcionais — temporadas fechadas antes da Fase 4.5 não os têm.
  // leagueTopScorer/cupTopScorer/userTopAssister ficaram de fora desta versão:
  // partidas simuladas automaticamente (CPU x CPU) não geram eventos de gol
  // individuais hoje, só placar agregado — e não existe rastreio de assistência
  // no motor. Rastrear isso exigiria mudar o motor de simulação rápida, fora do
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
  isMandatory: boolean; // precisa ser lida pra liberar "Avançar Rodada"
  type: 'TRANSFER_OFFER' | 'BOARD_UPDATE' | 'INJURY_REPORT' | 'MATCH_PREVIEW';
  subject: string;
  body: string;
  // Payload estruturado — só populado em TRANSFER_OFFER, é o que permite os botões
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
  amount: number;   // parte em dinheiro; 0 numa TRADE sem compensação
}

export interface CareerState {
  version: 1;
  leagueId: string;
  manager: CareerManagerProfile;
  currentSeasonYear: number;
  season: {
    league: LeagueState; cup: BracketState; tradesUsedThisSeason: number;
    // Opcionais pelo mesmo motivo dos campos de nível CareerState (compat com saves antigos).
    budgetAtSeasonStart?: number;       // pra calcular o budgetDelta no fechamento da temporada
    userGoalScorers?: Record<string, number>; // nome do jogador → gols na temporada (liga + copa)
  };
  rosters: Record<string, Team[]>;
  history: CareerSeasonHistoryEntry[];
  // Opcionais: carreiras salvas antes da Fase 4.5 não têm esses campos — todo
  // ponto de leitura usa getFinances/getInbox (nunca acessa direto), e toda
  // escrita parte do valor lido por elas, então uma carreira antiga se
  // "autopreenche" na primeira rodada avançada/partida jogada depois do update.
  finances?: ClubFinances;
  inbox?: InboxMessage[];
  freeAgentPool?: Player[];
  transferHistory?: TransferRecord[];
  // Jogadores que o usuário colocou à venda — a cada rodada com a janela aberta,
  // qualquer time do jogo pode fazer uma oferta (ver handleNextCareerLeagueRound).
  // O usuário não escolhe o comprador nem o preço, só decide aceitar/recusar a
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

/** Janela de transferências: rounds 1-5 e 19-24 (0-indexed: <=4 e 18-23). Fonte única —
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
 * Type guard defensivo para o valor persistido em localStorage `fp:career` —
 * JSON pode ser editado manualmente no DevTools, então nunca confiamos no shape
 * sem checar. Nunca lança, sempre retorna boolean.
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
// PROGRESSÃO — envelhecimento e evolução de OVR
// =============================================================================

/** Curva de evolução de OVR por idade (D-02): crescimento até 23, pico 28-30, declínio após 31. */
export function ageOvrDelta(age: number): number {
  if (age <= 23) return 2;
  if (age <= 27) return 1;
  if (age <= 30) return 0;
  if (age <= 33) return -2;
  return -4;
}

/** Atribui idade inicial a jogadores sem `.age` — goleiros tendem a ser mais velhos. Idempotente. */
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

// =============================================================================
// CONTRATOS — Fase 1 (Contratos & Renovações)
// =============================================================================

/** Fallback pra saves antigos e jogadores sem contrato registrado (ex: recém-contratados). */
export const DEFAULT_CONTRACT_SEASONS = 2;

/** Lê temporadas restantes de contrato com backfill — nunca acessar o campo direto. */
export function getContractSeasonsLeft(player: Player): number {
  return player.contractSeasonsLeft ?? DEFAULT_CONTRACT_SEASONS;
}

/** Atribui contrato inicial (1-4 temporadas, com peso em 2-3) a quem não tem — idempotente,
 *  espelha assignInitialAges. */
export function assignInitialContracts(teams: Team[], rng: () => number = Math.random): Team[] {
  return teams.map(team => ({
    ...team,
    squad: team.squad.map(player => {
      if (player.contractSeasonsLeft != null) return player;
      const roll = rng();
      const contractSeasonsLeft = roll < 0.15 ? 1 : roll < 0.7 ? 2 : roll < 0.95 ? 3 : 4;
      return { ...player, contractSeasonsLeft };
    }),
  }));
}

/** Estende o contrato e recalcula o salário pelo valor de mercado atual. Retorna o jogador
 *  atualizado + o custo (renewalCost) — usado pelo hook (grava na carreira) e pelo SetupScreen
 *  (sincroniza o clone local), sem duplicar lógica. */
export function renewPlayerContract(player: Player, years: number): { player: Player; cost: number } {
  const marketValue = calculateMarketValue(player);
  const cost = renewalCost(player, years);
  const weeklyWage = calculateWeeklyWage(marketValue);
  return {
    player: {
      ...player,
      contractSeasonsLeft: getContractSeasonsLeft(player) + years,
      weeklyWage,
    },
    cost,
  };
}

/**
 * Fechamento de temporada: decrementa `contractSeasonsLeft` de todo o elenco do usuário; quem
 * chega a 0 sai do elenco e vira agente livre. O time já deve estar evoluído (progressAllLeagues)
 * — os que saem não são envelhecidos de novo aqui. Saem sem contrato (undefined → o getter dá o
 * default se forem contratados de novo) e com marketValue/weeklyWage recalculados. O pool final é
 * montado pelo caller via refreshFreeAgentPool(..., departures).
 */
export function expireContracts(
  userTeam: Team,
): { squad: Player[]; departures: Player[] } {
  const squad: Player[] = [];
  const departures: Player[] = [];
  for (const player of userTeam.squad) {
    const left = getContractSeasonsLeft(player) - 1;
    if (left <= 0) {
      const marketValue = calculateMarketValue(player);
      departures.push({
        ...player,
        contractSeasonsLeft: undefined,
        marketValue,
        weeklyWage: calculateWeeklyWage(marketValue),
      });
    } else {
      squad.push({ ...player, contractSeasonsLeft: left });
    }
  }
  return { squad, departures };
}

/**
 * Evolui um jogador uma temporada: recalcula OVR alvo com base na curva de idade
 * + variação de "desempenho recente" (-2..+2), escala os atributos existentes
 * proporcionalmente ao novo OVR em vez de regenerá-los do zero.
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
    // Campos opcionais que representam identidade/gestão da carreira precisam
    // sobreviver à evolução — senão contractSeasonsLeft sumiria a cada temporada
    // (marketValue/weeklyWage são re-aplicados depois por assignMarketValues).
    contractSeasonsLeft: player.contractSeasonsLeft,
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

/** Evolui todo o elenco de um time: aposenta jogadores 34+ (probabilístico) e progride os demais. */
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

/** Evolui os elencos de TODAS as ligas de uma vez (D-01) — sem filtro de "liga aberta pelo usuário". */
export function progressAllLeagues(rosters: Record<string, Team[]>, rng: () => number = Math.random): Record<string, Team[]> {
  const result: Record<string, Team[]> = {};
  for (const [leagueId, teams] of Object.entries(rosters)) {
    result[leagueId] = teams.map(t => progressTeamRoster(t, rng));
  }
  return result;
}

// =============================================================================
// TEMPORADA — construção conjunta de liga + copa (D-13)
// =============================================================================

/**
 * Cria a liga e a copa de uma nova temporada da carreira, no mesmo formato usado
 * por handleStartLeague/handleStartBracket — garante estruturalmente que liga e
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
// TRANSFERÊNCIAS (D-05, D-06)
// =============================================================================

/** Avalia se um clube CPU aceita uma proposta de troca — considera valor da oferta, superávit na posição, reputação do manager e um eventual valor em dinheiro somado à troca. */
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
  // Dinheiro só empurra a chance pra cima em cima da avaliação por OVR já existente —
  // não substitui (mantém TradeProposalScreen coexistindo com o mercado, por decisão
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
// REPUTAÇÃO (D-08, D-09)
// =============================================================================

/** Delta de reputação ao fim de temporada — títulos dominam, posição na tabela ajusta a margem. */
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
// COPA — derivação do resultado do usuário a partir do bracket final
// =============================================================================

/** Deriva o resultado do usuário na copa a partir do bracket resolvido — só chamado quando cup.stage === 'champion'. */
/**
 * Fase que o usuário alcançou ATÉ AGORA, com a copa ainda em andamento.
 * `deriveCupResult` devolve 'not-played' enquanto a copa não terminou, então não
 * serve pra mostrar progresso no meio da temporada.
 */
export function deriveCupProgress(
  cup: BracketState,
  userTeamId: string,
): { stage: CareerSeasonHistoryEntry['cupResult']; eliminated: boolean } {
  const inMatch = (m: BracketMatch) => m.homeTeamId === userTeamId || m.awayTeamId === userTeamId;

  if (cup.championId === userTeamId) return { stage: 'champion', eliminated: false };

  // Sem nenhum jogo pendente e sem o título: caiu em algum momento.
  const todas = [...cup.roundOf16, ...cup.quarterFinals, ...cup.semiFinals, cup.final];
  const eliminated = !todas.some(m => !m.played && inMatch(m));

  // Fase mais profunda em que o usuário aparece.
  if (inMatch(cup.final)) return { stage: 'runner-up', eliminated };
  if (cup.semiFinals.some(inMatch)) return { stage: 'semifinal', eliminated };
  if (cup.quarterFinals.some(inMatch)) return { stage: 'quarterfinal', eliminated };
  if (cup.roundOf16.some(inMatch)) return { stage: 'roundOf16', eliminated };
  return { stage: 'not-played', eliminated: true };
}

export function deriveCupResult(cup: BracketState, userTeamId: string): CareerSeasonHistoryEntry['cupResult'] {
  if (cup.stage !== 'champion') return 'not-played';
  if (cup.championId === userTeamId) return 'champion';
  if (cup.final.homeTeamId === userTeamId || cup.final.awayTeamId === userTeamId) return 'runner-up';
  if (cup.semiFinals.some(m => m.homeTeamId === userTeamId || m.awayTeamId === userTeamId)) return 'semifinal';
  if (cup.quarterFinals.some(m => m.homeTeamId === userTeamId || m.awayTeamId === userTeamId)) return 'quarterfinal';
  return 'roundOf16';
}
