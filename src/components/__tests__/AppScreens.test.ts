// @vitest-environment node
// =============================================================================
// Teste de navegação — P3 #9 do checklist
// =============================================================================
// As correções de fluxo (ondas 1-4) eram exatamente o tipo de regressão que
// um teste de navegação pegaria, e nenhuma tinha cobertura. Este teste garante:
//
// 1. Completeness: todo `Screen` do tipo fechado (navigation.ts) tem renderer
//    no `screenMap`. Pega "adicionar tela no tipo sem mapear" (renderScreen
//    cairia no fallback) e "remover tela do mapa sem tirar do tipo" (TS não
//    pegaria se o mapa fosse Record<Screen, ScreenRenderer> mas faltasse key).
// 2. Sem órfãos: nenhuma chave no screenMap está fora do tipo `Screen` (TS
//    já garante em compile time, mas o teste documenta a intenção e falha
//    cedo se alguém trocar Record por Partial/Record<string,...>).
//
// Testes focalizados de fluxo onBack (clique real → setScreen válido) ficam
// como follow-up: cada tela tem props diferentes e dependências de estado
// (careerState/leagueState) que tornariam o mock muito acoplado. O teste de
// completeness cobre a classe mais comum de regressão estrutural.

import { describe, it, expect } from 'vitest';
import { screenMap } from '../AppScreens';
import type { Screen } from '../../types/navigation';

// Lista canônica de telas — espelha o tipo `Screen` em navigation.ts. Se uma
// tela nova entrar no tipo mas não no screenMap (ou vice-versa), este teste
// falha e aponta exatamente qual. Manter sincronizado com navigation.ts.
const ALL_SCREENS: Screen[] = [
  'league-select', 'cup-select', 'home', 'select', 'setup', 'matchday', 'match', 'stats',
  'tournament-setup', 'league', 'bracket', 'achievements', 'online-lobby',
  'career-hub', 'career-league', 'career-bracket', 'trade-propose', 'season-end',
  'league-table', 'career-league-table', 'career-trophy-room', 'transfer-market',
  'career-job-market', 'career-continental',
];

describe('screenMap — teste de navegação (P3 #9)', () => {
  it('tem um renderer pra cada Screen do tipo fechado (completeness)', () => {
    const missing = ALL_SCREENS.filter(s => !(s in screenMap));
    expect(missing, `Telas no tipo Screen sem renderer no screenMap: ${missing.join(', ')}`).toEqual([]);
  });

  it('não tem chaves órfãs no screenMap fora do tipo Screen', () => {
    const mapKeys = Object.keys(screenMap) as Screen[];
    const orphan = mapKeys.filter(k => !ALL_SCREENS.includes(k));
    expect(orphan, `Chaves no screenMap que não estão no tipo Screen: ${orphan.join(', ')}`).toEqual([]);
  });

  it('cada renderer é uma função (não undefined/null)', () => {
    for (const screen of ALL_SCREENS) {
      const renderer = screenMap[screen];
      expect(typeof renderer, `renderer de "${screen}" não é função`).toBe('function');
    }
  });
});
