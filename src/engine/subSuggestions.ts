import type { Team, Player } from './types';
import { playerOvr } from '../utils/playerOvr';
import { getStarters } from './matchHelpers';

export interface SubSuggestion {
  type: 'fatigue' | 'card_risk' | 'tactical';
  out: Player;
  reason: string;
  candidates: { player: Player; reason: string }[];
}

export function getSubSuggestions(
  team: Team,
  opponentScore: number,
  userScore: number,
  userSide: 'home' | 'away',
): SubSuggestion[] {
  const starters = getStarters(team);
  const bench = team.squad.slice(starters.length);
  const suggestions: SubSuggestion[] = [];

  // ── Fatigue suggestions ──
  for (const p of starters) {
    if (p.currentFatigue < 70) continue;
    const samePos = bench.filter(b => b.position === p.position && !b.injuredRounds && !b.isSuspended);
    if (samePos.length === 0) continue;
    const freshest = samePos.sort((a, b) => a.currentFatigue - b.currentFatigue)[0];
    suggestions.push({
      type: 'fatigue',
      out: p,
      reason: `${p.name} está com ${p.currentFatigue}% de fadiga`,
      candidates: [{
        player: freshest,
        reason: `Descansado (${freshest.currentFatigue}% fadiga), OVR ${playerOvr(freshest)}`,
      }],
    });
  }

  // ── Card risk suggestions ──
  const cardPlayers = starters.filter(p =>
    team.squad.some(sp => sp.id === p.id && (sp.isSuspended === undefined || !sp.isSuspended)));
  for (const p of starters) {
    const benchSamePos = bench.filter(b => b.position === p.position && !b.injuredRounds && !b.isSuspended);
    if (benchSamePos.length === 0) continue;
    suggestions.push({
      type: 'card_risk',
      out: p,
      reason: `${p.name} pode ser poupado para evitar cartão`,
      candidates: benchSamePos.slice(0, 2).map(b => ({
        player: b,
        reason: `OVR ${playerOvr(b)} — mesma posição`,
      })),
    });
    break; // Only suggest one card-risk swap
  }

  // ── Tactical suggestions ──
  const isLosing = userScore < opponentScore;
  const isWinning = userScore > opponentScore;
  if (isLosing) {
    // Suggest replacing a DEF with a FWD for more attack
    const def = starters.find(p => p.position === 'DEF');
    const extraFwd = bench.find(b => b.position === 'FWD' && !b.injuredRounds && !b.isSuspended);
    if (def && extraFwd) {
      suggestions.push({
        type: 'tactical',
        out: def,
        reason: `Time atrás no placar — trocar defesa por ataque`,
        candidates: [{
          player: extraFwd,
          reason: `Mais poder ofensivo, OVR ${playerOvr(extraFwd)}`,
        }],
      });
    }
  }
  if (isWinning) {
    // Suggest replacing a FWD with a DEF to hold the lead
    const fwd = starters.find(p => p.position === 'FWD');
    const extraDef = bench.find(b => b.position === 'DEF' && !b.injuredRounds && !b.isSuspended);
    if (fwd && extraDef) {
      suggestions.push({
        type: 'tactical',
        out: fwd,
        reason: `Segurando resultado — reforçar defesa`,
        candidates: [{
          player: extraDef,
          reason: `Mais solidez defensiva, OVR ${playerOvr(extraDef)}`,
        }],
      });
    }
  }

  return suggestions;
}
