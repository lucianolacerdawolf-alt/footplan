export { premierLeague } from './premierLeague';
export { laLiga } from './laLiga';
export { bundesliga } from './bundesliga';
export { serieA } from './serieA';
export type { LeagueDefinition } from './types';

import { premierLeague } from './premierLeague';
import { laLiga } from './laLiga';
import { bundesliga } from './bundesliga';
import { serieA } from './serieA';
import type { LeagueDefinition } from './types';

export const allLeagues: LeagueDefinition[] = [premierLeague, laLiga, bundesliga, serieA];

export function getLeague(id: string): LeagueDefinition | undefined {
  return allLeagues.find(l => l.id === id);
}
