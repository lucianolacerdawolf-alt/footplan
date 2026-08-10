import type { Position } from '../engine/types';

// =============================================================================
// MAPEAMENTO DE POSIÇÃO — fontes de dados remotas → Position do jogo
// =============================================================================
// Cada fonte escreve a posição dum jeito diferente:
//   football-data.org: "Goalkeeper" | "Defence" | "Midfield" | "Offence"
//   API-Football:      "Goalkeeper" | "Defender" | "Midfielder"
//   SportAPI7:         resolve pra letra (G/D/M/F) e posições detalhadas (CB, CDM…)
// Antes existiam 3 mapPosition duplicadas (rosterSync, apiFootball, sportApi) que
// podiam divergir — esta é a única autoridade pra traduzir keywords → Position.

export function mapRemotePosition(remote: string | null | undefined): Position {
  if (!remote) return 'MID';
  const p = remote.toLowerCase();
  if (p.includes('keep') || p.includes('gk')) return 'GK';
  if (p.includes('defen') || p.includes('defend') || p.includes('back') || p === 'def') return 'DEF';
  if (p.includes('midfield') || p.includes('mid')) return 'MID';
  return 'FWD';
}
