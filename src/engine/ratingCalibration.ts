import type { Player, Team } from './types';
import { playerOvr } from '../utils/playerOvr';

// =============================================================================
// Calibração das notas por liga
// =============================================================================
// As notas dos jogadores conhecidos (estático + sync) estavam infladas e com os níveis
// trocados: Haaland 98, Van Dijk 94, Ligue 2 (mediana 75) acima da Ligue 1 (73).
// Sem fonte livre de nota real por jogador, calibra por liga, preservando a ordem:
//
//   nova = alvo + (nota − referência) × COMPRESSÃO
//
// `ref` = mediana medida da força dos titulares da liga nos dados brutos (2026-11-17);
// `target` = força típica daquele nível. A compressão puxa o topo pra faixas realistas
// (Haaland ~90, Mbappé ~92). Cada jogador calibrado ganha `ratingCalibrated`, então
// reaplicar não comprime de novo (o snapshot do dia anterior é reaproveitado).

export const RATING_COMPRESSION = 0.65;

export const LEAGUE_RATING: Record<string, { ref: number; target: number }> = {
  pl: { ref: 81, target: 79 },
  laliga: { ref: 74, target: 78 },
  bundesliga: { ref: 77, target: 77 },
  serieA: { ref: 77, target: 77 },
  ligue1: { ref: 73, target: 75 },
  ligaPortugal: { ref: 70, target: 72 },
  championship: { ref: 71, target: 69 },
  laliga2: { ref: 75, target: 67 },
  bundesliga2: { ref: 75, target: 68 },
  serieB: { ref: 74, target: 67 },
  ligue2: { ref: 75, target: 66 },
  ligaPortugal2: { ref: 71, target: 63 },
};

export function calibratedOvr(ovr: number, leagueId: string): number {
  const cfg = LEAGUE_RATING[leagueId];
  if (!cfg) return ovr;
  return Math.max(40, Math.min(95, Math.round(cfg.target + (ovr - cfg.ref) * RATING_COMPRESSION)));
}

export function calibratePlayer(player: Player, leagueId: string): Player {
  if (player.ratingCalibrated || !LEAGUE_RATING[leagueId]) return player;
  const current = playerOvr(player);
  const target = calibratedOvr(current, leagueId);
  const scale = current > 0 ? target / current : 1;
  const a = player.attributes;
  const s = (v: number) => Math.max(1, Math.min(99, Math.round(v * scale)));
  return {
    ...player,
    ratingCalibrated: true,
    attributes: {
      speed: s(a.speed), stamina: s(a.stamina), passing: s(a.passing), finishing: s(a.finishing),
      tackling: s(a.tackling), dribbling: s(a.dribbling), vision: s(a.vision), positioning: s(a.positioning),
    },
  };
}

/** Calibra os jogadores ainda não calibrados dos times de uma liga (idempotente). */
export function calibrateLeagueTeams(teams: Team[], leagueId: string): Team[] {
  if (!LEAGUE_RATING[leagueId]) return teams;
  return teams.map(t => {
    if (t.squad.every(p => p.ratingCalibrated)) return t;
    return { ...t, squad: t.squad.map(p => calibratePlayer(p, leagueId)) };
  });
}
