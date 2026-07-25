import type { Team, MatchEvent } from './types';

const YELLOW_CARDS_FOR_SUSPENSION = 3;

/** Acumula os cartões de uma partida no time (via MatchEvent.playerId) e aplica suspensão */
export function applyMatchCards(team: Team, events: MatchEvent[]): Team {
  const yellowCounts = new Map<string, number>();
  const redPlayerIds = new Set<string>();

  for (const e of events) {
    if (e.teamId !== team.id || !e.playerId) continue;
    if (e.type === 'yellowCard') yellowCounts.set(e.playerId, (yellowCounts.get(e.playerId) ?? 0) + 1);
    else if (e.type === 'redCard') redPlayerIds.add(e.playerId);
  }

  if (yellowCounts.size === 0 && redPlayerIds.size === 0) return team;

  return {
    ...team,
    squad: team.squad.map(p => {
      const gained = yellowCounts.get(p.id) ?? 0;
      const gotRed = redPlayerIds.has(p.id);
      if (!gained && !gotRed) return p;

      let yellowCardsThisSeason = (p.yellowCardsThisSeason ?? 0) + gained;
      let isSuspended = p.isSuspended ?? false;
      let suspendedRounds = p.suspendedRounds ?? 0;

      if (gotRed) {
        isSuspended = true;
        suspendedRounds = Math.max(suspendedRounds, 1);
      }
      if (yellowCardsThisSeason >= YELLOW_CARDS_FOR_SUSPENSION) {
        isSuspended = true;
        suspendedRounds += 1;
        yellowCardsThisSeason = 0;
      }

      return { ...p, yellowCardsThisSeason, isSuspended, suspendedRounds };
    }),
  };
}

/** Libera suspensões ao avançar rodada/estágio — chamar junto de recoverFatigue */
export function clearSuspensions(team: Team): Team {
  return {
    ...team,
    squad: team.squad.map(p => {
      if (!p.isSuspended || !p.suspendedRounds) return p;
      const remaining = p.suspendedRounds - 1;
      return {
        ...p,
        isSuspended: remaining > 0,
        suspendedRounds: remaining > 0 ? remaining : undefined,
      };
    }),
  };
}
