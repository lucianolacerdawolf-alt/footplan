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
  isDerby: boolean;
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
    isDerby: state.isDerby,
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
    isDerby: s.isDerby,
  };
}

export interface LiveMatchSnapshot {
  version: 3;
  savedAt: number;
  matchContext: 'regular' | 'league' | 'bracket' | 'online';
  isKnockout: boolean;
  initialHome: Team;
  initialAway: Team;
  continueLabel?: string;
  home: Team;
  away: Team;
  subsHome: number;
  subsAway: number;
  subWindowsHome: Record<SubWindow, number>;
  subWindowsAway: Record<SubWindow, number>;
  injuredIds: string[];
  speed: number;
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
  /** Contexto de partida de torneio/carreira — pra restaurar no mesmo fixture após F5. */
  leagueId?: string;
  matchRoundIdx?: number;
  matchFixtureIdx?: number;
  matchBracketStage?: string;
  matchBracketIdx?: number;
  /** Copa doméstica ('cup', default) vs continental ('continental') — roteia o
   *  resultado ao campo certo do save após um reload no meio da partida. */
  matchBracketKind?: 'cup' | 'continental';
  isCareer?: boolean;
}

export const LIVE_MATCH_KEY = 'fp:liveMatch';
export const LIVE_MATCH_META_KEY = 'fp:liveMatchMeta';

export interface LiveMatchMeta {
  matchContext: 'regular' | 'league' | 'bracket' | 'online';
  roundIdx?: number;
  fixtureIdx?: number;
  bracketStage?: string;
  bracketIdx?: number;
  bracketKind?: 'cup' | 'continental';
  isCareer?: boolean;
}

export function saveLiveMatchMeta(meta: LiveMatchMeta): void {
  try { localStorage.setItem(LIVE_MATCH_META_KEY, JSON.stringify(meta)); } catch {}
}

export function loadLiveMatchMeta(): LiveMatchMeta | null {
  try {
    const raw = localStorage.getItem(LIVE_MATCH_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LiveMatchMeta;
  } catch { return null; }
}

export function clearLiveMatchMeta(): void {
  try { localStorage.removeItem(LIVE_MATCH_META_KEY); } catch {}
}

export function saveLiveMatch(snapshot: LiveMatchSnapshot): void {
  try {
    localStorage.setItem(LIVE_MATCH_KEY, JSON.stringify(snapshot));
  } catch { /* noop — quota cheia ou storage indisponível, não é crítico */ }
}

export function loadLiveMatch(): LiveMatchSnapshot | null {
  try {
    const raw = localStorage.getItem(LIVE_MATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.version !== 2 && parsed.version !== 3) return null;
    if (parsed.phase === 'done') return null;
    return parsed as unknown as LiveMatchSnapshot;
  } catch {
    return null;
  }
}

export function clearLiveMatch(): void {
  try { localStorage.removeItem(LIVE_MATCH_KEY); } catch { /* noop */ }
}
