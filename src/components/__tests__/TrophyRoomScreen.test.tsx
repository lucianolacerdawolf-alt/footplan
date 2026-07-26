// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
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
    render(<TrophyRoomScreen history={[]} />);
    expect(screen.getByText('Nenhuma temporada concluída ainda.')).toBeInTheDocument();
  });

  it('renderiza um card por temporada, em ordem crescente de ano', () => {
    render(<TrophyRoomScreen history={[makeEntry({ year: 2 }), makeEntry({ year: 1 })]} />);
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
    render(<TrophyRoomScreen history={[entry]} />);

    expect(screen.queryByText('Fulano (12)')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('5º na liga').closest('button')!);

    expect(screen.getByText('Fulano (12)')).toBeInTheDocument();
    expect(screen.getByText('10V 5E 3D')).toBeInTheDocument();
    expect(screen.getByText('30 pró · 20 contra')).toBeInTheDocument();
    expect(screen.getByText('+€2.5M')).toBeInTheDocument();
  });

  it('mostra o selo de Técnico da Temporada quando managerOfSeason é true', () => {
    render(<TrophyRoomScreen history={[makeEntry({ managerOfSeason: true })]} />);
    expect(screen.getByText('⭐ Técnico da Temporada')).toBeInTheDocument();
  });

  it('não mostra nenhum botão de voltar — a navegação é só pela barra de abas fixa', () => {
    render(<TrophyRoomScreen history={[makeEntry()]} />);
    expect(screen.queryByText(/Voltar/)).not.toBeInTheDocument();
  });

  it('mostra o FinancePanel quando finances é passado (aba Meu Clube)', () => {
    render(
      <TrophyRoomScreen
        history={[]}
        finances={{ budget: 20_000_000, wageBill: 500_000, weeklyIncome: 450_000 }}
      />
    );
    expect(screen.getByText('€20.0M')).toBeInTheDocument();
    expect(screen.getByText('€500K/sem')).toBeInTheDocument();
  });

  it('não mostra o FinancePanel quando finances não é passado', () => {
    render(<TrophyRoomScreen history={[]} />);
    expect(screen.queryByText('💰 Orçamento')).not.toBeInTheDocument();
  });
});
