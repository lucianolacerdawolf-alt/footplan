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
  | 'attack'
  | 'goal'
  | 'miss'
  | 'post'
  | 'save'
  | 'halftime'
  | 'fulltime';

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
}

// =============================================================================
// ESTRATÉGIA / TÁTICA
// =============================================================================
export interface Strategy {
  formation: Formation;
  mentality: Mentality;
  intensity: Intensity;
}

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
  squad: Player[];
  strategy: Strategy;
}

// =============================================================================
// EVENTO DA PARTIDA (comentário minuto a minuto)
// =============================================================================
export interface MatchEvent {
  minute: number;
  type: EventType;
  description: string;
  teamId: string | null; // time que gerou o evento (null para eventos neutros)
}

// =============================================================================
// RESULTADO DA PARTIDA
// =============================================================================
export interface MatchResult {
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  homePossession: number;   // percentual de posse do time da casa
  awayPossession: number;
}
