// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AchievementsScreen from '../AchievementsScreen';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORY_LABELS } from '@/engine/achievements';
import type { AchievementCategory } from '@/engine/achievements';

type Item = React.ComponentProps<typeof AchievementsScreen>['achievements'][number];

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'a1', name: 'Estreia', description: 'Complete sua primeira partida',
    icon: '🎮', hint: 'Jogue uma partida', category: 'marcos',
    unlocked: false, ...overrides,
  };
}

describe('dados das conquistas', () => {
  it('toda conquista tem categoria válida e uma dica não vazia', () => {
    const validas = Object.keys(ACHIEVEMENT_CATEGORY_LABELS) as AchievementCategory[];
    for (const a of ACHIEVEMENTS) {
      expect(validas, `${a.id} sem categoria válida`).toContain(a.category);
      expect(a.hint.trim().length, `${a.id} sem dica`).toBeGreaterThan(0);
    }
  });
});

describe('AchievementsScreen', () => {
  it('bloqueada mostra a dica, não "???" (regressão)', () => {
    render(<AchievementsScreen achievements={[item({ unlocked: false })]} onBack={() => {}} />);
    expect(screen.getByText('Jogue uma partida')).toBeInTheDocument();
    expect(screen.queryByText('???')).not.toBeInTheDocument();
  });

  it('desbloqueada troca a dica pela descrição e mostra a data', () => {
    render(
      <AchievementsScreen
        achievements={[item({ unlocked: true, unlockedAt: Date.UTC(2026, 6, 29, 12) })]}
        onBack={() => {}}
      />
    );
    expect(screen.getByText('Complete sua primeira partida')).toBeInTheDocument();
    expect(screen.queryByText('Jogue uma partida')).not.toBeInTheDocument();
    expect(screen.getByText('29/07/2026')).toBeInTheDocument();
  });

  it('agrupa por categoria e conta quantas faltam em cada grupo', () => {
    render(
      <AchievementsScreen
        onBack={() => {}}
        achievements={[
          item({ id: 'p1', category: 'partida', unlocked: true }),
          item({ id: 'p2', category: 'partida', unlocked: false }),
          item({ id: 'm1', category: 'marcos', unlocked: true }),
        ]}
      />
    );
    expect(screen.getByText('Na Partida')).toBeInTheDocument();
    expect(screen.getByText('Marcos')).toBeInTheDocument();
    // Categorias sem nenhum item não aparecem
    expect(screen.queryByText('Disciplina')).not.toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();
  });

  it('mostra o percentual geral concluído', () => {
    render(
      <AchievementsScreen
        onBack={() => {}}
        achievements={[
          item({ id: 'a', unlocked: true }),
          item({ id: 'b', unlocked: false }),
          item({ id: 'c', unlocked: false }),
          item({ id: 'd', unlocked: false }),
        ]}
      />
    );
    expect(screen.getByText('25% concluído')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  });
});
