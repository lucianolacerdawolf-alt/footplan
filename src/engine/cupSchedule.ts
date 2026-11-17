import type { BracketStage } from './tournament';

// =============================================================================
// Calendário das copas no Modo Carreira
// =============================================================================
// Antes a Central dava prioridade fixa copa → liga: o primeiro jogo da temporada era
// sempre das oitavas da copa (antes da rodada 1) e a final podia sair antes da rodada
// 10. Aqui cada fase da copa só "abre" depois de uma fração da liga, espalhando as
// fases pela temporada. A continental anda meio passo defasada pra não cair na mesma
// semana da doméstica.

const PLAYABLE: Exclude<BracketStage, 'champion'>[] = ['roundOf16', 'quarterfinals', 'semifinals', 'final'];

/** Rodada da liga (índice 0-based de `currentRound`) a partir da qual a fase abre. */
export function cupStageOpensAtRound(
  stage: BracketStage,
  totalRounds: number,
  kind: 'domestic' | 'continental' = 'domestic',
): number {
  const idx = PLAYABLE.indexOf(stage as (typeof PLAYABLE)[number]);
  if (idx < 0) return 0;
  const slot = totalRounds / (PLAYABLE.length + 1);
  const offset = kind === 'continental' ? 0.5 : 1;
  return Math.min(totalRounds - 1, Math.floor((idx + offset) * slot));
}

/** A fase atual da copa já pode ser jogada? Liga encerrada libera tudo. */
export function isCupStageOpen(
  stage: BracketStage,
  currentRound: number,
  totalRounds: number,
  leagueDone: boolean,
  kind: 'domestic' | 'continental' = 'domestic',
): boolean {
  if (leagueDone || stage === 'champion') return true;
  return currentRound >= cupStageOpensAtRound(stage, totalRounds, kind);
}
