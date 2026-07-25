// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TrophyRoomScreen from '../TrophyRoomScreen';
import type { CareerSeasonHistoryEntry } from '@/engine/career';

function makeEntry(overrides: Partial<CareerSeasonHistoryEntry> = {}): CareerSeasonHistoryEntry {
  return {
    year: 1,
    leagueId: 'pl',
    leagueChampionId: 'other',
    userLeaguePosition: 5,
    cupResult: 'quarterfinal',
    tradesUsed: 1,
    reputationDelta: 2,
    ...overrides,
  };
}

describe('TrophyRoomScreen', () => {
  it('mostra estado vazio quando não há temporadas concluídas', () => {
    render(<TrophyRoomScreen history={[]} onBack={vi.fn()} />);
    expect(screen.getByText('Nenhuma temporada concluída ainda.')).toBeInTheDocument();
  });

  it('renderiza um card por temporada, em ordem crescente de ano', () => {
    render(<TrophyRoomScreen history={[makeEntry({ year: 2 }), makeEntry({ year: 1 })]} onBack={vi.fn()} />);
    const years = screen.getAllByText(/^[12]$/).map(el => el.textContent);
    expect(years).toEqual(['1', '2']);
  });

  it('expande o card ao clicar e mostra artilheiro, campanha e finanças', () => {
    const entry = makeEntry({
      userTopScorer: { name: 'Fulano', goals: 12 },
      userWins: 10, userDraws: 5, userLosses: 3,
      userGoalsFor: 30, userGoalsAgainst: 20,
      budgetDelta: 2_500_000,
    });
    render(<TrophyRoomScreen history={[entry]} onBack={vi.fn()} />);

    expect(screen.queryByText('Fulano (12)')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('5º na liga').closest('button')!);

    expect(screen.getByText('Fulano (12)')).toBeInTheDocument();
    expect(screen.getByText('10V 5E 3D')).toBeInTheDocument();
    expect(screen.getByText('30 pró · 20 contra')).toBeInTheDocument();
    expect(screen.getByText('+€2.5M')).toBeInTheDocument();
  });

  it('mostra o selo de Técnico da Temporada quando managerOfSeason é true', () => {
    render(<TrophyRoomScreen history={[makeEntry({ managerOfSeason: true })]} onBack={vi.fn()} />);
    expect(screen.getByText('⭐ Técnico da Temporada')).toBeInTheDocument();
  });

  it('chama onBack ao clicar em Voltar', () => {
    const onBack = vi.fn();
    render(<TrophyRoomScreen history={[makeEntry()]} onBack={onBack} />);
    fireEvent.click(screen.getByText('← Voltar'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
