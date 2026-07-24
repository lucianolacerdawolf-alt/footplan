import type { Team } from './types';

export function moraleDelta(userScore: number, oppScore: number): number {
  return userScore > oppScore ? 2 : userScore === oppScore ? 0 : -2;
}

export function applyMoraleToTeam(t: Team, current: number, delta: number): Team {
  return { ...t, morale: Math.max(-10, Math.min(10, current + delta)) };
}
