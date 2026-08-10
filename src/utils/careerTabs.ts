import type { Screen } from '../types/navigation';

export type CareerTab = 'central' | 'elenco' | 'transferencias' | 'meu-clube' | 'escritorio';

/** Telas em que a barra de abas do Modo Carreira aparece — setup/match/stats/season-end
 *  ficam de fora de propósito (mesma imersão sem chrome de quando se joga uma partida). */
export const CAREER_TAB_SCREENS: ReadonlySet<Screen> = new Set([
  'career-hub', 'transfer-market', 'career-trophy-room',
  'career-league', 'career-league-table', 'career-bracket',
  'career-job-market', 'career-continental',
]);

const SCREEN_TO_TAB: Partial<Record<Screen, CareerTab>> = {
  'career-hub': 'central',
  'transfer-market': 'transferencias',
  'career-trophy-room': 'meu-clube',
  'career-league': 'escritorio',
  'career-league-table': 'escritorio',
  'career-bracket': 'escritorio',
  'career-job-market': 'escritorio',
  'career-continental': 'escritorio',
};

export function getCareerTabForScreen(screen: Screen): CareerTab | null {
  return SCREEN_TO_TAB[screen] ?? null;
}
