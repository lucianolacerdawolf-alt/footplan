import type { Formation, Player } from '../engine/types';

/** Divide os titulares em linhas (de trás pra frente: GK, DEF, meio…, ataque). */
export function pitchRows(formation: Formation, starters: Player[]): Player[][] {
  const digits = formation.split('-').map(Number);
  const midRows = digits.slice(1, -1);
  const gk = starters.filter(p => p.position === 'GK');
  const def = starters.filter(p => p.position === 'DEF');
  const mid = starters.filter(p => p.position === 'MID');
  const fwd = starters.filter(p => p.position === 'FWD');
  const rows: Player[][] = [gk, def];
  let i = 0;
  midRows.forEach((n, r) => {
    const last = r === midRows.length - 1;
    rows.push(last ? mid.slice(i) : mid.slice(i, i + n));
    i += n;
  });
  if (midRows.length === 0) rows.push(mid);
  rows.push(fwd);
  return rows.filter(r => r.length > 0);
}
