// =============================================================================
// MODELO DE DADOS - Entidades principais do jogo
// =============================================================================

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export type Formation = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1' | '5-3-2';

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
}

// =============================================================================
// ESTRATÉGIA / TÁTICA
// =============================================================================
export type DefensiveLine = 'high' | 'normal' | 'low';
export type Width = 'narrow' | 'normal' | 'wide';

export interface Strategy {
  formation: Formation;
  mentality: Mentality;
  intensity: Intensity;
  defensiveLine: DefensiveLine;
  width: Width;
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
  kicks: Array<{ teamId: string; scored: boolean }>;
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
  // Optional knockout fields (populated only for elimination matches)
  wentToExtraTime?: boolean;
  extraTimeHomeScore?: number;
  extraTimeAwayScore?: number;
  penaltyResult?: PenaltyResult;
  winner?: Team;
}
