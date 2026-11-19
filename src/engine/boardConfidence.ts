// =============================================================================
// CONFIANÇA DA DIRETORIA — medidor 0-100 que se move a cada jogo
// =============================================================================
// Os objetivos da temporada só eram cobrados no fim (reputação). Agora a diretoria
// reage jogo a jogo: vitória sobre time mais forte vale mais, derrota como favorito
// pesa mais, meta fora de alcance e caixa no vermelho corroem a confiança. Chegou ao
// fundo → demissão (o técnico escolhe uma proposta de clube menor ou recomeça).

import type { Team } from './types';
import type { JobOffer } from './career';
import { getAvgOvr } from '../utils/teamUtils';
import { repRequiredForPrestige } from './jobMarket';
import { shuffle } from './rng';

export const CONFIDENCE_START = 60;
export const CONFIDENCE_WARN = 35;
export const CONFIDENCE_ULTIMATUM = 20;
export const CONFIDENCE_SACK = 10;
/** Antes desta rodada da liga ninguém é demitido (time novo, técnico novo). */
export const SACK_GRACE_ROUNDS = 6;

export type PressStance = 'bold' | 'shield';

export function clampConfidence(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Variação da confiança por um jogo. `userOvr`/`oppOvr` = força média dos elencos. */
export function matchConfidenceDelta(input: {
  userScore: number; oppScore: number; userOvr: number; oppOvr: number;
  derby?: boolean; knockout?: boolean; stance?: PressStance;
}): number {
  const { userScore, oppScore, userOvr, oppOvr, derby, knockout, stance } = input;
  // Expectativa: +1 = muito favorito, −1 = muito azarão.
  const e = Math.max(-1, Math.min(1, (userOvr - oppOvr) / 8));
  let d: number;
  if (userScore > oppScore) d = 3 - e * 1.5;
  else if (userScore === oppScore) d = -e * 2;
  else d = -3 - e * 1.5;
  if (derby) d *= 1.5;
  if (knockout) d *= 1.3;
  // Coletiva: prometeu vitória → cobra o dobro; tirou a pressão → derrota dói metade.
  if (stance === 'bold') d += userScore > oppScore ? 2 : userScore === oppScore ? -1 : -3;
  if (stance === 'shield' && d < 0) d *= 0.5;
  return Math.round(d);
}

/** Variação "de fundo" a cada rodada: meta da liga fora de alcance, caixa no vermelho. */
export function roundConfidenceDelta(input: {
  leagueObjectiveOff: boolean; budgetNegative: boolean; round: number; totalRounds: number;
}): number {
  let d = 0;
  // Só depois de 1/4 da liga — no começo a tabela ainda não diz nada.
  if (input.leagueObjectiveOff && input.round >= Math.ceil(input.totalRounds / 4)) d -= 1;
  if (input.budgetNegative) d -= 2;
  return d;
}

/** Fim de temporada: os objetivos (o mesmo delta de reputação) mexem na confiança,
 *  e metade da distância até o ponto de partida é perdoada pra temporada nova. */
export function seasonEndConfidence(conf: number, objectivesRepDelta: number): { final: number; carried: number } {
  const final = clampConfidence(conf + objectivesRepDelta);
  return { final, carried: clampConfidence(CONFIDENCE_START + (final - CONFIDENCE_START) * 0.5) };
}

export function confidenceLabel(c: number): { label: string; tone: 'good' | 'ok' | 'warn' | 'danger' } {
  if (c >= 75) return { label: 'Total', tone: 'good' };
  if (c >= 50) return { label: 'Boa', tone: 'ok' };
  if (c >= CONFIDENCE_WARN) return { label: 'Instável', tone: 'warn' };
  if (c >= CONFIDENCE_ULTIMATUM) return { label: 'Crítica', tone: 'danger' };
  return { label: 'Por um fio', tone: 'danger' };
}

/** Cruzou um limiar pra baixo nesta mudança? (dispara aviso uma vez) */
export function crossedThreshold(prev: number, next: number): 'warn' | 'ultimatum' | null {
  if (prev > CONFIDENCE_ULTIMATUM && next <= CONFIDENCE_ULTIMATUM) return 'ultimatum';
  if (prev > CONFIDENCE_WARN && next <= CONFIDENCE_WARN) return 'warn';
  return null;
}

export function shouldSack(conf: number, round: number): boolean {
  return conf <= CONFIDENCE_SACK && round >= SACK_GRACE_ROUNDS;
}

/** Propostas pra um técnico demitido: 2-3 clubes ao alcance da reputação, de preferência
 *  menores que o atual. Sempre devolve ao menos uma (clubes fracos não exigem reputação). */
export function generateSackedOffers(
  input: { rosters: Record<string, Team[]>; currentClubId: string; currentLeagueId: string; reputation: number; seasonYear: number },
  rng: () => number = Math.random,
): JobOffer[] {
  const current = input.rosters[input.currentLeagueId]?.find(t => t.id === input.currentClubId);
  const currentPrestige = current ? getAvgOvr(current) : 100;
  const eligible: Array<{ team: Team; leagueId: string; prestige: number }> = [];
  for (const [leagueId, teams] of Object.entries(input.rosters)) {
    for (const team of teams) {
      if (team.id === input.currentClubId) continue;
      const prestige = getAvgOvr(team);
      if (input.reputation < repRequiredForPrestige(prestige)) continue;
      eligible.push({ team, leagueId, prestige });
    }
  }
  const smaller = eligible.filter(c => c.prestige < currentPrestige);
  const pool = smaller.length >= 2 ? smaller : eligible;
  return shuffle(pool, rng).slice(0, 3).map(c => ({
    id: `job-${c.team.id}`,
    clubId: c.team.id,
    leagueId: c.leagueId,
    clubName: c.team.name,
    reputationRequired: repRequiredForPrestige(c.prestige),
    offeredSeasonYear: input.seasonYear,
  }));
}
