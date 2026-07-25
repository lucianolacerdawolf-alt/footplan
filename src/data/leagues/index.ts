export { premierLeague } from './premierLeague';
export { laLiga } from './laLiga';
export { bundesliga } from './bundesliga';
export { serieA } from './serieA';
export { ligue1 } from './ligue1';
export { ligaPortugal } from './ligaPortugal';
export { championship } from './championship';
export { laliga2 } from './laLiga2';
export { bundesliga2 } from './bundesliga2';
export { serieB } from './serieB';
export { ligue2 } from './ligue2';
export { ligaPortugal2 } from './ligaPortugal2';
export type { LeagueDefinition } from './types';

import { premierLeague } from './premierLeague';
import { laLiga } from './laLiga';
import { bundesliga } from './bundesliga';
import { serieA } from './serieA';
import { ligue1 } from './ligue1';
import { ligaPortugal } from './ligaPortugal';
import { championship } from './championship';
import { laliga2 } from './laLiga2';
import { bundesliga2 } from './bundesliga2';
import { serieB } from './serieB';
import { ligue2 } from './ligue2';
import { ligaPortugal2 } from './ligaPortugal2';
import type { LeagueDefinition } from './types';

export const allLeagues: LeagueDefinition[] = [
  premierLeague, laLiga, bundesliga, serieA, ligue1, ligaPortugal,
  championship, laliga2, bundesliga2, serieB, ligue2, ligaPortugal2,
];

export function getLeague(id: string): LeagueDefinition | undefined {
  return allLeagues.find(l => l.id === id);
}
