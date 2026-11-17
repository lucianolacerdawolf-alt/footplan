import { describe, it, expect } from 'vitest';
import { calibratedOvr, calibratePlayer, calibrateLeagueTeams, LEAGUE_RATING } from '../ratingCalibration';
import { playerOvr } from '@/utils/playerOvr';
import { getLeague } from '@/data/leagues';

describe('calibração das notas por liga', () => {
  it('comprime o topo pra faixas realistas', () => {
    expect(calibratedOvr(98, 'pl')).toBeLessThanOrEqual(91);   // Haaland
    expect(calibratedOvr(94, 'pl')).toBeLessThanOrEqual(88);   // Van Dijk
    expect(calibratedOvr(96, 'laliga')).toBeLessThanOrEqual(93); // Mbappé
  });

  it('níveis em ordem: 1ª divisão acima da 2ª do mesmo país', () => {
    const pairs: Array<[string, string]> = [['pl', 'championship'], ['laliga', 'laliga2'], ['bundesliga', 'bundesliga2'], ['serieA', 'serieB'], ['ligue1', 'ligue2'], ['ligaPortugal', 'ligaPortugal2']];
    for (const [top, second] of pairs) {
      expect(LEAGUE_RATING[top].target).toBeGreaterThan(LEAGUE_RATING[second].target);
      // mesmo jogador "mediano" de cada liga
      expect(calibratedOvr(LEAGUE_RATING[top].ref, top)).toBeGreaterThan(calibratedOvr(LEAGUE_RATING[second].ref, second));
    }
  });

  it('preserva a ordem e é idempotente (não comprime de novo)', () => {
    const teams = getLeague('pl')!.teams;
    const once = calibrateLeagueTeams(teams, 'pl');
    const twice = calibrateLeagueTeams(once, 'pl');
    expect(twice).toEqual(once);
    const a = teams[0].squad[0], b = teams[0].squad[1];
    const ca = calibratePlayer(a, 'pl'), cb = calibratePlayer(b, 'pl');
    if (playerOvr(a) > playerOvr(b) + 2) expect(playerOvr(ca)).toBeGreaterThanOrEqual(playerOvr(cb));
  });

  it('liga desconhecida não muda nada', () => {
    const t = getLeague('pl')!.teams;
    expect(calibrateLeagueTeams(t, 'mls')).toBe(t);
  });
});
