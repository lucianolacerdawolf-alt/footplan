import type { Player, Position } from './types';

// =============================================================================
// FORA DE POSIÇÃO — penalidade única pra tela (playerOvr) e pro motor da partida
// =============================================================================
// Só pesos diferentes por função não bastavam: o OVR é limitado pelo maior atributo,
// então craques davam o MESMO número em qualquer função (Saka atacante 88 = 88 de
// zagueiro) e o motor, que lê os atributos direto, também não sentia nada. Aqui os
// atributos do jogador improvisado encolhem; tela e partida usam o mesmo resultado.

const ORDER: Record<Position, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

/** Fração perdida nos atributos: linha vizinha 10%, pulando uma linha 22%, goleiro 40%. */
export function outOfPositionPenalty(natural: Position, role: Position): number {
  if (natural === role) return 0;
  if (natural === 'GK' || role === 'GK') return 0.4;
  return Math.abs(ORDER[natural] - ORDER[role]) === 1 ? 0.1 : 0.22;
}

/** O jogador como ele rende na função atual (atributos já descontados). */
export function asPlayedInRole(p: Player): Player {
  if (!p.naturalPosition || p.naturalPosition === p.position) return p;
  const k = 1 - outOfPositionPenalty(p.naturalPosition, p.position);
  const a = p.attributes;
  const s = (v: number) => Math.max(1, Math.round(v * k));
  return {
    ...p,
    attributes: {
      speed: s(a.speed), stamina: s(a.stamina), passing: s(a.passing), finishing: s(a.finishing),
      tackling: s(a.tackling), dribbling: s(a.dribbling), vision: s(a.vision), positioning: s(a.positioning),
    },
  };
}
