// =============================================================================
// MODELO DE DADOS - Entidades principais do jogo
// =============================================================================

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export type Formation = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1' | '5-3-2' | '3-4-3' | '4-1-4-1' | '4-4-1-1' | '3-4-2-1' | '4-3-1-2' | '5-4-1';

export type Mentality = 'possession' | 'counter-attack' | 'high-press' | 'defensive';

export type Intensity = 'low' | 'medium' | 'high';

export type EventType =
  | 'kickoff'
  | 'possession'
  | 'pass'
  | 'tackle'
  | 'attack'
  | 'goal'
  | 'miss'
  | 'post'
  | 'save'
  | 'corner'
  | 'foul'
  | 'offside'
  | 'yellowCard'
  | 'redCard'
  | 'injury'
  | 'penalty'
  | 'halftime'
  | 'fulltime'
  | 'extraTimeKickoff'
  | 'penaltyKick'
  | 'penaltyWin';

// =============================================================================
// ATRIBUTOS DO JOGADOR (escala 1-99)
// =============================================================================
export interface PlayerAttributes {
  speed: number;       // Velocidade
  stamina: number;     // Resistência
  passing: number;     // Passe
  finishing: number;   // Finalização
  tackling: number;    // Desarme
  dribbling: number;   // Drible
  vision: number;      // Visão
  positioning: number; // Posicionamento
}

// =============================================================================
// JOGADOR
// =============================================================================
export interface Player {
  id: string;
  name: string;
  number: number;
  position: Position;
  attributes: PlayerAttributes;
  currentFatigue: number; // Cansaço Atual (0-100, 0 = descansado)
  injuredRounds?: number; // > 0: jogador lesionado e indisponível
  age?: number; // Só populado em elencos do Modo Carreira
  nationality?: string; // Só populado em elencos sincronizados ao vivo (football-data.org)
  yellowCardsThisSeason?: number; // acúmulo de amarelos na temporada (Modo Carreira)
  isSuspended?: boolean;          // suspenso por vermelho ou acúmulo de amarelos
  suspendedRounds?: number;       // jogos restantes de suspensão
  marketValue?: number;           // valor de mercado calculado (Modo Carreira)
  weeklyWage?: number;            // salário semanal (Modo Carreira)
  contractSeasonsLeft?: number;   // temporadas restantes de contrato (Modo Carreira)
  lastRenewedSeasonYear?: number; // temporada em que renovou pela última vez (cooldown de renovação)
  contractGoal?: ContractGoal;    // cláusula de performance assinada na renovação (meta + bônus)
}

/** Meta de contrato (cláusula de performance): atingir `target` gols na temporada
 *  (liga + copa, via userGoalScorers) paga `bonus` no fechamento da safra. */
export interface ContractGoal {
  type: 'goals';
  target: number;
  bonus: number;
}

// =============================================================================
// ESTRATÉGIA / TÁTICA
// =============================================================================
export type DefensiveLine = 'high' | 'normal' | 'low';
export type Width = 'narrow' | 'normal' | 'wide';
export type CornerTactic = 'mixed' | 'nearPost' | 'farPost' | 'short';
export type FreeKickTactic = 'shoot' | 'cross' | 'short';

export interface Strategy {
  formation: Formation;
  mentality: Mentality;
  intensity: Intensity;
  defensiveLine: DefensiveLine;
  width: Width;
  cornerTactic?: CornerTactic;
  freeKickTactic?: FreeKickTactic;
}

export const DEFENSIVE_LINE_LABELS: Record<DefensiveLine, string> = {
  'high': 'Alta',
  'normal': 'Normal',
  'low': 'Baixa',
};

export const WIDTH_LABELS: Record<Width, string> = {
  'narrow': 'Estreito',
  'normal': 'Normal',
  'wide': 'Amplo',
};

export const CORNER_TACTIC_LABELS: Record<CornerTactic, string> = {
  'mixed': 'Misto',
  'nearPost': '1º Poste',
  'farPost': '2º Poste',
  'short': 'Curto',
};

export const FREEKICK_TACTIC_LABELS: Record<FreeKickTactic, string> = {
  'shoot': 'Chute Direto',
  'cross': 'Cruzamento',
  'short': 'Jogada Curta',
};

export const MENTALITY_LABELS: Record<Mentality, string> = {
  'possession': 'Posse de Bola',
  'counter-attack': 'Contra-Ataque',
  'high-press': 'Pressão Alta',
  'defensive': 'Retranca',
};

export const INTENSITY_LABELS: Record<Intensity, string> = {
  'low': 'Baixa',
  'medium': 'Média',
  'high': 'Alta',
};

// =============================================================================
// TIME
// =============================================================================
export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  color: string;            // cor primária (hex)
  secondaryColor: string;   // cor secundária / away (hex)
  logoUrl: string;          // URL do escudo oficial
  squad: Player[];
  strategy: Strategy;
  morale?: number;          // moral do time (-10 a +10, padrão 0)
  stadium?: string;         // nome do estádio
  capacity?: number;        // capacidade do estádio
}

// =============================================================================
// EVENTO DA PARTIDA (comentário minuto a minuto)
// =============================================================================
export interface MatchEvent {
  minute: number;
  type: EventType;
  description: string;
  teamId: string | null; // time que gerou o evento (null para eventos neutros)
  playerId?: string;     // jogador envolvido (preenchido em redCard/yellowCard)
  scorer?: string;       // nome do marcador (preenchido em goal)
  passerId?: string;     // quem deu o passe (preenchido em pass)
  receiverId?: string;   // quem recebeu o passe (preenchido em pass)
}

/** Função de aleatoriedade injetável — permite simulações determinísticas */
export type RandomFn = () => number;

// =============================================================================
// RESULTADO DA PARTIDA
// =============================================================================
export interface TeamStats {
  shots: number;
  shotsOnTarget: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
}

export interface PenaltyResult {
  homeScore: number;
  awayScore: number;
  winner: 'home' | 'away';
  /** Cada cobrança registra o id do cobrador — o log de eventos usa esse id pra
   *  narrar quem chutou, em vez de recomputar o índice (que divergia na morte
   *  súbita, onde a rodada continua de 5 em diante). */
  kicks: Array<{ teamId: string; scored: boolean; shooterId: string }>;
}

export interface MatchResult {
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  homePossession: number;
  awayPossession: number;
  homeStats: TeamStats;
  awayStats: TeamStats;
  // Halftime scores (populated when a halftime event exists)
  halftimeHomeScore?: number;
  halftimeAwayScore?: number;
  // Optional knockout fields (populated only for elimination matches)
  wentToExtraTime?: boolean;
  extraTimeHomeScore?: number;
  extraTimeAwayScore?: number;
  penaltyResult?: PenaltyResult;
  winner?: Team;
}
