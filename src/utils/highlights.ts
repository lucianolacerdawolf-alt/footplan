import type { Player } from '../engine/types';
import { playerOvr } from './playerOvr';

/**
 * Escolhe os destaques do time. Ordenar só por OVR enchia a lista de goleiros —
 * o OVR de GK é calibrado em outra escala e domina o topo do elenco, então uma
 * prévia de jogo mostrava "3 goleiros em destaque". No máximo 1 GK entra, e só
 * se sobrar vaga depois dos jogadores de linha.
 */
export function pickHighlights(squad: Player[], count = 3): Player[] {
  const byOvr = (a: Player, b: Player) => playerOvr(b) - playerOvr(a);
  const outfield = squad.filter(p => p.position !== 'GK').sort(byOvr);
  const keepers = squad.filter(p => p.position === 'GK').sort(byOvr);

  const picked = outfield.slice(0, count);
  // Só completa com goleiro se o elenco não tiver jogadores de linha suficientes.
  if (picked.length < count && keepers.length > 0) picked.push(keepers[0]);
  return picked.slice(0, count);
}
