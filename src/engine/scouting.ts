// =============================================================================
// OLHEIROS — atributos de jogadores de fora ficam escondidos até serem observados
// =============================================================================
// No Mercado, quem joga na liga do usuário é conhecido. De outras ligas e agentes
// livres só se vê uma faixa de OVR (o valor real está dentro dela, em posição que
// não dá pra adivinhar). Um relatório de olheiro revela o jogador; são poucos por
// rodada, então achar a promessa barata vira escolha, não só ordenar por OVR.

import type { Player } from './types';
import { playerOvr } from '../utils/playerOvr';

export const SCOUT_REPORTS_PER_ROUND = 3;
const RANGE_WIDTH = 8;

export interface ScoutingState {
  scoutedIds: string[];
  reportsLeft: number;
}

export function getScouting(s: { scouting?: ScoutingState }): ScoutingState {
  return s.scouting ?? { scoutedIds: [], reportsLeft: SCOUT_REPORTS_PER_ROUND };
}

function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Faixa estável de OVR de um jogador não observado (sempre contém o OVR real). */
export function ovrRange(player: Player): { lo: number; hi: number } {
  const ovr = playerOvr(player);
  const below = hash(player.id) % (RANGE_WIDTH + 1);
  const lo = Math.max(1, ovr - below);
  return { lo, hi: lo + RANGE_WIDTH };
}

/** OVR usado pra ordenar/exibir: o real se conhecido, senão o meio da faixa. */
export function visibleOvr(player: Player, known: boolean): number {
  if (known) return playerOvr(player);
  const { lo, hi } = ovrRange(player);
  return Math.round((lo + hi) / 2);
}

export function ovrText(player: Player, known: boolean): string {
  if (known) return String(playerOvr(player));
  const { lo, hi } = ovrRange(player);
  return `${lo}-${hi}`;
}

export function scoutPlayer(s: ScoutingState, playerId: string): ScoutingState | null {
  if (s.scoutedIds.includes(playerId)) return s;
  if (s.reportsLeft <= 0) return null;
  return { scoutedIds: [...s.scoutedIds, playerId], reportsLeft: s.reportsLeft - 1 };
}

/** Nova rodada: relatórios recarregam (os já observados continuam conhecidos). */
export function refreshScouting(s: ScoutingState | undefined): ScoutingState {
  // Limite pra não crescer pra sempre num save longo.
  const ids = (s?.scoutedIds ?? []).slice(-300);
  return { scoutedIds: ids, reportsLeft: SCOUT_REPORTS_PER_ROUND };
}
