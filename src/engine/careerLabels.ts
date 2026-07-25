import type { CareerSeasonHistoryEntry } from './career';

export const CUP_RESULT_LABELS: Record<CareerSeasonHistoryEntry['cupResult'], string> = {
  champion: 'Campeão',
  'runner-up': 'Vice-campeão',
  semifinal: 'Semifinal',
  quarterfinal: 'Quartas de final',
  roundOf16: 'Oitavas de final',
  'not-played': 'Não disputada',
};
