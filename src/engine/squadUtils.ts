import type { Team, Player, Formation } from './types';
import { FORMATION_COUNTS } from './constants';

/** Quantos titulares uma formação usa (sempre 1 GK + linhas da formação) */
export function getStarterCount(formation: Formation): number {
  const c = FORMATION_COUNTS[formation];
  return 1 + c.DEF + c.MID + c.FWD;
}

export function getStarters(team: Team): Player[] {
  return team.squad.slice(0, getStarterCount(team.strategy.formation));
}

export function getBench(team: Team): Player[] {
  return team.squad.slice(getStarterCount(team.strategy.formation));
}

/** Suspenso ou lesionado — não pode ser escalado como titular */
export function isPlayerUnavailable(p: Player): boolean {
  return !!p.isSuspended || !!(p.injuredRounds && p.injuredRounds > 0);
}

/** Disponíveis primeiro (ordem original preservada em cada grupo) — evita que a
 * troca de formação puxe um suspenso/lesionado pro time titular quando a nova
 * formação precisa de mais jogadores numa posição. */
function availableFirst(players: Player[]): Player[] {
  const available = players.filter(p => !isPlayerUnavailable(p));
  const unavailable = players.filter(isPlayerUnavailable);
  return [...available, ...unavailable];
}

// ── Fora de posição ─────────────────────────────────────────────────────────

/** Posição de origem do jogador (a dele, mesmo escalado fora). */
export function naturalPosition(p: Player): Player['position'] {
  return p.naturalPosition ?? p.position;
}

/** Jogador cumprindo `pos`; se for a de origem, limpa a marca de "fora de posição". */
export function playAs(p: Player, pos: Player['position']): Player {
  const nat = naturalPosition(p);
  if (pos === nat) {
    if (!p.naturalPosition) return p.position === pos ? p : { ...p, position: pos };
    const { naturalPosition: _n, ...rest } = p;
    void _n;
    return { ...rest, position: pos };
  }
  return { ...p, position: pos, naturalPosition: nat };
}

export function restoreNatural(p: Player): Player {
  return playAs(p, naturalPosition(p));
}

export function isOutOfPosition(p: Player): boolean {
  return !!p.naturalPosition && p.naturalPosition !== p.position;
}

/**
 * Troca dois jogadores de lugar no time levando a FUNÇÃO junto: cada um passa a jogar
 * na posição do outro (a formação continua com as mesmas contagens). Quem vai pro banco
 * volta à posição de origem. Goleiro não entra nisso — só troca com goleiro.
 */
export function moveIntoSlot(team: Team, fromIdx: number, toIdx: number): Team {
  const starterCount = getStarterCount(team.strategy.formation);
  const squad = [...team.squad];
  const a = squad[fromIdx], b = squad[toIdx];
  const aRole = a.position, bRole = b.position;
  squad[toIdx] = toIdx < starterCount ? playAs(a, bRole) : restoreNatural(a);
  squad[fromIdx] = fromIdx < starterCount ? playAs(b, aRole) : restoreNatural(b);
  return { ...team, squad };
}

/** Reorganiza titulares/reservas pra bater com uma nova formação, preservando quem já é titular quando possível */
export function rebalanceForFormation(team: Team, formation: Formation): Team {
  const counts = FORMATION_COUNTS[formation];
  // Nova formação redesenha as linhas: todo mundo volta à posição de origem.
  const squad = team.squad.map(restoreNatural);
  const gk = availableFirst(squad.filter(p => p.position === 'GK'));
  const defs = availableFirst(squad.filter(p => p.position === 'DEF'));
  const mids = availableFirst(squad.filter(p => p.position === 'MID'));
  const fwds = availableFirst(squad.filter(p => p.position === 'FWD'));
  const starters = [
    ...gk.slice(0, 1),
    ...defs.slice(0, counts.DEF),
    ...mids.slice(0, counts.MID),
    ...fwds.slice(0, counts.FWD),
  ];
  const bench = [
    ...gk.slice(1),
    ...defs.slice(counts.DEF),
    ...mids.slice(counts.MID),
    ...fwds.slice(counts.FWD),
  ];
  return { ...team, squad: [...starters, ...bench], strategy: { ...team.strategy, formation } };
}

/** Força efetiva pra escalação: OVR descontado do cansaço (mesma conta do intervalo). */
function lineupScore(p: Player, ovr: (p: Player) => number): number {
  return ovr(p) * (1 - (p.currentFatigue ?? 0) / 200);
}

/**
 * "Escalar melhores": mantém a formação e põe como titular, em cada posição, os mais
 * fortes DISPONÍVEIS (lesionado/suspenso nunca entra), descontando o cansaço. O resto
 * vira banco na mesma ordem de força.
 */
export function bestLineup(team: Team, ovr: (p: Player) => number): Team {
  const counts = FORMATION_COUNTS[team.strategy.formation];
  const all = team.squad.map(restoreNatural);
  const byPos = (pos: Player['position']) => {
    const list = all.filter(p => p.position === pos);
    const avail = list.filter(p => !isPlayerUnavailable(p)).sort((a, b) => lineupScore(b, ovr) - lineupScore(a, ovr));
    return [...avail, ...list.filter(isPlayerUnavailable)];
  };
  const gk = byPos('GK'), def = byPos('DEF'), mid = byPos('MID'), fwd = byPos('FWD');
  const starters = [...gk.slice(0, 1), ...def.slice(0, counts.DEF), ...mid.slice(0, counts.MID), ...fwd.slice(0, counts.FWD)];
  const bench = [...gk.slice(1), ...def.slice(counts.DEF), ...mid.slice(counts.MID), ...fwd.slice(counts.FWD)];
  return { ...team, squad: [...starters, ...bench] };
}
