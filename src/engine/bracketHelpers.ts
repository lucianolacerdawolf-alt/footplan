import type { BracketState } from './tournament';

import type { BracketMatch } from './tournament';

export function getStageMatches(state: BracketState): BracketMatch[] {
  return state.stage === 'roundOf16' ? state.roundOf16
    : state.stage === 'quarterfinals' ? state.quarterFinals
    : state.stage === 'semifinals' ? state.semiFinals
    : [state.final];
}

export function updateStageMatch(state: BracketState, idx: number, updated: BracketMatch): BracketState {
  switch (state.stage) {
    case 'roundOf16': {
      const r16 = [...state.roundOf16]; r16[idx] = updated; return { ...state, roundOf16: r16 };
    }
    case 'quarterfinals': {
      const qf = [...state.quarterFinals]; qf[idx] = updated; return { ...state, quarterFinals: qf };
    }
    case 'semifinals': {
      const sf = [...state.semiFinals]; sf[idx] = updated; return { ...state, semiFinals: sf };
    }
    case 'final': {
      return { ...state, final: updated };
    }
    case 'champion':
      return state;
  }
}
