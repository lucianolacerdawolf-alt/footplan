// @vitest-environment node
// =============================================================================
// Botão físico de voltar (Android / Capacitor)
// =============================================================================
// O mapa `backTargets` duplica, por necessidade, a intenção dos `onBack` do
// `screenMap` em AppScreens.tsx — aqueles são closures acopladas a props, não
// dá pra reusá-las fora do render. A duplicação é o risco: uma tela nova entra
// no tipo `Screen`, ganha renderer, e o botão físico fica sem destino.
//
// Estes testes cobrem exatamente isso: completeness contra o tipo fechado, e
// que todo destino apontado é uma tela que existe (nada de voltar pra uma tela
// que o screenMap não sabe renderizar).

import { describe, it, expect } from 'vitest';
import { backTargets, type BackNavContext, type BackTarget } from '../useAndroidBackButton';
import type { Screen } from '../../types/navigation';

const ALL_SCREENS: Screen[] = [
  'league-select', 'cup-select', 'home', 'select', 'setup', 'matchday', 'match', 'stats',
  'tournament-setup', 'league', 'bracket', 'achievements', 'online-lobby',
  'career-hub', 'career-league', 'career-bracket', 'trade-propose', 'season-end',
  'league-table', 'career-league-table', 'career-trophy-room', 'transfer-market',
  'career-job-market', 'career-continental',
];

const SENTINELS = ['home-reset', 'exit', 'stay'] as const;

/** Todas as combinações de contexto que mudam o destino de alguma tela. */
function allContexts(): BackNavContext[] {
  const out: BackNavContext[] = [];
  for (const isCareerMode of [false, true]) {
    for (const hasCareerState of [false, true]) {
      for (const tournamentMode of ['league', 'bracket'] as const) {
        for (const matchContext of ['regular', 'league', 'bracket', 'online'] as const) {
          for (const isTournamentEntry of [false, true]) {
            for (const returnScreen of [null, 'career-hub' as Screen]) {
              out.push({ isCareerMode, hasCareerState, tournamentMode, matchContext, isTournamentEntry, returnScreen });
            }
          }
        }
      }
    }
  }
  return out;
}

const isSentinel = (t: BackTarget): boolean => (SENTINELS as readonly string[]).includes(t);

describe('backTargets — botão físico de voltar', () => {
  it('tem destino pra cada Screen do tipo fechado (completeness)', () => {
    const missing = ALL_SCREENS.filter(s => !(s in backTargets));
    expect(missing, `Telas sem destino de voltar: ${missing.join(', ')}`).toEqual([]);
  });

  it('não tem chaves órfãs fora do tipo Screen', () => {
    const orphan = (Object.keys(backTargets) as Screen[]).filter(k => !ALL_SCREENS.includes(k));
    expect(orphan, `Chaves fora do tipo Screen: ${orphan.join(', ')}`).toEqual([]);
  });

  it('nunca aponta pra uma tela inexistente, em nenhum contexto', () => {
    const bad: string[] = [];
    for (const screen of ALL_SCREENS) {
      for (const ctx of allContexts()) {
        const target = backTargets[screen](ctx);
        if (isSentinel(target)) continue;
        if (!ALL_SCREENS.includes(target as Screen)) bad.push(`${screen} → ${target}`);
      }
    }
    expect(bad, `Destinos inválidos: ${bad.join(', ')}`).toEqual([]);
  });

  it('nunca devolve a própria tela (loop de voltar que não sai do lugar)', () => {
    const loops: string[] = [];
    for (const screen of ALL_SCREENS) {
      for (const ctx of allContexts()) {
        if (backTargets[screen](ctx) === screen) loops.push(`${screen} (ctx: ${JSON.stringify(ctx)})`);
      }
    }
    expect(loops.slice(0, 3), 'Telas que voltam pra si mesmas').toEqual([]);
  });

  it('só a home encerra o app', () => {
    const exits = ALL_SCREENS.filter(s => allContexts().some(c => backTargets[s](c) === 'exit'));
    expect(exits).toEqual(['home']);
  });

  it('a partida em andamento engole o voltar em vez de abandonar o jogo', () => {
    for (const ctx of allContexts()) {
      expect(backTargets['match'](ctx)).toBe('stay');
    }
  });

  it('setup volta pra returnScreen só quando entrou por edição de elenco', () => {
    const base: BackNavContext = {
      isCareerMode: true, hasCareerState: true, tournamentMode: 'league',
      matchContext: 'league', isTournamentEntry: false, returnScreen: 'career-hub',
    };
    expect(backTargets['setup']({ ...base, isTournamentEntry: true })).toBe('career-hub');
    expect(backTargets['setup'](base)).toBe('career-league');
  });
});
