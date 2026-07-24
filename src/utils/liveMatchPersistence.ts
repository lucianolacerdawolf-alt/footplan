import type { Team, MatchEvent } from '../engine/types';
import type { MatchState } from '../engine/matchEngine';

export type SubWindow = 'firstHalfPause' | 'halftime' | 'secondHalfPause';

/** MatchState com Map/Set trocados por arrays — a única parte não-serializável direto. */
export interface SerializedMatchState {
  fatigueHome: Array<[string, number]>;
  fatigueAway: Array<[string, number]>;
  homeScore: number;
  awayScore: number;
  homePossessionWins: number;
  awayPossessionWins: number;
  events: MatchEvent[];
  cards: Array<[string, 'yellow' | 'red']>;
  momentumHome: number;
  momentumAway: number;
  injured: string[];
  consecutiveGoalTeam: string | null;
  gkFormHome: number;
  gkFormAway: number;
  halftimeHomeScore: number;
  halftimeAwayScore: number;
}

export function serializeMatchState(state: MatchState): SerializedMatchState {
  return {
    fatigueHome: [...state.fatigueHome.entries()],
    fatigueAway: [...state.fatigueAway.entries()],
    homeScore: state.homeScore,
    awayScore: state.awayScore,
    homePossessionWins: state.homePossessionWins,
    awayPossessionWins: state.awayPossessionWins,
    events: state.events,
    cards: [...state.cards.entries()],
    momentumHome: state.momentumHome,
    momentumAway: state.momentumAway,
    injured: [...state.injured],
    consecutiveGoalTeam: state.consecutiveGoalTeam,
    gkFormHome: state.gkFormHome,
    gkFormAway: state.gkFormAway,
    halftimeHomeScore: state.halftimeHomeScore,
    halftimeAwayScore: state.halftimeAwayScore,
  };
}

export function deserializeMatchState(s: SerializedMatchState): MatchState {
  return {
    fatigueHome: new Map(s.fatigueHome),
    fatigueAway: new Map(s.fatigueAway),
    homeScore: s.homeScore,
    awayScore: s.awayScore,
    homePossessionWins: s.homePossessionWins,
    awayPossessionWins: s.awayPossessionWins,
    events: s.events,
    cards: new Map(s.cards),
    momentumHome: s.momentumHome,
    momentumAway: s.momentumAway,
    injured: new Set(s.injured),
    consecutiveGoalTeam: s.consecutiveGoalTeam,
    gkFormHome: s.gkFormHome,
    gkFormAway: s.gkFormAway,
    halftimeHomeScore: s.halftimeHomeScore,
    halftimeAwayScore: s.halftimeAwayScore,
  };
}

export interface LiveMatchSnapshot {
  version: 2;
  savedAt: number;
  matchContext: 'regular' | 'league' | 'bracket' | 'online';
  isKnockout: boolean;
  initialHome: Team;
  initialAway: Team;
  continueLabel?: string;
  // Estado de tela do MatchScreen
  home: Team;
  away: Team;
  subsHome: number;
  subsAway: number;
  subWindowsHome: Record<SubWindow, number>;
  subWindowsAway: Record<SubWindow, number>;
  injuredIds: string[];
  speed: number;
  // Estado do motor/replay (useMatchSimulation)
  phase: 'idle' | 'simulating' | 'halftime' | 'done';
  isFirstHalf: boolean;
  nextCycle: number;
  clockSeconds: number;
  homeScore: number;
  awayScore: number;
  replayEvents: MatchEvent[];
  fatigueMap: Record<string, number>;
  expelledIds: string[];
  pausesRemaining: number;
  engineState: SerializedMatchState | null;
}

export const LIVE_MATCH_KEY = 'fp:liveMatch';

export function saveLiveMatch(snapshot: LiveMatchSnapshot): void {
  try {
    localStorage.setItem(LIVE_MATCH_KEY, JSON.stringify(snapshot));
  } catch { /* noop — quota cheia ou storage indisponível, não é crítico */ }
}

export function loadLiveMatch(): LiveMatchSnapshot | null {
  try {
    const raw = localStorage.getItem(LIVE_MATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveMatchSnapshot;
    if (parsed.version !== 2) return null;
    if (parsed.phase === 'done') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLiveMatch(): void {
  try { localStorage.removeItem(LIVE_MATCH_KEY); } catch { /* noop */ }
}
